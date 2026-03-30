"""
Material Recommender — Pure rule-based scoring engine (zero LLM calls).

Uses span analysis and wall classification to score all 37 materials using
a deterministic weighted formula. No API calls — runs entirely offline.

Scoring formula:
  Score = 0.35×Strength + 0.30×(1−Cost)×BudgetMult + 0.20×Durability + 0.15×ClimateFit − SpanPenalty
"""
from typing import List, Dict, Any, Optional


MATERIALS = {
    # ── MASONRY ─────────────────────────────────────────────────────────────
    "Red Brick": {
        "base_cost_per_sqm":        1200,
        "compressive_strength_mpa":  7.5,
        "tensile_strength_mpa":      0.5,
        "thermal_insulation":        0.70,
        "durability_years":          80,
        "earthquake_resistance":     0.40,
        "moisture_resistance":       0.50,
        "max_safe_span_m":           4.5,
        "category":                  "Masonry",
        "pros": [
            "Excellent thermal mass and insulation",
            "Low cost and widely available",
            "Fire resistant with low maintenance",
            "Suitable for spans up to 4.5 m",
        ],
        "cons": [
            "Poor seismic performance without reinforcement",
            "Not suitable for spans > 4.5 m",
            "Limited tensile strength",
        ],
    },
    "Fly Ash Brick": {
        "base_cost_per_sqm":         900,
        "compressive_strength_mpa":   7.5,
        "tensile_strength_mpa":       0.6,
        "thermal_insulation":         0.72,
        "durability_years":           80,
        "earthquake_resistance":      0.42,
        "moisture_resistance":        0.55,
        "max_safe_span_m":            4.5,
        "category":                   "Masonry",
        "pros": [
            "10-20% cheaper than red brick",
            "Uses industrial waste — eco-friendly and LEED-compatible",
            "Higher compressive uniformity than fired brick",
            "Low water absorption compared to red brick",
        ],
        "cons": [
            "Not yet available in all regions of India",
            "Quality varies by fly-ash source",
            "Limited to spans ≤ 4.5 m",
        ],
    },
    "Fal-G Brick (Fly Ash-Lime-Gypsum)": {
        "base_cost_per_sqm":         800,
        "compressive_strength_mpa":   8.5,
        "tensile_strength_mpa":       0.6,
        "thermal_insulation":         0.68,
        "durability_years":           75,
        "earthquake_resistance":      0.40,
        "moisture_resistance":        0.50,
        "max_safe_span_m":            4.5,
        "category":                   "Masonry",
        "pros": [
            "No kiln firing needed — zero fuel energy",
            "Lowest carbon footprint of all bricks",
            "Utilises power plant and fertiliser waste",
            "Compressive strength 8.5 MPa — stronger than red brick",
        ],
        "cons": [
            "Requires curing for 28 days",
            "Poor weathering resistance without plaster",
            "Limited load-bearing height",
        ],
    },
    "Hollow Concrete Block (CMU)": {
        "base_cost_per_sqm":        1100,
        "compressive_strength_mpa":   5.0,
        "tensile_strength_mpa":       0.6,
        "thermal_insulation":         0.60,
        "durability_years":           90,
        "earthquake_resistance":      0.55,
        "moisture_resistance":        0.65,
        "max_safe_span_m":            5.0,
        "category":                   "Masonry",
        "pros": [
            "30% faster to lay than brick — reduces labour cost",
            "Hollow cores can be grouted with steel for seismic zones",
            "Good sound insulation",
            "Dimensionally accurate — no mortar waste",
        ],
        "cons": [
            "Lower compressive strength than solid block",
            "Requires plastering for aesthetics",
            "Heavier than AAC — increased dead load",
        ],
    },
    "Solid Concrete Block": {
        "base_cost_per_sqm":        1400,
        "compressive_strength_mpa":  15.0,
        "tensile_strength_mpa":       1.2,
        "thermal_insulation":         0.45,
        "durability_years":          100,
        "earthquake_resistance":      0.65,
        "moisture_resistance":        0.72,
        "max_safe_span_m":            5.5,
        "category":                   "Masonry",
        "pros": [
            "High density gives excellent fire resistance",
            "Good moisture resistance for coastal zones",
            "Can carry significant axial loads",
            "100-year design life",
        ],
        "cons": [
            "Heavier than AAC — higher foundation load",
            "Poor thermal insulation (0.45)",
            "Higher cost than hollow block",
        ],
    },
    "Reinforced Brick Masonry (RBM)": {
        "base_cost_per_sqm":        1500,
        "compressive_strength_mpa":  12.0,
        "tensile_strength_mpa":       1.5,
        "thermal_insulation":         0.65,
        "durability_years":           85,
        "earthquake_resistance":      0.60,
        "moisture_resistance":        0.52,
        "max_safe_span_m":            6.0,
        "category":                   "Masonry",
        "pros": [
            "Extends brick spans to 6 m with embedded steel bars",
            "Better seismic resistance than plain brick",
            "Uses skilled masons — labour widely available",
            "Good thermal mass",
        ],
        "cons": [
            "More complex construction than standard brick",
            "Steel bars add material cost",
            "Still limited to 6 m maximum spans",
        ],
    },
    "Hollow Clay Block (Terra Cotta)": {
        "base_cost_per_sqm":        1100,
        "compressive_strength_mpa":   5.0,
        "tensile_strength_mpa":       0.5,
        "thermal_insulation":         0.80,
        "durability_years":           80,
        "earthquake_resistance":      0.38,
        "moisture_resistance":        0.45,
        "max_safe_span_m":            4.5,
        "category":                   "Masonry",
        "pros": [
            "Excellent thermal insulation (0.80) — best in masonry class",
            "Light weight — reduces structural dead load",
            "Good acoustic insulation",
            "Fired clay — naturally durable",
        ],
        "cons": [
            "Brittle under lateral seismic loads",
            "Higher cost than standard hollow block",
            "Requires skilled laying for structural walls",
        ],
    },
    "Laterite Stone": {
        "base_cost_per_sqm":         900,
        "compressive_strength_mpa":   5.0,
        "tensile_strength_mpa":       0.4,
        "thermal_insulation":         0.68,
        "durability_years":           120,
        "earthquake_resistance":      0.35,
        "moisture_resistance":        0.55,
        "max_safe_span_m":            4.0,
        "category":                   "Masonry",
        "pros": [
            "Locally abundant in Kerala, Goa, Karnataka — near-zero transport cost",
            "Natural thermal regulation — cool interiors in tropical heat",
            "120-year durability — heritage structures last centuries",
            "Carbon negative — no firing needed",
        ],
        "cons": [
            "Becomes brittle after exposure — requires protective plaster",
            "Low tensile strength — poor seismic performance",
            "Not available outside laterite belt regions",
        ],
    },
    "Granite Stone Masonry": {
        "base_cost_per_sqm":        2000,
        "compressive_strength_mpa":  20.0,
        "tensile_strength_mpa":       1.5,
        "thermal_insulation":         0.50,
        "durability_years":          200,
        "earthquake_resistance":      0.42,
        "moisture_resistance":        0.90,
        "max_safe_span_m":            4.0,
        "category":                   "Masonry",
        "pros": [
            "200-year design life — highest durability of all materials",
            "Excellent moisture resistance (0.90) for coastal use",
            "Premium aesthetic appearance",
            "Very high compressive strength (20 MPa)",
        ],
        "cons": [
            "Very high labour cost — requires expert stone cutters",
            "Spans limited to 4 m — poor for open floor plans",
            "High self-weight increases foundation demands",
        ],
    },

    # ── CONCRETE ─────────────────────────────────────────────────────────────
    "RCC (Reinforced Concrete)": {
        "base_cost_per_sqm":        2200,
        "compressive_strength_mpa":  25.0,
        "tensile_strength_mpa":       3.5,
        "thermal_insulation":         0.30,
        "durability_years":          100,
        "earthquake_resistance":      0.85,
        "moisture_resistance":        0.75,
        "max_safe_span_m":            8.0,
        "category":                   "Concrete",
        "pros": [
            "High compressive & tensile strength (25 MPa / 3.5 MPa)",
            "Excellent earthquake resistance (SF = 1.5)",
            "Suitable for spans up to 8 m",
            "100-year design life",
        ],
        "cons": [
            "Higher construction cost than brick",
            "Requires skilled labour and formwork",
            "Poor thermal insulation",
        ],
    },
    "High-Strength Concrete M40": {
        "base_cost_per_sqm":        3000,
        "compressive_strength_mpa":  40.0,
        "tensile_strength_mpa":       5.0,
        "thermal_insulation":         0.28,
        "durability_years":          120,
        "earthquake_resistance":      0.90,
        "moisture_resistance":        0.80,
        "max_safe_span_m":           10.0,
        "category":                   "Concrete",
        "pros": [
            "40 MPa compressive strength — 60% stronger than standard RCC",
            "Spans up to 10 m without intermediate supports",
            "120-year design life — ideal for critical structures",
            "Lower permeability reduces reinforcement corrosion risk",
        ],
        "cons": [
            "Requires specialist mix design and quality control",
            "35% costlier than standard M25 RCC",
            "Needs superplasticisers — not available everywhere",
        ],
    },
    "Precast Concrete Panel": {
        "base_cost_per_sqm":        2800,
        "compressive_strength_mpa":  30.0,
        "tensile_strength_mpa":       4.0,
        "thermal_insulation":         0.35,
        "durability_years":          100,
        "earthquake_resistance":      0.80,
        "moisture_resistance":        0.78,
        "max_safe_span_m":           10.0,
        "category":                   "Concrete",
        "pros": [
            "Factory-made — consistent quality and fast site erection",
            "Spans to 10 m in wall or slab configurations",
            "Reduces on-site formwork by 70%",
            "Lower waste than cast-in-situ concrete",
        ],
        "cons": [
            "Requires crane for lifting and placing",
            "Joints between panels need careful sealing",
            "Limited design flexibility post-manufacture",
        ],
    },
    "Prestressed Concrete": {
        "base_cost_per_sqm":        3200,
        "compressive_strength_mpa":  40.0,
        "tensile_strength_mpa":      10.0,
        "thermal_insulation":         0.28,
        "durability_years":          100,
        "earthquake_resistance":      0.88,
        "moisture_resistance":        0.80,
        "max_safe_span_m":           15.0,
        "category":                   "Concrete",
        "pros": [
            "Eliminates tensile cracking — spans up to 15 m",
            "Thinner slabs — reduces building self-weight",
            "Excellent for long-span floors and bridges",
            "High compressive strength (40 MPa) without size penalty",
        ],
        "cons": [
            "Requires specialist post-tensioning contractors",
            "Higher upfront cost than standard RCC",
            "Complex maintenance if tendons corrode",
        ],
    },
    "Post-tensioned Concrete": {
        "base_cost_per_sqm":        3500,
        "compressive_strength_mpa":  45.0,
        "tensile_strength_mpa":      12.0,
        "thermal_insulation":         0.26,
        "durability_years":          100,
        "earthquake_resistance":      0.88,
        "moisture_resistance":        0.82,
        "max_safe_span_m":           18.0,
        "category":                   "Concrete",
        "pros": [
            "Longest concrete span — up to 18 m without columns",
            "Thinnest slab-to-span ratio — maximises headroom",
            "Active load redistribution — ideal for uneven loads",
            "Preferred for commercial podium slabs",
        ],
        "cons": [
            "Most expensive concrete option",
            "Cannot be easily modified post-construction",
            "Requires specialised stressing equipment",
        ],
    },
    "Hollow Core Precast Slab": {
        "base_cost_per_sqm":        2600,
        "compressive_strength_mpa":  35.0,
        "tensile_strength_mpa":       4.5,
        "thermal_insulation":         0.45,
        "durability_years":          100,
        "earthquake_resistance":      0.78,
        "moisture_resistance":        0.76,
        "max_safe_span_m":           12.0,
        "category":                   "Concrete",
        "pros": [
            "Spans up to 12 m — excellent for column-free layouts",
            "Built-in voids reduce weight by 35% vs solid slab",
            "Rapid floor installation — no propping needed",
            "Good acoustic separation between floors",
        ],
        "cons": [
            "Requires crane erection — limited site access",
            "Topping screed required for flat finish",
            "Fixed modular widths — limited dimensional flexibility",
        ],
    },
    "ICF (Insulated Concrete Form)": {
        "base_cost_per_sqm":        2600,
        "compressive_strength_mpa":  28.0,
        "tensile_strength_mpa":       4.0,
        "thermal_insulation":         0.92,
        "durability_years":          100,
        "earthquake_resistance":      0.85,
        "moisture_resistance":        0.78,
        "max_safe_span_m":            7.0,
        "category":                   "Concrete",
        "pros": [
            "Thermal insulation 0.92 — near-passive house performance",
            "Concrete core provides full structural strength",
            "Fast construction — forms are left in place",
            "Excellent for cold climates and energy efficiency",
        ],
        "cons": [
            "Requires waterproofing on exterior EPS",
            "Span limited to 7 m without structural steel additions",
            "Higher material cost than standard RCC",
        ],
    },
    "AAC Block (Autoclaved Aerated Concrete)": {
        "base_cost_per_sqm":        1600,
        "compressive_strength_mpa":   4.0,
        "tensile_strength_mpa":       0.8,
        "thermal_insulation":         0.90,
        "durability_years":           70,
        "earthquake_resistance":      0.60,
        "moisture_resistance":        0.40,
        "max_safe_span_m":            5.0,
        "category":                   "Concrete",
        "pros": [
            "Excellent thermal & acoustic insulation",
            "30-50% lighter than brick — reduces load",
            "Fast construction speed",
            "Eco-friendly, low carbon footprint",
        ],
        "cons": [
            "Lower compressive strength (4 MPa)",
            "Vulnerable to moisture if unsealed",
            "Not suitable for heavy load-bearing applications",
        ],
    },
    "CLC Block (Cellular Lightweight Concrete)": {
        "base_cost_per_sqm":        1300,
        "compressive_strength_mpa":   3.5,
        "tensile_strength_mpa":       0.7,
        "thermal_insulation":         0.85,
        "durability_years":           65,
        "earthquake_resistance":      0.52,
        "moisture_resistance":        0.38,
        "max_safe_span_m":            4.0,
        "category":                   "Concrete",
        "pros": [
            "Produced on-site using foam generator — no autoclave needed",
            "Lower cost than AAC block",
            "Good thermal insulation (0.85)",
            "Can use fly ash — eco-friendly option",
        ],
        "cons": [
            "Lower strength than AAC — max 3.5 MPa",
            "High water absorption if not sealed",
            "Inconsistent density if site-produced",
        ],
    },

    # ── STEEL ─────────────────────────────────────────────────────────────────
    "Structural Steel": {
        "base_cost_per_sqm":        3500,
        "compressive_strength_mpa": 250.0,
        "tensile_strength_mpa":     400.0,
        "thermal_insulation":         0.10,
        "durability_years":           60,
        "earthquake_resistance":      0.95,
        "moisture_resistance":        0.30,
        "max_safe_span_m":           25.0,
        "category":                   "Steel",
        "pros": [
            "Extremely high strength-to-weight ratio",
            "Best seismic performance (SF = 1.5)",
            "Handles spans > 6 m with ease",
            "Rapid construction with prefabrication",
        ],
        "cons": [
            "Highest material & fabrication cost",
            "Requires fireproofing treatment",
            "Prone to corrosion without protection",
        ],
    },
    "Light Steel Frame (LSF / Cold-formed)": {
        "base_cost_per_sqm":        2800,
        "compressive_strength_mpa": 280.0,
        "tensile_strength_mpa":     350.0,
        "thermal_insulation":         0.20,
        "durability_years":           50,
        "earthquake_resistance":      0.90,
        "moisture_resistance":        0.35,
        "max_safe_span_m":            9.0,
        "category":                   "Steel",
        "pros": [
            "60% lighter than hot-rolled steel — lower foundation loads",
            "Spans up to 9 m — suitable for mid-rise residential",
            "Fast prefabrication and site erection",
            "Excellent seismic ductility",
        ],
        "cons": [
            "Requires thermal break to avoid cold bridging",
            "Galvanising needed for corrosion resistance",
            "Not cost-effective for very long spans (> 9 m)",
        ],
    },
    "Composite Steel-Concrete": {
        "base_cost_per_sqm":        4000,
        "compressive_strength_mpa": 300.0,
        "tensile_strength_mpa":     450.0,
        "thermal_insulation":         0.12,
        "durability_years":           80,
        "earthquake_resistance":      0.95,
        "moisture_resistance":        0.72,
        "max_safe_span_m":           20.0,
        "category":                   "Steel",
        "pros": [
            "Combines concrete compression strength with steel tensile strength",
            "Spans up to 20 m — ideal for column-free commercial floors",
            "Concrete encasement provides fire and corrosion protection",
            "80-year design life — superior to standalone steel",
        ],
        "cons": [
            "Most expensive structural system (₹4,000/m²)",
            "Complex connection detailing",
            "Requires specialist composite design engineers",
        ],
    },
    "Galvanized Iron (GI) Frame": {
        "base_cost_per_sqm":        2200,
        "compressive_strength_mpa": 170.0,
        "tensile_strength_mpa":     210.0,
        "thermal_insulation":         0.15,
        "durability_years":           40,
        "earthquake_resistance":      0.78,
        "moisture_resistance":        0.60,
        "max_safe_span_m":            8.0,
        "category":                   "Steel",
        "pros": [
            "Zinc coating prevents corrosion — good for coastal zones",
            "Lighter than structural steel sections",
            "Faster erection than RCC",
            "Spans to 8 m for portal frames",
        ],
        "cons": [
            "40-year lifespan — shorter than steel or concrete",
            "Galvanising adds cost vs plain mild steel",
            "Requires fire protection coating",
        ],
    },

    # ── TIMBER ────────────────────────────────────────────────────────────────
    "Structural Timber (Teak/Sal)": {
        "base_cost_per_sqm":        1800,
        "compressive_strength_mpa":  35.0,
        "tensile_strength_mpa":      60.0,
        "thermal_insulation":         0.88,
        "durability_years":           60,
        "earthquake_resistance":      0.70,
        "moisture_resistance":        0.55,
        "max_safe_span_m":            6.0,
        "category":                   "Timber",
        "pros": [
            "High strength-to-weight ratio (tensile 60 MPa)",
            "Excellent thermal insulation (0.88) — warm interiors",
            "Carbon sequestering — net-negative carbon material",
            "Good seismic ductility — absorbs earthquake energy",
        ],
        "cons": [
            "Susceptible to fire without treatment",
            "Requires termite and fungal protection",
            "Limited availability of structural-grade timber in India",
        ],
    },
    "Glulam (Glued Laminated Timber)": {
        "base_cost_per_sqm":        3000,
        "compressive_strength_mpa":  45.0,
        "tensile_strength_mpa":      80.0,
        "thermal_insulation":         0.88,
        "durability_years":           80,
        "earthquake_resistance":      0.75,
        "moisture_resistance":        0.60,
        "max_safe_span_m":           18.0,
        "category":                   "Timber",
        "pros": [
            "Spans up to 18 m — replaces steel in long-span roofs",
            "Engineered for uniform strength — no knots or defects",
            "Architecturally exposed — no cladding needed",
            "80-year lifespan with proper treatment",
        ],
        "cons": [
            "Premium cost (₹3,000/m²)",
            "Must be protected from prolonged moisture exposure",
            "Limited local fabricators in India",
        ],
    },
    "CLT (Cross-Laminated Timber)": {
        "base_cost_per_sqm":        2500,
        "compressive_strength_mpa":  40.0,
        "tensile_strength_mpa":      70.0,
        "thermal_insulation":         0.85,
        "durability_years":           80,
        "earthquake_resistance":      0.78,
        "moisture_resistance":        0.55,
        "max_safe_span_m":           12.0,
        "category":                   "Timber",
        "pros": [
            "Mass timber system — floor, wall and roof in one product",
            "Spans to 12 m — comparable to hollow-core precast",
            "Rapidly erected — panels arrive pre-cut from factory",
            "Lowest embodied carbon of all structural systems",
        ],
        "cons": [
            "Not widely manufactured in India — imported cost overhead",
            "Needs intumescent paint or sprinkler protection for fire",
            "Moisture control critical during construction",
        ],
    },
    "Bamboo Frame": {
        "base_cost_per_sqm":         600,
        "compressive_strength_mpa":  50.0,
        "tensile_strength_mpa":     150.0,
        "thermal_insulation":         0.80,
        "durability_years":           30,
        "earthquake_resistance":      0.72,
        "moisture_resistance":        0.35,
        "max_safe_span_m":            5.0,
        "category":                   "Timber",
        "pros": [
            "Tensile strength 150 MPa — stronger than mild steel by weight",
            "Fastest renewable material — 3-year harvest cycle",
            "Very low cost (₹600/m²) — ideal for low-budget projects",
            "Good seismic flexibility — popular in earthquake zones",
        ],
        "cons": [
            "30-year lifespan — requires replacement",
            "Highly susceptible to moisture, insects and fungi",
            "No standard structural codes in India",
        ],
    },

    # ── EARTH / NATURAL ──────────────────────────────────────────────────────
    "Adobe / Mud Brick": {
        "base_cost_per_sqm":         400,
        "compressive_strength_mpa":   1.5,
        "tensile_strength_mpa":       0.2,
        "thermal_insulation":         0.85,
        "durability_years":           40,
        "earthquake_resistance":      0.15,
        "moisture_resistance":        0.15,
        "max_safe_span_m":            3.0,
        "category":                   "Earth",
        "pros": [
            "Lowest cost of all materials (₹400/m²)",
            "Zero embodied carbon — made from local soil",
            "Exceptional thermal mass — stable interior temperatures",
            "No cement or kiln required",
        ],
        "cons": [
            "Very poor seismic resistance — collapses in earthquakes",
            "Dissolves in heavy rain without waterproofing",
            "Limited to 1-storey construction",
        ],
    },
    "Compressed Earth Block (CEB)": {
        "base_cost_per_sqm":         700,
        "compressive_strength_mpa":   4.0,
        "tensile_strength_mpa":       0.4,
        "thermal_insulation":         0.80,
        "durability_years":           60,
        "earthquake_resistance":      0.30,
        "moisture_resistance":        0.35,
        "max_safe_span_m":            3.5,
        "category":                   "Earth",
        "pros": [
            "Machine-pressed for consistent strength (4 MPa)",
            "Near-zero carbon footprint",
            "Good thermal insulation for tropical or arid climates",
            "Locally produced from available soil",
        ],
        "cons": [
            "Requires soil testing — not all soils suitable",
            "Low seismic resistance — avoid earthquake zones",
            "Exterior must be plastered for weathering protection",
        ],
    },
    "Stabilized Mud Block (SMB)": {
        "base_cost_per_sqm":         500,
        "compressive_strength_mpa":   3.5,
        "tensile_strength_mpa":       0.3,
        "thermal_insulation":         0.82,
        "durability_years":           50,
        "earthquake_resistance":      0.28,
        "moisture_resistance":        0.40,
        "max_safe_span_m":            3.5,
        "category":                   "Earth",
        "pros": [
            "5-8% cement stabilisation improves strength to 3.5 MPa",
            "Low cost — one of the cheapest masonry options",
            "Good thermal performance for tropical zones",
            "Uses local soil — very low transport energy",
        ],
        "cons": [
            "Poor seismic performance — not for zone III and above",
            "Not suitable for spans > 3.5 m",
            "Requires cement stabiliser for water resistance",
        ],
    },
    "Rammed Earth": {
        "base_cost_per_sqm":         800,
        "compressive_strength_mpa":   3.0,
        "tensile_strength_mpa":       0.3,
        "thermal_insulation":         0.75,
        "durability_years":           100,
        "earthquake_resistance":      0.35,
        "moisture_resistance":        0.45,
        "max_safe_span_m":            4.0,
        "category":                   "Earth",
        "pros": [
            "100-year durability — ancient rammed earth buildings exist today",
            "Monolithic wall — no joints or mortar",
            "High thermal mass — excellent temperature regulation",
            "Naturally beautiful exposed finish",
        ],
        "cons": [
            "Labour-intensive compaction process",
            "Requires specialised shuttering",
            "Not suitable for high seismic zones without reinforcement",
        ],
    },

    # ── COMPOSITE / PANEL ──────────────────────────────────────────────────────
    "GFRG Panel (Glass Fibre Reinforced Gypsum)": {
        "base_cost_per_sqm":        1700,
        "compressive_strength_mpa":   8.0,
        "tensile_strength_mpa":       1.2,
        "thermal_insulation":         0.72,
        "durability_years":           60,
        "earthquake_resistance":      0.65,
        "moisture_resistance":        0.35,
        "max_safe_span_m":            3.0,
        "category":                   "Composite",
        "pros": [
            "Rapid Walling System — 2-3× faster than brick construction",
            "Panels pre-include conduit channels for electrical",
            "Good thermal and acoustic performance",
            "Can be filled with RCC for structural use",
        ],
        "cons": [
            "Limited to 3 m spans — structural limitations",
            "Poor moisture resistance — requires external waterproofing",
            "Skilled fixing required for structural applications",
        ],
    },
    "EPS Sandwich Panel": {
        "base_cost_per_sqm":        2000,
        "compressive_strength_mpa":  15.0,
        "tensile_strength_mpa":       5.0,
        "thermal_insulation":         0.95,
        "durability_years":           50,
        "earthquake_resistance":      0.70,
        "moisture_resistance":        0.60,
        "max_safe_span_m":            6.0,
        "category":                   "Composite",
        "pros": [
            "Highest thermal insulation (0.95) — near-passive house standard",
            "Very light weight — minimal foundation loads",
            "Fast assembly — modular panels clip together",
            "Good for prefabricated and modular construction",
        ],
        "cons": [
            "Polystyrene core is flammable — fire protection mandatory",
            "50-year lifespan — shorter than concrete",
            "Not suitable for very heavy live loads",
        ],
    },
    "SIP (Structural Insulated Panel)": {
        "base_cost_per_sqm":        2200,
        "compressive_strength_mpa":  15.0,
        "tensile_strength_mpa":       6.0,
        "thermal_insulation":         0.93,
        "durability_years":           60,
        "earthquake_resistance":      0.72,
        "moisture_resistance":        0.55,
        "max_safe_span_m":            7.0,
        "category":                   "Composite",
        "pros": [
            "OSB facings provide racking strength in seismic zones",
            "Superior energy efficiency — near-zero heating losses",
            "Spans up to 7 m — suitable for residential floors",
            "Factory precision — minimal on-site cutting waste",
        ],
        "cons": [
            "Moisture can degrade OSB facing — waterproofing critical",
            "Limited local suppliers in India",
            "Not ideal for wet areas (bathrooms, kitchens)",
        ],
    },
    "Ferro Cement": {
        "base_cost_per_sqm":        1400,
        "compressive_strength_mpa":  35.0,
        "tensile_strength_mpa":       8.0,
        "thermal_insulation":         0.40,
        "durability_years":           70,
        "earthquake_resistance":      0.75,
        "moisture_resistance":        0.80,
        "max_safe_span_m":            5.0,
        "category":                   "Composite",
        "pros": [
            "Thin shell construction — 10-20 mm thick walls carry loads",
            "High tensile strength (8 MPa) for cement-based material",
            "Excellent water resistance — used for boats and tanks",
            "Low-cost alternative to full RCC for lightweight structures",
        ],
        "cons": [
            "Labour-intensive wire mesh work",
            "Requires specialist plasterers",
            "Not suited for large column-free spaces > 5 m",
        ],
    },
    "FRP (Fibre Reinforced Polymer)": {
        "base_cost_per_sqm":        5000,
        "compressive_strength_mpa": 150.0,
        "tensile_strength_mpa":     400.0,
        "thermal_insulation":         0.35,
        "durability_years":           50,
        "earthquake_resistance":      0.85,
        "moisture_resistance":        0.95,
        "max_safe_span_m":           15.0,
        "category":                   "Composite",
        "pros": [
            "Highest corrosion resistance (0.95) — ideal for marine environments",
            "Very high tensile strength (400 MPa) — comparable to steel",
            "Non-magnetic and non-conductive — specialist applications",
            "Spans up to 15 m — suitable for bridges and industrial roofs",
        ],
        "cons": [
            "Highest cost (₹5,000/m²) — niche specialist applications",
            "Brittle failure mode — limited ductility",
            "Not widely available in India",
        ],
    },
    "Calcium Silicate Board": {
        "base_cost_per_sqm":        1800,
        "compressive_strength_mpa":   2.0,
        "tensile_strength_mpa":       0.8,
        "thermal_insulation":         0.70,
        "durability_years":           50,
        "earthquake_resistance":      0.55,
        "moisture_resistance":        0.75,
        "max_safe_span_m":            2.5,
        "category":                   "Composite",
        "pros": [
            "Fire rated up to 4 hours — excellent for fire compartmentation",
            "Moisture resistant — suitable for bathrooms and kitchens",
            "Lightweight partition system — fast fit-out",
            "Smooth surface — no plastering required",
        ],
        "cons": [
            "Non-structural — partitions only (max 2.5 m span)",
            "Brittle edges — care needed in handling",
            "Higher cost than standard plasterboard",
        ],
    },
    "Recycled Plastic Block": {
        "base_cost_per_sqm":        1000,
        "compressive_strength_mpa":   2.5,
        "tensile_strength_mpa":       1.5,
        "thermal_insulation":         0.60,
        "durability_years":          150,
        "earthquake_resistance":      0.45,
        "moisture_resistance":        0.85,
        "max_safe_span_m":            3.0,
        "category":                   "Composite",
        "pros": [
            "150-year durability — highest of any block material",
            "Made from 100% recycled HDPE and PP plastic waste",
            "Excellent moisture resistance (0.85) — no water absorption",
            "Contributes to circular economy and plastic waste reduction",
        ],
        "cons": [
            "Low structural strength — non-load-bearing only",
            "Requires fire retardant additives",
            "Limited aesthetic options currently",
        ],
    },
}


