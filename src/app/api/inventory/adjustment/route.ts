import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, logAudit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(['ADMIN', 'MANAGER']);
    const body = await req.json();
    const { productId, variantId, type, quantity, reason } = body;

    const numQty = parseInt(quantity, 10);
    if (!productId || isNaN(numQty) || numQty === 0) {
      return NextResponse.json({ error: 'กรุณาระบุจำนวนที่ต้องการปรับปรุงสต็อก' }, { status: 400 });
    }

    const validTypes = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'];
    const adjustmentType = validTypes.includes(type) ? type : 'ADJUSTMENT';

    const result = await prisma.$transaction(async (tx) => {
      let prevStock = 0;
      let newStock = 0;
      let itemName = '';

      if (variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true },
        });
        if (!variant) throw new Error('ไม่พบตัวเลือกสินค้าที่ระบุ');

        prevStock = variant.stock;
        newStock = Math.max(0, prevStock + numQty);
        itemName = `${variant.product.name} (${variant.name})`;

        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: newStock },
        });

        const txn = await tx.inventoryTransaction.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            type: adjustmentType,
            quantity: numQty,
            previousStock: prevStock,
            newStock,
            reason: reason || `Manual adjustment by ${user.name}`,
            userId: user.id,
          },
        });

        return { txn, prevStock, newStock, itemName };
      } else {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!product) throw new Error('ไม่พบสินค้าที่ระบุ');

        prevStock = product.stock;
        newStock = Math.max(0, prevStock + numQty);
        itemName = product.name;

        await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
        });

        const txn = await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: adjustmentType,
            quantity: numQty,
            previousStock: prevStock,
            newStock,
            reason: reason || `Manual adjustment by ${user.name}`,
            userId: user.id,
          },
        });

        return { txn, prevStock, newStock, itemName };
      }
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'INVENTORY',
      entityId: productId,
      details: `Adjusted stock for ${result.itemName} (${numQty > 0 ? '+' : ''}${numQty}) from ${result.prevStock} to ${result.newStock}. Reason: ${reason || 'N/A'}`,
    });

    return NextResponse.json({
      success: true,
      transaction: result.txn,
      newStock: result.newStock,
    });
  } catch (error: unknown) {
    console.error('Error adjusting inventory:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการปรับปรุงสต็อก';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
