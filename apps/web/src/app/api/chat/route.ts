import { convertToModelMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, system } = await req.json();
    const url = new URL(req.url);
    const hotelId = url.searchParams.get("hotel_id") || "hotel-bernal";
    const phone = url.searchParams.get("phone") || "test-user";

    console.log(`[Chat] Received request - hotel_id: ${hotelId}, phone: ${phone}`);
    console.log(`[Chat] Full messages array:`, JSON.stringify(messages, null, 2));
    console.log(`[Chat] Messages count: ${messages?.length || 0}`);
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract the last user message
    const lastUserMessage = messages.reverse().find((m: any) => m.role === "user");
    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: "No user message found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // assistant-ui uses 'parts' array format: parts: [{ type: 'text', text: '...' }]
    let userText = "";
    
    if (Array.isArray((lastUserMessage as any).parts) && (lastUserMessage as any).parts.length > 0) {
      // Extract text from first text-type part
      const textPart = (lastUserMessage as any).parts.find((p: any) => p.type === "text");
      userText = textPart?.text || "";
    } else if (typeof (lastUserMessage as any).content === "string") {
      // Fallback: handle string content format
      userText = (lastUserMessage as any).content;
    } else if (Array.isArray((lastUserMessage as any).content) && (lastUserMessage as any).content.length > 0) {
      // Fallback: handle content array format
      userText = (lastUserMessage as any).content[0]?.text || "";
    }

    if (!userText) {
      console.error(`[Chat] ERROR: No text found. Full message:`, JSON.stringify(lastUserMessage, null, 2));
      return new Response(
        JSON.stringify({ error: "No text content found in message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call our agent backend
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:5001";
    const agentResponse = await fetch(`${agentUrl}/api/sandbox/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotel_id: hotelId,
        phone,
        message: userText,
      }),
    });

    if (!agentResponse.ok) {
      const error = await agentResponse.text();
      console.error(`[Chat] Agent error:`, error);
      throw new Error(`Agent error: ${error}`);
    }

    const agentData = await agentResponse.json();
    console.log(`[Chat] Agent response:`, agentData);

    // Stream using proper assistant-ui event format
    const encoder = new TextEncoder();
    const text = agentData.reply || "No response";
    const textId = `text-${Date.now()}`;
    
    const stream = async function* () {
      // Text start event
      yield encoder.encode(`data: ${JSON.stringify({ 
        type: "text-start",
        id: textId
      })}\n\n`);
      
      // Stream text as character deltas
      for (const char of text) {
        yield encoder.encode(
          `data: ${JSON.stringify({ 
            type: "text-delta", 
            id: textId,
            delta: char 
          })}\n\n`
        );
      }
      
      // Text end event
      yield encoder.encode(`data: ${JSON.stringify({ 
        type: "text-end",
        id: textId
      })}\n\n`);
      
      // Finish event
      yield encoder.encode(`data: ${JSON.stringify({ 
        type: "finish"
      })}\n\n`);
    };

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream()) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Chat] Error:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
