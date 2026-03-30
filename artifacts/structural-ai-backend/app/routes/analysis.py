"""
Analysis routes — floor plan upload and full structural analysis.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
from typing import Optional

from app.services.floor_plan_analyzer import analyze_floor_plan
from app.services.material_recommender import get_llm_recommendations
from app.services.stellar_blockchain import hash_report, store_on_stellar
from app import database

router = APIRouter()


@router.post("/analyze")
async def analyze(
    file:     UploadFile = File(...),
    budget:   Optional[str] = Form("medium"),
    location: Optional[str] = Form("general"),
):
    """
    Analyze a 2D floor plan image.
    Returns detected walls (typed), rooms, 3-D model data, span analysis,
    built-up area, material recommendations (LLM), and Stellar TX proof.
    """
    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if file.content_type and file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Upload a PNG or JPG.",
        )

    image_data = await file.read()
    if not image_data:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    if len(image_data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20 MB).")

    # ── Core analysis ──────────────────────────────────────────────────────
    analysis = analyze_floor_plan(image_data)

    total_area        = analysis["totalArea"]
    buildup_area      = analysis["builtUpArea"]
    total_wall_length = analysis["totalWallLength"]
    room_count        = len(analysis["rooms"])
    room_labels       = [r["label"] for r in analysis["rooms"] if r.get("label")]
    max_span          = analysis.get("maxSpan", 0.0)
    avg_span          = analysis.get("avgSpan", 0.0)
    lb_count          = analysis.get("loadBearingCount", 0)
    pt_count          = analysis.get("partitionCount", 0)

    # ── Span category label ────────────────────────────────────────────────
    if max_span > 6:
        span_category = "Long span (>6 m) — Steel/RCC required"
    elif max_span > 3:
        span_category = "Medium span (3–6 m) — RCC recommended"
    else:
        span_category = "Short span (<3 m) — Brick/AAC viable"

    # ── Material recommendations (LLM) ────────────────────────────────────
    recommendations = get_llm_recommendations(
        total_area=total_area,
        total_wall_length=total_wall_length,
        room_count=room_count,
        budget=budget or "medium",
        location=location or "general",
        room_labels=room_labels,
        max_span=max_span,
        avg_span=avg_span,
        load_bearing_count=lb_count,
        partition_count=pt_count,
        buildup_area=buildup_area,
    )

    # ── Blockchain integrity ───────────────────────────────────────────────
    report_data = {**analysis, "recommendations": recommendations}
    report_hash = hash_report(report_data)
    blockchain_tx_id, stellar_network = store_on_stellar(report_hash)

    top_material = recommendations[0]["material"] if recommendations else "N/A"
    is_simulated = "simulated" in stellar_network

    summary = (
        f"Detected {room_count} rooms ({', '.join(room_labels[:3])}{'...' if len(room_labels) > 3 else ''}). "
        f"Carpet area {total_area:.1f} m² · Built-up area {buildup_area:.1f} m². "
        f"Structural walls: {lb_count} load-bearing (SF=1.5, 230 mm) + {pt_count} partitions (SF=1.23). "
        f"Max span {max_span:.1f} m → {span_category}. "
        f"Top recommendation: {top_material}. "
        f"SHA-256 hash anchored on Stellar {'testnet' if 'testnet' in stellar_network else 'mainnet'}"
        f"{' (simulated)' if is_simulated else ' ✓'}."
    )

    db_record = {
        "created_at":         datetime.utcnow().isoformat(),
        "image_width":        analysis["imageWidth"],
        "image_height":       analysis["imageHeight"],
        "walls":              analysis["walls"],
        "rooms":              analysis["rooms"],
        "total_wall_length":  total_wall_length,
        "total_area":         total_area,
        "buildup_area":       buildup_area,
        "max_span":           max_span,
        "avg_span":           avg_span,
        "load_bearing_count": lb_count,
        "partition_count":    pt_count,
        "recommendations":    recommendations,
        "model3d":            analysis["model3d"],
        "blockchain_hash":    report_hash,
        "blockchain_tx_id":   blockchain_tx_id,
        "stellar_network":    stellar_network,
        "summary":            summary,
    }

    report_id = database.save_report(db_record)

    return {
        "id":               report_id,
        "imageWidth":       analysis["imageWidth"],
        "imageHeight":      analysis["imageHeight"],
        "walls":            analysis["walls"],
        "rooms":            analysis["rooms"],
        "totalWallLength":  total_wall_length,
        "totalArea":        total_area,
        "builtUpArea":      buildup_area,
        "maxSpan":          max_span,
        "avgSpan":          avg_span,
        "loadBearingCount": lb_count,
        "partitionCount":   pt_count,
        "spanCategory":     span_category,
        "recommendations":  recommendations,
        "model3d":          analysis["model3d"],
        "blockchainHash":   report_hash,
        "blockchainTxId":   blockchain_tx_id,
        "stellarNetwork":   stellar_network,
        "createdAt":        db_record["created_at"],
        "summary":          summary,
    }
