import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, 
  CheckCircle2, Clock, Check, RefreshCw, X, ArrowRight,
  FlaskConical, Layers, Box, Info, XCircle, Scale
} from 'lucide-react';
import { 
  getBatches, createBatch, confirmBatch, 
  bottlingBatch, cancelBatch, getFormulas, 
  getRawMaterials, previewBatchCalculation, getProducts 
} from '../services/api';
import { showSuccess, showError, showConfirm, showWarning, showToast, customSwal } from '../utils/swal';


const STATUS_MAP = {
  draft: { label: 'مسودة (Draft)', bg: 'bg-canvas text-ink-2 border-line' },
  confirmed: { label: 'تم الخلط والحسم (Confirmed)', bg: 'bg-success-50 text-success border-success/20' },
  matured: { label: 'مكتمل التعتيق (Matured)', bg: 'bg-canvas text-ink border-line' },
  bottled: { label: 'تمت التعبئة (Bottled)', bg: 'bg-success-50 text-success border-success/20' },
  cancelled: { label: 'ملغاة (Cancelled)', bg: 'bg-danger-50 text-danger border-danger/20' },
};

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [alcoholMaterials, setAlcoholMaterials] = useState([]);
  const [packagingMaterials, setPackagingMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBottlingModal, setShowBottlingModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Production Mode: 'bottle_count' vs 'bulk_weight'
  const [productionMode, setProductionMode] = useState('bottle_count');
  const [bottleCounts, setBottleCounts] = useState({
    '30ml': 10,
    '50ml': 10,
    '100ml': 5
  });

  // New Batch Form Data
  const [batchForm, setBatchForm] = useState({
    formulaId: '',
    batchCode: '',
    totalWeightGrams: 5000,
    concentrationPercent: 25,
    alcoholRawMaterialId: '',
    productionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Bottling Form Data
  const [bottlingForm, setBottlingForm] = useState({
    productId: '',
    variantSize: '50ml',
    unitsBottled: 10,
    targetWeightGramsPerUnit: 43, // default 50ml net liquid weight
    packagingBottleId: '',
    packagingBoxId: '',
    packagingCapId: '',
    packagingStickerId: '',
    packagingBagId: '',
    otherPackagingCostPerUnit: 0,
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bData, fData, mData, pData] = await Promise.all([
        getBatches().catch(() => []),
        getFormulas().catch(() => []),
        getRawMaterials().catch(() => []),
        getProducts().catch(() => []),
      ]);
      setBatches(Array.isArray(bData) ? bData : []);
      setFormulas(Array.isArray(fData) ? fData : []);
      
      const allMats = Array.isArray(mData) ? mData : [];
      setAlcoholMaterials(allMats.filter(m => m.category === 'alcohol'));
      setPackagingMaterials(allMats.filter(m => m.category !== 'fragrance_oil' && m.category !== 'alcohol'));
      setProducts(Array.isArray(pData) ? pData : []);

      // Pre-select first alcohol if available
      const firstAlc = allMats.find(m => m.category === 'alcohol');
      if (firstAlc && !batchForm.alcoholRawMaterialId) {
        setBatchForm(prev => ({ ...prev, alcoholRawMaterialId: firstAlc._id }));
      }
    } catch (err) {
      console.error('Error loading batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update preview when batch parameters change
  useEffect(() => {
    if (batchForm.formulaId && batchForm.concentrationPercent) {
      handleCalculatePreview();
    } else {
      setPreviewData(null);
    }
  }, [
    batchForm.formulaId, 
    batchForm.totalWeightGrams, 
    batchForm.concentrationPercent, 
    batchForm.alcoholRawMaterialId, 
    productionMode, 
    bottleCounts
  ]);

  const handleCalculatePreview = async () => {
    if (!batchForm.formulaId) return;
    setPreviewLoading(true);
    try {
      const payload = {
        formulaId: batchForm.formulaId,
        formula: batchForm.formulaId,
        productionMode,
        bottleCounts: productionMode === 'bottle_count' ? bottleCounts : undefined,
        finalBatchWeight: productionMode === 'bulk_weight' ? Number(batchForm.totalWeightGrams) : undefined,
        totalWeightGrams: productionMode === 'bulk_weight' ? Number(batchForm.totalWeightGrams) : undefined,
        concentration: Number(batchForm.concentrationPercent),
        concentrationPercent: Number(batchForm.concentrationPercent),
        alcoholRawMaterialId: batchForm.alcoholRawMaterialId || undefined,
      };
      const data = await previewBatchCalculation(payload);
      setPreviewData(data);
    } catch (err) {
      console.error('Preview calc error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFormulaSelect = (formulaId) => {
    const f = formulas.find(item => item._id === formulaId);
    setBatchForm(prev => ({
      ...prev,
      formulaId,
      concentrationPercent: f?.defaultConcentration || f?.oilPercentage || 25,
      batchCode: `BATCH-${f?.code || f?.name || 'M20'}-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
    }));
  };

  const handleOpenCreate = () => {
    const defaultAlc = alcoholMaterials[0]?._id || '';
    setBatchForm({
      formulaId: formulas[0]?._id || '',
      batchCode: `BATCH-M20-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      totalWeightGrams: 1000,
      concentrationPercent: formulas[0]?.defaultConcentration || formulas[0]?.oilPercentage || 25,
      alcoholRawMaterialId: defaultAlc,
      productionDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setProductionMode('bottle_count');
    setBottleCounts({ '30ml': 10, '50ml': 10, '100ml': 5 });
    setShowCreateModal(true);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        formulaId: batchForm.formulaId,
        formula: batchForm.formulaId,
        productionMode,
        bottleCounts: productionMode === 'bottle_count' ? bottleCounts : undefined,
        batchCode: batchForm.batchCode,
        batchNumber: batchForm.batchCode,
        finalBatchWeight: productionMode === 'bulk_weight' ? Number(batchForm.totalWeightGrams) : undefined,
        totalWeightGrams: productionMode === 'bulk_weight' ? Number(batchForm.totalWeightGrams) : undefined,
        concentration: Number(batchForm.concentrationPercent),
        concentrationPercent: Number(batchForm.concentrationPercent),
        alcoholRawMaterialId: batchForm.alcoholRawMaterialId,
        productionDate: batchForm.productionDate,
        notes: batchForm.notes,
      };
      await createBatch(payload);
      showSuccess('تم إنشاء الدفعة بنجاح', 'تم تسجيل وتأكيد دفعة الإنتاج وحسم الخامات وإضافة السائل للمخزون');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      showError('خطأ في الإنشاء', err.response?.data?.message || 'حدث خطأ أثناء إنشاء دفعة الإنتاج');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBatch = async (batch) => {
    const confirmed = await showConfirm('تأكيد خلط الدفعة', `هل أنت متأكد من خلط الدفعة "${batch.batchCode}" وحسم المواد الخام من المخزون بشكل نهائي؟`, 'نعم، خلط وحسم', 'إلغاء');
    if (!confirmed) return;
    try {
      await confirmBatch(batch._id);
      showSuccess('تم التأكيد', 'تم تأكيد خلط الدفعة وتحديث المخزون');
      fetchData();
    } catch (err) {
      showError('تعذر التأكيد', err.response?.data?.message || 'تعذر تأكيد الدفعة');
    }
  };

  const handleCancelBatch = async (batch) => {
    const { value: reason } = await customSwal.fire({
      title: 'إلغاء دفعة الإنتاج',
      input: 'text',
      inputLabel: 'يرجى كتابة سبب الإلغاء:',
      inputPlaceholder: 'اكتب سبب الإلغاء هنا...',
      showCancelButton: true,
      confirmButtonText: 'تأكيد الإلغاء',
      cancelButtonText: 'تراجع',
      inputValidator: (value) => {
        if (!value) {
          return 'يجب كتابة سبب الإلغاء!';
        }
      }
    });

    if (!reason) return;
    try {
      await cancelBatch(batch._id, reason || 'إلغاء يدوي من لوحة التحكم');
      showToast('تم إلغاء الدفعة بنجاح', 'info');
      fetchData();
    } catch (err) {
      showError('تعذر الإلغاء', err.response?.data?.message || 'تعذر إلغاء الدفعة');
    }
  };

  // Bottling Modal Open
  const handleOpenBottling = (batch) => {
    setSelectedBatch(batch);
    const linkedProd = batch.formula?.product || products[0];
    const firstVariant = linkedProd?.variants?.[0];
    
    // Auto find packaging materials
    const bottleMat = packagingMaterials.find(m => m.category === 'bottle' || m.category === 'packaging_bottle')?._id || '';
    const boxMat = packagingMaterials.find(m => m.category === 'box' || m.category === 'packaging_box')?._id || '';
    const capMat = packagingMaterials.find(m => m.category === 'packaging_cap')?._id || '';
    const stickerMat = packagingMaterials.find(m => m.category === 'sticker' || m.category === 'label_sticker')?._id || '';
    const bagMat = packagingMaterials.find(m => m.category === 'bag' || m.category === 'packaging_bag')?._id || '';

    setBottlingForm({
      productId: linkedProd?._id || '',
      variantSize: firstVariant?.size || '50ml',
      unitsBottled: 10,
      targetWeightGramsPerUnit: firstVariant?.targetWeightGrams || 45,
      packagingBottleId: bottleMat,
      packagingBoxId: boxMat,
      packagingCapId: capMat,
      packagingStickerId: stickerMat,
      packagingBagId: bagMat,
      otherPackagingCostPerUnit: 0,
      notes: '',
    });
    setShowBottlingModal(true);
  };

  const handleSubmitBottling = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    const totalLiquidGramsNeeded = Number(bottlingForm.unitsBottled) * Number(bottlingForm.targetWeightGramsPerUnit);
    if (totalLiquidGramsNeeded > (selectedBatch.remainingLiquidGrams || 0)) {
      showWarning('الكمية غير كافية', `الوزن المطلوب للتعبئة (${totalLiquidGramsNeeded}g) أكبر من السائل المتبقي في الدفعة (${selectedBatch.remainingLiquidGrams}g)`);
      return;
    }

    setSubmitting(true);
    try {
      // Calculate packaging costs from selected raw materials
      const bottleMat = packagingMaterials.find(m => m._id === bottlingForm.packagingBottleId);
      const boxMat = packagingMaterials.find(m => m._id === bottlingForm.packagingBoxId);
      const capMat = packagingMaterials.find(m => m._id === bottlingForm.packagingCapId);
      const stickerMat = packagingMaterials.find(m => m._id === bottlingForm.packagingStickerId);
      const bagMat = packagingMaterials.find(m => m._id === bottlingForm.packagingBagId);

      const packagingCosts = {
        bottle: bottleMat?.costPerGram || 0,
        box: boxMat?.costPerGram || 0,
        cap: capMat?.costPerGram || 0,
        sticker: stickerMat?.costPerGram || 0,
        bag: bagMat?.costPerGram || 0,
        other: Number(bottlingForm.otherPackagingCostPerUnit) || 0,
      };

      const packagingMaterialsUsed = [
        bottleMat && { rawMaterialId: bottleMat._id, quantity: Number(bottlingForm.unitsBottled) },
        boxMat && { rawMaterialId: boxMat._id, quantity: Number(bottlingForm.unitsBottled) },
        capMat && { rawMaterialId: capMat._id, quantity: Number(bottlingForm.unitsBottled) },
        stickerMat && { rawMaterialId: stickerMat._id, quantity: Number(bottlingForm.unitsBottled) },
        bagMat && { rawMaterialId: bagMat._id, quantity: Number(bottlingForm.unitsBottled) },
      ].filter(Boolean);

      await bottlingBatch(selectedBatch._id, {
        productId: bottlingForm.productId,
        variantSize: bottlingForm.variantSize,
        unitsBottled: Number(bottlingForm.unitsBottled),
        targetWeightGramsPerUnit: Number(bottlingForm.targetWeightGramsPerUnit),
        packagingCosts,
        packagingMaterialsUsed,
        notes: bottlingForm.notes,
      });

      showSuccess('تمت التعبئة بنجاح', 'تمت تعبئة العطور وإضافتها لمخزون المنتجات الجاهزة للبيع');
      setShowBottlingModal(false);
      fetchData();
    } catch (err) {
      showError('خطأ أثناء التعبئة', err.response?.data?.message || 'حدث خطأ أثناء تعبئة الدفعة');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview packaging unit cost in bottling modal
  const selectedBottleCost = packagingMaterials.find(m => m._id === bottlingForm.packagingBottleId)?.costPerGram || 0;
  const selectedBoxCost = packagingMaterials.find(m => m._id === bottlingForm.packagingBoxId)?.costPerGram || 0;
  const selectedCapCost = packagingMaterials.find(m => m._id === bottlingForm.packagingCapId)?.costPerGram || 0;
  const selectedStickerCost = packagingMaterials.find(m => m._id === bottlingForm.packagingStickerId)?.costPerGram || 0;
  const selectedBagCost = packagingMaterials.find(m => m._id === bottlingForm.packagingBagId)?.costPerGram || 0;
  
  const unitPackagingTotal = selectedBottleCost + selectedBoxCost + selectedCapCost + selectedStickerCost + selectedBagCost + (Number(bottlingForm.otherPackagingCostPerUnit) || 0);
  const unitLiquidCost = (selectedBatch?.costPerGram || 0) * (Number(bottlingForm.targetWeightGramsPerUnit) || 0);
  const totalFinishedUnitCost = unitLiquidCost + unitPackagingTotal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>التشغيلات ودفعات الإنتاج (Production Batches)</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            تجهيز خلطات العطور بالجرام (g)، حسم الزيوت والكحول فورياً، وحساب تكلفة الزجاجة التامة بدقة.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={14} />
            <span>إنشاء تشغيلة إنتاج جديدة</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-control border border-line hover:bg-canvas text-ink-2 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-canvas text-ink-2 font-semibold border-b border-line">
              <tr>
                <th className="py-3 px-4">رقم التشغيلة (Batch Code)</th>
                <th className="py-3 px-4">اسم التركيبة</th>
                <th className="py-3 px-4 text-center">الوزن الإجمالي</th>
                <th className="py-3 px-4 text-center">التركيز (%)</th>
                <th className="py-3 px-4 text-center">تكلفة الجرام (g)</th>
                <th className="py-3 px-4 text-center">إجمالي تكلفة الخلطة</th>
                <th className="py-3 px-4 text-center">السائل المتبقي</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-normal text-ink-2">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-ink-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل التشغيلات...</span>
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-ink-3">
                    لا توجد تشغيلات إنتاج حتى الآن. اضغط على "إنشاء تشغيلة إنتاج جديدة".
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const statusInfo = STATUS_MAP[batch.status] || STATUS_MAP.draft;
                  const isDraft = batch.status === 'draft';
                  const canBottle = (batch.status === 'confirmed' || batch.status === 'matured' || batch.status === 'bottled') && (batch.remainingLiquidGrams > 0);

                  return (
                    <tr key={batch._id} className="hover:bg-canvas transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-ink">
                        {batch.batchCode || batch.batchNumber}
                        <span className="block text-xs text-ink-3 font-normal mt-0.5">
                          {new Date(batch.productionDate).toLocaleDateString('ar-EG')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-ink">
                          {batch.formulaSnapshot?.name || batch.formula?.fragranceName || batch.formula?.name || batch.fragranceName || 'تركيبة مخصصة'}
                        </span>
                        <span className="text-xs text-ink-3 block font-mono">
                          v{batch.formulaSnapshot?.version || batch.formula?.version || batch.formulaVersion || 1}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-ink">
                        {(batch.totalWeightGrams || batch.finalBatchWeight || 0).toLocaleString()} g
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-ink-2">
                        {batch.concentrationPercent || batch.concentration || 0}%
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-ink">
                        {batch.costPerGram?.toFixed(3)} ج.م/g
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-success">
                        {Math.round(batch.totalBatchCost || 0).toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span className={`font-bold ${(batch.remainingLiquidGrams ?? batch.finalBatchWeight ?? 0) > 0 ? 'text-brand-700' : 'text-ink-3'}`}>
                          {(batch.remainingLiquidGrams ?? batch.finalBatchWeight ?? 0)?.toLocaleString()} g
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-control border text-xs font-medium ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isDraft && (
                            <button
                              onClick={() => handleConfirmBatch(batch)}
                              title="تأكيد الخلط وحسم المواد من المخزون"
                              className="px-2.5 py-1 bg-brand-700 hover:bg-brand-900 text-white rounded-control text-xs font-medium transition-colors"
                            >
                              تأكيد وخصم
                            </button>
                          )}

                          {canBottle && (
                            <button
                              onClick={() => handleOpenBottling(batch)}
                              title="تعبئة زجاجات تامة الصنع"
                              className="px-2.5 py-1 bg-brand-700 hover:bg-brand-900 text-white rounded-control text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <Box size={12} className="text-accent" />
                              <span>تعبئة وتغليف</span>
                            </button>
                          )}

                          {isDraft && (
                            <button
                              onClick={() => handleCancelBatch(batch)}
                              title="إلغاء التشغيلة"
                              className="p-1 text-ink-3 hover:text-danger transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-2xl bg-surface rounded-card border border-line shadow-card overlay-shadow z-10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line bg-canvas flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                <FlaskConical size={16} />
                <span>إنشاء دفعة إنتاج جديدة (Production Batch)</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-ink-3 hover:text-ink-2">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">اختر تركيبة العطر *</label>
                  <select
                    value={batchForm.formulaId}
                    onChange={(e) => handleFormulaSelect(e.target.value)}
                    required
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  >
                    <option value="">-- اختر التركيبة --</option>
                    {formulas.map(f => (
                      <option key={f._id} value={f._id}>
                        {f.name} (v{f.version || 1}) - {f.defaultConcentration || 25}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">كود التشغيلة (Batch Code) *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.batchCode}
                    onChange={(e) => setBatchForm({ ...batchForm, batchCode: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              {/* Production Mode Switcher */}
              <div className="bg-canvas p-1 rounded-control flex items-center gap-1 border border-line">
                <button
                  type="button"
                  onClick={() => setProductionMode('bottle_count')}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-control transition-colors ${
                    productionMode === 'bottle_count'
                      ? 'bg-brand-700 text-white'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  عدّات الزجاجات المستهدفة (Bottle Count Production)
                </button>
                <button
                  type="button"
                  onClick={() => setProductionMode('bulk_weight')}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-control transition-colors ${
                    productionMode === 'bulk_weight'
                      ? 'bg-brand-700 text-white'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  تشغيلة بالجرام الإجمالي (Bulk Gram Batch)
                </button>
              </div>

              {/* Mode 1: Bottle Count Inputs */}
              {productionMode === 'bottle_count' && (
                <div className="p-3 bg-canvas border border-line rounded-control space-y-2">
                  <div className="text-xs font-semibold text-ink-2">
                    أدخل أعداد الزجاجات المستهدفة (مع حساب صافي السائل + 1 جم فاقد نقل/تعبئة لكل زجاجة):
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-2 mb-1">
                        30ml (صافي 25g + 1g فاقد)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bottleCounts['30ml'] ?? 0}
                        onChange={(e) => setBottleCounts({ ...bottleCounts, '30ml': Math.max(0, parseInt(e.target.value) || 0) })}
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-2 mb-1">
                        50ml (صافي 43g + 1g فاقد)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bottleCounts['50ml'] ?? 0}
                        onChange={(e) => setBottleCounts({ ...bottleCounts, '50ml': Math.max(0, parseInt(e.target.value) || 0) })}
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-2 mb-1">
                        100ml (صافي 78g + 1g فاقد)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bottleCounts['100ml'] ?? 0}
                        onChange={(e) => setBottleCounts({ ...bottleCounts, '100ml': Math.max(0, parseInt(e.target.value) || 0) })}
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Bulk Weight Input */}
              {productionMode === 'bulk_weight' && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block font-medium text-ink-2 mb-1">الوزن الإجمالي للدفعة (جرام) *</label>
                    <input
                      type="number"
                      min="10"
                      step="1"
                      required
                      value={batchForm.totalWeightGrams}
                      onChange={(e) => setBatchForm({ ...batchForm, totalWeightGrams: e.target.value })}
                      placeholder="1000"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">تركيز الزيت العطري (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    required
                    value={batchForm.concentrationPercent}
                    onChange={(e) => setBatchForm({ ...batchForm, concentrationPercent: e.target.value })}
                    placeholder="25"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">خام الكحول المستخدم *</label>
                  <select
                    value={batchForm.alcoholRawMaterialId}
                    onChange={(e) => setBatchForm({ ...batchForm, alcoholRawMaterialId: e.target.value })}
                    required
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                  >
                    <option value="">-- اختر كحول --</option>
                    {alcoholMaterials.map(m => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.costPerGram?.toFixed(3)} ج.م/g)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Instant Calculation Preview Card & Cumulative Scale Guide */}
              {previewData && (
                <div className="border border-line rounded-control p-3.5 bg-canvas space-y-3">
                  {/* Cumulative Scale Weighing Guide */}
                  <div className="border border-brand-700/20 bg-surface rounded-control p-3 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                        <Scale size={15} className="text-accent" />
                        <span>دليل ميزان الخلط التراكمي (Cumulative Scale Guide)</span>
                      </span>
                      <span className="font-mono text-xs font-semibold text-brand-700">
                        إجمالي التحضير: {previewData.batchWeight}g
                      </span>
                    </div>

                    <div className="space-y-2 text-xs leading-relaxed">
                      <div className="p-2 bg-canvas border border-line rounded-control flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
                          1
                        </span>
                        <div className="flex-1">
                          <strong className="text-ink block font-semibold">
                            الخطوة الأولى (إضافة الزيت العطري):
                          </strong>
                          <span className="text-ink-2">
                            ضع البيكر/الإناء على الميزان وقم بتصفيره (Tare 0.00g). صب الزيت العطري حتى قراءة الميزان:
                          </span>
                          <span className="font-mono font-semibold text-brand-700 text-xs mr-1 ml-1 px-1.5 py-0.5 bg-canvas rounded-control border border-line">
                            {previewData.scaleReadings?.scaleStep1ReadingGrams || previewData.fragranceOilWeight} g
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-canvas border border-line rounded-control flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-accent text-ink flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5">
                          2
                        </span>
                        <div className="flex-1">
                          <strong className="text-ink block font-semibold">
                            الخطوة الثانية (إضافة كحول 96% باندا ماكس):
                          </strong>
                          <span className="text-ink-2">
                            دون تصفير الميزان، صب الكحول مباشرة فوق الزيت حتى تصبح قراءة الميزان التراكمية:
                          </span>
                          <span className="font-mono font-semibold text-brand-700 text-xs mr-1 ml-1 px-1.5 py-0.5 bg-canvas rounded-control border border-line">
                            {previewData.scaleReadings?.scaleStep2ReadingGrams || previewData.batchWeight} g
                          </span>
                          <div className="text-xs text-ink-2 font-mono mt-1">
                            حجم الكحول المطلوب: {previewData.scaleReadings?.alcoholLiters || (previewData.alcoholWeight / 700).toFixed(3)} لتر ({previewData.scaleReadings?.alcoholMl || (previewData.alcoholWeight / 0.70).toFixed(1)} مل) بكثافة 0.70 g/ml
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weight Summary Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-surface p-2 rounded-control border border-line">
                      <span className="text-xs text-ink-2 block">إجمالي وزن التحضير</span>
                      <strong className="text-xs font-mono text-ink">{previewData.batchWeight} g</strong>
                    </div>
                    <div className="bg-surface p-2 rounded-control border border-line">
                      <span className="text-xs text-ink-2 block">صافي السائل النهائي</span>
                      <strong className="text-xs font-mono text-brand-700">{previewData.netUsableWeightGrams} g</strong>
                    </div>
                    <div className="bg-surface p-2 rounded-control border border-line">
                      <span className="text-xs text-ink-2 block">فاقد النقل والتعبئة</span>
                      <strong className="text-xs font-mono text-ink-2">{previewData.batchWeight - previewData.netUsableWeightGrams} g</strong>
                    </div>
                    <div className="bg-surface p-2 rounded-control border border-line">
                      <span className="text-xs text-ink-2 block">تكلفة الجرام</span>
                      <strong className="text-xs font-mono text-ink">{previewData.costPerGram?.toFixed(3)} ج.م/g</strong>
                    </div>
                  </div>

                  {/* Bottle Estimations & Profit Margins Table */}
                  {Array.isArray(previewData.sizeEstimations) && previewData.sizeEstimations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-semibold text-ink-2 block">
                        تفاصيل تكلفة وهوامش ربح الزجاجات التامة (Official M20 Specs):
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs bg-surface rounded-card border border-line shadow-card">
                          <thead className="bg-canvas text-ink-2 border-b border-line">
                            <tr>
                              <th className="p-1.5">الحجم</th>
                              <th className="p-1.5 text-center">صافي السائل</th>
                              <th className="p-1.5 text-center">وزن التحضير</th>
                              <th className="p-1.5 text-center">تكلفة السائل</th>
                              <th className="p-1.5 text-center">تكلفة التغليف</th>
                              <th className="p-1.5 text-center">التكلفة الإجمالية</th>
                              <th className="p-1.5 text-center">سعر البيع</th>
                              <th className="p-1.5 text-center">هامش الربح</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line font-mono">
                            {previewData.sizeEstimations.map((s, idx) => (
                              <tr key={idx} className="hover:bg-canvas">
                                <td className="p-1.5 font-semibold text-ink">{s.size}</td>
                                <td className="p-1.5 text-center">{s.netLiquidWeightGrams}g</td>
                                <td className="p-1.5 text-center text-ink-2">{s.totalPrepWeightGrams}g</td>
                                <td className="p-1.5 text-center">{s.liquidCost} ج.م</td>
                                <td className="p-1.5 text-center">{s.packagingCost} ج.م</td>
                                <td className="p-1.5 text-center font-semibold text-brand-700">{s.totalUnitCost} ج.م</td>
                                <td className="p-1.5 text-center text-ink">{s.sellingPrice} ج.م</td>
                                <td className="p-1.5 text-center font-semibold text-success">%{s.estimatedProfitMargin}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Ingredients breakdown list */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold text-ink-2 block">حالة توفر الخامات المطلوبة للدفعة:</span>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {(previewData.ingredients || []).map((ing, iIdx) => (
                        <div key={iIdx} className="flex items-center justify-between bg-surface px-2.5 py-1.5 rounded-control border border-line text-xs">
                          <span className="font-medium text-ink">{ing.rawMaterialName} ({ing.percentage}%)</span>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-ink-2">مطلوب: <strong>{ing.gramsNeeded?.toFixed(2)} g</strong></span>
                            <span className={!ing.isShort ? 'text-success font-medium' : 'text-danger font-bold'}>
                              (متوفر: {ing.availableGrams} g)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-ink-2 mb-1">ملاحظات التشغيلة</label>
                <textarea
                  rows="2"
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  placeholder="ملاحظات حول وقت الخلط، درجة الحرارة، فترة التعتيق المستهدفة..."
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting || !batchForm.formulaId}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submitting ? 'جاري الحفظ...' : 'إنشاء مسودة التشغيلة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottling Modal */}
      {showBottlingModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowBottlingModal(false)} />
          <div className="relative w-full max-w-xl bg-surface rounded-card border border-line shadow-card overlay-shadow z-10 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line bg-canvas flex items-center justify-between shrink-0">
              <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                <Box size={16} />
                <span>تعبئة وتحويل لمنتج نهائي (Finished Product Bottling)</span>
              </h2>
              <button onClick={() => setShowBottlingModal(false)} className="p-1 text-ink-3 hover:text-ink-2">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitBottling} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="p-3 bg-canvas border border-line rounded-control flex items-center justify-between">
                <div>
                  <span className="text-ink-2 text-xs block">رقم التشغيلة المصدر:</span>
                  <span className="font-mono font-semibold text-ink">{selectedBatch.batchCode}</span>
                </div>
                <div className="text-left">
                  <span className="text-ink-2 text-xs block">السائل المتاح:</span>
                  <span className="font-mono font-semibold text-brand-700">{selectedBatch.remainingLiquidGrams} g</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">المنتج النهائي *</label>
                  <select
                    value={bottlingForm.productId}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, productId: e.target.value })}
                    required
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                  >
                    <option value="">-- اختر المنتج --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">الحجم المستهدف (SKU) *</label>
                  <select
                    value={bottlingForm.variantSize}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, variantSize: e.target.value })}
                    required
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs font-mono outline-none"
                  >
                    <option value="50ml">50ml</option>
                    <option value="100ml">100ml</option>
                    <option value="30ml">30ml</option>
                    <option value="15ml">15ml (Sample / Travel)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">عدد الزجاجات المعبأة *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bottlingForm.unitsBottled}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, unitsBottled: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">وزن السائل في الزجاجة (جرام) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={bottlingForm.targetWeightGramsPerUnit}
                    onChange={(e) => setBottlingForm({ ...bottlingForm, targetWeightGramsPerUnit: e.target.value })}
                    placeholder="45"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              {/* Packaging Materials Selection */}
              <div className="border border-line rounded-control p-3 bg-canvas space-y-2.5">
                <span className="font-semibold text-ink text-xs block">مواد التغليف المستخدمة (يتم خصمها وحساب تكلفتها):</span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">الزجاجة الفارغة:</label>
                    <select
                      value={bottlingForm.packagingBottleId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingBottleId: e.target.value })}
                      className="w-full h-8 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون زجاجة مسجلة --</option>
                      {packagingMaterials.filter(m => ['bottle', 'packaging_bottle'].includes(m.category) || m.name?.includes('زجاج') || m.name?.includes('ازاز') || m.name?.toLowerCase().includes('bottle')).map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram || 0} ج.م)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-ink-2 mb-1">العلبة الكرتون (Box):</label>
                    <select
                      value={bottlingForm.packagingBoxId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingBoxId: e.target.value })}
                      className="w-full h-8 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون علبة --</option>
                      {packagingMaterials.filter(m => ['box', 'packaging_box'].includes(m.category) || m.name?.includes('علب') || m.name?.includes('كرتون') || m.name?.includes('بكدج') || m.name?.includes('باكدج') || m.name?.toLowerCase().includes('box') || m.name?.toLowerCase().includes('package')).map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram || 0} ج.م)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-ink-2 mb-1">الغطاء (Cap):</label>
                    <select
                      value={bottlingForm.packagingCapId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingCapId: e.target.value })}
                      className="w-full h-8 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون غطاء --</option>
                      {packagingMaterials.filter(m => ['cap', 'packaging_cap', 'other'].includes(m.category) || m.name?.includes('غطا') || m.name?.includes('كاب') || m.name?.toLowerCase().includes('cap')).map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram || 0} ج.م)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-ink-2 mb-1">الستيكر / الليبل:</label>
                    <select
                      value={bottlingForm.packagingStickerId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingStickerId: e.target.value })}
                      className="w-full h-8 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون ستيكر --</option>
                      {packagingMaterials.filter(m => ['sticker', 'label_sticker'].includes(m.category) || m.name?.includes('ستيكر') || m.name?.includes('ليبل') || m.name?.includes('ملصق') || m.name?.toLowerCase().includes('sticker') || m.name?.toLowerCase().includes('label')).map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram || 0} ج.م)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-ink-2 mb-1">كيس البراند (Bag):</label>
                    <select
                      value={bottlingForm.packagingBagId}
                      onChange={(e) => setBottlingForm({ ...bottlingForm, packagingBagId: e.target.value })}
                      className="w-full h-8 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                    >
                      <option value="">-- بدون كيس --</option>
                      {packagingMaterials.filter(m => ['bag', 'packaging_bag'].includes(m.category) || m.name?.includes('كيس') || m.name?.includes('شنطة') || m.name?.toLowerCase().includes('bag')).map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.costPerGram || 0} ج.م)</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Total Calculated Unit Cost Breakdown */}
              <div className="bg-success-50 border border-success/20 p-3 rounded-control space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-success font-semibold pb-1 border-b border-success/20">
                  <span>حساب تكلفة الوحدة التامة (COGS Per Unit):</span>
                  <span className="font-mono text-sm font-semibold text-success">
                    {totalFinishedUnitCost.toFixed(2)} ج.م / زجاجة
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-success">
                  <div>تكلفة العطر السائل: <strong className="font-mono">{unitLiquidCost.toFixed(2)} ج.م</strong></div>
                  <div>تكلفة التغليف الكامل: <strong className="font-mono">{unitPackagingTotal.toFixed(2)} ج.م</strong></div>
                </div>
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBottlingModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submitting ? 'جاري التعبئة...' : 'تأكيد التعبئة وإضافة المخزون التام'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

