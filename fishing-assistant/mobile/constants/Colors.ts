const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};

// Fishing Assistant color palette
export const Colors = {
  primary: '#1a6b3c',
  primaryLight: '#2d9b5c',
  accent: '#e8b84b',
  accentDark: '#c49a2e',
  water: '#1e6091',
  waterLight: '#3a8fc7',
  background: '#0f1c14',
  surface: '#1a2e1f',
  surfaceLight: '#243829',
  border: '#2d4a35',
  text: '#e8f5e9',
  textSecondary: '#8ba888',
  textMuted: '#5a7a5e',
  error: '#cf4444',
  success: '#4caf50',
  warning: '#ff9800',
  scoreExcellent: '#4caf50',
  scoreGood: '#8bc34a',
  scoreAverage: '#ffc107',
  scorePoor: '#f44336',
};

export function scoreColor(score: number): string {
  if (score >= 80) return Colors.scoreExcellent;
  if (score >= 65) return Colors.scoreGood;
  if (score >= 50) return Colors.scoreAverage;
  return Colors.scorePoor;
}
