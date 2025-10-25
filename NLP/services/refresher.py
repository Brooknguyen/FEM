# services/refresher.py
import time
import threading
from services.csv_repo import refresh_csv
from services.config import REFRESH_INTERVAL_SECONDS


def _loop():
    print(f"[REFRESHER] Bắt đầu thread nền. Chu kỳ: {REFRESH_INTERVAL_SECONDS}s")
    while True:
        try:
            ok, msg = refresh_csv()
            ts = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"[REFRESHER {ts}] {msg}")
            time.sleep(
                REFRESH_INTERVAL_SECONDS if ok else min(300, REFRESH_INTERVAL_SECONDS)
            )
        except Exception as e:
            print(f"[REFRESHER ERROR] {e}")
            time.sleep(min(300, REFRESH_INTERVAL_SECONDS))


def start_background_refresher():
    t = threading.Thread(target=_loop, daemon=True)
    t.start()
    return t
