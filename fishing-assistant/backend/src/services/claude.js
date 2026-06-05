const Groq = require('groq-sdk');

let client;
function getClient() {
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

async function generate(systemPrompt, userPrompt, fast = false) {
  const model = fast ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
  const res = await getClient().chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 1200,
  });
  return res.choices[0].message.content;
}

// Polskie przepisy wędkarskie — okresy i wymiary ochronne (PZW 2024/2025)
const REGULATIONS = `
OKRESY OCHRONNE W POLSCE (łowienie zabronione):
- Szczupak: 1 stycznia – 30 kwietnia
- Sandacz: 1 stycznia – 31 maja
- Sum: 1 stycznia – 31 maja
- Troć (pstrąg): 1 września – 31 stycznia (wody nizinne); 1 września – 28 lutego (górskie)
- Lipień: 1 marca – 31 maja
- Brzana: 1 stycznia – 30 czerwca
- Jaź: 1 marca – 15 maja
- Boleń: 1 stycznia – 30 kwietnia
- Lin: 1 marca – 31 maja
- Węgorz: 1 grudnia – 31 marca
- Miętus: 1 grudnia – końca lutego
- Sieja: 1 października – 31 grudnia
- Certa: 1 stycznia – 30 czerwca
- Jesiotr: całoroczny zakaz

WYMIARY OCHRONNE (minimalna długość do zabrania):
- Szczupak: 50 cm
- Sandacz: 50 cm
- Sum: 70 cm
- Karp: 30 cm
- Okoń: 20 cm (15 cm w niektórych okręgach)
- Troć/Pstrąg potokowy: 30 cm
- Lipień: 30 cm
- Brzana: 40 cm
- Lin: 25 cm
- Jaź: 25 cm
- Leszcz: 25 cm
- Boleń: 40 cm
- Węgorz: 50 cm

LIMITY DOBOWE: max 2 szt. szczupaka/sandacza/suma dziennie, max 4 szt. łososiowatych.

WAŻNE ZASADY:
- Obowiązkowa karta wędkarska + zezwolenie PZW lub właściciela łowiska
- Zakaz połowu od zmierzchu do świtu na niektórych wodach (sprawdź regulamin łowiska)
- C&R (złów i wypuść) dozwolone przez cały rok dla gatunków poza wymiarem
`;

function getCurrentMonth() {
  const months = ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
  return months[new Date().getMonth()];
}

