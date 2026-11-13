import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { MapPin, Navigation, ExternalLink } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export interface MapMarker {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

interface SalesMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  height?: number;
  showNavigationButton?: boolean;
  markers?: MapMarker[];
}

export const SalesMap: React.FC<SalesMapProps> = ({
  latitude,
  longitude,
  title,
  description,
  height = 180,
  showNavigationButton = true,
  markers,
}) => {
  const displayMarkers = markers && markers.length > 0 ? markers : [{ latitude, longitude, title, description }];

  const openInNativeMaps = () => {
    const scheme = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}(${encodeURIComponent(title || 'Location')})`,
      android: `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(title || 'Location')})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    if (scheme) {
      Linking.openURL(scheme).catch((err) => {
        console.warn('Could not open maps URL:', err);
      });
    }
  };

  // Web or fallback preview
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.webFallback}>
          <View style={styles.pinBadge}>
            <MapPin size={22} color={Colors.primaryDark} />
          </View>
          <Text style={styles.coordText}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
          {title && <Text style={styles.storeTitle}>{title}</Text>}
          {description && <Text style={styles.desc}>{description}</Text>}

          {showNavigationButton && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openInNativeMaps}
              style={styles.navButton}
            >
              <Navigation size={14} color={Colors.white} />
              <Text style={styles.navButtonText}>Open in Google Maps</Text>
              <ExternalLink size={12} color={Colors.white} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Native (iOS & Android)
  let MapView: any = null;
  let Marker: any = null;

  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('Native maps module fallback:', e);
  }

  if (MapView && Marker) {
    return (
      <View style={[styles.container, { height }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.008,
            longitudeDelta: 0.008,
          }}
          showsUserLocation
          showsCompass
        >
          {displayMarkers.map((m, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.title}
              description={m.description}
            />
          ))}
        </MapView>

        {showNavigationButton && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openInNativeMaps}
            style={styles.floatingNavBtn}
          >
            <Navigation size={14} color={Colors.white} />
            <Text style={styles.floatingNavText}>Directions</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Graceful fallback
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.webFallback}>
        <MapPin size={22} color={Colors.primaryDark} />
        <Text style={styles.coordText}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openInNativeMaps}
          style={styles.navButton}
        >
          <Navigation size={14} color={Colors.white} />
          <Text style={styles.navButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#EBF3E8',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: 'relative',
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0FDF4',
  },
  pinBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  coordText: {
    ...Typography.captionSm,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  storeTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  desc: {
    ...Typography.captionSm,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginTop: 10,
  },
  navButtonText: {
    color: Colors.white,
    ...Typography.buttonSm,
    marginLeft: 6,
  },
  floatingNavBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    elevation: 3,
  },
  floatingNavText: {
    color: Colors.white,
    ...Typography.captionSm,
    fontWeight: '700',
    marginLeft: 4,
  },
});
