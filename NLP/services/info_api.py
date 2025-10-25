# services/info_api.py
import requests
from services.config import INFO_API


def fetch_info_from_api():
    try:
        r = requests.get(INFO_API, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[INFO_API ERROR] {e}")
        return None


def extract_devices(payload: dict) -> list[dict]:
    if not isinstance(payload, dict):
        return []
    items = payload.get("items") or []
    for it in items:
        if isinstance(it, dict) and it.get("sheetName") == "THIET_BI":
            devs = it.get("devices")
            return devs if isinstance(devs, list) else []
    if items and isinstance(items[0], dict):
        devs = items[0].get("devices")
        return devs if isinstance(devs, list) else []
    return []
