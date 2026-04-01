'use client';

import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
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
import { ButtonGroup } from '@/components/ui/button-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  IconSend,
  IconPlus,
  IconX,
  IconBug,
  IconCreditCard,
  IconCopy,
  IconCheck,
  IconClock,
  IconThumbUp,
  IconThumbDown,
  IconRefresh,
  IconMessage,
} from '@tabler/icons-react';
import { ES } from '@/lib/spanish';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  responseTime?: number;
  toolCalls?: any[];
  reaction?: 'positive' | 'negative' | null;
}

interface SandboxSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
}

export default function SandboxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<SandboxSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugOpen, setDebugOpen] = useState(true);
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check auth access
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Initialize first session
  useEffect(() => {
    if (!activeSessionId && sessions.length === 0) {
      createNewSession();
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions]);

  const createNewSession = () => {
    const id = `session-${Date.now()}`;
    const newSession: SandboxSession = {
      id,
      name: `Test ${sessions.length + 1}`,
      messages: [
        {
          id: 'init-1',
          role: 'system',
          content: 'Sandbox session started. Testing agent in Spanish.',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(id);
  };

  const deleteSession = (id: string) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id && filtered.length > 0) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeSessionId) return;

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (!activeSession) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageInput,
      timestamp: new Date(),
      reaction: null,
    };

    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: [...s.messages, userMessage] }
        : s
    );
    setSessions(updatedSessions);
    setMessageInput('');
    setLoading(true);
    setRequestStartTime(Date.now());

    try {
      // Call agent via /api/sandbox/chat
      const response = await fetch('/api/sandbox/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: messageInput,
        }),
      });

      const responseTime = Date.now() - (requestStartTime || Date.now());
      const data = await response.json();

      if (data.success) {
        // Add assistant response
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
          responseTime,
          toolCalls: data.toolCalls,
          reaction: null,
        };

        setSessions((prevSessions) =>
          prevSessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, assistantMessage] }
              : s
          )
        );
      } else {
        // Add error message
        const errorMessage: Message = {
          id: `msg-${Date.now()}-err`,
          role: 'system',
          content: `Error: ${data.error || 'Failed to get response'}`,
          timestamp: new Date(),
          reaction: null,
        };

        setSessions((prevSessions) =>
          prevSessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, errorMessage] }
              : s
          )
        );
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'system',
        content: `Network error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        reaction: null,
      };

      setSessions((prevSessions) =>
        prevSessions.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setLoading(false);
      setRequestStartTime(null);
    }
  };

  const addReaction = (messageId: string, reaction: 'positive' | 'negative') => {
    setSessions((prevSessions) =>
      prevSessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: s.messages.map((msg) =>
                msg.id === messageId
                  ? { ...msg, reaction: msg.reaction === reaction ? null : reaction }
                  : msg
              ),
            }
          : s
      )
    );
  };

  const copyMessageContent = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const simulatePayment = async () => {
    if (!activeSessionId) return;

    try {
      const response = await fetch('/api/sandbox/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId }),
      });

      const data = await response.json();

      const systemMessage: Message = {
        id: `msg-${Date.now()}-payment`,
        role: 'system',
        content: data.message || 'Payment simulated',
        timestamp: new Date(),
        reaction: null,
      };

      setSessions((prevSessions) =>
        prevSessions.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, systemMessage] }
            : s
        )
      );
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'system',
        content: `Payment simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        reaction: null,
      };

      setSessions((prevSessions) =>
        prevSessions.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    }
  };

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
            {/* Tabs skeleton */}
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-24" />
                ))}
              </div>
              <Skeleton className="flex-1 rounded-lg" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const userRole = (user?.user_metadata as any)?.role;

  const activeSession = sessions.find((s) => s.id === activeSessionId);

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
                <BreadcrumbLink href="/sandbox">
                  {ES.nav.sandbox}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {activeSession?.name || 'Sandbox'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeSessionId} onValueChange={setActiveSessionId} className="flex-1 flex flex-col">
              {/* Tabs Header */}
              <div className="flex items-center justify-between border-b px-4 pt-4">
                <TabsList className="w-auto">
                  {sessions.map((session) => (
                    <div key={session.id} className="relative">
                      <TabsTrigger value={session.id} className="pr-8">
                        {session.name}
                      </TabsTrigger>
                      {sessions.length > 1 && (
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
                        >
                          <IconX className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </TabsList>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={createNewSession}
                  className="ml-2"
                >
                  <IconPlus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>

              {/* Chat Content */}
              {sessions.map((session) => (
                <TabsContent
                  key={session.id}
                  value={session.id}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Messages Area */}
                  {session.messages.length === 0 ? (
                    <Empty className="flex-1 flex items-center justify-center">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <IconMessage className="h-12 w-12" />
                        </EmptyMedia>
                        <EmptyTitle>Start a Conversation</EmptyTitle>
                        <EmptyDescription className="max-w-xs text-pretty">
                          Begin testing the agent by sending your first message. Type in Spanish or English.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <p className="text-xs text-muted-foreground">
                          💡 Try: "Quiero hacer una reserva"
                        </p>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <ScrollArea
                      ref={scrollRef}
                      className="flex-1 overflow-hidden"
                    >
                      <div className="px-4 py-4 space-y-4 max-w-4xl">
                        {session.messages.map((msg) => (
                          <ContextMenu key={msg.id}>
                            <ContextMenuTrigger asChild>
                              <div
                                className={`flex ${
                                  msg.role === 'user'
                                    ? 'justify-end'
                                    : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`group max-w-xl lg:max-w-2xl px-4 py-3 rounded-lg ${
                                    msg.role === 'user'
                                      ? 'bg-primary text-primary-foreground rounded-br-none'
                                      : msg.role === 'system'
                                      ? 'bg-muted text-muted-foreground rounded-bl-none'
                                      : 'bg-secondary text-secondary-foreground rounded-bl-none'
                                  }`}
                                >
                                  {/* Message Content */}
                                  <p className="text-sm leading-relaxed">
                                    {msg.content}
                                  </p>

                                  {/* Tool Calls Info */}
                                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-current border-opacity-20">
                                      <p className="text-xs font-semibold opacity-75 mb-1">
                                        Tools Used:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {msg.toolCalls.map(
                                          (call: any, i: number) => (
                                            <Badge
                                              key={i}
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {call.name}
                                            </Badge>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Message Metadata */}
                                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current border-opacity-20 opacity-70">
                                    <span className="text-xs">
                                      {msg.timestamp.toLocaleTimeString(
                                        'es-MX',
                                        {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        }
                                      )}
                                    </span>
                                    {msg.responseTime && (
                                      <>
                                        <span className="text-opacity-50">•</span>
                                        <span className="text-xs flex items-center gap-1">
                                          <IconClock className="h-3 w-3" />
                                          {msg.responseTime}ms
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* Reactions for Assistant Messages */}
                                  {msg.role === 'assistant' && (
                                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() =>
                                          addReaction(msg.id, 'positive')
                                        }
                                        className={`p-1.5 rounded hover:bg-black/10 transition-colors ${
                                          msg.reaction === 'positive'
                                            ? 'bg-black/10'
                                            : ''
                                        }`}
                                        title="Good response"
                                      >
                                        <IconThumbUp
                                          className={`h-4 w-4 ${
                                            msg.reaction === 'positive'
                                              ? 'fill-current'
                                              : ''
                                          }`}
                                        />
                                      </button>
                                      <button
                                        onClick={() =>
                                          addReaction(msg.id, 'negative')
                                        }
                                        className={`p-1.5 rounded hover:bg-black/10 transition-colors ${
                                          msg.reaction === 'negative'
                                            ? 'bg-black/10'
                                            : ''
                                        }`}
                                        title="Bad response"
                                      >
                                        <IconThumbDown
                                          className={`h-4 w-4 ${
                                            msg.reaction === 'negative'
                                              ? 'fill-current'
                                              : ''
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ContextMenuTrigger>

                            {/* Context Menu */}
                            <ContextMenuContent className="w-48">
                              <ContextMenuItem
                                onClick={() =>
                                  copyMessageContent(msg.content, msg.id)
                                }
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <IconCheck className="h-4 w-4 mr-2" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <IconCopy className="h-4 w-4 mr-2" />
                                    Copy
                                  </>
                                )}
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem disabled>
                                <span className="text-xs text-muted-foreground">
                                  ID: {msg.id.substring(0, 12)}...
                                </span>
                              </ContextMenuItem>
                              {msg.responseTime && (
                                <ContextMenuItem disabled>
                                  <span className="text-xs text-muted-foreground">
                                    Response: {msg.responseTime}ms
                                  </span>
                                </ContextMenuItem>
                              )}
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                variant="destructive"
                                onClick={() => {
                                  setSessions((prev) =>
                                    prev.map((s) =>
                                      s.id === activeSessionId
                                        ? {
                                            ...s,
                                            messages: s.messages.filter(
                                              (m) => m.id !== msg.id
                                            ),
                                          }
                                        : s
                                    )
                                  );
                                }}
                              >
                                Delete
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Input Area */}
                  <div className="border-t bg-background p-4 space-y-2">
                    {/* Action Buttons */}
                    <ButtonGroup>
                      <Button
                        onClick={simulatePayment}
                        variant="outline"
                        size="sm"
                        title="Simulate payment webhook"
                        disabled={loading}
                      >
                        <IconCreditCard className="h-4 w-4 mr-2" />
                        Simulate Payment
                      </Button>
                      <Button
                        onClick={() => setDebugOpen(!debugOpen)}
                        variant="outline"
                        size="sm"
                        title="Toggle debug panel"
                      >
                        <IconBug className="h-4 w-4 mr-2" />
                        Debug
                      </Button>
                    </ButtonGroup>

                    {/* Message Input */}
                    <InputGroup>
                      <TextareaAutosize
                        data-slot="input-group-control"
                        className="flex field-sizing-content min-h-12 max-h-32 w-full resize-none rounded-md bg-transparent px-3 py-2.5 text-sm transition-[color,box-shadow] outline-none placeholder:text-muted-foreground"
                        placeholder="Escribe un mensaje... (Shift+Enter para nueva línea)"
                        value={messageInput}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageInput(e.target.value)}
                        onKeyPress={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                          if (
                            e.key === 'Enter' &&
                            !e.shiftKey &&
                            !loading
                          ) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={loading}
                      />
                      <InputGroupAddon align="block-end">
                        <InputGroupButton
                          className="ml-auto"
                          size="sm"
                          variant="default"
                          onClick={sendMessage}
                          disabled={
                            loading ||
                            !messageInput.trim()
                          }
                        >
                          {loading ? (
                            <div className="h-4 w-4 border border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <IconSend className="h-4 w-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Debug Sidebar */}
          {debugOpen && (
            <Card className="w-80 flex flex-col border-l rounded-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <IconBug className="h-4 w-4" />
                  <CardTitle className="text-sm">Debug Panel</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    SANDBOX
                  </Badge>
                </div>
                <button
                  onClick={() => setDebugOpen(false)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden pt-4">
                {/* Session Info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    Session
                  </h3>
                  <div className="space-y-1 text-xs">
                    <p className="break-all font-mono text-muted-foreground">
                      {activeSessionId.substring(0, 20)}...
                    </p>
                    <p className="text-muted-foreground">
                      Messages: {activeSession?.messages.length || 0}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Channel: sandbox
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                {activeSession && activeSession.messages.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground">
                        Stats
                      </h3>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          User Messages:{' '}
                          {
                            activeSession.messages.filter(
                              (m) => m.role === 'user'
                            ).length
                          }
                        </p>
                        <p>
                          Assistant Messages:{' '}
                          {
                            activeSession.messages.filter(
                              (m) => m.role === 'assistant'
                            ).length
                          }
                        </p>
                        <p>
                          Avg Response:{' '}
                          {(
                            activeSession.messages
                              .filter((m) => m.responseTime)
                              .reduce(
                                (sum, m) => sum + (m.responseTime || 0),
                                0
                              ) /
                            activeSession.messages.filter(
                              (m) => m.responseTime
                            ).length
                          ).toFixed(0)}
                          ms
                        </p>
                      </div>
                    </div>

                    <Separator />
                  </>
                )}

                {/* Quick Commands */}
                <div className="space-y-2 flex-1 overflow-auto">
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    Quick Test
                  </h3>
                  <div className="space-y-1 text-xs">
                    <p className="text-muted-foreground">
                      📅 "Quiero reservar 2 noches"
                    </p>
                    <p className="text-muted-foreground">
                      🔗 "Necesito una habitación doble"
                    </p>
                    <p className="text-muted-foreground">
                      💳 "Confirmar reservación"
                    </p>
                    <p className="text-muted-foreground">
                      📞 "Necesito más toallas"
                    </p>
                    <p className="text-muted-foreground">
                      ❌ "Cancelar reservación"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
