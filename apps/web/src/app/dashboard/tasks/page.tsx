'use client';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter } from 'next/navigation';
import { ES } from '@/lib/spanish';

interface Task {
  id: string;
  cloudbeds_room_id: string;
  task_type: string;
  description: string;
  status: 'pending' | 'assigned' | 'completed' | 'rejected';
  assigned_to_user_id?: string;
  created_at: string;
  completed_at?: string;
  notes?: string;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  extra_towel: 'Toallas extras',
  extra_linens: 'Sabanas extras',
  maintenance: 'Mantenimiento',
  cleaning: 'Limpieza',
  urgent: 'Urgente',
};

const TASK_TYPE_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  extra_towel: 'secondary',
  extra_linens: 'secondary',
  maintenance: 'destructive',
  cleaning: 'secondary',
  urgent: 'destructive',
};

export default function TasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tareas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tasks:', error);
          return;
        }

        setTasks(data || []);
      } catch (err) {
        console.error('Fetch tasks error:', err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchTasks();

    // Set up real-time subscription
    const subscription = supabase
      .channel('tareas_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tareas' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((task) => (task.id === payload.new.id ? (payload.new as Task) : task))
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase]);

  useEffect(() => {
    if (activeTab === 'pending') {
      setFilteredTasks(tasks.filter((t) => t.status === 'pending'));
    } else if (activeTab === 'assigned') {
      setFilteredTasks(tasks.filter((t) => t.status === 'assigned'));
    } else if (activeTab === 'completed') {
      setFilteredTasks(tasks.filter((t) => t.status === 'completed'));
    }
  }, [activeTab, tasks]);

  const handleAssignTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ status: 'assigned', assigned_to_user_id: user?.id })
        .eq('id', taskId);

      if (error) {
        console.error('Error assigning task:', error);
        return;
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status: 'assigned', assigned_to_user_id: user?.id }
            : task
        )
      );
    } catch (err) {
      console.error('Assign task error:', err);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) {
        console.error('Error completing task:', error);
        return;
      }

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status: 'completed', completed_at: new Date().toISOString() }
            : task
        )
      );
    } catch (err) {
      console.error('Complete task error:', err);
    }
  };

  if (loading || pageLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <Skeleton className="h-8 w-48" />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-96" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const stats = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    assigned: tasks.filter((t) => t.status === 'assigned').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{ES.nav.tasks}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{ES.nav.tasks}</h1>
            <p className="text-slate-600 text-sm mt-1">Gestiona solicitudes de huespedes y tareas de operacion</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.pending}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Asignadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.assigned}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.completed}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="assigned">Asignadas</TabsTrigger>
              <TabsTrigger value="completed">Completadas</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              {filteredTasks.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No hay tareas pendientes</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onAssign={() => handleAssignTask(task.id)}
                    onComplete={() => handleCompleteTask(task.id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="assigned" className="space-y-4 mt-4">
              {filteredTasks.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No hay tareas asignadas</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onAssign={() => handleAssignTask(task.id)}
                    onComplete={() => handleCompleteTask(task.id)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {filteredTasks.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No hay tareas completadas</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onAssign={() => handleAssignTask(task.id)}
                    onComplete={() => handleCompleteTask(task.id)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function TaskCard({
  task,
  onAssign,
  onComplete,
}: {
  task: Task;
  onAssign: () => void;
  onComplete: () => void;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Habitacion {task.cloudbeds_room_id}</CardTitle>
              <Badge variant={TASK_TYPE_COLORS[task.task_type] || 'secondary'}>
                {TASK_TYPE_LABELS[task.task_type] || task.task_type}
              </Badge>
              <Badge variant={task.status === 'pending' ? 'outline' : 'secondary'}>
                {task.status}
              </Badge>
            </div>
            <CardDescription className="mt-2">{task.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {new Date(task.created_at).toLocaleString()}
          </div>
          <div className="flex items-center gap-2">
            {task.status === 'pending' && (
              <Button size="sm" onClick={onAssign} variant="default">
                Asignar
              </Button>
            )}
            {task.status === 'assigned' && (
              <Button size="sm" onClick={onComplete} variant="default">
                Completar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
