import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    // Call the agent backend to simulate payment webhook
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';
    
    const response = await fetch(`${agentUrl}/api/sandbox/simulate-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sandbox-key': process.env.SANDBOX_API_KEY || 'sandbox-key',
      },
      body: JSON.stringify({
        sessionId,
        hotelId: 'hotel-bernal',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Payment simulation failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Payment simulated successfully',
    });
  } catch (error) {
    console.error('Sandbox payment simulation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Payment simulation failed',
      },
      { status: 500 }
    );
  }
}
