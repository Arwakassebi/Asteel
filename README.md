# Embedded IoT Monitoring System with Sub-1 GHz Wireless Communication — CC1310

**Dual-node environmental monitoring, point-to-point wireless communication, RF signal characterization and web-based supervision.**

An end-to-end embedded IoT system developed using two Texas Instruments CC1310 LaunchPad development boards. The solution combines temperature and humidity acquisition, Sub-1 GHz wireless communication at 868 MHz, RSSI-based radio frequency characterization, and a multi-user web monitoring platform.

**Project context:** Engineering internship — Asteelflash Tunisia  
**Academic institution:** National Engineering School of Tunis (ENIT)  
**Academic year:** 2025–2026

---

## 1. Project Overview

The objective of this project was to design and implement an embedded monitoring architecture capable of collecting environmental measurements from two independent nodes, exchanging data over a Sub-1 GHz wireless link, and centralizing the collected information through a web-based supervision platform.

The system consists of two CC1310-based acquisition nodes:

- **Node A — Transmitter:** acquires local temperature and humidity measurements and transmits them wirelessly.
- **Node B — Receiver:** acquires its own measurements, receives data from Node A, and forwards both datasets to a computer through a UART interface.

A Python acquisition service processes the serial data, stores measurements in CSV format, and forwards them to a Node.js/Express backend.

### System Architecture

```text
       NODE A — TRANSMITTER                 NODE B — RECEIVER
    ┌────────────────────────┐          ┌────────────────────────┐
    │    CC1310 LaunchPad    │          │    CC1310 LaunchPad    │
    │                        │          │                        │
    │     DHT11 Sensor       │          │     DHT11 Sensor       │
    │          │             │          │          │             │
    │          ▼             │          │          ▼             │
    │   Local Acquisition    │          │   Local Acquisition    │
    │          │             │          │          │             │
    │          ▼             │  868 MHz │          ▼             │
    │   EasyLink Transmit    ├─────────►│   EasyLink Receive     │
    │                        │          │          │             │
    └────────────────────────┘          │   LOCAL / REMOTE Data  │
                                        └───────────┬────────────┘
                                                    │ UART
                                                    │ 115200 baud
                                                    ▼
                                        ┌────────────────────────┐
                                        │   Python Acquisition   │
                                        │                        │
                                        │   Serial Processing    │
                                        │   CSV Data Logging     │
                                        │   HTTP API Requests    │
                                        └───────────┬────────────┘
                                                    │
                                                    ▼
                                        ┌────────────────────────┐
                                        │   Web Supervision      │
                                        │   Node.js / Express    │
                                        │                        │
                                        │   Authentication       │
                                        │   Role-Based Access    │
                                        │   Real-Time Dashboard  │
                                        │   Measurement History  │
                                        └────────────────────────┘
```

During normal operation, only Node B is connected to the computer. It forwards both its own measurements (`LOCAL`) and the measurements received from Node A (`REMOTE`) through the UART interface, enabling centralized monitoring and comparison of the two acquisition nodes.

---

## 2. Key Features

### Embedded Acquisition and Wireless Communication

- Temperature and humidity acquisition using DHT11 sensors on two independent CC1310 nodes.
- Low-level sensor data decoding using a hardware timer.
- Point-to-point Sub-1 GHz communication at 868 MHz using Texas Instruments EasyLink.
- UART communication between the receiver node and the acquisition computer (115200 baud, 8N1).
- Local and remote measurement comparison with configurable temperature and relative humidity deviation thresholds.

### RF Physical-Layer Characterization

- RSSI scanning across 36 channels in the 863–870 MHz frequency band.
- Channel spacing of 200 kHz.
- Energy detection using the `CMD_PROP_CS` radio command.
- Evaluation of the received signal strength and background noise level.
- Identification of the configured transmission channel independently of packet decoding.

### Web-Based Monitoring Platform

A Node.js/Express application provides centralized access to measurement data and monitoring features.

