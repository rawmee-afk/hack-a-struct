"""
Scene Enhancer — uses OpenAI GPT to generate a rich 3D scene description
for each analyzed floor plan: room floor colors, furniture placement,
and atmospheric point lighting.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


# ─── Fallback scene (no LLM) ──────────────────────────────────────────────────

ROOM_FLOOR_COLORS: Dict[str, str] = {
    "Living Room":    "#1e3a5f",
    "Master Bedroom": "#1a2e4a",
    "Bedroom":        "#1a2e4a",
    "Bedroom 2":      "#1a2e4a",
    "Bedroom 3":      "#162840",
    "Kitchen":        "#1e3323",
    "Bathroom":       "#102030",
    "Bathroom 2":     "#102030",
    "Laundry":        "#1a2a38",
    "Foyer":          "#2a1e3a",
    "Dining Room":    "#1e2a1a",
    "Study":          "#1e2a3a",
    "Storage":        "#1a1a2a",
    "Garage":         "#1e1e2e",
    "Balcony":        "#1a2030",
    "Staircase":      "#252535",
}


def _fallback_scene(rooms: List[Dict]) -> Dict[str, Any]:
    """Return a basic scene with room colors but no furniture."""
    return {
        "rooms": [
            {
                "roomId": i,
                "label": r.get("label", f"Room {i}"),
                "floorColor": ROOM_FLOOR_COLORS.get(r.get("label", ""), "#1e293b"),
                "furniture": []
            }
            for i, r in enumerate(rooms)
        ],
        "pointLights": [
            {"x": r.get("centroidX", 0), "y": 2.5, "z": r.get("centroidY", 0),
             "color": "#e8f0ff", "intensity": 0.6}
            for r in rooms[:4]
        ]
    }


# ─── GPT call ─────────────────────────────────────────────────────────────────

def enhance_scene(
    rooms: List[Dict],
    walls: List[Dict],
    total_area: float,
    floor_width: float,
    floor_height: float,
) -> Optional[Dict[str, Any]]:
    """
    Call OpenAI GPT to generate an enhanced 3D scene description:
    - Per room: floor color + furniture items (type, offset, size, color)
    - Scene-level: atmospheric point lights

    Falls back to a simple color-only scene if the API is unavailable.
    """
    base_url = os.getenv("AI_INTEGRATIONS_OPENAI_BASE_URL")
    api_key  = os.getenv("AI_INTEGRATIONS_OPENAI_API_KEY", "dummy")

    if not base_url:
        logger.warning("AI_INTEGRATIONS_OPENAI_BASE_URL not set — using fallback scene.")
        return _fallback_scene(rooms)

    try:
        import openai as _openai
        client = _openai.OpenAI(base_url=base_url, api_key=api_key)

        room_summary = [
            {
                "id": i,
                "label": r.get("label", f"Room {i}"),
                "area_sqm": round(r.get("area", 0), 1),
                "centroid_x": round(r.get("centroidX", 0), 2),
                "centroid_z": round(r.get("centroidY", 0), 2),
            }
            for i, r in enumerate(rooms)
        ]

        prompt = f"""You are a 3D scene designer generating furniture for a Three.js floor plan viewer.

Floor plan:
- Dimensions: {floor_width:.1f} m × {floor_height:.1f} m
- Total area: {total_area:.1f} m²
- Rooms:
{json.dumps(room_summary, indent=2)}

Generate a JSON object with EXACTLY this structure:
{{
  "rooms": [
    {{
      "roomId": 0,
      "floorColor": "#1e3a5f",
      "furniture": [
        {{
          "type": "sofa",
          "label": "Sofa",
          "offsetX": 0.4,
          "offsetZ": 0.2,
          "width": 2.0,
          "depth": 0.85,
          "height": 0.8,
          "color": "#2d3748",
          "rotation": 0
        }}
      ]
    }}
  ],
  "pointLights": [
    {{"x": 3.0, "y": 2.5, "z": 4.0, "color": "#ffe8d0", "intensity": 0.8}}
  ]
}}

RULES — follow exactly:
1. One entry per room, roomId = 0, 1, 2... matching array order above.
2. floorColor: dark, saturated hex matching room type (bedrooms = dark blue, kitchen = dark green, bathroom = dark teal, living = dark navy, foyer = dark purple).
3. Each room gets 1–3 furniture items appropriate for its type and area:
   - Bedroom: bed (1.5×2.0×0.45), wardrobe (1.0×0.5×2.0), nightstand (0.5×0.45×0.55)
   - Living Room: sofa (2.0×0.85×0.8), coffee_table (1.0×0.5×0.4), tv_unit (1.4×0.35×0.55)
   - Kitchen: counter (2.0×0.6×0.9), dining_table (1.2×0.75×0.75), chair (0.4×0.4×0.85)
   - Bathroom: toilet (0.38×0.55×0.75), sink (0.5×0.4×0.85), shower_tray (0.85×0.85×0.06)
   - Foyer: shoe_rack (0.9×0.3×0.85), bench (0.9×0.35×0.45)
   - Dining Room: dining_table (1.6×0.9×0.75), chair (0.4×0.4×0.9)
   - Laundry: washing_machine (0.6×0.6×0.85)
4. offsetX/offsetZ: distance in metres from room centroid. Keep offsets small (< room_size/2 - 0.5) so furniture stays inside the room. room_size ≈ sqrt(area_sqm).
5. Furniture colors: dark slate tones (#1e293b, #2d3748, #334155, #475569) with slight variation.
6. Add 1–3 warm point lights at room centroids, y=2.5, intensity 0.6–1.2, warm colors (#ffe8d0, #ffd6a0, #e8f0ff).
7. Return ONLY valid JSON. No markdown. No explanation. No trailing commas."""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=2500,
        )

        content = resp.choices[0].message.content.strip()

        # Strip any markdown code fences if the model wraps in ```json
        if "```" in content:
            start = content.find("{")
            end   = content.rfind("}") + 1
            content = content[start:end]

        scene = json.loads(content)
        logger.info("Scene enhancement from GPT: %d rooms, %d lights",
                    len(scene.get("rooms", [])),
                    len(scene.get("pointLights", [])))
        return scene

    except Exception as exc:
        logger.error("Scene enhancement failed (%s) — using fallback.", exc)
        return _fallback_scene(rooms)
