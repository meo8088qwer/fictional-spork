import { supabase } from '../../lib/supabaseClient';
import { seedDefaultEvents } from './events';

export interface Gym {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  plan: 'free' | 'basic' | 'pro';
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

async function createGym(name: string, referralSlug?: string): Promise<Gym> {
  // Routed through the create_gym_with_referral RPC (not a plain insert) so
  // referred_by_gym_id can only ever be resolved server-side from a real
  // gym's slug -- gyms RLS select is owner-scoped, so a new signer-up has
  // no way to look up another gym's id themselves, and a plain insert would
  // otherwise let a client pass an arbitrary gym_id in directly. See
  // supabase/migrations/0016_referral_program.sql.
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = makeSlug(name);
    const { data, error } = await supabase.rpc('create_gym_with_referral', {
      p_name: name,
      p_slug: slug,
      p_referral_slug: referralSlug ?? null,
    });

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
 * before gym creation finished last time). `referralSlug` is only used on
 * that first creation -- see AuthContext's PENDING_REFERRAL_SLUG_KEY.
 */
export async function ensureGymForUser(fallbackName: string, referralSlug?: string): Promise<Gym> {
  const existing = await getMyGym();
  if (existing) return existing;
  return createGym(fallbackName, referralSlug);
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

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function updateGymSlug(gymId: string, slug: string): Promise<Gym> {
  const trimmed = slug.trim();
  if (trimmed.length < 3) throw new Error('주소는 최소 3자 이상이어야 해요.');
  if (!SLUG_PATTERN.test(trimmed)) {
    throw new Error('영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요.');
  }

  const { data, error } = await supabase
    .from('gyms')
    .update({ slug: trimmed })
    .eq('id', gymId)
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 사용 중인 주소예요. 다른 주소를 입력해 주세요.');
    }
    throw error;
  }
  return mapGymRow(data);
}
