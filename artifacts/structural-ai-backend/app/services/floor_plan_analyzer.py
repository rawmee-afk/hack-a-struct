"""
Floor Plan Analyzer — Pure OpenCV + Heuristic Engine (zero LLM calls)

Pipeline
--------
1. Pre-process: Otsu binary → morphological closing (bridges door gaps).
2. Wall detection: HoughLinesP + pixel-width scan → load-bearing vs partition.
3. Compartment detection: flood-fill from borders removes exterior → rooms.
4. Room labeling: rank rooms by area + position heuristics → assign labels.
5. Area scaling: pixel areas → real-world m² via dwelling-size lookup table.
6. Built-up Area: carpet area + wall area (thickness × length) − corner correction.
7. Span analysis: per-room sqrt(area) → max/avg span for material scoring.
8. Floor polygon: outer contour → simplified polygon for 3-D floor slab.

No API calls. No AI. Runs entirely offline with OpenCV + NumPy.
"""

import logging
import math
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Room label heuristics
# ─────────────────────────────────────────────────────────────────────────────

# Typical Indian residential room areas in m²  (used to scale pixel areas)
_TYPICAL_AREAS: Dict[str, float] = {
    "Living Room":     22.0,
    "Master Bedroom":  16.0,
    "Bedroom":         12.0,
    "Kitchen":         10.0,
    "Dining Room":     14.0,
    "Bathroom":         5.0,
    "Toilet/WC":        3.5,
    "Study/Office":     9.0,
    "Hallway":          6.0,
    "Balcony":          5.0,
    "Storage":          4.0,
    "Utility Room":     6.0,
    "Pantry":           3.0,
    "Garage":          18.0,
    "Pooja Room":       4.0,
}

# Typical total built-up areas by room count (Indian residential)
_TOTAL_AREA_BY_ROOMS = {
    1:  35.0,
    2:  55.0,
    3:  75.0,
    4:  95.0,
    5: 120.0,
    6: 145.0,
    7: 165.0,
    8: 185.0,
}


def _guess_total_area(room_count: int) -> float:
    if room_count in _TOTAL_AREA_BY_ROOMS:
        return _TOTAL_AREA_BY_ROOMS[room_count]
    return 185.0 + (room_count - 8) * 18.0


def _assign_room_labels(compartments: List[Dict], img_w: int, img_h: int) -> List[Dict]:
    """
    Assign room labels purely from pixel area (size rank) and centroid position.
    No API calls — pure geometric heuristics.

    Rules (applied in rank order by pixel area, largest first):
      Rank 1 (largest)  → Living Room
      Rank 2            → Master Bedroom  (if top-half) else Dining Room
      Rank 3            → Bedroom
      Rank 4            → Kitchen         (top-right quadrant preferred)
      Rank 5            → Dining Room     (if not already assigned) else Bedroom
      Rank 6+, small    → Bathroom / Toilet / Study / Hallway based on size
    """
    n = len(compartments)
    if n == 0:
        return compartments

    total_px = sum(c["_area_px"] for c in compartments) or 1

    # Rank by area largest → smallest (already sorted by caller)
    labels_out: List[str] = [""] * n
    used: set = set()

    def pick(label: str) -> str:
        used.add(label)
        return label

    for rank, comp in enumerate(compartments):
        frac = comp["_area_px"] / total_px
        cx_f = comp["_cx_frac"]
        cy_f = comp["_cy_frac"]

        if rank == 0:
            labels_out[rank] = pick("Living Room")

        elif rank == 1:
            if frac > 0.18:
                labels_out[rank] = pick("Master Bedroom") if cy_f < 0.5 else pick("Dining Room")
            else:
                labels_out[rank] = pick("Master Bedroom")

        elif rank == 2:
            if "Dining Room" not in used and frac > 0.12:
                labels_out[rank] = pick("Dining Room")
            else:
                labels_out[rank] = pick("Bedroom")

        elif rank == 3:
            if "Kitchen" not in used:
                labels_out[rank] = pick("Kitchen")
            else:
                labels_out[rank] = pick("Bedroom")

        elif rank == 4:
            if "Bedroom" in used and "Bedroom 2" not in used:
                labels_out[rank] = pick("Bedroom 2")
            elif "Hallway" not in used and frac < 0.10:
                labels_out[rank] = pick("Hallway")
            else:
                labels_out[rank] = pick("Study/Office")

        else:
            # Small rooms — assign by size
            if frac < 0.04:
                if "Toilet/WC" not in used:
                    labels_out[rank] = pick("Toilet/WC")
                elif "Bathroom" not in used:
                    labels_out[rank] = pick("Bathroom")
                elif "Storage" not in used:
                    labels_out[rank] = pick("Storage")
                elif "Pantry" not in used:
                    labels_out[rank] = pick("Pantry")
                elif "Pooja Room" not in used:
                    labels_out[rank] = pick("Pooja Room")
                else:
                    labels_out[rank] = f"Room {rank + 1}"
            elif frac < 0.08:
                if "Bathroom" not in used:
                    labels_out[rank] = pick("Bathroom")
                elif "Utility Room" not in used:
                    labels_out[rank] = pick("Utility Room")
                elif "Balcony" not in used:
                    labels_out[rank] = pick("Balcony")
                else:
                    labels_out[rank] = f"Room {rank + 1}"
            else:
                if "Bedroom 2" not in used:
                    labels_out[rank] = pick("Bedroom 2")
                elif "Bedroom 3" not in used:
                    labels_out[rank] = pick("Bedroom 3")
                else:
                    labels_out[rank] = f"Room {rank + 1}"

    for i, comp in enumerate(compartments):
        comp["label"] = labels_out[i]

    return compartments


