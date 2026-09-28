import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment/payment-service';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { orderId, amount, method, promptPayTarget } = body;

    if (!orderId || !amount || !method) {
      return NextResponse.json({ error: 'ข้อมูลการชำระเงินไม่ครบถ้วน' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'ไม่พบออเดอร์' }, { status: 404 });
    }

    const paymentResult = await PaymentService.createPayment({
      orderId,
      amount: parseFloat(amount),
      method,
      promptPayTarget,
    });

    return NextResponse.json({
      success: true,
      payment: paymentResult,
    });
  } catch (error: unknown) {
    console.error('Error creating payment:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
