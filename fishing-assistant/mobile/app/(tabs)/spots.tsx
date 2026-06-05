import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors, scoreColor } from '@/constants/Colors';
import { ENDPOINTS } from '@/constants/api';

interface UserSpot {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  description?: string;
  species?: string[];
  techniques?: string[];
  difficulty?: string;
  createdAt: string;
}

interface Catch {
  id: number;
  species: string;
  weight?: number;
  length?: number;
  bait?: string;
  technique?: string;
  catchDate: string;
  note?: string;
}

export default function SpotsScreen() {
  const [spots, setSpots] = useState<UserSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<UserSpot | null>(null);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [catchesLoading, setCatchesLoading] = useState(false);
  const [addCatchVisible, setAddCatchVisible] = useState(false);
  const [enrichedSpot, setEnrichedSpot] = useState<any | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);

  useEffect(() => {
    loadSpots();
  }, []);

  async function loadSpots() {
    setLoading(true);
    try {
      const [userRes, nearbyRes] = await Promise.allSettled([
        axios.get(ENDPOINTS.spotsUser),
        getNearbySpots()
      ]);

      const user = userRes.status === 'fulfilled' ? userRes.value.data.spots || [] : [];
      setSpots(user);
    } catch {
      setSpots([]);
    } finally {
      setLoading(false);
    }
  }

  async function getNearbySpots() {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return { data: { userAdded: [] } };
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return axios.get(ENDPOINTS.spotsNearby, {
      params: { lat: loc.coords.latitude, lon: loc.coords.longitude, radius: 5000 }
    });
  }

  async function openSpot(spot: UserSpot) {
    setSelectedSpot(spot);
    setCatches([]);
    setEnrichedSpot(null);
    loadCatches(spot.id);
    loadEnrichment(spot);
  }

  async function loadCatches(spotId: number) {
    setCatchesLoading(true);
    try {
      const res = await axios.get(`${ENDPOINTS.spotsUser}/${spotId}/catches`);
      setCatches(res.data.catches || []);
    } catch {}
    setCatchesLoading(false);
  }

  async function loadEnrichment(spot: UserSpot) {
    setEnrichLoading(true);
    try {
      const res = await axios.get(ENDPOINTS.spotsEnrich, {
        params: { name: spot.name, type: spot.type, lat: spot.lat, lon: spot.lng }
      });
      setEnrichedSpot(res.data.enriched);
    } catch {}
    setEnrichLoading(false);
  }

  function renderSpotItem({ item }: { item: UserSpot }) {
    return (
      <TouchableOpacity style={styles.spotCard} onPress={() => openSpot(item)}>
        <View style={styles.spotCardLeft}>
          <Text style={styles.spotCardName}>{item.name}</Text>
          <Text style={styles.spotCardType}>{item.type}</Text>
          {item.description && (
            <Text style={styles.spotCardDesc} numberOfLines={2}>{item.description}</Text>
          )}
          {item.species && item.species.length > 0 && (
            <Text style={styles.spotCardSpecies}>{item.species.join(' • ')}</Text>
          )}
        </View>
        <View style={styles.spotCardRight}>
          <Text style={styles.spotCardArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primaryLight} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Łowiska społeczności</Text>
        <Text style={styles.topBarSub}>Dodaj swoje sekrety na mapie (przytrzymaj marker)</Text>
      </View>

      {spots.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>Brak zapisanych łowisk</Text>
          <Text style={styles.emptyText}>
            Otwórz Mapę i przytrzymaj palcem dowolne miejsce, żeby dodać swoje łowisko.
          </Text>
        </View>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSpotItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshing={loading}
          onRefresh={loadSpots}
        />
      )}

      {/* Panel szczegółów spotu */}
      <Modal visible={!!selectedSpot} animationType="slide">
        {selectedSpot && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedSpot(null)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Wróć</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addCatchBtn} onPress={() => setAddCatchVisible(true)}>
                <Text style={styles.addCatchBtnText}>+ Dodaj połów</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSpotName}>{selectedSpot.name}</Text>
              <Text style={styles.modalSpotType}>{selectedSpot.type}</Text>

              {selectedSpot.description && (
                <Text style={styles.modalSpotDesc}>{selectedSpot.description}</Text>
              )}

              {/* AI enrichment */}
              {enrichLoading ? (
                <View style={styles.enrichRow}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                  <Text style={styles.enrichLoadingText}>AI analizuje łowisko...</Text>
                </View>
              ) : enrichedSpot && (
                <View style={styles.enrichCard}>
                  <Text style={styles.enrichCardTitle}>🤖 Analiza AI</Text>
                  {enrichedSpot.description && (
                    <Text style={styles.enrichText}>{enrichedSpot.description}</Text>
                  )}
                  {enrichedSpot.species?.length > 0 && (
                    <Text style={styles.enrichMeta}>🐟 {enrichedSpot.species.join(', ')}</Text>
                  )}
                  {enrichedSpot.techniques?.length > 0 && (
                    <Text style={styles.enrichMeta}>🎣 {enrichedSpot.techniques.join(', ')}</Text>
                  )}
                  {enrichedSpot.tip && (
                    <Text style={styles.enrichTip}>💡 {enrichedSpot.tip}</Text>
                  )}
                </View>
              )}

              {/* Historia połowów */}
              <Text style={styles.catchesTitle}>Historia połowów</Text>
              {catchesLoading ? (
                <ActivityIndicator color={Colors.accent} />
              ) : catches.length === 0 ? (
                <Text style={styles.noCatches}>Brak zapisanych połowów. Dodaj pierwszy!</Text>
              ) : (
                catches.map((c) => (
                  <View key={c.id} style={styles.catchCard}>
                    <View style={styles.catchHeader}>
                      <Text style={styles.catchSpecies}>{c.species}</Text>
                      <Text style={styles.catchDate}>
                        {new Date(c.catchDate).toLocaleDateString('pl-PL')}
                      </Text>
                    </View>
                    <View style={styles.catchDetails}>
                      {c.weight && <Text style={styles.catchDetail}>⚖️ {c.weight} kg</Text>}
                      {c.length && <Text style={styles.catchDetail}>📏 {c.length} cm</Text>}
                      {c.bait && <Text style={styles.catchDetail}>🎣 {c.bait}</Text>}
                      {c.technique && <Text style={styles.catchDetail}>🎯 {c.technique}</Text>}
                    </View>
                    {c.note && <Text style={styles.catchNote}>{c.note}</Text>}
                  </View>
                ))
              )}

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Modal dodawania połowu */}
            <AddCatchModal
              visible={addCatchVisible}
              spotId={selectedSpot.id}
              onClose={() => setAddCatchVisible(false)}
              onAdd={(c) => {
                setCatches(prev => [c, ...prev]);
                setAddCatchVisible(false);
              }}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}

