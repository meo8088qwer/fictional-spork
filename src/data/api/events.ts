import { supabase } from '../../lib/supabaseClient';
import { EventMeta } from '../../types';
import { DEFAULT_EVENTS } from '../constants';
import { throwOnDbError } from './errors';

export function mapEventRow(row: any): EventMeta {
  return {
    key: row.key,
    timeSeconds: row.time_seconds,
    title: row.title,
    shortTitle: row.short_title,
    technique: row.technique,
    iconName: row.icon_name ?? undefined,
    badgeBg: row.badge_bg ?? undefined,
    badgeText: row.badge_text ?? undefined,
    benchmarkGood: row.benchmark_good ?? undefined,
    benchmarkPro: row.benchmark_pro ?? undefined,
    description: row.description ?? undefined,
    isCustom: row.is_custom,
  };
}

function toEventRow(gymId: string, meta: EventMeta) {
  return {
    gym_id: gymId,
    key: meta.key,
    time_seconds: meta.timeSeconds,
    title: meta.title,
    short_title: meta.shortTitle,
    technique: meta.technique,
    icon_name: meta.iconName ?? null,
    badge_bg: meta.badgeBg ?? null,
    badge_text: meta.badgeText ?? null,
    benchmark_good: meta.benchmarkGood ?? null,
    benchmark_pro: meta.benchmarkPro ?? null,
    description: meta.description ?? null,
    is_custom: meta.isCustom ?? false,
  };
}

// The table has no display-order column, so PostgREST returns rows in
// whatever order Postgres feels like -- fine for gyms seeded after a
// DEFAULT_EVENTS reorder, but stale for gyms whose rows were already
// inserted in the old order. Sorting here (default events by their
// canonical key order, custom events after, in their original relative
// order) keeps every gym's event order in sync with DEFAULT_EVENTS without
// touching the database.
const DEFAULT_EVENT_ORDER = Object.keys(DEFAULT_EVENTS);
function defaultEventPriority(key: string): number {
  const idx = DEFAULT_EVENT_ORDER.indexOf(key);
  return idx === -1 ? DEFAULT_EVENT_ORDER.length : idx;
}

export async function listEvents(gymId: string): Promise<Record<string, EventMeta>> {
  const { data, error } = await supabase.from('events').select('*').eq('gym_id', gymId);
  if (error) throw error;

  const sorted = [...(data ?? [])].sort(
    (a, b) => defaultEventPriority(a.key) - defaultEventPriority(b.key)
  );

  const map: Record<string, EventMeta> = {};
  for (const row of sorted) {
    map[row.key] = mapEventRow(row);
  }
  return map;
}

export async function createEvent(gymId: string, meta: EventMeta): Promise<EventMeta> {
  const { data, error } = await supabase
    .from('events')
    .insert(toEventRow(gymId, meta))
    .select('*')
    .single();
  throwOnDbError(error);
  return mapEventRow(data);
}

// Gyms differ on what counts as "우수"/"프로" for their students, so the
// benchmark thresholds seeded from DEFAULT_EVENTS are just a starting
// point -- editable per gym like any other event field.
export async function updateEventBenchmarks(
  gymId: string,
  key: string,
  benchmarkGood: number,
  benchmarkPro: number
): Promise<EventMeta> {
  const { data, error } = await supabase
    .from('events')
    .update({ benchmark_good: benchmarkGood, benchmark_pro: benchmarkPro })
    .eq('gym_id', gymId)
    .eq('key', key)
    .select('*')
    .single();
  throwOnDbError(error);
  return mapEventRow(data);
}

export async function deleteEvent(gymId: string, key: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('gym_id', gymId).eq('key', key);
  if (error) throw error;
}

// The 6 built-in events (30초/10초 x 양발모아뛰기/번갈아뛰기/이중뛰기) are
// seeded server-side, atomically with gym creation itself (see
// create_gym_with_referral() in 0028_guarantee_default_events.sql) and can
// never be deleted (a DB trigger blocks it) -- every gym unconditionally
// has all 6, so there's no client-side seeding path anymore.

/**
 * Removes any custom events (base events can't be deleted -- enforced
 * server-side) and restores the 6 base events' fields to their canonical
 * defaults, undoing any benchmark/description edits.
 */
export async function resetEventsToDefault(gymId: string): Promise<Record<string, EventMeta>> {
  const { error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('gym_id', gymId)
    .eq('is_custom', true);
  if (deleteError) throw deleteError;

  const rows = Object.values(DEFAULT_EVENTS).map((meta) => toEventRow(gymId, { ...meta, isCustom: false }));
  const { error: upsertError } = await supabase.from('events').upsert(rows, { onConflict: 'gym_id,key' });
  if (upsertError) throw upsertError;

  return listEvents(gymId);
}
