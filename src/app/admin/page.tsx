'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp, ShoppingBag, Package, DollarSign,
  AlertTriangle, RefreshCw, ArrowRight, Clock,
  CheckCircle, XCircle, Loader2
} from 'lucide-react';

interface ReportData {
  today: {
    sales: number;
    orders: number;
    itemsSold: number;
    averageOrder: number;
  };
  period: {
    revenue: number;
    ordersCount: number;
    itemsSold: number;
    grossProfit: number;
    profitMargin: number;
  };
  chartData: { date: string; displayDate: string; revenue: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number; cost: number }[];
  paymentBreakdown: {
    CASH: { count: number; amount: number };
    QR_PROMPTPAY: { count: number; amount: number };
    OTHER: { count: number; amount: number };
  };
  lowStockProducts: { id: string; name: string; stock: number; lowStockThreshold: number; image?: string }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    total: number;
    orderStatus: string;
    paymentMethod: string;
    createdAt: string;
    cashier?: { name: string };
    items: { quantity: number }[];
  }[];
}

function formatCurrency(n: number) {
  return `฿${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function SalesMiniChart({ data }: { data: { date?: string; displayDate: string; revenue: number }[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 8 }}>
      {data.map((d, idx) => {
        const height = Math.max((d.revenue / maxRev) * 70, 3);
        return (
          <div key={d.date || `${d.displayDate}-${idx}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              className="bar"
              style={{ width: '100%', height }}
              title={`${d.displayDate}: ${formatCurrency(d.revenue)}`}
            />
            <span style={{ fontSize: '0.6rem', color: '#475569', whiteSpace: 'nowrap' }}>{d.displayDate}</span>
          </div>
        );
      })}
    </div>
  );
}

const orderStatusColors: Record<string, string> = {
  COMPLETED: '#34d399',
  PAID: '#818cf8',
  PENDING: '#fbbf24',
  CANCELLED: '#f87171',
  REFUNDED: '#94a3b8',
};

const orderStatusLabels: Record<string, string> = {
  COMPLETED: 'เสร็จสิ้น',
  PAID: 'ชำระแล้ว',
  PENDING: 'รอชำระ',
  CANCELLED: 'ยกเลิก',
  REFUNDED: 'คืนเงิน',
};

