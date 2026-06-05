import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Modal, ScrollView, TextInput, Alert
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { ENDPOINTS } from '@/constants/api';

interface OsmSpot {
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  distanceKm: number | null;
  tags: { fishing?: string; maxdepth?: string };
}

interface EnrichedSpot {
  species: string[];
  bestSeasons: string[];
  techniques: string[];
  difficulty: string;
  description: string;
  tip: string;
}

interface SelectedSpot extends OsmSpot {
  enriched?: EnrichedSpot | null;
  loading?: boolean;
}

export default function MapScreen() {
  const [osmSpots, setOsmSpots] = useState<OsmSpot[]>([]);
  const [userSpots, setUserSpots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SelectedSpot | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addSpotVisible, setAddSpotVisible] = useState(false);
  const [newSpotCoords, setNewSpotCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 52.2297,
    longitude: 21.0122,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    initLocation();
    loadUserSpots();
  }, []);

  async function initLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
      };
      setRegion(newRegion);
      loadNearbySpots(loc.coords.latitude, loc.coords.longitude);
    } else {
      setMapLoading(false);
    }
  }

  async function loadNearbySpots(lat: number, lon: number) {
    setMapLoading(true);
    try {
      const res = await axios.get(ENDPOINTS.spotsNearby, {
        params: { lat, lon, radius: 20000 }
      });
      setOsmSpots(res.data.osm || []);
    } catch (e) {
      // silent – mapa działa bez spotów
    } finally {
      setMapLoading(false);
    }
  }

  async function loadUserSpots() {
    try {
      const res = await axios.get(ENDPOINTS.spotsUser);
      setUserSpots(res.data.spots || []);
    } catch {}
  }

  async function handleMarkerPress(spot: OsmSpot) {
    setSelectedSpot({ ...spot, loading: true });
    try {
      const res = await axios.get(ENDPOINTS.spotsEnrich, {
        params: { name: spot.name, type: spot.type, lat: spot.lat, lon: spot.lng }
      });
      setSelectedSpot(prev => prev ? { ...prev, enriched: res.data.enriched, loading: false } : null);
    } catch {
      setSelectedSpot(prev => prev ? { ...prev, enriched: null, loading: false } : null);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await axios.get(ENDPOINTS.spotsSearch, { params: { q: searchQuery } });
      setSearchResults(res.data.results || []);
      if (res.data.results?.length > 0) {
        const first = res.data.results[0];
        const newRegion = {
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 800);
        loadNearbySpots(first.lat, first.lng);
      }
    } catch {
      Alert.alert('Błąd', 'Nie można wyszukać łowiska');
    } finally {
      setSearchLoading(false);
    }
  }

  function handleMapLongPress(e: any) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setNewSpotCoords({ lat: latitude, lng: longitude });
    setAddSpotVisible(true);
  }

  function getMarkerColor(type: string): string {
    if (type === 'rzeka') return Colors.water;
    if (type === 'jezioro') return Colors.primaryLight;
    if (type === 'zbiornik') return Colors.primary;
    if (type === 'łowisko komercyjne') return Colors.accent;
    return Colors.textMuted;
  }

  return (
    <View style={styles.container}>
      {/* Pasek wyszukiwania */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholder="Szukaj jeziora, rzeki, zbiornika..."
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searchLoading}>
          {searchLoading
            ? <ActivityIndicator size="small" color={Colors.text} />
            : <Text style={styles.searchBtnText}>🔍</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={(r) => {
          setRegion(r);
          // Ładuj nowe spoty gdy user przemieszcza mapę
          if (Math.abs(r.latitudeDelta) < 1) {
            loadNearbySpots(r.latitude, r.longitude);
          }
        }}
        onLongPress={handleMapLongPress}
        mapType="hybrid"
      >
        {/* Spoty z OSM */}
        {osmSpots.map((spot) => (
          <Marker
            key={`osm-${spot.osmId}`}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            pinColor={getMarkerColor(spot.type)}
            onPress={() => handleMarkerPress(spot)}
          >
            <Callout tooltip={false}>
              <Text style={{ fontWeight: 'bold', minWidth: 120 }}>{spot.name}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>{spot.type}</Text>
              {spot.distanceKm && <Text style={{ color: '#666', fontSize: 12 }}>{spot.distanceKm} km</Text>}
            </Callout>
          </Marker>
        ))}

        {/* User-added spots */}
        {userSpots.map((spot) => (
          <Marker
            key={`user-${spot.id}`}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            pinColor={Colors.accent}
          >
            <Callout>
              <Text style={{ fontWeight: 'bold' }}>⭐ {spot.name}</Text>
              <Text style={{ color: '#666', fontSize: 12 }}>Dodane przez społeczność</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Loading overlay */}
      {mapLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.accent} />
          <Text style={styles.loadingText}>Pobieranie łowisk z OSM...</Text>
        </View>
      )}

      {/* Legenda */}
      <View style={styles.legend}>
        <LegendItem color={Colors.water} label="Rzeka" />
        <LegendItem color={Colors.primaryLight} label="Jezioro" />
        <LegendItem color={Colors.primary} label="Zbiornik" />
        <LegendItem color={Colors.accent} label="Dodane" />
      </View>

      {/* Panel szczegółów łowiska */}
      {selectedSpot && (
        <View style={styles.spotPanel}>
          <TouchableOpacity style={styles.closePanelBtn} onPress={() => setSelectedSpot(null)}>
            <Text style={styles.closePanelText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.spotPanelName}>{selectedSpot.name}</Text>
          <Text style={styles.spotPanelType}>{selectedSpot.type}</Text>

          {selectedSpot.loading ? (
            <View style={styles.enrichLoading}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.enrichLoadingText}>AI analizuje łowisko...</Text>
            </View>
          ) : selectedSpot.enriched ? (
            <ScrollView style={styles.enrichedContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.enrichDesc}>{selectedSpot.enriched.description}</Text>
              {selectedSpot.enriched.species?.length > 0 && (
                <View style={styles.enrichSection}>
                  <Text style={styles.enrichLabel}>🐟 Gatunki</Text>
                  <Text style={styles.enrichValue}>{selectedSpot.enriched.species.join(', ')}</Text>
                </View>
              )}
              {selectedSpot.enriched.techniques?.length > 0 && (
                <View style={styles.enrichSection}>
                  <Text style={styles.enrichLabel}>🎣 Techniki</Text>
                  <Text style={styles.enrichValue}>{selectedSpot.enriched.techniques.join(', ')}</Text>
                </View>
              )}
              {selectedSpot.enriched.bestSeasons?.length > 0 && (
                <View style={styles.enrichSection}>
                  <Text style={styles.enrichLabel}>📅 Najlepszy sezon</Text>
                  <Text style={styles.enrichValue}>{selectedSpot.enriched.bestSeasons.join(', ')}</Text>
                </View>
              )}
              {selectedSpot.enriched.tip && (
                <View style={[styles.enrichSection, styles.tipBox]}>
                  <Text style={styles.tipText}>💡 {selectedSpot.enriched.tip}</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <Text style={styles.enrichError}>Nie udało się pobrać info o łowisku</Text>
          )}
        </View>
      )}

      {/* Modal dodawania spotu */}
      <AddSpotModal
        visible={addSpotVisible}
        coords={newSpotCoords}
        onClose={() => setAddSpotVisible(false)}
        onAdd={(spot) => {
          setUserSpots(prev => [...prev, spot]);
          setAddSpotVisible(false);
        }}
      />
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function AddSpotModal({
  visible, coords, onClose, onAdd
}: {
  visible: boolean;
  coords: { lat: number; lng: number } | null;
  onClose: () => void;
  onAdd: (spot: any) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('jezioro');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !coords) return;
    setSaving(true);
    try {
      const res = await axios.post(ENDPOINTS.spotsUser, {
        name: name.trim(),
        description: description.trim(),
        lat: coords.lat,
        lng: coords.lng,
        type,
        isPublic: true,
      });
      onAdd(res.data.spot);
      setName('');
      setDescription('');
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać łowiska');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Dodaj łowisko</Text>
          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={setName}
            placeholder="Nazwa łowiska"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.modalInput, { height: 80 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Opis (opcjonalnie)"
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
              <Text style={styles.modalCancelText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.text} />
                : <Text style={styles.modalSaveText}>Zapisz</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  searchBar: {
    position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10,
    flexDirection: 'row', gap: 8,
  },
  searchInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, fontSize: 14,
  },
  searchBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
  },
  searchBtnText: { fontSize: 18 },

  loadingOverlay: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    backgroundColor: Colors.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    flexDirection: 'row', gap: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },

  legend: {
    position: 'absolute', top: 70, right: 10, zIndex: 10,
    backgroundColor: Colors.surface, borderRadius: 10,
    padding: 8, gap: 4, borderWidth: 1, borderColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: Colors.textSecondary, fontSize: 11 },

  spotPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '50%',
    borderTopWidth: 1, borderColor: Colors.border,
  },
  closePanelBtn: {
    position: 'absolute', top: 12, right: 16,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center',
  },
  closePanelText: { color: Colors.textSecondary, fontWeight: 'bold' },
  spotPanelName: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4, paddingRight: 40 },
  spotPanelType: { color: Colors.accent, fontSize: 13, marginBottom: 12 },
  enrichLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  enrichLoadingText: { color: Colors.textSecondary },
  enrichedContent: { maxHeight: 200 },
  enrichDesc: { color: Colors.textSecondary, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  enrichSection: { marginBottom: 8 },
  enrichLabel: { color: Colors.textMuted, fontSize: 12, marginBottom: 2 },
  enrichValue: { color: Colors.text, fontSize: 14 },
  tipBox: { backgroundColor: Colors.surfaceLight, borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: Colors.accent },
  tipText: { color: Colors.text, fontSize: 13, lineHeight: 20 },
  enrichError: { color: Colors.textMuted, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 12,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalInput: {
    backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary },
  modalSaveBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  modalSaveText: { color: Colors.text, fontWeight: 'bold' },
});
