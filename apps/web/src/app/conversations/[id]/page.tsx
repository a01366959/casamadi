'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import {
  IconArrowLeft,
  IconSend,
  IconPhone,
  IconMail,
  IconDoor,
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandFacebook,
  IconFlask,
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

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface ConversationDetail {
  id: string;
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'sandbox';
  status: 'active' | 'resolved' | 'inactive';
  created_at: string;
  guests: {
    name: string;
    phone: string;
    email: string;
    room_number: string;
  };
}

const CHANNEL_ICONS = {
  whatsapp: IconBrandWhatsapp,
  instagram: IconBrandInstagram,
  messenger: IconBrandFacebook,
  sandbox: IconFlask,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-800',
  instagram: 'bg-pink-100 text-pink-800',
  messenger: 'bg-blue-100 text-blue-800',
  sandbox: 'bg-purple-100 text-purple-800',
};

export default function ConversationThreadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch conversation details
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('conversations')
          .select(`
            id,
            channel,
            status,
            created_at,
            guests (
              name,
              phone,
              email,
              room_number
            )
          `)
          .eq('id', conversationId)
          .single();

        if (fetchError) throw fetchError;
        
        // Handle guests as either array or object
        const guests = Array.isArray(data?.guests) ? data.guests[0] : data?.guests;
        setConversation({
          ...data,
          guests,
        } as ConversationDetail);
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('No se pudo cargar la conversación');
      }
    };

    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId, supabase]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setMessages(data as Message[]);
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId, supabase]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, supabase]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversationId) return;

    try {
      setSendingMessage(true);
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: messageInput,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
      setMessageInput('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(ES.conversations.messageError);
    } finally {
      setSendingMessage(false);
    }
  };

  if (authLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-8 w-48" />
          </header>
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-muted-foreground">{ES.common.loading}</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Show skeleton layout while loading conversation data
  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Skeleton className="h-8 w-48" />
          </header>

          <div className="flex flex-1 gap-4 overflow-hidden p-4">
            {/* Messages area skeleton */}
            <div className="flex flex-1 flex-col gap-2 overflow-hidden">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="flex-1 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-10" />
                <Skeleton className="w-10 h-10" />
              </div>
            </div>

            {/* Guest info sidebar skeleton (hidden on mobile) */}
            <div className="hidden w-80 flex-col gap-4 lg:flex">
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!conversation) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/conversations"
                    className="flex items-center gap-2"
                  >
                    <IconArrowLeft className="h-4 w-4" />
                    {ES.conversations.backToList}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex flex-1 items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconArrowLeft />
                </EmptyMedia>
                <EmptyTitle>{ES.conversations.notFound}</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => router.push('/conversations')}
                >
                  {ES.conversations.backToList}
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const ChannelIcon = CHANNEL_ICONS[conversation.channel];
  const statusColor = {
    active: 'gap-1.5',
    resolved: 'gap-1.5',
    inactive: 'gap-1.5',
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
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/conversations"
                  className="flex items-center gap-2"
                >
                  <IconArrowLeft className="h-4 w-4" />
                  {ES.conversations.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {conversation.guests?.name || ES.conversations.notFound}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          {/* Messages area */}
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {/* Header card with guest name and channel */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChannelIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">
                        {ES.conversations.threadTitle} {conversation.guests?.name}
                      </CardTitle>
                      <CardDescription>
                        {conversation.channel.charAt(0).toUpperCase() +
                          conversation.channel.slice(1)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={conversation.status === 'active' ? 'default' : conversation.status === 'resolved' ? 'secondary' : 'outline'}>
                    {ES.common[conversation.status]}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Messages scroll area */}
            <ScrollArea
              ref={scrollRef}
              className="flex-1 rounded-lg border bg-muted/30 p-4"
            >
              {messages.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <IconSend />
                    </EmptyMedia>
                    <EmptyTitle>{ES.conversations.noMessages}</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.role === 'system'
                            ? 'bg-muted text-muted-foreground italic'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="mt-1 text-xs opacity-70">
                          {new Date(message.created_at).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <div className="flex gap-2">
              <Input
                placeholder={ES.conversations.typePlaceholder}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendingMessage}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
              >
                <IconSend className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          {/* Guest info sidebar (hidden on mobile) */}
          <div className="hidden w-80 flex-col gap-4 lg:flex">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>{ES.conversations.guestInfo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversation.guests?.name && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Nombre
                    </p>
                    <p className="text-sm font-medium">{conversation.guests.name}</p>
                  </div>
                )}

                {conversation.guests?.phone && (
                  <div className="flex items-start gap-2">
                    <IconPhone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {ES.conversations.phone}
                      </p>
                      <p className="text-sm">{conversation.guests.phone}</p>
                    </div>
                  </div>
                )}

                {conversation.guests?.email && (
                  <div className="flex items-start gap-2">
                    <IconMail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {ES.conversations.email}
                      </p>
                      <p className="text-sm">{conversation.guests.email}</p>
                    </div>
                  </div>
                )}

                {conversation.guests?.room_number && (
                  <div className="flex items-start gap-2">
                    <IconDoor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {ES.conversations.roomNumber}
                      </p>
                      <p className="text-sm">{conversation.guests.room_number}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
