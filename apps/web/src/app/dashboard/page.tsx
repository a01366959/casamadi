'use client';

import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { ES } from '@/lib/spanish';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

interface DashboardStats {
  activeConversations: number;
  pendingOrders: number;
  pendingTasks: number;
  escalations: number;
}

interface SimpleItem {
  id: string;
  room: string;
  status: string;
  createdAt: string;
}

interface ActivityPoint {
  date: string;
  label: string;
  conversations: number;
  orders: number;
  tasks: number;
}

interface StatusPoint {
  status: string;
  total: number;
}

interface TaskThroughputPoint {
  date: string;
  label: string;
  created: number;
  completed: number;
}

const ACTIVITY_WINDOW_DAYS = 14;

function toDayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function shortDayLabel(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({
    activeConversations: 0,
    pendingOrders: 0,
    pendingTasks: 0,
    escalations: 0,
  });
  const [recentOrders, setRecentOrders] = useState<SimpleItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<SimpleItem[]>([]);
  const [activityData, setActivityData] = useState<ActivityPoint[]>([]);
  const [ordersStatusData, setOrdersStatusData] = useState<StatusPoint[]>([]);
  const [tasksThroughputData, setTasksThroughputData] = useState<TaskThroughputPoint[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const activityChartConfig = {
    conversations: { label: 'Conversaciones', color: 'var(--chart-1)' },
    orders: { label: 'Pedidos', color: 'var(--chart-2)' },
    tasks: { label: 'Tareas', color: 'var(--chart-3)' },
  } satisfies ChartConfig;

  const ordersStatusChartConfig = {
    total: { label: 'Pedidos', color: 'var(--chart-4)' },
  } satisfies ChartConfig;

  const tasksThroughputChartConfig = {
    created: { label: 'Creadas', color: 'var(--chart-2)' },
    completed: { label: 'Completadas', color: 'var(--chart-5)' },
  } satisfies ChartConfig;

  const openWorkload = useMemo(
    () => stats.pendingOrders + stats.pendingTasks + stats.escalations,
    [stats]
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadDashboardData = async () => {
      setPageLoading(true);

      try {
        const [
          activeConversationsResult,
          pendingOrdersResult,
          pendingTasksResult,
          escalationsResult,
          recentOrdersResult,
          recentTasksResult,
          conversationsTrendResult,
          ordersTrendResult,
          tasksTrendResult,
        ] = await Promise.all([
          supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .in('status', ['active', 'human_active']),
          supabase
            .from('pedidos')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'assigned', 'preparing']),
          supabase
            .from('tareas')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'assigned']),
          supabase
            .from('escalations')
            .select('id', { count: 'exact', head: true })
            .is('resolved_at', null),
          supabase
            .from('pedidos')
            .select('id, cloudbeds_room_id, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('tareas')
            .select('id, cloudbeds_room_id, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('conversations')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(500),
          supabase
            .from('pedidos')
            .select('created_at, status')
            .order('created_at', { ascending: false })
            .limit(500),
          supabase
            .from('tareas')
            .select('created_at, completed_at')
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

        setStats({
          activeConversations: activeConversationsResult.count || 0,
          pendingOrders: pendingOrdersResult.count || 0,
          pendingTasks: pendingTasksResult.count || 0,
          escalations: escalationsResult.count || 0,
        });

        setRecentOrders(
          (recentOrdersResult.data || []).map((order) => ({
            id: order.id,
            room: order.cloudbeds_room_id || '-',
            status: order.status || 'pending',
            createdAt: order.created_at,
          }))
        );

        setRecentTasks(
          (recentTasksResult.data || []).map((task) => ({
            id: task.id,
            room: task.cloudbeds_room_id || '-',
            status: task.status || 'pending',
            createdAt: task.created_at,
          }))
        );

        const dayKeys: string[] = [];
        const now = new Date();
        for (let i = ACTIVITY_WINDOW_DAYS - 1; i >= 0; i -= 1) {
          const day = new Date(now);
          day.setDate(now.getDate() - i);
          dayKeys.push(day.toISOString().slice(0, 10));
        }

        const conversationsByDay = new Map<string, number>();
        const ordersByDay = new Map<string, number>();
        const tasksCreatedByDay = new Map<string, number>();
        const tasksCompletedByDay = new Map<string, number>();

        (conversationsTrendResult.data || []).forEach((row) => {
          if (typeof row.created_at === 'string') {
            const key = toDayKey(row.created_at);
            if (dayKeys.includes(key)) {
              conversationsByDay.set(key, (conversationsByDay.get(key) || 0) + 1);
            }
          }
        });

        const statusCounts = new Map<string, number>();
        (ordersTrendResult.data || []).forEach((row) => {
          if (typeof row.created_at === 'string') {
            const key = toDayKey(row.created_at);
            if (dayKeys.includes(key)) {
              ordersByDay.set(key, (ordersByDay.get(key) || 0) + 1);
            }
          }

          if (typeof row.status === 'string') {
            statusCounts.set(row.status, (statusCounts.get(row.status) || 0) + 1);
          }
        });

        (tasksTrendResult.data || []).forEach((row) => {
          if (typeof row.created_at === 'string') {
            const key = toDayKey(row.created_at);
            if (dayKeys.includes(key)) {
              tasksCreatedByDay.set(key, (tasksCreatedByDay.get(key) || 0) + 1);
            }
          }

          if (typeof row.completed_at === 'string') {
            const key = toDayKey(row.completed_at);
            if (dayKeys.includes(key)) {
              tasksCompletedByDay.set(key, (tasksCompletedByDay.get(key) || 0) + 1);
            }
          }
        });

        setActivityData(
          dayKeys.map((dayKey) => ({
            date: dayKey,
            label: shortDayLabel(dayKey),
            conversations: conversationsByDay.get(dayKey) || 0,
            orders: ordersByDay.get(dayKey) || 0,
            tasks: tasksCreatedByDay.get(dayKey) || 0,
          }))
        );

        setOrdersStatusData(
          Array.from(statusCounts.entries())
            .map(([status, total]) => ({ status, total }))
            .sort((a, b) => b.total - a.total)
        );

        setTasksThroughputData(
          dayKeys.map((dayKey) => ({
            date: dayKey,
            label: shortDayLabel(dayKey),
            created: tasksCreatedByDay.get(dayKey) || 0,
            completed: tasksCompletedByDay.get(dayKey) || 0,
          }))
        );
      } finally {
        setPageLoading(false);
      }
    };

    void loadDashboardData();
  }, [user, supabase]);

  if (loading || !user || pageLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Skeleton className="h-8 w-48" />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    {ES.dashboard.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{ES.dashboard.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ES.dashboard.activeConversations}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.activeConversations}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ES.dashboard.pendingOrders}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.pendingOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ES.dashboard.pendingTasks}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.pendingTasks}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ES.dashboard.escalations}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.escalations}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Actividad diaria (14 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={activityChartConfig} className="min-h-[260px] w-full">
                  <AreaChart accessibilityLayer data={activityData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area
                      type="monotone"
                      dataKey="conversations"
                      stroke="var(--color-conversations)"
                      fill="var(--color-conversations)"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="var(--color-orders)"
                      fill="var(--color-orders)"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="tasks"
                      stroke="var(--color-tasks)"
                      fill="var(--color-tasks)"
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado de pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={ordersStatusChartConfig} className="min-h-[260px] w-full">
                  <BarChart accessibilityLayer data={ordersStatusData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      dataKey="status"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={6} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Flujo de tareas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={tasksThroughputChartConfig} className="min-h-[220px] w-full">
                  <LineChart accessibilityLayer data={tasksThroughputData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="created"
                      stroke="var(--color-created)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="var(--color-completed)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Carga operativa abierta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-4xl font-semibold tracking-tight">{openWorkload}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pedidos activos</span>
                    <Badge variant="secondary">{stats.pendingOrders}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tareas activas</span>
                    <Badge variant="secondary">{stats.pendingTasks}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Escalaciones</span>
                    <Badge variant="destructive">{stats.escalations}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{ES.dashboard.recentOrders}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ES.orders.emptyState}</p>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{ES.orders.room} {order.room}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary">{order.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{ES.dashboard.recentTasks}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay tareas</p>
                ) : (
                  recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{ES.orders.room} {task.room}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
