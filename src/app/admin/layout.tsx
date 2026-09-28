import { ToastProvider } from '@/components/ui/toast';
import AdminSidebar from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AdminSidebar />
        <main style={{ flex: 1, overflowY: 'auto', background: '#0f172a' }}>
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
