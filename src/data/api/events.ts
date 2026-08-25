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

export async function deleteEvent(gymId: string, key: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('gym_id', gymId).eq('key', key);
  if (error) throw error;
}

// Free-plan gyms get all 6 built-in events (30초/10초 x 양발모아뛰기/
// 번갈아뛰기/이중뛰기) -- the free-plan event cap in the enforce_event_limit
// DB trigger is set to exactly 6 to match, so seeding the full default set
// never trips it. Paid plan lifts the cap entirely for adding events beyond
// these defaults.
/** Idempotent: inserts the built-in event set for a gym that has none yet. */
export async function seedDefaultEvents(gymId: string): Promise<void> {
  const rows = Object.values(DEFAULT_EVENTS).map((meta) => toEventRow(gymId, { ...meta, isCustom: false }));
  const { error } = await supabase.from('events').insert(rows);
  if (error) throw error;
}

/** Deletes every event for the gym and re-seeds the built-in defaults. */
export async function resetEventsToDefault(gymId: string): Promise<Record<string, EventMeta>> {
  const { error: deleteError } = await supabase.from('events').delete().eq('gym_id', gymId);
  if (deleteError) throw deleteError;
  await seedDefaultEvents(gymId);
  return listEvents(gymId);
}
