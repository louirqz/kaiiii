'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  X,
  Loader2,
  Package,
  CreditCard,
  RefreshCw,
  Tag,
  Shield,
  KeyRound,
  Maximize,
  Minimize,
  Receipt,
  TrendingUp,
  LogOut,
  ExternalLink,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle,
  User,
  LogIn,
} from 'lucide-react';
import { ToastProvider, useToast } from '@/components/ui/toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import CheckoutModal from '@/components/pos/checkout-modal';
import ReceiptModal from '@/components/pos/receipt-modal';

interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

interface Variant {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sellingPrice: number;
  costPrice: number;
  stock: number;
  status: string;
  categoryId: string;
  category: { id: string; name: string; icon: string; slug: string };
  variants: Variant[];
}

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

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  customerName?: string;
  paymentMethod?: string;
  createdAt?: string;
}

interface CurrentUser {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
}

function POSContent() {
  const { toast } = useToast();
  const router = useRouter();

  // App & User States
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastCompletedCart, setLastCompletedCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Modals
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null);

  // Login & Admin PIN Modal
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginTab, setLoginTab] = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [loginForm, setLoginForm] = useState({ usernameOrEmail: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [adminPin, setAdminPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  // Register Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);

  // Top Bar Feature Modals
  const [isRecentOrdersOpen, setIsRecentOrdersOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isTodaySummaryOpen, setIsTodaySummaryOpen] = useState(false);
  const [todayStats, setTodayStats] = useState<{ sales: number; orders: number; itemsSold: number; averageOrder: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Discount
  const [discountType, setDiscountType] = useState<'NONE' | 'FIXED' | 'PERCENTAGE'>('NONE');
  const [discountValue, setDiscountValue] = useState('0');

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check current session
  const checkCurrentUser = useCallback(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setCurrentUser(d.user);
        else setCurrentUser(null);
      })
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    checkCurrentUser();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('loginAdmin') === '1' || params.get('openAdminPin') === 'true') {
        setIsLoginOpen(true);
        setLoginTab('PIN');
      } else if (params.get('login') === '1') {
        setIsLoginOpen(true);
        setLoginTab('PASSWORD');
      } else if (params.get('register') === '1') {
        setIsRegisterOpen(true);
      }
    }
  }, [checkCurrentUser]);

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => toast.error('ไม่สามารถโหลดหมวดหมู่ได้'));
  }, [toast]);

  // Debounced product load
  const loadProducts = useCallback((q: string, cat: string) => {
    setIsLoadingProducts(true);
    const params = new URLSearchParams({ limit: '100', status: 'ACTIVE' });
    if (q.trim()) params.set('search', q.trim());
    if (cat && cat !== 'all') params.set('category', cat);

    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => toast.error('ไม่สามารถโหลดสินค้าได้'))
      .finally(() => setIsLoadingProducts(false));
  }, [toast]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadProducts(search, selectedCategory), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selectedCategory, loadProducts]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Open Recent Orders
  const openRecentOrders = async () => {
    setIsRecentOrdersOpen(true);
    setIsOrdersLoading(true);
    try {
      const res = await fetch('/api/orders?limit=12');
      const data = await res.json();
      setRecentOrders(data.orders || []);
    } catch {
      toast.error('ไม่สามารถโหลดประวัติบิลได้');
    } finally {
      setIsOrdersLoading(false);
    }
  };

  // Open Today Summary
  const openTodaySummary = async () => {
    setIsTodaySummaryOpen(true);
    try {
      const res = await fetch('/api/reports?range=today');
      const data = await res.json();
      if (data.today) setTodayStats(data.today);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลสรุปยอดได้');
    }
  };

  // Login with Username/Password
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: loginForm.usernameOrEmail,
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
      }
      toast.success(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${data.user.name}`);
      setIsLoginOpen(false);
      setLoginForm({ usernameOrEmail: '', password: '' });
      checkCurrentUser();
      if (data.user.role === 'ADMIN' || data.user.role === 'MANAGER') {
        router.push('/admin');
      }
    } catch {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoginLoading(false);
    }
  };

  // Admin PIN verification (PIN: 1111)
  const handlePinInput = (num: string) => {
    if (adminPin.length < 4) {
      const nextPin = adminPin + num;
      setAdminPin(nextPin);
      if (nextPin.length === 4) {
        verifyAdminPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setAdminPin((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const verifyAdminPin = async (inputPin: string) => {
    setPinError('');
    setPinLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'รหัส PIN ไม่ถูกต้อง (ใช้รหัส 1111)');
        setAdminPin('');
        return;
      }
      toast.success('เข้าสู่ระบบผู้ดูแลระบบเรียบร้อย');
      setIsLoginOpen(false);
      setAdminPin('');
      checkCurrentUser();
      router.push('/admin');
    } catch {
      setPinError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setAdminPin('');
    } finally {
      setPinLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    toast.success('ออกจากระบบเรียบร้อย');
  };

  // Register handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        return;
      }
      toast.success(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ ${data.user?.name || registerForm.name}`);
      setRegisterSuccess(true);
      checkCurrentUser();
    } catch {
      setRegisterError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCloseRegister = () => {
    setIsRegisterOpen(false);
    setRegisterForm({ name: '', username: '', email: '', password: '', confirmPassword: '' });
    setRegisterError('');
    setRegisterSuccess(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirm(false);
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount =
    discountType === 'PERCENTAGE'
      ? (subtotal * parseFloat(discountValue || '0')) / 100
      : discountType === 'FIXED'
        ? Math.min(parseFloat(discountValue || '0'), subtotal)
        : 0;
  const total = Math.max(0, subtotal - discountAmount);

  // Add to cart
  const addToCart = (product: Product, variant?: Variant) => {
    if (product.variants.length > 0 && !variant) {
      setVariantModalProduct(product);
      return;
    }

    const stock = variant ? variant.stock : product.stock;
    const price = variant ? variant.price : product.sellingPrice;
    const cartId = variant ? `${product.id}-${variant.id}` : product.id;

    if (stock <= 0) {
      toast.error(`${product.name} สต็อกหมดแล้ว`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.cartId === cartId);
      if (existing) {
        if (existing.quantity >= stock) {
          toast.warning(`${product.name} มีสต็อกเพียง ${stock} ชิ้น`);
          return prev;
        }
        return prev.map((c) =>
          c.cartId === cartId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          cartId,
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          variantName: variant?.name,
          price,
          quantity: 1,
          stock,
          image: product.image,
        },
      ];
    });

    if (!variant) setVariantModalProduct(null);
  };

  const updateQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.cartId !== cartId) return c;
          const newQty = c.quantity + delta;
          if (newQty > c.stock) {
            toast.warning(`มีสต็อกเพียง ${c.stock} ชิ้น`);
            return c;
          }
          return newQty <= 0 ? null : { ...c, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('NONE');
    setDiscountValue('0');
    setIsClearConfirmOpen(false);
  };

  const onCheckoutComplete = (order: Order) => {
    setLastCompletedCart([...cart]);
    setCompletedOrder(order);
    setIsCheckoutOpen(false);
    clearCart();
  };

  const formatPrice = (n: number) =>
    `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);

  const getCategoryFallback = (icon?: string) => {
    if (icon) return icon;
    return '🥟';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0b0f17' }}>
      {/* LEFT — Products Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header Bar */}
        <header
          style={{
            padding: '12px 20px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
            zIndex: 20,
          }}
        >
          {/* Logo & Store Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #ff1a6c, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 4px 14px rgba(230,0,82,0.35)',
              }}
            >
              🥟
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    background: 'linear-gradient(135deg, #ff1a6c, #818cf8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                  }}
                >
                  nnichna
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '2px 8px',
                    borderRadius: 99,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                  หน้าร้านเปิดบริการ
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>
                Gyoza House & POS System
              </div>
            </div>
          </div>

          {/* Search Bar & Top Functional Menu Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flex: 1,
              maxWidth: 720,
              justifyContent: 'center',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
              <input
                ref={searchRef}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
                placeholder="ค้นหาเมนู, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="pos-search"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Action Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Order History */}
              <button
                onClick={openRecentOrders}
                style={{
                  padding: '7px 12px',
                  borderRadius: 9,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                className="hover:border-slate-400 hover:text-white"
                title="ดูประวัติบิลออเดอร์ล่าสุด"
              >
                <Receipt size={14} style={{ color: '#818cf8' }} />
                ประวัติบิล
              </button>

              {/* Today Sales Summary */}
              <button
                onClick={openTodaySummary}
                style={{
                  padding: '7px 12px',
                  borderRadius: 9,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                className="hover:border-slate-400 hover:text-white"
                title="ดูสรุปยอดขายวันนี้"
              >
                <TrendingUp size={14} style={{ color: '#34d399' }} />
                สรุปวันนี้
              </button>

              {/* Refresh Products */}
              <button
                onClick={() => loadProducts(search, selectedCategory)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 9,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
                className="hover:border-slate-400 hover:text-white"
                title="รีเฟรชข้อมูลสินค้าและสต็อก"
              >
                <RefreshCw size={14} className={isLoadingProducts ? 'animate-spin' : ''} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                style={{
                  padding: '7px 10px',
                  borderRadius: 9,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
                className="hover:border-slate-400 hover:text-white"
                title={isFullscreen ? 'ออกจากเต็มจอ' : 'แสดงเต็มหน้าจอ'}
              >
                {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              </button>
            </div>
          </div>

          {/* Right Section: Member / Cashier / Admin Session or Login/Register */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' ? (
                  <Link
                    href="/admin"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, rgba(230,0,82,0.2), rgba(99,102,241,0.2))',
                      border: '1px solid rgba(255,26,108,0.5)',
                      color: '#ff4d88',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 10px rgba(230,0,82,0.2)',
                    }}
                    className="hover:opacity-90"
                    title="ไปที่แดชบอร์ดแอดมิน"
                  >
                    <Shield size={15} style={{ color: '#ff1a6c' }} />
                    <span>แอดมิน ({currentUser.name})</span>
                    <ExternalLink size={12} style={{ opacity: 0.7 }} />
                  </Link>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid #475569',
                      color: '#38bdf8',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                    title="ผู้ใช้งานปัจจุบัน"
                  >
                    <User size={15} style={{ color: '#38bdf8' }} />
                    <span>{currentUser.name}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#94a3b8',
                        background: 'rgba(255,255,255,0.08)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      แคชเชียร์
                    </span>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'rgba(51, 65, 85, 0.4)',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '8px 10px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.75rem',
                  }}
                  className="hover:text-red-400 hover:border-red-500/40"
                  title="ออกจากระบบ"
                >
                  <LogOut size={13} />
                  <span>ออก</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Register Button */}
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))',
                    border: '1px solid rgba(52,211,153,0.5)',
                    color: '#34d399',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 10px rgba(16,185,129,0.15)',
                    whiteSpace: 'nowrap',
                  }}
                  className="hover:scale-105 active:scale-95"
                >
                  <UserPlus size={15} style={{ color: '#34d399' }} />
                  สมัครสมาชิก
                </button>

                {/* Login Button */}
                <button
                  onClick={() => {
                    setIsLoginOpen(true);
                    setLoginTab('PASSWORD');
                    setLoginError('');
                    setPinError('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(230,0,82,0.15), rgba(79,70,229,0.15))',
                    border: '1px solid rgba(255,26,108,0.6)',
                    color: '#ff4d88',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 10px rgba(255,26,108,0.2)',
                    whiteSpace: 'nowrap',
                  }}
                  className="hover:scale-105 active:scale-95"
                >
                  <LogIn size={15} style={{ color: '#ff1a6c' }} />
                  เข้าสู่ระบบ
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Category Filter Bar */}
        <div
          style={{
            padding: '10px 20px',
            background: 'rgba(15, 23, 42, 0.7)',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            flexShrink: 0,
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '8px 18px',
              borderRadius: 20,
              border: selectedCategory === 'all' ? '1px solid #ff1a6c' : '1px solid #334155',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background:
                selectedCategory === 'all'
                  ? 'linear-gradient(135deg, #ff1a6c, #e60052)'
                  : 'rgba(30, 41, 59, 0.7)',
              color: selectedCategory === 'all' ? 'white' : '#94a3b8',
              boxShadow: selectedCategory === 'all' ? '0 4px 14px rgba(230,0,82,0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🍽️ ทั้งหมด ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 20,
                  border: isSelected ? '1px solid #ff1a6c' : '1px solid #334155',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: isSelected
                    ? 'linear-gradient(135deg, #ff1a6c, #e60052)'
                    : 'rgba(30, 41, 59, 0.7)',
                  color: isSelected ? 'white' : '#94a3b8',
                  boxShadow: isSelected ? '0 4px 14px rgba(230,0,82,0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.icon} {cat.name} {count > 0 && <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {isLoadingProducts ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: '#1e293b' }}>
                  <div className="skeleton" style={{ height: 130 }} />
                  <div style={{ padding: '14px' }}>
                    <div className="skeleton" style={{ height: 16, marginBottom: 8, borderRadius: 4 }} />
                    <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', gap: 12 }}>
              <Package size={48} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>ไม่พบรายการสินค้าที่ค้นหา</p>
              <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {products.map((product) => {
                const isOutOfStock = product.stock <= 0 && product.variants.length === 0;
                const hasBrokenImage = brokenImages[product.id];
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    style={{
                      background: 'rgba(30, 41, 59, 0.75)',
                      border: `1px solid ${isOutOfStock ? '#1e293b' : 'rgba(51, 65, 85, 0.6)'}`,
                      borderRadius: 16,
                      overflow: 'hidden',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.5 : 1,
                      textAlign: 'left',
                      padding: 0,
                      fontFamily: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                    className="hover:scale-[1.02] hover:border-pink-500/50 hover:shadow-lg active:scale-98"
                  >
                    {/* Product Image Area */}
                    <div
                      style={{
                        position: 'relative',
                        height: 130,
                        width: '100%',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                      }}
                    >
                      {product.image && !hasBrokenImage ? (
                        <img
                          src={product.image}
                          alt=""
                          onError={() => setBrokenImages((prev) => ({ ...prev, [product.id]: true }))}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease',
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 48,
                            background: 'linear-gradient(135deg, rgba(230,0,82,0.12), rgba(79,70,229,0.12))',
                          }}
                        >
                          {getCategoryFallback(product.category?.icon)}
                        </div>
                      )}

                      {/* Variant Badge */}
                      {product.variants.length > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            background: 'rgba(99, 102, 241, 0.95)',
                            color: 'white',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 20,
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          }}
                        >
                          {product.variants.length} รสชาติ
                        </div>
                      )}

                      {/* Out of Stock Overlay */}
                      {isOutOfStock && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f87171',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                          }}
                        >
                          สินค้าหมด
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div
                      style={{
                        padding: '12px 14px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      {/* Name */}
                      <p
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: '#f8fafc',
                          lineHeight: 1.4,
                          minHeight: 40,
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {product.name}
                      </p>

                      {/* Price and Stock Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid rgba(51, 65, 85, 0.4)',
                          paddingTop: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: '#ff1a6c',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {product.variants.length > 0
                            ? `฿${Math.min(...product.variants.map((v) => v.price))}`
                            : `฿${product.sellingPrice}`}
                        </span>

                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: product.variants.length > 0 ? '#818cf8' : product.stock <= 5 ? '#fbbf24' : '#34d399',
                            fontWeight: 600,
                            background: 'rgba(15, 23, 42, 0.6)',
                            padding: '2px 6px',
                            borderRadius: 6,
                          }}
                        >
                          {product.variants.length > 0
                            ? 'มีตัวเลือก'
                            : `สต็อก ${product.stock}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart & Checkout Panel */}
      <div
        style={{
          width: 380,
          background: 'rgba(15, 23, 42, 0.98)',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Cart Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} style={{ color: '#818cf8' }} />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                รายการสั่งซื้อ (Cart)
              </span>
              {totalItems > 0 && (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ff1a6c, #e60052)',
                    color: 'white',
                    borderRadius: 20,
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {totalItems} ชิ้น
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.8rem',
                  fontFamily: 'inherit',
                }}
                className="hover:text-red-400"
              >
                <Trash2 size={14} /> ล้างตะกร้า
              </button>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {cart.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#64748b',
                gap: 12,
              }}
            >
              <ShoppingCart size={48} style={{ opacity: 0.25 }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>ยังไม่มีสินค้าในตะกร้า</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, textAlign: 'center' }}>
                คลิกที่การ์ดเมนูอาหารทางด้านซ้ายเพื่อสั่งซื้อ
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  style={{
                    background: 'rgba(30, 41, 59, 0.65)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    borderRadius: 12,
                    padding: '12px',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#0f172a',
                    }}
                  >
                    {item.image ? (
                      <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        🥟
                      </div>
                    )}
                  </div>

                  {/* Title & Qty */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#f8fafc',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </p>
                    {item.variantName && (
                      <p style={{ fontSize: '0.72rem', color: '#818cf8', marginTop: 2 }}>{item.variantName}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <button
                        onClick={() => updateQty(item.cartId, -1)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: 'rgba(51, 65, 85, 0.8)',
                          border: '1px solid #475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#cbd5e1',
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#f8fafc',
                          minWidth: 24,
                          textAlign: 'center',
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.cartId, 1)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: 'rgba(51, 65, 85, 0.8)',
                          border: '1px solid #475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#cbd5e1',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Total & Delete */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ff1a6c' }}>
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>฿{item.price}/ชิ้น</span>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                      className="hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount & Calculation */}
        {cart.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Tag size={14} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>ส่วนลดท้ายบิล</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'NONE' | 'FIXED' | 'PERCENTAGE')}
                style={{
                  padding: '7px 10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                }}
              >
                <option value="NONE">ไม่มีส่วนลด</option>
                <option value="PERCENTAGE">เปอร์เซ็นต์ (%)</option>
                <option value="FIXED">ลดเงินสด (฿)</option>
              </select>
              {discountType !== 'NONE' && (
                <input
                  type="number"
                  min="0"
                  max={discountType === 'PERCENTAGE' ? 100 : subtotal}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  style={{
                    width: 90,
                    padding: '7px 10px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                  }}
                  placeholder={discountType === 'PERCENTAGE' ? '%' : '฿'}
                />
              )}
            </div>
          </div>
        )}

        {/* Total & Checkout Button */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.98)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>ยอดรวม (Subtotal)</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: '#34d399' }}>
              <span>ส่วนลด (Discount)</span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>ยอดสุทธิ (Total)</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ff1a6c' }}>{formatPrice(total)}</span>
          </div>

          <button
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              background: cart.length === 0 ? 'rgba(51, 65, 85, 0.4)' : 'linear-gradient(135deg, #ff1a6c, #e60052)',
              color: 'white',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: cart.length === 0 ? 'none' : '0 4px 16px rgba(230,0,82,0.4)',
              transition: 'all 0.15s ease',
            }}
            className={cart.length > 0 ? 'hover:opacity-90 active:scale-98' : ''}
          >
            <CreditCard size={18} />
            คิดเงิน / ชำระเงิน ({totalItems} ชิ้น)
          </button>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* 0. REGISTER MODAL */}
      {isRegisterOpen && (
        <div className="modal-overlay" onClick={handleCloseRegister}>
          <div
            className="modal-content"
            style={{ maxWidth: 440, padding: '32px 28px', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                    flexShrink: 0,
                  }}
                >
                  <UserPlus size={22} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: 2 }}>
                    สมัครสมาชิก
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>nnichna · Gyoza House</p>
                </div>
              </div>
              <button
                onClick={handleCloseRegister}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1, padding: 4 }}
                className="hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Success State */}
            {registerSuccess ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.2))',
                    border: '2px solid rgba(52,211,153,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  <CheckCircle size={34} style={{ color: '#34d399' }} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>สมัครสมาชิกและเข้าสู่ระบบสำเร็จ! 🎉</h4>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: 320, textAlign: 'center' }}>
                  บัญชีของคุณถูกบันทึกลงฐานข้อมูลและเข้าสู่ระบบเรียบร้อยแล้ว
                  พร้อมทำรายการขายหน้าร้านได้ทันที
                </p>
                <div
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    borderRadius: 10,
                    padding: '10px 16px',
                    fontSize: '0.78rem',
                    color: '#34d399',
                    width: '100%',
                    marginTop: 4,
                  }}
                >
                  ✅ เชื่อมต่อฐานข้อมูลระบบแล้ว · เข้าสู่ระบบในชื่อ <strong style={{ color: '#ffffff' }}>{registerForm.username}</strong>
                </div>
                <button
                  onClick={handleCloseRegister}
                  style={{
                    marginTop: 8,
                    padding: '10px 32px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  className="hover:opacity-90"
                >
                  เริ่มใช้งาน POS ได้ทันที
                </button>
              </div>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                    ชื่อ-นามสกุล <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Username */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                    ชื่อผู้ใช้ (Username) <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น somchai123"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                    อีเมล <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="example@email.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                    รหัสผ่าน <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                    ยืนยันรหัสผ่าน <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegisterConfirm ? 'text' : 'password'}
                      required
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        background: '#0f172a',
                        border: registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword
                          ? '1px solid rgba(239,68,68,0.6)'
                          : '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterConfirm((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      {showRegisterConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword && (
                    <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: 4 }}>รหัสผ่านไม่ตรงกัน</p>
                  )}
                </div>

                {/* Error */}
                {registerError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      color: '#f87171',
                      fontSize: '0.82rem',
                    }}
                  >
                    {registerError}
                  </div>
                )}

                {/* Note */}
                <div
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    lineHeight: 1.6,
                  }}
                >
                  ✨ บัญชีสมาชิกจะเชื่อมต่อกับฐานข้อมูลทันที และสามารถเข้าใช้งานระบบได้ทันที
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={registerLoading || (!!registerForm.confirmPassword && registerForm.password !== registerForm.confirmPassword)}
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    background: registerLoading ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: registerLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                    transition: 'all 0.15s ease',
                    marginTop: 4,
                  }}
                  className={!registerLoading ? 'hover:opacity-90 active:scale-95' : ''}
                >
                  {registerLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      กำลังสมัครสมาชิก...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      สมัครสมาชิก
                    </>
                  )}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                  มีบัญชีแล้ว?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseRegister();
                      setIsLoginOpen(true);
                      setLoginTab('PASSWORD');
                      setLoginError('');
                      setPinError('');
                    }}
                    style={{ background: 'none', border: 'none', color: '#ff4d88', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'underline' }}
                  >
                    เข้าสู่ระบบที่นี่
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 1. LOGIN MODAL (Account Database Login & Quick PIN 1111) */}
      {isLoginOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setIsLoginOpen(false);
            setAdminPin('');
            setPinError('');
            setLoginError('');
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 400, padding: '28px 24px', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #ff1a6c, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(255,26,108,0.3)',
                    flexShrink: 0,
                  }}
                >
                  <LogIn size={22} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: 2 }}>
                    เข้าสู่ระบบ
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>nnichna · Gyoza House & POS System</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLoginOpen(false);
                  setAdminPin('');
                  setPinError('');
                  setLoginError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '1.3rem',
                  lineHeight: 1,
                  padding: 4,
                }}
                className="hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                background: '#0f172a',
                padding: 4,
                borderRadius: 12,
                border: '1px solid #1e293b',
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setLoginTab('PASSWORD');
                  setLoginError('');
                  setPinError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: 'none',
                  background: loginTab === 'PASSWORD' ? 'linear-gradient(135deg, #ff1a6c, #e60052)' : 'transparent',
                  color: loginTab === 'PASSWORD' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  boxShadow: loginTab === 'PASSWORD' ? '0 2px 8px rgba(255,26,108,0.3)' : 'none',
                }}
              >
                <User size={14} />
                ชื่อผู้ใช้ / รหัสผ่าน
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginTab('PIN');
                  setLoginError('');
                  setPinError('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 9,
                  border: 'none',
                  background: loginTab === 'PIN' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  color: loginTab === 'PIN' ? '#ffffff' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                  boxShadow: loginTab === 'PIN' ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}
              >
                <KeyRound size={14} />
                รหัส PIN แอดมิน
              </button>
            </div>

            {/* TAB 1: USERNAME / PASSWORD FORM */}
            {loginTab === 'PASSWORD' && (
              <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Username or Email */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                    ชื่อผู้ใช้ หรือ อีเมล <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="เช่น admin หรือ username ของคุณ"
                    value={loginForm.usernameOrEmail}
                    onChange={(e) => setLoginForm((p) => ({ ...p, usernameOrEmail: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' }}>
                    รหัสผ่าน <span style={{ color: '#ff1a6c' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="กรอกรหัสผ่านของคุณ"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 14px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error Alert */}
                {loginError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      color: '#f87171',
                      fontSize: '0.82rem',
                    }}
                  >
                    {loginError}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    background: loginLoading ? 'rgba(230,0,82,0.4)' : 'linear-gradient(135deg, #ff1a6c, #e60052)',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(230,0,82,0.3)',
                    transition: 'all 0.15s ease',
                    marginTop: 4,
                  }}
                  className={!loginLoading ? 'hover:opacity-90 active:scale-95' : ''}
                >
                  {loginLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      กำลังเข้าสู่ระบบ...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      เข้าสู่ระบบ
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: PIN KEYPAD FORM */}
            {loginTab === 'PIN' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 16 }}>
                  กรุณากรอกรหัส PIN 4 หลักเพื่อเข้าสู่ระบบจัดการ
                </p>

                {/* PIN Dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = adminPin.length > idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '2px solid #ff1a6c',
                          background: isFilled ? '#ff1a6c' : 'transparent',
                          boxShadow: isFilled ? '0 0 12px rgba(255,26,108,0.6)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    );
                  })}
                </div>

                {/* Error Message */}
                {pinError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      marginBottom: 16,
                    }}
                  >
                    {pinError}
                  </div>
                )}

                {pinLoading && (
                  <div style={{ color: '#ff1a6c', fontSize: '0.8rem', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Loader2 size={14} className="animate-spin" />
                    กำลังตรวจสอบ...
                  </div>
                )}

                {/* Keypad */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    maxWidth: 260,
                    margin: '0 auto 16px',
                  }}
                >
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinInput(digit)}
                      disabled={pinLoading}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        color: '#f8fafc',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                      }}
                      className="hover:border-pink-500 hover:bg-slate-800 active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAdminPin('')}
                    disabled={pinLoading}
                    style={{
                      height: 48,
                      borderRadius: 12,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    className="hover:bg-red-500/20 active:scale-95"
                  >
                    ล้าง
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinInput('0')}
                    disabled={pinLoading}
                    style={{
                      height: 48,
                      borderRadius: 12,
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    className="hover:border-pink-500 hover:bg-slate-800 active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    disabled={pinLoading}
                    style={{
                      height: 48,
                      borderRadius: 12,
                      background: '#0f172a',
                      border: '1px solid #334155',
                      color: '#94a3b8',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    className="hover:border-slate-500 active:scale-95"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Switch to Register */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e293b', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                ยังไม่มีบัญชีสมาชิก?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginOpen(false);
                    setIsRegisterOpen(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#34d399',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    textDecoration: 'underline',
                  }}
                >
                  สมัครสมาชิกใหม่ที่นี่
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. RECENT ORDERS MODAL */}
      {isRecentOrdersOpen && (
        <div className="modal-overlay" onClick={() => setIsRecentOrdersOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} style={{ color: '#818cf8' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  ประวัติบิลออเดอร์ล่าสุด
                </h3>
              </div>
              <button
                onClick={() => setIsRecentOrdersOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isOrdersLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  กำลังโหลดรายการออเดอร์...
                </div>
              ) : recentOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  ยังไม่มีประวัติการขาย
                </div>
              ) : (
                recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid #334155',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                        {ord.orderNumber}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                        {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''} • {ord.paymentMethod === 'QR_PROMPTPAY' ? 'PromptPay' : 'เงินสด'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 800, color: '#ff1a6c', fontSize: '1.05rem' }}>
                        {formatPrice(ord.total)}
                      </span>
                      <button
                        onClick={() => {
                          setCompletedOrder(ord);
                          setIsRecentOrdersOpen(false);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818cf8',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        className="hover:bg-indigo-500/25"
                      >
                        พิมพ์สลิป
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TODAY STATS MODAL */}
      {isTodaySummaryOpen && todayStats && (
        <div className="modal-overlay" onClick={() => setIsTodaySummaryOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 440, padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={20} style={{ color: '#34d399' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                  สรุปยอดขายวันนี้
                </h3>
              </div>
              <button
                onClick={() => setIsTodaySummaryOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#0f172a', padding: 14, borderRadius: 12, border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ยอดขายรวม</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ff1a6c', marginTop: 4 }}>
                  {formatPrice(todayStats.sales)}
                </div>
              </div>
              <div style={{ background: '#0f172a', padding: 14, borderRadius: 12, border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>จำนวนบิล</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#818cf8', marginTop: 4 }}>
                  {todayStats.orders} บิล
                </div>
              </div>
              <div style={{ background: '#0f172a', padding: 14, borderRadius: 12, border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>จำนวนชิ้นที่ขาย</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                  {todayStats.itemsSold} ชิ้น
                </div>
              </div>
              <div style={{ background: '#0f172a', padding: 14, borderRadius: 12, border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>เฉลี่ยต่อบิล</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
                  {formatPrice(todayStats.averageOrder)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VARIANT SELECTION MODAL */}
      {variantModalProduct && (
        <div className="modal-overlay" onClick={() => setVariantModalProduct(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                  {variantModalProduct.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                  เลือกขนาด / รสชาติที่ต้องการ
                </p>
              </div>
              <button
                onClick={() => setVariantModalProduct(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {variantModalProduct.variants.map((v) => {
                const isOutOfStock = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      addToCart(variantModalProduct, v);
                      setVariantModalProduct(null);
                    }}
                    disabled={isOutOfStock}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid #334155',
                      borderRadius: 12,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.4 : 1,
                      transition: 'all 0.15s ease',
                    }}
                    className="hover:border-pink-500 hover:bg-slate-800"
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>{v.name}</div>
                      <div style={{ fontSize: '0.72rem', color: isOutOfStock ? '#f87171' : '#34d399', marginTop: 2 }}>
                        {isOutOfStock ? 'หมดแล้ว' : `คงเหลือ ${v.stock} ชิ้น`}
                      </div>
                    </div>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ff1a6c' }}>
                      ฿{v.price}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          subtotal={subtotal}
          discountType={discountType}
          discountValue={parseFloat(discountValue) || 0}
          discountAmount={discountAmount}
          total={total}
          onComplete={onCheckoutComplete}
        />
      )}

      {/* 6. RECEIPT MODAL */}
      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          cart={lastCompletedCart}
          onClose={() => setCompletedOrder(null)}
        />
      )}

      {/* 7. CLEAR CART CONFIRMATION */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="ล้างรายการในตะกร้า"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบสินค้าทั้งหมดออกจากตะกร้า?"
        confirmText="ล้างตะกร้า"
        cancelText="ยกเลิก"
        confirmVariant="danger"
        onConfirm={clearCart}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </div>
  );
}

export default function POSPage() {
  return (
    <ToastProvider>
      <POSContent />
    </ToastProvider>
  );
}
