/**
 * Course catalog (subjects → modules → topics).
 * Demo mode: the mock catalog. Supabase mode: loaded from the database
 * (readable before sign-in, see migration 20261120000001_catalog_public.sql).
 */
import { create } from 'zustand';

import * as mock from '@/data/mock';
import { supabase } from '@/lib/supabase';
import type { Module, Subject, Topic } from '@/types';

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface CatalogState {
  status: CatalogStatus;
  error: string | null;
  subjects: Subject[];
  modules: Module[];
  topics: Topic[];
  /** Loads once; call again after an error to retry. */
  load: () => Promise<void>;
}

interface SubjectRow { id: string; code: string; name: string; color: string }
interface ModuleRow { id: string; subject_id: string; title: string; position: number }
interface TopicRow { id: string; module_id: string; title: string }

let inFlight: Promise<void> | null = null;

export const useCatalogStore = create<CatalogState>((set, get) => ({
  status: supabase ? 'idle' : 'ready',
  error: null,
  subjects: supabase ? [] : mock.subjects,
  modules: supabase ? [] : mock.modules,
  topics: supabase ? [] : mock.topics,

  load: async () => {
    if (!supabase || get().status === 'ready') return;
    if (inFlight) return inFlight;
    set({ status: 'loading', error: null });
    inFlight = (async () => {
      try {
        const [s, m, t] = await Promise.all([
          supabase.from('subjects').select('id, code, name, color').order('code'),
          supabase.from('modules').select('id, subject_id, title, position').order('position'),
          supabase.from('topics').select('id, module_id, title').order('title'),
        ]);
        const failure = s.error ?? m.error ?? t.error;
        if (failure) throw failure;

        const modules: Module[] = (m.data as ModuleRow[]).map((r) => ({
          id: r.id,
          subjectId: r.subject_id,
          title: r.title,
          order: r.position,
        }));
        const subjectOfModule = new Map(modules.map((x) => [x.id, x.subjectId]));
        set({
          status: 'ready',
          subjects: (s.data as SubjectRow[]).map((r) => ({ id: r.id, code: r.code, name: r.name, color: r.color })),
          modules,
          topics: (t.data as TopicRow[])
            .filter((r) => subjectOfModule.has(r.module_id))
            .map((r) => ({ id: r.id, moduleId: r.module_id, subjectId: subjectOfModule.get(r.module_id)!, title: r.title })),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
        set({ status: 'error', error: message });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));
