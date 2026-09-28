import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSessionToken, verifyPassword, COOKIE_NAME, logAudit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usernameOrEmail, password, pin } = body;

    // 1. PIN Login (Admin PIN: 1111)
    if (pin !== undefined && pin !== null) {
      if (pin.toString().trim() === '1111') {
        let adminUser = await prisma.user.findFirst({
          where: { role: 'ADMIN', status: 'ACTIVE' },
        });

        if (!adminUser) {
          adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
          });
        }

        if (!adminUser) {
          return NextResponse.json(
            { error: 'ไม่พบบัญชีผู้ดูแลระบบในระบบ' },
            { status: 404 }
          );
        }

        const sessionPayload = {
          id: adminUser.id,
          name: adminUser.name,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role as 'ADMIN' | 'MANAGER' | 'CASHIER',
        };

        const token = await createSessionToken(sessionPayload);

        await logAudit({
          userId: adminUser.id,
          userName: adminUser.name,
          action: 'PIN_LOGIN',
          entityType: 'USER',
          entityId: adminUser.id,
          details: 'Admin logged in via PIN 1111',
        });

        const response = NextResponse.json({
          success: true,
          user: sessionPayload,
          redirectUrl: '/admin',
        });

        response.cookies.set({
          name: COOKIE_NAME,
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
      } else {
        return NextResponse.json(
          { error: 'รหัส PIN ไม่ถูกต้อง (ใช้รหัส PIN 1111)' },
          { status: 401 }
        );
      }
    }

    // 2. Standard Username/Password Login
    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน หรือใช้รหัส PIN' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail.trim() },
          { username: usernameOrEmail.trim().toLowerCase() },
          { email: usernameOrEmail.trim().toLowerCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role as 'ADMIN' | 'MANAGER' | 'CASHIER',
    };

    const token = await createSessionToken(sessionPayload);

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      details: `User logged in with role ${user.role}`,
    });

    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
      redirectUrl: user.role === 'CASHIER' ? '/pos' : '/admin',
    });

    // Set HTTP-only secure cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
