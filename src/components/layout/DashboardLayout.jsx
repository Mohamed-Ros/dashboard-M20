import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const STORAGE_KEY = 'm20-dashboard-sidebar-collapsed';

/**
 * App shell: Sidebar (rail or full) + Topbar + scrollable content.
 * Pages render inside <main>; they only need PageHeader and Cards from components/ui.
 */
export default function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { dir, isRTL } = useLanguage();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage may be unavailable */
    }
  }, [collapsed]);

  // Close the drawer on navigation and lock body scroll while it is open
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div dir={dir} className={`h-screen w-screen flex bg-canvas text-ink overflow-hidden ${isRTL ? "font-['Cairo',sans-serif]" : 'font-sans'}`}>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:block shrink-0 h-full transition-[width] duration-200 ${collapsed ? 'w-[76px]' : 'w-[264px]'}`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-brand-900/50 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="relative h-full w-[280px] max-w-[85vw] shadow-pop">
            <Sidebar mobile onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col h-full">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
