import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  CalendarClock,
  User,
} from 'lucide-react-native';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';

interface TabItemProps {
  IconComponent: any;
  title: string;
  focused: boolean;
}

const CustomTabItem: React.FC<TabItemProps> = ({ IconComponent, title, focused }) => {
  return (
    <View style={styles.tabItemWrapper}>
      <View
        style={[
          styles.iconPill,
          focused && styles.iconPillActive,
        ]}
      >
        <IconComponent
          size={20}
          color={focused ? Colors.primaryDark : Colors.textTertiary}
          strokeWidth={focused ? 2.4 : 1.8}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.tabLabel,
          focused ? styles.tabLabelActive : styles.tabLabelInactive,
        ]}
      >
        {title}
      </Text>
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 20 : 10);
  const tabHeight = 62 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
          ...Shadows.md,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <CustomTabItem IconComponent={LayoutDashboard} title="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: 'Stores',
          tabBarIcon: ({ focused }) => (
            <CustomTabItem IconComponent={Store} title="Stores" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => (
            <CustomTabItem IconComponent={ShoppingBag} title="Orders" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: 'Follow-ups',
          tabBarIcon: ({ focused }) => (
            <CustomTabItem IconComponent={CalendarClock} title="Tasks" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <CustomTabItem IconComponent={User} title="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  iconPill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
    borderRadius: Radius.full,
    marginBottom: 3,
  },
  iconPillActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabLabel: {
    ...Typography.captionSm,
    fontSize: 10.5,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: Colors.textTertiary,
    fontWeight: '500',
  },
});
