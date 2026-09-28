import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, logAudit } from '@/lib/auth';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดหมวดหมู่ได้' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['ADMIN', 'MANAGER']);
    const body = await req.json();
    const { name, icon, description, sortOrder, status } = body;

    if (!name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u0E00-\u0E7F-]/g, '')
      .replace(/\s+/g, '-');

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        icon: icon || '🥟',
        description: description?.trim() || null,
        sortOrder: parseInt(sortOrder, 10) || 0,
        status: status || 'ACTIVE',
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CREATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: category.id,
      details: `Created category "${category.name}"`,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
