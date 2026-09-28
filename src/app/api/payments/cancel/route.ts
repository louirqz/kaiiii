import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment/payment-service';
import { requireAuth, logAudit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { paymentId, reason } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'ไม่พบรหัสการชำระเงิน' }, { status: 400 });
    }

    const paymentResult = await PaymentService.cancelPayment(paymentId, reason);

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CANCEL_PAYMENT',
      entityType: 'PAYMENT',
      entityId: paymentId,
      details: `Cancelled payment: ${reason || 'User cancelled'}`,
    });

    return NextResponse.json({
      success: true,
      payment: paymentResult,
    });
  } catch (error: unknown) {
    console.error('Error cancelling payment:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการยกเลิกการชำระเงิน';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
