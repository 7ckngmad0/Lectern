import { useLocalSearchParams } from 'expo-router';

import { ContentDetail } from '@/components/content/ContentDetail';

export default function MaterialDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentDetail kind="material" id={id} />;
}
