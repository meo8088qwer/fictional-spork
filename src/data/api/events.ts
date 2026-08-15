import { supabase } from '../../lib/supabaseClient';
import { EventMeta } from '../../types';
import { DEFAULT_EVENTS } from '../constants';
import { throwOnDbError } from './errors';

function mapEventRow(row: any): EventMeta {
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

export async function listEvents(gymId: string): Promise<Record<string, EventMeta>> {
  const { data, error } = await supabase.from('events').select('*').eq('gym_id', gymId);
  if (error) throw error;

  const map: Record<string, EventMeta> = {};
  for (const row of data ?? []) {
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

// New gyms start on the free plan, which caps events at 2 (enforced by the
// enforce_event_limit DB trigger). Seeding all 6 built-in events at signup
// would trip that trigger mid-insert and roll back the whole batch -- so
// free-plan gyms get this starter pair instead of the full set.
const FREE_PLAN_DEFAULT_EVENT_KEYS = ['30s_basic', '30s_alternate'];

/** Idempotent: inserts the built-in event set for a gym that has none yet. */
export async function seedDefaultEvents(gymId: string): Promise<void> {
  const { data: gymRow, error: gymFetchError } = await supabase
    .from('gyms')
    .select('plan')
    .eq('id', gymId)
    .single();
  if (gymFetchError) throw gymFetchError;

  const eventsToSeed =
    gymRow.plan === 'paid'
      ? Object.values(DEFAULT_EVENTS)
      : FREE_PLAN_DEFAULT_EVENT_KEYS.map((key) => DEFAULT_EVENTS[key]);

  const rows = eventsToSeed.map((meta) => toEventRow(gymId, { ...meta, isCustom: false }));
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
