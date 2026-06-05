/**
 * Algorytm oceny warunków wędkarskich.
 * Zwraca score 0-100 i szczegółowy breakdown dla każdego gatunku.
 */

const SPECIES_PROFILES = {
  sandacz: {
    idealPressure: [1010, 1025],
    idealTemp: [8, 18],
    pressureTrend: 'stabilne', // sandacz lubi stałe ciśnienie
    windMax: 30,
    cloudPreference: 'pochmurno',
    moonBonus: true,
    activity: 'dusk_dawn' // najaktywniejszy o świcie/zmierzchu
  },
  szczupak: {
    idealPressure: [1005, 1020],
    idealTemp: [5, 15],
    pressureTrend: 'rosnące',
    windMax: 25,
    cloudPreference: 'obojętne',
    moonBonus: true,
    activity: 'morning'
  },
  okoń: {
    idealPressure: [1008, 1022],
    idealTemp: [10, 22],
    pressureTrend: 'rosnące',
    windMax: 35,
    cloudPreference: 'obojętne',
    moonBonus: false,
    activity: 'all_day'
  },
  karp: {
    idealPressure: [1012, 1025],
    idealTemp: [15, 25],
    pressureTrend: 'stabilne',
    windMax: 20,
    cloudPreference: 'słonecznie',
    moonBonus: true,
    activity: 'evening'
  },
  sum: {
    idealPressure: [1008, 1022],
    idealTemp: [18, 28],
    pressureTrend: 'obojętne',
    windMax: 40,
    cloudPreference: 'obojętne',
    moonBonus: true,
    activity: 'night'
  },
  leszcz: {
    idealPressure: [1010, 1023],
    idealTemp: [12, 22],
    pressureTrend: 'stabilne',
    windMax: 20,
    cloudPreference: 'obojętne',
    moonBonus: false,
    activity: 'morning'
  },
  brzana: {
    idealPressure: [1005, 1020],
    idealTemp: [12, 22],
    pressureTrend: 'rosnące',
    windMax: 35,
    cloudPreference: 'obojętne',
    moonBonus: false,
    activity: 'all_day'
  },
  troć: {
    idealPressure: [1000, 1018],
    idealTemp: [4, 14],
    pressureTrend: 'malejące',
    windMax: 30,
    cloudPreference: 'pochmurno',
    moonBonus: false,
    activity: 'all_day'
  }
};

function calculateFishingScore(weather, moonData, species = null) {
  if (species && SPECIES_PROFILES[species.toLowerCase()]) {
    return scoreForSpecies(weather, moonData, species.toLowerCase());
  }

  // Jeśli nie podano gatunku – ocena ogólna + top 3 gatunki
  const scores = Object.keys(SPECIES_PROFILES).map(s => ({
    species: s,
    ...scoreForSpecies(weather, moonData, s)
  }));

  scores.sort((a, b) => b.overall - a.overall);

  return {
    overall: scores[0].overall,
    generalConditions: getGeneralConditions(weather),
    topSpecies: scores.slice(0, 3),
    allSpecies: scores,
    summary: generateSummary(scores[0], weather, moonData)
  };
}

