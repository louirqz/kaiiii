import { NextResponse } from 'next/server';
import { COOKIE_NAME, getCurrentUser, logAudit } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: user.id,
      details: 'User logged out',
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
