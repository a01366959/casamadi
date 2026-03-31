'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function createStaffUser(
  email: string,
  role: 'admin' | 'manager' | 'front_desk' | 'room_service' | 'housekeeping',
  firstName?: string,
  lastName?: string,
  phone?: string,
  position?: string,
  tasks?: string[]
) {
  const supabase = createAdminClient();

  try {
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    // Create auth user using service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create user record in users table
    if (authData.user) {
      console.log('Inserting user record:', {
        id: authData.user.id,
        email,
        role,
        hotel_id: '572ba7e4-79f9-4169-a681-6a76a96c47a6',
      });

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          role,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
          position: position || null,
          tasks: tasks || [],
          hotel_id: '572ba7e4-79f9-4169-a681-6a76a96c47a6', // Hotel Bernal
        });

      if (userError) {
        console.error('User insert failed:', userError);
        throw new Error(`Failed to create user record: ${userError.message}`);
      }

      console.log('User successfully created:', authData.user.id);
      return { success: true, userId: authData.user.id };
    }
  } catch (err) {
    console.error('Error creating staff user:', err);
    console.log('Full error object:', JSON.stringify(err, null, 2));
    throw err;
  }
}

export async function updateStaffUserRole(
  userId: string,
  role: 'admin' | 'manager' | 'front_desk' | 'room_service' | 'housekeeping',
  firstName?: string,
  lastName?: string,
  phone?: string,
  position?: string,
  tasks?: string[]
) {
  const supabase = createAdminClient();

  try {
    const updateData: any = { role };
    if (firstName !== undefined) updateData.first_name = firstName || null;
    if (lastName !== undefined) updateData.last_name = lastName || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (position !== undefined) updateData.position = position || null;
    if (tasks !== undefined) updateData.tasks = tasks || [];

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Error updating staff user role:', err);
    throw err;
  }
}

export async function deleteStaffUser(userId: string) {
  const supabase = createAdminClient();

  try {
    // Delete from users table
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) throw userError;

    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) throw authError;

    return { success: true };
  } catch (err) {
    console.error('Error deleting staff user:', err);
    throw err;
  }
}

export async function getAllUsers() {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, created_at, first_name, last_name, phone, position, tasks')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAllUsers error:', error);
      throw error;
    }

    console.log('getAllUsers returned:', data?.length, 'users');
    return data || [];
  } catch (err) {
    console.error('Error fetching users:', err);
    throw err;
  }
}
