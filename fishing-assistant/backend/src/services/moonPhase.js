const SunCalc = require('suncalc');

function getMoonData(lat, lon, date = null) {
  const now = date ? new Date(date) : new Date();
  const moonIllum = SunCalc.getMoonIllumination(now);
  const moonPos = SunCalc.getMoonPosition(now, lat, lon);
  const moonTimes = SunCalc.getMoonTimes(now, lat, lon);

  const phase = moonIllum.phase;
  const phaseName = getPhaseName(phase);
  const phaseEmoji = getPhaseEmoji(phase);

  // Godziny aktywności ryb na podstawie pozycji księżyca
  const fishingTimes = getFishingTimes(lat, lon, now);

  return {
    phase,
    phaseName,
    phaseEmoji,
    illumination: Math.round(moonIllum.fraction * 100),
    altitude: Math.round(moonPos.altitude * (180 / Math.PI)),
    moonrise: moonTimes.rise ? formatTime(moonTimes.rise) : null,
    moonset: moonTimes.set ? formatTime(moonTimes.set) : null,
    fishingScore: getMoonFishingScore(phase, moonPos),
    fishingTimes
  };
}

function getPhaseName(phase) {
  if (phase < 0.03 || phase > 0.97) return 'Nów';
  if (phase < 0.22) return 'Sierp rosnący';
  if (phase < 0.28) return 'Pierwsza kwadra';
  if (phase < 0.47) return 'Księżyc przybywający';
  if (phase < 0.53) return 'Pełnia';
  if (phase < 0.72) return 'Księżyc ubywający';
  if (phase < 0.78) return 'Ostatnia kwadra';
  return 'Sierp ubywający';
}

function getPhaseEmoji(phase) {
  const emojis = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  return emojis[Math.round(phase * 8) % 8];
}

function getMoonFishingScore(phase, moonPos) {
  // Pełnia i nów to najlepsze fazy na wędkowanie (2 dni przed i po)
  let score = 0;
  const distFromFull = Math.abs(phase - 0.5);
  const distFromNew = Math.min(phase, 1 - phase);

  if (distFromNew < 0.08) score = 90; // Nów – świetnie
  else if (distFromFull < 0.08) score = 85; // Pełnia – bardzo dobrze
  else if (distFromNew < 0.15 || distFromFull < 0.15) score = 70;
  else score = 55;

  // Księżyc wysoko = lepsze żerowanie nocne
  if (moonPos.altitude > 0.3) score = Math.min(100, score + 10);

  return score;
}

function getFishingTimes(lat, lon, date) {
  // Teoria Solunar – szczyty aktywności ryb gdy księżyc w zenicie/nadirze
  const times = [];
  const moonPos = SunCalc.getMoonPosition(date, lat, lon);

  // Uproszczona implementacja – główny szczyt (transit) i poboczny
  const moonTimes = SunCalc.getMoonTimes(date, lat, lon);
  if (moonTimes.rise) {
    const transitApprox = new Date(moonTimes.rise.getTime() + 6 * 3600 * 1000);
    times.push({ type: 'major', time: formatTime(transitApprox), duration: '2h', label: 'Główny szczyt' });
    const minor = new Date(moonTimes.rise.getTime() + 12 * 3600 * 1000);
    times.push({ type: 'minor', time: formatTime(minor), duration: '1h', label: 'Poboczny szczyt' });
  }

  return times;
}

function formatTime(date) {
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

module.exports = { getMoonData };
