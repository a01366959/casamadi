'use client';

import { useAuth } from '@/lib/supabase/auth-provider';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  IconSend,
  IconPlus,
  IconX,
  IconBug,
  IconCreditCard,
  IconFlask,
} from '@tabler/icons-react';
import { ES } from '@/lib/spanish';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
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
    };

    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: [...s.messages, userMessage] }
        : s
    );
    setSessions(updatedSessions);
    setMessageInput('');
    setLoading(true);

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

      const data = await response.json();

      if (data.success) {
        // Add assistant response
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
          toolCalls: data.toolCalls,
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
    }
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

        <div className="flex flex-1 gap-4 p-4">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeSessionId} onValueChange={setActiveSessionId} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b mb-4">
                <TabsList className="w-auto">
                  {sessions.map((session) => (
                    <div key={session.id} className="relative">
                      <TabsTrigger value={session.id} className="pr-8">
                        {session.name}
                      </TabsTrigger>
                      {sessions.length > 1 && (
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
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
                >
                  <IconPlus className="h-4 w-4 mr-2" />
                  New Test
                </Button>
              </div>

              {sessions.map((session) => (
                <TabsContent key={session.id} value={session.id} className="flex-1 flex flex-col">
                  {/* Messages */}
                  <ScrollArea
                    ref={scrollRef}
                    className="flex-1 border rounded-lg p-4 mb-4 bg-muted/30"
                  >
                    <div className="space-y-3">
                      {session.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : msg.role === 'system'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-secondary'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            {msg.toolCalls && msg.toolCalls.length > 0 && (
                              <div className="mt-2 text-xs opacity-75">
                                <p className="font-semibold">Tools called:</p>
                                {msg.toolCalls.map((call: any, i: number) => (
                                  <p key={i}>{call.name}</p>
                                ))}
                              </div>
                            )}
                            <p className="text-xs mt-1 opacity-70">
                              {msg.timestamp.toLocaleTimeString('es-MX')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={loading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || !messageInput.trim()}
                      size="icon"
                    >
                      <IconSend className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={simulatePayment}
                      variant="outline"
                      size="icon"
                      title="Simular pago"
                    >
                      <IconCreditCard className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Debug Panel */}
          {debugOpen && (
            <Card className="w-80 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <IconBug className="h-4 w-4" />
                  <CardTitle className="text-base">Debug</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    SANDBOX
                  </Badge>
                </div>
                <button
                  onClick={() => setDebugOpen(false)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="text-xs space-y-2">
                  <div>
                    <p className="font-semibold text-muted-foreground">Session ID</p>
                    <p className="font-mono break-all text-xs opacity-75">
                      {activeSessionId}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Messages</p>
                    <p className="text-sm">
                      {activeSession?.messages.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Channel</p>
                    <Badge variant="secondary">sandbox</Badge>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Status</p>
                    <Badge variant="outline" className="bg-green-500/10">
                      Ready
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="text-xs flex-1 overflow-auto">
                  <p className="font-semibold text-muted-foreground mb-2">
                    Quick Commands
                  </p>
                  <div className="space-y-1 text-xs">
                    <p>📅 "Quiero reservar 2 noches"</p>
                    <p>🔗 "Necesito una habitación doble"</p>
                    <p>💳 "Confirmar reservación"</p>
                    <p>📞 "Necesito más toallas"</p>
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
