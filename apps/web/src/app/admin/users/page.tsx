'use client';

import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { ES } from '@/lib/spanish';
import { useUserRole } from '@/lib/supabase/use-user-role';
import { columns, StaffUser } from './columns';
import { DataTable } from './data-table';
import { UserDrawer } from './user-drawer';
import { deleteStaffUser, getAllUsers } from './actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useCallback } from 'react';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const { role: currentRole, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const supabase = createClient();

  const isExplicitNonAdmin = currentRole !== null && currentRole !== 'admin';

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);

  // Memoized fetch function so it's stable across renders
  const fetchUsers = useCallback(async () => {
    try {
      console.log('Fetching users...');
      const data = await getAllUsers();
      console.log('Fetched users:', data);

      setUsers(
        data?.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          created_at: u.created_at,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          position: u.position,
          tasks: u.tasks || [],
        })) || []
      );
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.warning(ES.users.errorFetchingUsers);
    }
  }, []);

  // Auth check - only admins can access
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && !roleLoading && isExplicitNonAdmin) {
      router.push('/dashboard');
    }
  }, [user, authLoading, roleLoading, isExplicitNonAdmin, router]);

  // Fetch users on mount
  useEffect(() => {
    if (user) {
      setLoading(true);
      console.log('User authenticated, fetching users');
      fetchUsers();

      // Real-time subscription
      const subscription = supabase
        .channel('users')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          () => {
            console.log('User data changed, refreshing');
            fetchUsers();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, supabase, fetchUsers]);

  useEffect(() => {
    setLoading(false);
  }, [users]);

  const handleDeleteUser = async (userToDelete: StaffUser) => {
    try {
      // Delete user via server action
      await deleteStaffUser(userToDelete.id);

      setUsers(users.filter((u) => u.id !== userToDelete.id));
      toast.success(ES.users.userDeletedSuccess);
      setDeletingUser(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      const errorMessage = (err as any)?.message || (err as any)?.error_description || ES.users.errorDeletingUser;
      toast.warning(errorMessage);
    }
  };

  // Listen for edit/delete events
  useEffect(() => {
    const handleEditEvent = (e: any) => {
      setEditingUser(e.detail);
    };

    const handleDeleteEvent = (e: any) => {
      setDeletingUser(e.detail);
    };

    window.addEventListener('edit-user', handleEditEvent);
    window.addEventListener('delete-user', handleDeleteEvent);

    return () => {
      window.removeEventListener('edit-user', handleEditEvent);
      window.removeEventListener('delete-user', handleDeleteEvent);
    };
  }, []);

  if (authLoading || roleLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-8 w-48" />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center justify-between gap-2 border-b bg-background p-4">
          <div className="flex items-center gap-2 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/admin/users">
                    {ES.nav.admin}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{ES.nav.users}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex-1" />
            <UserDrawer onUserSaved={fetchUsers} />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <DataTable columns={columns} data={users} />
            )}
          </div>
        </div>

        {/* Edit User Drawer */}
        {editingUser && (
          <UserDrawer
            trigger={null}
            editingUser={editingUser}
            onUserSaved={() => {
              setEditingUser(null);
              fetchUsers();
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ES.users.deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {ES.users.deleteConfirmDesc} {deletingUser?.email}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>{ES.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingUser) {
                  handleDeleteUser(deletingUser);
                }
              }}
            >
              {ES.common.delete}
            </AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