async function getBaitAdvice(query, conditions = null) {
  const conditionsContext = conditions
    ? `\nAktualne warunki pogodowe: temp. ${conditions.temperature}°C, ciśnienie ${conditions.pressure} hPa (trend: ${conditions.pressureTrend}), wiatr ${conditions.windSpeed} km/h, zachmurzenie ${conditions.cloudiness}%.`
    : '';

  const currentMonth = getCurrentMonth();

  const systemPrompt = `Jesteś doświadczonym polskim wędkarzem-ekspertem. Odpowiadasz TYLKO na pytania związane z wędkarstwem w Polsce.

KRYTYCZNE ZASADY:
1. ZAWSZE sprawdź okresy ochronne zanim doradzisz łowienie gatunku. Jeśli gatunek jest w okresie ochronnym w danym miesiącu — ODMÓW porady i wyjaśnij dlaczego, podaj datę zakończenia okresu ochronnego.
2. Dzisiejszy miesiąc to: ${currentMonth}. Jeśli użytkownik pyta o inny miesiąc, sprawdź okresy ochronne dla TAMTEGO miesiąca.
3. Podawaj REALISTYCZNE, SPRAWDZONE przynęty i techniki. Nie wymyślaj nieistniejących przynęt.
4. Przynęty to np.: gumy (twister, ripper, shad, creature), woblery, obrotówki, wahadłówki, jigi, dropshot, carolina rig, texas rig, robak, kukurydza, pellet, boilies, ciasto, żywiec, dżdżownica, biały robak, czerwony robak, larwy, imitacje much, nymfy, streamer, popper.
5. Techniki to: spinning, trolling, spławik, grunt, feeder/method feeder, muchowa, dropshot, jigging.
6. Jeśli pytanie NIE dotyczy wędkarstwa — odpowiedz że jesteś tylko doradcą wędkarskim.
7. Podawaj wymiary ochronne gatunku.

${REGULATIONS}`;

  const userPrompt = `Zapytanie wędkarskie: "${query}"${conditionsContext}

Odpowiedz DOKŁADNIE w formacie JSON (bez markdown, bez \`\`\`, samo JSON):
{
  "species": "nazwa gatunku",
  "location": "nazwa łowiska/rzeki",
  "month": "miesiąc lub pora roku",
  "recommendations": [
    {
      "bait": "konkretna nazwa przynęty (np. Keitech Easy Shiner 3\\")",
      "type": "spinning|grunt|spławik|muchowa|feeder",
      "color": "kolor (np. motoroil, perch, silver flash)",
      "size": "rozmiar/waga (np. 7cm / 10g jighead)",
      "technique": "jak prowadzić (np. wolny jig przy dnie, pauzy 3-5s)",
      "depth": "głębokość w metrach",
      "confidence": 85,
      "reason": "dlaczego ta przynęta zadziała w tych warunkach"
    }
  ],
  "spots": "gdzie szukać ryb (np. krawędzie, przybrzeżne trzcinowiska, głęboczki)",
  "timing": "najlepsze godziny z uzasadnieniem",
  "waterTemp": "przybliżona temperatura wody i jej wpływ",
  "conditions": "optymalne warunki pogodowe",
  "tips": ["konkretna porada 1", "konkretna porada 2", "konkretna porada 3"],
  "warningIfAny": "OKRES OCHRONNY lub inne ostrzeżenie, lub null jeśli brak"
}

Jeśli gatunek jest W OKRESIE OCHRONNYM w podanym miesiącu, zwróć JSON z pustymi recommendations[], a w warningIfAny napisz jasne ostrzeżenie z datami.`;

  const text = await generate(systemPrompt, userPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Brak JSON w odpowiedzi');
  return JSON.parse(jsonMatch[0]);
}

async function enrichFishingSpot(spotName, spotType, lat, lon) {
  const systemPrompt = `Jesteś ekspertem wędkarskim znającym polskie łowiska. Podawaj TYLKO prawdziwe, sprawdzone informacje. Jeśli nie znasz danego łowiska — napisz ogólny opis na podstawie typu zbiornika i regionu. Nie wymyślaj szczegółów których nie znasz.`;

  const userPrompt = `Opisz łowisko dla polskiego wędkarza.

Miejsce: "${spotName}" (${spotType})
${lat && lon ? `Współrzędne: ${lat}, ${lon}` : ''}

Odpowiedz w JSON (bez markdown, bez \`\`\`):
{
  "species": ["realistyczna lista gatunków dla tego typu zbiornika"],
  "bestSeasons": ["najlepsze pory roku"],
  "techniques": ["sprawdzone techniki"],
  "difficulty": "łatwe|średnie|trudne",
  "description": "1-2 zdania charakterystyki (co wyróżnia to łowisko)",
  "access": "info o dostępie lub null",
  "regulations": "ograniczenia lub null",
  "tip": "jedna konkretna, praktyczna porada"
}`;

  const text = await generate(systemPrompt, userPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
}

async function generatePushNotification(topSpecies, score, weather) {
  if (score < 75) return null;
  const systemPrompt = 'Jesteś asystentem wędkarskim. Pisz krótko, konkretnie, po polsku. Bez emoji.';
  const userPrompt = `Napisz krótkie (max 80 znaków) powiadomienie push dla wędkarza.
Warunki: ${score}/100 szans na branie, gatunek: ${topSpecies}, temp: ${weather.temperature}°C, ciśnienie: ${weather.pressure}hPa ${weather.pressureTrend}.
Sam tekst, bez cudzysłowów.`;
  const text = await generate(systemPrompt, userPrompt, true);
  return text.trim().slice(0, 100);
}

module.exports = { getBaitAdvice, enrichFishingSpot, generatePushNotification };
