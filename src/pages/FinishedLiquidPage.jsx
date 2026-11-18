import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, 
  CheckCircle2, Clock, Check, RefreshCw, X, ArrowRight,
  FlaskConical, Sparkles, Layers, Box, Info, XCircle, Droplets, ArrowUpRight
} from 'lucide-react';
import { 
  getFinishedLiquidInventory, getFormulas, getRawMaterials, 
  previewBatchCalculation, createBatch, getBatches 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

export default function FinishedLiquidPage() {
  const { lang, isRTL, t, formatCurrency } = useLanguage();
  const [liquidInventory, setLiquidInventory] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [alcoholMaterials, setAlcoholMaterials] = useState([]);
  const [batchesHistory, setBatchesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Production Modal
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Production Form State
  const [productionForm, setProductionForm] = useState({
    fragranceId: '',
    formulaId: '',
    totalWeightGrams: 2000,
    concentrationPercent: 20,
    alcoholRawMaterialId: '',
    productionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [liquidData, formulasData, rawMats, batchesData] = await Promise.all([
        getFinishedLiquidInventory().catch(() => []),
        getFormulas().catch(() => []),
        getRawMaterials().catch(() => []),
        getBatches({ limit: 15 }).catch(() => []),
      ]);

      setLiquidInventory(Array.isArray(liquidData) ? liquidData : []);
      setFormulas(Array.isArray(formulasData) ? formulasData : []);
      setBatchesHistory(Array.isArray(batchesData) ? batchesData : []);

      const mats = Array.isArray(rawMats) ? rawMats : [];
      const alcMats = mats.filter(m => m.category === 'alcohol');
      setAlcoholMaterials(alcMats);

      if (alcMats.length > 0 && !productionForm.alcoholRawMaterialId) {
        setProductionForm(prev => ({ ...prev, alcoholRawMaterialId: alcMats[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching finished liquid data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate preview when production form values change
  useEffect(() => {
    if (showProductionModal && productionForm.formulaId && productionForm.totalWeightGrams > 0) {
      handleCalculatePreview();
    } else {
      setPreviewData(null);
    }
  }, [
    productionForm.formulaId, 
    productionForm.totalWeightGrams, 
    productionForm.concentrationPercent, 
    productionForm.alcoholRawMaterialId, 
    showProductionModal
  ]);

  const handleCalculatePreview = async () => {
    if (!productionForm.formulaId || !productionForm.totalWeightGrams) return;
    setPreviewLoading(true);
    try {
      const data = await previewBatchCalculation({
        formulaId: productionForm.formulaId,
        finalBatchWeight: Number(productionForm.totalWeightGrams),
        concentrationPercent: Number(productionForm.concentrationPercent),
        alcoholRawMaterialId: productionForm.alcoholRawMaterialId || undefined,
      });
      setPreviewData(data);
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenProduction = (item = null) => {
    let matchedFormula = null;
    let targetFragranceId = '';

    if (item) {
      targetFragranceId = item.fragranceId;
      matchedFormula = formulas.find(f => 
        (item.formulaId && String(f._id) === String(item.formulaId)) ||
        String(f.fragrance?._id || f.fragrance) === String(item.fragranceId)
      );
    } else if (liquidInventory.length > 0) {
      const firstItem = liquidInventory[0];
      targetFragranceId = firstItem.fragranceId;
      matchedFormula = formulas.find(f => 
        (firstItem.formulaId && String(f._id) === String(firstItem.formulaId)) ||
        String(f.fragrance?._id || f.fragrance) === String(targetFragranceId)
      );
    }

    if (!matchedFormula && formulas.length > 0) {
      matchedFormula = formulas[0];
      targetFragranceId = matchedFormula.fragrance?._id || matchedFormula.fragrance || '';
    }

    setProductionForm({
      fragranceId: targetFragranceId,
      formulaId: matchedFormula ? matchedFormula._id : '',
      totalWeightGrams: 2000,
      concentrationPercent: matchedFormula?.defaultConcentration || 20,
      alcoholRawMaterialId: alcoholMaterials[0]?._id || '',
      productionDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setPreviewData(null);
    setShowProductionModal(true);
  };

  const handleFragranceChange = (fragranceId) => {
    const invItem = liquidInventory.find(l => String(l.fragranceId) === String(fragranceId));
    const matchedFormula = formulas.find(f => 
      (invItem?.formulaId && String(f._id) === String(invItem.formulaId)) ||
      String(f.fragrance?._id || f.fragrance) === String(fragranceId)
    );

    setProductionForm(prev => ({
      ...prev,
      fragranceId,
      formulaId: matchedFormula ? matchedFormula._id : '',
      concentrationPercent: matchedFormula?.defaultConcentration || prev.concentrationPercent || 20,
    }));
  };

  const handleSubmitProduction = async (e) => {
    e.preventDefault();
    if (!productionForm.formulaId) {
      showError(
        lang === 'ar' ? 'تركيبة غير محددة' : 'No Formula Available',
        lang === 'ar' ? 'لا توجد تركيبة نشطة لهذا العطر، يرجى تسجيل تركيبة أولاً.' : 'No active recipe found for this fragrance.'
      );
      return;
    }

    if (previewData?.hasShortage) {
      const confirmShortage = await showConfirm(
        lang === 'ar' ? 'تنبيه نقص في المواد الخام' : 'Raw Material Shortage Alert',
        lang === 'ar' 
          ? 'المخزون الحالي لبعض الزيوت أو الكحول غير كافٍ لهذه الكمية. هل تريد المتابعة على أية حال؟'
          : 'Some raw materials are below required quantities. Do you still wish to proceed?',
        lang === 'ar' ? 'متابعة الإنتاج' : 'Proceed Anyway',
        lang === 'ar' ? 'إلغاء' : 'Cancel'
      );
      if (!confirmShortage) return;
    }

    setSubmitting(true);
    try {
      await createBatch({
        formulaId: productionForm.formulaId,
        fragranceId: productionForm.fragranceId,
        finalBatchWeight: Number(productionForm.totalWeightGrams),
        concentrationPercent: Number(productionForm.concentrationPercent),
        alcoholRawMaterialId: productionForm.alcoholRawMaterialId || undefined,
        productionDate: productionForm.productionDate,
        notes: productionForm.notes,
      });

      showSuccess(
        lang === 'ar' ? 'تم الإنتاج بنجاح' : 'Production Completed',
        lang === 'ar' 
          ? `تم خلط وتشغيل ${productionForm.totalWeightGrams} جرام وإضافتها لمخزون العطر السائل مباشرة!`
          : `Produced ${productionForm.totalWeightGrams}g and updated finished liquid inventory!`
      );

      setShowProductionModal(false);
      fetchData();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ في الإنتاج' : 'Production Error',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر إتمام تشغيلة الإنتاج' : 'Failed to execute production batch')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const totalGramsInStock = liquidInventory.reduce((sum, item) => sum + (Number(item.finishedLiquidGrams) || 0), 0);
  const totalLiquidValuation = liquidInventory.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
  const lowStockCount = liquidInventory.filter(item => item.isLowStock).length;
  const filteredInventory = liquidInventory.filter(item => 
    !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink leading-tight">
              {lang === 'ar' ? 'مخزون العطور السائلة' : 'Finished Liquid Inventory'}
            </h1>
            <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
              {lang === 'ar' 
                ? 'متابعة كمية العطور المجهزة بالجرام، معادل الزجاجات، وتسجيل تشغيلات الإنتاج بضغطة واحدة.'
                : 'Bulk finished perfume liquid in grams, bottle equivalents, and one-click production batches.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleOpenProduction()}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={15} />
            <span>{lang === 'ar' ? 'تشغيلة إنتاج جديدة' : 'New Production Batch'}</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-control border border-line bg-surface hover:bg-canvas text-ink-2 transition-colors shadow-card"
            title={lang === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={15} strokeWidth={1.5} className={loading ? 'animate-spin text-brand-700' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">
            {lang === 'ar' ? 'إجمالي السائل المتوفر' : 'Total Bulk Liquid Stock'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-semibold text-brand-700 font-mono">
              {(totalGramsInStock / 1000).toFixed(2)}
            </h3>
            <span className="text-xs text-ink-3">
              {lang === 'ar' ? `كجم (${totalGramsInStock.toLocaleString()} جم)` : `kg (${totalGramsInStock.toLocaleString()} g)`}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">
            {lang === 'ar' ? 'قيمة مخزون العطور السائلة' : 'Liquid Stock Valuation'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-semibold text-success font-mono">
              {formatCurrency(Math.round(totalLiquidValuation))}
            </h3>
          </div>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">
            {lang === 'ar' ? 'عطور تحت المراقبة' : 'Monitored Fragrances'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-semibold text-ink font-mono">
              {liquidInventory.length}
            </h3>
            <span className="text-xs text-ink-3">{lang === 'ar' ? 'عطر' : 'scents'}</span>
          </div>
        </div>

        <div className={`rounded-control p-4 border shadow-xs transition-colors ${
          lowStockCount > 0 ? 'bg-warning-50/70 border-warning/20' : 'bg-surface border-line'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium block ${lowStockCount > 0 ? 'text-warning' : 'text-ink-2'}`}>
              {lang === 'ar' ? 'تنبيهات نقص السائل' : 'Low Liquid Warnings'}
            </span>
            {lowStockCount > 0 && <AlertTriangle size={16} className="text-warning" />}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-warning' : 'text-ink'}`}>
              {lowStockCount}
            </h3>
            <span className="text-xs text-ink-3">{lang === 'ar' ? 'عطور' : 'scents'}</span>
          </div>
        </div>
      </div>

      {/* Fragrance Liquid Overview Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Layers size={16} className="text-brand-700" />
            <span>{lang === 'ar' ? 'أرصدة العطور السائلة ومعادل الزجاجات' : 'Fragrance Bulk Stocks & Bottle Equivalents'}</span>
          </h2>

          <div className="w-64">
            <div className="relative">
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث باسم العطر...' : 'Search fragrance...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full pr-8 pl-3"
              />
              <Search size={13} className={`absolute top-2.5 text-ink-3 ${isRTL ? 'right-2.5' : 'left-auto right-2.5'}`} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const stockGrams = Number(item.finishedLiquidGrams) || 0;
            const costPerGram = Number(item.finishedLiquidCostPerGram) || 0;
            const density = item.liquidDensity || 0.86;

            return (
              <div 
                key={item.fragranceId} 
                className={`bg-surface rounded-control border p-4 shadow-xs flex flex-col justify-between transition-colors ${
                  item.isLowStock ? 'border-warning/20' : 'border-line'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-ink text-sm">{item.name}</h3>
                      <p className="text-xs text-ink-3 capitalize">
                        {item.fragranceFamily || 'Fine Fragrance'} • {item.gender || 'Unisex'}
                      </p>
                    </div>
                    {item.isLowStock ? (
                      <span className="px-2 py-0.5 rounded-control bg-warning-50 text-warning border border-warning/20 text-xs font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} />
                        {lang === 'ar' ? 'منخفض' : 'Low'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-control bg-success-50 text-success border border-success/20 text-xs font-semibold">
                        {lang === 'ar' ? 'متوفر' : 'In Stock'}
                      </span>
                    )}
                  </div>

                  {/* Stock Metrics */}
                  <div className="p-3 bg-canvas border border-line rounded-control my-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-2 font-medium">
                        {lang === 'ar' ? 'السائل المتاح:' : 'Available Liquid:'}
                      </span>
                      <span className="font-mono text-base font-semibold text-ink">
                        {stockGrams.toLocaleString()} <span className="text-xs font-normal text-ink-2">g</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-2 font-medium">
                        {lang === 'ar' ? 'تكلفة الجرام:' : 'Cost / Gram:'}
                      </span>
                      <span className="font-mono font-semibold text-ink-2">
                        {costPerGram ? `${costPerGram.toFixed(3)} EGP` : '0.00 EGP'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-line">
                      <span className="text-ink-2 font-medium">
                        {lang === 'ar' ? 'إجمالي القيمة:' : 'Liquid Value:'}
                      </span>
                      <span className="font-mono font-semibold text-success">
                        {formatCurrency(Math.round(item.totalValue || 0))}
                      </span>
                    </div>
                  </div>

                  {/* Bottle Equivalents */}
                  <div className="space-y-1 mb-4">
                    <span className="text-xs font-medium text-ink-3 block">
                      {lang === 'ar' ? `المعادل التقديري للزجاجات (كثافة ${density} g/ml):` : `Bottle Equivalents (density ${density} g/ml):`}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-canvas p-2 rounded-control border border-line">
                        <span className="block text-xs text-ink-2">30ml</span>
                        <span className="text-xs font-semibold text-ink font-mono">
                          {item.approxBottles?.['30ml'] || 0}
                        </span>
                      </div>
                      <div className="bg-canvas p-2 rounded-control border border-line">
                        <span className="block text-xs text-ink-2">50ml</span>
                        <span className="text-xs font-semibold text-ink font-mono">
                          {item.approxBottles?.['50ml'] || 0}
                        </span>
                      </div>
                      <div className="bg-canvas p-2 rounded-control border border-line">
                        <span className="block text-xs text-ink-2">100ml</span>
                        <span className="text-xs font-semibold text-ink font-mono">
                          {item.approxBottles?.['100ml'] || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenProduction(item)}
                  className="w-full py-2 bg-brand-700 hover:bg-brand-900 text-white text-xs font-semibold rounded-control flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  <span>{lang === 'ar' ? 'تشغيل إنتاج لهذا العطر' : 'Produce Batch for Scent'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Production History Table */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Clock size={16} className="text-brand-700" />
          <span>{lang === 'ar' ? 'سجل تشغيلات الإنتاج الأخيرة' : 'Recent Production Batches Log'}</span>
        </h2>

        <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-canvas text-ink-2 font-semibold border-b border-line">
                <tr>
                  <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === 'ar' ? 'كود التشغيلة' : 'Batch Code'}
                  </th>
                  <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {lang === 'ar' ? 'اسم العطر' : 'Fragrance'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'الكمية المنتجة' : 'Batch Weight'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'التركيز' : 'Concentration'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'التكلفة الإجمالية' : 'Total Batch Cost'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'تكلفة الجرام' : 'Cost / Gram'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'تاريخ الإنتاج' : 'Date'}
                  </th>
                  <th className="py-3 px-4 text-center">
                    {lang === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-2 font-normal">
                {batchesHistory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-ink-3">
                      {lang === 'ar' ? 'لا توجد تشغيلات إنتاج مسجلة بعد.' : 'No production batches recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  batchesHistory.map((b) => (
                    <tr key={b._id} className="hover:bg-canvas/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-ink">
                        {b.batchNumber || b.batchCode || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-ink">
                        {b.fragrance?.name || b.formula?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-ink">
                        {(b.finalBatchWeight || b.totalWeightGrams || 0).toLocaleString()} g
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-ink-2">
                        {b.concentration || b.concentrationPercent || 20}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-success">
                        {formatCurrency(Math.round(b.totalBatchCost || 0))}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-ink-2">
                        {(b.costPerGram || 0).toFixed(3)} EGP
                      </td>
                      <td className="py-3 px-4 text-center text-ink-2 font-mono text-xs">
                        {b.productionDate ? new Date(b.productionDate).toISOString().split('T')[0] : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-control bg-success-50 text-success border border-success/20 text-xs font-semibold">
                          {lang === 'ar' ? 'تم الخلط والتوريد' : 'Confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* One-Click New Production Modal */}
      {showProductionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-surface rounded-card border border-line shadow-card shadow-pop z-10 max-h-[92vh] overflow-y-auto">
            <div className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical size={16} />
                <span>{lang === 'ar' ? 'تشغيلة إنتاج عطر جديدة (New Production)' : 'New Fragrance Production Batch'}</span>
              </h2>
              <button onClick={() => setShowProductionModal(false)} className="p-1 text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduction} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'اختر العطر المطلوب إنتاجه *' : 'Target Fragrance *'}
                  </label>
                  <select
                    required
                    value={productionForm.fragranceId}
                    onChange={(e) => handleFragranceChange(e.target.value)}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  >
                    {liquidInventory.map(item => (
                      <option key={item.fragranceId} value={item.fragranceId}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'التركيبة المسجلة *' : 'Formula / Recipe *'}
                  </label>
                  <select
                    required
                    value={productionForm.formulaId}
                    onChange={(e) => setProductionForm({ ...productionForm, formulaId: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  >
                    {formulas
                      .filter(f => !productionForm.fragranceId || String(f.fragrance?._id || f.fragrance) === String(productionForm.fragranceId))
                      .map(f => (
                        <option key={f._id} value={f._id}>
                          {f.name} (v{f.version || 1}) - {f.defaultConcentration || 20}%
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'الوزن الإجمالي للتشغيلة (جرام) *' : 'Total Batch Weight (grams) *'}
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="100"
                    required
                    value={productionForm.totalWeightGrams}
                    onChange={(e) => setProductionForm({ ...productionForm, totalWeightGrams: e.target.value })}
                    placeholder="2000"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'نسبة تركيز الزيت (%) *' : 'Oil Concentration (%) *'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="50"
                    required
                    value={productionForm.concentrationPercent}
                    onChange={(e) => setProductionForm({ ...productionForm, concentrationPercent: e.target.value })}
                    placeholder="20"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'تاريخ الإنتاج' : 'Production Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={productionForm.productionDate}
                    onChange={(e) => setProductionForm({ ...productionForm, productionDate: e.target.value })}
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Alcohol Selection */}
              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'مادة الكحول المستخدمة' : 'Alcohol Raw Material'}
                </label>
                <select
                  value={productionForm.alcoholRawMaterialId}
                  onChange={(e) => setProductionForm({ ...productionForm, alcoholRawMaterialId: e.target.value })}
                  className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs font-medium outline-none"
                >
                  {alcoholMaterials.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name} (متوفر: {m.currentStock} {m.unit || 'g'} - {m.costPerGram?.toFixed(3)} EGP/g)
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Recipe Breakdown & Inventory Availability Preview */}
              <div className="p-3 bg-canvas border border-line rounded-control space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-ink text-xs flex items-center gap-1.5">
                    <Sparkles size={14} className="text-brand-700" />
                    {lang === 'ar' ? 'حسابات التركيبة وتوافر المخزون تلقائياً:' : 'Automated Recipe & Stock Availability Preview:'}
                  </span>
                  {previewLoading && (
                    <RefreshCw size={12} className="animate-spin text-brand-700" />
                  )}
                </div>

                {previewData ? (
                  <div className="space-y-2">
                    {/* Summary row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-surface p-2 rounded-control border border-line">
                        <span className="text-ink-3 block">{lang === 'ar' ? 'وزن الزيوت' : 'Oils Weight'}</span>
                        <span className="font-semibold font-mono text-ink">{previewData.fragranceOilWeight} g</span>
                      </div>
                      <div className="bg-surface p-2 rounded-control border border-line">
                        <span className="text-ink-3 block">{lang === 'ar' ? 'وزن الكحول' : 'Alcohol Weight'}</span>
                        <span className="font-semibold font-mono text-ink">{previewData.alcoholWeight} g</span>
                      </div>
                      <div className="bg-surface p-2 rounded-control border border-line">
                        <span className="text-ink-3 block">{lang === 'ar' ? 'إجمالي التكلفة' : 'Batch Cost'}</span>
                        <span className="font-semibold font-mono text-success">{previewData.totalBatchCost} EGP</span>
                      </div>
                      <div className="bg-surface p-2 rounded-control border border-line">
                        <span className="text-ink-3 block">{lang === 'ar' ? 'تكلفة الجرام' : 'Cost / Gram'}</span>
                        <span className="font-semibold font-mono text-ink">{previewData.costPerGram} EGP</span>
                      </div>
                    </div>

                    {/* Shortage Warning */}
                    {previewData.hasShortage && (
                      <div className="p-2.5 bg-warning-50 border border-warning/20 rounded-control text-warning text-xs flex items-start gap-2">
                        <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">
                            {lang === 'ar' ? 'تنبيه: عجز في مخزون المواد الخام المطلوبة!' : 'Warning: Raw materials stock shortage!'}
                          </span>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {previewData.shortages.map((s, idx) => (
                              <li key={idx}>
                                {s.materialName}: {lang === 'ar' ? 'مطلوب' : 'Required'} {s.requiredGrams}g, {lang === 'ar' ? 'متوفر' : 'Available'} {s.availableGrams}g ({lang === 'ar' ? 'عجز' : 'Shortage'}: {s.shortageGrams}g)
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Ingredients list */}
                    <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                      {previewData.ingredients?.map((ing, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2 bg-surface rounded-control text-xs border border-line">
                          <span className="font-medium text-ink-2">{ing.name} ({ing.percentage}%)</span>
                          <span className="font-mono text-ink font-semibold">{ing.weightGrams} g</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-ink-3 text-xs">
                    {lang === 'ar' ? 'اختر التركيبة وحدد وزن التشغيلة لعرض المعاينة الفورية.' : 'Select formula and batch weight to see live breakdown.'}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'ملاحظات التشغيلة' : 'Batch Notes'}
                </label>
                <textarea
                  rows="2"
                  value={productionForm.notes}
                  onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
                  placeholder={lang === 'ar' ? 'تاريخ التعتيق، أي ملاحظات فنية...' : 'Maceration period, temperature, etc...'}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductionModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !productionForm.formulaId}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>{lang === 'ar' ? 'جاري الخلط والتوريد...' : 'Executing Production...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{lang === 'ar' ? 'تأكيد الإنتاج وإضافة المخزون' : 'Confirm & Produce Batch'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
