from datetime import datetime
from sqlalchemy.orm import Session
from config import settings
import json

def run_pac(db: Session, run_id: str, user_id: str):
    """
    Execute PAC (Piano di Accumulo Capitale) proposal generation
    Uses contributi-only approach: allocates monthly contribution across top-scoring ETFs
    """
    print(f"💰 Starting PAC engine for run {run_id}")

    # Get user's IPS policy
    ips_result = db.execute(
        """
        SELECT ipv.config, ipv.id
        FROM \"IpsPolicy\" ip
        JOIN \"IpsPolicyVersion\" ipv ON ip.id = ipv."policyId"
        WHERE ip."userId" = :user_id AND ipv."isActive" = true
        LIMIT 1
        """,
        {"user_id": user_id}
    ).fetchone()

    if not ips_result:
        print("⚠️ No active IPS found, using default settings")
        monthly_contribution = 500
        target_allocation = {"equity": 80, "bonds": 20, "cash": 0}
    else:
        config = ips_result[0]
        monthly_contribution = config.get("monthlyContribution", 500)
        target_allocation = config.get("assetAllocation", {"equity": 80, "bonds": 20, "cash": 0})

    print(f"  Monthly contribution: €{monthly_contribution}")
    print(f"  Target allocation: {target_allocation}")

    # Get top scoring ETFs from latest scoring run
    top_etfs = db.execute(
        """
        SELECT sr."instrumentId", i.ticker, i.name, i.type, sr."totalScore",
               sr."performanceScore", sr."volatilityScore", sr."sharpeScore", sr."drawdownScore"
        FROM "ScoringResult" sr
        JOIN "Instrument" i ON sr."instrumentId" = i.id
        WHERE sr."runId" = :run_id
        ORDER BY sr."totalScore" DESC
        LIMIT :max_instruments
        """,
        {"run_id": run_id, "max_instruments": settings.pac_max_instruments}
    ).fetchall()

    if not top_etfs:
        print("⚠️ No scoring results found for this run")
        return

    print(f"  Found {len(top_etfs)} top-scoring ETFs")

    # Calculate allocations
    total_score = sum(etf[4] for etf in top_etfs)  # totalScore is at index 4
    proposals = []

    for etf in top_etfs:
        instrument_id, ticker, name, etf_type, total_score_val, perf, vol, sharpe, dd = etf

        # Allocate proportionally to score
        allocation_pct = (total_score_val / total_score) * 100
        allocation_eur = (allocation_pct / 100) * monthly_contribution

        # Apply minimum allocation threshold
        if allocation_pct < settings.pac_min_allocation_pct:
            continue

        proposals.append({
            "instrument_id": instrument_id,
            "ticker": ticker,
            "name": name,
            "allocation_pct": round(allocation_pct, 2),
            "allocation_eur": round(allocation_eur, 2),
            "score": total_score_val,
            "metrics": {
                "performance": perf,
                "volatility": vol,
                "sharpe": sharpe,
                "drawdown": dd
            }
        })

    # Normalize allocations to 100%
    total_allocation_pct = sum(p["allocation_pct"] for p in proposals)
    for p in proposals:
        p["allocation_pct"] = round((p["allocation_pct"] / total_allocation_pct) * 100, 2)
        p["allocation_eur"] = round((p["allocation_pct"] / 100) * monthly_contribution, 2)

    print(f"  Generated {len(proposals)} proposals")

    # Save PAC proposal
    pac_id = db.execute(
        """
        INSERT INTO \"PacProposal\"
        (id, "runId", "userId", "proposalDate", "monthlyAmount", "targetAllocation", status)
        VALUES (gen_random_uuid(), :run_id, :user_id, :proposal_date, :monthly_amount, :target_allocation, 'PENDING')
        RETURNING id
        """,
        {
            "run_id": run_id,
            "user_id": user_id,
            "proposal_date": datetime.utcnow(),
            "monthly_amount": monthly_contribution,
            "target_allocation": target_allocation
        }
    ).scalar()

    # Save proposed instruments
    for proposal in proposals:
        db.execute(
            """
            INSERT INTO \"PacProposedInstrument\"
            (id, "proposalId", "instrumentId", "allocationPct", "allocationEur", score, metadata)
            VALUES (gen_random_uuid(), :proposal_id, :instrument_id, :allocation_pct, :allocation_eur, :score, :metadata)
            """,
            {
                "proposal_id": pac_id,
                "instrument_id": proposal["instrument_id"],
                "allocation_pct": proposal["allocation_pct"],
                "allocation_eur": proposal["allocation_eur"],
                "score": proposal["score"],
                "metadata": proposal["metrics"]
            }
        )

        print(f"    {proposal['ticker']}: {proposal['allocation_pct']}% (€{proposal['allocation_eur']})")

    db.commit()
    print(f"✅ PAC proposal created: {pac_id}")