export default function AdminDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState('7days');

  const loadData = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/reports?range=${range}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [range]);

  useEffect(() => { loadData(); }, [loadData]);

  const summaryCards = data ? [
    { label: 'ยอดขายวันนี้', value: formatCurrency(data.today.sales), sub: `${data.today.orders} ออเดอร์`, icon: <DollarSign size={22} />, color: '#ff1a6c', glow: 'rgba(230,0,82,0.25)' },
    { label: 'จำนวนออเดอร์', value: String(data.today.orders), sub: 'วันนี้', icon: <ShoppingBag size={22} />, color: '#818cf8', glow: 'rgba(129,140,248,0.2)' },
    { label: 'สินค้าที่ขาย', value: String(data.today.itemsSold), sub: 'ชิ้นวันนี้', icon: <Package size={22} />, color: '#34d399', glow: 'rgba(52,211,153,0.2)' },
    { label: 'ค่าเฉลี่ยต่อบิล', value: formatCurrency(data.today.averageOrder), sub: 'บาท/ออเดอร์', icon: <TrendingUp size={22} />, color: '#fbbf24', glow: 'rgba(251,191,36,0.2)' },
  ] : [];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="input-field"
            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <option value="today">วันนี้</option>
            <option value="7days">7 วันล่าสุด</option>
            <option value="30days">30 วันล่าสุด</option>
            <option value="thisMonth">เดือนนี้</option>
            <option value="lastMonth">เดือนที่แล้ว</option>
          </select>
          <button onClick={loadData} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={36} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="glass-card"
                style={{ padding: 20, position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: card.glow }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{card.label}</p>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${card.glow}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, border: `1px solid ${card.color}22` }}>
                    {card.icon}
                  </div>
                </div>
                <p style={{ fontSize: '1.7rem', fontWeight: 900, color: card.color, lineHeight: 1.1 }}>{card.value}</p>
                <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 4 }}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 24 }}>
            {/* Sales Chart */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>ยอดขายช่วงเวลา</h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  รวม {formatCurrency(data.period.revenue)}
                </span>
              </div>
              {data.chartData.length > 0 ? (
                <SalesMiniChart data={data.chartData} />
              ) : (
                <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.85rem' }}>
                  ยังไม่มีข้อมูลการขายในช่วงนี้
                </div>
              )}
            </div>

            {/* Payment Breakdown */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 14 }}>ช่องทางชำระเงิน</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'CASH', label: '💵 เงินสด', color: '#34d399' },
                  { key: 'QR_PROMPTPAY', label: '📱 QR PromptPay', color: '#818cf8' },
                  { key: 'OTHER', label: '💳 อื่นๆ', color: '#fbbf24' },
                ].map(({ key, label, color }) => {
                  const item = data.paymentBreakdown[key as keyof typeof data.paymentBreakdown];
                  const total = Object.values(data.paymentBreakdown).reduce((s, i) => s + i.amount, 0);
                  const pct = total > 0 ? (item.amount / total) * 100 : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{label}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>{formatCurrency(item.amount)}</span>
                      </div>
                      <div style={{ background: 'rgba(51,65,85,0.5)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top Products */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>🏆 สินค้าขายดี</h2>
                <Link href="/admin/reports" style={{ fontSize: '0.75rem', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ดูทั้งหมด <ArrowRight size={12} />
                </Link>
              </div>
              {data.topProducts.length === 0 ? (
                <p style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูลการขาย</p>
              ) : (
                data.topProducts.slice(0, 6).map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 5 ? '1px solid rgba(51,65,85,0.3)' : 'none' }}>
                    <span style={{ fontSize: '0.8rem', color: i < 3 ? '#fbbf24' : '#475569', fontWeight: 700, width: 18, textAlign: 'center' }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.82rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', width: 40, textAlign: 'right' }}>{p.quantity} ชิ้น</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', width: 64, textAlign: 'right' }}>{formatCurrency(p.revenue)}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Low Stock Alert */}
              {data.lowStockProducts.length > 0 && (
                <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(245,158,11,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24' }}>สต็อกใกล้หมด</h2>
                    </div>
                    <Link href="/admin/inventory" style={{ fontSize: '0.75rem', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      จัดการ <ArrowRight size={12} />
                    </Link>
                  </div>
                  {data.lowStockProducts.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{p.name}</span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: p.stock === 0 ? '#f87171' : '#fbbf24',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.stock === 0 ? '⛔ หมด' : `⚠️ ${p.stock} ชิ้น`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Orders */}
              <div className="glass-card" style={{ padding: 20, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>🧾 ออเดอร์ล่าสุด</h2>
                  <Link href="/admin/orders" style={{ fontSize: '0.75rem', color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ดูทั้งหมด <ArrowRight size={12} />
                  </Link>
                </div>
                {data.recentOrders.length === 0 ? (
                  <p style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>ยังไม่มีออเดอร์</p>
                ) : (
                  data.recentOrders.slice(0, 5).map((order) => (
                    <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.orderNumber}</p>
                        <p style={{ fontSize: '0.7rem', color: '#475569' }}>{formatDate(order.createdAt)}</p>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: `${orderStatusColors[order.orderStatus] || '#94a3b8'}22`,
                          color: orderStatusColors[order.orderStatus] || '#94a3b8',
                          border: `1px solid ${orderStatusColors[order.orderStatus] || '#94a3b8'}44`,
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                        }}
                      >
                        {orderStatusLabels[order.orderStatus] || order.orderStatus}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', whiteSpace: 'nowrap' }}>
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
