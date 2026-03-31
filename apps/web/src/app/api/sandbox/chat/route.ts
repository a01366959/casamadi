import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or message' },
        { status: 400 }
      );
    }

    // Call the agent backend with sandbox flag
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';
    
    const response = await fetch(`${agentUrl}/api/sandbox/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sandbox-key': process.env.SANDBOX_API_KEY || 'sandbox-key',
      },
      body: JSON.stringify({
        sessionId,
        message,
        hotelId: 'hotel-bernal', // demo hotel
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Agent error' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      reply: data.reply || 'No response',
      toolCalls: data.toolCalls || [],
    });
  } catch (error) {
    console.error('Sandbox chat error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
