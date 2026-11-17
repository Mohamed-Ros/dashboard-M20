import {
  LayoutDashboard, Truck, Tag, Sparkles, Users, Package, Layers, FlaskConical, Droplets, History,
  DollarSign, Receipt, Wallet, FileSpreadsheet, Target, Store, Banknote, Palette,
} from 'lucide-react';

/**
 * Single source of truth for navigation: sidebar, mobile drawer, topbar title and breadcrumbs
 * are all generated from this list. Add a page here and it appears everywhere.
 *
 * item.key / item.fallback -> existing i18n key (nav.*) with English fallback
 * item.aliases             -> extra path prefixes that should highlight this item
 */
export const NAV_GROUPS = [
  {
    id: 'overview',
    label: { en: 'Overview', ar: 'نظرة عامة' },
    items: [{ path: '/', key: 'nav.overview', fallback: 'Overview & Analytics', icon: LayoutDashboard }],
  },
  {
    id: 'sales',
    label: { en: 'Sales', ar: 'المبيعات' },
    items: [
      { path: '/orders', key: 'nav.orders', fallback: 'Orders & Shipments', icon: Truck },
      { path: '/coupons', key: 'nav.coupons', fallback: 'Coupons & Discounts', icon: Tag },
      { path: '/offers', key: 'nav.offers', fallback: 'Bundles & Special Offers', icon: Sparkles },
      { path: '/users', key: 'nav.users', fallback: 'Customers & Activity', icon: Users },
    ],
  },
  {
    id: 'catalog',
    label: { en: 'Catalog', ar: 'الكتالوج' },
    items: [
      { path: '/products', key: 'nav.products', fallback: 'Products & Finished Stock', icon: Package },
      { path: '/formulas', key: 'nav.formulas', fallback: 'Perfume Formulas', icon: Layers },
    ],
  },
  {
    id: 'inventory',
    label: { en: 'Inventory', ar: 'المخزون' },
    items: [
      { path: '/inventory/raw-materials', key: 'nav.rawMaterials', fallback: 'Raw Materials', icon: FlaskConical },
      { path: '/inventory/finished-liquid', key: 'nav.finishedLiquid', fallback: 'Finished Liquid', icon: Droplets, aliases: ['/batches'] },
      { path: '/inventory/movements', key: 'nav.movements', fallback: 'Stock Movements', icon: History },
    ],
  },
  {
    id: 'finance',
    label: { en: 'Finance', ar: 'المالية' },
    items: [
      { path: '/finance', key: 'nav.financeOverview', fallback: 'Finance Overview', icon: DollarSign },
      { path: '/purchases', key: 'nav.purchases', fallback: 'Purchase Invoices', icon: Receipt },
      { path: '/expenses', key: 'nav.expenses', fallback: 'Operating Expenses', icon: Banknote },
      { path: '/finance/cash-accounts', key: 'nav.cashAccounts', fallback: 'Treasuries & Accounts', icon: Wallet },
      { path: '/reports', key: 'nav.reports', fallback: 'Reports', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'growth',
    label: { en: 'Growth & Store', ar: 'النمو والمتجر' },
    items: [
      { path: '/marketing', key: 'nav.marketing', fallback: 'Marketing & Ads', icon: Target },
      { path: '/cms', key: 'nav.cms', fallback: 'Storefront Settings', icon: Store },
    ],
  },
  {
    id: 'system',
    label: { en: 'System', ar: 'النظام' },
    items: [{ path: '/design-system', key: 'nav.designSystem', fallback: 'Design System', icon: Palette }],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ ...item, group: g })));

/** Find the nav item (and its group) for a pathname. Longest matching prefix wins. */
export function findActiveItem(pathname) {
  let best = null;
  let bestLen = -1;
  for (const item of ALL_ITEMS) {
    const paths = [item.path, ...(item.aliases || [])];
    for (const p of paths) {
      const match = p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`);
      if (match && p.length > bestLen) {
        best = item;
        bestLen = p.length;
      }
    }
  }
  return best;
}
