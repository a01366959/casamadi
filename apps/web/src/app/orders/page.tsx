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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import {
  IconDoor,
  IconClock,
} from '@tabler/icons-react';
import { ES } from '@/lib/spanish';

interface OrderItem {
  id: string | number;
  name: string;
  quantity: number;
}

interface Order {
  id: string;
  room_number: string;
  guest_name: string;
  items: OrderItem[];
  status: 'pending' | 'assigned' | 'preparing' | 'delivered' | 'rejected';
  created_at: string;
  conversation_id: string | null;
  notes?: string | null;
}

const STATUSES = ['pending', 'assigned', 'preparing', 'delivered', 'rejected'] as const;
const STATUS_LABELS: Record<typeof STATUSES[number], string> = {
  pending: ES.orders.pending,
  assigned: 'Asignado',
  preparing: ES.orders.preparing,
  delivered: ES.orders.delivered,
  rejected: 'Rechazado',
};

function normalizePedidoItems(rawItems: unknown): OrderItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map((item, index) => {
    const record =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    const name =
      typeof record.item_name === 'string'
        ? record.item_name
        : typeof record.name === 'string'
          ? record.name
          : 'Artículo';

    const quantityRaw =
      typeof record.quantity === 'number'
        ? record.quantity
        : typeof record.quantity === 'string'
          ? Number(record.quantity)
          : 1;

    return {
      id:
        typeof record.id === 'string' || typeof record.id === 'number'
          ? record.id
          : index,
      name,
      quantity: Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1,
    };
  });
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
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
        const { data, error } = await supabase
          .from('pedidos')
          .select('id, cloudbeds_room_id, conversation_id, items, status, created_at, notes')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const conversationIds = (data || [])
          .map((pedido) => pedido.conversation_id)
          .filter((id): id is string => typeof id === 'string');

        const uniqueConversationIds = Array.from(new Set(conversationIds));

        const guestNamesByConversationId = new Map<string, string>();
        if (uniqueConversationIds.length > 0) {
          const { data: conversationsData, error: convError } = await supabase
            .from('conversations')
            .select('id, guests(name)')
            .in('id', uniqueConversationIds);

          if (convError) {
            throw convError;
          }

          (conversationsData || []).forEach((conversation) => {
            const guestRelation = conversation.guests;
            const guestName = Array.isArray(guestRelation)
              ? guestRelation[0]?.name
              : guestRelation?.name;

            if (typeof guestName === 'string') {
              guestNamesByConversationId.set(conversation.id, guestName);
            }
          });
        }

        const formattedOrders = (data || []).map((pedido) => ({
          id: pedido.id,
          room_number: pedido.cloudbeds_room_id || '-',
          guest_name:
            (pedido.conversation_id && guestNamesByConversationId.get(pedido.conversation_id)) ||
            'Huésped',
          items: normalizePedidoItems(pedido.items),
          status: pedido.status,
          created_at: pedido.created_at,
          conversation_id: pedido.conversation_id,
          notes: pedido.notes,
        }));

        setOrders(formattedOrders as Order[]);
      } catch (err) {
        console.error('Error fetching orders:', err);
      }
    };

    if (user) {
      fetchOrders();

      // Real-time subscription
      const subscription = supabase
        .channel('pedidos')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pedidos' },
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
        .from('pedidos')
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
    assigned: orders.filter((o) => o.status === 'assigned'),
    preparing: orders.filter((o) => o.status === 'preparing'),
    delivered: orders.filter((o) => o.status === 'delivered'),
    rejected: orders.filter((o) => o.status === 'rejected'),
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
