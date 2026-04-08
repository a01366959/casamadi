export async function GET() {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:5001";

  try {
    console.log(`[Debug] Checking agent health at: ${agentUrl}/health`);
    const response = await fetch(`${agentUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const status = response.status;
    const text = await response.text();

    console.log(`[Debug] Agent health check: ${status} - ${text}`);

    return new Response(
      JSON.stringify({
        agent_url: agentUrl,
        status,
        response: text,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Debug] Agent unreachable:`, errorMsg);

    return new Response(
      JSON.stringify({
        agent_url: agentUrl,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
