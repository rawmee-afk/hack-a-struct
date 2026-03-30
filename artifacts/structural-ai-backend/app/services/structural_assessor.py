"""
Structural Assessor — uses GPT-4o-mini to generate a professional
2–3 sentence structural assessment from the analysed floor plan data.
"""

import os
import json
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


def _fallback(rooms, lb_count, pt_count, max_span, span_category):
    label = span_category.split("—")[0].strip()
    return (
        f"This floor plan has {lb_count} load-bearing wall(s) supporting "
        f"{len(rooms)} room(s) across a maximum span of {max_span:.1f} m ({label}). "
        f"The {pt_count} partition wall(s) handle internal division without structural load. "
        f"Standard RCC framing with 230 mm brick masonry is recommended for load-bearing elements."
    )


def get_structural_assessment(
    rooms: List[Dict],
    walls: List[Dict],
    total_area: float,
    floor_width: float,
    floor_height: float,
    lb_count: int,
    pt_count: int,
    max_span: float,
    span_category: str,
) -> str:
    """
    Call GPT-4o-mini to produce a concise expert structural assessment.
    Falls back to a rule-based sentence if the API is unavailable.
    """
    base_url = os.getenv("AI_INTEGRATIONS_OPENAI_BASE_URL")
    api_key  = os.getenv("AI_INTEGRATIONS_OPENAI_API_KEY", "dummy")

    if not base_url:
        logger.warning("OpenAI base URL not set — using fallback assessment.")
        return _fallback(rooms, lb_count, pt_count, max_span, span_category)

    try:
        import openai as _openai
        client = _openai.OpenAI(base_url=base_url, api_key=api_key)

        room_summary = [
            {"label": r.get("label", "Room"), "area_m2": round(r.get("area", 0), 1)}
            for r in rooms
        ]

        prompt = f"""You are a licensed structural engineer reviewing an AI-generated floor plan analysis. Write a professional 2–3 sentence assessment.

Floor plan data:
- Total area: {total_area:.1f} m²  |  Dimensions: {floor_width:.1f} m × {floor_height:.1f} m
- Load-bearing walls: {lb_count} (230 mm, safety factor 1.5)
- Partition walls: {pt_count} (115 mm, safety factor 1.23)
- Maximum span: {max_span:.1f} m — {span_category}
- Rooms: {json.dumps(room_summary)}

Cover in 2–3 flowing sentences (no bullets):
1. Overall structural integrity verdict
2. One specific observation about this layout (wall placement, spans, or room proportion)
3. One concrete recommendation

Be precise, professional, and specific to the numbers above."""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=160,
        )
        text = resp.choices[0].message.content.strip()
        logger.info("GPT structural assessment: %d chars", len(text))
        return text

    except Exception as exc:
        logger.error("Structural assessment GPT call failed (%s)", exc)
        return _fallback(rooms, lb_count, pt_count, max_span, span_category)
