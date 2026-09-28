'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, RefreshCw, QrCode, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface QRPaymentPanelProps {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  onComplete: () => void;
  onCancel: () => void;
}

type Status = 'loading' | 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export default function QRPaymentPanel({
  paymentId, orderId, orderNumber, amount, onComplete, onCancel
}: QRPaymentPanelProps) {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [isConfirming, setIsConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minute timeout
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load QR code on mount
  useEffect(() => {
    fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount, method: 'QR_PROMPTPAY' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.payment?.qrCodeUrl) {
          setQrCodeUrl(data.payment.qrCodeUrl);
          setStatus('pending');
        } else {
          // QR already created, just show pending
          setStatus('pending');
        }
      })
      .catch(() => setStatus('failed'));
  }, []);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const confirmPayment = useCallback(async () => {
    setIsConfirming(true);
    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ยืนยันการชำระไม่สำเร็จ');

      if (data.payment.status === 'PAID') {
        setStatus('paid');
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => onComplete(), 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  }, [paymentId, onComplete]);

  const handleCancel = async () => {
    try {
      await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, reason: 'Customer cancelled' }),
      });
    } catch {
      // ignore
    }
    onCancel();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (status === 'paid') {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={44} style={{ color: '#34d399' }} />
        </div>
        <h3 style={{ color: '#34d399', fontWeight: 800, fontSize: '1.3rem', marginBottom: 8 }}>ชำระเงินสำเร็จ!</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>ออเดอร์ {orderNumber}</p>
        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.4rem', marginTop: 8 }}>฿{amount.toFixed(0)}</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={44} style={{ color: '#fbbf24' }} />
        </div>
        <h3 style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>QR Code หมดอายุแล้ว</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 20 }}>กรุณาเริ่มชำระเงินใหม่อีกครั้ง</p>
        <button className="btn-secondary" onClick={onCancel} style={{ width: '100%', justifyContent: 'center' }}>
          ย้อนกลับ
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Store & Amount */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>🥟</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9' }}>nnichna</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4 }}>ออเดอร์ {orderNumber}</p>
        <p style={{ fontSize: '2rem', fontWeight: 800, color: '#ff1a6c' }}>฿{amount.toFixed(0)}</p>

        {/* Dev mode warning */}
        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <AlertTriangle size={12} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>DEVELOPMENT MODE — ไม่ใช่การชำระเงินจริง</span>
        </div>
      </div>

      {/* QR Code */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        {status === 'loading' ? (
          <div style={{ width: 220, height: 220, margin: '0 auto', background: 'rgba(30,41,59,0.8)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={40} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : qrCodeUrl ? (
          <div style={{ display: 'inline-block', background: 'white', padding: 12, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <img src={qrCodeUrl} alt="PromptPay QR Code" style={{ width: 200, height: 200, display: 'block' }} />
          </div>
        ) : (
          <div style={{ width: 220, height: 220, margin: '0 auto', background: 'rgba(30,41,59,0.8)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={60} style={{ color: '#475569' }} />
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 6 }}>
          กรุณาสแกน QR Code เพื่อชำระเงิน PromptPay
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: timeLeft > 60 ? '#34d399' : '#fbbf24',
              animation: 'pulse 2s infinite',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: timeLeft > 60 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
            {status === 'pending' ? `รอการชำระเงิน... (${formatTime(timeLeft)})` : 'กำลังโหลด...'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-secondary" onClick={handleCancel} style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem' }}>
          ยกเลิก
        </button>
        <button
          onClick={confirmPayment}
          disabled={isConfirming || status !== 'pending'}
          style={{
            flex: 2,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '12px',
            cursor: isConfirming ? 'not-allowed' : 'pointer',
            opacity: isConfirming ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: '0.9rem',
            fontFamily: 'inherit',
          }}
        >
          {isConfirming ? (
            <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <CheckCircle size={16} />
          )}
          ตรวจสอบการชำระเงิน
        </button>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
