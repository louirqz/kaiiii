'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, FolderOpen,
  BarChart3, ClipboardList, TrendingUp, BarChart2,
  Users, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, AlertTriangle
} from 'lucide-react';

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
  badge?: number;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user));
    fetch('/api/inventory?filter=low_stock')
      .then(r => r.json())
      .then(d => setLowStockCount(d.stats?.lowStockCount + d.stats?.outOfStockCount || 0));
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navItems: NavItem[] = [
    { href: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { href: '/pos', icon: <ShoppingCart size={18} />, label: 'หน้าขาย POS' },
    { href: '/admin/products', icon: <Package size={18} />, label: 'สินค้า' },
    { href: '/admin/categories', icon: <FolderOpen size={18} />, label: 'หมวดหมู่' },
    { href: '/admin/inventory', icon: <BarChart3 size={18} />, label: 'สต็อก', badge: lowStockCount > 0 ? lowStockCount : undefined },
    { href: '/admin/orders', icon: <ClipboardList size={18} />, label: 'ออเดอร์' },
    { href: '/admin/reports', icon: <TrendingUp size={18} />, label: 'รายงาน', roles: ['ADMIN', 'MANAGER'] },
    { href: '/admin/users', icon: <Users size={18} />, label: 'พนักงาน', roles: ['ADMIN'] },
    { href: '/admin/settings', icon: <Settings size={18} />, label: 'ตั้งค่า', roles: ['ADMIN'] },
  ];

  const roleColor = { ADMIN: '#ff1a6c', MANAGER: '#818cf8', CASHIER: '#34d399' };
  const roleLabel = { ADMIN: 'ผู้ดูแลระบบ', MANAGER: 'ผู้จัดการ', CASHIER: 'แคชเชียร์' };

  return (
    <aside
      style={{
        width: collapsed ? 64 : 220,
        flexShrink: 0,
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.98)',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '18px 12px' : '18px 16px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #e60052, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(230,0,82,0.3)',
          }}
        >
          🥟
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #ff1a6c, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>nnichna</div>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: -1 }}>POS System</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            marginLeft: 'auto',
            background: 'rgba(51,65,85,0.6)',
            border: 'none',
            borderRadius: 8,
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            flexShrink: 0,
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Low stock alert */}
      {!collapsed && lowStockCount > 0 && (
        <div style={{ margin: '10px 10px 0', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>{lowStockCount} รายการสต็อกต่ำ</span>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {navItems.map((item) => {
          if (item.roles && user && !item.roles.includes(user.role)) return null;

          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{ marginBottom: 2, position: 'relative', justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span
                  style={{
                    background: '#e60052',
                    color: 'white',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    position: collapsed ? 'absolute' : 'static',
                    top: collapsed ? 4 : undefined,
                    right: collapsed ? 4 : undefined,
                  }}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      {user && (
        <div style={{ borderTop: '1px solid #1e293b', padding: '12px 8px', flexShrink: 0 }}>
          {!collapsed && (
            <div style={{ padding: '8px 10px', marginBottom: 4, background: 'rgba(30,41,59,0.5)', borderRadius: 10 }}>
              <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ fontSize: '0.72rem', color: roleColor[user.role as keyof typeof roleColor] || '#94a3b8', marginTop: 2 }}>
                {roleLabel[user.role as keyof typeof roleLabel] || user.role}
              </p>
            </div>
          )}
          <button
            onClick={logout}
            className="sidebar-link"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', justifyContent: collapsed ? 'center' : 'flex-start' }}
            title={collapsed ? 'ออกจากระบบ' : undefined}
          >
            <LogOut size={18} style={{ color: '#f87171' }} />
            {!collapsed && <span style={{ color: '#f87171' }}>ออกจากระบบ</span>}
          </button>
        </div>
      )}
    </aside>
  );
}
