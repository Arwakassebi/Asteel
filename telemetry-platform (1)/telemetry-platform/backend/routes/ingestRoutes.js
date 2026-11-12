const express = require('express');

const sensorModel = require('../models/sensorModel');
const logModel = require('../models/logModel');

const router = express.Router();

// Cle partagee entre le backend et les scripts d'acquisition (Python, etc.).
// A definir via une variable d'environnement en dehors du developpement local.
const INGEST_API_KEY = process.env.INGEST_API_KEY || 'cc1310-dev-key';

function requireApiKey(req, res, next) {
  const key = req.get('X-API-Key');
  if (key !== INGEST_API_KEY) {
    return res.status(401).json({ error: 'Clé API invalide ou absente (en-tête X-API-Key).' });
  }
  next();
}

/**
 * POST /api/ingest
 * Body attendu : { "temperature": 23.4, "humidity": 55.0 }
 *
 * Route destinee aux scripts d'acquisition externes (ex: dht11_logger.py
 * qui lit le port serie de la CC1310), pas au navigateur. Elle n'exige donc
 * pas de session utilisateur, seulement la clé API partagee.
 */
router.post('/api/ingest', requireApiKey, (req, res) => {
  const { temperature, humidity } = req.body;

  if (typeof temperature !== 'number' || Number.isNaN(temperature)) {
    return res.status(400).json({ error: 'Le champ "temperature" doit être un nombre.' });
  }
  if (typeof humidity !== 'number' || Number.isNaN(humidity)) {
    return res.status(400).json({ error: 'Le champ "humidity" doit être un nombre.' });
  }

  sensorModel.appendReading({ temperature, humidity });
  logModel.logAction('CC1310 (capteur)', 'sensor_reading_ingested', `T=${temperature}°C H=${humidity}%`);

  res.status(201).json({ status: 'ok' });
});

module.exports = router;
