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
import { IconSettings } from '@tabler/icons-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { Thread } from '@/components/assistant-ui/thread';
import { ThreadList } from '@/components/assistant-ui/thread-list';
import { toast } from 'sonner';

interface SandboxConversationResponse {
  success: boolean;
  conversation_id?: string;
  error?: string;
}

export default function SandboxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hotelId, setHotelId] = useState('hotel-bernal');
  const [phone, setPhone] = useState(() => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`);
  const [channel, setChannel] = useState<'sandbox' | 'whatsapp' | 'instagram' | 'messenger'>('sandbox');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initializingConversation, setInitializingConversation] = useState(false);

  // Check auth access
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const initializeConversation = async (
    nextHotelId: string,
    nextPhone: string,
    nextChannel: 'sandbox' | 'whatsapp' | 'instagram' | 'messenger'
  ) => {
    setInitializingConversation(true);
    try {
      const response = await fetch('/api/sandbox/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotel_id: nextHotelId,
          phone: nextPhone,
          channel: nextChannel,
        }),
      });

      const data = (await response.json()) as SandboxConversationResponse;

      if (!response.ok || !data.success || !data.conversation_id) {
        throw new Error(data.error || 'No se pudo inicializar la conversacion');
      }

      setConversationId(data.conversation_id);
    } catch (error) {
      setConversationId(null);
      toast.warning(error instanceof Error ? error.message : 'No se pudo crear la conversacion');
    } finally {
      setInitializingConversation(false);
    }
  };

  // Create and persist a new chat session
  const createNewSession = async () => {
    const nextPhone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    setPhone(nextPhone);
    await initializeConversation(hotelId, nextPhone, channel);
  };

  // Initialize first sandbox conversation on page load
  useEffect(() => {
    void initializeConversation(hotelId, phone, channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup assistant-ui runtime with our API endpoint
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: `/api/chat?hotel_id=${hotelId}&phone=${phone}&channel=${channel}${conversationId ? `&conversation_id=${conversationId}` : ''}`,
    }),
  });

  if (authLoading) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:flex">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:flex" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Sandbox</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <IconSettings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Sandbox Settings</SheetTitle>
                <SheetDescription>Configure test parameters</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6">
                <div>
                  <Label htmlFor="hotel-id" className="text-sm font-medium">
                    Hotel ID
                  </Label>
                  <Input
                    id="hotel-id"
                    value={hotelId}
                    onChange={(e) => setHotelId(e.target.value)}
                    className="mt-2"
                    placeholder="hotel-bernal"
                  />
                </div>

                <div>
                  <Label htmlFor="channel" className="text-sm font-medium">
                    Channel
                  </Label>
                  <Select
                    value={channel}
                    onValueChange={(value) =>
                      setChannel(value as 'sandbox' | 'whatsapp' | 'instagram' | 'messenger')
                    }
                  >
                    <SelectTrigger id="channel" className="mt-2">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="messenger">Messenger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Guest Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-2"
                    placeholder="+1234567890"
                  />
                </div>

                <Button
                  onClick={() => {
                    void createNewSession();
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={initializingConversation}
                >
                  {initializingConversation ? 'Creando conversacion...' : 'New Test Session'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-hidden flex">
          <AssistantRuntimeProvider runtime={runtime}>
            <div className="w-full h-full grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
              {/* Thread list on left (hidden on mobile) */}
              <div className="hidden lg:block lg:col-span-1 overflow-hidden">
                <ThreadList />
              </div>

              {/* Main thread view - must have overflow-hidden to constrain Viewport */}
              <div className="lg:col-span-3 overflow-hidden flex flex-col">
                <Thread />
              </div>
            </div>
          </AssistantRuntimeProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
