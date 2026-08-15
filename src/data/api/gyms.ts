import { supabase } from '../../lib/supabaseClient';
import { seedDefaultEvents } from './events';

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

async function createGym(name: string): Promise<Gym> {
  // owner_id must be set explicitly on insert -- it's NOT NULL and the
  // gyms_owner_insert RLS policy requires owner_id = auth.uid(), so an
  // insert without it fails the not-null constraint (or the RLS check)
  // and throws, leaving the caller stuck with no gym.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw userError ?? new Error('No authenticated user');
  }
  const ownerId = userData.user.id;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = makeSlug(name);
    const { data, error } = await supabase
      .from('gyms')
      .insert({ owner_id: ownerId, name, slug })
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

export async function updateGymName(gymId: string, name: string): Promise<Gym> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('체육관 이름을 입력해 주세요.');

  const { data, error } = await supabase
    .from('gyms')
    .update({ name: trimmed })
    .eq('id', gymId)
    .select('*')
    .single();
  if (error) throw error;
  return mapGymRow(data);
}
