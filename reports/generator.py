"""Generate daily summary reports."""
from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List

from db.client import get_database_name, mongo_client

OUTPUT_DIR = Path("reports/output")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _latest_runs(limit: int = 5) -> List[Dict]:
    with mongo_client() as client:
        db = client[get_database_name()]
        cursor = (
            db["sim_runs"]
            .find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        return list(cursor)


def generate_daily_report(report_date: date | None = None) -> Path:
    report_date = report_date or date.today()
    runs = _latest_runs()
    summary = f"{len(runs)} strategies evaluated."

    payload = {
        "date": report_date.isoformat(),
        "generated_at": datetime.utcnow().isoformat(),
        "summary": summary,
        "top_strategies": [
            {"strategy": r["strategy"], "pnl": r["results"].get("pnl", 0)} for r in runs
        ],
        "charts": [],
    }

    with mongo_client() as client:
        db = client[get_database_name()]
        db["daily_reports"].update_one(
            {"date": payload["date"]},
            {"$set": payload},
            upsert=True,
        )

    file_path = OUTPUT_DIR / f"{payload['date']}.json"
    file_path.write_text(json.dumps(payload, indent=2))
    return file_path

