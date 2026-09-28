import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, hashPassword, logAudit } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAuth(['ADMIN']);
    const { id } = await params;
    const body = await req.json();
    const { name, email, role, status, password } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้นี้ในระบบ' }, { status: 404 });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (name) dataToUpdate.name = name.trim();
    if (email) dataToUpdate.email = email.trim().toLowerCase();
    if (role) dataToUpdate.role = role;
    if (status) dataToUpdate.status = status;
    if (password && password.trim()) {
      dataToUpdate.passwordHash = await hashPassword(password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      details: `Updated staff "${updated.name}" (${updated.username})`,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: unknown) {
    console.error('Error updating user:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
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
    const adminUser = await requireAuth(['ADMIN']);
    const { id } = await params;

    if (id === adminUser.id) {
      return NextResponse.json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้นี้' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: id,
      details: `Deleted user "${targetUser.name}" (${targetUser.username})`,
    });

    return NextResponse.json({ success: true, message: 'ลบผู้ใช้เรียบร้อยแล้ว' });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
