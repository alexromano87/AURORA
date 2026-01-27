from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd
import numpy as np
from sqlalchemy import text
from config import settings
from sqlalchemy.orm import Session

def calculate_etf_score(ticker: str, data: pd.DataFrame) -> dict:
    """
    Calculate ETF score based on quantitative metrics
    Returns score breakdown and total score (0-100)
    """
    scores = {}

    # 1. Performance Score (0-25 points)
    returns_1y = (data['Close'].iloc[-1] / data['Close'].iloc[0] - 1) * 100
    if returns_1y > 30:
        scores['performance'] = 25
    elif returns_1y > 20:
        scores['performance'] = 20
    elif returns_1y > 10:
        scores['performance'] = 15
    elif returns_1y > 0:
        scores['performance'] = 10
    else:
        scores['performance'] = 0

    # 2. Volatility Score (0-25 points) - Lower is better
    daily_returns = data['Close'].pct_change().dropna()
    volatility = daily_returns.std() * np.sqrt(252) * 100  # Annualized
    if volatility < 10:
        scores['volatility'] = 25
    elif volatility < 15:
        scores['volatility'] = 20
    elif volatility < 20:
        scores['volatility'] = 15
    elif volatility < 25:
        scores['volatility'] = 10
    else:
        scores['volatility'] = 5

    # 3. Sharpe Ratio (0-25 points)
    risk_free_rate = 0.04  # 4% annual
    excess_returns = daily_returns.mean() * 252 - risk_free_rate
    sharpe_ratio = excess_returns / (daily_returns.std() * np.sqrt(252))
    if sharpe_ratio > 1.5:
        scores['sharpe'] = 25
    elif sharpe_ratio > 1.0:
        scores['sharpe'] = 20
    elif sharpe_ratio > 0.5:
        scores['sharpe'] = 15
    elif sharpe_ratio > 0:
        scores['sharpe'] = 10
    else:
        scores['sharpe'] = 0

    # 4. Max Drawdown (0-25 points) - Lower is better
    cumulative = (1 + daily_returns).cumprod()
    running_max = cumulative.expanding().max()
    drawdown = ((cumulative - running_max) / running_max) * 100
    max_drawdown = abs(drawdown.min())
    if max_drawdown < 10:
        scores['drawdown'] = 25
    elif max_drawdown < 15:
        scores['drawdown'] = 20
    elif max_drawdown < 20:
        scores['drawdown'] = 15
    elif max_drawdown < 25:
        scores['drawdown'] = 10
    else:
        scores['drawdown'] = 5

    total_score = sum(scores.values())

    return {
        'performance_score': scores['performance'],
        'volatility_score': scores['volatility'],
        'sharpe_score': scores['sharpe'],
        'drawdown_score': scores['drawdown'],
        'total_score': total_score,
        'metrics': {
            'return_1y': round(returns_1y, 2),
            'volatility': round(volatility, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'max_drawdown': round(max_drawdown, 2)
        }
    }

def run_scoring(db: Session, run_id: str, user_id: str):
    """
    Execute ETF scoring algorithm for all instruments
    """
    print(f"🎯 Starting scoring engine for run {run_id}")

    # Get all ETF instruments
    instruments = db.execute(
        text("SELECT id, ticker, name FROM instrument WHERE type = 'ETF'")
    ).fetchall()

    print(f"📊 Found {len(instruments)} ETFs to score")

    for instrument in instruments:
        instrument_id, ticker, name = instrument

        try:
            print(f"  Scoring {ticker}...")

            # Get historical data from database (already fetched by API)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=settings.scoring_lookback_days)

            price_records = db.execute(
                text("""
                SELECT date, open, high, low, close, volume
                FROM price_history
                WHERE "instrumentId" = :instrument_id
                  AND date >= :start_date
                  AND date <= :end_date
                ORDER BY date ASC
                """),
                {"instrument_id": instrument_id, "start_date": start_date, "end_date": end_date}
            ).fetchall()

            if not price_records or len(price_records) < 200:
                print(f"  ⚠️ Insufficient data for {ticker} in database (got {len(price_records) if price_records else 0} rows), trying yfinance...")

                # Fallback to yfinance download
                df = yf.download(
                    ticker,
                    start=start_date,
                    end=end_date,
                    progress=False,
                    auto_adjust=True,
                    actions=False,
                    repair=True,
                    keepna=False
                )

                if df is None or df.empty or len(df) < 200:
                    print(f"  ⚠️ Yfinance also failed for {ticker}, skipping")
                    continue
            else:
                # Convert database records to pandas DataFrame
                df = pd.DataFrame(price_records, columns=['Date', 'Open', 'High', 'Low', 'Close', 'Volume'])
                df['Date'] = pd.to_datetime(df['Date'])
                df.set_index('Date', inplace=True)
                print(f"    Loaded {len(df)} days from database: {df.index[0].date()} to {df.index[-1].date()}")

            # Calculate score
            score_data = calculate_etf_score(ticker, df)

            # Save scoring result
            import json

            # Determine bucket based on total score
            total_score = score_data['total_score']
            if total_score >= 80:
                bucket = 'A'
            elif total_score >= 60:
                bucket = 'B'
            elif total_score >= 40:
                bucket = 'C'
            else:
                bucket = 'D'

            # Prepare breakdown with all metrics
            breakdown = {
                'performance': score_data['performance_score'],
                'volatility': score_data['volatility_score'],
                'sharpe': score_data['sharpe_score'],
                'drawdown': score_data['drawdown_score'],
                'metrics': score_data['metrics']
            }

            db.execute(
                text("""
                INSERT INTO etf_scoring_result
                (id, "runId", "instrumentId", bucket, score, breakdown, "redFlags", "dataAsof")
                VALUES (gen_random_uuid(), :run_id, :instrument_id, :bucket, :score,
                        CAST(:breakdown AS jsonb), CAST(:red_flags AS jsonb), :data_asof)
                """),
                {
                    "run_id": run_id,
                    "instrument_id": instrument_id,
                    "bucket": bucket,
                    "score": float(total_score),
                    "breakdown": json.dumps(breakdown),
                    "red_flags": json.dumps([]),  # No red flags for now
                    "data_asof": datetime.utcnow().date()
                }
            )
            db.commit()

            print(f"  ✅ {ticker}: {score_data['total_score']}/100")

        except Exception as e:
            print(f"  ❌ Error scoring {ticker}: {e}")
            continue

    print(f"✅ Scoring completed for run {run_id}")
