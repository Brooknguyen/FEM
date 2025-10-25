# services/csv_repo.py
import os
import pandas as pd
from services.config import CSV_COLUMNS, CSV_PATH
from services.info_api import fetch_info_from_api, extract_devices


def save_devices_to_csv(devices: list[dict], path: str = CSV_PATH):
    rows = [{col: d.get(col, "") for col in CSV_COLUMNS} for d in devices]
    pd.DataFrame(rows, columns=CSV_COLUMNS).to_csv(
        path, index=False, encoding="utf-8-sig"
    )
    return len(rows)


def refresh_csv() -> tuple[bool, str]:
    data = fetch_info_from_api()
    if data is None:
        return False, "Không gọi được INFO_API."
    devices = extract_devices(data)
    if not devices:
        return False, "Không tìm thấy 'devices' trong INFO_API."
    n = save_devices_to_csv(devices, CSV_PATH)
    return True, f"Đã lưu {n} thiết bị vào {CSV_PATH}"


def load_devices_from_csv(path: str = CSV_PATH) -> pd.DataFrame:
    if not os.path.exists(path):
        return pd.DataFrame(columns=CSV_COLUMNS)
    return pd.read_csv(path)
