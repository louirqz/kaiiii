'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, Loader2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface Category {
  id: string; name: string; icon: string; slug: string; description?: string;
  sortOrder: number; status: string; _count: { products: number };
}

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '🥟', description: '', sortOrder: '0', status: 'ACTIVE' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => toast.error('ไม่สามารถโหลดหมวดหมู่ได้'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setForm({ name: cat.name, icon: cat.icon, description: cat.description || '', sortOrder: cat.sortOrder.toString(), status: cat.status });
    setIsFormOpen(true);
  };

  const openAdd = () => {
    setEditCat(null);
    setForm({ name: '', icon: '🥟', description: '', sortOrder: '0', status: 'ACTIVE' });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('กรุณาระบุชื่อหมวดหมู่');
    setIsSubmitting(true);
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : '/api/categories';
      const method = editCat ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editCat ? 'แก้ไขหมวดหมู่แล้ว' : 'เพิ่มหมวดหมู่แล้ว');
      setIsFormOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCat) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteCat.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('ลบหมวดหมู่แล้ว');
      setDeleteCat(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = async (cat: Category) => {
    const newStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${newStatus === 'ACTIVE' ? 'เปิด' : 'ปิด'}หมวดหมู่แล้ว`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  };

  const emojiOptions = ['🥟', '🥤', '🍟', '🍱', '🔥', '⭐', '🍜', '🍛', '🍳', '🎁', '🧃', '☕'];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>📁 จัดการหมวดหมู่</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 2 }}>หมวดหมู่สินค้าทั้งหมด {categories.length} หมวด</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={18} />เพิ่มหมวดหมู่</button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={30} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          <FolderOpen size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600 }}>ยังไม่มีหมวดหมู่</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={openAdd}><Plus size={16} />เพิ่มหมวดหมู่แรก</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {categories.map((cat) => (
            <div key={cat.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {cat.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>{cat.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{cat._count.products} สินค้า</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(cat)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: cat.status === 'ACTIVE' ? '#34d399' : '#64748b' }}
                >
                  {cat.status === 'ACTIVE' ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
              </div>
              {cat.description && <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>{cat.description}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(cat)} style={{ flex: 1, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#818cf8', fontSize: '0.8rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Edit2 size={14} /> แก้ไข
                </button>
                <button onClick={() => setDeleteCat(cat)} disabled={cat._count.products > 0} style={{ flex: 1, background: cat._count.products > 0 ? 'rgba(51,65,85,0.3)' : 'rgba(239,68,68,0.1)', border: `1px solid ${cat._count.products > 0 ? 'rgba(51,65,85,0.3)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 8, padding: '8px', cursor: cat._count.products > 0 ? 'not-allowed' : 'pointer', color: cat._count.products > 0 ? '#475569' : '#f87171', fontSize: '0.8rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} title={cat._count.products > 0 ? 'ลบไม่ได้ มีสินค้าในหมวดนี้' : ''}>
                  <Trash2 size={14} /> ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1.1rem' }}>
                {editCat ? '✏️ แก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่ใหม่'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>ชื่อหมวดหมู่ *</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น เกี๊ยวซ่า" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>ไอคอน</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {emojiOptions.map(em => (
                    <button key={em} type="button" onClick={() => setForm(f => ({ ...f, icon: em }))} style={{ width: 40, height: 40, borderRadius: 8, background: form.icon === em ? 'rgba(99,102,241,0.25)' : 'rgba(51,65,85,0.5)', border: form.icon === em ? '2px solid #818cf8' : '1px solid rgba(51,65,85,0.5)', cursor: 'pointer', fontSize: 20 }}>
                      {em}
                    </button>
                  ))}
                </div>
                <input className="input-field" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🥟 (หรือพิมพ์อีโมจิ)" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>รายละเอียด</label>
                <textarea className="input-field" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>ลำดับ</label>
                  <input type="number" className="input-field" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>สถานะ</label>
                  <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">เปิด</option>
                    <option value="INACTIVE">ปิด</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>ยกเลิก</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 2, justifyContent: 'center' }}>
                  {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                  {editCat ? 'บันทึก' : 'เพิ่มหมวดหมู่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteCat}
        title={`ลบหมวดหมู่ "${deleteCat?.name}"`}
        message="คุณต้องการลบหมวดหมู่นี้ออกจากระบบหรือไม่?"
        confirmText="ลบหมวดหมู่" cancelText="ยกเลิก" confirmVariant="danger"
        onConfirm={handleDelete} onCancel={() => setDeleteCat(null)} isLoading={isDeleting}
      />
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
