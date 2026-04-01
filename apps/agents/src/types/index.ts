export interface SandboxMessage {
  hotel_id: string;
  guest_phone: string;
  channel: 'sandbox';
  message_id: string;
  content: string;
  timestamp: string;
}

export interface AgentRequest {
  hotel_id: string;
  guest_phone: string;
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'sandbox';
  message_id: string;
  content: string;
}

export interface AgentResponse {
  reply: string;
  conversation_id: string;
  language: string;
  debug?: {
    model_used?: string;
    tokens_used?: number;
    tools_called?: any[];
  };
}

export interface AgentContext {
  hotel_id: string;
  conversation_id: string;
  guest_phone: string;
  channel: string;
  language: string;
  is_sandbox: boolean;
}
