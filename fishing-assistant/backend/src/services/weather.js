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
    windSpeed: Math.round(w.wind.speed * 3.6),
    windDeg: w.wind.deg,
    cloudiness: w.clouds.all,
    description: w.weather[0].description,
    icon: w.weather[0].icon,
    visibility: w.visibility,
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

/**
 * Pobiera prognozę na konkretny dzień (offset 0=dziś, 1=jutro, 2=pojutrze itd.)
 * Uśrednia wartości z prognoz 3h na dany dzień.
 */
async function getForecastForDay(lat, lon, dayOffset = 0) {
  const key = process.env.OPENWEATHER_API_KEY;
  const forecast = await axios.get(`${BASE_URL}/forecast`, {
    params: { lat, lon, appid: key, units: 'metric', lang: 'pl', cnt: 40 }
  });

  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const targetDay = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD

  const dayForecasts = forecast.data.list.filter(f => {
    const d = new Date(f.dt * 1000).toISOString().slice(0, 10);
    return d === targetDay;
  });

  if (dayForecasts.length === 0) {
    // Fallback: take first available entries
    return getCurrentWeather(lat, lon);
  }

  // Average/aggregate day values
  const temps = dayForecasts.map(f => f.main.temp);
  const pressures = dayForecasts.map(f => f.main.pressure);
  const winds = dayForecasts.map(f => f.wind.speed * 3.6);
  const humidities = dayForecasts.map(f => f.main.humidity);
  const clouds = dayForecasts.map(f => f.clouds.all);
  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  // Pick midday description or first available
  const midday = dayForecasts.find(f => {
    const h = new Date(f.dt * 1000).getHours();
    return h >= 11 && h <= 14;
  }) || dayForecasts[Math.floor(dayForecasts.length / 2)];

  return {
    temperature: avg(temps),
    feelsLike: avg(dayForecasts.map(f => f.main.feels_like)),
    pressure: avg(pressures),
    humidity: avg(humidities),
    windSpeed: avg(winds),
    windDeg: midday.wind.deg,
    cloudiness: avg(clouds),
    description: midday.weather[0].description,
    icon: midday.weather[0].icon,
    visibility: midday.visibility || 10000,
    pressureTrend: getPressureTrend(dayForecasts.length >= 3 ? dayForecasts : forecast.data.list),
    forecast3h: dayForecasts.slice(0, 4).map(f => ({
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

module.exports = { getCurrentWeather, getForecastForDay };