def _scale_areas(compartments: List[Dict]) -> float:
    """
    Compute pix_to_m2 scaling factor using the dwelling lookup table.
    Returns pix_to_m2.
    """
    n = len(compartments)
    total_px = sum(c["_area_px"] for c in compartments) or 1
    total_m2 = _guess_total_area(n)

    # Cross-check with typical label areas where we have known labels
    label_areas = []
    for comp in compartments:
        lbl = comp.get("label", "")
        if lbl in _TYPICAL_AREAS:
            label_areas.append((_TYPICAL_AREAS[lbl], comp["_area_px"]))

    if label_areas:
        # Weighted average of per-room scale estimates
        scales = [m2 / px for m2, px in label_areas if px > 0]
        pix_to_m2 = sum(scales) / len(scales)
    else:
        pix_to_m2 = total_m2 / total_px

    return pix_to_m2


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

def analyze_floor_plan(image_data: bytes) -> Dict[str, Any]:
    """Analyze a 2-D floor plan. Returns walls, rooms, span analysis, and 3-D model data.
    Uses only OpenCV — no LLM or external API calls.
    """
    nparr = np.frombuffer(image_data, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Please upload a valid PNG or JPG file.")

    height, width = img.shape[:2]
    vis_scale = 10.0 / max(width, height)

    # ── Binary pre-processing ──────────────────────────────────────────────
    gray    = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    _, binary_walls = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    k3 = np.ones((3, 3), np.uint8)
    binary_walls = cv2.morphologyEx(binary_walls, cv2.MORPH_CLOSE, k3, iterations=2)
    binary_walls = cv2.morphologyEx(binary_walls, cv2.MORPH_OPEN,  k3, iterations=1)

    # Larger closing for compartments — bridges door-width gaps
    gap_kernel_size = max(9, min(width, height) // 40)
    if gap_kernel_size % 2 == 0:
        gap_kernel_size += 1
    k_gap        = np.ones((gap_kernel_size, gap_kernel_size), np.uint8)
    binary_rooms = cv2.morphologyEx(binary_walls, cv2.MORPH_CLOSE, k_gap, iterations=3)

    # ── Walls with type classification ────────────────────────────────────
    walls = _detect_walls_hough(binary_walls, width, height, vis_scale)
    if len(walls) < 3:
        walls = _detect_walls_contour(binary_walls, width, height, vis_scale)

    load_bearing = [w for w in walls if w["wallType"] == "load_bearing"]
    partitions   = [w for w in walls if w["wallType"] == "partition"]

    # ── Compartments ──────────────────────────────────────────────────────
    raw_rooms = _detect_compartments(binary_rooms, width, height)

    # ── Heuristic room labeling (no AI) ───────────────────────────────────
    raw_rooms  = _assign_room_labels(raw_rooms, width, height)
    pix_to_m2  = _scale_areas(raw_rooms)
    vis_scale2 = 10.0 / max(width, height)

    rooms: List[Dict] = []
    for comp in raw_rooms:
        area = round(comp["_area_px"] * pix_to_m2, 1)
        area = max(area, 1.0)
        rooms.append({
            "id":        comp["id"],
            "label":     comp["label"],
            "area":      area,
            "perimeter": round(comp["_perim_px"] * vis_scale2, 2),
            "centroidX": round(comp["_cx_px"] * vis_scale2, 2),
            "centroidY": round(comp["_cy_px"] * vis_scale2, 2),
        })

    # ── Span analysis ─────────────────────────────────────────────────────
    spans    = [math.sqrt(r["area"]) for r in rooms if r["area"] > 0]
    max_span = round(max(spans), 2) if spans else 0.0
    avg_span = round(sum(spans) / len(spans), 2) if spans else 0.0

    # ── Built-up Area (carpet + wall area − corner corrections) ───────────
    carpet_area = sum(r["area"] for r in rooms)
    if carpet_area < 1:
        carpet_area = _guess_total_area(len(rooms))

    lb_thick = 0.23     # 230 mm load-bearing
    pt_thick = 0.115    # 115 mm partition

    wall_area     = sum(w["length"] * lb_thick for w in load_bearing) + \
                    sum(w["length"] * pt_thick for w in partitions)
    corner_count  = max(4, len(load_bearing) // 2)
    corner_correc = corner_count * (lb_thick ** 2)
    buildup_area  = round(carpet_area + wall_area - corner_correc, 2)

    total_wall_length = sum(w["length"] for w in walls)

    # ── Floor polygon for 3-D slab ─────────────────────────────────────────
    floor_polygon = _extract_floor_polygon(binary_rooms, width, height, vis_scale)

    # ── Window detection ──────────────────────────────────────────────────
    windows = _detect_windows(binary_walls, width, height, vis_scale, walls)

    model3d = {
        "walls":        walls,
        "windows":      windows,
        "wallHeight":   3.0,
        "floorWidth":   width  * vis_scale,
        "floorHeight":  height * vis_scale,
        "scale":        vis_scale,
        "floorPolygon": floor_polygon,
    }

    return {
        "imageWidth":       float(width),
        "imageHeight":      float(height),
        "walls":            walls,
        "rooms":            rooms,
        "totalWallLength":  round(total_wall_length, 2),
        "totalArea":        round(carpet_area, 2),
        "builtUpArea":      buildup_area,
        "maxSpan":          max_span,
        "avgSpan":          avg_span,
        "loadBearingCount": len(load_bearing),
        "partitionCount":   len(partitions),
        "model3d":          model3d,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Wall detection + type classification
# ─────────────────────────────────────────────────────────────────────────────

def _measure_wall_thickness_px(binary: np.ndarray, x1: float, y1: float,
                                x2: float, y2: float) -> int:
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    if length < 1:
        return 2
    px, py = -dy / length, dx / length
    h, w   = binary.shape

    totals = []
    for frac in (0.25, 0.5, 0.75):
        cx = x1 + dx * frac
        cy = y1 + dy * frac
        thick = 0
        for sign in (1, -1):
            for i in range(1, 40):
                qx = int(cx + px * i * sign)
                qy = int(cy + py * i * sign)
                if 0 <= qx < w and 0 <= qy < h and binary[qy, qx] > 128:
                    thick += 1
                else:
                    break
        totals.append(thick)

    return int(sum(totals) / len(totals)) if totals else 2


def _wall_type_from_thickness(thick_px: int, is_boundary: bool) -> Dict[str, Any]:
    if is_boundary or thick_px >= 8:
        return {
            "wallType":     "load_bearing",
            "thickness_m":   0.23,
            "safetyFactor":  1.5,
            "thickness":     0.25,
        }
    return {
        "wallType":     "partition",
        "thickness_m":   0.115,
        "safetyFactor":  1.23,
        "thickness":     0.12,
    }


def _is_boundary_segment(x1, y1, x2, y2, img_w, img_h, margin_frac=0.08) -> bool:
    mg = margin_frac
    for x, y in ((x1, y1), (x2, y2)):
        xn, yn = x / img_w, y / img_h
        if xn < mg or xn > 1 - mg or yn < mg or yn > 1 - mg:
            return True
    return False


def _snap_to_cardinal(x1: float, y1: float,
                      x2: float, y2: float,
                      snap_deg: float = 12.0
                      ) -> Tuple[float, float, float, float]:
    """
    Snap near-horizontal and near-vertical wall segments to exact 0°/90°.
    Eliminates the slight diagonal drift from noisy Hough detection.
    """
    dx, dy = x2 - x1, y2 - y1
    angle  = abs(math.degrees(math.atan2(dy, dx))) % 180

    # Near-horizontal → flatten Y to midpoint
    if angle < snap_deg or angle > (180 - snap_deg):
        y_mid = (y1 + y2) / 2
        return x1, y_mid, x2, y_mid

    # Near-vertical → flatten X to midpoint
    if 90 - snap_deg < angle < 90 + snap_deg:
        x_mid = (x1 + x2) / 2
        return x_mid, y1, x_mid, y2

    return x1, y1, x2, y2


def _detect_door_arc_mask(binary: np.ndarray,
                          img_w: int, img_h: int) -> np.ndarray:
    """
    Detect quarter-circle door-swing arcs using HoughCircles.
    Returns a uint8 mask (255 = door arc zone, 0 = free) dilated by the arc
    radius so nearby wall stubs are also excluded.
    """
    mask = np.zeros((img_h, img_w), dtype=np.uint8)
    gray = binary.copy()

    min_r = min(img_w, img_h) // 30
    max_r = min(img_w, img_h) // 6

    circles = cv2.HoughCircles(
        gray,
        cv2.HOUGH_GRADIENT,
        dp=1.5,
        minDist=min_r * 2,
        param1=60,
        param2=25,
        minRadius=min_r,
        maxRadius=max_r,
    )
    if circles is not None:
        for cx, cy, r in np.round(circles[0]).astype(int):
            # Draw filled circle + margin so any wall segment PASSING THROUGH
            # the arc region is also discarded
            cv2.circle(mask, (cx, cy), r + max(6, r // 5), 255, -1)

    return mask


def _detect_walls_hough(binary: np.ndarray, img_w: int, img_h: int,
                        vis_scale: float) -> List[Dict]:
    edges    = cv2.Canny(binary, 50, 150, apertureSize=3)
    min_line = min(img_w, img_h) // 15
    lines    = cv2.HoughLinesP(
        edges, 1, np.pi / 180, threshold=80,
        minLineLength=min_line, maxLineGap=20,
    )
    walls: List[Dict] = []

    # Build door-arc exclusion mask
    arc_mask = _detect_door_arc_mask(binary, img_w, img_h)

    if lines is not None:
        for x1, y1, x2, y2 in _merge_lines(lines):
            length_px = math.hypot(x2 - x1, y2 - y1)
            if length_px < min_line:
                continue

            # Reject segments whose midpoint falls inside a door-arc zone
            mx, my = int((x1 + x2) / 2), int((y1 + y2) / 2)
            if 0 <= mx < img_w and 0 <= my < img_h:
                if arc_mask[my, mx] > 0:
                    continue

            # Snap near-cardinal walls to exact 0°/90°
            x1, y1, x2, y2 = _snap_to_cardinal(x1, y1, x2, y2)

            # Re-compute length after snap
            length_px   = max(math.hypot(x2 - x1, y2 - y1), 1.0)
            thick_px    = _measure_wall_thickness_px(binary, int(x1), int(y1), int(x2), int(y2))
            on_boundary = _is_boundary_segment(x1, y1, x2, y2, img_w, img_h)
            wtype       = _wall_type_from_thickness(thick_px, on_boundary)

            walls.append({
                "x1": float(x1) * vis_scale, "y1": float(y1) * vis_scale,
                "x2": float(x2) * vis_scale, "y2": float(y2) * vis_scale,
                "length": round(length_px * vis_scale, 3),
                **wtype,
            })

    return walls[:80] or _generate_fallback_walls(img_w, img_h, vis_scale)


def _merge_lines(lines: np.ndarray,
                 angle_thr: float = 10,
                 dist_thr:  float = 18) -> List[Tuple]:
    """
    Merge nearby parallel Hough line segments into single wall segments.

    Improvement over naive bounding-box approach:
    - Groups by angle bucket (cardinal or diagonal)
    - Projects all endpoints onto the dominant axis direction
    - Computes extent along that axis; uses average perpendicular offset
    - Result: straight, axis-aligned segments instead of diagonal bounding boxes
    """
    segs = [tuple(l[0]) for l in lines]
    if not segs:
        return []

    merged: List[Tuple] = []
    used   = [False] * len(segs)

    for i, si in enumerate(segs):
        if used[i]:
            continue

        ai_raw = math.atan2(si[3] - si[1], si[2] - si[0]) * 180 / math.pi
        ai     = ai_raw % 180          # normalise to [0, 180)
        group  = [si]
        used[i] = True

        for j, sj in enumerate(segs):
            if used[j]:
                continue
            aj = math.atan2(sj[3] - sj[1], sj[2] - sj[0]) * 180 / math.pi % 180
            da = abs(ai - aj) % 180
            if da > angle_thr and abs(da - 180) > angle_thr:
                continue
            # Proximity check: midpoints must be close relative to line length
            mi = ((si[0] + si[2]) / 2, (si[1] + si[3]) / 2)
            mj = ((sj[0] + sj[2]) / 2, (sj[1] + sj[3]) / 2)
            if math.hypot(mi[0] - mj[0], mi[1] - mj[1]) < dist_thr * 4:
                group.append(sj)
                used[j] = True

        # ── Find dominant direction ───────────────────────────────────────
        angles_rad = [math.atan2(s[3] - s[1], s[2] - s[0]) for s in group]
        avg_angle  = sum(angles_rad) / len(angles_rad)
        ux, uy     = math.cos(avg_angle), math.sin(avg_angle)  # unit along line
        px, py     = -uy, ux                                    # unit perpendicular

        # Collect all endpoints
        pts = [(s[0], s[1]) for s in group] + [(s[2], s[3]) for s in group]

        # Project onto line direction (scalar along ux/uy)
        projs  = [p[0] * ux + p[1] * uy for p in pts]
        # Average perpendicular offset (gives the "spine" of the group)
        perps  = [p[0] * px + p[1] * py for p in pts]
        p_avg  = sum(perps) / len(perps)

        # Reconstruct start and end from min/max projection + average perp
        t_min, t_max = min(projs), max(projs)
        x1 = ux * t_min + px * p_avg
        y1 = uy * t_min + py * p_avg
        x2 = ux * t_max + px * p_avg
        y2 = uy * t_max + py * p_avg

        merged.append((x1, y1, x2, y2))

    return merged


def _detect_walls_contour(binary: np.ndarray, img_w: int, img_h: int,
                           vis_scale: float) -> List[Dict]:
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area    = img_w * img_h * 0.001
    walls: List[Dict] = []

    for cnt in contours:
        if cv2.contourArea(cnt) < min_area:
            continue
        box = np.int0(cv2.boxPoints(cv2.minAreaRect(cnt)))
        for k in range(4):
            x1, y1 = int(box[k][0]), int(box[k][1])
            x2, y2 = int(box[(k + 1) % 4][0]), int(box[(k + 1) % 4][1])
            lp = math.hypot(x2 - x1, y2 - y1)
            if lp > img_w * 0.05:
                thick_px    = _measure_wall_thickness_px(binary, x1, y1, x2, y2)
                on_boundary = _is_boundary_segment(x1, y1, x2, y2, img_w, img_h)
                wtype       = _wall_type_from_thickness(thick_px, on_boundary)
                walls.append({
                    "x1": float(x1) * vis_scale, "y1": float(y1) * vis_scale,
                    "x2": float(x2) * vis_scale, "y2": float(y2) * vis_scale,
                    "length": round(lp * vis_scale, 3),
                    **wtype,
                })

    return walls[:60] or _generate_fallback_walls(img_w, img_h, vis_scale)


# ─────────────────────────────────────────────────────────────────────────────
# Compartment detection
# ─────────────────────────────────────────────────────────────────────────────

def _detect_compartments(binary: np.ndarray, img_w: int, img_h: int) -> List[Dict]:
    inverted = cv2.bitwise_not(binary)
    h, w     = inverted.shape
    interior = inverted.copy()

    flood_mask   = np.zeros((h + 2, w + 2), np.uint8)
    border_seeds = (
        [(x, 0)     for x in range(0, w, 10)] +
        [(x, h - 1) for x in range(0, w, 10)] +
        [(0, y)     for y in range(0, h, 10)] +
        [(w - 1, y) for y in range(0, h, 10)]
    )
    for sx, sy in border_seeds:
        if interior[sy, sx] == 255:
            cv2.floodFill(interior, flood_mask, (sx, sy), 0)

    k = np.ones((3, 3), np.uint8)
    interior = cv2.morphologyEx(interior, cv2.MORPH_OPEN, k, iterations=1)

    contours, _ = cv2.findContours(interior, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    total_px  = img_w * img_h
    min_area  = total_px * 0.003
    max_area  = total_px * 0.85

    compartments: List[Dict] = []
    for idx, cnt in enumerate(contours, start=1):
        area_px = cv2.contourArea(cnt)
        if area_px < min_area or area_px > max_area:
            continue
        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue
        cx  = int(M["m10"] / M["m00"])
        cy  = int(M["m01"] / M["m00"])
        per = cv2.arcLength(cnt, True)

        compartments.append({
            "id":       idx,
            "_cx_px":   cx,
            "_cy_px":   cy,
            "_area_px": area_px,
            "_perim_px":per,
            "_cx_frac": cx / img_w,
            "_cy_frac": cy / img_h,
            "label":    "",
            "area":     0.0,
            "perimeter":0.0,
            "centroidX":0.0,
            "centroidY":0.0,
        })

    compartments.sort(key=lambda r: r["_area_px"], reverse=True)
    return compartments[:20] or _fallback_compartments(img_w, img_h)


# ─────────────────────────────────────────────────────────────────────────────
# Floor polygon extraction (for accurate 3-D floor slab)
# ─────────────────────────────────────────────────────────────────────────────

def _extract_floor_polygon(binary_rooms: np.ndarray,
                           img_w: int, img_h: int,
                           vis_scale: float) -> Optional[List[List[float]]]:
    inverted = cv2.bitwise_not(binary_rooms)
    h, w     = inverted.shape
    interior = inverted.copy()

    flood_mask = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(0, w, 5):
        if interior[0, x] == 255:
            cv2.floodFill(interior, flood_mask, (x, 0), 0)
        if interior[h - 1, x] == 255:
            cv2.floodFill(interior, flood_mask, (x, h - 1), 0)
    for y in range(0, h, 5):
        if interior[y, 0] == 255:
            cv2.floodFill(interior, flood_mask, (0, y), 0)
        if interior[y, w - 1] == 255:
            cv2.floodFill(interior, flood_mask, (w - 1, y), 0)

    gap_kernel = max(9, min(w, h) // 40)
    k          = np.ones((gap_kernel, gap_kernel), np.uint8)
    merged     = cv2.morphologyEx(interior, cv2.MORPH_DILATE, k, iterations=2)

    contours, _ = cv2.findContours(merged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(largest) < img_w * img_h * 0.05:
        return None

    eps    = 0.015 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, eps, True)

    polygon = [[round(float(pt[0][0]) * vis_scale, 3),
                round(float(pt[0][1]) * vis_scale, 3)]
               for pt in approx]

    return polygon if len(polygon) >= 3 else None


# ─────────────────────────────────────────────────────────────────────────────
# Window detection
# ─────────────────────────────────────────────────────────────────────────────

def _pt_to_seg_dist(px: float, py: float,
                    ax: float, ay: float,
                    bx: float, by: float) -> float:
    """Perpendicular (or endpoint) distance from point P to segment AB."""
    abx, aby = bx - ax, by - ay
    len2 = abx * abx + aby * aby
    if len2 == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / len2))
    return math.hypot(px - (ax + t * abx), py - (ay + t * aby))


def _detect_windows(
    binary: np.ndarray,
    img_w: int, img_h: int,
    vis_scale: float,
    walls: List[Dict],
) -> List[Dict]:
    """
    Detect window openings on exterior walls.

    Windows in architectural drawings appear as short thin double-line
    segments set within the wall thickness on outer walls.

    Strategy:
    1.  Run HoughLinesP with a shorter min-length to pick up window lines
        (which are shorter than wall lines and thinner).
    2.  Keep only lines that are close to a load-bearing (exterior) wall
        and are themselves thin (window symbol, not a wall).
    3.  Merge nearby/parallel candidates into single window records.
    4.  Convert to scene-unit WindowOpening dicts.
    """
    windows: List[Dict] = []

    # ── Exterior wall pixel segments ──────────────────────────────────────
    ext_walls_px = [
        (w["x1"] / vis_scale, w["y1"] / vis_scale,
         w["x2"] / vis_scale, w["y2"] / vis_scale)
        for w in walls if w.get("wallType") == "load_bearing"
    ]
    if not ext_walls_px:
        return windows

    # ── Short-line Hough scan ─────────────────────────────────────────────
    edges = cv2.Canny(binary, 30, 120, apertureSize=3)
    min_win_px = max(10, min(img_w, img_h) // 35)
    max_win_px = min(img_w, img_h) // 7

    raw = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=25,
        minLineLength=min_win_px,
        maxLineGap=4,
    )
    if raw is None:
        return windows

    candidates: List[Tuple] = []
    for line in raw:
        x1, y1, x2, y2 = line[0]
        length_px = math.hypot(x2 - x1, y2 - y1)
        if length_px > max_win_px:
            continue
        # Thin check: window lines are thin (2-4 px), walls are thick (8+)
        thick = _measure_wall_thickness_px(binary, x1, y1, x2, y2)
        if thick > 6:
            continue  # too thick — it's a wall segment, not a window

        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2

        # Must be within proximity of an exterior wall
        min_d = min(_pt_to_seg_dist(cx, cy, ax, ay, bx, by)
                    for ax, ay, bx, by in ext_walls_px)
        if min_d > 18:
            continue

        angle = math.atan2(y2 - y1, x2 - x1)
        candidates.append((cx, cy, length_px, angle, x1, y1, x2, y2))

    if not candidates:
        return windows

    # ── Merge nearby/parallel candidates (same window = 2 parallel lines) ─
    used = [False] * len(candidates)
    merged: List[Dict] = []

    for i, ci in enumerate(candidates):
        if used[i]:
            continue
        group = [ci]
        used[i] = True
        for j, cj in enumerate(candidates):
            if used[j] or i == j:
                continue
            # Same direction?
            da = abs(ci[3] - cj[3]) % math.pi
            if da > 0.2 and abs(da - math.pi) > 0.2:
                continue
            # Close to each other?
            if math.hypot(ci[0] - cj[0], ci[1] - cj[1]) < 20:
                group.append(cj)
                used[j] = True

        # Use the longest line in the group as the representative
        rep = max(group, key=lambda c: c[2])
        cx, cy, lpx, angle = rep[0], rep[1], rep[2], rep[3]

        merged.append({
            "cx":    cx,
            "cy":    cy,
            "width": lpx * vis_scale,
            "angle": angle,
        })

    # ── Convert to WindowOpening records ─────────────────────────────────
    for m in merged[:16]:
        windows.append({
            "cx":            round(m["cx"] * vis_scale, 3),
            "cz":            round(m["cy"] * vis_scale, 3),
            "width":         round(max(m["width"], 0.6), 2),
            "rotationY":     round(-m["angle"], 4),
            "sillHeight":    0.9,
            "openingHeight": 1.2,
        })

    return windows


# ─────────────────────────────────────────────────────────────────────────────
# Fallbacks
# ─────────────────────────────────────────────────────────────────────────────

def _generate_fallback_walls(img_w: int, img_h: int, scale: float) -> List[Dict]:
    w  = img_w * scale * 0.9
    h  = img_h * scale * 0.9
    ox = img_w * scale * 0.05
    oy = img_h * scale * 0.05
    lb = {"wallType": "load_bearing", "thickness_m": 0.23, "safetyFactor": 1.5,  "thickness": 0.25}
    pt = {"wallType": "partition",    "thickness_m": 0.115, "safetyFactor": 1.23, "thickness": 0.12}
    return [
        {"x1": ox,         "y1": oy,         "x2": ox + w,      "y2": oy,         "length": round(w, 2), **lb},
        {"x1": ox + w,     "y1": oy,         "x2": ox + w,      "y2": oy + h,     "length": round(h, 2), **lb},
        {"x1": ox + w,     "y1": oy + h,     "x2": ox,          "y2": oy + h,     "length": round(w, 2), **lb},
        {"x1": ox,         "y1": oy + h,     "x2": ox,          "y2": oy,         "length": round(h, 2), **lb},
        {"x1": ox + w*0.5, "y1": oy,         "x2": ox + w*0.5,  "y2": oy + h*0.6, "length": round(h*0.6, 2), **pt},
        {"x1": ox,         "y1": oy + h*0.5, "x2": ox + w*0.5,  "y2": oy + h*0.5, "length": round(w*0.5, 2), **pt},
    ]


def _fallback_compartments(img_w: int, img_h: int) -> List[Dict]:
    total = img_w * img_h
    return [
        {"id": 1, "_cx_px": int(img_w*0.25), "_cy_px": int(img_h*0.50),
         "_area_px": total*0.40, "_perim_px": (img_w+img_h)*0.8,
         "_cx_frac": 0.25, "_cy_frac": 0.50, "label": "", "area": 0.0,
         "perimeter": 0.0, "centroidX": 0.0, "centroidY": 0.0},
        {"id": 2, "_cx_px": int(img_w*0.70), "_cy_px": int(img_h*0.30),
         "_area_px": total*0.25, "_perim_px": (img_w+img_h)*0.6,
         "_cx_frac": 0.70, "_cy_frac": 0.30, "label": "", "area": 0.0,
         "perimeter": 0.0, "centroidX": 0.0, "centroidY": 0.0},
        {"id": 3, "_cx_px": int(img_w*0.75), "_cy_px": int(img_h*0.75),
         "_area_px": total*0.15, "_perim_px": (img_w+img_h)*0.4,
         "_cx_frac": 0.75, "_cy_frac": 0.75, "label": "", "area": 0.0,
         "perimeter": 0.0, "centroidX": 0.0, "centroidY": 0.0},
        {"id": 4, "_cx_px": int(img_w*0.50), "_cy_px": int(img_h*0.80),
         "_area_px": total*0.10, "_perim_px": (img_w+img_h)*0.35,
         "_cx_frac": 0.50, "_cy_frac": 0.80, "label": "", "area": 0.0,
         "perimeter": 0.0, "centroidX": 0.0, "centroidY": 0.0},
    ]
