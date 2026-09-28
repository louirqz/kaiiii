'use client';

import React, { useState } from 'react';
import { X, CreditCard, QrCode, Banknote, Loader2, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import QRPaymentPanel from './qr-payment-panel';

interface CartItem {
  cartId: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  stock: number;
  image?: string;
}

interface CheckoutModalProps {
  cart: CartItem[];
  subtotal: number;
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  discountAmount: number;
  total: number;
  onClose: () => void;
  onComplete: (order: { id: string; orderNumber: string; total: number; subtotal: number; discountAmount: number }) => void;
}

type Step = 'summary' | 'cash' | 'qr';

export default function CheckoutModal({
  cart, subtotal, discountType, discountValue, discountAmount, total,
  onClose, onComplete,
}: CheckoutModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('summary');
  const [amountTendered, setAmountTendered] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const change = Math.max(0, parseFloat(amountTendered || '0') - total);

  const presets = [50, 100, 200, 500, 1000].filter((p) => p >= total);

  async function createOrder(method: 'CASH' | 'QR_PROMPTPAY') {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            productName: c.name,
            quantity: c.quantity,
          })),
          discountType,
          discountValue,
          paymentMethod: method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างออเดอร์');

      setCreatedOrder({ id: data.order.id, orderNumber: data.order.orderNumber });
      return data.order;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCashPay() {
    const tendered = parseFloat(amountTendered || '0');
    if (tendered < total) {
      toast.error(`รับเงินไม่เพียงพอ ยังขาดอีก ฿${(total - tendered).toFixed(0)}`);
      return;
    }

    setIsProcessing(true);
    try {
      let order = createdOrder;
      if (!order) {
        const o = await createOrder('CASH');
        order = { id: o.id, orderNumber: o.orderNumber };
      }

      // Create payment
      const payRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: total, method: 'CASH' }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);

      // Confirm payment immediately for cash
      const confirmRes = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payData.payment.id,
          amountTendered: tendered,
          changeGiven: change,
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error);

      toast.success(`ชำระเงินสำเร็จ! ออเดอร์ ${order.orderNumber}`);
      onComplete({ id: order.id, orderNumber: order.orderNumber, total, subtotal, discountAmount });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleQRStart() {
    setIsProcessing(true);
    try {
      let order = createdOrder;
      if (!order) {
        const o = await createOrder('QR_PROMPTPAY');
        order = { id: o.id, orderNumber: o.orderNumber };
      }

      const payRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, amount: total, method: 'QR_PROMPTPAY' }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);

      setPaymentId(payData.payment.id);
      setStep('qr');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }

  const handleQRComplete = () => {
    if (createdOrder) {
      toast.success(`ชำระเงินสำเร็จ! ออเดอร์ ${createdOrder.orderNumber}`);
      onComplete({ id: createdOrder.id, orderNumber: createdOrder.orderNumber, total, subtotal, discountAmount });
    }
  };

  return (
    <div className="modal-overlay" onClick={step === 'summary' ? onClose : undefined}>
      <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1.2rem' }}>
            {step === 'summary' ? '📋 สรุปออเดอร์' : step === 'cash' ? '💵 ชำระเงินสด' : '📱 QR Payment'}
          </h2>
          {step !== 'qr' && (
            <button onClick={step === 'summary' ? onClose : () => setStep('summary')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* STEP: Summary */}
        {step === 'summary' && (
          <>
            {/* Items list */}
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
              {cart.map((item) => (
                <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: '0.875rem' }}>
                  <span style={{ color: '#cbd5e1' }}>
                    {item.name}{item.variantName ? ` (${item.variantName})` : ''} × {item.quantity}
                  </span>
                  <span style={{ color: '#f1f5f9', fontWeight: 600 }}>฿{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            {/* Price summary */}
            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              {[
                { label: 'Subtotal', value: `฿${subtotal.toFixed(0)}`, color: '#cbd5e1' },
                discountAmount > 0 && { label: 'ส่วนลด', value: `-฿${discountAmount.toFixed(0)}`, color: '#34d399' },
                { label: 'ยอดรวม', value: `฿${total.toFixed(0)}`, color: '#ff1a6c', bold: true, large: true },
              ].filter(Boolean).map((row: { label: string; value: string; color: string; bold?: boolean; large?: boolean } | false, i) => row && (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ color: '#94a3b8', fontSize: row.large ? '1rem' : '0.875rem' }}>{row.label}</span>
                  <span style={{ color: row.color, fontWeight: row.bold ? 800 : 600, fontSize: row.large ? '1.2rem' : '0.875rem' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Payment Method Choice */}
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              เลือกช่องทางชำระเงิน
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Cash */}
              <button
                onClick={() => setStep('cash')}
                style={{
                  background: 'rgba(30,41,59,0.8)',
                  border: '1px solid rgba(51,65,85,0.5)',
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Banknote size={22} style={{ color: '#34d399' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>เงินสด</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ชำระด้วยเงินสด คำนวณเงินทอน</div>
                </div>
                <ChevronRight size={18} style={{ color: '#475569' }} />
              </button>

              {/* QR */}
              <button
                onClick={handleQRStart}
                disabled={isProcessing}
                style={{
                  background: 'rgba(30,41,59,0.8)',
                  border: '1px solid rgba(51,65,85,0.5)',
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isProcessing ? <Loader2 size={22} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} /> : <QrCode size={22} style={{ color: '#818cf8' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>QR PromptPay</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>สแกนจ่ายผ่านแอปธนาคาร</div>
                </div>
                <ChevronRight size={18} style={{ color: '#475569' }} />
              </button>
            </div>
          </>
        )}

        {/* STEP: Cash */}
        {step === 'cash' && (
          <>
            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 6 }}>ยอดที่ต้องชำระ</p>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ff1a6c' }}>฿{total.toFixed(0)}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                จำนวนเงินที่ลูกค้าจ่าย (฿)
              </label>
              <input
                type="number"
                className="input-field"
                style={{ fontSize: '1.1rem', padding: '12px 16px' }}
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                placeholder="0"
                autoFocus
              />
              {/* Preset amounts */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button onClick={() => setAmountTendered(total.toFixed(0))} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>พอดี</button>
                {presets.slice(0, 4).map((p) => (
                  <button key={p} onClick={() => setAmountTendered(String(p))} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(51,65,85,0.5)', border: '1px solid #475569', color: '#cbd5e1', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>฿{p}</button>
                ))}
              </div>
            </div>

            {parseFloat(amountTendered || '0') >= total && (
              <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#34d399', fontWeight: 600 }}>เงินทอน</span>
                <span style={{ color: '#34d399', fontWeight: 800, fontSize: '1.3rem' }}>฿{change.toFixed(0)}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setStep('summary')} style={{ flex: 1, justifyContent: 'center' }}>
                ย้อนกลับ
              </button>
              <button
                className="btn-primary"
                onClick={handleCashPay}
                disabled={isProcessing || parseFloat(amountTendered || '0') < total}
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {isProcessing ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Banknote size={18} />}
                ยืนยันการชำระเงิน
              </button>
            </div>
          </>
        )}

        {/* STEP: QR */}
        {step === 'qr' && paymentId && createdOrder && (
          <QRPaymentPanel
            paymentId={paymentId}
            orderId={createdOrder.id}
            orderNumber={createdOrder.orderNumber}
            amount={total}
            onComplete={handleQRComplete}
            onCancel={() => {
              setStep('summary');
              setPaymentId(null);
              setCreatedOrder(null);
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
