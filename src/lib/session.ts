import type { SessionOptions } from 'iron-session';

export const sessionOptions: SessionOptions = {
  cookieName: 'myapp_session', // Choose a unique name for your session cookie
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

// This is where we specify the typings of req.session.*
// Alternatively, you can declare this interface globally in a .d.ts file
declare module 'iron-session' {
  interface IronSessionData {
    isLoggedIn?: boolean;
    username?: string;
  }
} 