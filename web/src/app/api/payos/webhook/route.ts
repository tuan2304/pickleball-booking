import { NextRequest, NextResponse } from 'next/server'
import { handlePayosWebhook } from '@/lib/payos-webhook'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body không phải JSON' }, { status: 400 })
  }

  const { status, body: payload } = await handlePayosWebhook(body)
  return NextResponse.json(payload, { status })
}
