import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions } from '@/lib/session'; // Assuming your tsconfig has paths setup for @/

// Re-declare the interface here for this file if global augmentation isn't working as expected.
// This is a workaround. Ideally, the global declaration in src/lib/session.ts should suffice.
interface AppSessionData {
  isLoggedIn?: boolean;
  username?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const appUsername = process.env.APP_USERNAME;
    const appPassword = process.env.APP_PASSWORD;

    if (!appUsername || !appPassword) {
      console.error('Username or password environment variables are not set.');
      return NextResponse.json({ message: 'Server configuration error.' }, { status: 500 });
    }

    const cookieStore = await cookies(); // Explicitly await, though unusual for Route Handlers
    const session = await getIronSession<AppSessionData>(
      cookieStore,
      sessionOptions
    );
    
    if (username === appUsername && password === appPassword) {
      session.isLoggedIn = true;
      session.username = username;
      await session.save();
      return NextResponse.json({ message: 'Login successful' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
} 