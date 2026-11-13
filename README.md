# 📡 Système embarqué de mesure et de communication radio Sub-1 GHz — CC1310

Chaîne IoT complète basée sur deux cartes **LaunchPad CC1310** (Texas Instruments) : acquisition de température/humidité en redondance sur deux nœuds, liaison radio Sub-1 GHz point-à-point, caractérisation de la couche physique radio (RSSI), et plateforme web de supervision multi-utilisateurs.

Projet réalisé dans le cadre d'un stage ingénieur (ENIT — Génie des Technologies de l'Information et de la Communication) chez **Asteelflash Tunisie**.

---

## 🎯 Aperçu du projet

```
┌─────────────────────────┐                    ┌─────────────────────────┐
│       Carte A (CC1310)  │                    │      Carte B (CC1310)   │
│                          │                    │                          │
│   Capteur DHT11          │                    │   Capteur DHT11          │
│   (Température/Humidité) │                    │   (Température/Humidité) │
│          │               │                    │          │               │
│          ▼               │   Radio Sub-1 GHz  │          ▼               │
│   Traitement CC1310  ────┼───────────────────▶│   Traitement CC1310      │
│   (mesure locale)        │     868 MHz         │   (mesure locale +       │
│                          │                    │    mesure reçue)         │
└──────────────────────────┘                    └───────────┬──────────────┘
                                                              │ UART (115200 bauds)
                                                              ▼
                                                   ┌─────────────────────────┐
                                                   │  Script Python           │
                                                   │  (dht11_logger.py)       │
                                                   │  → CSV + POST /api/ingest│
                                                   └───────────┬─────────────┘
                                                               ▼
                                                   ┌─────────────────────────┐
                                                   │  Plateforme web          │
                                                   │  Node.js / Express       │
                                                   │  (auth, rôles, dashboard)│
                                                   └─────────────────────────┘
```

Seule la **Carte B** est reliée au PC en fonctionnement normal : elle transmet par UART à la fois sa propre mesure (`LOCAL`) et celle reçue par radio de la Carte A (`REMOTE`), ce qui permet une comparaison en temps réel des deux sources.

---

## ✨ Fonctionnalités

- 🌡️ **Acquisition DHT11** sur deux nœuds indépendants, avec décodage bas niveau par timer matériel (résolution ~20,8 ns)
- 📻 **Liaison radio Sub-1 GHz** (868 MHz) entre les deux cartes via la bibliothèque **EasyLink**
- 🔀 **Redondance capteur** : comparaison automatique `LOCAL` vs `REMOTE` avec détection d'écart configurable (seuils par défaut : 2 °C / 5 %HR)
- 📊 **Analyse de la couche physique radio (PHY)** : balayage RSSI sur 36 canaux (863,0–870,0 MHz) par détection d'énergie (`CMD_PROP_CS`), indépendamment de tout décodage de paquet
- 🖥️ **Plateforme web de supervision** (Node.js/Express) :
  - Authentification sécurisée (bcrypt, sessions `httpOnly`)
  - Contrôle d'accès par rôle (Administrateur / Utilisateur)
  - Dashboard temps réel (jauges, graphique d'historique, alertes de seuil)
  - Gestion des utilisateurs (recherche, filtres, pagination)
  - API d'ingestion dédiée (`POST /api/ingest`), authentifiée par clé API, pour les scripts d'acquisition

---

## 🛠️ Matériel utilisé

| Composant | Rôle |
|---|---|
| 2× LaunchPad CC1310 (Texas Instruments) | Nœuds d'acquisition et de communication radio |
| 2× Capteur DHT11 | Mesure température/humidité |
| Câblage DHT11 → DIO24 (VCC 3.3V, GND, DATA) | Évite les conflits avec les LEDs embarquées (DIO6/DIO7) |

## 💻 Environnement logiciel

| Outil | Usage |
|---|---|
| **Code Composer Studio (CCS)** | IDE de développement embarqué TI |
| **SimpleLink CC13x0 SDK** | TI-Drivers, driverlib, bibliothèque EasyLink, TI-RTOS |
| **Python 3** (`pyserial`, `requests`) | Script de collecte UART → CSV + envoi API |
| **Node.js / Express** | Plateforme web de supervision |
| **PuTTY / Tera Term** | Terminal série pour debug (115200 bauds, 8N1) |

---

## 📁 Structure du dépôt

```
.
├── firmware/
│   ├── carteA/                 # Firmware émetteur (mesure + TX radio)
│   │   └── rfEasyLinkTx.c
│   └── carteB/                 # Firmware récepteur (mesure locale + RX radio + comparaison)
│       └── rfEasyLinkRx.c
│
├── acquisition/
│   └── dht11_logger.py         # pip install pyserial requests
│
└── backend/                    # Plateforme web de supervision
    ├── server.js
    ├── simulate-sensor.js      # Génère des mesures de test (sans matériel)
    ├── config/
    │   └── jsonStore.js
    ├── models/
    │   ├── userModel.js
    │   ├── thresholdModel.js
    │   ├── logModel.js
    │   └── sensorModel.js
    ├── middleware/
    │   ├── auth.js
    │   └── flash.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── dashboardRoutes.js
    │   ├── adminRoutes.js
    │   ├── profileRoutes.js
    │   └── ingestRoutes.js
    ├── views/                  # Templates EJS
    └── public/
        ├── css/style.css
        └── js/dashboard.js
```

---

## 🚀 Installation et utilisation

### 1. Firmware embarqué (CC1310)

1. Ouvrir les projets `carteA` et `carteB` dans **Code Composer Studio**
2. Vérifier que la fréquence radio est identique dans les deux projets : `EasyLink_setFrequency(868000000)` (canal 25)
3. Flasher la **Carte A** avec `rfEasyLinkTx.c`, la **Carte B** avec `rfEasyLinkRx.c`
4. Vérifier le câblage DHT11 (VCC → 3.3V, GND → GND, DATA → DIO24) sur les deux cartes

### 2. Script d'acquisition (PC)

```bash
cd acquisition
pip install pyserial requests
python dht11_logger.py
```

Le script lit en continu le port série de la Carte B (115200 bauds), journalise chaque mesure dans `dht11_log.csv`, et transmet en parallèle les données à la plateforme web.

### 3. Plateforme de supervision

```bash
cd backend
npm install
npm start
```

Ouvrir **http://localhost:3000**

> 💡 Pour tester la plateforme sans matériel, lancer `npm run simulate` dans un second terminal : des mesures factices sont générées automatiquement.

**Compte administrateur par défaut** (créé au premier démarrage) :

| Champ | Valeur |
|---|---|
| Identifiant | `admin` |
| Mot de passe | `Admin123!` |

⚠️ **À changer immédiatement** depuis la page de profil après la première connexion.

---

## 📊 Résultats — Analyse RSSI

Deux balayages de référence ont été réalisés sur la bande ISM européenne (863–870 MHz, 36 canaux, pas de 200 kHz) :

| Métrique | Sans émetteur (référence) | Avec Carte CC1310 émettrice |
|---|---|---|
| Plage de RSSI | ≈ −115 à −100 dBm | — |
| Canal détecté | — | CH 25 (868,000 MHz) |
| RSSI mesuré | ≈ −108 dBm (moyenne) | **−14 dBm** |
| Distance | — | Quelques mètres |

Le signal détecté sur le canal 25 dépasse d'environ **90 dB** le plancher de bruit mesuré, confirmant que la méthode par détection d'énergie (`CMD_PROP_CS`) identifie correctement un émetteur réel, exactement à la fréquence configurée pour la liaison Carte A → Carte B.

---

## 🔒 Sécurité — ce qui est fait et ses limites

- **Mots de passe** hashés avec `bcryptjs`, jamais stockés en clair
- **Autorisations** vérifiées côté serveur à chaque requête (`requireAuth`, `requireRole`)
- **API d'ingestion** protégée par clé partagée (`X-API-Key`), à changer avant tout déploiement réel
- ⚠️ La liaison radio entre les deux cartes **n'est ni chiffrée ni authentifiée** au niveau applicatif (axe d'amélioration)
- ⚠️ Persistance par fichiers JSON : adaptée à ce projet pédagogique, sans verrou concurrentiel — à migrer vers SQLite/PostgreSQL pour un usage en production
- ⚠️ Pas de protection CSRF ni de limitation de débit (rate limiting) sur les routes sensibles

