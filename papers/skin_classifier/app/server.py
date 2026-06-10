"""Flask web app: upload a skin photo → top-3 predictions + confidence +
low-confidence warning + condition info card. Images are processed in memory and
NEVER persisted (privacy NFR); only anonymised prediction metadata is logged.
"""
import os

from flask import Flask, jsonify, render_template, request

from .audit import log_prediction, stats
from .inference import CONDITION_INFO, LOW_CONFIDENCE, predict

app = Flask(__name__, template_folder="../templates")
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB


@app.get("/")
def index():
    return render_template("index.html", low_threshold=int(LOW_CONFIDENCE * 100))


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/api/classify")
def classify():
    if "image" not in request.files:
        return jsonify(error="No image uploaded"), 400
    f = request.files["image"]
    data = f.read()
    if not data:
        return jsonify(error="Empty file"), 400
    try:
        result = predict(data)  # image is discarded after this call
    except Exception as e:
        return jsonify(error=f"Could not process image: {e}"), 400

    fitz = request.form.get("fitzpatrick")  # optional self-declared skin type group
    result["info"] = CONDITION_INFO.get(result["top"]["condition"], "")
    log_prediction(result["top"]["condition"], result["top"]["confidence"],
                   result["low_confidence"], fitz, result["mode"])
    return jsonify(result)


@app.get("/api/audit/stats")
def audit_stats():
    return jsonify(stats())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
