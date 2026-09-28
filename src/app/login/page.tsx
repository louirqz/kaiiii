'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Lock, User, Eye, EyeOff, Loader2, KeyRound, ArrowLeft, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'pin' | 'password'>('pin');

  // PIN login states
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Password login states
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle PIN input
  const handlePinPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const submitPin = async (inputPin: string) => {
    setError('');
    setPinLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'รหัส PIN ไม่ถูกต้อง');
        setPin('');
        return;
      }
      router.push(data.redirectUrl || '/admin');
      router.refresh();
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      setPin('');
    } finally {
      setPinLoading(false);
    }
  };

  // Handle standard login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
      }

      router.push(data.redirectUrl || '/admin');
      router.refresh();
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b0f17 0%, #1e1b4b 50%, #0b0f17 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorations */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,0,82,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Back to POS button */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/pos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#94a3b8',
              fontSize: '0.85rem',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            className="hover:text-white"
          >
            <ArrowLeft size={16} />
            กลับสู่หน้าร้าน (POS)
          </Link>
        </div>

        {/* Logo Area */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #e60052, #4f46e5)',
              marginBottom: 12,
              boxShadow: '0 8px 25px rgba(230, 0, 82, 0.4)',
            }}
          >
            <span style={{ fontSize: 32 }}>🥟</span>
          </div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ff1a6c, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
              marginBottom: 4,
            }}
          >
            nnichna
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            เข้าสู่ระบบผู้ดูแลและพนักงาน
          </p>
        </div>

        {/* Login Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: 4,
            borderRadius: 12,
            marginBottom: 20,
            border: '1px solid #334155',
          }}
        >
          <button
            type="button"
            onClick={() => { setTab('pin'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: tab === 'pin' ? 'linear-gradient(135deg, #ff1a6c, #e60052)' : 'transparent',
              color: tab === 'pin' ? 'white' : '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <KeyRound size={15} />
            รหัส PIN
          </button>
          <button
            type="button"
            onClick={() => { setTab('password'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: tab === 'password' ? 'linear-gradient(135deg, #ff1a6c, #e60052)' : 'transparent',
              color: tab === 'password' ? 'white' : '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <User size={15} />
            Username & Password
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '0.82rem',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* PIN LOGIN TAB */}
        {tab === 'pin' ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 12 }}>
                กรุณากรอกรหัส PIN 4 หลักเพื่อเข้าสู่ระบบแอดมิน
              </p>
              {/* PIN Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 8 }}>
                {[0, 1, 2, 3].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '2px solid #ff1a6c',
                        background: filled ? '#ff1a6c' : 'transparent',
                        boxShadow: filled ? '0 0 10px rgba(255,26,108,0.5)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  );
                })}
              </div>
              {pinLoading && (
                <div style={{ color: '#ff1a6c', fontSize: '0.75rem', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Loader2 size={13} className="animate-spin" />
                  กำลังตรวจสอบรหัส PIN...
                </div>
              )}
            </div>

            {/* PIN Keypad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                maxWidth: 260,
                margin: '0 auto',
              }}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinPress(digit)}
                  disabled={pinLoading}
                  style={{
                    height: 52,
                    borderRadius: 14,
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
                onClick={() => setPin('')}
                disabled={pinLoading}
                style={{
                  height: 52,
                  borderRadius: 14,
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
                onClick={() => handlePinPress('0')}
                disabled={pinLoading}
                style={{
                  height: 52,
                  borderRadius: 14,
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
                  height: 52,
                  borderRadius: 14,
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
        ) : (
          /* USERNAME/PASSWORD FORM */
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username/Email */}
            <div>
              <label
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}
              >
                ชื่อผู้ใช้ / อีเมล
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                  }}
                />
                <input
                  id="usernameOrEmail"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                  placeholder="กรอกชื่อผู้ใช้หรืออีเมล"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}
              >
                รหัสผ่าน
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                  }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  placeholder="กรอกรหัสผ่าน"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: 4, fontSize: '0.95rem' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  เข้าสู่ระบบ
                </>
              )}
            </button>

            {/* Link to Register */}
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
              ยังไม่มีบัญชีสมาชิก?{' '}
              <Link href="/pos?register=1" style={{ color: '#34d399', fontWeight: 700, textDecoration: 'underline' }}>
                สมัครสมาชิกที่นี่
              </Link>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
