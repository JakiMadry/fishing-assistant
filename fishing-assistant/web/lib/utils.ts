export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--score-excellent)';
  if (score >= 65) return 'var(--score-good)';
  if (score >= 50) return 'var(--score-average)';
  return 'var(--score-poor)';
}

export function scoreClass(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 65) return 'text-[#8bc34a]';
  if (score >= 50) return 'text-warning';
  return 'text-error';
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function getUserLocation(): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}
