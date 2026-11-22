import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Table2 } from 'lucide-react';
import { getAdminSettings, updateSettings, getProductCostTables, saveProductCostTable } from '../services/api';
import { showSuccess, showError } from '../utils/swal';

const SIZES = ['30ml', '50ml', '100ml'];

const DEFAULT_TABLE = {
  '30ml': { bottle: 45, oil: 35, alcohol: 10, rawShipping: 10, box: 45, card: 5, marketing: 25 },
  '50ml': { bottle: 55, oil: 55, alcohol: 10, rawShipping: 10, box: 45, card: 5, marketing: 25 },
  '100ml': { bottle: 60, oil: 100, alcohol: 20, rawShipping: 10, box: 45, card: 5, marketing: 25 }
};

// Each material on its own row (COGS items first, then the other costs)
const COGS_ROWS = [
  { k: 'bottle', label: 'زجاجة فارغة' },
  { k: 'oil', label: 'زيت عطري' },
  { k: 'alcohol', label: 'كحول' },
  { k: 'rawShipping', label: 'شحن خام' },
  { k: 'box', label: 'علبة' },
  { k: 'card', label: 'كارت' }
];

const inputCls =
  'rounded-control border border-line bg-surface px-2 text-ink text-center font-mono outline-none hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-24';

const num = (v) => Number(v) || 0;

