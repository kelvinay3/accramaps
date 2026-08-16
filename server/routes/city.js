import { Router } from 'express';
import { accraTrafficFactor } from '../util/geo.js';
import { ah } from '../util/asyncHandler.js';

const ACCRA = { lat: 5.6037, lng: -0.187 };
const WEATHER_CODES = {
  0: ['☀️', 'Clear sky'], 1: ['🌤️', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Foggy'], 48: ['🌫️', 'Foggy'],
  51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'],
  61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  80: ['🌧️', 'Rain showers'], 81: ['🌧️', 'Rain showers'], 82: ['⛈️', 'Violent showers'],
  95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm'], 99: ['⛈️', 'Thunderstorm'],
};

let weatherCache = { at: 0, payload: null };

function fallbackWeather(now = new Date()) {
  const h = now.getHours();
  const month = now.getMonth() + 1;
  const rainySeason = (month >= 4 && month <= 6) || (month >= 9 && month <= 10);
  const temps = [31, 30, 29, 31, 32, 32, 29, 28, 29, 30, 31, 32];
  let icon, desc, extra;
  if (rainySeason && h > 12) { icon = '🌧️'; desc = 'Rain expected'; extra = 'Flooding possible on Ring Road'; }
  else if (h >= 6 && h < 12) { icon = '🌤️'; desc = 'Morning sunshine'; extra = 'Good time to beat the traffic'; }
  else if (h >= 12 && h < 17) { icon = '☀️'; desc = 'Hot & sunny'; extra = 'Stay hydrated · UV index high'; }
  else if (h >= 17 && h < 20) { icon = '🌅'; desc = 'Golden hour'; extra = 'Perfect for Labadi Beach'; }
  else { icon = '🌙'; desc = 'Cool night'; extra = 'Nightlife is starting 🎉'; }
  return { icon, temp_c: temps[month - 1], description: desc, extra, source: 'seasonal-estimate' };
}

export function cityRoutes(db) {
  const router = Router();

  // Live weather for Accra via Open-Meteo (free, no key), 10 min cache,
  // seasonal fallback when offline.
  router.get('/weather', ah(async (req, res) => {
    if (weatherCache.payload && Date.now() - weatherCache.at < 10 * 60_000) {
      return res.json(weatherCache.payload);
    }
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${ACCRA.lat}&longitude=${ACCRA.lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Africa%2FAccra`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error(`Open-Meteo ${resp.status}`);
      const data = await resp.json();
      const code = data.current?.weather_code;
      const [icon, description] = WEATHER_CODES[code] || ['🌤️', 'Fair'];
      const payload = {
        icon,
        temp_c: Math.round(data.current?.temperature_2m ?? 30),
        description,
        extra: `Wind ${Math.round(data.current?.wind_speed_10m ?? 0)} km/h · Accra`,
        source: 'open-meteo',
      };
      weatherCache = { at: Date.now(), payload };
      res.json(payload);
    } catch {
      res.json(fallbackWeather());
    }
  }));

  // Traffic status: time-of-day heuristic + live community report volume.
  router.get('/traffic', ah(async (req, res) => {
    const factor = accraTrafficFactor();
    const totalReports = await db.reports.countActive();
    let level, label, detail;
    if (factor >= 1.7 || totalReports >= 10) {
      level = 'heavy'; label = 'Traffic: Heavy'; detail = 'Ring Road & Spintex congested';
    } else if (factor >= 1.3 || totalReports >= 4) {
      level = 'moderate'; label = 'Traffic: Moderate'; detail = 'Allow extra travel time';
    } else {
      level = 'light'; label = 'Traffic: Light'; detail = 'Roads clear · Best time to travel';
    }
    res.json({ level, label, detail, factor, active_reports: totalReports });
  }));

  // Vibe score — the city's energy meter 🇬🇭
  router.get('/vibe', (req, res) => {
    const now = new Date();
    const h = now.getHours();
    const day = now.getDay();
    const month = now.getMonth() + 1;
    let score = 5.0;
    if (h >= 20 || h <= 2) score += 3.0;
    else if (h >= 18) score += 1.5;
    else if (h >= 6 && h <= 8) score -= 1.0;
    if (day === 5 || day === 6) score += 1.5;
    else if (day === 0) score += 0.5;
    const detty = month === 12 || month === 1;
    if (detty) score += 1.5;
    score = Math.min(9.9, Math.max(3.0, score));
    const label = score >= 8.5 ? 'Accra is 🔥 right now' : score >= 7 ? 'City is alive!' : score >= 5.5 ? 'Vibes are building' : 'Quiet city day';
    res.json({ score: Number(score.toFixed(1)), label, detty_december: detty });
  });

  return router;
}
