import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  MapPin,
  Navigation,
  Check,
  Search,
  X,
  Layers,
  Store,
  Plus,
  Minus,
  Edit3,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import {
  geocodingService,
  GeocodedAddress,
  SearchPlaceResult,
} from '@/services/geocoding-service';
import { Button } from '@/components/ui/Button';

// Default fallback coordinates (Rajkot, Gujarat)
const DEFAULT_LAT = 22.3039;
const DEFAULT_LNG = 70.8022;

/** Haversine distance in metres */
function distMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface LocationPickerModalProps {
  visible: boolean;
  initialCoords?: { lat: number; lng: number } | null;
  initialShopName?: string;
  onClose: () => void;
  onConfirm: (location: GeocodedAddress) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialCoords,
  initialShopName,
  onClose,
  onConfirm,
}) => {
  // ── Map state ────────────────────────────────────────────────────────────
  const [currentCoords, setCurrentCoords] = useState({
    lat: initialCoords?.lat || DEFAULT_LAT,
    lng: initialCoords?.lng || DEFAULT_LNG,
  });
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchPlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Anchored search result ───────────────────────────────────────────────
  // When user selects a search result, we "anchor" the shop name so it is
  // preserved when the pin is moved within 200m of that place.
  const searchAnchor = useRef<{
    lat: number;
    lng: number;
    shopName: string;
  } | null>(null);

  // ── Address fields (auto-fetched) ────────────────────────────────────────
  const [shopName, setShopName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');

  // ── Manual-only field ────────────────────────────────────────────────────
  const [shopNumber, setShopNumber] = useState('');

  // ── UI toggles ───────────────────────────────────────────────────────────
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const nativeMapRef = useRef<any>(null);
  const webIframeRef = useRef<any>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeReady = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // Core: reverse-geocode the pin location and update address fields
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchAddress = useCallback(
    async (lat: number, lng: number) => {
      setLoadingAddress(true);
      try {
        // Determine whether to preserve a previously-searched shop name
        let preservedName: string | undefined;
        if (searchAnchor.current) {
          const d = distMetres(
            lat,
            lng,
            searchAnchor.current.lat,
            searchAnchor.current.lng
          );
          if (d <= 200) {
            preservedName = searchAnchor.current.shopName;
          } else {
            searchAnchor.current = null; // moved too far
          }
        }

        const result = await geocodingService.reverseGeocode(
          lat,
          lng,
          preservedName
        );

        // Update auto-fetched fields.
        // shopNumber is NEVER touched here — it is manual only.
        setShopName(result.shopName);
        setBuildingName(result.buildingName);
        setStreet(result.street);
        setArea(result.area);
        setCity(result.city);
        setStateName(result.state);
        setPincode(result.pincode);
        setFormattedAddress(result.formattedAddress);
      } catch (err) {
        console.warn('[LocationPicker] geocoding error:', err);
      } finally {
        setLoadingAddress(false);
      }
    },
    []
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Fly the map to a location
  // ═══════════════════════════════════════════════════════════════════════════
  const flyToLocation = useCallback(
    (lat: number, lng: number, zoom = 17) => {
      setCurrentCoords({ lat, lng });

      if (Platform.OS === 'web' && iframeReady.current) {
        webIframeRef.current?.contentWindow?.postMessage(
          { type: 'FLY_TO', lat, lng, zoom },
          '*'
        );
      } else if (nativeMapRef.current?.animateToRegion) {
        nativeMapRef.current.animateToRegion(
          { latitude: lat, longitude: lng, latitudeDelta: 0.003, longitudeDelta: 0.003 },
          700
        );
      }

      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeTimer.current = setTimeout(() => fetchAddress(lat, lng), 350);
    },
    [fetchAddress]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-detect live device GPS
  // ═══════════════════════════════════════════════════════════════════════════
  const obtainDeviceGps = useCallback(async () => {
    setLocatingUser(true);

    // Web: use browser Geolocation API
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          flyToLocation(pos.coords.latitude, pos.coords.longitude, 17);
          setLocatingUser(false);
        },
        async () => {
          // Fall back to expo-location
          await expoLocationFallback();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
      return;
    }

    await expoLocationFallback();

    async function expoLocationFallback() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          flyToLocation(pos.coords.latitude, pos.coords.longitude, 17);
        }
      } catch (err) {
        console.warn('[LocationPicker] GPS error:', err);
      } finally {
        setLocatingUser(false);
      }
    }
  }, [flyToLocation]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Modal open: initialise map position
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!visible) return;

    // Reset state for a fresh open
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setIsEditingDetails(false);
    setShopNumber('');
    searchAnchor.current = null;

    if (initialShopName) setShopName(initialShopName);

    const hasInitial =
      initialCoords &&
      (initialCoords.lat !== DEFAULT_LAT || initialCoords.lng !== DEFAULT_LNG);

    if (hasInitial) {
      setCurrentCoords(initialCoords!);
      fetchAddress(initialCoords!.lat, initialCoords!.lng);
      if (Platform.OS === 'web') {
        setTimeout(() => {
          webIframeRef.current?.contentWindow?.postMessage(
            { type: 'FLY_TO', lat: initialCoords!.lat, lng: initialCoords!.lng, zoom: 17 },
            '*'
          );
        }, 600);
      }
    } else {
      obtainDeviceGps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Web iframe ↔ React bridge (map pan/settle messages)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handler = (event: MessageEvent) => {
      const d = event.data;
      if (!d || typeof d !== 'object') return;

      if (d.type === 'IFRAME_READY') {
        iframeReady.current = true;
      } else if (d.type === 'MAP_MOVE') {
        setIsMapMoving(true);
        setCurrentCoords({ lat: d.lat, lng: d.lng });
        if (moveTimer.current) clearTimeout(moveTimer.current);
        moveTimer.current = setTimeout(() => setIsMapMoving(false), 250);
      } else if (d.type === 'MAP_SETTLE') {
        setIsMapMoving(false);
        setCurrentCoords({ lat: d.lat, lng: d.lng });
        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        geocodeTimer.current = setTimeout(() => fetchAddress(d.lat, d.lng), 250);
      }
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      iframeReady.current = false;
    };
  }, [fetchAddress]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Search
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setSearchError('');

    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const results = await geocodingService.searchPlaces(text);
        setSearchResults(results);
        if (results.length === 0) {
          setSearchError('No results found. Try a different shop name or area.');
        }
      } catch {
        setSearchError('Search failed. Check your internet connection.');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setSearching(false);
  }, []);

  const handleSelectSearchResult = useCallback(
    (item: SearchPlaceResult) => {
      // 1. Close search
      setSearchQuery('');
      setSearchResults([]);
      setSearchError('');

      // 2. Anchor the shop name so it's preserved on pin adjustment
      searchAnchor.current = {
        lat: item.latitude,
        lng: item.longitude,
        shopName: item.shopName || item.title,
      };

      // 3. Populate address fields from the structured search result
      setShopName(item.shopName || item.title);
      setBuildingName(item.buildingName || '');
      setStreet(item.street || '');
      setArea(item.area || '');
      setCity(item.city || '');
      setStateName(item.state || '');
      setPincode(item.pincode || '');
      setFormattedAddress(item.formattedAddress || '');
      // shopNumber stays blank — user enters it manually

      // 4. Fly to location
      flyToLocation(item.latitude, item.longitude, 18);
    },
    [flyToLocation]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Map controls
  // ═══════════════════════════════════════════════════════════════════════════
  const toggleMapType = useCallback(() => {
    const next = mapType === 'standard' ? 'satellite' : 'standard';
    setMapType(next);
    if (Platform.OS === 'web') {
      webIframeRef.current?.contentWindow?.postMessage(
        { type: 'SET_LAYER', mapType: next },
        '*'
      );
    }
  }, [mapType]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (Platform.OS === 'web') {
      webIframeRef.current?.contentWindow?.postMessage(
        { type: 'ZOOM', direction },
        '*'
      );
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Confirm & emit
  // ═══════════════════════════════════════════════════════════════════════════
  const handleConfirm = useCallback(() => {
    const parts = [
      shopNumber ? `Shop ${shopNumber}` : '',
      buildingName,
      street,
      area,
      city,
      stateName,
      pincode,
    ].filter(Boolean);

    const fullAddress =
      parts.join(', ') ||
      formattedAddress ||
      `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`;

    onConfirm({
      shopName: shopName.trim(),
      shopNumber: shopNumber.trim(),
      buildingName: buildingName.trim(),
      street: street.trim(),
      area: area.trim(),
      city: city.trim(),
      state: stateName.trim(),
      pincode: pincode.trim(),
      country: 'India',
      formattedAddress: fullAddress,
      latitude: currentCoords.lat,
      longitude: currentCoords.lng,
    });
    onClose();
  }, [
    shopName, shopNumber, buildingName, street, area, city,
    stateName, pincode, formattedAddress, currentCoords, onConfirm, onClose,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Native map loader
  // ═══════════════════════════════════════════════════════════════════════════
  let MapView: any = null;
  let PROVIDER_GOOGLE: any = null;
  if (Platform.OS !== 'web') {
    try {
      const Maps = require('react-native-maps');
      MapView = Maps.default;
      PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
    } catch {
      /* react-native-maps not installed */
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Leaflet iframe HTML (memoised — never recreated on state change)
  // ═══════════════════════════════════════════════════════════════════════════
  const webMapHtml = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%;background:#e5e3df}
.leaflet-control-attribution{font-size:10px;opacity:.7}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([${DEFAULT_LAT},${DEFAULT_LNG}],16);
var roads=L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{maxZoom:21,attribution:'&copy; Google Maps'});
var sat=L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',{maxZoom:21,attribution:'&copy; Google Maps'});
roads.addTo(map);
map.on('move',function(){var c=map.getCenter();window.parent.postMessage({type:'MAP_MOVE',lat:c.lat,lng:c.lng},'*')});
map.on('moveend',function(){var c=map.getCenter();window.parent.postMessage({type:'MAP_SETTLE',lat:c.lat,lng:c.lng},'*')});
window.addEventListener('message',function(e){if(!e.data)return;
if(e.data.type==='FLY_TO')map.flyTo([e.data.lat,e.data.lng],e.data.zoom||17,{duration:.8});
else if(e.data.type==='SET_LAYER'){if(e.data.mapType==='satellite'){map.removeLayer(roads);sat.addTo(map)}else{map.removeLayer(sat);roads.addTo(map)}}
else if(e.data.type==='ZOOM'){if(e.data.direction==='in')map.zoomIn();else map.zoomOut()}});
window.parent.postMessage({type:'IFRAME_READY'},'*');
</script>
</body>
</html>`,
    []
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers for the bottom sheet
  // ═══════════════════════════════════════════════════════════════════════════
  const hasAddress = Boolean(street || area || city);
  const displayTitle =
    shopName || buildingName || street || 'Move pin to select location';

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* ─── Top bar: Close + Search + Layer toggle ─── */}
        <View style={styles.topBar}>
          <View style={styles.searchRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.circleBtn}
              activeOpacity={0.7}
            >
              <X size={18} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.searchBox}>
              <Search
                size={16}
                color={Colors.textTertiary}
                style={{ marginRight: 6 }}
              />
              <TextInput
                placeholder="Search shop, building, landmark, area..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searching ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : searchQuery.length > 0 ? (
                <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={toggleMapType}
              style={[
                styles.circleBtn,
                mapType === 'satellite' && styles.circleBtnActive,
              ]}
              activeOpacity={0.7}
            >
              <Layers
                size={18}
                color={mapType === 'satellite' ? Colors.white : Colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Search results dropdown */}
          {(searchResults.length > 0 || searchError) && (
            <View style={styles.searchDropdown}>
              {searchError ? (
                <View style={styles.searchErrorRow}>
                  <AlertCircle size={16} color={Colors.textTertiary} />
                  <Text style={styles.searchErrorText}>{searchError}</Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 220 }}
                >
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.latitude}-${item.longitude}-${idx}`}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectSearchResult(item)}
                      activeOpacity={0.7}
                    >
                      <Store
                        size={18}
                        color={Colors.primary}
                        style={{ marginTop: 2, marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchResultTitle}>
                          {item.title}
                        </Text>
                        {Boolean(item.subtitle) && (
                          <Text
                            style={styles.searchResultSubtitle}
                            numberOfLines={2}
                          >
                            {item.subtitle}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* ─── Map viewport ─── */}
        <View style={styles.mapViewport}>
          {Platform.OS === 'web' ? (
            <iframe
              ref={webIframeRef}
              srcDoc={webMapHtml}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#e5e3df',
              }}
              title="Location Picker Map"
            />
          ) : MapView ? (
            <MapView
              ref={nativeMapRef}
              provider={PROVIDER_GOOGLE}
              mapType={mapType === 'satellite' ? 'hybrid' : 'standard'}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: currentCoords.lat,
                longitude: currentCoords.lng,
                latitudeDelta: 0.003,
                longitudeDelta: 0.003,
              }}
              onRegionChange={() => setIsMapMoving(true)}
              onRegionChangeComplete={(region: any) => {
                setIsMapMoving(false);
                setCurrentCoords({
                  lat: region.latitude,
                  lng: region.longitude,
                });
                if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
                geocodeTimer.current = setTimeout(
                  () => fetchAddress(region.latitude, region.longitude),
                  300
                );
              }}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass={false}
            />
          ) : (
            <View style={styles.fallbackCenter}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ marginTop: 10, color: Colors.textSecondary }}>
                Loading map...
              </Text>
            </View>
          )}

          {/* Rapido-style center pin */}
          <View
            style={[
              styles.pinAnchor,
              isMapMoving && styles.pinAnchorLifted,
            ]}
            pointerEvents="none"
          >
            <View style={styles.pinTooltip}>
              <Store
                size={11}
                color={Colors.white}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.pinTooltipText}>
                {isMapMoving ? 'Locating...' : 'Shop Entrance'}
              </Text>
            </View>
            <MapPin size={36} color="#DC2626" fill="#DC2626" strokeWidth={1.5} />
            <View
              style={[
                styles.pinShadow,
                isMapMoving && styles.pinShadowSmall,
              ]}
            />
          </View>

          {/* Floating controls */}
          <View style={styles.mapControls}>
            {Platform.OS === 'web' && (
              <View style={styles.zoomBox}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => handleZoom('in')}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.zoomDivider} />
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => handleZoom('out')}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={obtainDeviceGps}
              activeOpacity={0.85}
            >
              {locatingUser ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Navigation size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.brandBadge}>
            <Text style={styles.brandText}>Google Maps</Text>
          </View>
        </View>

        {/* ─── Bottom sheet: address confirmation ─── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {/* Header row */}
            <View style={styles.sheetHeader}>
              <View style={styles.storeIcon}>
                <Store size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sheetLabel}>CONFIRM LOCATION</Text>
                  <Text style={styles.coordsBadge}>
                    {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                  </Text>
                </View>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {loadingAddress ? 'Detecting address...' : displayTitle}
                </Text>
              </View>

              {loadingAddress ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.primary}
                  style={{ marginLeft: 8 }}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setIsEditingDetails((v) => !v)}
                  style={styles.editBtn}
                  activeOpacity={0.7}
                >
                  <Edit3 size={12} color={Colors.primary} style={{ marginRight: 3 }} />
                  <Text style={styles.editBtnText}>
                    {isEditingDetails ? 'Done' : 'Edit'}
                  </Text>
                  {isEditingDetails ? (
                    <ChevronUp size={13} color={Colors.primary} />
                  ) : (
                    <ChevronDown size={13} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Expandable edit form */}
            {isEditingDetails ? (
              <ScrollView
                style={styles.editScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.editGrid}>
                  {/* Shop Name — auto-detected, editable */}
                  <View style={styles.fieldFull}>
                    <Text style={styles.fieldLabel}>
                      Shop / Business Name
                      <Text style={styles.autoTag}> (auto-detected)</Text>
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={shopName}
                      onChangeText={setShopName}
                      placeholder="e.g. ABC Mart"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* Shop Number — MANUAL only */}
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>
                      Shop / Unit No.
                      <Text style={styles.manualTag}> (enter manually)</Text>
                    </Text>
                    <TextInput
                      style={[styles.fieldInput, styles.fieldInputManual]}
                      value={shopNumber}
                      onChangeText={setShopNumber}
                      placeholder="e.g. Shop 4"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* Building — auto if available, else manual */}
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>
                      Building / Complex
                      {buildingName ? (
                        <Text style={styles.autoTag}> (detected)</Text>
                      ) : (
                        <Text style={styles.manualTag}> (if applicable)</Text>
                      )}
                    </Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        !buildingName && styles.fieldInputManual,
                      ]}
                      value={buildingName}
                      onChangeText={setBuildingName}
                      placeholder="e.g. Royal Plaza"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* Road / Street — auto */}
                  <View style={styles.fieldFull}>
                    <Text style={styles.fieldLabel}>
                      Road / Street Name
                      <Text style={styles.autoTag}> (auto-detected)</Text>
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={street}
                      onChangeText={setStreet}
                      placeholder="e.g. 150 Feet Ring Road"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* Area — auto */}
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>
                      Area / Locality
                      <Text style={styles.autoTag}> (auto)</Text>
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={area}
                      onChangeText={setArea}
                      placeholder="e.g. Kalawad Road"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* City — auto */}
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>
                      City
                      <Text style={styles.autoTag}> (auto)</Text>
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={city}
                      onChangeText={setCity}
                      placeholder="e.g. Rajkot"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* State — auto */}
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>State</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={stateName}
                      onChangeText={setStateName}
                      placeholder="e.g. Gujarat"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* Pincode — auto */}
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>PIN Code</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={pincode}
                      onChangeText={setPincode}
                      keyboardType="numeric"
                      maxLength={6}
                      placeholder="e.g. 360001"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </View>
              </ScrollView>
            ) : (
              /* Compact address preview */
              <View style={styles.addressCard}>
                {hasAddress ? (
                  <>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {[street, area, city, pincode].filter(Boolean).join(', ') ||
                        formattedAddress}
                    </Text>
                    <View style={styles.chipsRow}>
                      {Boolean(area) && (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>Area: {area}</Text>
                        </View>
                      )}
                      {Boolean(city) && (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>{city}</Text>
                        </View>
                      )}
                      {Boolean(pincode) && (
                        <View style={styles.chipHl}>
                          <Text style={styles.chipHlText}>PIN: {pincode}</Text>
                        </View>
                      )}
                    </View>
                  </>
                ) : (
                  <Text style={styles.addressPlaceholder}>
                    {loadingAddress
                      ? 'Detecting address from pin location...'
                      : 'Drag the map so the pin is on the shop entrance, then confirm.'}
                  </Text>
                )}
              </View>
            )}

            {/* Confirm button */}
            <Button
              title="Confirm Location & Auto-Fill Address"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleConfirm}
              icon={
                <Check
                  size={18}
                  color={Colors.white}
                  strokeWidth={2.5}
                />
              }
              iconPosition="right"
              style={styles.confirmBtn}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Top bar
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    zIndex: 20,
    ...Shadows.sm,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  circleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  // Search dropdown
  searchDropdown: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.md,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchResultTitle: {
    ...Typography.bodySm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchResultSubtitle: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  searchErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchErrorText: {
    ...Typography.captionSm,
    color: Colors.textTertiary,
    flex: 1,
  },

  // Map
  mapViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#e5e3df',
  },
  fallbackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pin
  pinAnchor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -48 }],
    alignItems: 'center',
    width: 120,
    justifyContent: 'flex-end',
    zIndex: 15,
  },
  pinAnchorLifted: {
    transform: [{ translateX: -60 }, { translateY: -60 }],
  },
  pinTooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: 2,
  },
  pinTooltipText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 1,
  },
  pinShadowSmall: {
    width: 6,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  // Map floating controls
  mapControls: {
    position: 'absolute',
    right: 14,
    bottom: 16,
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  zoomBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  zoomBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  zoomDivider: { height: 1, backgroundColor: Colors.borderLight },
  gpsBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  brandBadge: {
    position: 'absolute',
    left: 12,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  brandText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

  // Bottom sheet
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadows.lg,
  },
  sheet: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderMedium,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  storeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  coordsBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
    overflow: 'hidden',
  },
  sheetTitle: {
    ...Typography.bodyMd,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySubtle,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginRight: 2,
  },

  // Address preview card
  addressCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  addressText: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 8,
  },
  addressPlaceholder: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  chipHl: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  chipHlText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  // Edit form
  editScroll: { maxHeight: 200, marginBottom: 10 },
  editGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldFull: { width: '100%' },
  fieldHalf: { width: '48.5%' },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  autoTag: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'none',
  },
  manualTag: {
    fontSize: 8,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'none',
  },
  fieldInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  fieldInputManual: {
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },

  confirmBtn: { marginTop: 4 },
});