function scoreForSpecies(weather, moonData, species) {
  const profile = SPECIES_PROFILES[species];
  const breakdown = {};

  // 1. Ciśnienie (25 pkt)
  const [minP, maxP] = profile.idealPressure;
  const p = weather.pressure;
  if (p >= minP && p <= maxP) {
    breakdown.pressure = 25;
  } else {
    const dist = Math.min(Math.abs(p - minP), Math.abs(p - maxP));
    breakdown.pressure = Math.max(0, 25 - dist * 2);
  }

  // Bonus za trend ciśnienia (10 pkt)
  if (profile.pressureTrend === 'obojętne') {
    breakdown.pressureTrend = 10;
  } else if (weather.pressureTrend === profile.pressureTrend) {
    breakdown.pressureTrend = 10;
  } else if (weather.pressureTrend === 'stabilne') {
    breakdown.pressureTrend = 5;
  } else {
    breakdown.pressureTrend = 0;
  }

  // 2. Temperatura (20 pkt)
  const [minT, maxT] = profile.idealTemp;
  const t = weather.temperature;
  if (t >= minT && t <= maxT) {
    breakdown.temperature = 20;
  } else {
    const dist = Math.min(Math.abs(t - minT), Math.abs(t - maxT));
    breakdown.temperature = Math.max(0, 20 - dist * 3);
  }

  // 3. Wiatr (15 pkt)
  const wind = weather.windSpeed;
  if (wind <= profile.windMax * 0.5) {
    breakdown.wind = 15;
  } else if (wind <= profile.windMax) {
    breakdown.wind = Math.round(15 * (1 - (wind - profile.windMax * 0.5) / (profile.windMax * 0.5)));
  } else {
    breakdown.wind = 0;
  }

  // 4. Faza księżyca (20 pkt)
  if (profile.moonBonus) {
    breakdown.moon = Math.round(moonData.fishingScore * 0.2);
  } else {
    breakdown.moon = 12; // neutralny
  }

  // 5. Zachmurzenie (10 pkt)
  const cloud = weather.cloudiness;
  if (profile.cloudPreference === 'pochmurno') {
    breakdown.clouds = cloud > 60 ? 10 : Math.round(cloud / 6);
  } else if (profile.cloudPreference === 'słonecznie') {
    breakdown.clouds = cloud < 40 ? 10 : Math.round((100 - cloud) / 6);
  } else {
    breakdown.clouds = 10; // obojętne
  }

  const overall = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    overall: Math.min(100, Math.round(overall)),
    breakdown,
    rating: getRating(overall),
    tip: getSpeciesTip(species, weather, overall)
  };
}

function getRating(score) {
  if (score >= 80) return 'Doskonałe';
  if (score >= 65) return 'Bardzo dobre';
  if (score >= 50) return 'Dobre';
  if (score >= 35) return 'Przeciętne';
  return 'Słabe';
}

