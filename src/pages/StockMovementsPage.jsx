import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, RefreshCw, ArrowUpRight, 
  ArrowDownLeft, Clock, ShieldCheck, Tag
} from 'lucide-react';
import { getStockMovements } from '../services/api';

const MOVEMENT_TYPE_MAP = {
  purchase: { label: 'فاتورة شراء (+)', bg: 'bg-success-50 text-success border-success/20' },
  batch_consumption: { label: 'حسم تشغيلة (-)', bg: 'bg-danger-50 text-danger border-danger/20' },
  bottling_production: { label: 'إنتاج تام (+)', bg: 'bg-info-50 text-info border-info/20' },
  order_sale: { label: 'مبيعات طلب (-)', bg: 'bg-info-50 text-info border-info/20' },
  order_cancel_restock: { label: 'استرجاع إلغاء (+)', bg: 'bg-success-50 text-success border-success/20' },
  waste: { label: 'هالك إنتاج (-)', bg: 'bg-warning-50 text-warning border-warning/20' },
  damaged: { label: 'تلف تخزين (-)', bg: 'bg-danger-50 text-danger border-danger/20' },
  correction: { label: 'تسوية جرد', bg: 'bg-canvas text-ink-2 border-line' },
  return: { label: 'مرتجع عميل (+)', bg: 'bg-info-50 text-info border-info/20' },
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const data = await getStockMovements({
        itemType: itemTypeFilter || undefined,
        movementType: movementTypeFilter || undefined,
      });
      setMovements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading stock movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [itemTypeFilter, movementTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>سجل حركات وتدقيق المخزون (Stock Movement Audit Log)</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            سجل غير قابل للتعديل يوثق كل إضافة أو خصم للمواد الخام والمنتجات التامة مع السبب والمصدر.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchMovements}
            className="p-2 rounded-control border border-line hover:bg-canvas text-ink-2 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-control p-3 border border-line flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-2">نوع الصنف:</span>
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              className="h-9 bg-canvas border border-line rounded-control px-2 text-xs outline-none"
            >
              <option value="">الكل (خام ومنتج تام)</option>
              <option value="raw_material">مواد خام وزيوت (g)</option>
              <option value="finished_product">منتجات تامة الصنع (SKU)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-2">نوع الحركة:</span>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="h-9 bg-canvas border border-line rounded-control px-2 text-xs outline-none"
            >
              <option value="">جميع أنواع الحركات</option>
              {Object.entries(MOVEMENT_TYPE_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-ink-2 font-mono">
          {movements.length} حركة مسجلة
        </span>
      </div>

      {/* Movements Table */}
      <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-canvas text-ink-2 font-semibold border-b border-line">
              <tr>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">الصنف</th>
                <th className="py-3 px-4">نوع الحركة</th>
                <th className="py-3 px-4 text-center">الكمية (+ / -)</th>
                <th className="py-3 px-4 text-center">الرصيد قبل / بعد</th>
                <th className="py-3 px-4">المرجع / المستند</th>
                <th className="py-3 px-4">البيان والسبب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-normal text-ink-2">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-ink-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل سجل الحركات...</span>
                    </div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-ink-3">
                    لا توجد حركات مسجلة تطابق معايير الفلترة.
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
                  const typeInfo = MOVEMENT_TYPE_MAP[mov.movementType] || { label: mov.movementType, bg: 'bg-canvas text-ink-2 border-line' };
                  const isPositive = mov.quantityChange > 0;
                  const itemName = mov.rawMaterial?.name || (mov.product ? `${mov.product.name} (${mov.variantSize || ''})` : 'صنف غير محدد');

                  return (
                    <tr key={mov._id} className="hover:bg-canvas transition-colors">
                      <td className="py-3 px-4 font-mono text-ink-2 text-xs whitespace-nowrap">
                        {new Date(mov.createdAt).toLocaleString('ar-EG')}
                      </td>

                      <td className="py-3 px-4 font-semibold text-ink">
                        {itemName}
                        <span className="block text-xs text-ink-3 font-normal">
                          {mov.itemType === 'raw_material' ? 'مادة خام (g)' : 'منتج تام (SKU)'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-control border text-xs font-medium ${typeInfo.bg}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        <span className={isPositive ? 'text-success' : 'text-danger'}>
                          {isPositive ? `+${mov.quantityChange}` : mov.quantityChange} {mov.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-ink-2 text-xs">
                        {mov.previousQuantity} → <strong className="text-ink">{mov.newQuantity}</strong> {mov.unit}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-ink-2">
                        {mov.referenceType ? `${mov.referenceType}: ${mov.referenceId || ''}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-ink-2 max-w-xs truncate text-xs">
                        {mov.reason || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

