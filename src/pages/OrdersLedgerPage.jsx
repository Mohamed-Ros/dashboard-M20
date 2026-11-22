import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download, AlertTriangle, BookOpen } from 'lucide-react';
import { getOrdersLedger } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const COLS = [
  { k: 'manufacturing', ar: 'تصنيع', en: 'Manufacturing' },
  { k: 'packaging', ar: 'باكدج', en: 'Packaging' },
  { k: 'marketing', ar: 'ماركتنج', en: 'Marketing' },
  { k: 'shipping', ar: 'شحن', en: 'Shipping' },
  { k: 'operating', ar: 'تشغيلية', en: 'Operating' },
  { k: 'financial', ar: 'مالية', en: 'Financial' }
];

const PAY_LABELS = {
  cod: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  cash_on_delivery: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  vodafone_cash: { ar: 'فودافون كاش', en: 'Vodafone Cash' },
  instapay: { ar: 'إنستاباي', en: 'InstaPay' },
  fawaterk: { ar: 'بوابة الدفع (فواتيرك)', en: 'Payment gateway' },
  card: { ar: 'بوابة الدفع (كارت)', en: 'Payment gateway (card)' }
};

const STATUSES = ['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned_from_shipping'];

const inputCls =
  'rounded-control border border-line bg-surface px-3 text-ink outline-none hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export default function OrdersLedgerPage() {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ rows: [], totals: {}, byPaymentMethod: [], truncated: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getOrdersLedger({ from, to, orderStatus: status || undefined, search: search || undefined }));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const t = data.totals || {};
  const pct = (n, base) => (base > 0 ? ((n / base) * 100).toFixed(1) : '0.0');
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString();
  const cur = ar ? 'ج.م' : 'EGP';

  const exportCsv = () => {
    const head = ['Order', 'Date', 'Customer', 'Status', 'Region', 'Subtotal', 'Total', ...COLS.map((c) => c.en), 'Total cost', 'Net profit', 'Margin %', 'Shipping warning', 'Estimated'];
    const lines = data.rows.map((r) => [
      r.orderNumber, new Date(r.createdAt).toISOString().slice(0, 10), r.customerName, r.orderStatus, r.governorate,
      r.subtotal, r.total, ...COLS.map((c) => r[c.k]), r.totalCost, r.netProfit, pct(r.netProfit, r.total),
      r.shippingCostWarning ? 'YES' : '', r.estimated ? 'YES' : ''
    ]);
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-ledger-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(
    () => [
      { label: ar ? 'عدد الأوردرات' : 'Orders', value: t.orders || 0, raw: true },
      { label: ar ? 'إجمالي المبيعات' : 'Revenue', value: t.revenue },
      { label: ar ? 'إجمالي التكاليف' : 'Total cost', value: t.totalCost },
      { label: ar ? 'صافي الربح' : 'Net profit', value: t.netProfit, accent: true, sub: `${pct(t.netProfit, t.revenue)}%` }
    ],
    [t, ar]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-brand-700 flex items-center gap-2">
          <BookOpen size={18} />
          {ar ? 'دفتر الأوردرات' : 'Orders Ledger'}
        </h1>
        <p className="text-xs text-ink-2">
          {ar
            ? 'كل أوردر بتقسيم تكلفته (تصنيع، باكدج، ماركتنج، شحن، تشغيلية، مالية) وصافي ربحه. الملغي والمرتجع غير محسوبين في الإجماليات.'
            : 'Every order with its cost split and net profit. Cancelled and returned orders are excluded from totals.'}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-2 space-y-1">
          <span className="block">{ar ? 'من' : 'From'}</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="text-xs text-ink-2 space-y-1">
          <span className="block">{ar ? 'إلى' : 'To'}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </label>
        <label className="text-xs text-ink-2 space-y-1">
          <span className="block">{ar ? 'الحالة' : 'Status'}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || (ar ? 'الكل' : 'All')}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-2 space-y-1">
          <span className="block">{ar ? 'رقم الأوردر' : 'Order #'}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} className={`${inputCls} w-32`} />
        </label>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-control bg-brand-700 text-white font-medium h-9 px-3 text-xs hover:bg-brand-900">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {ar ? 'عرض' : 'Apply'}
        </button>
        <button onClick={exportCsv} disabled={!data.rows.length} className="inline-flex items-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium h-9 px-3 text-xs hover:bg-brand-50 disabled:opacity-50">
          <Download size={14} />
          CSV
        </button>
      </div>

      {error && <div className="text-xs text-danger border border-danger/30 bg-danger/10 rounded-control p-2">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="bg-surface rounded-card border border-line shadow-card p-3">
            <div className="text-xs text-ink-2">{s.label}</div>
            <div className={`font-mono font-semibold text-lg ${s.accent ? ((t.netProfit || 0) >= 0 ? 'text-success' : 'text-danger') : 'text-ink'}`}>
              {s.raw ? s.value : `${fmt(s.value)} ${cur}`}
            </div>
            {s.sub && <div className="text-xs text-ink-3">{s.sub}</div>}
          </div>
        ))}
      </div>

      {(data.byPaymentMethod || []).length > 0 && (
        <div className="bg-surface rounded-card border border-line shadow-card overflow-x-auto">
          <div className="px-3 py-2 border-b border-line text-xs font-semibold text-brand-700">
            {ar ? 'حصر وسائل الدفع والبوابة' : 'Payment methods & gateway tally'}
          </div>
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-canvas text-ink-2">
              <tr>
                <th className="p-2 text-start">{ar ? 'الوسيلة' : 'Method'}</th>
                <th className="p-2">{ar ? 'عدد الأوردرات' : 'Orders'}</th>
                <th className="p-2">{ar ? 'المبيعات' : 'Sales'}</th>
                <th className="p-2">{ar ? 'مدفوع' : 'Paid'}</th>
                <th className="p-2">{ar ? 'غير مدفوع' : 'Unpaid'}</th>
                <th className="p-2">{ar ? 'رسوم محمّلة على العميل' : 'Fees charged to customers'}</th>
                <th className="p-2">{ar ? 'رسوم فعلية علينا' : 'Fees we pay'}</th>
                <th className="p-2">{ar ? 'الفرق' : 'Difference'}</th>
              </tr>
            </thead>
            <tbody>
              {data.byPaymentMethod.map((g) => (
                <tr key={g.method} className="border-t border-line">
                  <td className="p-2 font-semibold text-ink">{PAY_LABELS[g.method]?.[ar ? 'ar' : 'en'] || g.method}</td>
                  <td className="p-2 text-center font-mono">{g.orders}</td>
                  <td className="p-2 text-center font-mono">{fmt(g.revenue)}</td>
                  <td className="p-2 text-center font-mono text-success">{fmt(g.paid)}</td>
                  <td className="p-2 text-center font-mono text-warning">{fmt(g.unpaid)}</td>
                  <td className="p-2 text-center font-mono">{fmt(g.feeCharged)}</td>
                  <td className="p-2 text-center font-mono">{fmt(g.feeCost)}</td>
                  <td className={`p-2 text-center font-mono font-semibold ${g.feeCharged - g.feeCost >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(g.feeCharged - g.feeCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {t.warned > 0 && (
        <div className="flex items-center gap-2 text-xs font-semibold text-danger">
          <AlertTriangle size={14} />
          {ar ? `${t.warned} أوردر تكلفة شحنه عدّت الحد المسموح` : `${t.warned} orders exceed the shipping cost limit`}
        </div>
      )}
      {data.truncated && (
        <div className="text-xs text-warning">{ar ? 'تم عرض أول 5000 أوردر فقط، ضيّق الفترة.' : 'Showing first 5000 orders only. Narrow the date range.'}</div>
      )}

      <div className="bg-surface rounded-card border border-line shadow-card overflow-x-auto">
        <table className="w-full text-xs min-w-[1100px]">
          <thead className="bg-canvas text-ink-2">
            <tr>
              <th className="p-2 text-start">{ar ? 'الأوردر' : 'Order'}</th>
              <th className="p-2 text-start">{ar ? 'التاريخ' : 'Date'}</th>
              <th className="p-2 text-start">{ar ? 'العميل / المنطقة' : 'Customer / Region'}</th>
              <th className="p-2">{ar ? 'القيمة' : 'Total'}</th>
              {COLS.map((c) => <th key={c.k} className="p-2">{ar ? c.ar : c.en}</th>)}
              <th className="p-2">{ar ? 'إجمالي التكلفة' : 'Cost'}</th>
              <th className="p-2">{ar ? 'صافي الربح' : 'Net'}</th>
              <th className="p-2">%</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r._id} className={`border-t border-line ${r.counted ? '' : 'opacity-50'} ${r.shippingCostWarning ? 'bg-danger/5' : ''}`}>
                <td className="p-2 font-mono font-semibold text-ink">
                  {r.orderNumber}
                  {r.estimated && <span title={ar ? 'تقدير من جدول التكلفة الحالي' : 'Estimated from current cost table'} className="text-warning"> *</span>}
                  <div className="text-[10px] font-normal text-ink-3">{r.orderStatus}</div>
                </td>
                <td className="p-2 text-ink-2">{new Date(r.createdAt).toLocaleDateString(ar ? 'ar-EG' : 'en-GB')}</td>
                <td className="p-2 text-ink-2">{r.customerName}<div className="text-[10px] text-ink-3">{r.governorate}</div></td>
                <td className="p-2 text-center font-mono text-ink">{fmt(r.total)}</td>
                {COLS.map((c) => (
                  <td key={c.k} className="p-2 text-center font-mono text-ink-2">
                    {fmt(r[c.k])}
                    {c.k === 'shipping' && r.shippingCostWarning && <AlertTriangle size={11} className="inline text-danger ms-1" />}
                  </td>
                ))}
                <td className="p-2 text-center font-mono text-ink">{fmt(r.totalCost)}</td>
                <td className={`p-2 text-center font-mono font-semibold ${r.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(r.netProfit)}</td>
                <td className="p-2 text-center font-mono text-ink-3">{pct(r.netProfit, r.total)}</td>
              </tr>
            ))}
            {!data.rows.length && !loading && (
              <tr><td colSpan={13} className="p-6 text-center text-ink-3">{ar ? 'لا توجد أوردرات في هذه الفترة' : 'No orders in this period'}</td></tr>
            )}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot className="bg-canvas font-semibold text-ink border-t-2 border-line">
              <tr>
                <td className="p-2" colSpan={3}>{ar ? `الإجمالي (${t.orders || 0} أوردر)` : `Total (${t.orders || 0} orders)`}</td>
                <td className="p-2 text-center font-mono">{fmt(t.revenue)}</td>
                {COLS.map((c) => (
                  <td key={c.k} className="p-2 text-center font-mono">
                    {fmt(t[c.k])}<div className="text-[10px] font-normal text-ink-3">{pct(t[c.k], t.revenue)}%</div>
                  </td>
                ))}
                <td className="p-2 text-center font-mono">{fmt(t.totalCost)}</td>
                <td className={`p-2 text-center font-mono ${(t.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(t.netProfit)}</td>
                <td className="p-2 text-center font-mono">{pct(t.netProfit, t.revenue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {data.rows.some((r) => r.estimated) && (
        <p className="text-xs text-ink-3">* {ar ? 'أوردر قديم بدون تقسيم محفوظ: التكلفة تقديرية من جدول التكلفة الحالي.' : 'Older order without a saved split: cost estimated from the current cost table.'}</p>
      )}
    </div>
  );
}
