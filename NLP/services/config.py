# services/config.py
import os

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:1b")
INFO_API = os.getenv("INFO_API", "http://10.100.201.25:4000/api/info")
CSV_PATH = os.getenv("CSV_PATH", "devices.csv")
ALIAS_PATH = os.getenv("ALIAS_PATH", "alias.csv")
REFRESH_INTERVAL_SECONDS = int(os.getenv("REFRESH_INTERVAL_SECONDS", "3600"))  # 1h

CSV_COLUMNS = [
    "name",
    "type",
    "model",
    "power",
    "voltage",
    "capa",
    "gas",
    "brand",
    "year",
    "location",
    "note",
    "image",
]
