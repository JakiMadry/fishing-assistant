import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors, scoreColor } from '@/constants/Colors';
import { ENDPOINTS } from '@/constants/api';

interface ConditionsData {
  weather: {
    temperature: number;
    feelsLike: number;
    pressure: number;
    pressureTrend: string;
    windSpeed: number;
    humidity: number;
    cloudiness: number;
    description: string;
    forecast3h: Array<{ time: string; temp: number; pressure: number; description: string }>;
  };
  moon: {
    phaseName: string;
    phaseEmoji: string;
    illumination: number;
    moonrise: string | null;
    moonset: string | null;
    fishingTimes: Array<{ type: string; time: string; duration: string; label: string }>;
  };
  fishing: {
    overall: number;
    summary: string;
    topSpecies: Array<{ species: string; overall: number; rating: string; tip: string }>;
    generalConditions: string[];
  };
}

function WeatherCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.weatherCell}>
      <Text style={styles.weatherCellIcon}>{icon}</Text>
      <Text style={styles.weatherCellValue}>{value}</Text>
      <Text style={styles.weatherCellLabel}>{label}</Text>
    </View>
  );
}

export default function ConditionsScreen() {
  const [data, setData] = useState<ConditionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  const fetchConditions = useCallback(async (lat: number, lon: number) => {
    try {
      setError(null);
      const res = await axios.get(ENDPOINTS.conditions, { params: { lat, lon } });
      setData(res.data);
    } catch {
      setError('Nie można pobrać warunków. Sprawdź połączenie z internetem i czy backend działa.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak GPS', 'Włącz lokalizację aby zobaczyć warunki dla Twojej okolicy.');
      setLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
    setLocation(coords);
    fetchConditions(coords.lat, coords.lon);
  }, [fetchConditions]);

  useEffect(() => { getLocation(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (location) fetchConditions(location.lat, location.lon);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primaryLight} />
        <Text style={styles.loadingText}>Pobieranie warunków wędkarskich...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Brak danych'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={getLocation}>
          <Text style={styles.retryBtnText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { weather, moon, fishing } = data;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {/* Główna ocena */}
      <View style={[styles.scoreCard, { borderColor: scoreColor(fishing.overall) }]}>
        <Text style={styles.scoreLabel}>Szanse na branie dziś</Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNumber, { color: scoreColor(fishing.overall) }]}>{fishing.overall}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <Text style={styles.scoreSummary}>{fishing.summary}</Text>
      </View>

      {/* Pogoda */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌤️ Pogoda</Text>
        <View style={styles.weatherGrid}>
          <WeatherCell icon="🌡️" label="Temperatura" value={`${weather.temperature}°C`} />
          <WeatherCell icon="📊" label="Ciśnienie" value={`${weather.pressure} hPa`} />
          <WeatherCell icon="💨" label="Wiatr" value={`${weather.windSpeed} km/h`} />
          <WeatherCell icon="💧" label="Wilgotność" value={`${weather.humidity}%`} />
          <WeatherCell icon="☁️" label="Zachmurzenie" value={`${weather.cloudiness}%`} />
          <WeatherCell
            icon={weather.pressureTrend === 'rosnące' ? '📈' : weather.pressureTrend === 'malejące' ? '📉' : '➡️'}
            label="Trend"
            value={weather.pressureTrend}
          />
        </View>
        <Text style={styles.weatherDesc}>{weather.description}</Text>
      </View>

      {/* Księżyc */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌙 Księżyc</Text>
        <View style={styles.moonRow}>
          <Text style={styles.moonEmoji}>{moon.phaseEmoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.moonPhase}>{moon.phaseName}</Text>
            <Text style={styles.moonDetail}>Iluminacja: {moon.illumination}%</Text>
            {moon.moonrise && <Text style={styles.moonDetail}>Wschód: {moon.moonrise}</Text>}
            {moon.moonset && <Text style={styles.moonDetail}>Zachód: {moon.moonset}</Text>}
          </View>
        </View>
        {moon.fishingTimes.length > 0 && (
          <View style={styles.fishingTimesBox}>
            <Text style={styles.fishingTimesTitle}>Szczyty aktywności ryb (Solunar)</Text>
            {moon.fishingTimes.map((ft, i) => (
              <View key={i} style={styles.fishingTimeRow}>
                <Text style={[styles.fishingTimeBadge, ft.type === 'major' ? styles.majorBadge : styles.minorBadge]}>
                  {ft.type === 'major' ? 'GŁÓWNY' : 'POBOCZNY'}
                </Text>
                <Text style={styles.fishingTimeText}>{ft.time} ({ft.duration})</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Top gatunki */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏆 Najlepsze gatunki dziś</Text>
        {fishing.topSpecies.map((s, i) => (
          <View key={s.species} style={styles.speciesRow}>
            <View style={[styles.speciesRank, i === 0 && { backgroundColor: Colors.accent }]}>
              <Text style={[styles.speciesRankText, i === 0 && { color: '#000' }]}>#{i + 1}</Text>
            </View>
            <View style={styles.speciesInfo}>
              <Text style={styles.speciesName}>
                {s.species.charAt(0).toUpperCase() + s.species.slice(1)}
              </Text>
              <Text style={styles.speciesTip}>{s.tip}</Text>
            </View>
            <View style={[styles.speciesScoreBox, { borderColor: scoreColor(s.overall) }]}>
              <Text style={[styles.speciesScoreNum, { color: scoreColor(s.overall) }]}>{s.overall}</Text>
              <Text style={styles.speciesRating}>{s.rating}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Prognoza */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏱️ Prognoza godzinowa</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {weather.forecast3h.map((f, i) => (
            <View key={i} style={styles.forecastCell}>
              <Text style={styles.forecastTime}>{f.time}</Text>
              <Text style={styles.forecastTemp}>{f.temp}°C</Text>
              <Text style={styles.forecastPressure}>{f.pressure} hPa</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: 12 },
  loadingText: { color: Colors.textSecondary, marginTop: 12 },
  errorText: { color: Colors.error, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: Colors.text, fontWeight: 'bold' },

  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16, borderWidth: 2,
  },
  scoreLabel: { color: Colors.textSecondary, fontSize: 14, marginBottom: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  scoreNumber: { fontSize: 72, fontWeight: 'bold', lineHeight: 80 },
  scoreMax: { color: Colors.textMuted, fontSize: 18, marginBottom: 10 },
  scoreSummary: { color: Colors.textSecondary, textAlign: 'center', marginTop: 8, fontSize: 13 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { color: Colors.accent, fontWeight: 'bold', fontSize: 16, marginBottom: 12 },

  weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weatherCell: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 10,
    alignItems: 'center', width: '30%',
  },
  weatherCellIcon: { fontSize: 20 },
  weatherCellValue: { color: Colors.text, fontWeight: 'bold', fontSize: 14, marginTop: 4 },
  weatherCellLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  weatherDesc: { color: Colors.textSecondary, marginTop: 12, fontStyle: 'italic', textTransform: 'capitalize' },

  moonRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  moonEmoji: { fontSize: 48 },
  moonPhase: { color: Colors.text, fontWeight: 'bold', fontSize: 16 },
  moonDetail: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  fishingTimesBox: { marginTop: 12, backgroundColor: Colors.surfaceLight, borderRadius: 8, padding: 10 },
  fishingTimesTitle: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  fishingTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  fishingTimeBadge: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  majorBadge: { backgroundColor: Colors.accent, color: '#000' },
  minorBadge: { backgroundColor: Colors.border, color: Colors.textSecondary },
  fishingTimeText: { color: Colors.text, fontSize: 13 },

  speciesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  speciesRank: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  speciesRankText: { color: Colors.text, fontWeight: 'bold' },
  speciesInfo: { flex: 1 },
  speciesName: { color: Colors.text, fontWeight: 'bold', fontSize: 15 },
  speciesTip: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  speciesScoreBox: { alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 6 },
  speciesScoreNum: { fontWeight: 'bold', fontSize: 20 },
  speciesRating: { color: Colors.textMuted, fontSize: 10 },

  forecastCell: {
    backgroundColor: Colors.surfaceLight, borderRadius: 8, padding: 10,
    alignItems: 'center', marginRight: 8, minWidth: 70,
  },
  forecastTime: { color: Colors.textMuted, fontSize: 12 },
  forecastTemp: { color: Colors.text, fontWeight: 'bold', fontSize: 16, marginVertical: 4 },
  forecastPressure: { color: Colors.textSecondary, fontSize: 11 },
});
