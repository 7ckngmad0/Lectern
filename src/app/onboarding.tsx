import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FileTypeIcon } from '@/components/content/FileTypeIcon';
import { Button, Icon, Text, type IconName } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/theme';

const SLIDES: { icon: IconName; title: string; body: string; files: string[] }[] = [
  {
    icon: 'easel-outline',
    title: 'All your presentations in one place',
    body: 'Upload your reports and slide decks by topic, so they are ready when it is your turn to present.',
    files: ['pptx', 'pdf'],
  },
  {
    icon: 'clipboard-outline',
    title: 'Exercises, organized by lesson',
    body: 'Find activities, labs and worksheets by subject, module and topic instead of digging through chats.',
    files: ['docx', 'xlsx'],
  },
  {
    icon: 'library-outline',
    title: 'A shared library for your class',
    body: 'Browse official handouts and reviewers from your instructors, and bookmark what you need for later.',
    files: ['pdf', 'pptx'],
  },
];

export default function OnboardingScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const last = index === SLIDES.length - 1;

  const finish = () => {
    completeOnboarding();
    router.replace('/login');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const next = () => {
    if (last) return finish();
    scroller.current?.scrollTo({ x: width * (index + 1), animated: true });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: t.spacing.lg, height: 48, justifyContent: 'center' }}>
        {!last ? <Button label="Skip" variant="ghost" size="sm" onPress={finish} /> : null}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={{ width, paddingHorizontal: t.spacing.xxxl, justifyContent: 'center', gap: t.spacing.xxxl }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 240 }}>
              <View
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  backgroundColor: t.colors.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={s.icon} size={72} color={t.colors.primary} />
              </View>
              <View style={{ position: 'absolute', top: 18, left: width / 2 - t.spacing.xxxl - 130, transform: [{ rotate: '-10deg' }] }}>
                <FileTypeIcon extension={s.files[0]} size={56} />
              </View>
              <View style={{ position: 'absolute', bottom: 20, right: width / 2 - t.spacing.xxxl - 128, transform: [{ rotate: '8deg' }] }}>
                <FileTypeIcon extension={s.files[1]} size={50} />
              </View>
            </View>
            <View style={{ gap: t.spacing.md }}>
              <Text variant="display" align="center">
                {s.title}
              </Text>
              <Text tone="muted" align="center">
                {s.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ padding: t.spacing.xl, gap: t.spacing.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={{
                height: 8,
                width: i === index ? 24 : 8,
                borderRadius: 4,
                backgroundColor: i === index ? t.colors.primary : t.colors.borderStrong,
              }}
            />
          ))}
        </View>
        <Button label={last ? 'Get started' : 'Next'} size="lg" fullWidth onPress={next} icon={last ? undefined : 'arrow-forward'} iconPosition="right" />
      </View>
    </SafeAreaView>
  );
}
