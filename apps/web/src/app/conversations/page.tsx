'use client';

import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import {
  IconSearch,
  IconMessageCircle,
  IconInbox,
} from '@tabler/icons-react';
import { ES } from '@/lib/spanish';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface Conversation {
  id: string;
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'sandbox';
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: 'active' | 'resolved' | 'inactive' | 'human_active' | 'escalated' | 'takeover' | 'closed';
  guests: {
    name: string;
    phone: string;
  };
}

interface ConversationQueryRow {
  id: string;
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'sandbox';
  created_at: string;
  updated_at: string;
  status: 'active' | 'resolved' | 'inactive' | 'human_active' | 'escalated' | 'takeover' | 'closed';
  guests:
    | {
        name: string;
        phone: string;
      }
    | Array<{
        name: string;
        phone: string;
      }>
    | null;
}

interface MessagePreviewRow {
  conversation_id: string;
  content: string;
  created_at: string;
}

export default function ConversationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const selectedId = searchParams.get('id');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('conversations')
          .select(`
            id,
            channel,
            status,
            created_at,
            updated_at,
            guests (
              name,
              phone
            )
          `)
          .order('updated_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;

        const conversationRows = (data || []) as ConversationQueryRow[];
        const conversationIds = conversationRows.map((conv) => conv.id);

        const messagePreviewByConversation = new Map<string, MessagePreviewRow>();
        if (conversationIds.length > 0) {
          const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('conversation_id, content, created_at')
            .in('conversation_id', conversationIds)
            .order('created_at', { ascending: false });

          if (messagesError) {
            throw messagesError;
          }

          ((messagesData || []) as MessagePreviewRow[]).forEach((message) => {
            if (!messagePreviewByConversation.has(message.conversation_id)) {
              messagePreviewByConversation.set(message.conversation_id, message);
            }
          });
        }

        const conversations = conversationRows.map((conv) => {
          const lastMessage = messagePreviewByConversation.get(conv.id);
          return {
            id: conv.id,
            channel: conv.channel,
            last_message: lastMessage?.content || 'Sin mensajes',
            last_message_at: lastMessage?.created_at || conv.updated_at || conv.created_at,
            unread_count: 0,
            status: conv.status,
            guests: Array.isArray(conv.guests) ? conv.guests[0] : conv.guests,
          };
        });

        setConversations(conversations as Conversation[]);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error loading conversations';
        setError(message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchConversations();

      // Subscribe to real-time updates
      const subscription = supabase
        .channel('conversations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, supabase]);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(
    (conv) => {
      const guestName = conv.guests?.name || '';
      const guestPhone = conv.guests?.phone || '';
      return (
        guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guestPhone.includes(searchTerm)
      );
    }
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  if (authLoading || !user) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Skeleton className="h-8 w-48" />
          </header>
          <div className="flex flex-1 gap-4 overflow-hidden p-4">
            {/* Sidebar skeleton */}
            <aside className="w-64 flex flex-col gap-2 border-r overflow-hidden">
              <Skeleton className="h-10" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </aside>
            {/* Main area skeleton */}
            <main className="flex-1 flex flex-col items-center justify-center">
              <Skeleton className="h-32 w-32 rounded-lg" />
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'human_active':
        return 'destructive';
      case 'resolved':
        return 'secondary';
      case 'escalated':
        return 'destructive';
      case 'takeover':
        return 'destructive';
      case 'inactive':
      case 'closed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getChannelLabel = (channel: string): string => {
    const labels: Record<string, string> = {
      whatsapp: 'WA',
      instagram: 'IG',
      messenger: 'MS',
      sandbox: 'SB',
    };
    return labels[channel] || '';
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/conversations">
                  {ES.nav.conversations}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {selectedConversation ? selectedConversation.guests?.name || 'Conversación' : ES.conversations.notFound}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1">
          {/* Conversations Sidebar */}
          <aside className="w-full max-w-sm border-r flex flex-col h-full">
            {/* Search */}
            <div className="p-4 border-b space-y-2">
              <h2 className="text-lg font-semibold">{ES.nav.conversations}</h2>
              <div className="relative">
                <IconSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {error && (
                  <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <IconMessageCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {searchTerm ? 'No encontrado' : 'Sin conversaciones'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() =>
                          router.push(`/conversations/${conversation.id}`)
                        }
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedId === conversation.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {getChannelLabel(conversation.channel)}
                              </span>
                              <p className="font-medium text-sm truncate">
                                {conversation.guests?.name || 'Guest'}
                              </p>
                              {conversation.unread_count > 0 && (
                                <Badge
                                  variant={selectedId === conversation.id ? 'secondary' : 'default'}
                                  className="h-5 w-5 rounded-full flex items-center justify-center p-0 text-xs"
                                >
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                            <p
                              className={`text-xs mt-1 truncate ${
                                selectedId === conversation.id
                                  ? 'text-primary-foreground/80'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {conversation.last_message}
                            </p>
                            <p
                              className={`text-xs mt-0.5 ${
                                selectedId === conversation.id
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground/70'
                              }`}
                            >
                              {new Date(conversation.last_message_at).toLocaleDateString('es-MX')}
                            </p>
                          </div>
                          <Badge
                            variant={getStatusBadgeVariant(conversation.status)}
                            className="text-xs flex-shrink-0"
                          >
                            {conversation.status === 'active' && '●'}
                            {conversation.status === 'human_active' && '!'}
                            {conversation.status === 'escalated' && '!'}
                            {conversation.status === 'takeover' && '!'}
                            {conversation.status === 'resolved' && '✓'}
                            {conversation.status === 'inactive' && '○'}
                            {conversation.status === 'closed' && '○'}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col items-center justify-center p-4">
            {selectedConversation ? (
              <Card className="w-full max-w-2xl">
                <CardHeader>
                  <CardTitle>{selectedConversation.guests?.name || 'Conversation'}</CardTitle>
                  <CardDescription>
                    {selectedConversation.guests?.phone}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Vista detallada de la conversación en construcción...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconInbox />
                  </EmptyMedia>
                  <EmptyTitle>Selecciona una conversación</EmptyTitle>
                  <EmptyDescription>
                    Elige una conversación de la lista para ver los detalles y el historial de mensajes.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
