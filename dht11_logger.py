"""
dht11_logger.py

Recoit les trames envoyees par le CC1310 sur le port serie (UART/XDS110),
les affiche en temps reel dans la console et les enregistre dans un
fichier CSV (aussi en temps reel, ligne par ligne).

Prerequis :
    pip install pyserial

Utilisation :
    1. Modifiez SERIAL_PORT ci-dessous avec le port de votre carte.
       - Windows : ouvrez le Gestionnaire de peripheriques -> "Ports (COM et LPT)"
         -> cherchez "XDS110 Class Application/User UART" -> ex: "COM5"
       - Linux   : generalement /dev/ttyACM0 ou /dev/ttyUSB0
       - macOS   : generalement /dev/tty.usbmodemXXXX
    2. Lancez : python dht11_logger.py
    3. Les donnees s'affichent a l'ecran et s'ajoutent au fichier CSV au
       fur et a mesure (Ctrl+C pour arreter proprement).
"""

import serial
import sys
import time
import csv
import os
from datetime import datetime

# ============ CONFIGURATION - A ADAPTER ============
SERIAL_PORT = "COM8"        # <-- changez selon votre port (voir docstring)
BAUD_RATE = 115200
OUTPUT_FILE = "dht11_log.csv"
# =====================================================


def open_serial(port, baud):
    try:
        ser = serial.Serial(port, baud, timeout=5)
        # Laisse le temps a la carte de finir son reset apres l'ouverture du port
        time.sleep(1.5)
        ser.reset_input_buffer()
        return ser
    except serial.SerialException as e:
        print(f"Erreur : impossible d'ouvrir le port {port} ({e})")
        print("Verifiez le nom du port et qu'aucun autre programme "
              "(CCS, moniteur serie) ne l'utilise deja.")
        sys.exit(1)


def ensure_csv_header(path):
    file_exists = os.path.isfile(path)
    if not file_exists:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "temperature_C", "humidity_percent"])


def main():
    print(f"Ouverture du port {SERIAL_PORT} a {BAUD_RATE} bauds...")
    ser = open_serial(SERIAL_PORT, BAUD_RATE)
    print("Port ouvert. En attente des donnees du CC1310 (Ctrl+C pour arreter)...\n")

    ensure_csv_header(OUTPUT_FILE)

    try:
        # Ouverture en mode "append", ligne par ligne, avec flush immediat
        with open(OUTPUT_FILE, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            while True:
                raw = ser.readline()
                if not raw:
                    continue  # timeout sans donnees, on reboucle

                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                parts = line.split(",")

                if parts[0] == "DATA" and len(parts) == 3:
                    temp = parts[1]
                    hum = parts[2]
                    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    print(f"[{ts}] Temperature = {temp} C   Humidite = {hum} %")

                    writer.writerow([ts, temp, hum])
                    f.flush()          # ecriture immediate sur le disque
                    os.fsync(f.fileno())  # force le systeme a vraiment ecrire (temps reel)

                elif parts[0] == "ERR":
                    message = ",".join(parts[1:])
                    print(f"[!] Erreur capteur : {message}")

                else:
                    # Trame non reconnue (bruit UART, reset de la carte, etc.)
                    print(f"[?] Trame non reconnue : {line}")

    except KeyboardInterrupt:
        print("\nArret demande par l'utilisateur.")
    finally:
        ser.close()
        print(f"Port serie ferme. Donnees enregistrees dans : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()