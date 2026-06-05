const Groq = require('groq-sdk');

let client;
function getClient() {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

async function generate(prompt, fast = false) {
  const model = fast ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
  const res = await getClient().chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1024,
  });
  return res.choices[0].message.content;
}

async function getBaitAdvice(query, conditions = null) {
  const conditionsContext = conditions
    ? `\nAktualne warunki: temp. ${conditions.temperature}°C, ciśnienie ${conditions.pressure} hPa (${conditions.pressureTrend}), wiatr ${conditions.windSpeed} km/h.`
    : '';

  const prompt = `Jesteś ekspertem wędkarskim z 30-letnim doświadczeniem w polskich wodach.
Zapytanie: "${query}"${conditionsContext}

Odpowiedz DOKŁADNIE w tym formacie JSON (bez markdown, bez \`\`\`, samo JSON):
{
  "species": "nazwa gatunku",
  "location": "nazwa łowiska/rzeki",
  "month": "miesiąc lub pora roku",
  "recommendations": [
    {
      "bait": "nazwa przynęty",
      "type": "spinning|grunt|spławik|muchowa",
      "color": "kolor lub wzór",
      "size": "rozmiar/waga",
      "technique": "opis prowadzenia",
      "depth": "głębokość",
      "confidence": 90,
      "reason": "krótkie uzasadnienie dlaczego ta przynęta"
    }
  ],
  "spots": "gdzie konkretnie szukać ryb",
  "timing": "najlepsze godziny",
  "waterTemp": "przewidywana temperatura wody",
  "conditions": "jakich warunków szukać",
  "tips": ["porada 1", "porada 2", "porada 3"],
  "warningIfAny": null
}`;

  const text = await generate(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Brak JSON w odpowiedzi');
  return JSON.parse(jsonMatch[0]);
}

async function enrichFishingSpot(spotName, spotType, lat, lon) {
  const prompt = `Jesteś ekspertem wędkarskim. Opisz łowisko dla polskiego wędkarza.

Miejsce: "${spotName}" (${spotType})
${lat && lon ? `Współrzędne: ${lat}, ${lon}` : ''}

Odpowiedz w JSON (bez markdown, bez \`\`\`):
{
  "species": ["lista gatunków"],
  "bestSeasons": ["wiosna", "lato", "jesień", "zima"],
  "techniques": ["spinning", "grunt"],
  "difficulty": "łatwe|średnie|trudne",
  "description": "1-2 zdania charakterystyki",
  "access": "info o dojściu lub null",
  "regulations": "ograniczenia lub null",
  "tip": "jedna konkretna porada"
}`;

  const text = await generate(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
}

async function generatePushNotification(topSpecies, score, weather) {
  if (score < 75) return null;
  const prompt = `Napisz krótkie (max 80 znaków) powiadomienie push po polsku dla wędkarza.
Warunki: ${score}/100 szans na branie, gatunek: ${topSpecies}, temp: ${weather.temperature}°C, ciśnienie: ${weather.pressure}hPa ${weather.pressureTrend}.
Bez cudzysłowów, bez emoji, sam tekst.`;
  const text = await generate(prompt, true);
  return text.trim().slice(0, 100);
}

module.exports = { getBaitAdvice, enrichFishingSpot, generatePushNotification };
