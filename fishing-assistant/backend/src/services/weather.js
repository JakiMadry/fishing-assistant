const axios = require('axios');

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

async function getCurrentWeather(lat, lon) {
  const key = process.env.OPENWEATHER_API_KEY;
  const [weather, forecast] = await Promise.all([
    axios.get(`${BASE_URL}/weather`, {
      params: { lat, lon, appid: key, units: 'metric', lang: 'pl' }
    }),
    axios.get(`${BASE_URL}/forecast`, {
      params: { lat, lon, appid: key, units: 'metric', lang: 'pl', cnt: 8 }
    })
  ]);

  const w = weather.data;
  return {
    temperature: Math.round(w.main.temp),
    feelsLike: Math.round(w.main.feels_like),
    pressure: w.main.pressure,
    humidity: w.main.humidity,
    windSpeed: Math.round(w.wind.speed * 3.6), // m/s → km/h
    windDeg: w.wind.deg,
    cloudiness: w.clouds.all,
    description: w.weather[0].description,
    icon: w.weather[0].icon,
    visibility: w.visibility,
    // Trend ciśnienia z prognozy
    pressureTrend: getPressureTrend(forecast.data.list),
    forecast3h: forecast.data.list.slice(0, 4).map(f => ({
      time: new Date(f.dt * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      temp: Math.round(f.main.temp),
      pressure: f.main.pressure,
      description: f.weather[0].description,
      rain: f.rain?.['3h'] || 0
    }))
  };
}

function getPressureTrend(forecastList) {
  if (forecastList.length < 3) return 'stabilne';
  const first = forecastList[0].main.pressure;
  const last = forecastList[Math.min(3, forecastList.length - 1)].main.pressure;
  const diff = last - first;
  if (diff > 3) return 'rosnące';
  if (diff < -3) return 'malejące';
  return 'stabilne';
}

module.exports = { getCurrentWeather };
