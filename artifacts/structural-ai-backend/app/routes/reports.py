"""
Reports routes - retrieve stored analysis reports.
"""
from fastapi import APIRouter, HTTPException
from app import database

router = APIRouter()


@router.get("/reports")
async def list_reports():
    """List all analysis reports."""
    return database.get_all_reports()


@router.get("/reports/{report_id}")
async def get_report(report_id: int):
    """Get a specific report by ID."""
    report = database.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
