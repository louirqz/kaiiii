'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Package, AlertTriangle, ArrowUp, ArrowDown, X, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface InventoryItem {
  id: string; name: string; image?: string; category: string; categoryIcon: string;
  sku?: string; barcode?: string; costPrice: number; sellingPrice: number;
  stock: number; lowStockThreshold: number; status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  hasVariants: boolean;
  variants: { id: string; name: string; sku?: string; price: number; stock: number; status: string }[];
}

const statusConfig = {
  IN_STOCK: { label: 'มีสินค้า', color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
  LOW_STOCK: { label: 'ใกล้หมด', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  OUT_OF_STOCK: { label: 'หมดแล้ว', color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
};

export default function AdminInventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState({ totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 });
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState('IN');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams({ filter });
    if (search.trim()) params.set('search', search.trim());
    fetch(`/api/inventory?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setStats(d.stats || {}); })
      .catch(() => toast.error('ไม่สามารถโหลดสต็อกได้'))
      .finally(() => setIsLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleAdjust = async () => {
    if (!adjustItem) return;
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty === 0) return toast.error('กรุณาระบุจำนวน');
    const finalQty = adjustType === 'OUT' ? -Math.abs(qty) : Math.abs(qty);

    setIsAdjusting(true);
    try {
      const res = await fetch('/api/inventory/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustItem.id,
          type: adjustType === 'ADJUSTMENT' ? 'ADJUSTMENT' : adjustType,
          quantity: finalQty,
          reason: adjustReason.trim() || 'Manual adjustment',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`ปรับสต็อก ${adjustItem.name} แล้ว (ใหม่: ${data.newStock} ชิ้น)`);
      setAdjustItem(null);
      setAdjustQty('');
      setAdjustReason('');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>📊 จัดการสต็อก</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 2 }}>ตรวจสอบและปรับปรุงสต็อกสินค้า</p>
        </div>
        <button className="btn-secondary" onClick={load} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
          <RefreshCw size={15} /> รีเฟรช
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'สินค้าทั้งหมด', value: stats.totalProducts, color: '#818cf8', icon: <Package size={20} /> },
          { label: 'ใกล้หมด', value: stats.lowStockCount, color: '#fbbf24', icon: <AlertTriangle size={20} /> },
          { label: 'หมดสต็อก', value: stats.outOfStockCount, color: '#f87171', icon: <Package size={20} /> },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: s.color, opacity: 0.9 }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="input-field" style={{ paddingLeft: 38 }} placeholder="ค้นหาสินค้า..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(['all', 'low_stock', 'out_of_stock'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', background: filter === f ? 'linear-gradient(135deg, #e60052, #4f46e5)' : 'rgba(51,65,85,0.5)', color: filter === f ? 'white' : '#94a3b8', boxShadow: filter === f ? '0 4px 12px rgba(230,0,82,0.2)' : 'none' }}>
            {f === 'all' ? '🔍 ทั้งหมด' : f === 'low_stock' ? '⚠️ ใกล้หมด' : '⛔ หมดสต็อก'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Loader2 size={30} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <Package size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <p>ไม่พบรายการสต็อก</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th>หมวดหมู่</th>
                <th>SKU</th>
                <th>ต้นทุน</th>
                <th>ราคาขาย</th>
                <th>สต็อก</th>
                <th>แจ้งเตือน</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const sc = statusConfig[item.status];
                return (
                  <tr key={item.id} style={{ background: item.status === 'OUT_OF_STOCK' ? 'rgba(239,68,68,0.03)' : item.status === 'LOW_STOCK' ? 'rgba(245,158,11,0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#0f172a' }}>
                          {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{item.categoryIcon}</div>}
                        </div>
                        <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{item.name}</span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.categoryIcon} {item.category}</span></td>
                    <td><span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>{item.sku || '-'}</span></td>
                    <td><span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>฿{item.costPrice}</span></td>
                    <td><span style={{ fontWeight: 700, color: '#ff1a6c' }}>฿{item.sellingPrice}</span></td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: sc.color }}>
                        {item.stock}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 4 }}>ชิ้น</span>
                    </td>
                    <td><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.lowStockThreshold}</span></td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 10px', borderRadius: 20 }}>
                        {sc.label}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => { setAdjustItem(item); setAdjustQty(''); setAdjustReason(''); setAdjustType('IN'); }}
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#818cf8', fontSize: '0.78rem', fontFamily: 'inherit', fontWeight: 600 }}
                      >
                        ปรับสต็อก
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustItem && (
        <div className="modal-overlay" onClick={() => setAdjustItem(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem' }}>ปรับปรุงสต็อก</h3>
              <button onClick={() => setAdjustItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
              <p style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem' }}>{adjustItem.name}</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>สต็อกปัจจุบัน: <strong style={{ color: '#f1f5f9' }}>{adjustItem.stock} ชิ้น</strong></p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>ประเภทการปรับ</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['IN', '+ รับสินค้า', '#34d399'], ['OUT', '- จ่ายสินค้า', '#f87171'], ['ADJUSTMENT', '~ ปรับสต็อก', '#818cf8']].map(([val, label, color]) => (
                    <button key={val} type="button" onClick={() => setAdjustType(val)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: adjustType === val ? `2px solid ${color}` : '1px solid rgba(51,65,85,0.5)', background: adjustType === val ? `${color}22` : 'rgba(51,65,85,0.4)', cursor: 'pointer', color: adjustType === val ? color : '#94a3b8', fontSize: '0.78rem', fontFamily: 'inherit', fontWeight: 600 }}>{label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>จำนวน</label>
                <input type="number" className="input-field" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="0" min="1" autoFocus />
                {adjustQty && !isNaN(parseInt(adjustQty)) && (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                    สต็อกใหม่: <strong style={{ color: adjustType === 'OUT' ? '#f87171' : '#34d399' }}>
                      {adjustType === 'OUT' ? Math.max(0, adjustItem.stock - parseInt(adjustQty)) : adjustItem.stock + parseInt(adjustQty)} ชิ้น
                    </strong>
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>เหตุผล</label>
                <input className="input-field" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="เช่น รับสินค้าจากผู้จัดจำหน่าย" />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => setAdjustItem(null)} style={{ flex: 1, justifyContent: 'center' }}>ยกเลิก</button>
                <button className="btn-primary" onClick={handleAdjust} disabled={isAdjusting || !adjustQty} style={{ flex: 2, justifyContent: 'center' }}>
                  {isAdjusting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                  บันทึกการปรับสต็อก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
