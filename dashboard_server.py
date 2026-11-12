"""
dashboard_server.py

Dashboard web pour visualiser en temps reel les donnees temperature/humidite
deja acquises dans dht11_log.csv (genere par dht11_logger.py), avec
surveillance de depassement de seuils.

Prerequis :
    pip install flask

Utilisation :
    1. Laissez tourner dht11_logger.py dans un terminal (acquisition en cours)
    2. Dans un AUTRE terminal, lancez : python dashboard_server.py
    3. Ouvrez http://localhost:5000 dans votre navigateur

Le dashboard se rafraichit tout seul (requetes automatiques toutes les 2s),
inutile de recharger la page manuellement.
"""

import csv
import json
import os
import threading

from flask import Flask, jsonify, request, Response

CSV_PATH = "dht11_log.csv"
CONFIG_PATH = "dashboard_config.json"
MAX_POINTS = 300  # nombre de points conserves pour l'historique affiche

DEFAULT_CONFIG = {
    "temp_min": 15.0,
    "temp_max": 30.0,
    "hum_min": 30.0,
    "hum_max": 70.0,
}

app = Flask(__name__)
config_lock = threading.Lock()


def load_config():
    if os.path.isfile(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                merged = dict(DEFAULT_CONFIG)
                merged.update(cfg)
                return merged
        except (json.JSONDecodeError, OSError):
            pass
    return dict(DEFAULT_CONFIG)


def save_config(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)


def read_csv_rows():
    if not os.path.isfile(CSV_PATH):
        return []
    rows = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                rows.append({
                    "timestamp": row["timestamp"],
                    "temperature": float(row["temperature_C"]),
                    "humidity": float(row["humidity_percent"]),
                })
            except (KeyError, ValueError):
                continue
    return rows[-MAX_POINTS:]


@app.route("/api/data")
def api_data():
    rows = read_csv_rows()
    cfg = load_config()
    latest = rows[-1] if rows else None

    status = "nodata"
    if latest is not None:
        temp_ok = cfg["temp_min"] <= latest["temperature"] <= cfg["temp_max"]
        hum_ok = cfg["hum_min"] <= latest["humidity"] <= cfg["hum_max"]
        status = "ok" if (temp_ok and hum_ok) else "alert"

    return jsonify({
        "rows": rows,
        "latest": latest,
        "config": cfg,
        "status": status,
    })


@app.route("/api/config", methods=["GET", "POST"])
def api_config():
    if request.method == "POST":
        with config_lock:
            cfg = load_config()
            data = request.get_json(force=True, silent=True) or {}
            for key in DEFAULT_CONFIG:
                if key in data:
                    try:
                        cfg[key] = float(data[key])
                    except (TypeError, ValueError):
                        pass
            save_config(cfg)
        return jsonify(cfg)
    return jsonify(load_config())


@app.route("/")
def index():
    with open(os.path.join(os.path.dirname(__file__), "dashboard.html"),
               "r", encoding="utf-8") as f:
        return Response(f.read(), mimetype="text/html")


if __name__ == "__main__":
    print("Dashboard disponible sur http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)