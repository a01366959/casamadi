import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { hotel_id, phone, message, channel } = await request.json();

    if (!message || !hotel_id || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: hotel_id, phone, message' },
        { status: 400 }
      );
    }

    // Call the agent backend
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:5001';
    
    const response = await fetch(`${agentUrl}/api/sandbox/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hotel_id,
        phone,
        message,
        channel: channel || 'sandbox',
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
      language: data.language || 'es',
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