## 🔭 Limites et pistes d'amélioration

- Sécurisation de la liaison radio (chiffrement, anti-rejeu)
- Exploitation du **Sensor Controller Engine** du CC1310 pour l'optimisation énergétique (usage sur batterie)
- Moyennage statistique des balayages RSSI sur plusieurs passages
- Test de détection avec des émetteurs tiers (clé de voiture, capteur LoRa, station météo)
- Migration de la persistance vers une base de données relationnelle

---

## 🧠 Compétences mobilisées

**Embarqué** — Programmation C, GPIO, timer matériel et gestion des modes d'alimentation (RUN/SLEEP/DEEP SLEEP), SDK SimpleLink, TI-Drivers

**Télécommunications** — Communication radio Sub-1 GHz, bibliothèque EasyLink, architecture point-à-point, mesure et analyse RSSI par détection d'énergie

**Développement web** — Node.js/Express, authentification sécurisée, contrôle d'accès par rôle, conception d'API (session vs clé API), architecture en couches (routes/modèles/persistance)

---

## 📚 Références

- Texas Instruments, *CC1310 SimpleLink Ultra-Low-Power Sub-1 GHz Wireless MCU* — [SWRS181](https://www.ti.com/lit/pdf/swrs181)
- Texas Instruments, *CC13x0, CC26x0 SimpleLink Wireless MCU Technical Reference Manual* — [SWCU117](https://www.ti.com/lit/pdf/swcu117)
- Texas Instruments, *SimpleLink CC1310 LaunchPad Development Kit User's Guide* — [SWRU447](https://www.ti.com/lit/pdf/swru447)
- ETSI, *EN 300 220-1 — Short Range Devices (SRD)*
- OWASP, *Password Storage Cheat Sheet*

---

## 👤 Auteure

**Arwa Kassebi** — 2ème année TEL 2, École Nationale d'Ingénieurs de Tunis (ENIT)
Stage ingénieur réalisé chez **Asteelflash Tunisie**, sous l'encadrement de M. Kais Hattabi
Année universitaire 2025/2026

---

## 📄 Licence

Projet académique réalisé dans le cadre d'un stage ingénieur. Usage pédagogique — voir avec l'auteure pour toute réutilisation.
