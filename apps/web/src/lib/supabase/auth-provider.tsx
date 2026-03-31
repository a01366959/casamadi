'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from './client';
import type { Session } from '@supabase/supabase-js';

const HOTEL_BERNAL_ID = '572ba7e4-79f9-4169-a681-6a76a96c47a6';

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
};

// Ensure user record exists in database (for RLS to work)
async function ensureUserExists(supabase: any, userId: string, email: string) {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      // Create user record for this hotel
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          hotel_id: HOTEL_BERNAL_ID,
          email,
          role: 'staff',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating user record:', error);
      }
    }
  } catch (err) {
    console.error('Error ensuring user exists:', err);
  }
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const logout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        await ensureUserExists(supabase, session.user.id, session.user.email || '');
        setUser({
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        });
      }
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await ensureUserExists(supabase, session.user.id, session.user.email || '');
        setUser({
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, [supabase.auth]);

  return (
    <AuthContext.Provider value={{ session, user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
