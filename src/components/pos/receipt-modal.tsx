'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';

interface CartItem {
  cartId: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  stock?: number;
  image?: string;
}

interface ReceiptModalProps {
  order: {
    id: string;
    orderNumber: string;
    total: number;
    subtotal: number;
    discountAmount: number;
    createdAt?: string;
    customerName?: string;
    paymentMethod?: string;
  };
  cart?: CartItem[];
  onClose: () => void;
}

export default function ReceiptModal({ order, cart = [], onClose }: ReceiptModalProps) {
  const [storeName, setStoreName] = useState('nnichna');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [items, setItems] = useState<CartItem[]>(cart);

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const dateStr = orderDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = orderDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.setting) {
          setStoreName(d.setting.storeName || 'nnichna');
          setStoreAddress(d.setting.address || '');
          setStorePhone(d.setting.phone || '');
          setReceiptFooter(d.setting.receiptFooter || '');
        }
      })
      .catch(() => {});

    // If no cart items passed, load from order details
    if ((!cart || cart.length === 0) && order.id) {
      fetch(`/api/orders/${order.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.order?.items) {
            setItems(
              d.order.items.map((i: { id: string; productId: string; variantId?: string; productNameSnapshot: string; variantNameSnapshot?: string; priceSnapshot: number; quantity: number }) => ({
                cartId: i.id,
                productId: i.productId,
                variantId: i.variantId,
                name: i.productNameSnapshot,
                variantName: i.variantNameSnapshot,
                price: i.priceSnapshot,
                quantity: i.quantity,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [order.id, cart]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        {/* Top actions */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={22} style={{ color: '#34d399' }} />
            <h2 style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1.1rem' }}>ใบเสร็จรับเงิน</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Receipt Content */}
        <div
          className="receipt-print"
          style={{
            background: 'white',
            color: '#1e293b',
            borderRadius: 12,
            padding: '20px',
            fontFamily: "'Courier New', monospace",
            fontSize: '13px',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: '2px dashed #cbd5e1', paddingBottom: 12 }}>
            <p style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>🥟 {storeName}</p>
            {storeAddress && <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 2px', lineHeight: 1.4 }}>{storeAddress}</p>}
            {storePhone && <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>โทร: {storePhone}</p>}
          </div>

          {/* Order Info */}
          <div style={{ marginBottom: 10, borderBottom: '1px dashed #cbd5e1', paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>เลขออเดอร์</span>
              <span style={{ fontWeight: 700 }}>{order.orderNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ color: '#64748b' }}>วันที่</span>
              <span style={{ fontSize: '11px' }}>{dateStr}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ color: '#64748b' }}>เวลา</span>
              <span>{timeStr}</span>
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 10, borderBottom: '1px dashed #cbd5e1', paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '11px', marginBottom: 6 }}>
              <span>รายการ</span>
              <span>ราคา</span>
            </div>
            {items.map((item) => (
              <div key={item.cartId} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>{item.name}{item.variantName ? ` (${item.variantName})` : ''}</span>
                  <span style={{ fontWeight: 700 }}>฿{(item.price * item.quantity).toFixed(0)}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '11px', paddingLeft: 8 }}>
                  {item.quantity} × ฿{item.price.toFixed(0)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span>฿{order.subtotal.toFixed(0)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', marginBottom: 4 }}>
                <span>ส่วนลด</span>
                <span>-฿{order.discountAmount.toFixed(0)}</span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 900,
                fontSize: '17px',
                borderTop: '2px solid #1e293b',
                paddingTop: 8,
                marginTop: 6,
              }}
            >
              <span>ยอดสุทธิ</span>
              <span style={{ color: '#e60052' }}>฿{order.total.toFixed(0)}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', borderTop: '2px dashed #cbd5e1', paddingTop: 12 }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
              {receiptFooter || 'ขอบคุณที่อุดหนุน nnichna!'}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="no-print" style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            ปิด
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={handlePrint}>
            <Printer size={16} /> พิมพ์ใบเสร็จ
          </button>
        </div>
      </div>
    </div>
  );
}
