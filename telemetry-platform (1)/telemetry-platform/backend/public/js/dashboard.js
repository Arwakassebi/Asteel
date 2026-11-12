/**
 * dashboard.js
 * ------------
 * Polling de l'API JSON /api/sensor/history, mise a jour des jauges,
 * du bandeau d'etat et du graphique combine temperature/humidite.
 * Les seuils affiches sont ceux calcules cote serveur (window.__THRESHOLDS__),
 * puis rafraichis a chaque poll pour rester a jour si un admin les modifie.
 */

(function () {
  'use strict';

  const CONFIG = {
    API_URL: '/api/sensor/history?limit=50',
    POLL_INTERVAL_MS: 2000,
    GAUGE_TEMP_MIN: -10,
    GAUGE_TEMP_MAX: 50,
    GAUGE_HUM_MIN: 0,
    GAUGE_HUM_MAX: 100,
  };

  let thresholds = window.__THRESHOLDS__ || { tempMin: 15, tempMax: 30, humMin: 30, humMax: 70 };

  const el = {
    currentTemp: document.getElementById('currentTemp'),
    currentHum: document.getElementById('currentHum'),
    tempGaugeFill: document.getElementById('tempGaugeFill'),
    humGaugeFill: document.getElementById('humGaugeFill'),
    statusBanner: document.getElementById('statusBanner'),
    statusIcon: document.getElementById('statusIcon'),
    statusText: document.getElementById('statusText'),
    lastUpdate: document.getElementById('lastUpdate'),
    chartCanvas: document.getElementById('tempChart'),
  };

  /* ================================================================
     Jauges
     ================================================================ */

  function setGauge(fillEl, value, min, max) {
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    fillEl.style.width = `${pct}%`;
  }

  /* ================================================================
     Affichage + bandeau d'etat
     ================================================================ */

  function updateDisplays(latest) {
    el.currentTemp.textContent = latest.temperature.toFixed(1);
    el.currentHum.textContent = latest.humidity.toFixed(1);
    el.lastUpdate.textContent = `Dernière mise à jour : ${new Date(latest.timestamp).toLocaleTimeString()}`;

    setGauge(el.tempGaugeFill, latest.temperature, CONFIG.GAUGE_TEMP_MIN, CONFIG.GAUGE_TEMP_MAX);
    setGauge(el.humGaugeFill, latest.humidity, CONFIG.GAUGE_HUM_MIN, CONFIG.GAUGE_HUM_MAX);

    el.currentTemp.classList.remove('is-high', 'is-low');
    if (latest.temperature > thresholds.tempMax) el.currentTemp.classList.add('is-high');
    else if (latest.temperature < thresholds.tempMin) el.currentTemp.classList.add('is-low');

    updateStatusBanner(latest);
  }

  function updateStatusBanner(latest) {
    el.statusBanner.classList.remove(
      'status-banner--normal', 'status-banner--high', 'status-banner--low', 'status-banner--offline'
    );

    const tempHigh = latest.temperature > thresholds.tempMax;
    const tempLow = latest.temperature < thresholds.tempMin;
    const humHigh = latest.humidity > thresholds.humMax;
    const humLow = latest.humidity < thresholds.humMin;

    if (tempHigh || humHigh) {
      el.statusBanner.classList.add('status-banner--high');
      el.statusIcon.textContent = '🔴';
      el.statusText.textContent = tempHigh
        ? `Température trop élevée (${latest.temperature.toFixed(1)} °C)`
        : `Humidité trop élevée (${latest.humidity.toFixed(1)} %)`;
    } else if (tempLow || humLow) {
      el.statusBanner.classList.add('status-banner--low');
      el.statusIcon.textContent = '🔵';
      el.statusText.textContent = tempLow
        ? `Température trop basse (${latest.temperature.toFixed(1)} °C)`
        : `Humidité trop basse (${latest.humidity.toFixed(1)} %)`;
    } else {
      el.statusBanner.classList.add('status-banner--normal');
      el.statusIcon.textContent = '✅';
      el.statusText.textContent = 'Température et humidité normales';
    }
  }

  function showOfflineState() {
    el.statusBanner.classList.remove('status-banner--normal', 'status-banner--high', 'status-banner--low');
    el.statusBanner.classList.add('status-banner--offline');
    el.statusIcon.textContent = '⏳';
    el.statusText.textContent = 'Absence de données — vérifiez la connexion du capteur';
  }

  /* ================================================================
     Graphique canvas natif (temperature + humidite)
     ================================================================ */

  const Chart = {
    data: [],
    ctx: null,

    init() {
      if (!el.chartCanvas) return;
      this.ctx = el.chartCanvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.ctx) return;
      const canvas = el.chartCanvas;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.draw();
    },

    setData(readings) {
      this.data = readings;
      this.draw();
    },

    draw() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const canvas = el.chartCanvas;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const padding = { top: 16, right: 50, bottom: 24, left: 44 };

      ctx.clearRect(0, 0, width, height);

      if (this.data.length === 0) {
        ctx.fillStyle = '#7fa0a8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText('En attente de données…', padding.left, height / 2);
        return;
      }

      const temps = this.data.map((d) => d.temperature);
      const hums = this.data.map((d) => d.humidity);

      const tMin = Math.min(...temps, thresholds.tempMin) - 2;
      const tMax = Math.max(...temps, thresholds.tempMax) + 2;
      const hMin = 0;
      const hMax = 100;

      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;

      const xFor = (i) => padding.left + (this.data.length === 1 ? 0 : (i / (this.data.length - 1)) * plotWidth);
      const yForTemp = (v) => padding.top + plotHeight - ((v - tMin) / (tMax - tMin)) * plotHeight;
      const yForHum = (v) => padding.top + plotHeight - ((v - hMin) / (hMax - hMin)) * plotHeight;

      // grille
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (plotHeight * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      // lignes de seuil temperature
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#ff6b5f';
      ctx.beginPath();
      ctx.moveTo(padding.left, yForTemp(thresholds.tempMax));
      ctx.lineTo(width - padding.right, yForTemp(thresholds.tempMax));
      ctx.stroke();

      ctx.strokeStyle = '#4ea8ff';
      ctx.beginPath();
      ctx.moveTo(padding.left, yForTemp(thresholds.tempMin));
      ctx.lineTo(width - padding.right, yForTemp(thresholds.tempMin));
      ctx.stroke();
      ctx.setLineDash([]);

      // courbe temperature (pleine)
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2;
      ctx.beginPath();
      this.data.forEach((d, i) => {
        const x = xFor(i), y = yForTemp(d.temperature);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // courbe humidite (pointillee, echelle 0-100)
      ctx.strokeStyle = '#4ea8ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      this.data.forEach((d, i) => {
        const x = xFor(i), y = yForHum(d.humidity);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // legende
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText('● Température (°C)', width - padding.right - 4, 14);
      ctx.fillStyle = '#4ea8ff';
      ctx.fillText('╌ Humidité (%)', width - padding.right - 4, 28);
    },
  };

  /* ================================================================
     Polling
     ================================================================ */

  async function poll() {
    try {
      const response = await fetch(CONFIG.API_URL, { cache: 'no-store' });
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      thresholds = payload.thresholds || thresholds;

      Chart.setData(payload.readings || []);

      if (payload.status === 'no-data' || !payload.readings || payload.readings.length === 0) {
        showOfflineState();
        return;
      }

      updateDisplays(payload.readings[payload.readings.length - 1]);
    } catch (err) {
      console.error('Erreur lors de la récupération des données capteur :', err);
      showOfflineState();
    }
  }

  function init() {
    Chart.init();
    poll();
    setInterval(poll, CONFIG.POLL_INTERVAL_MS);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
