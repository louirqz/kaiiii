'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Package, ToggleLeft, ToggleRight, Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ProductFormModal from '@/components/admin/product-form-modal';

interface Category { id: string; name: string; icon: string; }
interface Variant { id: string; name: string; sku?: string; price: number; stock: number; status: string; }
interface Product {
  id: string; name: string; description?: string; image?: string;
  sku?: string; barcode?: string; costPrice: number; sellingPrice: number;
  stock: number; lowStockThreshold: number; status: string;
  category: Category; variants: Variant[];
  createdAt: string; updatedAt: string;
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProducts = useCallback((q: string, cat: string, status: string, pg: number) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: '20' });
    if (q.trim()) params.set('search', q.trim());
    if (cat !== 'all') params.set('category', cat);
    if (status !== 'all') params.set('status', status);

    fetch(`/api/products?${params}`)
      .then(r => r.json())
      .then(d => {
        setProducts(d.products || []);
        setTotalPages(d.pagination?.totalPages || 1);
        setTotal(d.pagination?.total || 0);
      })
      .catch(() => toast.error('ไม่สามารถโหลดข้อมูลสินค้าได้'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadProducts(search, categoryFilter, statusFilter, page), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, categoryFilter, statusFilter, page, loadProducts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('ลบสินค้าเรียบร้อยแล้ว');
      setDeleteTarget(null);
      loadProducts(search, categoryFilter, statusFilter, page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${newStatus === 'ACTIVE' ? 'เปิด' : 'ปิด'}สินค้าแล้ว`);
      loadProducts(search, categoryFilter, statusFilter, page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditProduct(null);
    loadProducts(search, categoryFilter, statusFilter, 1);
    setPage(1);
  };

  const getStockStatus = (p: Product) => {
    if (p.stock <= 0) return { label: 'หมด', color: '#f87171', bg: 'rgba(239,68,68,0.1)' };
    if (p.stock <= p.lowStockThreshold) return { label: 'ใกล้หมด', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' };
    return { label: 'มีสินค้า', color: '#34d399', bg: 'rgba(16,185,129,0.1)' };
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>📦 จัดการสินค้า</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 2 }}>สินค้าทั้งหมด {total} รายการ</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setEditProduct(null); setIsFormOpen(true); }}
          id="add-product-btn"
        >
          <Plus size={18} />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 38 }}
            placeholder="ค้นหาสินค้า, SKU, บาร์โค้ด..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input-field" style={{ width: 'auto' }} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="all">ทุกหมวดหมู่</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select className="input-field" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">ทุกสถานะ</option>
          <option value="ACTIVE">เปิดขาย</option>
          <option value="INACTIVE">ปิดขาย</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <Loader2 size={30} style={{ color: '#818cf8', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#64748b' }}>กำลังโหลด...</span>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <Package size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, marginBottom: 6 }}>ไม่พบสินค้า</p>
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => { setEditProduct(null); setIsFormOpen(true); }}>
              <Plus size={16} /> เพิ่มสินค้าแรก
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th>หมวดหมู่</th>
                <th>SKU</th>
                <th>ราคา</th>
                <th>ต้นทุน</th>
                <th>สต็อก</th>
                <th>สถานะ</th>
                <th style={{ width: 120 }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#0f172a' }}>
                          {product.image ? (
                            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                              {product.category.icon}
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{product.name}</p>
                          {product.variants.length > 0 && (
                            <p style={{ fontSize: '0.7rem', color: '#818cf8' }}>{product.variants.length} ตัวเลือก</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {product.category.icon} {product.category.name}
                      </span>
                    </td>
                    <td><span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>{product.sku || '-'}</span></td>
                    <td><span style={{ fontWeight: 700, color: '#ff1a6c' }}>฿{product.sellingPrice}</span></td>
                    <td><span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>฿{product.costPrice}</span></td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: stockStatus.color, background: stockStatus.bg, padding: '3px 8px', borderRadius: 20 }}>
                        {product.stock} — {stockStatus.label}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleStatus(product)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: product.status === 'ACTIVE' ? '#34d399' : '#64748b', fontSize: '0.8rem', fontFamily: 'inherit', fontWeight: 600 }}
                      >
                        {product.status === 'ACTIVE' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        {product.status === 'ACTIVE' ? 'เปิด' : 'ปิด'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setEditProduct(product); setIsFormOpen(true); }}
                          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#818cf8', display: 'flex', alignItems: 'center' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ← ก่อนหน้า
          </button>
          <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>หน้า {page} / {totalPages}</span>
          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            ถัดไป →
          </button>
        </div>
      )}

      {/* Modals */}
      {isFormOpen && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          onSuccess={handleFormSuccess}
          onClose={() => { setIsFormOpen(false); setEditProduct(null); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`ลบสินค้า "${deleteTarget?.name}"`}
        message="คุณต้องการลบสินค้านี้ออกจากระบบหรือไม่? ประวัติออเดอร์จะยังคงอยู่ (Soft Delete)"
        confirmText="ลบสินค้า"
        cancelText="ยกเลิก"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