export default function CostTablePage() {
  const [table, setTable] = useState(DEFAULT_TABLE); // default table for all products
  const [defaultTable, setDefaultTable] = useState(DEFAULT_TABLE); // saved defaults (to detect overrides)
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState(''); // '' = default table
  const [productTable, setProductTable] = useState({}); // effective values for the selected product
  const [shipSupport, setShipSupport] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminSettings();
      if (data?.costTable) {
        const norm = {};
        SIZES.forEach((sz) => {
          const r = data.costTable[sz] || DEFAULT_TABLE[sz];
          norm[sz] = { ...DEFAULT_TABLE[sz], ...r, box: r.box ?? r.bag ?? 45 };
        });
        setTable(norm);
        setDefaultTable(norm);
      }
      if (data?.shipping?.defaultRealCost !== undefined) setShipSupport(num(data.shipping.defaultRealCost));
    } catch (e) {
      showError('تعذر التحميل', e?.response?.data?.message || 'تعذر تحميل جدول التكاليف');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try { setProducts(await getProductCostTables()); } catch { /* products list is optional */ }
  };

  useEffect(() => { load(); loadProducts(); }, []);

  // Effective table for the chosen product = default table + that product's overrides
  const selected = products.find((p) => p._id === productId);
  useEffect(() => {
    if (!productId) return;
    const eff = {};
    SIZES.forEach((sz) => { eff[sz] = { ...defaultTable[sz], ...((selected?.costTable || {})[sz] || {}) }; });
    setProductTable(eff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, defaultTable, products]);

  const view = productId ? productTable : table;
  const isOverridden = (sz, k) => !!productId && num(productTable[sz]?.[k]) !== num(defaultTable[sz]?.[k]);

  const setCell = (size, key, value) => {
    const setter = productId ? setProductTable : setTable;
    setter((prev) => ({ ...prev, [size]: { ...prev[size], [key]: Math.max(0, num(value)) } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      if (productId) {
        // keep only the cells that differ from the default table
        const overrides = {};
        SIZES.forEach((sz) => {
          ['bottle', 'oil', 'alcohol', 'rawShipping', 'box', 'card', 'marketing'].forEach((k) => {
            if (num(productTable[sz]?.[k]) !== num(defaultTable[sz]?.[k])) {
              overrides[sz] = { ...(overrides[sz] || {}), [k]: num(productTable[sz]?.[k]) };
            }
          });
        });
        await saveProductCostTable(productId, overrides);
        await loadProducts();
        showSuccess('تم الحفظ', `تم حفظ تكاليف ${selected?.name || 'المنتج'}`);
        return;
      }
      await updateSettings({ costTable: table, shipping: { defaultRealCost: Math.round(num(shipSupport)) } });
      showSuccess('تم الحفظ', 'تم حفظ جدول التكاليف، والأوردرات الجديدة هتتحسب منه');
    } catch (e) {
      showError('تعذر الحفظ', e?.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const resetProduct = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      await saveProductCostTable(productId, {});
      await loadProducts();
      showSuccess('تمت الاستعادة', 'المنتج رجع يستخدم الجدول الافتراضي');
    } catch (e) {
      showError('تعذر الاستعادة', e?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const cogs = (sz) => COGS_ROWS.reduce((a, r) => a + num(view[sz]?.[r.k]), 0);
  const total = (sz) => cogs(sz) + num(view[sz]?.marketing) + num(shipSupport);

  const cellInput = (sz, k) => (
    <input
      type="number" min="0" step="1" value={view[sz]?.[k] ?? 0}
      onChange={(e) => setCell(sz, k, e.target.value)}
      className={`${inputCls} ${isOverridden(sz, k) ? '!border-warning !bg-warning-50' : ''}`}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-brand-700 flex items-center gap-2">
            <Table2 size={18} />
            جدول التكاليف والأرباح لكل مقاس
          </h1>
          <p className="text-xs text-ink-2 mt-1 max-w-2xl">
            كل خامة في صف لوحدها. الأوردرات الجديدة بتحسب تكلفتها من الجدول ده (تصنيع، باكدج، ماركتنج، شحن)، وبتظهر في دفتر الأوردرات.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-control border border-line hover:bg-canvas text-ink-2" title="تحديث">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-control bg-brand-700 text-white font-medium h-9 px-4 text-xs hover:bg-brand-900 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'جاري الحفظ...' : (productId ? 'حفظ تكاليف المنتج' : 'حفظ الجدول الافتراضي')}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-card border border-line shadow-card p-3 flex flex-wrap items-center gap-3">
        <label className="text-xs text-ink-2 flex items-center gap-2">
          <span className="font-semibold">الجدول الخاص بـ:</span>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-9 rounded-control border border-line bg-surface px-2 text-xs outline-none min-w-[220px]"
          >
            <option value="">الجدول الافتراضي (كل المنتجات)</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}{p.costTable ? ' • مخصص' : ''}
              </option>
            ))}
          </select>
        </label>
        {productId ? (
          <>
            <span className="text-xs text-ink-3">الخانات الملوّنة بالأصفر مختلفة عن الافتراضي. باقي الخانات بتتبع الجدول الافتراضي لو غيّرته.</span>
            {selected?.costTable && (
              <button onClick={resetProduct} disabled={saving} className="text-xs text-danger border border-danger/30 rounded-control px-3 h-8 hover:bg-danger-50">
                رجّع للافتراضي
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-ink-3">الجدول ده بيتطبّق على أي منتج مالوش جدول خاص.</span>
        )}
      </div>

      <div className="bg-surface rounded-card border border-line shadow-card overflow-x-auto">
        <div className="px-4 py-3 border-b border-line text-sm font-semibold text-brand-700">
          {productId ? `تكاليف ${selected?.name || ''}` : 'جدول التكاليف والأرباح المعتمد لـ M20 PARFUMS'}
        </div>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-ink-2 text-xs">
              <th className="text-start p-3 font-medium">البند</th>
              {SIZES.map((sz) => <th key={sz} className="p-3 font-semibold text-ink">زجاجة {sz.replace('ml', '')} ml</th>)}
            </tr>
          </thead>
          <tbody>
            {COGS_ROWS.map((r) => (
              <tr key={r.k} className="border-t border-line">
                <td className="p-3 font-semibold text-ink">{r.label}</td>
                {SIZES.map((sz) => (
                  <td key={sz} className="p-3 text-center">
                    <div className="inline-flex items-center gap-1.5">{cellInput(sz, r.k)}<span className="text-xs text-ink-3">ج.م</span></div>
                  </td>
                ))}
              </tr>
            ))}

            <tr className="border-t-2 border-line bg-canvas">
              <td className="p-3 font-semibold text-ink">تكلفة التصنيع المباشرة (COGS)</td>
              {SIZES.map((sz) => <td key={sz} className="p-3 text-center font-mono font-bold text-ink">{cogs(sz)} ج.م</td>)}
            </tr>

            <tr className="border-t border-line">
              <td className="p-3 font-semibold text-ink">تسويق وديزاين</td>
              {SIZES.map((sz) => (
                <td key={sz} className="p-3 text-center">
                  <div className="inline-flex items-center gap-1.5">{cellInput(sz, 'marketing')}<span className="text-xs text-ink-3">ج.م</span></div>
                </td>
              ))}
            </tr>

            <tr className="border-t border-line">
              <td className="p-3 font-semibold text-ink">
                دعم شحن
                <div className="text-[11px] font-normal text-ink-3">قيمة واحدة لكل الأوردرات (تقدر تغيّرها لكل محافظة من إعدادات الشحن)</div>
              </td>
              <td className="p-3 text-center" colSpan={SIZES.length}>
                <div className="inline-flex items-center gap-1.5">
                  <input type="number" min="0" step="1" value={shipSupport} onChange={(e) => setShipSupport(Math.max(0, num(e.target.value)))} className={inputCls} />
                  <span className="text-xs text-ink-3">ج.م</span>
                </div>
              </td>
            </tr>

            <tr className="border-t-2 border-line bg-brand-50">
              <td className="p-3 font-bold text-brand-700">إجمالي التكلفة الشاملة (السعر)</td>
              {SIZES.map((sz) => <td key={sz} className="p-3 text-center font-mono font-bold text-brand-700 text-base">{total(sz)} ج.م</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
