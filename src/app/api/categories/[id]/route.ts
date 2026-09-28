import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['ADMIN', 'MANAGER']);
    const { id } = await params;
    const body = await req.json();
    const { name, icon, description, sortOrder, status } = body;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        icon: icon !== undefined ? icon : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      details: `Updated category "${updated.name}"`,
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: unknown) {
    console.error('Error updating category:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการแก้ไขหมวดหมู่';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['ADMIN']);
    const { id } = await params;

    const count = await prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (count > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบหมวดหมู่นี้ได้เนื่องจากยังมีสินค้าอยู่ในหมวดนี้ ${count} รายการ` },
        { status: 400 }
      );
    }

    const cat = await prisma.category.delete({
      where: { id },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'DELETE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: id,
      details: `Deleted category "${cat.name}"`,
    });

    return NextResponse.json({ success: true, message: 'ลบหมวดหมู่เรียบร้อยแล้ว' });
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบหมวดหมู่';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
