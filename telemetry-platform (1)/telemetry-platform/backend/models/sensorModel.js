/**
 * sensorModel.js
 * --------------
 * Source des mesures capteur (temperature + humidite).
 *
 * Aujourd'hui : lues depuis data/sensor_readings.json, alimente par
 * simulate-sensor.js (ou par tout script de test).
 *
 * Evolution prevue : remplacer uniquement `appendReading`/`getHistory`
 * par une lecture UART/RF de la carte CC1310 (DHT11). Les routes et le
 * frontend ne dependent que du contrat retourne par ce module.
 */

const { readJSON, writeJSON } = require('../config/jsonStore');

const STORE_NAME = 'sensor_readings';
const MAX_READINGS = 500;

// Au-dela de cette duree sans nouvelle mesure, le capteur est considere
// "hors ligne" (absence de donnees) par l'API de statut.
const STALE_AFTER_MS = 15000;

function getAll() {
  return readJSON(STORE_NAME, []);
}

function getHistory(limit = 50) {
  return getAll().slice(-limit);
}

function getLatest() {
  const all = getAll();
  return all.length > 0 ? all[all.length - 1] : null;
}

function appendReading({ temperature, humidity }) {
  const readings = getAll();
  readings.push({
    temperature,
    humidity,
    timestamp: new Date().toISOString(),
  });
  writeJSON(STORE_NAME, readings.slice(-MAX_READINGS));
}

function getStatus() {
  const latest = getLatest();
  if (!latest) return 'no-data';

  const age = Date.now() - new Date(latest.timestamp).getTime();
  return age > STALE_AFTER_MS ? 'no-data' : 'connected';
}

module.exports = { getHistory, getLatest, appendReading, getStatus };
