'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  KeyRound,
  RefreshCw,
  Mail,
  User,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface StaffUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
}

export default function UsersAdminPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'MANAGER' | 'CASHIER'>('CASHIER');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Delete dialog
  const [userToDelete, setUserToDelete] = useState<StaffUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch current user and list
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/users'),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentAdminId(meData.user?.id || '');
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      } else {
        const err = await usersRes.json();
        toast.error(err.error || 'ไม่สามารถโหลดรายชื่อพนักงานได้');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('CASHIER');
    setFormStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: StaffUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.role);
    setFormStatus(u.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.warning('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    if (!editingUser && !formUsername.trim()) {
      toast.warning('กรุณากรอกชื่อผู้ใช้ (Username)');
      return;
    }

    if (!formEmail.trim()) {
      toast.warning('กรุณากรอกอีเมล');
      return;
    }

    if (!editingUser && !formPassword.trim()) {
      toast.warning('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            role: formRole,
            status: formStatus,
            ...(formPassword.trim() ? { password: formPassword } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
        toast.success(`อัปเดตข้อมูล ${data.user.name} เรียบร้อย`);
      } else {
        // Create user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            username: formUsername,
            email: formEmail,
            password: formPassword,
            role: formRole,
            status: formStatus,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'สร้างผู้ใช้ไม่สำเร็จ');
        toast.success(`เพิ่มพนักงาน ${data.user.name} เรียบร้อยแล้ว`);
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบไม่สำเร็จ');
      toast.success('ลบพนักงานเรียบร้อยแล้ว');
      setUserToDelete(null);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (user: StaffUser) => {
    if (user.id === currentAdminId) {
      toast.warning('ไม่สามารถปิดการใช้งานบัญชีของคุณเองได้');
      return;
    }
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('เกิดข้อผิดพลาด');
      toast.success(`เปลี่ยนสถานะเป็น ${newStatus === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} แล้ว`);
      loadUsers();
    } catch {
      toast.error('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: 'rgba(230,0,82,0.15)', text: '#ff1a6c', border: '#ff1a6c' };
      case 'MANAGER':
        return { bg: 'rgba(99,102,241,0.15)', text: '#818cf8', border: '#818cf8' };
      default:
        return { bg: 'rgba(16,185,129,0.15)', text: '#34d399', border: '#34d399' };
    }
  };

  const roleNameMap: Record<string, string> = {
    ADMIN: 'ผู้ดูแลระบบ (Admin)',
    MANAGER: 'ผู้จัดการ (Manager)',
    CASHIER: 'แคชเชียร์ (Cashier)',
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
            <span style={{ fontSize: '1.5rem' }}>👥</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              จัดการพนักงานและสิทธิ์การใช้งาน
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            ควบคุมบัญชีผู้ใช้ บทบาทหน้าที่ (Admin / Manager / Cashier) และการเข้าถึงระบบ POS nnichna
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="btn-secondary"
            style={{ padding: '9px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            รีเฟรช
          </button>
          <button
            onClick={handleOpenAdd}
            style={{
              background: 'linear-gradient(135deg, #ff1a6c, #e60052)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(230,0,82,0.3)',
            }}
          >
            <UserPlus size={16} />
            เพิ่มพนักงานใหม่
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid #334155',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, maxWidth: 450 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, Username, อีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 10,
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>บทบาท:</span>
          {['ALL', 'ADMIN', 'MANAGER', 'CASHIER'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: roleFilter === r ? 700 : 500,
                border: roleFilter === r ? '1px solid #ff1a6c' : '1px solid #334155',
                background: roleFilter === r ? 'rgba(230, 0, 82, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: roleFilter === r ? '#ff4d88' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {r === 'ALL' ? 'ทั้งหมด' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid #334155',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(15, 23, 42, 0.4)', color: '#64748b', fontSize: '0.75rem' }}>
                <th style={{ padding: '14px 18px' }}>พนักงาน</th>
                <th style={{ padding: '14px 18px' }}>ชื่อผู้ใช้ / อีเมล</th>
                <th style={{ padding: '14px 18px' }}>บทบาท</th>
                <th style={{ padding: '14px 18px' }}>สถานะ</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>ออเดอร์ที่ขายได้</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const badge = roleBadgeStyle(u.role);
                  const isCurrent = u.id === currentAdminId;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                        transition: 'background 0.15s',
                      }}
                      className="hover:bg-slate-800/30"
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #1e293b, #334155)',
                              border: `2px solid ${badge.text}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              color: '#f8fafc',
                              fontSize: '0.95rem',
                              flexShrink: 0,
                            }}
                          >
                            {u.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {u.name}
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    background: 'rgba(230,0,82,0.2)',
                                    color: '#ff1a6c',
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    fontWeight: 700,
                                  }}
                                >
                                  คุณ
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              เข้าสู่ระบบเมื่อ {new Date(u.createdAt).toLocaleDateString('th-TH')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username & Email */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ color: '#cbd5e1', fontWeight: 500 }}>@{u.username}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={12} />
                          {u.email}
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}40`,
                          }}
                        >
                          {u.role === 'ADMIN' ? (
                            <ShieldAlert size={13} />
                          ) : u.role === 'MANAGER' ? (
                            <ShieldCheck size={13} />
                          ) : (
                            <Shield size={13} />
                          )}
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: isCurrent ? 'default' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 8px',
                            borderRadius: 8,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: u.status === 'ACTIVE' ? '#34d399' : '#f87171',
                            opacity: isCurrent ? 0.7 : 1,
                          }}
                          title={isCurrent ? 'บัญชีของคุณ' : 'คลิกเพื่อสลับสถานะ'}
                        >
                          {u.status === 'ACTIVE' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {u.status === 'ACTIVE' ? 'เปิดใช้งาน' : 'ระงับชั่วคราว'}
                        </button>
                      </td>

                      {/* Orders handled */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
                          <ShoppingBag size={14} />
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {u._count?.orders ? u._count.orders.toLocaleString() : 0}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: 'rgba(51, 65, 85, 0.5)',
                              border: '1px solid #334155',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.78rem',
                            }}
                            className="hover:text-white hover:border-slate-500"
                          >
                            <Edit2 size={13} />
                            แก้ไข
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.78rem',
                              }}
                              className="hover:bg-red-500/20"
                            >
                              <Trash2 size={13} />
                              ลบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    {search ? 'ไม่พบพนักงานที่ตรงกับเงื่อนไขการค้นหา' : 'ยังไม่มีข้อมูลพนักงาน'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(230,0,82,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {editingUser ? <Edit2 size={18} style={{ color: '#ff1a6c' }} /> : <UserPlus size={18} style={{ color: '#ff1a6c' }} />}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  {editingUser ? `แก้ไขข้อมูลพนักงาน (${editingUser.username})` : 'เพิ่มพนักงานใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                  ชื่อ-นามสกุล <span style={{ color: '#ff1a6c' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
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

              {/* Username (Locked when editing) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                  ชื่อผู้ใช้ (Username สำหรับ Login) {!editingUser && <span style={{ color: '#ff1a6c' }}>*</span>}
                </label>
                <input
                  type="text"
                  required={!editingUser}
                  disabled={!!editingUser}
                  placeholder="เช่น cashier02"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: editingUser ? 'rgba(15,23,42,0.4)' : '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    color: editingUser ? '#64748b' : '#f8fafc',
                    fontSize: '0.875rem',
                    cursor: editingUser ? 'not-allowed' : 'text',
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                  อีเมล <span style={{ color: '#ff1a6c' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="เช่น staff@nnichna.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
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

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                  รหัสผ่าน {editingUser ? '(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)' : <span style={{ color: '#ff1a6c' }}>*</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound
                    size={16}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                  />
                  <input
                    type="password"
                    required={!editingUser}
                    placeholder={editingUser ? '••••••••' : 'กำหนดรหัสผ่านเข้าใช้งาน'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
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

              {/* Role & Status Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Role */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                    บทบาทหน้าที่ (Role)
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'ADMIN' | 'MANAGER' | 'CASHIER')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="CASHIER">แคชเชียร์ (Cashier)</option>
                    <option value="MANAGER">ผู้จัดการ (Manager)</option>
                    <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                    }}
                  >
                    <option value="ACTIVE">เปิดใช้งาน (ACTIVE)</option>
                    <option value="INACTIVE">ระงับชั่วคราว (INACTIVE)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  style={{ padding: '10px 18px', fontSize: '0.875rem' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, #ff1a6c, #e60052)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 22px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'กำลังบันทึก...' : editingUser ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        title="ยืนยันการลบผู้ใช้"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${userToDelete?.name}" (${userToDelete?.username}) ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ลบผู้ใช้"
        cancelText="ยกเลิก"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
