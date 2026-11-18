import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Download, RefreshCw, Calendar, 
  TrendingUp, DollarSign, Package, Layers, PieChart as PieIcon,
  ArrowUpRight, ArrowDownRight, CheckCircle2, ChevronDown
} from 'lucide-react';
import { 
  getProfitAndLoss, getSalesByFragranceReport, 
  getBatchHistoryReport, getInventoryValuation 
} from '../services/api';
import { showWarning, showToast } from '../utils/swal';


export default function ReportsPage() {
  const [plData, setPlData] = useState({});
  const [fragranceReport, setFragranceReport] = useState([]);
  const [batchReport, setBatchReport] = useState([]);
  const [inventoryValuation, setInventoryValuation] = useState({});
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [pl, frag, batch, inv] = await Promise.all([
        getProfitAndLoss(dateRange).catch(() => ({})),
        getSalesByFragranceReport(dateRange).catch(() => []),
        getBatchHistoryReport().catch(() => []),
        getInventoryValuation().catch(() => ({})),
      ]);
      setPlData(pl || {});
      setFragranceReport(Array.isArray(frag) ? frag : []);
      setBatchReport(Array.isArray(batch) ? batch : []);
      setInventoryValuation(inv || {});
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleApplyDateFilter = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleExportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showWarning('تنبيه', 'لا توجد بيانات متاحة للتصدير');
      return;
    }
    
    // Simple CSV generator
    const keys = Object.keys(data[0]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + keys.join(",") + "\n"
      + data.map(row => keys.map(k => `"${row[k] || ''}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>التقارير التحليلية وبيان الأرباح (P&L & Analytics Reports)</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            قوائم الدخل (P&L)، أرباح كل عطر وحجم، تاريخ تكاليف التشغيلات، وتقييم المخزون الرأسمالي.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleExportCSV(fragranceReport, 'm20_sales_by_fragrance')}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Download size={14} />
            <span>تصدير تقرير العطور (CSV)</span>
          </button>

          <button
            onClick={fetchReports}
            className="p-2 rounded-control border border-line hover:bg-canvas text-ink-2 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <form onSubmit={handleApplyDateFilter} className="bg-surface rounded-control p-3.5 border border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-ink-2 flex items-center gap-1">
              <Calendar size={13} />
              من تاريخ:
            </span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="h-8 bg-canvas border border-line rounded-control px-2 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-ink-2">إلى تاريخ:</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="h-8 bg-canvas border border-line rounded-control px-2 text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            تطبيق
          </button>
        </div>

        <span className="text-ink-3 text-xs">
          تحديث مباشر من قاعدة البيانات
        </span>
      </form>

      {/* 1. Profit & Loss Statement (P&L) */}
      <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-2">
            <DollarSign size={16} />
            <span>قائمة الدخل والأرباح (Profit & Loss Statement)</span>
          </h2>
          <span className="px-2 py-0.5 bg-success-50 text-success rounded-control text-xs font-mono font-semibold border border-success/20">
            صافي الهامش: {plData.netMarginPercentage || 0}%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 bg-canvas rounded-control border border-line">
            <span className="text-ink-2 text-xs block">إجمالي الإيرادات (Revenue)</span>
            <h3 className="text-xl font-semibold text-ink font-mono mt-1">
              {Math.round(plData.revenue || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-xs text-ink-3 block mt-0.5">من الطلبات المكتملة والمسددة</span>
          </div>

          <div className="p-3.5 bg-canvas rounded-control border border-line">
            <span className="text-ink-2 text-xs block">تكلفة البضاعة المباعة (COGS)</span>
            <h3 className="text-xl font-semibold text-ink font-mono mt-1">
              {Math.round(plData.cogs || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-xs text-ink-3 block mt-0.5">تكلفة السائل + زجاج + تغليف</span>
          </div>

          <div className="p-3.5 bg-canvas rounded-control border border-line">
            <span className="text-ink-2 text-xs block">المصروفات التشغيلية (OpEx)</span>
            <h3 className="text-xl font-semibold text-danger font-mono mt-1">
              {Math.round(plData.operatingExpenses || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-xs text-ink-3 block mt-0.5">تسويق، رواتب، تشغيل</span>
          </div>

          <div className="p-3.5 bg-brand-700 text-white rounded-control border border-brand-700">
            <span className="text-white/70 text-xs block">صافي الربح الفعلي (Net Profit)</span>
            <h3 className="text-xl font-semibold text-white font-mono mt-1">
              {Math.round(plData.netProfit || 0).toLocaleString()} ج.م
            </h3>
            <span className="text-xs text-white/70 block mt-0.5">
              مجمل الربح: {Math.round(plData.grossProfit || 0).toLocaleString()} ج.م ({plData.grossMarginPercentage || 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sales & Margin By Fragrance Report Table */}
      <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
        <div className="p-4 border-b border-line bg-canvas flex justify-between items-center">
          <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
            <Package size={16} />
            <span>مبيعات وهوامش ربح العطور (Sales & Profit by Fragrance)</span>
          </h2>
          <span className="text-xs text-ink-2 font-mono">{fragranceReport.length} منتجات</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-canvas text-ink-2 font-semibold border-b border-line">
              <tr>
                <th className="py-3 px-4">اسم العطر</th>
                <th className="py-3 px-4 text-center">القطع المباعة</th>
                <th className="py-3 px-4 text-center">إجمالي الإيرادات</th>
                <th className="py-3 px-4 text-center">إجمالي تكلفة الإنتاج (COGS)</th>
                <th className="py-3 px-4 text-center">مجمل الربح (Gross Profit)</th>
                <th className="py-3 px-4 text-center">هامش الربح (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-normal text-ink-2">
              {fragranceReport.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-3">
                    لا توجد مبيعات مسجلة في هذه الفترة.
                  </td>
                </tr>
              ) : (
                fragranceReport.map((item, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-canvas transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        {item.productName}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-ink">
                        {item.unitsSold} قطعة
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-ink">
                        {Math.round(item.revenue || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-ink-2">
                        {Math.round(item.cogs || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-success">
                        +{Math.round(item.grossProfit || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        <span className="px-2 py-0.5 rounded-control bg-success-50 text-success border border-success/20 text-xs">
                          {item.grossMarginPercentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Inventory Valuation Summary */}
      <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-brand-700 pb-2 border-b border-line">
          تقييم رأس المال المستثمر في المخزون (Inventory Capital Valuation)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-canvas border border-line rounded-control">
            <span className="text-xs text-ink-2 block">قيمة مخزون المواد الخام والزيوت:</span>
            <span className="text-lg font-semibold font-mono text-ink block mt-1">
              {Math.round(inventoryValuation.rawMaterialsValue || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="p-3 bg-canvas border border-line rounded-control">
            <span className="text-xs text-ink-2 block">تكلفة مخزون المنتجات التامة بالمخزن:</span>
            <span className="text-lg font-semibold font-mono text-ink block mt-1">
              {Math.round(inventoryValuation.finishedProductsCostValue || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="p-3 bg-brand-700 text-white border border-brand-700 rounded-control">
            <span className="text-xs text-white/70 block">إجمالي رأس المال المحتجز بالمخزون:</span>
            <span className="text-lg font-semibold font-mono text-white block mt-1">
              {Math.round(inventoryValuation.totalCombinedCostValue || 0).toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

