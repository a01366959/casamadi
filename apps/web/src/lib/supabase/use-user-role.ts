'use client';

import { useEffect, useState } from 'react';
import { createClient } from './client';
import { useAuth } from './auth-provider';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const loadRole = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        // Primary source: server endpoint using authenticated user + service-role lookup.
        const emailParam = user.email ? `?email=${encodeURIComponent(user.email)}` : '';
        const roleResponse = await fetch(`/api/me/role${emailParam}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (roleResponse.ok) {
          const roleData = (await roleResponse.json()) as { role?: string | null };
          if (!cancelled && typeof roleData.role === 'string' && roleData.role.length > 0) {
            setRole(roleData.role);
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from('users')
          .select('id, role, email')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        let roleFromDb = typeof data?.role === 'string' ? data.role : null;

        // Fallback in case auth user id and users.id are out-of-sync.
        if (!roleFromDb && user.email) {
          const { data: emailData, error: emailError } = await supabase
            .from('users')
            .select('role')
            .eq('email', user.email)
            .maybeSingle();

          if (!emailError && typeof emailData?.role === 'string') {
            roleFromDb = emailData.role;
          }
        }

        if (!cancelled) {
          const roleFromMetadata =
            user.user_metadata &&
            typeof user.user_metadata === 'object' &&
            'role' in user.user_metadata &&
            typeof user.user_metadata.role === 'string'
              ? user.user_metadata.role
              : null;

          setRole(roleFromDb || roleFromMetadata);
        }
      } catch {
        if (!cancelled) {
          const roleFromMetadata =
            user.user_metadata &&
            typeof user.user_metadata === 'object' &&
            'role' in user.user_metadata &&
            typeof user.user_metadata.role === 'string'
              ? user.user_metadata.role
              : null;
          setRole(roleFromMetadata);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, user?.user_metadata]);

  return { role, loading };
}