function getSpeciesTip(species, weather, score) {
  const profile = SPECIES_PROFILES[species] || {};
  const temp = weather.temperature;
  const wind = weather.windSpeed;
  const pressure = weather.pressureTrend;

  const tips = {
    sandacz: () => {
      if (score >= 70 && weather.cloudiness > 60) return 'Pochmurno i spokojnie — sandacz ruszy na żer przy dnie.';
      if (score >= 70) return 'Stabilne ciśnienie sprzyja sandaczowi. Łów przy dnie o zmierzchu.';
      if (temp > 20) return 'Ciepło — sandacz zejdzie głębiej. Szukaj go przy dnie na głębszych stanowiskach.';
      if (pressure === 'malejące') return 'Spadające ciśnienie — sandacz będzie mało aktywny, spróbuj wolnej gry.';
      return 'Przeciętny dzień. Stawiaj na gumę przy dnie w okolicy głęboczków.';
    },
    szczupak: () => {
      if (score >= 70 && temp < 15) return 'Chłodno i ciśnienie rośnie — szczupak poluje agresywnie!';
      if (score >= 70) return 'Szczupak dziś aktywny. Spróbuj dużych przynęt rano przy trzcinach.';
      if (temp > 20) return 'Za ciepło na szczupaka. Szukaj go w cieniach i przy natlenionych miejscach.';
      if (wind > 20) return 'Wiatr miesza wodę — spróbuj spinningu przy nawietrznym brzegu.';
      return 'Średnie warunki. Postaw na wolniejsze prowadzenie i mniejsze przynęty.';
    },
    okoń: () => {
      if (score >= 70) return 'Okoń dziś bardzo aktywny. Drobne gumki i mikrojigi powinny zadziałać.';
      if (temp > 18) return 'Ciepło — ławice okonia żerują płyciej. Szukaj przy kamieniach i pomostach.';
      if (wind > 25) return 'Lekki ruch wody pobudza okonie. Dropshot przy dnie będzie skuteczny.';
      return 'Okoń łowi się cały dzień. Próbuj różnych głębokości małymi przynętami.';
    },
    karp: () => {
      if (score >= 70 && temp >= 18) return 'Ciepło i stabilnie — karp aktywnie żeruje. Method feeder z kukurydzą!';
      if (score >= 70) return 'Dobre warunki na karpia. Wieczór z groundbaitem powinien dać efekt.';
      if (temp < 12) return 'Za chłodno na karpia. Jeśli łowisz, postaw na drobne zanęty i cierpliwość.';
      if (pressure === 'malejące') return 'Spadające ciśnienie — karp będzie ostrożny. Mniejsze porcje zanęty.';
      return 'Przeciętne warunki. Łów wieczorem na słodkie przynęty blisko roślinności.';
    },
    sum: () => {
      if (score >= 70 && temp >= 20) return 'Ciepła noc — sum ruszy na żer. Duża ryba na dnie lub pelagicznie!';
      if (score >= 70) return 'Warunki sprzyjają sumowi. Łów nocą z mocnym zestawem przy dnie.';
      if (temp < 15) return 'Za zimno na suma — aktywność minimalna. Poczekaj na cieplejsze noce.';
      return 'Średni dzień na suma. Jeśli próbujesz, łów po zmroku na naturalne przynęty.';
    },
    leszcz: () => {
      if (score >= 70) return 'Stabilne ciśnienie — leszcz żeruje rano. Zanęta z kaszą i robaki.';
      if (temp > 20) return 'Ciepło — leszcz aktywny przy dnie na głębszych stanowiskach.';
      if (wind > 20) return 'Wiatr utrudnia spławik. Spróbuj gruntówki z wędką feederową.';
      return 'Leszcz łowi się najlepiej rano. Zanęta z oparem i cierpliwość.';
    },
    brzana: () => {
      if (score >= 70) return 'Rwący nurt i rosnące ciśnienie — brzana bierze dziś świetnie!';
      if (temp > 20) return 'Ciepło — brzana aktywna w nurcie. Jętka lub larwa na dnie.';
      if (pressure === 'rosnące') return 'Ciśnienie rośnie — brzana chętnie bierze w prądzie. Spróbuj w nurcie.';
      return 'Szukaj brzany w wartkim nurcie. Naturalne przynęty przy dnie.';
    },
    troć: () => {
      if (score >= 70) return 'Chłodno i pochmurno — troć dziś aktywna. Spinning z obrotówką!';
      if (temp > 16) return 'Ciepławo na troć. Łów wczesnym rankiem zanim woda się nagrzeje.';
      if (weather.cloudiness > 70) return 'Zachmurzenie sprzyja troci. Spróbuj wobler lub obrotówkę w nurcie.';
      return 'Przeciętnie na troć. Szukaj jej w chłodniejszych, natlenionych odcinkach rzeki.';
    },
  };

  const fn = tips[species];
  return fn ? fn() : `Ocena: ${score}/100. Sprawdź warunki szczegółowe.`;
}

function getGeneralConditions(weather) {
  const issues = [];
  if (weather.windSpeed > 40) issues.push('Silny wiatr');
  if (weather.pressure < 1000) issues.push('Bardzo niskie ciśnienie');
  if (weather.pressureTrend === 'malejące') issues.push('Spadające ciśnienie (gorsza aktywność)');
  if (weather.pressureTrend === 'rosnące') issues.push('Rosnące ciśnienie (dobra aktywność)');
  return issues.length ? issues : ['Warunki w normie'];
}

function generateSummary(topSpecies, weather, moonData) {
  const lines = [];
  if (topSpecies.overall >= 70) {
    lines.push(`Dziś idealne warunki na ${topSpecies.species}a (${topSpecies.overall}/100).`);
  } else if (topSpecies.overall >= 50) {
    lines.push(`Dobre warunki na ${topSpecies.species}a (${topSpecies.overall}/100).`);
  } else {
    lines.push(`Trudny dzień – najlepsza opcja to ${topSpecies.species} (${topSpecies.overall}/100).`);
  }
  lines.push(`Ciśnienie: ${weather.pressure} hPa (${weather.pressureTrend}).`);
  lines.push(`Księżyc: ${moonData.phaseEmoji} ${moonData.phaseName} (${moonData.illumination}% iluminacji).`);
  return lines.join(' ');
}

module.exports = { calculateFishingScore, SPECIES_PROFILES };
