import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Trash2, Search, Filter, RefreshCw, 
  X, Check, AlertCircle, ArrowUpRight, DollarSign, Wallet,
  Upload, Eye, Image as ImageIcon, Calendar, Building2, Tag
} from 'lucide-react';
import { 
  getPurchases, createPurchase, updatePurchase, deletePurchase, 
  getRawMaterials, getCashAccounts, uploadImageToCloudinary 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

const CATEGORIES = [
  { value: 'fragrance_oil', labelEn: 'Fragrance Oil', labelAr: 'زيت عطري', unit: 'gram' },
  { value: 'alcohol', labelEn: 'Alcohol 96%', labelAr: 'كحول 96%', unit: 'gram' },
  { value: 'bottle', labelEn: 'Glass Bottle', labelAr: 'زجاجة عطر', unit: 'pcs' },
  { value: 'sprayer', labelEn: 'Sprayer / Pump', labelAr: 'بامب / رشاش', unit: 'pcs' },
  { value: 'cap', labelEn: 'Bottle Cap', labelAr: 'غطاء زجاجة', unit: 'pcs' },
  { value: 'sticker', labelEn: 'Sticker / Label', labelAr: 'ستيكر / ليبل', unit: 'pcs' },
  { value: 'box', labelEn: 'Packaging Box', labelAr: 'علبة كرتون', unit: 'pcs' },
  { value: 'bag', labelEn: 'Brand Bag', labelAr: 'كيس براند', unit: 'pcs' },
  { value: 'packaging', labelEn: 'Packaging Supplies', labelAr: 'مستلزمات تغليف', unit: 'pcs' },
  { value: 'other', labelEn: 'Other Material', labelAr: 'مادة أخرى', unit: 'pcs' },
];

export default function PurchasesPage() {
  const { lang, isRTL, t } = useLanguage();
  const [purchases, setPurchases] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Details
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supplier: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'paid',
    paymentAccount: '',
    attachmentUrl: '',
    shippingFee: 0,
    transportCost: 0,
    notes: '',
    items: [
      { rawMaterial: '', rawMaterialName: '', category: 'fragrance_oil', quantity: '', unit: 'gram', unitCost: '', totalCost: '' }
    ],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pData, mData, aData] = await Promise.all([
        getPurchases().catch(() => []),
        getRawMaterials().catch(() => []),
        getCashAccounts().catch(() => []),
      ]);
      setPurchases(Array.isArray(pData) ? pData : []);
      setRawMaterials(Array.isArray(mData) ? mData : []);
      setCashAccounts(Array.isArray(aData) ? aData : []);

      if (aData?.length && !formData.paymentAccount) {
        setFormData(prev => ({ ...prev, paymentAccount: aData[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      supplier: '',
      invoiceNumber: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'paid',
      paymentAccount: cashAccounts[0]?._id || '',
      attachmentUrl: '',
      shippingFee: 0,
      transportCost: 0,
      notes: '',
      items: [
        { rawMaterial: '', rawMaterialName: '', category: 'fragrance_oil', quantity: '', unit: 'gram', unitCost: '', totalCost: '' }
      ],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p._id);
    setFormData({
      supplier: p.supplier || '',
      invoiceNumber: p.invoiceNumber || '',
      purchaseDate: p.purchaseDate ? p.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentStatus: p.paymentStatus || 'paid',
      paymentAccount: p.paymentAccount?._id || p.paymentAccount || (cashAccounts[0]?._id || ''),
      attachmentUrl: p.attachmentUrl || '',
      shippingFee: 0,
      transportCost: 0,
      notes: p.notes || '',
      items: (p.items || []).map(i => ({
        rawMaterial: i.rawMaterial?._id || i.rawMaterial || '',
        rawMaterialName: i.rawMaterialName || i.rawMaterial?.name || '',
        category: i.rawMaterial?.category || 'fragrance_oil',
        quantity: i.quantity || i.quantityGrams || 1,
        unit: i.unit || 'gram',
        unitCost: i.unitCost || (i.totalCost / (i.quantity || 1)) || 0,
        totalCost: i.totalCost || 0
      }))
    });
    setShowModal(true);
  };

  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items, 
        { rawMaterial: '', rawMaterialName: '', category: 'fragrance_oil', quantity: '', unit: 'gram', unitCost: '', totalCost: '' }
      ]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      if (field === 'rawMaterial') {
        if (value && value !== '__new__') {
          const selectedMat = rawMaterials.find(m => m._id === value);
          if (selectedMat) {
            item.rawMaterialName = selectedMat.name;
            item.category = selectedMat.category || 'fragrance_oil';
            item.unit = selectedMat.unit || 'gram';
            if (!item.unitCost && selectedMat.costPerGram) {
              item.unitCost = selectedMat.costPerGram;
            }
          }
        } else if (value === '__new__') {
          item.rawMaterial = '';
          item.rawMaterialName = '';
        }
      }

      const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
      if (field === 'quantity' || field === 'unitCost') {
        const uCost = Number(field === 'unitCost' ? value : item.unitCost) || 0;
        item.totalCost = qty > 0 && uCost > 0 ? Number((qty * uCost).toFixed(2)) : item.totalCost;
      } else if (field === 'totalCost') {
        const tCost = Number(value) || 0;
        if (qty > 0 && tCost > 0) {
          item.unitCost = Number((tCost / qty).toFixed(4));
        }
      }

      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const calculateTotal = () => {
    const itemsTotal = formData.items.reduce((acc, curr) => acc + (Number(curr.totalCost) || 0), 0);
    const extra = (Number(formData.shippingFee) || 0) + (Number(formData.transportCost) || 0);
    return itemsTotal + extra;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError(isRTL ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await uploadImageToCloudinary(file, 'm20/invoices');
      const url = res?.secure_url || res?.url;
      if (url) {
        setFormData(prev => ({ ...prev, attachmentUrl: url }));
        showToast(isRTL ? 'تم رفع صورة الفاتورة بنجاح' : 'Invoice image uploaded successfully', 'success');
      }
    } catch (err) {
      console.error('Invoice image upload failed:', err);
      showError(isRTL ? 'فشل رفع الصورة إلى السحابة' : 'Failed to upload image to Cloudinary');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier.trim()) {
      showError(isRTL ? 'يرجى إدخال اسم المورد' : 'Supplier name is required');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const itm = formData.items[i];
      const name = itm.rawMaterialName || (rawMaterials.find(m => m._id === itm.rawMaterial)?.name);
      if (!name || !name.trim()) {
        showError(isRTL ? `يرجى تحديد أو كتابة اسم المادة في البند #${i + 1}` : `Please specify material name for item #${i + 1}`);
        return;
      }
      if (!Number(itm.quantity) || Number(itm.quantity) <= 0) {
        showError(isRTL ? `يرجى إدخال كمية صحيحة في البند #${i + 1}` : `Please enter a valid quantity for item #${i + 1}`);
        return;
      }
      if (!Number(itm.totalCost) && !Number(itm.unitCost)) {
        showError(isRTL ? `يرجى إدخال سعر الوحدة أو الإجمالي في البند #${i + 1}` : `Please enter unit price or total for item #${i + 1}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier: formData.supplier.trim(),
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        purchaseDate: formData.purchaseDate,
        paymentStatus: formData.paymentStatus,
        paymentAccountId: formData.paymentStatus === 'paid' ? formData.paymentAccount : null,
        attachmentUrl: formData.attachmentUrl || null,
        shippingFee: Number(formData.shippingFee) || 0,
        transportCost: Number(formData.transportCost) || 0,
        notes: formData.notes.trim(),
        items: formData.items.map(itm => ({
          rawMaterial: itm.rawMaterial || undefined,
          rawMaterialName: itm.rawMaterialName?.trim(),
          category: itm.category || 'fragrance_oil',
          quantity: Number(itm.quantity),
          unit: itm.unit || 'gram',
          unitCost: Number(itm.unitCost) || (Number(itm.totalCost) / Number(itm.quantity)),
          totalCost: Number(itm.totalCost) || (Number(itm.quantity) * Number(itm.unitCost))
        }))
      };

      if (editingId) {
        await updatePurchase(editingId, payload);
        showSuccess(isRTL ? 'تم تحديث فاتورة المشتريات والمخزون بنجاح' : 'Purchase invoice and inventory updated successfully');
      } else {
        await createPurchase(payload);
        showSuccess(isRTL ? 'تم تسجيل الفاتورة وزيادة المخزون تلقائياً' : 'Invoice saved & inventory updated automatically');
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Save purchase error:', err);
      showError(err.response?.data?.message || err.message || (isRTL ? 'فشل حفظ الفاتورة' : 'Failed to save purchase invoice'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, pNum) => {
    const confirm = await showConfirm(
      isRTL ? `حذف الفاتورة ${pNum}؟` : `Delete Invoice ${pNum}?`,
      isRTL ? 'سيتم التراجع عن كميات المخزون المضافة وتعديل الرصيد تلقائياً.' : 'This will revert added stock and adjust account balances automatically.'
    );
    if (!confirm) return;

    try {
      await deletePurchase(id);
      showSuccess(isRTL ? 'تم حذف الفاتورة وتحديث المخزون' : 'Purchase deleted & inventory reverted');
      fetchData();
    } catch (err) {
      console.error('Delete purchase error:', err);
      showError(isRTL ? 'فشل حذف الفاتورة' : 'Failed to delete purchase');
    }
  };

  // Filtered purchases
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = !searchQuery.trim() || 
      (p.supplier && p.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.purchaseNumber && p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || p.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSpent = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const unpaidTotal = purchases.filter(p => p.paymentStatus === 'unpaid').reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>{isRTL ? 'فواتير المشتريات والتوريدات' : 'Purchase Invoices'}</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            {isRTL 
              ? 'تسجيل فواتير الشراء اليومية وإضافة المواد الخام وحساب التكلفة تلقائياً' 
              : 'Record supplier invoices with automated raw materials intake and unit cost calculations'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
        >
          <Plus size={16} />
          <span>{isRTL ? 'تسجيل فاتورة شراء جديدة' : 'New Purchase Invoice'}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-line p-4 rounded-card shadow-card">
          <span className="text-ink-2 text-xs font-medium block mb-1">
            {isRTL ? 'إجمالي الفواتير المسجلة' : 'Total Invoices'}
          </span>
          <span className="text-2xl font-semibold text-ink font-mono">
            {purchases.length}
          </span>
        </div>

        <div className="bg-surface border border-line p-4 rounded-card shadow-card">
          <span className="text-ink-2 text-xs font-medium block mb-1">
            {isRTL ? 'إجمالي المشتريات الكلي' : 'Total Purchases Value'}
          </span>
          <span className="text-2xl font-semibold text-brand-700 font-mono">
            {totalSpent.toLocaleString()} <span className="text-xs font-sans text-ink-2">{isRTL ? 'ج.م' : 'EGP'}</span>
          </span>
        </div>

        <div className="bg-surface border border-line p-4 rounded-card shadow-card">
          <span className="text-ink-2 text-xs font-medium block mb-1">
            {isRTL ? 'مستحقات الموردين غير المسددة' : 'Outstanding Supplier Payments'}
          </span>
          <span className={`text-2xl font-bold font-mono ${unpaidTotal > 0 ? 'text-warning' : 'text-ink-2'}`}>
            {unpaidTotal.toLocaleString()} <span className="text-xs font-sans text-ink-2">{isRTL ? 'ج.م' : 'EGP'}</span>
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface border border-line p-3 rounded-control shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-ink-3 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={isRTL ? 'بحث برقم الفاتورة أو اسم المورد...' : 'Search by supplier, invoice #...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-1.5 text-xs bg-canvas border border-line rounded-control focus:outline-none focus:border-brand-700 ${
              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-canvas rounded-control p-0.5 border border-line text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                statusFilter === 'all' ? 'bg-brand-700 text-white shadow-2xs' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {isRTL ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                statusFilter === 'paid' ? 'bg-success text-white shadow-2xs' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {isRTL ? 'مسددة' : 'Paid'}
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                statusFilter === 'unpaid' ? 'bg-warning text-white shadow-2xs' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {isRTL ? 'غير مسددة' : 'Unpaid'}
            </button>
          </div>

          <button
            onClick={fetchData}
            title={isRTL ? 'تحديث' : 'Refresh'}
            className="p-1.5 border border-line hover:bg-canvas rounded-control text-ink-2 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ink-2 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-700" />
            <span>{isRTL ? 'جاري تحميل فواتير الشراء...' : 'Loading invoices...'}</span>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-12 text-center text-ink-2 text-xs">
            <Receipt size={32} className="mx-auto mb-2 text-ink-3" />
            <p className="font-semibold text-ink-2 mb-1">
              {isRTL ? 'لا توجد فواتير مسجلة' : 'No purchase invoices found'}
            </p>
            <p className="text-xs text-ink-3">
              {isRTL ? 'ابدأ بتسجيل أول فاتورة شراء لإضافة المواد الخام تلقائياً' : 'Start by recording your first invoice to automatically populate raw materials'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas/80 border-b border-line text-ink-2 uppercase tracking-wider font-semibold text-xs">
                  <th className="py-3 px-4">{isRTL ? 'رقم الفاتورة' : 'Invoice Ref'}</th>
                  <th className="py-3 px-4">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="py-3 px-4">{isRTL ? 'المورد' : 'Supplier'}</th>
                  <th className="py-3 px-4">{isRTL ? 'البنود المشتراة' : 'Purchased Items'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الإجمالي' : 'Total Amount'}</th>
                  <th className="py-3 px-4">{isRTL ? 'حالة السداد' : 'Payment'}</th>
                  <th className="py-3 px-4 text-center">{isRTL ? 'صورة الفاتورة' : 'Attachment'}</th>
                  <th className="py-3 px-4 text-center">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPurchases.map((p) => {
                  const isPaid = p.paymentStatus === 'paid';
                  return (
                    <tr key={p._id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        {p.purchaseNumber}
                        {p.invoiceNumber && (
                          <span className="block text-xs text-ink-3 font-sans">
                            {isRTL ? 'رقم المورد: ' : 'Supp: '} {p.invoiceNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-ink-2 font-mono text-xs">
                        {p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '-'}
                      </td>

                      <td className="py-3 px-4 font-medium text-ink">
                        {p.supplier || (isRTL ? 'مورد غير محدد' : 'General Supplier')}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(p.items || []).map((itm, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center text-xs bg-canvas border border-line px-1.5 py-0.5 rounded-control text-ink-2"
                            >
                              {itm.rawMaterialName || itm.rawMaterial?.name} ({itm.quantity || itm.quantityGrams} {itm.unit || 'g'})
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold font-mono text-ink">
                        {(p.totalAmount || 0).toLocaleString()} <span className="text-xs font-sans font-normal text-ink-2">{isRTL ? 'ج.م' : 'EGP'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPaid ? 'bg-success-50 text-success border border-success/20' : 'bg-warning-50 text-warning border border-warning/20'
                        }`}>
                          {isPaid ? (isRTL ? 'مسددة' : 'PAID') : (isRTL ? 'غير مسددة' : 'UNPAID')}
                        </span>
                        {isPaid && p.paymentAccountName && (
                          <span className="block text-xs text-ink-3 mt-0.5">
                            {p.paymentAccountName}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {p.attachmentUrl ? (
                          <button
                            onClick={() => setPreviewImage(p.attachmentUrl)}
                            className="inline-flex items-center gap-1 text-xs text-info hover:text-info underline cursor-pointer"
                          >
                            <ImageIcon size={13} />
                            <span>{isRTL ? 'عرض' : 'View'}</span>
                          </button>
                        ) : (
                          <span className="text-ink-3 text-xs">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="text-ink-2 hover:text-brand-700 p-1 rounded-control hover:bg-canvas cursor-pointer"
                            title={isRTL ? 'تعديل الفاتورة' : 'Edit Invoice'}
                          >
                            <Receipt size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p._id, p.purchaseNumber)}
                            className="text-ink-3 hover:text-danger p-1 rounded-control hover:bg-danger-50 cursor-pointer"
                            title={isRTL ? 'حذف الفاتورة' : 'Delete Invoice'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Entry / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-surface rounded-card border border-line shadow-card w-full max-w-3xl my-8 shadow-pop overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-line bg-canvas/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="text-brand-700" size={20} />
                <h3 className="font-semibold text-sm text-ink">
                  {editingId 
                    ? (isRTL ? 'تعديل فاتورة مشتريات' : 'Edit Purchase Invoice') 
                    : (isRTL ? 'تسجيل فاتورة شراء وتوريد جديدة' : 'New Purchase Invoice Entry')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-ink-3 hover:text-ink-2 p-1 rounded-control cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              
              {/* Row 1: Supplier, Invoice #, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">
                    {isRTL ? 'اسم المورد *' : 'Supplier Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isRTL ? 'مثال: شركة الزيوت الفرنسية' : 'e.g. French Fragrance Co.'}
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full text-xs px-2.5 py-1.5 border border-line rounded-control focus:border-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">
                    {isRTL ? 'رقم الفاتورة (اختياري)' : 'Invoice Number (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="INV-2026-001"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full text-xs px-2.5 py-1.5 border border-line rounded-control focus:border-brand-700 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">
                    {isRTL ? 'تاريخ الفاتورة *' : 'Invoice Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    className="w-full text-xs px-2.5 py-1.5 border border-line rounded-control focus:border-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Payment Status & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-canvas border border-line rounded-control">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">
                    {isRTL ? 'حالة السداد *' : 'Payment Status *'}
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full text-xs px-2.5 py-1.5 border border-line rounded-control focus:border-brand-700 focus:outline-none bg-surface font-medium"
                  >
                    <option value="paid">{isRTL ? 'مسددة بالكامل (خصم من الخزينة)' : 'Paid (Deduct from Cash Account)'}</option>
                    <option value="unpaid">{isRTL ? 'آجلة / غير مسددة (مستحقات على المنشأة)' : 'Unpaid (Accounts Payable)'}</option>
                  </select>
                </div>

                {formData.paymentStatus === 'paid' ? (
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      {isRTL ? 'حساب السداد / الخزينة *' : 'Payment Account *'}
                    </label>
                    <select
                      value={formData.paymentAccount}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentAccount: e.target.value }))}
                      className="w-full text-xs px-2.5 py-1.5 border border-line rounded-control focus:border-brand-700 focus:outline-none bg-surface"
                    >
                      {cashAccounts.map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name} (رصيد: {acc.balance?.toLocaleString()} ج.م)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-warning pt-5">
                    <AlertCircle size={14} className="shrink-0 mr-1.5 ml-1.5" />
                    <span>{isRTL ? 'لن يتم خصم رصيد، وستُقيد كمستحقات موردين' : 'No cash deducted; tracked in outstanding supplier debt.'}</span>
                  </div>
                )}
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={13} className="text-brand-700" />
                    <span>{isRTL ? 'البنود والأصناف المشتراة' : 'Purchased Items & Raw Materials'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 font-semibold cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>{isRTL ? 'إضافة بند آخر' : '+ Add Item'}</span>
                  </button>
                </div>

                <div className="space-y-2 border border-line rounded-control p-2 bg-canvas/40">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-surface p-2.5 border border-line rounded-control shadow-card">
                      
                      {/* Material Select / Type */}
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-xs text-ink-2 mb-0.5">
                          {isRTL ? 'المادة الخام *' : 'Material *'}
                        </label>
                        <select
                          value={item.rawMaterial || (item.rawMaterialName ? '__new__' : '')}
                          onChange={(e) => handleItemChange(idx, 'rawMaterial', e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-line rounded-control focus:border-brand-700 focus:outline-none bg-surface mb-1"
                        >
                          <option value="">{isRTL ? '-- اختر مادة مسجلة --' : '-- Select Existing Material --'}</option>
                          {rawMaterials.map(m => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.category} - متوفر: {m.currentStock} {m.unit})
                            </option>
                          ))}
                          <option value="__new__">{isRTL ? '➕ مادة جديدة غير مسجلة' : '➕ New Material (Type Name)'}</option>
                        </select>

                        {(!item.rawMaterial || item.rawMaterial === '__new__') && (
                          <div className="flex gap-1 mt-1">
                            <input
                              type="text"
                              required
                              placeholder={isRTL ? 'اسم المادة الجديدة...' : 'New material name...'}
                              value={item.rawMaterialName}
                              onChange={(e) => handleItemChange(idx, 'rawMaterialName', e.target.value)}
                              className="w-full text-xs px-2 py-0.5 border border-warning/20 bg-warning-50/40 rounded-control focus:outline-none"
                            />
                            <select
                              value={item.category}
                              onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                              className="text-xs px-1 py-0.5 border border-line rounded-control bg-surface"
                            >
                              {CATEGORIES.map(c => (
                                <option key={c.value} value={c.value}>{isRTL ? c.labelAr : c.labelEn}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Quantity & Unit */}
                      <div className="col-span-6 sm:col-span-3">
                        <label className="block text-xs text-ink-2 mb-0.5">
                          {isRTL ? 'الكمية والوحدة *' : 'Qty & Unit *'}
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            required
                            placeholder="100"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full text-xs px-2 py-1 border border-line rounded-control focus:border-brand-700 focus:outline-none font-mono"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="text-xs px-1.5 py-1 border border-line rounded-control bg-surface shrink-0 font-medium"
                          >
                            <option value="gram">g (جرام)</option>
                            <option value="ml">ml (مل)</option>
                            <option value="pcs">pcs (قطعة)</option>
                            <option value="kg">kg (كجم)</option>
                          </select>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-6 sm:col-span-2">
                        <label className="block text-xs text-ink-2 mb-0.5">
                          {isRTL ? 'سعر الوحدة' : 'Unit Price'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={item.unitCost}
                          onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-line rounded-control focus:border-brand-700 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Total Cost */}
                      <div className="col-span-10 sm:col-span-2">
                        <label className="block text-xs text-ink-2 mb-0.5">
                          {isRTL ? 'الإجمالي (ج.م) *' : 'Total (EGP) *'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={item.totalCost}
                          onChange={(e) => handleItemChange(idx, 'totalCost', e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-line rounded-control focus:border-brand-700 focus:outline-none font-mono font-semibold text-brand-700"
                        />
                      </div>

                      {/* Remove Row */}
                      <div className="col-span-2 sm:col-span-1 text-center pt-3">
                        <button
                          type="button"
                          disabled={formData.items.length <= 1}
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-ink-3 hover:text-danger disabled:opacity-20 cursor-pointer p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* Invoice Image Upload (Cloudinary) */}
              <div className="p-3 border border-dashed border-line rounded-control bg-canvas/50">
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  {isRTL ? 'صورة الفاتورة الأصلية (مستند الشراء)' : 'Original Invoice Image (Document Attachment)'}
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs">
                    <Upload size={14} className={uploadingImage ? 'animate-bounce text-brand-700' : 'text-ink-2'} />
                    <span>{uploadingImage ? (isRTL ? 'جاري الرفع لسحابة Cloudinary...' : 'Uploading...') : (isRTL ? 'اختيار صورة الفاتورة' : 'Select Invoice Image')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>

                  {formData.attachmentUrl ? (
                    <div className="flex items-center gap-2">
                      <a 
                        href={formData.attachmentUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-info hover:text-info underline"
                      >
                        <Eye size={13} />
                        <span>{isRTL ? 'معاينة الصورة المرفوعة' : 'Preview Uploaded Image'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, attachmentUrl: '' }))}
                        className="text-ink-3 hover:text-danger text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-3">
                      {isRTL ? 'محفوظة بأمان دائم ولا تخضع للحذف التلقائي' : 'Protected permanently from auto-deletion'}
                    </span>
                  )}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-ink-2 font-medium">
                    {isRTL ? 'إجمالي قيمة الفاتورة:' : 'Invoice Grand Total:'}
                  </span>
                  <span className="text-2xl font-semibold font-mono text-brand-700">
                    {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-semibold text-ink-2">{isRTL ? 'ج.م' : 'EGP'}</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs w-full sm:w-auto"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{isRTL ? 'جاري الحفظ وتحديث المخزون...' : 'Saving & Updating Stock...'}</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>{isRTL ? 'حفظ الفاتورة وتحديث المخزون' : 'Save Invoice & Update Stock'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Invoice Image Full Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden bg-surface p-2 rounded-control shadow-pop" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-1 rounded-full cursor-pointer z-10"
            >
              <X size={18} />
            </button>
            <img 
              src={previewImage} 
              alt="Invoice Document" 
              className="max-h-[85vh] w-auto object-contain mx-auto rounded-control"
            />
          </div>
        </div>
      )}

    </div>
  );
}
