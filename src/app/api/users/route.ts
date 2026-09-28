import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, hashPassword, logAudit } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth(['ADMIN']);
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้ (เฉพาะ ADMIN เท่านั้น)' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAuth(['ADMIN']);
    const body = await req.json();
    const { name, username, email, password, role, status } = body;

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' }, { status: 400 });
    }

    // Check existing
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: role || 'CASHIER',
        status: status || 'ACTIVE',
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
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUser.id,
      details: `Created new staff "${newUser.name}" with role ${newUser.role}`,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
