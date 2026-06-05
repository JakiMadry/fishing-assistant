import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { ENDPOINTS } from '@/constants/api';

export default function MapWebScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [enriched, setEnriched] = useState<any>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(ENDPOINTS.spotsSearch, { params: { q: query } });
      setResults(res.data.results || []);
    } catch {}
    setLoading(false);
  }

  async function selectSpot(spot: any) {
    setSelected(spot);
    setEnriched(null);
    setEnrichLoading(true);
    try {
      const res = await axios.get(ENDPOINTS.spotsEnrich, {
        params: { name: spot.name, type: spot.type, lat: spot.lat, lon: spot.lng }
      });
      setEnriched(res.data.enriched);
    } catch {}
    setEnrichLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>🗺️ Pełna mapa dostępna w aplikacji mobilnej (Expo Go). Tu możesz szukać łowisk po nazwie.</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Szukaj: Wisła, Śniardwy, Zalew..."
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={search}
        />
        <TouchableOpacity style={styles.btn} onPress={search}>
          {loading ? <ActivityIndicator size="small" color={Colors.text} /> : <Text style={styles.btnText}>Szukaj</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ScrollView style={styles.list}>
          {results.map((r, i) => (
            <TouchableOpacity key={i} style={[styles.resultItem, selected?.osmId === r.osmId && styles.selectedItem]} onPress={() => selectSpot(r)}>
              <Text style={styles.resultName}>{r.name}</Text>
              <Text style={styles.resultType}>{r.type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selected && (
          <View style={styles.detail}>
            <Text style={styles.detailName}>{selected.name}</Text>
            <Text style={styles.detailType}>{selected.type}</Text>
            {enrichLoading ? (
              <View style={styles.enrichRow}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.enrichLoadingText}>AI analizuje łowisko...</Text>
              </View>
            ) : enriched ? (
              <>
                <Text style={styles.enrichDesc}>{enriched.description}</Text>
                {enriched.species?.length > 0 && <Text style={styles.enrichMeta}>🐟 {enriched.species.join(', ')}</Text>}
                {enriched.techniques?.length > 0 && <Text style={styles.enrichMeta}>🎣 {enriched.techniques.join(', ')}</Text>}
                {enriched.bestSeasons?.length > 0 && <Text style={styles.enrichMeta}>📅 {enriched.bestSeasons.join(', ')}</Text>}
                {enriched.tip && <Text style={styles.enrichTip}>💡 {enriched.tip}</Text>}
              </>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  notice: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  noticeText: { color: Colors.textSecondary, fontSize: 13 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  btn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  btnText: { color: Colors.text, fontWeight: 'bold' },
  content: { flex: 1, flexDirection: 'row', gap: 16 },
  list: { flex: 1 },
  resultItem: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  selectedItem: { borderColor: Colors.accent },
  resultName: { color: Colors.text, fontWeight: 'bold', fontSize: 15 },
  resultType: { color: Colors.accent, fontSize: 13, marginTop: 2 },
  detail: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border },
  detailName: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  detailType: { color: Colors.accent, fontSize: 13, marginBottom: 12 },
  enrichRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  enrichLoadingText: { color: Colors.textSecondary },
  enrichDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  enrichMeta: { color: Colors.text, fontSize: 14, marginBottom: 4 },
  enrichTip: { color: Colors.text, fontStyle: 'italic', fontSize: 13, marginTop: 8, padding: 10, backgroundColor: Colors.surfaceLight, borderRadius: 8 },
});
