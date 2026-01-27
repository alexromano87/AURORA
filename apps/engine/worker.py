import redis
import json
import time
from datetime import datetime
from sqlalchemy import text
from config import settings
from database import SessionLocal
from scoring_engine import run_scoring
from pac_engine import run_pac
import traceback

def start_worker():
    """Start the BullMQ worker to process jobs"""
    r = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_db,
        decode_responses=True
    )

    print("🚀 Worker started, listening for jobs...")

    while True:
        try:
            # Poll for jobs from BullMQ queue
            # BullMQ stores jobs in a specific format, we need to check the wait list
            job_key = r.brpoplpush("bull:aurora-jobs:wait", "bull:aurora-jobs:active", timeout=5)

            if job_key:
                print(f"📦 Processing job: {job_key}")

                # Get job data - BullMQ stores jobs as hash with the full key
                job_full_key = f"bull:aurora-jobs:{job_key}"
                job_data = r.hgetall(job_full_key)
                data = json.loads(job_data.get("data", "{}"))

                run_id = data.get("runId")
                user_id = data.get("userId")
                job_type = data.get("type")

                print(f"📊 Job details: runId={run_id}, userId={user_id}, type={job_type}")

                # Update run status to RUNNING
                db = SessionLocal()
                try:
                    db.execute(
                        text("UPDATE engine_run SET type = 'running', \"startedAt\" = :now WHERE \"runId\" = :run_id"),
                        {"now": datetime.utcnow(), "run_id": run_id}
                    )
                    db.commit()

                    # Execute the appropriate engine
                    if job_type == "scoring":
                        run_scoring(db, run_id, user_id)
                    elif job_type == "pac":
                        run_pac(db, run_id, user_id)
                    elif job_type == "full":
                        run_scoring(db, run_id, user_id)
                        run_pac(db, run_id, user_id)

                    # Update run status to COMPLETED
                    db.execute(
                        text("UPDATE engine_run SET type = 'completed', \"completedAt\" = :now WHERE \"runId\" = :run_id"),
                        {"now": datetime.utcnow(), "run_id": run_id}
                    )
                    db.commit()
                    print(f"✅ Job {run_id} completed successfully")

                except Exception as e:
                    error_msg = str(e)
                    print(f"❌ Job {run_id} failed: {error_msg}")
                    traceback.print_exc()

                    # Update run status to FAILED
                    db.execute(
                        text("UPDATE engine_run SET type = 'failed', error = :error, \"completedAt\" = :now WHERE \"runId\" = :run_id"),
                        {"error": error_msg, "now": datetime.utcnow(), "run_id": run_id}
                    )
                    db.commit()
                finally:
                    db.close()

                # Remove job from active list
                r.lrem("bull:aurora-jobs:active", 1, job_key)
                r.delete(job_key)

        except redis.exceptions.TimeoutError:
            # No jobs available, continue polling
            pass
        except Exception as e:
            print(f"⚠️ Worker error: {e}")
            traceback.print_exc()
            time.sleep(5)

if __name__ == "__main__":
    start_worker()
