import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Strings } from '@/constants/Strings';
import { Fonts } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { useShoppingList } from '@/hooks/useShoppingList';

const T = Strings.tabs;

export default function TabLayout() {
  const colors = useColors();
  const router = useRouter();
  const list = useShoppingList();
  const toGet = list?.filter((i) => !i.checked).length ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarLabelStyle: { fontFamily: Fonts.semibold },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: T.home,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan-tab"
        options={{
          title: T.scan,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="barcode.viewfinder" color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/scanner');
          },
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: T.list,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="cart.fill" color={color} />,
          tabBarBadge: toGet > 0 ? toGet : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary, fontFamily: Fonts.bold },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: T.profile,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.circle" color={color} />,
        }}
      />
      {/* Adding a product now starts from a scan that isn't in the catalog, so it has no tab. */}
      <Tabs.Screen name="add" options={{ href: null }} />
    </Tabs>
  );
}
