import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment/payment-service';
import { requireAuth, logAudit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { paymentId, amountTendered, changeGiven } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'ไม่พบรหัสการชำระเงิน' }, { status: 400 });
    }

    const paymentResult = await PaymentService.confirmPayment(
      paymentId,
      amountTendered !== undefined ? parseFloat(amountTendered) : undefined,
      changeGiven !== undefined ? parseFloat(changeGiven) : undefined
    );

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'CONFIRM_PAYMENT',
      entityType: 'PAYMENT',
      entityId: paymentId,
      details: `Confirmed payment ฿${paymentResult.amount} via ${paymentResult.method}`,
    });

    return NextResponse.json({
      success: true,
      payment: paymentResult,
    });
  } catch (error: unknown) {
    console.error('Error confirming payment:', error);
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการยืนยันการชำระเงิน';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
