import { useLocalSearchParams } from 'expo-router';

import { ContentDetail } from '@/components/content/ContentDetail';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentDetail kind="exercise" id={id} />;
}
