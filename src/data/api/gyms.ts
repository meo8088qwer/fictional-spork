import { supabase } from '../../lib/supabaseClient';
import { DEFAULT_EVENTS } from '../constants';

export interface Gym {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  plan: 'free' | 'paid';
}

function mapGymRow(row: any): Gym {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    name: row.name,
    plan: row.plan,
  };
}

function makeSlug(name: string): string {
  const asciiPart = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const random = Math.random().toString(36).slice(2, 8);
  return asciiPart ? `${asciiPart}-${random}` : `gym-${random}`;
}

export async function getMyGym(): Promise<Gym | null> {
  const { data, error } = await supabase.from('gyms').select('*').maybeSingle();
  if (error) throw error;
  return data ? mapGymRow(data) : null;
}

async function seedDefaultEvents(gymId: string): Promise<void> {
  const rows = Object.values(DEFAULT_EVENTS).map((meta) => ({
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
    is_custom: false,
  }));

  const { error } = await supabase.from('events').insert(rows);
  if (error) throw error;
}

async function createGym(name: string): Promise<Gym> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = makeSlug(name);
    const { data, error } = await supabase
      .from('gyms')
      .insert({ name, slug })
      .select('*')
      .single();

    if (!error) {
      const gym = mapGymRow(data);
      await seedDefaultEvents(gym.id);
      return gym;
    }

    // 23505 = unique_violation (slug collision) -- retry with a new random slug.
    if (error.code === '23505') {
      lastError = error;
      continue;
    }
    throw error;
  }

  throw lastError;
}

/**
 * Idempotent: returns the caller's existing gym, or creates one if this is
 * their first time (right after signup, or a self-heal if the tab closed
 * before gym creation finished last time).
 */
export async function ensureGymForUser(fallbackName: string): Promise<Gym> {
  const existing = await getMyGym();
  if (existing) return existing;
  return createGym(fallbackName);
}
