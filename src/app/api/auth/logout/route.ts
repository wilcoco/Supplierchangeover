import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  clearSession();
  return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
}
