import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { ENDPOINTS } from '@/constants/api';

interface BaitRecommendation {
  bait: string;
  type: string;
  color: string;
  size: string;
  technique: string;
  depth: string;
  confidence: number;
  reason: string;
}

interface AdviceResult {
  species: string;
  location: string;
  month: string;
  recommendations: BaitRecommendation[];
  spots: string;
  timing: string;
  waterTemp: string;
  conditions: string;
  tips: string[];
  warningIfAny?: string;
}

const QUICK_QUERIES = [
  'Wisła, sandacz, czerwiec',
  'Jezioro Śniardwy, szczupak, wrzesień',
  'Odra, sum, lipiec',
  'Bug, brzana, maj',
  'Zbiornik, karp, sierpień',
  'Dunajec, pstrąg, kwiecień',
];

export default function AdvisorScreen() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function ask(q?: string) {
    const queryToSend = (q || query).trim();
    if (!queryToSend) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Opcjonalnie dołącz GPS
      let lat: number | undefined;
      let lon: number | undefined;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch {}

      const res = await axios.post(ENDPOINTS.advisorBait, { query: queryToSend, lat, lon });
      setResult(res.data.advice);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } catch (e: any) {
      setError('Nie udało się pobrać rekomendacji. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickQuery(q: string) {
    setQuery(q);
    ask(q);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView ref={scrollRef} style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Nagłówek */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🤖 AI Doradca Wędkarski</Text>
          <Text style={styles.headerSub}>
            Wpisz gatunek, łowisko i miesiąc. Otrzymasz szczegółowe rekomendacje przynęt.
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder='np. "Wisła, sandacz, listopad"'
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={() => ask()}
            returnKeyType="go"
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.askBtn, loading && { opacity: 0.6 }]}
            onPress={() => ask()}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={Colors.text} />
              : <Text style={styles.askBtnText}>Zapytaj</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Quick queries */}
        {!result && !loading && (
          <View style={styles.quickSection}>
            <Text style={styles.quickTitle}>Szybkie zapytania:</Text>
            <View style={styles.quickGrid}>
              {QUICK_QUERIES.map((q) => (
                <TouchableOpacity key={q} style={styles.quickChip} onPress={() => handleQuickQuery(q)}>
                  <Text style={styles.quickChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Claude analizuje warunki...</Text>
            <Text style={styles.loadingSubText}>To może potrwać chwilę</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Wyniki */}
        {result && (
          <View style={styles.resultsContainer}>
            {/* Nagłówek wyników */}
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>
                {result.species} • {result.location}
              </Text>
              <Text style={styles.resultSubtitle}>{result.month}</Text>
            </View>

            {/* Ostrzeżenie */}
            {result.warningIfAny && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ {result.warningIfAny}</Text>
              </View>
            )}

            {/* Rekomendacje przynęt */}
            <Text style={styles.sectionTitle}>🎣 Rekomendowane przynęty</Text>
            {result.recommendations.map((rec, i) => (
              <View key={i} style={styles.baitCard}>
                <View style={styles.baitHeader}>
                  <View>
                    <Text style={styles.baitName}>{rec.bait}</Text>
                    <Text style={styles.baitType}>{rec.type}</Text>
                  </View>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>{rec.confidence}%</Text>
                  </View>
                </View>

                <View style={styles.baitDetails}>
                  <BaitDetail icon="🎨" label="Kolor" value={rec.color} />
                  <BaitDetail icon="📏" label="Rozmiar" value={rec.size} />
                  <BaitDetail icon="🌊" label="Głębokość" value={rec.depth} />
                </View>

                <View style={styles.techniqueBox}>
                  <Text style={styles.techniqueLabel}>Prowadzenie:</Text>
                  <Text style={styles.techniqueText}>{rec.technique}</Text>
                </View>

                <Text style={styles.baitReason}>💡 {rec.reason}</Text>
              </View>
            ))}

            {/* Gdzie szukać ryb */}
            {result.spots && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>📍 Gdzie szukać ryb</Text>
                <Text style={styles.infoCardText}>{result.spots}</Text>
              </View>
            )}

            {/* Timing */}
            {result.timing && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>⏰ Najlepsze godziny</Text>
                <Text style={styles.infoCardText}>{result.timing}</Text>
              </View>
            )}

            {/* Temperatura wody */}
            {result.waterTemp && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>🌡️ Temperatura wody</Text>
                <Text style={styles.infoCardText}>{result.waterTemp}</Text>
              </View>
            )}

            {/* Warunki */}
            {result.conditions && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>🌤️ Optymalne warunki</Text>
                <Text style={styles.infoCardText}>{result.conditions}</Text>
              </View>
            )}

            {/* Porady */}
            {result.tips?.length > 0 && (
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>Pro tips</Text>
                {result.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>▸</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Nowe zapytanie */}
            <TouchableOpacity style={styles.newQueryBtn} onPress={() => { setResult(null); setQuery(''); }}>
              <Text style={styles.newQueryText}>Nowe zapytanie</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BaitDetail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.baitDetailItem}>
      <Text style={styles.baitDetailIcon}>{icon}</Text>
      <View>
        <Text style={styles.baitDetailLabel}>{label}</Text>
        <Text style={styles.baitDetailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { color: Colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  headerSub: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },

  inputRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15,
  },
  askBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
    minWidth: 80,
  },
  askBtnText: { color: Colors.text, fontWeight: 'bold', fontSize: 15 },

  quickSection: { paddingHorizontal: 16 },
  quickTitle: { color: Colors.textMuted, fontSize: 13, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    backgroundColor: Colors.surfaceLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickChipText: { color: Colors.textSecondary, fontSize: 13 },

  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  loadingSubText: { color: Colors.textMuted, fontSize: 13 },

  errorBox: {
    margin: 16, backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { color: Colors.error, fontSize: 14, lineHeight: 20 },

  resultsContainer: { paddingHorizontal: 16 },
  resultHeader: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  resultTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
  resultSubtitle: { color: Colors.accent, fontSize: 14, marginTop: 4 },

  warningBox: {
    backgroundColor: '#3a2200', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.warning,
  },
  warningText: { color: Colors.warning, fontSize: 14, lineHeight: 20 },

  sectionTitle: { color: Colors.accent, fontWeight: 'bold', fontSize: 16, marginBottom: 10 },

  baitCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  baitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  baitName: { color: Colors.text, fontSize: 17, fontWeight: 'bold' },
  baitType: { color: Colors.accent, fontSize: 13, marginTop: 2 },
  confidenceBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  confidenceText: { color: Colors.text, fontWeight: 'bold', fontSize: 13 },

  baitDetails: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  baitDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  baitDetailIcon: { fontSize: 18 },
  baitDetailLabel: { color: Colors.textMuted, fontSize: 10 },
  baitDetailValue: { color: Colors.text, fontSize: 13, fontWeight: '500' },

  techniqueBox: {
    backgroundColor: Colors.surfaceLight, borderRadius: 8, padding: 10, marginBottom: 10,
  },
  techniqueLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  techniqueText: { color: Colors.text, fontSize: 13, lineHeight: 18 },

  baitReason: { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  infoCardTitle: { color: Colors.accent, fontWeight: 'bold', fontSize: 14, marginBottom: 6 },
  infoCardText: { color: Colors.text, fontSize: 14, lineHeight: 20 },

  tipsCard: {
    backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  tipsTitle: { color: Colors.text, fontWeight: 'bold', fontSize: 15, marginBottom: 10 },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  tipBullet: { color: Colors.accent, fontSize: 14, marginTop: 2 },
  tipText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, flex: 1 },

  newQueryBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  newQueryText: { color: Colors.text, fontWeight: 'bold', fontSize: 16 },
});
