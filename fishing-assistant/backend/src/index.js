require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const conditionsRouter = require('./routes/conditions');
const spotsRouter = require('./routes/spots');
const advisorRouter = require('./routes/advisor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
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

app.listen(PORT, () => {
  console.log(`Fishing Assistant Backend działa na porcie ${PORT}`);
});

module.exports = app;
