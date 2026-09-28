import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, logAudit } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        cashier: {
          select: { id: true, name: true, username: true },
        },
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์นี้' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error getting order:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดออเดอร์' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { orderStatus, notes } = body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์นี้' }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        orderStatus: orderStatus || existing.orderStatus,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: {
        items: true,
        cashier: {
          select: { id: true, name: true, username: true },
        },
        payments: true,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_ORDER_STATUS',
      entityType: 'ORDER',
      entityId: id,
      details: `Updated order ${existing.orderNumber} status from ${existing.orderStatus} to ${updated.orderStatus}`,
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: unknown) {
    console.error('Error updating order:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการแก้ไขออเดอร์';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