- User authentication with password hashing using `bcryptjs`.
- Session management with HTTP-only cookies.
- Role-based access control for administrators and standard users.
- Real-time dashboard with measurement gauges and historical charts.
- Configurable threshold-based alerts.
- User management with search, filtering and pagination.
- Dedicated measurement ingestion API protected by an API key.

---

## 3. Hardware Components

| Component | Description |
|---|---|
| 2 × Texas Instruments CC1310 LaunchPad | Embedded acquisition and wireless communication nodes |
| 2 × DHT11 sensors | Temperature and relative humidity measurement |
| UART connection | Serial communication between Node B and the computer |
| DHT11 GPIO connection | DATA connected to DIO24, VCC to 3.3 V and GND to GND |

The DHT11 data line is connected to DIO24 to avoid conflicts with the LaunchPad's onboard LEDs (DIO6/DIO7).

---

## 4. Software and Development Environment

| Technology | Application |
|---|---|
| C | Embedded firmware development |
| Code Composer Studio (CCS) | Texas Instruments embedded development environment |
| SimpleLink CC13x0 SDK | TI-Drivers, driverlib, EasyLink and TI-RTOS |
| EasyLink API | Sub-1 GHz wireless communication |
| Python 3 | UART acquisition, CSV logging and HTTP requests |
| pyserial | Serial port communication |
| requests | HTTP communication with the backend |
| Node.js / Express | Web application and REST API |
| EJS, HTML, CSS, JavaScript | Web interface development |
| PuTTY / Tera Term | Serial communication debugging |

---

## 5. Repository Structure

```text
.
├── firmware/
│   ├── carteA/
│   │   └── rfEasyLinkTx.c
│   │
│   └── carteB/
│       └── rfEasyLinkRx.c
│
├── acquisition/
│   └── dht11_logger.py
│
└── backend/
    ├── server.js
    ├── simulate-sensor.js
    │
    ├── config/
    │   └── jsonStore.js
    │
    ├── models/
    │   ├── userModel.js
    │   ├── thresholdModel.js
    │   ├── logModel.js
    │   └── sensorModel.js
    │
    ├── middleware/
    │   ├── auth.js
    │   └── flash.js
    │
    ├── routes/
    │   ├── authRoutes.js
    │   ├── dashboardRoutes.js
    │   ├── adminRoutes.js
    │   ├── profileRoutes.js
    │   └── ingestRoutes.js
    │
    ├── views/
    └── public/
        ├── css/
        │   └── style.css
        └── js/
            └── dashboard.js
```

---

## 6. Installation and Deployment

### 6.1. Embedded Firmware

1. Import the transmitter and receiver projects into Code Composer Studio.
2. Configure both boards to use the same radio frequency:

   ```c
   EasyLink_setFrequency(868000000);
   ```

3. Flash Node A with the transmitter firmware (`rfEasyLinkTx.c`).
4. Flash Node B with the receiver firmware (`rfEasyLinkRx.c`).
5. Connect the DHT11 sensors to the corresponding GPIO pins.
6. Verify the wireless link and serial output using a terminal application.

### 6.2. Python Acquisition Service

Install the required dependencies:

```bash
cd acquisition
pip install pyserial requests
```

Run the acquisition script:

```bash
python dht11_logger.py
```

The script reads serial data from Node B at 115200 baud, records measurements in `dht11_log.csv`, and forwards the collected data to the web backend through its ingestion API.

### 6.3. Web Monitoring Platform

Install the backend dependencies and start the server:

```bash
cd backend
npm install
npm start
```

Access the application locally:

```text
http://localhost:3000
```

**Hardware-independent testing**

The backend includes a sensor simulation script for testing the monitoring platform without physical acquisition hardware:

```bash
npm run simulate
```

> **Security note:** Configure administrator credentials and the API key through environment variables or another secure configuration mechanism. Never commit production credentials or secret keys to the repository.

---

## 7. Experimental Results — RF Signal Characterization

RF measurements were performed over the European 863–870 MHz ISM/SRD band using a 36-channel scan with 200 kHz spacing.

Two measurement conditions were evaluated:

