import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { NAV_GROUPS, findActiveItem } from '../../config/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar: generated from config/navigation.js.
 *  - collapsed: icon-only rail (desktop)
 *  - mobile:    rendered inside the drawer, shows a close button instead of the collapse toggle
 */
export default function Sidebar({ collapsed = false, mobile = false, onToggle, onNavigate, onLogout }) {
  const { pathname } = useLocation();
  const { t, lang, isRTL } = useLanguage();
  const { user } = useAuth();
  const active = findActiveItem(pathname);
  const rail = collapsed && !mobile;

  const CollapseIcon = isRTL ? PanelLeftOpen : PanelLeftClose;
  const ExpandIcon = isRTL ? PanelLeftClose : PanelLeftOpen;

  return (
    <div className="flex flex-col h-full bg-brand-900 text-white select-none">
      {/* Brand */}
      <div className={`h-16 shrink-0 flex items-center border-b border-white/10 ${rail ? 'justify-center px-2' : 'justify-between ps-5 pe-3'}`}>
        <Link to="/" onClick={onNavigate} className="flex items-center min-w-0" aria-label="M20 Dashboard">
          {rail ? (
            <span className="w-9 h-9 rounded-control bg-accent text-brand-900 font-bold text-sm flex items-center justify-center">M</span>
          ) : (
            <img
              src="/img/m20-logo-white.png"
              alt="M20"
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/img/m20-logo-gold.png';
              }}
            />
          )}
        </Link>
        {mobile ? (
          <button type="button" onClick={onNavigate} className="w-9 h-9 flex items-center justify-center rounded-control text-white/70 hover:bg-white/10 hover:text-white cursor-pointer" aria-label="Close menu">
            <X size={18} />
          </button>
        ) : (
          !rail && (
            <button type="button" onClick={onToggle} className="w-9 h-9 flex items-center justify-center rounded-control text-white/60 hover:bg-white/10 hover:text-white cursor-pointer" aria-label="Collapse sidebar">
              <CollapseIcon size={18} />
            </button>
          )
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {rail ? (
              <div className="mx-3 mb-2 h-px bg-white/10" />
            ) : (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {group.label[lang] || group.label.en}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active?.path === item.path;
                const label = t(item.key, item.fallback);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onNavigate}
                      title={rail ? label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative flex items-center h-10 rounded-control text-sm transition-colors duration-150 ${
                        rail ? 'justify-center' : 'gap-3 px-3'
                      } ${
                        isActive
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {isActive && <span className="absolute start-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" />}
                      <Icon size={18} strokeWidth={1.7} className={`shrink-0 ${isActive ? 'text-accent' : ''}`} />
                      {!rail && <span className="truncate">{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 p-3 space-y-2">
        {rail && (
          <button type="button" onClick={onToggle} className="w-full h-10 flex items-center justify-center rounded-control text-white/60 hover:bg-white/10 hover:text-white cursor-pointer" aria-label="Expand sidebar">
            <ExpandIcon size={18} />
          </button>
        )}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          title={rail ? t('nav.previewStore', 'Preview M20 Store') : undefined}
          className={`flex items-center h-10 rounded-control border border-white/15 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors ${rail ? 'justify-center' : 'gap-2.5 px-3'}`}
        >
          <Store size={17} strokeWidth={1.7} className="shrink-0" />
          {!rail && <span className="truncate">{t('nav.previewStore', 'Preview M20 Store')}</span>}
        </a>

        <div className={`flex items-center ${rail ? 'flex-col gap-2' : 'justify-between gap-2'} pt-1`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 shrink-0 rounded-full bg-accent text-brand-900 font-bold text-sm flex items-center justify-center">
              {user?.name ? user.name[0].toUpperCase() : 'M'}
            </span>
            {!rail && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || t('nav.administrator', 'Administrator')}</p>
                <p className="text-xs text-white/50 truncate">{user?.phone || t('nav.adminBadge', 'Admin')}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onLogout}
            title={t('nav.logout', 'Logout')}
            aria-label={t('nav.logout', 'Logout')}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-control text-white/60 hover:bg-white/10 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut size={17} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </div>
  );
}
