'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Store,
  QrCode,
  Receipt,
  ShieldCheck,
  Save,
  RefreshCw,
  Sliders,
  History,
  AlertCircle,
  FileText,
  Percent,
  Phone,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface StoreSettingData {
  id: string;
  storeName: string;
  storeLogo?: string | null;
  address?: string | null;
  phone?: string | null;
  promptPayId?: string | null;
  currency: string;
  taxRate: number;
  receiptFooter?: string | null;
  lowStockThreshold: number;
  orderPrefix: string;
  maxCashierDiscountPct: number;
  updatedAt: string;
}

interface AuditLogItem {
  id: string;
  userName: string | null;
  action: string;
  entityType: string;
  details: string | null;
  createdAt: string;
  user?: {
    name: string;
    role: string;
  };
}

export default function SettingsAdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'settings' | 'audit'>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Store Setting Form
  const [storeName, setStoreName] = useState('nnichna');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [promptPayId, setPromptPayId] = useState('');
  const [currency, setCurrency] = useState('THB');
  const [taxRate, setTaxRate] = useState(0);
  const [receiptFooter, setReceiptFooter] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [orderPrefix, setOrderPrefix] = useState('NN');
  const [maxCashierDiscountPct, setMaxCashierDiscountPct] = useState(10);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Load Settings
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('ไม่สามารถโหลดการตั้งค่าได้');
      const data = await res.json();
      const s: StoreSettingData = data.setting;
      if (s) {
        setStoreName(s.storeName || 'nnichna');
        setAddress(s.address || '');
        setPhone(s.phone || '');
        setPromptPayId(s.promptPayId || '');
        setCurrency(s.currency || 'THB');
        setTaxRate(s.taxRate || 0);
        setReceiptFooter(s.receiptFooter || '');
        setLowStockThreshold(s.lowStockThreshold || 5);
        setOrderPrefix(s.orderPrefix || 'NN');
        setMaxCashierDiscountPct(s.maxCashierDiscountPct || 10);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load Audit Logs
  const loadLogs = useCallback(async () => {
    setIsLogsLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=40');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      console.error('Failed to load audit logs');
    } finally {
      setIsLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadLogs();
    }
  }, [activeTab, loadLogs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      toast.warning('กรุณาระบุชื่อร้าน');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          address,
          phone,
          promptPayId,
          currency,
          taxRate: Number(taxRate),
          receiptFooter,
          lowStockThreshold: Number(lowStockThreshold),
          orderPrefix,
          maxCashierDiscountPct: Number(maxCashierDiscountPct),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกการตั้งค่าไม่สำเร็จ');
      toast.success('บันทึกการตั้งค่าร้านค้าเรียบร้อยแล้ว');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: '1.5rem' }}>⚙️</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              การตั้งค่าระบบ (Store Settings)
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            ปรับแต่งข้อมูลร้าน nnichna, บัญชี PromptPay QR, สลิปใบเสร็จ, สต็อก และดูประวัติกิจกรรมในระบบ
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: 8, background: '#1e293b', padding: 4, borderRadius: 12 }}>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: activeTab === 'settings' ? '#ff1a6c' : 'transparent',
              color: activeTab === 'settings' ? 'white' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            <Sliders size={16} />
            ตั้งค่าทั่วไป
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: activeTab === 'audit' ? '#ff1a6c' : 'transparent',
              color: activeTab === 'audit' ? 'white' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            <History size={16} />
            ประวัติระบบ (Audit Logs)
          </button>
        </div>
      </div>

      {activeTab === 'settings' ? (
        <form onSubmit={handleSave}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 24,
              marginBottom: 24,
            }}
          >
            {/* Store Information */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid #334155',
                borderRadius: 16,
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Store size={20} style={{ color: '#ff1a6c' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>ข้อมูลร้านค้า</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                    ชื่อร้าน (Store Name) <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                    ที่อยู่ร้าน (แสดงบนหัวใบเสร็จ)
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="เช่น 123 ซอยสุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      resize: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={16}
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="089-123-4567"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PromptPay & Financial */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid #334155',
                borderRadius: 16,
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <QrCode size={20} style={{ color: '#818cf8' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  การชำระเงินและภาษี (PromptPay / Tax)
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                    เบอร์พร้อมเพย์ หรือ เลขบัตรประชาชน (สำหรับสร้าง QR Code)
                  </label>
                  <input
                    type="text"
                    value={promptPayId}
                    onChange={(e) => setPromptPayId(e.target.value)}
                    placeholder="เช่น 0891234567 หรือ 1100501234567"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    * เบอร์นี้จะถูกนำไปแปลงเป็น EMVCo QR PromptPay มาตรฐานในหน้าชำระเงินของ POS
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                      สกุลเงิน
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currency}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(15,23,42,0.5)',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#64748b',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                      ภาษีมูลค่าเพิ่ม VAT (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* POS & Orders Rules */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid #334155',
                borderRadius: 16,
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <ShieldCheck size={20} style={{ color: '#34d399' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  กฎระเบียบการขายและสต็อก
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                    คำนำหน้าเลขออเดอร์ (Order Prefix)
                  </label>
                  <input
                    type="text"
                    value={orderPrefix}
                    onChange={(e) => setOrderPrefix(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="NN"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    ตัวอย่างหมายเลขออเดอร์: {orderPrefix || 'NN'}-20260928-0001
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                      ส่วนลดสูงสุดของแคชเชียร์ (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={maxCashierDiscountPct}
                      onChange={(e) => setMaxCashierDiscountPct(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                      เกณฑ์เตือนสต็อกต่ำ (ชิ้น)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 5)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Preview & Footer */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid #334155',
                borderRadius: 16,
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Receipt size={20} style={{ color: '#fbbf24' }} />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  ใบเสร็จรับเงิน (Receipt Customization)
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: 6 }}>
                    ข้อความท้ายใบเสร็จ (Receipt Footer Note)
                  </label>
                  <textarea
                    rows={2}
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="ขอบคุณที่อุดหนุน nnichna! เกี๊ยวซ่าทำสดใหม่ทุกวัน ทานให้อร่อยนะคะ"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Thermal slip preview */}
                <div
                  style={{
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: 8,
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    *** {storeName || 'nnichna'} ***
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#444', margin: '4px 0' }}>
                    {address || '123 สุขุมวิท 39 วัฒนา กรุงเทพฯ 10110'}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#444' }}>
                    โทร: {phone || '089-123-4567'}
                  </div>
                  <div style={{ borderTop: '1px dashed #666', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>เกี๊ยวซ่าหมูต้นตำรับ (6 ชิ้น) x1</span>
                    <span>฿99.00</span>
                  </div>
                  <div style={{ borderTop: '1px dashed #666', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>ยอดรวมสุทธิ (TOTAL)</span>
                    <span>฿99.00</span>
                  </div>
                  <div style={{ borderTop: '1px dashed #666', margin: '8px 0' }} />
                  <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#444', fontStyle: 'italic' }}>
                    {receiptFooter || 'ขอบคุณที่อุดหนุน nnichna!'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                background: 'linear-gradient(135deg, #ff1a6c, #e60052)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(230,0,82,0.3)',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <Save size={18} />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}
            </button>
          </div>
        </form>
      ) : (
        /* Audit Logs Tab */
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: 16,
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                บันทึกกิจกรรมความปลอดภัยในระบบ (Security & Audit Logs)
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                ตรวจสอบการกระทำของผู้ใช้ เช่น การสร้างออเดอร์ ปรับสต็อก จัดการสินค้า หรือแก้ไขการตั้งค่า
              </p>
            </div>
            <button
              onClick={loadLogs}
              disabled={isLogsLoading}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={isLogsLoading ? 'animate-spin' : ''} />
              รีเฟรชประวัติ
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#64748b', fontSize: '0.75rem' }}>
                  <th style={{ padding: '12px 14px' }}>วัน-เวลา</th>
                  <th style={{ padding: '12px 14px' }}>ผู้ดำเนินการ</th>
                  <th style={{ padding: '12px 14px' }}>การกระทำ (Action)</th>
                  <th style={{ padding: '12px 14px' }}>ประเภท (Entity)</th>
                  <th style={{ padding: '12px 14px' }}>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}
                      className="hover:bg-slate-800/30"
                    >
                      <td style={{ padding: '12px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('th-TH', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#f8fafc' }}>
                        {log.userName || log.user?.name || 'ระบบ'}
                        {log.user?.role && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 6 }}>
                            ({log.user.role})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            background: 'rgba(51, 65, 85, 0.5)',
                            color: '#cbd5e1',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#818cf8', fontWeight: 500 }}>
                        {log.entityType}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      {isLogsLoading ? 'กำลังโหลดบันทึกกิจกรรม...' : 'ยังไม่มีบันทึกกิจกรรม'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
