"""
SQLite database for storing analysis reports.
"""
import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "structural_ai.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            image_width REAL NOT NULL,
            image_height REAL NOT NULL,
            walls_json TEXT NOT NULL,
            rooms_json TEXT NOT NULL,
            total_wall_length REAL NOT NULL,
            total_area REAL NOT NULL,
            recommendations_json TEXT NOT NULL,
            model3d_json TEXT NOT NULL,
            blockchain_hash TEXT,
            blockchain_tx_id TEXT,
            stellar_network TEXT NOT NULL DEFAULT 'testnet',
            summary TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def save_report(data: dict) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (
            created_at, image_width, image_height,
            walls_json, rooms_json, total_wall_length, total_area,
            recommendations_json, model3d_json,
            blockchain_hash, blockchain_tx_id, stellar_network, summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["created_at"],
        data["image_width"],
        data["image_height"],
        json.dumps(data["walls"]),
        json.dumps(data["rooms"]),
        data["total_wall_length"],
        data["total_area"],
        json.dumps(data["recommendations"]),
        json.dumps(data["model3d"]),
        data.get("blockchain_hash"),
        data.get("blockchain_tx_id"),
        data.get("stellar_network", "testnet"),
        data["summary"],
    ))
    conn.commit()
    report_id = cursor.lastrowid
    conn.close()
    return report_id


def get_all_reports() -> list[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, created_at, total_wall_length, total_area,
               rooms_json, recommendations_json,
               blockchain_hash, blockchain_tx_id, stellar_network, summary
        FROM reports ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    results = []
    for row in rows:
        rooms = json.loads(row["rooms_json"])
        recs = json.loads(row["recommendations_json"])
        top_material = recs[0]["material"] if recs else "N/A"
        results.append({
            "id": row["id"],
            "createdAt": row["created_at"],
            "totalWallLength": row["total_wall_length"],
            "totalArea": row["total_area"],
            "roomCount": len(rooms),
            "topMaterial": top_material,
            "blockchainHash": row["blockchain_hash"],
            "blockchainTxId": row["blockchain_tx_id"],
            "stellarNetwork": row["stellar_network"],
            "summary": row["summary"],
        })
    return results


def get_report_by_id(report_id: int) -> dict | None:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    rooms = json.loads(row["rooms_json"])
    recs = json.loads(row["recommendations_json"])
    top_material = recs[0]["material"] if recs else "N/A"
    return {
        "id": row["id"],
        "createdAt": row["created_at"],
        "totalWallLength": row["total_wall_length"],
        "totalArea": row["total_area"],
        "roomCount": len(rooms),
        "topMaterial": top_material,
        "blockchainHash": row["blockchain_hash"],
        "blockchainTxId": row["blockchain_tx_id"],
        "stellarNetwork": row["stellar_network"],
        "summary": row["summary"],
    }
