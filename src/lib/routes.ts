import type { Href } from 'expo-router';

import type { ContentKind } from '@/types';

export function detailHref(kind: ContentKind, id: string): Href {
  switch (kind) {
    case 'presentation':
      return { pathname: '/presentation/[id]', params: { id } };
    case 'exercise':
      return { pathname: '/exercise/[id]', params: { id } };
    case 'material':
      return { pathname: '/material/[id]', params: { id } };
  }
}

export function editHref(kind: ContentKind, id: string): Href {
  switch (kind) {
    case 'presentation':
      return { pathname: '/presentation/upload', params: { id } };
    case 'exercise':
      return { pathname: '/exercise/upload', params: { id } };
    case 'material':
      return { pathname: '/admin/material-form', params: { id } };
  }
}
