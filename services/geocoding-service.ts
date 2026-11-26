import * as Location from 'expo-location';

export interface GeocodedAddress {
  /** Detected business / POI name, or empty string if none detected */
  shopName: string;
  /** Left blank — user enters manually */
  shopNumber: string;
  /** Building or complex name if detected, otherwise empty */
  buildingName: string;
  /** Road or street name */
  street: string;
  /** Suburb / neighbourhood / locality */
  area: string;
  /** City or town name */
  city: string;
  /** State or province */
  state: string;
  /** 6-digit PIN code */
  pincode: string;
  /** Country */
  country: string;
  /** Human-readable full address */
  formattedAddress: string;
  /** GPS latitude */
  latitude: number;
  /** GPS longitude */
  longitude: number;
}

export interface SearchPlaceResult {
  /** Display title (POI / place name) */
  title: string;
  /** Subtitle (road, area, city summary) */
  subtitle: string;
  latitude: number;
  longitude: number;
  /** Structured address components extracted from the search result */
  shopName: string;
  buildingName: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  formattedAddress: string;
}

/**
 * Geocoding and place search service.
 * Uses OpenStreetMap Nominatim API (works on Web and native without API key)
 * with expo-location as a secondary fallback on native devices.
 *
 * Key design decisions:
 * - shopNumber is NEVER auto-filled (user enters manually)
 * - buildingName is only set if Nominatim actually returns a building/house_name
 * - area, city, state are mapped to their correct Nominatim counterparts
 *   without cross-contaminating fields (e.g. district never goes into city)
 * - Empty string is returned for unknown fields — no fake defaults like "Market Area"
 */
export const geocodingService = {
  /**
   * Reverse geocode coordinates → structured address.
   * @param preferredShopName  If the user searched and selected a shop,
   *   pass that name so it is preserved even if Nominatim reverse-geocode
   *   doesn't detect a POI at the exact adjusted pin location.
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
    preferredShopName?: string
  ): Promise<GeocodedAddress> {
    // ── 1. Nominatim reverse geocoding ──────────────────────────────────
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=json` +
        `&lat=${latitude}&lon=${longitude}` +
        `&zoom=18&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DistriboSalesApp/1.0',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};

        // ── Shop / POI name ───────────────────────────────────────────
        const detectedPoi =
          addr.shop ||
          addr.amenity ||
          addr.retail ||
          addr.supermarket ||
          addr.office ||
          (data.name && data.name !== addr.road ? data.name : '') ||
          '';
        const shopName = preferredShopName?.trim() || detectedPoi;

        // ── Building / Complex (only real building tags) ──────────────
        const buildingName = addr.building || addr.house_name || '';

        // ── Road / Street ─────────────────────────────────────────────
        const street =
          addr.road || addr.pedestrian || addr.street || addr.footway || '';

        // ── Area / Locality (suburb, neighbourhood — NOT district) ────
        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.quarter ||
          '';

        // ── City (only actual city/town/village — NOT district) ───────
        const city = addr.city || addr.town || addr.village || '';

        // ── State ─────────────────────────────────────────────────────
        const state = addr.state || '';

        // ── PIN code (6-digit Indian postal code) ─────────────────────
        const pincode = (addr.postcode || '').replace(/\D/g, '').slice(0, 6);

        const country = addr.country || 'India';

        // Build formatted address from non-empty components
        const components = [
          shopName,
          buildingName,
          street,
          area,
          city,
          state,
          pincode,
        ].filter(Boolean);
        const formattedAddress =
          components.join(', ') || data.display_name || '';

        return {
          shopName,
          shopNumber: '', // NEVER auto-filled
          buildingName,
          street,
          area,
          city,
          state,
          pincode,
          country,
          formattedAddress,
          latitude,
          longitude,
        };
      }
    } catch (err) {
      console.warn('[geocoding] Nominatim reverse error:', err);
    }

    // ── 2. expo-location native fallback ────────────────────────────────
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (results && results.length > 0) {
        const item = results[0];
        const street = item.street || '';
        const area =
          item.district ||
          (item as any).neighborhood ||
          item.subregion ||
          '';
        const city = item.city || '';
        const state = item.region || '';
        const pincode = (item.postalCode || '').replace(/\D/g, '').slice(0, 6);
        const country = item.country || 'India';
        const components = [
          preferredShopName || '',
          street,
          area,
          city,
          state,
          pincode,
        ].filter(Boolean);

        return {
          shopName: preferredShopName || '',
          shopNumber: '',
          buildingName: '',
          street,
          area,
          city,
          state,
          pincode,
          country,
          formattedAddress: components.join(', '),
          latitude,
          longitude,
        };
      }
    } catch (expoErr) {
      console.warn('[geocoding] expo-location fallback error:', expoErr);
    }

    // ── 3. Coordinates-only fallback ────────────────────────────────────
    return {
      shopName: preferredShopName || '',
      shopNumber: '',
      buildingName: '',
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      formattedAddress: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      latitude,
      longitude,
    };
  },

  /**
   * Search places / shops / landmarks by name or address.
   * Uses Nominatim search API scoped to India.
   */
  async searchPlaces(query: string): Promise<SearchPlaceResult[]> {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) return [];

    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json` +
        `&q=${encodeURIComponent(trimmed)}` +
        `&limit=8&addressdetails=1&countrycodes=in`;

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DistriboSalesApp/1.0',
        },
      });

      if (!res.ok) {
        console.warn('[geocoding] Search API returned', res.status);
        return [];
      }

      const items: any[] = await res.json();
      if (!Array.isArray(items)) return [];

      return items.map((item) => {
        const addr = item.address || {};

        // Title: POI name or first part of display_name
        const shopName =
          addr.shop ||
          addr.amenity ||
          addr.retail ||
          addr.supermarket ||
          addr.office ||
          item.name ||
          String(item.display_name || '').split(',')[0]?.trim() ||
          '';

        const buildingName = addr.building || addr.house_name || '';
        const street =
          addr.road || addr.pedestrian || addr.street || '';
        const area =
          addr.suburb || addr.neighbourhood || addr.residential || '';
        const city = addr.city || addr.town || addr.village || '';
        const state = addr.state || '';
        const pincode = (addr.postcode || '')
          .replace(/\D/g, '')
          .slice(0, 6);

        // Subtitle: road + area + city
        const subtitleParts = [street, area, city, state].filter(Boolean);
        const subtitle =
          subtitleParts.join(', ') ||
          String(item.display_name || '')
            .split(',')
            .slice(1, 4)
            .join(',')
            .trim();

        return {
          title: shopName || trimmed,
          subtitle,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          shopName,
          buildingName,
          street,
          area,
          city,
          state,
          pincode,
          formattedAddress: item.display_name || '',
        };
      });
    } catch (err) {
      console.warn('[geocoding] Search error:', err);
      return [];
    }
  },
};
