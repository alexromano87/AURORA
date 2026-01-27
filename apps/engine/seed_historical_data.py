"""
Script per popolare il database con dati storici usando scraping
Usa yfinance con strategie alternative per evitare rate limiting
"""
import sys
import time
from datetime import datetime, timedelta
from sqlalchemy import text
from database import SessionLocal
import pandas as pd
import numpy as np

def generate_synthetic_prices(ticker: str, days: int = 365) -> pd.DataFrame:
    """
    Genera dati di prezzo sintetici ma realistici per testing
    Simula un trend rialzista con volatilità realistica
    """
    print(f"  Generating synthetic data for {ticker}...")

    # Parametri realistici
    base_price = 100.0
    annual_return = 0.12  # 12% annuo
    annual_volatility = 0.18  # 18% volatilità annua

    # Converti a parametri giornalieri
    daily_return = annual_return / 252
    daily_volatility = annual_volatility / np.sqrt(252)

    # Genera date
    end_date = datetime.now()
    dates = [end_date - timedelta(days=days-i) for i in range(days)]

    # Genera prezzi usando random walk geometrico
    prices = [base_price]
    for _ in range(days - 1):
        # Movimento browniano geometrico
        change = np.random.normal(daily_return, daily_volatility)
        new_price = prices[-1] * (1 + change)
        prices.append(new_price)

    # Crea DataFrame con OHLC
    df_data = []
    for i, date in enumerate(dates):
        price = prices[i]
        # Simula OHLC con spread realistico
        daily_range = price * 0.02  # 2% range giornaliero
        open_price = price * (1 + np.random.uniform(-0.005, 0.005))
        high = price + abs(np.random.uniform(0, daily_range))
        low = price - abs(np.random.uniform(0, daily_range))
        close = price
        volume = int(np.random.uniform(100000, 500000))

        df_data.append({
            'Date': date.date(),
            'Open': round(open_price, 2),
            'High': round(high, 2),
            'Low': round(low, 2),
            'Close': round(close, 2),
            'Volume': volume
        })

    df = pd.DataFrame(df_data)
    print(f"    Generated {len(df)} days of synthetic data")
    return df

def try_download_real_data(ticker: str, days: int = 365) -> pd.DataFrame:
    """
    Prova a scaricare dati reali usando strategie multiple
    """
    try:
        import yfinance as yf

        print(f"  Attempting to download real data for {ticker}...")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # Prova con diverse configurazioni
        attempts = [
            # Tentativo 1: standard
            {'auto_adjust': True, 'actions': False},
            # Tentativo 2: con repair
            {'auto_adjust': True, 'actions': False, 'repair': True},
            # Tentativo 3: senza auto_adjust
            {'auto_adjust': False, 'actions': False},
        ]

        for i, params in enumerate(attempts):
            try:
                print(f"    Attempt {i+1}/{len(attempts)}...")
                df = yf.download(
                    ticker,
                    start=start_date,
                    end=end_date,
                    progress=False,
                    keepna=False,
                    **params
                )

                if df is not None and not df.empty and len(df) >= 200:
                    print(f"    ✓ Successfully downloaded {len(df)} days")
                    # Rinomina colonne se necessario
                    if 'Adj Close' in df.columns:
                        df = df.drop('Adj Close', axis=1)
                    df.reset_index(inplace=True)
                    return df
                else:
                    print(f"    ✗ Insufficient data (got {len(df) if df is not None else 0} rows)")

            except Exception as e:
                print(f"    ✗ Attempt {i+1} failed: {str(e)[:100]}")

            # Pausa tra tentativi
            if i < len(attempts) - 1:
                time.sleep(2)

        print(f"  All download attempts failed for {ticker}")
        return None

    except Exception as e:
        print(f"  Error in download function: {e}")
        return None

def save_prices_to_db(db, instrument_id: str, ticker: str, df: pd.DataFrame):
    """
    Salva i prezzi nel database
    """
    print(f"  Saving {len(df)} records to database...")

    saved_count = 0
    for _, row in df.iterrows():
        try:
            # Usa upsert per evitare duplicati
            db.execute(
                text("""
                INSERT INTO price_history
                (id, "instrumentId", date, open, high, low, close, volume, "originalClose", "originalOpen",
                 "originalHigh", "originalLow", "originalCurrency")
                VALUES (gen_random_uuid(), :instrument_id, :date, :open, :high, :low, :close, :volume, NULL, NULL, NULL, NULL, 'EUR')
                ON CONFLICT ("instrumentId", date)
                DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    volume = EXCLUDED.volume
                """),
                {
                    'instrument_id': instrument_id,
                    'date': row['Date'],
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume']) if not pd.isna(row['Volume']) else 0
                }
            )
            saved_count += 1
        except Exception as e:
            print(f"    Warning: Could not save record for {row['Date']}: {e}")
            continue

    db.commit()
    print(f"  ✓ Saved {saved_count} records to database")

def seed_historical_data(use_synthetic=False, days=365):
    """
    Popola il database con dati storici

    Args:
        use_synthetic: Se True, usa solo dati sintetici. Se False, prova prima dati reali
        days: Numero di giorni di storico da scaricare
    """
    print(f"🌱 Starting historical data seeding...")
    print(f"   Mode: {'Synthetic' if use_synthetic else 'Real (with synthetic fallback)'}")
    print(f"   Days: {days}\n")

    db = SessionLocal()

    try:
        # Ottieni tutti gli strumenti ETF
        instruments = db.execute(
            text("SELECT id, ticker, name FROM instrument WHERE type = 'ETF'")
        ).fetchall()

        if not instruments:
            print("❌ No ETF instruments found in database")
            return

        print(f"📊 Found {len(instruments)} ETF instruments\n")

        success_count = 0
        for i, (instrument_id, ticker, name) in enumerate(instruments, 1):
            print(f"[{i}/{len(instruments)}] Processing {ticker} - {name}")

            df = None

            # Prova prima con dati reali (se richiesto)
            if not use_synthetic:
                df = try_download_real_data(ticker, days)
                if df is None:
                    print(f"  → Falling back to synthetic data")
                    time.sleep(1)  # Pausa per evitare rate limiting

            # Usa dati sintetici se necessario
            if df is None or use_synthetic:
                df = generate_synthetic_prices(ticker, days)

            # Salva nel database
            if df is not None and len(df) > 0:
                save_prices_to_db(db, instrument_id, ticker, df)
                success_count += 1
            else:
                print(f"  ✗ No data available for {ticker}")

            print()  # Linea vuota per leggibilità

        print(f"\n✅ Seeding completed!")
        print(f"   Success: {success_count}/{len(instruments)} instruments")

        # Verifica finale
        result = db.execute(
            text("""
                SELECT i.ticker, COUNT(ph.id) as price_count
                FROM instrument i
                LEFT JOIN price_history ph ON i.id = ph."instrumentId"
                WHERE i.type = 'ETF'
                GROUP BY i.ticker
                ORDER BY i.ticker
            """)
        ).fetchall()

        print(f"\n📈 Final database state:")
        for ticker, count in result:
            print(f"   {ticker}: {count} price records")

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    # Parse arguments
    use_synthetic = '--synthetic' in sys.argv
    days = 365

    if '--days' in sys.argv:
        try:
            idx = sys.argv.index('--days')
            days = int(sys.argv[idx + 1])
        except (ValueError, IndexError):
            print("Warning: Invalid --days argument, using default 365")

    seed_historical_data(use_synthetic=use_synthetic, days=days)
