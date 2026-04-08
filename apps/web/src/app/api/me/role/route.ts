import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const requestUrl = new URL(request.url);
    const requestedEmail = requestUrl.searchParams.get('email');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (requestedEmail) {
        const { data: byEmail, error: byEmailError } = await admin
          .from('users')
          .select('role')
          .eq('email', requestedEmail)
          .maybeSingle();

        if (!byEmailError && typeof byEmail?.role === 'string') {
          return NextResponse.json({ role: byEmail.role });
        }
      }

      return NextResponse.json({ role: null }, { status: 401 });
    }

    let role: string | null = null;

    const { data: byId, error: byIdError } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!byIdError && typeof byId?.role === 'string') {
      role = byId.role;
    }

    if (!role && user.email) {
      const { data: byEmail, error: byEmailError } = await admin
        .from('users')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (!byEmailError && typeof byEmail?.role === 'string') {
        role = byEmail.role;
      }
    }

    return NextResponse.json({ role });
  } catch (error) {
    return NextResponse.json(
      { role: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
