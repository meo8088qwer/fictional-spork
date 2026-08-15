import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { ensureGymForUser, updateGymName as apiUpdateGymName, Gym } from '../data/api/gyms';

// Signup asks for the gym name before email confirmation exists -- if
// confirmation is required, the user leaves the tab (opens their email
// client) and often confirms in a new tab/window, where an in-memory ref
// would already be gone. localStorage survives that gap as long as they're
// on the same browser/device, which covers the common case.
const PENDING_GYM_NAME_KEY = 'pending_gym_name';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  gym: Gym | null;
  loading: boolean;
  gymLoading: boolean;
  gymError: string | null;
  signUp: (
    email: string,
    password: string,
    gymName: string
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshGym: () => Promise<void>;
  updateGymName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [gymLoading, setGymLoading] = useState(false);
  const [gymError, setGymError] = useState<string | null>(null);

  const loadGymForSession = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setGym(null);
      setGymError(null);
      return;
    }
    const fallbackName =
      localStorage.getItem(PENDING_GYM_NAME_KEY) ||
      activeSession.user.email?.split('@')[0] ||
      '내 체육관';
    setGymLoading(true);
    setGymError(null);
    try {
      const g = await ensureGymForUser(fallbackName);
      setGym(g);
      localStorage.removeItem(PENDING_GYM_NAME_KEY);
    } catch (e) {
      console.error('Failed to load/create gym for user', e);
      setGym(null);
      setGymError(
        e instanceof Error ? e.message : '체육관 정보를 불러오지 못했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setGymLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      loadGymForSession(data.session).finally(() => {
        if (isMounted) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadGymForSession(newSession);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadGymForSession]);

  const signUp = useCallback(async (email: string, password: string, gymName: string) => {
    localStorage.setItem(PENDING_GYM_NAME_KEY, gymName);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // If email confirmation is required, there's no session yet -- the gym
    // gets created by the auth-state listener once they actually log in.
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshGym = useCallback(async () => {
    await loadGymForSession(session);
  }, [session, loadGymForSession]);

  const updateGymName = useCallback(
    async (name: string) => {
      if (!gym) throw new Error('체육관 정보가 없습니다.');
      const updated = await apiUpdateGymName(gym.id, name);
      setGym(updated);
    },
    [gym]
  );

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    gym,
    loading,
    gymLoading,
    gymError,
    signUp,
    signIn,
    signOut,
    refreshGym,
    updateGymName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
