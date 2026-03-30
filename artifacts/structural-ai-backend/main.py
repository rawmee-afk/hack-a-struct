"""
Autonomous Structural Intelligence System
FastAPI backend for floor plan analysis using OpenCV, LLM material recommendations,
and Stellar blockchain report hashing.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from app.routes import analysis, reports
from app import database

app = FastAPI(
    title="Structural AI System",
    description="Analyzes 2D floor plans, generates 3D models, and recommends construction materials",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

database.init_db()

app.include_router(analysis.router, prefix="/api", tags=["analysis"])
app.include_router(reports.router, prefix="/api", tags=["reports"])


@app.get("/api/healthz")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_PORT", 8000))
    is_dev = os.environ.get("NODE_ENV", "production") != "production"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=is_dev)