def _rule_based_score(
    name: str,
    props: Dict,
    total_area: float,
    total_wall_length: float,
    budget: str,
    location: str,
    max_span: float = 0.0,
    load_bearing_count: int = 0,
) -> Dict[str, Any]:
    budget_multipliers = {"low": 1.5, "medium": 1.0, "high": 0.6}
    cost_weight = budget_multipliers.get(budget, 1.0)

    # Extended cost range covering all 39 materials (₹400 – ₹5,000)
    max_cost, min_cost = 5000, 400
    normalized_cost     = (props["base_cost_per_sqm"] - min_cost) / (max_cost - min_cost)

    combined_strength   = props["compressive_strength_mpa"] * 0.6 + props["tensile_strength_mpa"] * 0.4
    normalized_strength = min(combined_strength / 400, 1.0)

    location_lower = (location or "").lower()
    climate_bonus  = 0.0
    if "earthquake" in location_lower or "seismic" in location_lower:
        climate_bonus = props["earthquake_resistance"] * 0.2
    elif "coastal" in location_lower or "humid" in location_lower:
        climate_bonus = props["moisture_resistance"] * 0.15
    elif "cold" in location_lower or "mountain" in location_lower:
        climate_bonus = props["thermal_insulation"] * 0.15

    # Span penalty: if max_span exceeds material safe span, penalise heavily
    span_penalty = 0.0
    if max_span > 0 and max_span > props.get("max_safe_span_m", 99):
        span_penalty = min((max_span - props["max_safe_span_m"]) / props["max_safe_span_m"] * 50, 40)

    cost_score       = (1.0 - normalized_cost) * 100
    strength_score   = normalized_strength * 100
    durability_score = min(props["durability_years"] / 150, 1.0) * 100

    w_s, w_c, w_d, w_cl = 0.35, 0.30 * cost_weight, 0.20, 0.15
    total_w = w_s + w_c + w_d + w_cl
    raw     = (w_s * strength_score + w_c * cost_score +
               w_d * durability_score + w_cl * climate_bonus * 100)
    overall = max(0.0, min(raw / total_w - span_penalty, 100.0))

    span_note = ""
    if max_span > 0:
        safe = props.get("max_safe_span_m", 99)
        if max_span > safe:
            span_note = f" Max detected span {max_span:.1f} m EXCEEDS safe limit of {safe} m — NOT recommended."
        else:
            span_note = f" Max detected span {max_span:.1f} m is within safe limit of {safe} m."

    reason = (
        f"{name} scores {overall:.0f}/100. Formula: "
        f"0.35×Strength({strength_score:.0f}) + 0.30×Cost({cost_score:.0f}) + "
        f"0.20×Durability({durability_score:.0f}) + 0.15×Climate. "
        f"Cost ₹{props['base_cost_per_sqm']:,}/m² × {total_area:.0f} m².{span_note}"
    )

    return {
        "material":            name,
        "category":            props.get("category", "General"),
        "costScore":           round(cost_score, 1),
        "strengthScore":       round(strength_score, 1),
        "overallScore":        round(overall, 1),
        "estimatedCostPerSqM": props["base_cost_per_sqm"],
        "pros":                props["pros"],
        "cons":                props["cons"],
        "reason":              reason,
    }


def get_llm_recommendations(
    total_area: float,
    total_wall_length: float,
    room_count: int,
    budget: str = "medium",
    location: str = "general",
    room_labels: Optional[List[str]] = None,
    max_span: float = 0.0,
    avg_span: float = 0.0,
    load_bearing_count: int = 0,
    partition_count: int = 0,
    buildup_area: float = 0.0,
) -> List[Dict[str, Any]]:
    """
    Score all 37 materials using the deterministic rule-based formula.
    Returns the top 6 ranked by overallScore. Zero API calls.
    """
    scores = [
        _rule_based_score(
            name, props,
            total_area, total_wall_length,
            budget, location,
            max_span, load_bearing_count,
        )
        for name, props in MATERIALS.items()
    ]
    scores.sort(key=lambda x: x["overallScore"], reverse=True)
    return scores[:6]
