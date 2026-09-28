import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, logAudit } from '@/lib/auth';

export async function GET() {
  try {
    let setting = await prisma.storeSetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) {
      setting = await prisma.storeSetting.create({
        data: {
          id: 'default',
          storeName: 'nnichna',
          address: '123 ซอยสุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
          phone: '089-123-4567',
          promptPayId: '0891234567',
          currency: 'THB',
          taxRate: 0,
          receiptFooter: 'ขอบคุณที่อุดหนุน nnichna! เกี๊ยวซ่าทำสดใหม่ทุกวัน ทานให้อร่อยนะคะ',
          lowStockThreshold: 5,
          orderPrefix: 'NN',
          maxCashierDiscountPct: 15,
        },
      });
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'ไม่สามารถโหลดการตั้งค่าได้' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(['ADMIN']);
    const body = await req.json();
    const {
      storeName,
      storeLogo,
      address,
      phone,
      promptPayId,
      currency,
      taxRate,
      receiptFooter,
      lowStockThreshold,
      orderPrefix,
      maxCashierDiscountPct,
    } = body;

    const updated = await prisma.storeSetting.upsert({
      where: { id: 'default' },
      update: {
        storeName: storeName || 'nnichna',
        storeLogo: storeLogo !== undefined ? storeLogo : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        promptPayId: promptPayId !== undefined ? promptPayId : undefined,
        currency: currency || 'THB',
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 0,
        receiptFooter: receiptFooter !== undefined ? receiptFooter : undefined,
        lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : 5,
        orderPrefix: orderPrefix || 'NN',
        maxCashierDiscountPct: maxCashierDiscountPct !== undefined ? parseFloat(maxCashierDiscountPct) : 10,
      },
      create: {
        id: 'default',
        storeName: storeName || 'nnichna',
        storeLogo,
        address,
        phone,
        promptPayId,
        currency: currency || 'THB',
        taxRate: taxRate !== undefined ? parseFloat(taxRate) : 0,
        receiptFooter,
        lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : 5,
        orderPrefix: orderPrefix || 'NN',
        maxCashierDiscountPct: maxCashierDiscountPct !== undefined ? parseFloat(maxCashierDiscountPct) : 10,
      },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTING',
      entityId: 'default',
      details: `Updated store profile and configuration for "${updated.storeName}"`,
    });

    return NextResponse.json({ success: true, setting: updated });
  } catch (error: unknown) {
    console.error('Error updating settings:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า';
    if (msg === 'UNAUTHORIZED' || msg === 'FORBIDDEN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้ เฉพาะ ADMIN เท่านั้น' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
