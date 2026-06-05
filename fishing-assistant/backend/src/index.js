require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const conditionsRouter = require('./routes/conditions');
const spotsRouter = require('./routes/spots');
const advisorRouter = require('./routes/advisor');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : null;

app.use(cors({
  origin: allowedOrigins || '*',
}));
app.use(express.json());

// Routes
app.use('/api/conditions', conditionsRouter);
app.use('/api/spots', spotsRouter);
app.use('/api/advisor', advisorRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cron: co rano o 6:00 sprawdź warunki dla zarejestrowanych tokenów
cron.schedule('0 6 * * *', async () => {
  console.log('[CRON] Poranny sprawdzian warunków wędkarskich...');
  // TODO: pobrać lokalizacje użytkowników i wysłać push notifications
  // przez Expo Push API jeśli warunki >= 75/100
});

// Auto-seed spots on startup (idempotent - skips duplicates)
try {
  const { spotsDb } = require('./services/db');
  if (spotsDb.getAll().length === 0) {
    console.log('[SEED] Baza pusta, seeduję łowiska...');
    require('./seed');
    require('./seed-kaszuby');
    console.log(`[SEED] Gotowe: ${spotsDb.getAll().length} łowisk`);
  }
} catch (e) {
  console.error('[SEED] Błąd:', e.message);
}

app.listen(PORT, () => {
  console.log(`Fishing Assistant Backend działa na porcie ${PORT}`);
});

module.exports = app;
