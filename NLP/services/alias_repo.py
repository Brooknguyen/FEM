# services/alias_repo.py
import pandas as pd
from services.config import ALIAS_PATH


def load_alias_map(path=ALIAS_PATH):
    try:
        df = pd.read_csv(path)
        if df.empty:
            return {}
        df["alias_norm"] = df["alias"].astype(str).str.strip().str.lower()
        return {
            row["alias_norm"]: str(row["entity"]).strip() for _, row in df.iterrows()
        }
    except FileNotFoundError:
        return {}
    except Exception as e:
        print(f"[ALIAS ERROR] {e}")
        return {}