function AddCatchModal({
  visible, spotId, onClose, onAdd
}: {
  visible: boolean;
  spotId: number;
  onClose: () => void;
  onAdd: (c: any) => void;
}) {
  const [species, setSpecies] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [bait, setBait] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!species.trim()) { Alert.alert('Błąd', 'Podaj gatunek'); return; }
    setSaving(true);
    try {
      await axios.post(`${ENDPOINTS.spotsUser}/${spotId}/catch`, {
        species: species.trim(),
        weight: weight ? parseFloat(weight) : null,
        length: length ? parseFloat(length) : null,
        bait: bait.trim() || null,
        note: note.trim() || null,
        catchDate: new Date().toISOString(),
      });
      onAdd({ species, weight, length, bait, note, catchDate: new Date().toISOString() });
      setSpecies(''); setWeight(''); setLength(''); setBait(''); setNote('');
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać połowu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.catchModalOverlay}>
        <View style={styles.catchModalContent}>
          <Text style={styles.catchModalTitle}>🐟 Zapisz połów</Text>
          <TextInput style={styles.catchInput} value={species} onChangeText={setSpecies}
            placeholder="Gatunek (np. sandacz)" placeholderTextColor={Colors.textMuted} />
          <View style={styles.catchRow}>
            <TextInput style={[styles.catchInput, { flex: 1 }]} value={weight} onChangeText={setWeight}
              placeholder="Waga (kg)" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
            <TextInput style={[styles.catchInput, { flex: 1 }]} value={length} onChangeText={setLength}
              placeholder="Długość (cm)" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
          </View>
          <TextInput style={styles.catchInput} value={bait} onChangeText={setBait}
            placeholder="Przynęta" placeholderTextColor={Colors.textMuted} />
          <TextInput style={[styles.catchInput, { height: 70 }]} value={note} onChangeText={setNote}
            placeholder="Notatka" placeholderTextColor={Colors.textMuted} multiline />
          <View style={styles.catchModalBtns}>
            <TouchableOpacity style={styles.catchCancelBtn} onPress={onClose}>
              <Text style={styles.catchCancelText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.catchSaveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.text} />
                : <Text style={styles.catchSaveText}>Zapisz</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  topBar: { padding: 16, borderBottomWidth: 1, borderColor: Colors.border },
  topBarTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold' },
  topBarSub: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },

  spotCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  spotCardLeft: { flex: 1 },
  spotCardName: { color: Colors.text, fontWeight: 'bold', fontSize: 16 },
  spotCardType: { color: Colors.accent, fontSize: 13, marginTop: 2 },
  spotCardDesc: { color: Colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  spotCardSpecies: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  spotCardRight: { paddingLeft: 8 },
  spotCardArrow: { color: Colors.textMuted, fontSize: 22 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderColor: Colors.border,
    paddingTop: 50,
  },
  backBtn: {},
  backBtnText: { color: Colors.primaryLight, fontSize: 16 },
  addCatchBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addCatchBtnText: { color: Colors.text, fontWeight: 'bold' },
  modalContent: { flex: 1, padding: 16 },
  modalSpotName: { color: Colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  modalSpotType: { color: Colors.accent, fontSize: 14, marginBottom: 10 },
  modalSpotDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },

  enrichRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  enrichLoadingText: { color: Colors.textSecondary },
  enrichCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  enrichCardTitle: { color: Colors.accent, fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
  enrichText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  enrichMeta: { color: Colors.text, fontSize: 13, marginBottom: 4 },
  enrichTip: { color: Colors.text, fontSize: 13, fontStyle: 'italic', marginTop: 6 },

  catchesTitle: { color: Colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  noCatches: { color: Colors.textMuted, fontStyle: 'italic' },
  catchCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  catchHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catchSpecies: { color: Colors.text, fontWeight: 'bold', fontSize: 15 },
  catchDate: { color: Colors.textMuted, fontSize: 12 },
  catchDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catchDetail: { color: Colors.textSecondary, fontSize: 13 },
  catchNote: { color: Colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 6 },

  catchModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  catchModalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 10,
  },
  catchModalTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  catchInput: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  catchRow: { flexDirection: 'row', gap: 10 },
  catchModalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  catchCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  catchCancelText: { color: Colors.textSecondary },
  catchSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  catchSaveText: { color: Colors.text, fontWeight: 'bold' },
});
