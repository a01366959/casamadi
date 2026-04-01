import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, phone } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Generate phone from sessionId if not provided
    const finalPhone = phone || `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;

    // Call the agent backend
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:5001';
    
    const response = await fetch(`${agentUrl}/api/sandbox/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hotel_id: 'bernal',
        phone: finalPhone,
        message,
        channel: 'sandbox',
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
      language: data.language,
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
