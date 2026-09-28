'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Category { id: string; name: string; icon: string; }
interface Variant { id?: string; name: string; sku?: string; price: number | string; costPrice?: number | string; stock: number | string; status: string; }
interface Product {
  id: string; name: string; description?: string; image?: string;
  sku?: string; barcode?: string; costPrice: number; sellingPrice: number;
  stock: number; lowStockThreshold: number; status: string;
  category: Category; variants: Variant[];
}

interface Props {
  product: Product | null;
  categories: Category[];
  onSuccess: () => void;
  onClose: () => void;
}

export default function ProductFormModal({ product, categories, onSuccess, onClose }: Props) {
  const { toast } = useToast();
  const isEdit = !!product;

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    image: product?.image || '',
    categoryId: product?.category?.id || (categories[0]?.id || ''),
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    costPrice: product?.costPrice?.toString() || '0',
    sellingPrice: product?.sellingPrice?.toString() || '',
    stock: product?.stock?.toString() || '0',
    lowStockThreshold: product?.lowStockThreshold?.toString() || '5',
    status: product?.status || 'ACTIVE',
  });

  const [variants, setVariants] = useState<Variant[]>(product?.variants?.map(v => ({
    id: v.id, name: v.name, sku: v.sku || '', price: v.price, costPrice: v.costPrice, stock: v.stock, status: v.status
  })) || []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const addVariant = () => setVariants(v => [...v, { name: '', sku: '', price: '', costPrice: '', stock: '0', status: 'ACTIVE' }]);
  const removeVariant = (i: number) => setVariants(v => v.filter((_, idx) => idx !== i));
  const setVariant = (i: number, key: string, val: string) => setVariants(v => v.map((vr, idx) => idx === i ? { ...vr, [key]: val } : vr));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('กรุณาระบุชื่อสินค้า');
    if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) return toast.error('กรุณาระบุราคาขาย');
    if (!form.categoryId) return toast.error('กรุณาเลือกหมวดหมู่');

    setIsSubmitting(true);
    try {
      const payload = { ...form, variants };
      const url = isEdit ? `/api/products/${product!.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(isEdit ? 'อัปเดตสินค้าเรียบร้อยแล้ว!' : 'เพิ่มสินค้าเรียบร้อยแล้ว!');
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { marginBottom: 4 };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1.1rem' }}>
            {isEdit ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>ชื่อสินค้า *</label>
              <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="เกี๊ยวซ่าต้นตำรับ" required />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>หมวดหมู่ *</label>
              <select className="input-field" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>สถานะ</label>
              <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ACTIVE">เปิดขาย</option>
                <option value="INACTIVE">ปิดขาย</option>
              </select>
            </div>

            {/* Image */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>URL รูปภาพ</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-field" value={form.image} onChange={e => set('image', e.target.value)} placeholder="https://..." style={{ flex: 1 }} />
                {form.image && (
                  <img src={form.image} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>รายละเอียด</label>
              <textarea
                className="input-field"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="รายละเอียดสินค้า..."
                rows={2}
                style={{ resize: 'vertical', minHeight: 60 }}
              />
            </div>

            {/* Price */}
            <div>
              <label style={labelStyle}>ราคาขาย (฿) *</label>
              <input type="number" className="input-field" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} placeholder="79" min="0" step="0.01" required />
            </div>

            {/* Cost */}
            <div>
              <label style={labelStyle}>ราคาทุน (฿)</label>
              <input type="number" className="input-field" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="35" min="0" step="0.01" />
            </div>

            {/* SKU */}
            <div>
              <label style={labelStyle}>SKU</label>
              <input className="input-field" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="GYZ-ORIG" />
            </div>

            {/* Barcode */}
            <div>
              <label style={labelStyle}>บาร์โค้ด</label>
              <input className="input-field" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="885000100011" />
            </div>

            {/* Stock */}
            <div>
              <label style={labelStyle}>จำนวนสต็อก</label>
              <input type="number" className="input-field" value={form.stock} onChange={e => set('stock', e.target.value)} min="0" />
            </div>

            {/* Low Stock Threshold */}
            <div>
              <label style={labelStyle}>แจ้งเตือนเมื่อเหลือ</label>
              <input type="number" className="input-field" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} min="0" />
            </div>
          </div>

          {/* Variants */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ ...labelStyle, margin: 0 }}>ตัวเลือกสินค้า (Variants)</label>
              <button type="button" onClick={addVariant} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#818cf8', fontSize: '0.78rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={13} /> เพิ่มตัวเลือก
              </button>
            </div>

            {variants.map((v, i) => (
              <div key={i} style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid rgba(51,65,85,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818cf8' }}>ตัวเลือก {i + 1}</span>
                  <button type="button" onClick={() => removeVariant(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}>
                    <Minus size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
                  <input className="input-field" value={v.name} onChange={e => setVariant(i, 'name', e.target.value)} placeholder="ชื่อ (เช่น 5 ชิ้น)" style={{ padding: '7px 10px', fontSize: '0.82rem' }} />
                  <input type="number" className="input-field" value={v.price} onChange={e => setVariant(i, 'price', e.target.value)} placeholder="ราคา" min="0" style={{ padding: '7px 10px', fontSize: '0.82rem' }} />
                  <input type="number" className="input-field" value={v.stock} onChange={e => setVariant(i, 'stock', e.target.value)} placeholder="สต็อก" min="0" style={{ padding: '7px 10px', fontSize: '0.82rem' }} />
                  <select className="input-field" value={v.status} onChange={e => setVariant(i, 'status', e.target.value)} style={{ padding: '7px 10px', fontSize: '0.82rem' }}>
                    <option value="ACTIVE">เปิด</option>
                    <option value="INACTIVE">ปิด</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 2, justifyContent: 'center' }}>
              {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
            </button>
          </div>
        </form>

        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
