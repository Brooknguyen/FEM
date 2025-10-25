# test.py
from flask import Flask, request, jsonify
from flask_cors import CORS

from services.config import CSV_PATH
from services.csv_repo import load_devices_from_csv, refresh_csv
from services.qa_logic import answer_from_csv
from services.llm_client import call_llm_basic
from services.refresher import start_background_refresher

app = Flask(__name__)
CORS(app)


@app.route("/refresh", methods=["POST", "GET"])
def refresh():
    ok, msg = refresh_csv()
    return jsonify({"ok": ok, "message": msg}), (200 if ok else 500)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Missing input"}), 400

    print(f"\n\n📝 [USER INPUT]: {text}")

    df = load_devices_from_csv(CSV_PATH)
    # Thử trả lời bằng CSV (chỉ khi thực sự liên quan)
    csv_answer = answer_from_csv(text, df)
    if csv_answer is not None:
        return jsonify({"answer": csv_answer})

    # Không liên quan CSV → chat tự do
    return jsonify(
        {"answer": call_llm_basic(text), "note": "Ngoài miền CSV - chat tự do."}
    )


if __name__ == "__main__":
    ok, msg = refresh_csv()
    print(f"[STARTUP REFRESH] {msg}")
    start_background_refresher()
    app.run(host="0.0.0.0", port=1080, debug=True)
