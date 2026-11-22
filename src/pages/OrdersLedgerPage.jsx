import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Download, AlertTriangle, BookOpen, ChevronDown, ChevronLeft } from 'lucide-react';
import { getOrdersLedger } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const COLS = [
  { k: 'cogs', ar: 'تصنيع (COGS)', en: 'COGS' },
  { k: 'marketing', ar: 'تسويق وديزاين', en: 'Marketing' },
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

const MATS = [
  { k: 'bottle', ar: 'زجاجة', en: 'Bottle' },
  { k: 'oil', ar: 'زيت', en: 'Oil' },
  { k: 'alcohol', ar: 'كحول', en: 'Alcohol' },
  { k: 'rawShipping', ar: 'شحن خام', en: 'Raw ship.' },
  { k: 'box', ar: 'علبة', en: 'Box' },
  { k: 'card', ar: 'كارت', en: 'Card' }
];

const STATUSES = ['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned_from_shipping'];

const inputCls =
  'rounded-control border border-line bg-surface px-3 text-ink outline-none hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};


const PAY_NAMES = {
  cod: 'الدفع عند الاستلام', cash_on_delivery: 'الدفع عند الاستلام', vodafone_cash: 'فودافون كاش',
  instapay: 'إنستاباي', fawaterk: 'بوابة الدفع', card: 'بوابة الدفع (كارت)'
};

const Line = ({ label, value, strong, tone, sub }) => (
  <div className={`flex items-baseline justify-between gap-3 py-1 ${strong ? 'font-semibold text-ink' : 'text-ink-2'}`}>
    <span>{label}{sub && <span className="text-[10px] text-ink-3"> {sub}</span>}</span>
    <span className={`font-mono ${tone || ''}`}>{value}</span>
  </div>
);

// One order with every detail: customer, each bottle with each material, revenue, every cost line, profit
function OrderCard({ r, ar, fmt, pct }) {
  const cur = ar ? 'ج.م' : 'EGP';
  const m = (n) => `${fmt(n)} ${cur}`;
  const bottlesCost = r.items.reduce((a, d) => a + d.totalForQty, 0);
  const cogsTotal = r.items.reduce((a, d) => a + d.cogsPerBottle * d.quantity, 0);
  const mktTotal = r.items.reduce((a, d) => a + d.marketingPerBottle * d.quantity, 0);
  return (
    <div className={`bg-surface rounded-card border shadow-card overflow-hidden ${r.shippingCostWarning ? 'border-danger/40' : 'border-line'} ${r.counted ? '' : 'opacity-60'}`}>
      <div className="px-4 py-3 bg-canvas border-b border-line flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono font-bold text-brand-700 text-base">{r.orderNumber}</div>
          <div className="text-xs text-ink-2">{new Date(r.createdAt).toLocaleString(ar ? 'ar-EG' : 'en-GB')}</div>
        </div>
        <div className="text-xs text-end space-y-0.5">
          <div><span className="px-2 py-0.5 rounded-control border border-line bg-surface">{r.orderStatus}</span></div>
          <div className="text-ink-2">
            {PAY_NAMES[r.paymentMethod] || r.paymentMethod} — {r.paymentStatus === 'paid' ? (ar ? 'مدفوع' : 'paid') : (ar ? 'غير مدفوع' : 'unpaid')}
          </div>
          {!r.counted && <div className="text-warning">{ar ? 'غير محسوب في الإجماليات' : 'not counted in totals'}</div>}
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Customer */}
        <section>
          <h4 className="font-semibold text-brand-700 mb-1">{ar ? 'العميل والتوصيل' : 'Customer & delivery'}</h4>
          <Line label={ar ? 'الاسم' : 'Name'} value={r.customerName || '—'} />
          <Line label={ar ? 'الموبايل' : 'Phone'} value={r.customerPhone || '—'} />
          <Line label={ar ? 'طريقة التوصيل' : 'Delivery'} value={r.deliveryMethod === 'metro_pickup' ? `${ar ? 'استلام من المترو' : 'Metro pickup'}${r.metroStation ? ` — ${r.metroStation}` : ''}` : (ar ? 'توصيل للبيت' : 'Home delivery')} />
          {r.address && <Line label={ar ? 'العنوان' : 'Address'} value={r.address} />}
        </section>

        {/* Bottles */}
        <section>
          <h4 className="font-semibold text-brand-700 mb-1">
            {ar ? 'الزجاجات وتكلفة كل خامة' : 'Bottles and cost of every material'}
            {r.itemsEstimated && <span className="text-warning font-normal"> — {ar ? 'تقديري من الجدول الحالي' : 'estimated from current table'}</span>}
          </h4>
          <div className="space-y-3">
            {r.items.map((d, i) => (
              <div key={i} className="rounded-control border border-line">
                <div className="px-3 py-2 bg-canvas flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{d.productName} <span className="text-ink-3 font-normal">{d.size}</span></span>
                  <span className="text-ink-2">{ar ? 'الكمية' : 'Qty'} <b className="font-mono text-ink">{d.quantity}</b> × {ar ? 'سعر البيع' : 'price'} <b className="font-mono text-ink">{m(d.price)}</b> = <b className="font-mono text-ink">{m(d.price * d.quantity)}</b></span>
                </div>
                <table className="w-full">
                  <tbody>
                    {MATS.map((x) => (
                      <tr key={x.k} className="border-t border-line">
                        <td className="px-3 py-1 text-ink-2">{ar ? x.ar : x.en}</td>
                        <td className="px-3 py-1 text-center font-mono text-ink-3">{m(d[x.k])} × {d.quantity}</td>
                        <td className="px-3 py-1 text-end font-mono text-ink">{m(d[x.k] * d.quantity)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-line bg-canvas font-semibold">
                      <td className="px-3 py-1">COGS</td>
                      <td className="px-3 py-1 text-center font-mono text-ink-3">{m(d.cogsPerBottle)} × {d.quantity}</td>
                      <td className="px-3 py-1 text-end font-mono">{m(d.cogsPerBottle * d.quantity)}</td>
                    </tr>
                    <tr className="border-t border-line">
                      <td className="px-3 py-1 text-ink-2">{ar ? 'تسويق وديزاين' : 'Marketing & design'}</td>
                      <td className="px-3 py-1 text-center font-mono text-ink-3">{m(d.marketingPerBottle)} × {d.quantity}</td>
                      <td className="px-3 py-1 text-end font-mono text-ink">{m(d.marketingPerBottle * d.quantity)}</td>
                    </tr>
                    <tr className="border-t border-line bg-canvas font-semibold text-brand-700">
                      <td className="px-3 py-1">{ar ? 'تكلفة الزجاجة' : 'Bottle cost'}</td>
                      <td className="px-3 py-1 text-center font-mono">{m(d.totalPerBottle)}</td>
                      <td className="px-3 py-1 text-end font-mono">{m(d.totalForQty)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* Revenue */}
        <section>
          <h4 className="font-semibold text-brand-700 mb-1">{ar ? 'ما دفعه العميل' : 'What the customer paid'}</h4>
          <Line label={ar ? 'المنتجات' : 'Products'} value={m(r.subtotal)} />
          {r.discount > 0 && <Line label={ar ? 'الخصم' : 'Discount'} sub={r.couponCode} value={`-${m(r.discount)}`} tone="text-success" />}
          <Line label={ar ? 'الشحن المحصّل' : 'Shipping charged'} value={r.shippingFeeCharged + r.metroPickupFee === 0 ? (ar ? 'مجاني' : 'Free') : m(r.shippingFeeCharged + r.metroPickupFee)} />
          {r.shippingDiscount > 0 && <Line label={ar ? 'خصم الشحن (كوبون)' : 'Shipping promo'} value={`-${m(r.shippingDiscount)}`} tone="text-success" />}
          {r.paymentFee > 0 && <Line label={ar ? 'رسوم بوابة الدفع' : 'Gateway fee'} value={m(r.paymentFee)} />}
          <Line label={ar ? 'إجمالي الأوردر' : 'Order total'} value={m(r.total)} strong />
        </section>

        {/* Costs */}
        <section>
          <h4 className="font-semibold text-brand-700 mb-1">{ar ? 'تكاليف الأوردر' : 'Order costs'}</h4>
          {MATS.map((x) => (
            <Line key={x.k} label={ar ? x.ar : x.en} value={m(r.items.reduce((a, d) => a + d[x.k] * d.quantity, 0))} />
          ))}
          <Line label={ar ? 'تكلفة التصنيع المباشرة (COGS)' : 'Direct manufacturing (COGS)'} value={m(cogsTotal)} strong />
          <Line label={ar ? 'تسويق وديزاين' : 'Marketing & design'} value={m(mktTotal)} />
          <Line
            label={ar ? 'الشحن الفعلي (دعم الشحن)' : 'Real shipping'}
            sub={`${r.shippingCostPercent}% ${ar ? 'من المنتجات' : 'of products'}`}
            value={m(r.shipping)}
            tone={r.shippingCostWarning ? 'text-danger' : ''}
          />
          <Line label={ar ? 'مصروفات تشغيلية' : 'Operating'} value={m(r.operating)} />
          <Line label={ar ? 'مصروفات مالية (رسوم الدفع)' : 'Financial (payment fees)'} value={m(r.financial)} />
          <Line label={ar ? 'إجمالي التكلفة' : 'Total cost'} value={m(r.totalCost)} strong />
          {Math.abs(bottlesCost + r.shipping + r.operating + r.financial - r.totalCost) > 1 && (
            <div className="text-[11px] text-warning">{ar ? 'ملاحظة: تفاصيل الزجاجات تقديرية وتختلف قليلاً عن التكلفة المحفوظة وقت الطلب.' : 'Note: bottle details are estimated and differ slightly from the cost saved at order time.'}</div>
          )}
        </section>

        {r.shippingCostWarning && (
          <div className="flex items-center gap-2 text-danger font-semibold bg-danger/10 border border-danger/30 rounded-control p-2">
            <AlertTriangle size={14} />
            {ar ? `تحذير: الشحن ${m(r.shipping)} = ${r.shippingCostPercent}% من قيمة المنتجات (أعلى من الحد).` : `Warning: shipping ${m(r.shipping)} = ${r.shippingCostPercent}% of products (above the limit).`}
          </div>
        )}

        {/* Profit */}
        <div className={`flex items-center justify-between rounded-control p-3 text-sm font-bold ${r.netProfit >= 0 ? 'bg-success-50 text-success' : 'bg-danger-50 text-danger'}`}>
          <span>{ar ? 'صافي الربح' : 'Net profit'}</span>
          <span className="font-mono">{m(r.netProfit)} ({pct(r.netProfit, r.total)}%)</span>
        </div>
      </div>
    </div>
  );
}

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
  const [open, setOpen] = useState({});
  const [view, setView] = useState('table'); // 'table' | 'cards'

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
    const head = ['Order', 'Date', 'Customer', 'Status', 'Region', 'Subtotal', 'Total', ...MATS.map((m) => m.en), ...COLS.map((c) => c.en), 'Total cost', 'Net profit', 'Margin %', 'Shipping warning', 'Estimated'];
    const lines = data.rows.map((r) => [
      r.orderNumber, new Date(r.createdAt).toISOString().slice(0, 10), r.customerName, r.orderStatus, r.governorate,
      r.subtotal, r.total, ...MATS.map((m) => r.items.reduce((a, d) => a + d[m.k] * d.quantity, 0)), ...COLS.map((c) => r[c.k]), r.totalCost, r.netProfit, pct(r.netProfit, r.total),
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
        <div className="inline-flex rounded-control border border-line overflow-hidden h-9 text-xs">
          {[['table', ar ? 'جدول' : 'Table'], ['cards', ar ? 'كروت تفصيلية' : 'Detail cards']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={`px-3 font-medium ${view === k ? 'bg-brand-700 text-white' : 'bg-surface text-brand-700 hover:bg-brand-50'}`}>{l}</button>
          ))}
        </div>
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

      {t.materials && (
        <div className="bg-surface rounded-card border border-line shadow-card overflow-x-auto">
          <div className="px-3 py-2 border-b border-line text-xs font-semibold text-brand-700">
            {ar ? 'إجمالي كل خامة في الفترة' : 'Total per material in the period'}
          </div>
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-canvas text-ink-2">
              <tr>
                {MATS.map((m) => <th key={m.k} className="p-2">{ar ? m.ar : m.en}</th>)}
                <th className="p-2 font-semibold">COGS</th>
                <th className="p-2">{ar ? 'تسويق' : 'Marketing'}</th>
                <th className="p-2">{ar ? 'شحن' : 'Shipping'}</th>
                <th className="p-2">{ar ? 'تشغيلية' : 'Operating'}</th>
                <th className="p-2">{ar ? 'مالية' : 'Financial'}</th>
                <th className="p-2 font-semibold">{ar ? 'إجمالي التكلفة' : 'Total cost'}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line text-center font-mono">
                {MATS.map((m) => <td key={m.k} className="p-2">{fmt(t.materials[m.k])}</td>)}
                <td className="p-2 font-semibold">{fmt(t.cogs)}</td>
                <td className="p-2">{fmt(t.marketing)}</td>
                <td className="p-2">{fmt(t.shipping)}</td>
                <td className="p-2">{fmt(t.operating)}</td>
                <td className="p-2">{fmt(t.financial)}</td>
                <td className="p-2 font-semibold text-brand-700">{fmt(t.totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

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

      <p className="text-xs text-ink-3">
        {ar
          ? `عمود "تشغيلية" = المبلغ الثابت لكل أوردر (من الإعدادات) + نصيب الأوردر من المصروفات التشغيلية المسجّلة في الفترة (${fmt(t.operatingPool)} ج.م موزّعة بالتساوي، بدون التسويق والنقل العام).`
          : `"Operating" = fixed per-order amount (settings) + the order's share of recorded operating expenses in the period (${fmt(t.operatingPool)} EGP spread evenly, excluding Marketing and general Transportation).`}
      </p>

      {t.warned > 0 && (
        <div className="flex items-center gap-2 text-xs font-semibold text-danger">
          <AlertTriangle size={14} />
          {ar ? `${t.warned} أوردر تكلفة شحنه عدّت الحد المسموح` : `${t.warned} orders exceed the shipping cost limit`}
        </div>
      )}
      {data.truncated && (
        <div className="text-xs text-warning">{ar ? 'تم عرض أول 5000 أوردر فقط، ضيّق الفترة.' : 'Showing first 5000 orders only. Narrow the date range.'}</div>
      )}

      {view === 'cards' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {data.rows.map((r) => <OrderCard key={r._id} r={r} ar={ar} fmt={fmt} pct={pct} />)}
          {!data.rows.length && !loading && <div className="col-span-full p-6 text-center text-ink-3">{ar ? 'لا توجد أوردرات في هذه الفترة' : 'No orders in this period'}</div>}
        </div>
      )}

      {view === 'table' && (
      <div className="bg-surface rounded-card border border-line shadow-card overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead className="bg-canvas text-ink-2">
            <tr>
              <th className="p-2 w-6"></th>
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
              <Fragment key={r._id}>
                <tr
                  onClick={() => setOpen((p) => ({ ...p, [r._id]: !p[r._id] }))}
                  className={`border-t border-line cursor-pointer hover:bg-canvas ${r.counted ? '' : 'opacity-50'} ${r.shippingCostWarning ? 'bg-danger/5' : ''}`}
                >
                  <td className="p-2 text-ink-3">{open[r._id] ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}</td>
                  <td className="p-2 font-mono font-semibold text-ink">
                    {r.orderNumber}
                    {(r.estimated || r.itemsEstimated) && <span title={ar ? 'تقدير من جدول التكلفة الحالي' : 'Estimated from current cost table'} className="text-warning"> *</span>}
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
                {open[r._id] && (
                  <tr className="bg-canvas">
                    <td></td>
                    <td colSpan={COLS.length + 7} className="p-3">
                      <OrderCard r={r} ar={ar} fmt={fmt} pct={pct} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!data.rows.length && !loading && (
              <tr><td colSpan={COLS.length + 8} className="p-6 text-center text-ink-3">{ar ? 'لا توجد أوردرات في هذه الفترة' : 'No orders in this period'}</td></tr>
            )}
          </tbody>
          {data.rows.length > 0 && (
            <tfoot className="bg-canvas font-semibold text-ink border-t-2 border-line">
              <tr>
                <td className="p-2" colSpan={4}>{ar ? `الإجمالي (${t.orders || 0} أوردر)` : `Total (${t.orders || 0} orders)`}</td>
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
      )}
      {data.rows.some((r) => r.estimated) && (
        <p className="text-xs text-ink-3">* {ar ? 'أوردر قديم بدون تقسيم محفوظ: التكلفة تقديرية من جدول التكلفة الحالي.' : 'Older order without a saved split: cost estimated from the current cost table.'}</p>
      )}
    </div>
  );
}
