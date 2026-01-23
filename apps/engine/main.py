from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from worker import start_worker
import threading

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start worker in background thread
    worker_thread = threading.Thread(target=start_worker, daemon=True)
    worker_thread.start()
    yield
    # Cleanup if needed

app = FastAPI(
    title="AURORA Engine",
    description="Analytics Engine for Portfolio Intelligence",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "engine"}

@app.get("/")
async def root():
    return {
        "service": "AURORA Engine",
        "version": "0.1.0",
        "endpoints": ["/health", "/scoring", "/pac"]
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