1. **Background measurement:** RSSI scanning without the CC1310 transmitter.
2. **Transmission measurement:** RSSI measurement with the CC1310 transmitter operating on channel 25.

### Measurement Summary

| Parameter | Background Measurement | CC1310 Transmission |
|---|---:|---:|
| Frequency band | 863–870 MHz | 863–870 MHz |
| Number of channels | 36 | 36 |
| Channel spacing | 200 kHz | 200 kHz |
| RSSI range / value | −115 to −100 dBm | — |
| Selected channel | — | Channel 25 |
| Operating frequency | — | 868.000 MHz |
| Measured RSSI | Approximately −108 dBm (average) | Approximately −14 dBm |

The measured transmission level was approximately **94 dB above the average background level**.

These results demonstrate that the energy-detection procedure based on `CMD_PROP_CS` successfully identifies the CC1310 transmission on the configured operating channel.

The RSSI scan characterizes received radio energy and does not, by itself, identify or decode the transmitted packets.

---

## 8. Security Considerations

Security mechanisms implemented in the web application include:

- Password hashing using `bcryptjs`.
- Server-side authentication and authorization checks.
- Role-based access control.
- HTTP-only session cookies.
- API-key authentication for the measurement ingestion endpoint.

### Current Limitations

The following security aspects remain areas for improvement:

- The wireless communication link does not currently implement application-level encryption or authentication.
- The ingestion API relies on a shared API key, which requires secure storage and rotation.
- JSON file-based persistence does not provide database-level transaction management or concurrency guarantees.
- CSRF protection and rate limiting are not currently implemented on sensitive routes.

These limitations should be addressed before considering a production deployment.

---

## 9. Limitations and Future Improvements

Potential extensions of the system include:

- Implementing authenticated and encrypted wireless communication, with replay protection.
- Using the CC1310 Sensor Controller Engine to reduce power consumption during sensor acquisition.
- Improving RSSI measurement reliability through repeated scans and statistical averaging.
- Evaluating the receiver's response to additional RF transmitters and interference sources.
- Migrating JSON-based persistence to a relational database such as SQLite or PostgreSQL.
- Introducing stronger API security mechanisms and additional web application protections.
- Optimizing the embedded nodes for low-power and battery-operated applications.

---

## 10. Technical Skills Demonstrated

**Embedded Systems**
- C programming and microcontroller development.
- GPIO configuration and hardware timer-based acquisition.
- Sensor interfacing and serial communication.
- Texas Instruments SimpleLink SDK and TI-Drivers.
- Embedded firmware debugging and power-management concepts.

**Wireless Communications**
- Sub-1 GHz RF communication.
- Point-to-point wireless architecture.
- Texas Instruments EasyLink API.
- RSSI measurement and radio energy detection.
- Physical-layer signal characterization.

**Software and Web Development**
- Python-based acquisition and data logging.
- Node.js and Express application development.
- REST API design and integration.
- Authentication and role-based authorization.
- Dashboard development and measurement visualization.

---

## 11. Technical References

- Texas Instruments — [CC1310 SimpleLink Ultra-Low-Power Sub-1 GHz Wireless MCU (SWRS181)](https://www.ti.com/lit/pdf/swrs181)
- Texas Instruments — [CC13x0 / CC26x0 SimpleLink Wireless MCU Technical Reference Manual (SWCU117)](https://www.ti.com/lit/pdf/swcu117)
- Texas Instruments — [SimpleLink CC1310 LaunchPad Development Kit User's Guide (SWRU447)](https://www.ti.com/lit/pdf/swru447)
- ETSI — EN 300 220-1, Short Range Devices (SRD).
- OWASP — Password Storage Cheat Sheet.

---

## 12. Author

**Arwa Kassebi**  
Engineering Student in Telecommunications  
National Engineering School of Tunis (ENIT) — Department of Information and Communication Technologies

**Internship:** Asteelflash Tunisia  
**Academic year:** 2025–2026

---

## License

Academic engineering project developed as part of an engineering internship.

See the [LICENSE](LICENSE) file for the applicable terms of use.
