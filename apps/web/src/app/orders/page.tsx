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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import {
  IconClipboardList,
  IconDoor,
  IconClock,
  IconShoppingCart,
} from '@tabler/icons-react';
import { ES } from '@/lib/spanish';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

interface Order {
  id: string;
  room_number: string;
  guest_name: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  created_at: string;
  guest_id: string;
}

const STATUSES = ['pending', 'preparing', 'ready', 'delivered'] as const;
const STATUS_LABELS: Record<typeof STATUSES[number], string> = {
  pending: ES.orders.pending,
  preparing: ES.orders.preparing,
  ready: ES.orders.ready,
  delivered: ES.orders.delivered,
};

const STATUS_COLORS: Record<typeof STATUSES[number], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            room_number,
            guest_id,
            status,
            created_at,
            guests (
              name
            ),
            order_items (
              id,
              name,
              quantity
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedOrders = (data || []).map((order: any) => ({
          id: order.id,
          room_number: order.room_number,
          guest_name: order.guests?.name || 'Guest',
          items: order.order_items || [],
          status: order.status,
          created_at: order.created_at,
          guest_id: order.guest_id,
        }));

        setOrders(formattedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();

      // Real-time subscription
      const subscription = supabase
        .channel('orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, supabase]);

  const handleDragStart = (order: Order) => {
    setDraggedOrder(order);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: typeof STATUSES[number]) => {
    if (!draggedOrder) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', draggedOrder.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((order) =>
          order.id === draggedOrder.id ? { ...order, status } : order
        )
      );
    } catch (err) {
      console.error('Error updating order:', err);
    } finally {
      setDraggedOrder(null);
    }
  };

  if (authLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-8 w-48" />
          </header>
          <div className="flex flex-1 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 px-2">
                <Skeleton className="h-10 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-32" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const ordersByStatus = {
    pending: orders.filter((o) => o.status === 'pending'),
    preparing: orders.filter((o) => o.status === 'preparing'),
    ready: orders.filter((o) => o.status === 'ready'),
    delivered: orders.filter((o) => o.status === 'delivered'),
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/orders">
                  {ES.nav.orders}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{ES.orders.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 overflow-x-auto bg-muted/30 p-4">
          <div className="flex gap-4 min-w-full">
            {STATUSES.map((status) => (
              <div
                key={status}
                className="flex-shrink-0 w-80 flex flex-col gap-2"
              >
                {/* Column Header */}
                <div className="flex items-center gap-2 px-2 py-1">
                  <h3 className="font-semibold text-sm">
                    {STATUS_LABELS[status]}
                  </h3>
                  <Badge variant="secondary" className="ml-auto">
                    {ordersByStatus[status].length}
                  </Badge>
                </div>

                {/* Droppable Column */}
                <ScrollArea
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(status)}
                  className="flex-1 rounded-lg border-2 border-dashed border-muted bg-background p-2 transition-colors hover:border-primary/50 min-h-96"
                >
                  <div className="space-y-2">
                    {ordersByStatus[status].length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        {ES.orders.emptyState}
                      </div>
                    ) : (
                      ordersByStatus[status].map((order) => (
                        <div
                          key={order.id}
                          draggable
                          onDragStart={() => handleDragStart(order)}
                          className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                            draggedOrder?.id === order.id
                              ? 'opacity-50 scale-95'
                              : 'hover:shadow-md'
                          } ${
                            order.status === 'delivered'
                              ? 'bg-muted'
                              : 'bg-card border border-border'
                          }`}
                        >
                          <div className="space-y-2">
                            {/* Room & Guest */}
                            <div className="flex items-center gap-2">
                              <IconDoor className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {order.guest_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ES.orders.room} {order.room_number}
                                </p>
                              </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-1">
                              {order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs text-muted-foreground flex justify-between"
                                >
                                  <span className="truncate">{item.name}</span>
                                  <span className="ml-2 shrink-0">
                                    x{item.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                              <IconClock className="h-3 w-3" />
                              {new Date(order.created_at).toLocaleTimeString(
                                'es-MX',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
