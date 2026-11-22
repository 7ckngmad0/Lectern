import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'presentations', title: 'Presentations', icon: 'easel-outline', activeIcon: 'easel' },
  { name: 'exercises', title: 'Exercises', icon: 'clipboard-outline', activeIcon: 'clipboard' },
  { name: 'library', title: 'Library', icon: 'library-outline', activeIcon: 'library' },
  { name: 'profile', title: 'Profile', icon: 'person-circle-outline', activeIcon: 'person-circle' },
];

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: t.colors.tabBar,
          borderTopColor: t.colors.border,
        },
        tabBarLabelStyle: { fontFamily: t.fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: t.colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => <Icon name={focused ? tab.activeIcon : tab.icon} size={23} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
