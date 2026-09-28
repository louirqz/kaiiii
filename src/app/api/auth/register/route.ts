import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createSessionToken, COOKIE_NAME, logAudit } from '@/lib/auth';

// Public registration endpoint — creates an ACTIVE user and automatically logs them in
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, email, password, confirmPassword } = body;

    // Validation
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, ชื่อผู้ใช้, อีเมล, รหัสผ่าน)' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' }, { status: 400 });
    }

    // Check duplicate username / email in DB
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanEmail },
        ],
      },
    });

    if (existing) {
      if (existing.username.toLowerCase() === cleanUsername) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น' }, { status: 400 });
      }
      return NextResponse.json({ error: 'อีเมลนี้มีผู้ใช้งานแล้ว กรุณาใช้อีเมลอื่น' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role: 'CASHIER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: newUser.id,
      userName: newUser.name,
      action: 'REGISTER',
      entityType: 'USER',
      entityId: newUser.id,
      details: `New user registered as ${newUser.role}`,
    });

    const sessionPayload = {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role as 'ADMIN' | 'MANAGER' | 'CASHIER',
    };

    const token = await createSessionToken(sessionPayload);

    const response = NextResponse.json(
      {
        success: true,
        message: 'สมัครสมาชิกและเข้าสู่ระบบเรียบร้อยแล้ว!',
        user: sessionPayload,
      },
      { status: 201 }
    );

    // Set session cookie
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
  } catch (error: unknown) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}
