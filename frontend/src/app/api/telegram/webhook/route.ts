import { NextRequest, NextResponse } from 'next/server';

// Proxy webhook requests to backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward to backend
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8001';
    const response = await fetch(`${backendUrl}/api/telegram/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Webhook proxy error:', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Telegram webhook endpoint' });
}
