import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: byId } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (byId?.role === 'admin') {
    return true;
  }

  if (user.email) {
    const { data: byEmail } = await admin
      .from('users')
      .select('role')
      .eq('email', user.email)
      .maybeSingle();
    return byEmail?.role === 'admin';
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `menu/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await admin.storage.createBucket('menu-images', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    }).catch(() => undefined);

    const upload = await admin.storage.from('menu-images').upload(fileName, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

    if (upload.error) {
      throw upload.error;
    }

    const { data } = admin.storage.from('menu-images').getPublicUrl(fileName);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
