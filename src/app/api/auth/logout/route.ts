import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionOptions } from '@/lib/session';

export async function POST() {
  const session = await getIronSession(await cookies(), sessionOptions);
  session.destroy();
  return NextResponse.json({ success: true });
} 