'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Eye, RefreshCw, Loader2 } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  cashier?: { name: string };
  items: { quantity: number; productNameSnapshot: string; priceSnapshot: number; subtotal: number }[];
  payments: { method: string; status: string; amountTendered?: number; changeGiven?: number }[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  COMPLETED: '#34d399', PAID: '#818cf8', PENDING: '#fbbf24',
  CANCELLED: '#f87171', REFUNDED: '#94a3b8', PREPARING: '#fb923c', READY: '#38bdf8',
};
const statusLabels: Record<string, string> = {
  COMPLETED: 'เสร็จสิ้น', PAID: 'ชำระแล้ว', PENDING: 'รอชำระ',
  CANCELLED: 'ยกเลิก', REFUNDED: 'คืนเงิน', PREPARING: 'กำลังทำ', READY: 'พร้อมส่ง',
};
const payMethodLabels: Record<string, string> = { CASH: '💵 เงินสด', QR_PROMPTPAY: '📱 QR', OTHER: '💳 อื่นๆ' };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', dateRange: dateFilter });
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);

    fetch(`/api/orders?${params}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setTotal(d.pagination?.total || 0); setTotalPages(d.pagination?.totalPages || 1); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [search, statusFilter, dateFilter, page]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  const fmtPrice = (n: number) => `฿${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>🧾 ออเดอร์ทั้งหมด</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 2 }}>ออเดอร์ทั้งหมด {total} รายการ</p>
        </div>
        <button className="btn-secondary" onClick={load} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="input-field" style={{ paddingLeft: 38 }} placeholder="ค้นหาออเดอร์, ลูกค้า..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-field" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">ทุกสถานะ</option>
          <option value="PENDING">รอชำระ</option>
          <option value="PAID">ชำระแล้ว</option>
          <option value="COMPLETED">เสร็จสิ้น</option>
          <option value="CANCELLED">ยกเลิก</option>
        </select>
        <select className="input-field" style={{ width: 'auto' }} value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }}>
          <option value="all">ทุกช่วงเวลา</option>
          <option value="today">วันนี้</option>
          <option value="yesterday">เมื่อวาน</option>
          <option value="7days">7 วันล่าสุด</option>
          <option value="30days">30 วันล่าสุด</option>
        </select>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Loader2 size={30} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>ยังไม่มีรายการออเดอร์</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>เลขออเดอร์</th>
                <th>ลูกค้า</th>
                <th>รายการ</th>
                <th>ยอดรวม</th>
                <th>ช่องทางชำระ</th>
                <th>สถานะการชำระ</th>
                <th>สถานะออเดอร์</th>
                <th>แคชเชียร์</th>
                <th>วันที่</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8', fontSize: '0.82rem' }}>{order.orderNumber}</span>
                  </td>
                  <td><span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{order.customerName}</span></td>
                  <td>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {order.items.reduce((s, i) => s + i.quantity, 0)} ชิ้น ({order.items.length} รายการ)
                    </span>
                  </td>
                  <td><span style={{ fontWeight: 700, color: '#34d399' }}>{fmtPrice(order.total)}</span></td>
                  <td><span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{payMethodLabels[order.paymentMethod] || order.paymentMethod}</span></td>
                  <td>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColors[order.paymentStatus] || '#94a3b8', background: `${statusColors[order.paymentStatus] || '#94a3b8'}22`, border: `1px solid ${statusColors[order.paymentStatus] || '#94a3b8'}44`, padding: '3px 8px', borderRadius: 20 }}>
                      {statusLabels[order.paymentStatus] || order.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColors[order.orderStatus] || '#94a3b8', background: `${statusColors[order.orderStatus] || '#94a3b8'}22`, border: `1px solid ${statusColors[order.orderStatus] || '#94a3b8'}44`, padding: '3px 8px', borderRadius: 20 }}>
                      {statusLabels[order.orderStatus] || order.orderStatus}
                    </span>
                  </td>
                  <td><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.cashier?.name || '-'}</span></td>
                  <td><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{fmtDate(order.createdAt)}</span></td>
                  <td>
                    <button onClick={() => setSelectedOrder(order)} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#818cf8', display: 'flex', alignItems: 'center' }}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← ก่อนหน้า</button>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>หน้า {page} / {totalPages}</span>
          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>ถัดไป →</button>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem' }}>📄 รายละเอียดออเดอร์</h3>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><span style={{ fontSize: 18 }}>✕</span></button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
                {[
                  ['เลขออเดอร์', selectedOrder.orderNumber],
                  ['ลูกค้า', selectedOrder.customerName],
                  ['วันที่', fmtDate(selectedOrder.createdAt)],
                  ['แคชเชียร์', selectedOrder.cashier?.name || '-'],
                  ['ช่องทาง', payMethodLabels[selectedOrder.paymentMethod] || selectedOrder.paymentMethod],
                  ['สถานะ', statusLabels[selectedOrder.orderStatus] || selectedOrder.orderStatus],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ color: '#64748b' }}>{k}</p>
                    <p style={{ color: '#e2e8f0', fontWeight: 600, marginTop: 2 }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>รายการสินค้า</p>
              {selectedOrder.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(51,65,85,0.3)', fontSize: '0.85rem' }}>
                  <span style={{ color: '#cbd5e1' }}>{item.productNameSnapshot} × {item.quantity}</span>
                  <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{fmtPrice(item.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Subtotal</span>
                <span style={{ color: '#cbd5e1' }}>{fmtPrice(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#34d399' }}>ส่วนลด</span>
                  <span style={{ color: '#34d399' }}>-{fmtPrice(selectedOrder.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, paddingTop: 6, borderTop: '1px solid #1e293b' }}>
                <span style={{ color: '#f1f5f9' }}>รวมทั้งหมด</span>
                <span style={{ color: '#34d399' }}>{fmtPrice(selectedOrder.total)}</span>
              </div>
              {selectedOrder.payments[0]?.amountTendered && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>รับเงิน</span>
                    <span style={{ color: '#cbd5e1' }}>{fmtPrice(selectedOrder.payments[0].amountTendered!)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>เงินทอน</span>
                    <span style={{ color: '#fbbf24' }}>{fmtPrice(selectedOrder.payments[0].changeGiven || 0)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
