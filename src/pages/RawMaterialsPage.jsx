import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Plus, Search, Filter, AlertTriangle, 
  ArrowUpDown, Edit2, Trash2, Check, RefreshCw, X, ShieldAlert, Package, Layers
} from 'lucide-react';
import { 
  getRawMaterials, createRawMaterial, updateRawMaterial, 
  deleteRawMaterial, adjustRawMaterialStock 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

const CATEGORIES = [
  { value: 'fragrance_oil', labelEn: 'Fragrance Oil', labelAr: 'زيت عطري', badge: 'bg-info-50 text-info border-info/20' },
  { value: 'alcohol', labelEn: 'Alcohol 96%', labelAr: 'كحول إيثيلي 96%', badge: 'bg-info-50 text-info border-info/20' },
  { value: 'bottle', labelEn: 'Glass Bottle', labelAr: 'زجاجة عطر فارغة', badge: 'bg-success-50 text-success border-success/20' },
  { value: 'sprayer', labelEn: 'Sprayer / Pump', labelAr: 'بامب / رشاش', badge: 'bg-success-50 text-success border-success/20' },
  { value: 'cap', labelEn: 'Bottle Cap', labelAr: 'غطاء زجاجة', badge: 'bg-canvas text-ink-2 border-line' },
  { value: 'sticker', labelEn: 'Sticker / Label', labelAr: 'ستيكر / ليبل', badge: 'bg-info-50 text-info border-info/20' },
  { value: 'box', labelEn: 'Packaging Box', labelAr: 'علبة كرتون فاخرة', badge: 'bg-warning-50 text-warning border-warning/20' },
  { value: 'bag', labelEn: 'Brand Bag', labelAr: 'كيس براند', badge: 'bg-warning-50 text-warning border-warning/20' },
  { value: 'packaging', labelEn: 'Packaging Supplies', labelAr: 'مستلزمات تغليف وشحن', badge: 'bg-info-50 text-info border-info/20' },
  { value: 'tester', labelEn: 'Sample / Tester', labelAr: 'عبوة عينات / تيستر', badge: 'bg-info-50 text-info border-info/20' },
  { value: 'other', labelEn: 'Other Material', labelAr: 'مادة أخرى', badge: 'bg-canvas text-ink-2 border-line' },
];

export default function RawMaterialsPage() {
  const { lang, isRTL, t, formatCurrency } = useLanguage();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Add/Edit Form
  const [formData, setFormData] = useState({
    name: '',
    category: 'fragrance_oil',
    currentStock: '',
    costPerGram: '',
    unit: 'gram',
    supplier: '',
    lowStockThreshold: 100,
    notes: '',
  });

  // Adjust Form
  const [adjustData, setAdjustData] = useState({
    quantityChange: '',
    type: 'MANUAL_ADJUSTMENT',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await getRawMaterials({
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      });
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching raw materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMaterials();
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedMaterial(null);
    setFormData({
      name: '',
      category: 'fragrance_oil',
      currentStock: '',
      costPerGram: '',
      unit: 'gram',
      supplier: '',
      lowStockThreshold: 100,
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setIsEditing(true);
    setSelectedMaterial(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'fragrance_oil',
      currentStock: item.currentStock ?? item.currentStockGrams ?? 0,
      costPerGram: item.costPerGram || 0,
      unit: item.unit || 'gram',
      supplier: item.supplier || '',
      lowStockThreshold: item.lowStockThreshold || 100,
      notes: item.notes || '',
    });
    setShowAddModal(true);
  };

  const handleOpenAdjust = (item) => {
    setSelectedMaterial(item);
    setAdjustData({
      quantityChange: '',
      type: 'MANUAL_ADJUSTMENT',
      reason: '',
    });
    setShowAdjustModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError(
        lang === 'ar' ? 'بيانات ناقصة' : 'Missing Information',
        lang === 'ar' ? 'يرجى إدخال اسم المادة الخام' : 'Please enter the raw material name'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        currentStock: Number(formData.currentStock) || 0,
        costPerGram: Number(formData.costPerGram) || 0,
        unit: formData.unit || 'gram',
        lowStockThreshold: Number(formData.lowStockThreshold) || 100,
        supplier: formData.supplier.trim(),
        notes: formData.notes.trim(),
      };

      if (isEditing && selectedMaterial) {
        await updateRawMaterial(selectedMaterial._id, payload);
        showSuccess(
          lang === 'ar' ? 'تم التحديث بنجاح' : 'Updated Successfully',
          lang === 'ar' ? 'تم تحديث بيانات المادة الخام بنجاح' : 'Raw material details updated'
        );
      } else {
        await createRawMaterial(payload);
        showSuccess(
          lang === 'ar' ? 'تمت الإضافة بنجاح' : 'Created Successfully',
          lang === 'ar' ? 'تم تسجيل المادة الخام الجديدة بنجاح' : 'New raw material added to inventory'
        );
      }

      setShowAddModal(false);
      fetchMaterials();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ' : 'Error',
        err.response?.data?.message || (lang === 'ar' ? 'حدث خطأ أثناء حفظ المادة الخام' : 'Failed to save raw material')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!selectedMaterial) return;
    const qty = Number(adjustData.quantityChange);
    if (isNaN(qty) || qty === 0) {
      showError(
        lang === 'ar' ? 'خطأ في الكمية' : 'Invalid Quantity',
        lang === 'ar' ? 'يرجى إدخال كمية تعديل غير صفرية' : 'Please enter a non-zero adjustment quantity'
      );
      return;
    }

    setSubmitting(true);
    try {
      await adjustRawMaterialStock(selectedMaterial._id, {
        quantityChange: qty,
        type: adjustData.type,
        reason: adjustData.reason,
      });
      showSuccess(
        lang === 'ar' ? 'تمت التسوية بنجاح' : 'Adjustment Saved',
        lang === 'ar' ? 'تم تعديل كمية المخزون وتسجيل الحركة بنجاح' : 'Stock level adjusted and audit log created'
      );
      setShowAdjustModal(false);
      fetchMaterials();
    } catch (err) {
      showError(
        lang === 'ar' ? 'خطأ' : 'Error',
        err.response?.data?.message || (lang === 'ar' ? 'حدث خطأ أثناء تعديل المخزون' : 'Failed to adjust stock')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const title = lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete';
    const msg = lang === 'ar' 
      ? `هل أنت متأكد من حذف المادة الخام "${item.name}"؟` 
      : `Are you sure you want to delete "${item.name}"?`;
    const confirmBtn = lang === 'ar' ? 'نعم، احذف' : 'Yes, Delete';
    const cancelBtn = lang === 'ar' ? 'إلغاء' : 'Cancel';

    const confirmed = await showConfirm(title, msg, confirmBtn, cancelBtn);
    if (!confirmed) return;

    try {
      await deleteRawMaterial(item._id);
      showToast(lang === 'ar' ? 'تم حذف المادة بنجاح' : 'Raw material deleted');
      fetchMaterials();
    } catch (err) {
      showError(
        lang === 'ar' ? 'تعذر الحذف' : 'Delete Failed',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر حذف المادة' : 'Could not delete item')
      );
    }
  };

  // KPIs
  const totalItemsCount = materials.length;
  const lowStockCount = materials.filter(m => {
    const stock = Number(m.currentStock ?? m.currentStockGrams ?? 0);
    const threshold = Number(m.lowStockThreshold || 0);
    return stock <= threshold;
  }).length;

  const totalInventoryGrams = materials
    .filter(m => {
      const u = (m.unit || '').toLowerCase();
      const cat = m.category;
      return u.includes('g') || u.includes('جرام') || cat === 'fragrance_oil' || cat === 'alcohol';
    })
    .reduce((sum, m) => sum + Number(m.currentStock ?? m.currentStockGrams ?? 0), 0);

  const totalValuation = materials.reduce((sum, m) => {
    const stock = Number(m.currentStock ?? m.currentStockGrams ?? 0);
    const cost = Number(m.costPerGram || 0);
    return sum + (stock * cost);
  }, 0);

  const getCategoryInfo = (catValue) => {
    return CATEGORIES.find(c => c.value === catValue) || {
      value: catValue,
      labelEn: catValue,
      labelAr: catValue,
      badge: 'bg-canvas text-ink-2 border-line'
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink leading-tight">
              {lang === 'ar' ? 'مخزون المواد الخام' : 'Raw Materials Inventory'}
            </h1>
            <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
              {lang === 'ar' 
                ? 'متابعة كميات الزيوت والكحول والزجاجات ومواد التعبئة ومتوسط التكلفة المرجح (WAC).'
                : 'Track raw fragrance oils, alcohol, packaging, unit costs (WAC), and reorder alerts.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={15} />
            <span>{lang === 'ar' ? 'إضافة مادة خام' : 'Add Raw Material'}</span>
          </button>

          <button
            onClick={fetchMaterials}
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
            {lang === 'ar' ? 'إجمالي المواد المسجلة' : 'Total Registered Materials'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-semibold text-ink font-mono">{totalItemsCount}</h3>
            <span className="text-xs text-ink-3">{lang === 'ar' ? 'مادة' : 'items'}</span>
          </div>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">
            {lang === 'ar' ? 'إجمالي وزن الزيوت والكحول' : 'Bulk Oils & Alcohol Stock'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-semibold text-brand-700 font-mono">
              {(totalInventoryGrams / 1000).toFixed(2)}
            </h3>
            <span className="text-xs text-ink-3">
              {lang === 'ar' ? `كجم (${totalInventoryGrams.toLocaleString()} جم)` : `kg (${totalInventoryGrams.toLocaleString()} g)`}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">
            {lang === 'ar' ? 'إجمالي قيمة مخزون الخام' : 'Total Inventory Valuation'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-semibold text-success font-mono">
              {formatCurrency(Math.round(totalValuation))}
            </h3>
          </div>
        </div>

        <div className={`rounded-control p-4 border shadow-xs transition-colors ${
          lowStockCount > 0 ? 'bg-warning-50/70 border-warning/20' : 'bg-surface border-line'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium block ${lowStockCount > 0 ? 'text-warning' : 'text-ink-2'}`}>
              {lang === 'ar' ? 'مواد قاربت على النفاد' : 'Low Stock Reorder Alerts'}
            </span>
            {lowStockCount > 0 && <AlertTriangle size={16} className="text-warning" />}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-warning' : 'text-ink'}`}>
              {lowStockCount}
            </h3>
            <span className="text-xs text-ink-3">{lang === 'ar' ? 'مواد' : 'items'}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-control p-3 border border-line shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث باسم المادة الخام...' : 'Search raw material by name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full pr-9 pl-3"
            />
            <Search size={14} className={`absolute top-2.5 text-ink-3 ${isRTL ? 'right-3' : 'left-auto right-3'}`} />
          </div>
          <button
            type="submit"
            className="px-3.5 h-9 bg-canvas hover:bg-line text-ink-2 font-semibold text-xs rounded-control transition-colors"
          >
            {lang === 'ar' ? 'بحث' : 'Search'}
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-ink-2 font-medium flex items-center gap-1 shrink-0">
            <Filter size={13} />
            {lang === 'ar' ? 'التصنيف:' : 'Category:'}
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 bg-canvas border border-line rounded-control px-3 text-xs font-medium outline-none text-ink-2 cursor-pointer"
          >
            <option value="">{lang === 'ar' ? `كل التصنيفات (${materials.length})` : `All Categories (${materials.length})`}</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>
                {lang === 'ar' ? c.labelAr : c.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-canvas text-ink-2 font-semibold border-b border-line">
              <tr>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {lang === 'ar' ? 'اسم المادة الخام' : 'Material Name'}
                </th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {lang === 'ar' ? 'التصنيف' : 'Category'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'المخزون الحالي' : 'Available Stock'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'تكلفة الوحدة (WAC)' : 'Unit Cost (WAC)'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'إجمالي القيمة' : 'Total Value'}
                </th>
                <th className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {lang === 'ar' ? 'المورد' : 'Supplier'}
                </th>
                <th className="py-3 px-4 text-center">
                  {lang === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-2 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-ink-3">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} className="animate-spin text-brand-700" />
                      <span>{lang === 'ar' ? 'جاري تحميل المواد الخام...' : 'Loading raw materials...'}</span>
                    </div>
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-ink-3">
                    {lang === 'ar' 
                      ? 'لا توجد مواد خام مطابقة. انقر على "إضافة مادة خام" للبدء.' 
                      : 'No raw materials found. Click "Add Raw Material" to get started.'}
                  </td>
                </tr>
              ) : (
                materials.map((item) => {
                  const stock = Number(item.currentStock ?? item.currentStockGrams ?? 0);
                  const threshold = Number(item.lowStockThreshold || 0);
                  const isLow = stock <= threshold;
                  const cat = getCategoryInfo(item.category);
                  const unitCost = Number(item.costPerGram || 0);
                  const itemTotalVal = stock * unitCost;
                  const displayUnit = item.unit || 'gram';

                  return (
                    <tr key={item._id} className="hover:bg-canvas/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{item.name}</div>
                        {item.notes && <div className="text-xs text-ink-3 mt-0.5">{item.notes}</div>}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-control border text-xs font-semibold ${cat.badge}`}>
                          {lang === 'ar' ? cat.labelAr : cat.labelEn}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono">
                          <span className={`text-sm font-bold ${isLow ? 'text-warning' : 'text-ink'}`}>
                            {stock.toLocaleString()} {displayUnit}
                          </span>
                          {isLow && (
                            <span 
                              title={lang === 'ar' ? `دون الحد الأدنى (${threshold} ${displayUnit})` : `Below threshold (${threshold} ${displayUnit})`} 
                              className="inline-block p-0.5 bg-warning-50 text-warning rounded-control"
                            >
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-ink">
                        {unitCost ? `${unitCost.toFixed(2)} EGP / ${displayUnit}` : '0.00 EGP'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-success">
                        {formatCurrency(Math.round(itemTotalVal))}
                      </td>

                      <td className="py-3 px-4 text-ink-2 font-medium">
                        {item.supplier || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenAdjust(item)}
                            title={lang === 'ar' ? 'تسوية مخزون (جرد / هالك / زيادة)' : 'Adjust stock (audit / waste)'}
                            className="p-1.5 rounded-control bg-canvas hover:bg-line text-ink-2 transition-colors"
                          >
                            <ArrowUpDown size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title={lang === 'ar' ? 'تعديل المادة' : 'Edit item'}
                            className="p-1.5 rounded-control bg-info-50 hover:bg-info-50 text-info transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                            className="p-1.5 rounded-control bg-danger-50 hover:bg-danger-50 text-danger transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface rounded-card border border-line shadow-card shadow-pop z-10 max-h-[90vh] overflow-y-auto">
            <div className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical size={16} />
                <span>
                  {isEditing 
                    ? (lang === 'ar' ? `تعديل المادة: ${selectedMaterial?.name}` : `Edit Material: ${selectedMaterial?.name}`)
                    : (lang === 'ar' ? 'إضافة مادة خام جديدة للمخزون' : 'Add New Raw Material to Inventory')}
                </span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'اسم المادة الخام *' : 'Material Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: زيت فانيليا مدغشقر' : 'e.g. French Vanilla Oil'}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'التصنيف *' : 'Category *'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {lang === 'ar' ? c.labelAr : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'وحدة القياس' : 'Unit of Measure'}
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                  >
                    <option value="gram">{lang === 'ar' ? 'جرام (gram)' : 'Gram (g)'}</option>
                    <option value="ml">{lang === 'ar' ? 'مليلتر (ml)' : 'Milliliter (ml)'}</option>
                    <option value="pcs">{lang === 'ar' ? 'قطعة (pcs)' : 'Piece (pcs)'}</option>
                    <option value="kg">{lang === 'ar' ? 'كيلوجرام (kg)' : 'Kilogram (kg)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {isEditing ? (lang === 'ar' ? 'المخزون الحالي' : 'Current Stock') : (lang === 'ar' ? 'الرصيد الافتتاحي' : 'Initial Stock')}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    placeholder="1000"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'تكلفة الوحدة (ج.م)' : 'Unit Cost (EGP)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.costPerGram}
                    onChange={(e) => setFormData({ ...formData, costPerGram: e.target.value })}
                    placeholder="4.50"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {lang === 'ar' ? 'حد تنبيه النواقص' : 'Low Stock Alert Threshold'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="100"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'المورد الافتراضي' : 'Default Supplier'}
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder={lang === 'ar' ? 'مثال: شركة الأندلس للزيوت العطرية' : 'e.g. Al-Andalus Fragrance Oils'}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={lang === 'ar' ? 'درجة النقاء، تاريخ الانتهاء، مكان التخزين...' : 'Purity, storage location, expiry...'}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {submitting 
                    ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                    : isEditing 
                      ? (lang === 'ar' ? 'تحديث المادة' : 'Update Material') 
                      : (lang === 'ar' ? 'إضافة المادة' : 'Save Material')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-surface rounded-card border border-line shadow-card shadow-pop z-10">
            <div className="px-5 py-3.5 border-b border-line bg-canvas flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                {lang === 'ar' ? `تسوية مخزون: ${selectedMaterial.name}` : `Stock Adjustment: ${selectedMaterial.name}`}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-ink-3 hover:text-ink-2">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-canvas border border-line rounded-control">
                <span className="text-ink-2 font-medium block">
                  {lang === 'ar' ? 'المخزون الحالي المسجل:' : 'Current Recorded Stock:'}
                </span>
                <span className="text-base font-semibold text-ink font-mono">
                  {(selectedMaterial.currentStock ?? selectedMaterial.currentStockGrams ?? 0).toLocaleString()} {selectedMaterial.unit || 'gram'}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {lang === 'ar' 
                    ? `كمية التعديل (${selectedMaterial.unit || 'gram'}) * (سالب للنقص، موجب للزيادة)` 
                    : `Adjustment Quantity (${selectedMaterial.unit || 'gram'}) * (+ or -)`}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustData.quantityChange}
                  onChange={(e) => setAdjustData({ ...adjustData, quantityChange: e.target.value })}
                  placeholder="-50 or +100"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'نوع التسوية' : 'Adjustment Type'}
                </label>
                <select
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                  className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs font-medium outline-none"
                >
                  <option value="MANUAL_ADJUSTMENT">
                    {lang === 'ar' ? 'تسوية جرد دوري (Correction)' : 'Inventory Audit / Correction'}
                  </option>
                  <option value="WASTE">
                    {lang === 'ar' ? 'هالك إنتاج أو انسكاب (Waste)' : 'Production Waste / Spillage'}
                  </option>
                  <option value="DAMAGED">
                    {lang === 'ar' ? 'تلف أثناء التخزين (Damaged)' : 'Damaged in Storage'}
                  </option>
                  <option value="RETURN">
                    {lang === 'ar' ? 'مرتجع أو استرجاع (Return)' : 'Customer or Supplier Return'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'بيان السبب / ملاحظة *' : 'Reason / Audit Note *'}
                </label>
                <textarea
                  rows="2"
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder={lang === 'ar' ? 'مثال: تسوية جرد ربع سنوي...' : 'e.g. Quarterly physical recount...'}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {submitting 
                    ? (lang === 'ar' ? 'جاري التأكيد...' : 'Confirming...') 
                    : (lang === 'ar' ? 'تأكيد التسوية' : 'Confirm Adjustment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
