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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  IconSend,
  IconSettings,
  IconBug,
  IconCopy,
  IconCheck,
  IconClock,
  IconThumbUp,
  IconThumbDown,
  IconMessage,
  IconX,
  IconDownload,
} from '@tabler/icons-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  responseTime?: number;
  toolCalls?: any[];
  reaction?: 'positive' | 'negative' | null;
  requestPayload?: any;
  responsePayload?: any;
}

interface SandboxSession {
  id: string;
  name: string;
  phone: string;
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
  const [debugOpen, setDebugOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [hotelId, setHotelId] = useState('bernal');
  const [agentUrl, setAgentUrl] = useState('');

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
    const phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const newSession: SandboxSession = {
      id,
      name: `Chat ${sessions.length + 1}`,
      phone,
      messages: [],
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

    const userMessageText = messageInput;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessageText,
      timestamp: new Date(),
    };

    setSessions((prevSessions) =>
      prevSessions.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMessage] }
          : s
      )
    );

    setMessageInput('');
    setLoading(true);
    setRequestStartTime(Date.now());

    try {
      const requestPayload = {
        hotel_id: hotelId,
        phone: activeSession.phone,
        message: userMessageText,
      };

      const response = await fetch('/api/sandbox/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const responseTime = Date.now() - (requestStartTime || Date.now());
      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.reply || 'No response',
          timestamp: new Date(),
          responseTime,
          toolCalls: data.toolCalls || [],
          requestPayload,
          responsePayload: data,
        };

        setSessions((prevSessions) =>
          prevSessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, assistantMessage] }
              : s
          )
        );
      } else {
        const errorMessage: Message = {
          id: `msg-${Date.now()}-err`,
          role: 'system',
          content: `❌ Error: ${data.error || 'Agent error'}`,
          timestamp: new Date(),
          requestPayload,
          responsePayload: data,
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
        content: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const exportConversation = () => {
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (!activeSession) return;

    const data = {
      session: activeSession,
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandbox-${activeSession.id}.json`;
    a.click();
  };

  const simulatePayment = async (status: 'completed' | 'failed') => {
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (!activeSession) return;

    try {
      const response = await fetch('/api/sandbox/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: hotelId,
          reservation_id: `test-res-${Date.now()}`,
          status,
          amount: Math.random() * 5000,
        }),
      });

      if (response.ok) {
        const paymentMessage: Message = {
          id: `msg-${Date.now()}-payment`,
          role: 'system',
          content: `💳 Payment ${status === 'completed' ? '✅ Completed' : '❌ Failed'}`,
          timestamp: new Date(),
        };

        setSessions((prevSessions) =>
          prevSessions.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, paymentMessage] }
              : s
          )
        );
      }
    } catch (error) {
      console.error('Payment simulation failed:', error);
    }
  };

  if (authLoading || !user) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <Skeleton className="h-8 w-48" />
          </header>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/sandbox">Sandbox</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeSession?.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDebugOpen(!debugOpen)}
              title="Debug panel"
              className="hover:bg-muted"
            >
              <IconBug className="h-4 w-4" />
            </Button>

            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" title="Settings" className="hover:bg-muted">
                  <IconSettings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-96">
                <SheetHeader>
                  <SheetTitle>Sandbox Settings</SheetTitle>
                  <SheetDescription>Configure agent and test parameters</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotel" className="text-sm font-medium">Hotel ID</Label>
                    <Input
                      id="hotel"
                      value={hotelId}
                      onChange={(e) => setHotelId(e.target.value)}
                      placeholder="bernal"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-url" className="text-sm font-medium">Agent URL</Label>
                    <Input
                      id="agent-url"
                      value={agentUrl}
                      onChange={(e) => setAgentUrl(e.target.value)}
                      placeholder="http://localhost:5001"
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use default or environment variable
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Payment Simulation</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => simulatePayment('completed')}
                        className="flex-1"
                      >
                        ✅ Success
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => simulatePayment('failed')}
                        className="flex-1"
                      >
                        ❌ Failed
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportConversation}
                    className="w-full"
                  >
                    <IconDownload className="h-4 w-4 mr-2" />
                    Export Conversation
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Session Tabs */}
            <div className="flex gap-2 pb-4 border-b overflow-x-auto">
              {sessions.map((session) => (
                <div key={session.id} className="relative group">
                  <Button
                    variant={activeSessionId === session.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveSessionId(session.id)}
                    className="pr-8 whitespace-nowrap"
                  >
                    {session.name}
                  </Button>
                  {sessions.length > 1 && (
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all"
                    >
                      <IconX className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={createNewSession}
                className="whitespace-nowrap"
              >
                + New
              </Button>
            </div>

            {/* Messages Area */}
            {activeSession?.messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <IconMessage className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <div>
                    <h3 className="font-semibold text-foreground">Start a Conversation</h3>
                    <p className="text-sm text-muted-foreground">
                      Send your first message to begin testing
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => setMessageInput('¿Quiero hacer una reserva?')}>
                      💡 "¿Quiero hacer una reserva?"
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea ref={scrollRef} className="flex-1 pr-4">
                <div className="space-y-4 py-4">
                  {activeSession?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      } transition-all`}
                    >
                      <div
                        className={`group max-w-md lg:max-w-lg px-4 py-2.5 rounded-lg shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : msg.role === 'system'
                            ? 'bg-amber-50 text-amber-900 rounded-bl-none border border-amber-200'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed break-words">
                          {msg.content}
                        </p>

                        {/* Tool Calls */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                            <p className="text-xs font-semibold opacity-75 mb-1">Tools:</p>
                            <div className="flex flex-wrap gap-1">
                              {msg.toolCalls.map((call: any, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {call.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-current border-opacity-20 opacity-70 text-xs">
                          <span>
                            {msg.timestamp.toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.responseTime && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <IconClock className="h-3 w-3" />
                                {msg.responseTime}ms
                              </span>
                            </>
                          )}
                        </div>

                        {/* Assistant Actions */}
                        {msg.role === 'assistant' && (
                          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => addReaction(msg.id, 'positive')}
                              className={`p-1.5 rounded hover:bg-black/10 transition-colors ${
                                msg.reaction === 'positive' ? 'bg-black/10' : ''
                              }`}
                              title="Good response"
                            >
                              <IconThumbUp
                                className={`h-3.5 w-3.5 ${
                                  msg.reaction === 'positive' ? 'fill-current' : ''
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => addReaction(msg.id, 'negative')}
                              className={`p-1.5 rounded hover:bg-black/10 transition-colors ${
                                msg.reaction === 'negative' ? 'bg-black/10' : ''
                              }`}
                              title="Bad response"
                            >
                              <IconThumbDown
                                className={`h-3.5 w-3.5 ${
                                  msg.reaction === 'negative' ? 'fill-current' : ''
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="p-1.5 rounded hover:bg-black/10 transition-colors"
                              title="Copy"
                            >
                              {copiedMessageId === msg.id ? (
                                <IconCheck className="h-3.5 w-3.5" />
                              ) : (
                                <IconCopy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 rounded-lg rounded-bl-none px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Input Area */}
            <div className="border-t pt-4 mt-auto">
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe tu mensaje..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={loading}
                  className="h-10"
                />
                <Button
                  onClick={sendMessage}
                  disabled={loading || !messageInput.trim()}
                  size="icon"
                  className="h-10 w-10"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <IconSend className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Shift + Enter for new line
              </p>
            </div>
          </div>

          {/* Debug Panel */}
          {debugOpen && (
            <div className="w-96 border-l overflow-hidden">
              <Tabs defaultValue="request" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 rounded-none">
                  <TabsTrigger value="request" className="rounded-none">Request</TabsTrigger>
                  <TabsTrigger value="response" className="rounded-none">Response</TabsTrigger>
                </TabsList>

                <TabsContent value="request" className="flex-1 overflow-hidden">
                  <Card className="h-full border-0 rounded-none">
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-xs">Latest Request</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-full">
                        <pre className="text-xs bg-muted p-3 whitespace-pre-wrap break-words font-mono">
                          {activeSession?.messages[activeSession.messages.length - 1]
                            ?.requestPayload
                            ? JSON.stringify(
                                activeSession.messages[
                                  activeSession.messages.length - 1
                                ]?.requestPayload,
                                null,
                                2
                              )
                            : 'No request yet'}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="response" className="flex-1 overflow-hidden">
                  <Card className="h-full border-0 rounded-none">
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-xs">Latest Response</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-full">
                        <pre className="text-xs bg-muted p-3 whitespace-pre-wrap break-words font-mono">
                          {activeSession?.messages[activeSession.messages.length - 1]
                            ?.responsePayload
                            ? JSON.stringify(
                                activeSession.messages[
                                  activeSession.messages.length - 1
                                ]?.responsePayload,
                                null,
                                2
                              )
                            : 'No response yet'}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
