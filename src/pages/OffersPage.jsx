import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  Percent, 
  DollarSign, 
  Package, 
  Layers, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Search, 
  Tag, 
  Image as ImageIcon,
  Clock,
  Upload
} from 'lucide-react';
import { getOffers, createOffer, updateOffer, deleteOffer, toggleOfferActive, getProducts, uploadImageToCloudinary } from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

const AVAILABLE_SIZES = ['30ml', '50ml', '100ml'];

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Form State
  const initialFormState = {
    title: '',
    subtitle: '',
    description: '',
    offerType: 'product_specific',
    discountType: 'percentage',
    discountValue: 15,
    bundlePrice: '',
    applicableProducts: [],
    applicableSizes: ['50ml', '100ml'],
    bundleItems: [],
    bannerImage: {
      url: '',
      publicId: '',
      alt: ''
    },
    badge: 'خصم خاص',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    active: true,
    priority: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchOffersList = async () => {
    setLoading(true);
    try {
      const [offersData, productsData] = await Promise.all([
        getOffers(),
        getProducts()
      ]);
      setOffers(Array.isArray(offersData) ? offersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Failed to fetch offers or products:', err);
      showError('خطأ', 'تعذر تحميل بيانات العروض والمنتجات.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffersList();
  }, []);

  const openCreateModal = () => {
    setEditingOffer(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title || '',
      subtitle: offer.subtitle || '',
      description: offer.description || '',
      offerType: offer.offerType || 'product_specific',
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountValue ?? 10,
      bundlePrice: offer.bundlePrice ?? '',
      applicableProducts: Array.isArray(offer.applicableProducts) 
        ? offer.applicableProducts.map(p => typeof p === 'object' ? p._id : p) 
        : [],
      applicableSizes: Array.isArray(offer.applicableSizes) && offer.applicableSizes.length > 0 
        ? offer.applicableSizes 
        : ['50ml'],
      bundleItems: Array.isArray(offer.bundleItems) 
        ? offer.bundleItems.map(item => ({
            product: typeof item.product === 'object' ? item.product._id : item.product,
            size: item.size || '50ml',
            quantity: item.quantity || 1
          }))
        : [],
      bannerImage: {
        url: offer.bannerImage?.url || '',
        publicId: offer.bannerImage?.publicId || '',
        alt: offer.bannerImage?.alt || ''
      },
      badge: offer.badge || '',
      startDate: offer.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : '',
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : '',
      active: offer.active !== undefined ? offer.active : true,
      priority: offer.priority || 0
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      await toggleOfferActive(id);
      setOffers(prev => prev.map(o => o._id === id ? { ...o, active: !currentActive } : o));
      showToast(currentActive ? 'تم تعطيل العرض' : 'تم تفعيل العرض بنجاح');
    } catch (err) {
      showError('خطأ', 'تعذر تغيير حالة العرض.');
    }
  };

  const handleDelete = async (id, title) => {
    const confirmed = await showConfirm(
      'تأكيد حذف العرض',
      `هل أنت متأكد من حذف العرض "${title}"؟ لن يتمكن العملاء من الاستفادة منه بعد الحذف.`,
      'نعم، احذف العرض',
      'إلغاء'
    );
    if (!confirmed) return;

    try {
      await deleteOffer(id);
      setOffers(prev => prev.filter(o => o._id !== id));
      showSuccess('تم الحذف', 'تم حذف العرض بنجاح.');
    } catch (err) {
      showError('خطأ', 'فشل حذف العرض.');
    }
  };

  const handleSizeToggle = (size) => {
    setFormData(prev => {
      const exists = prev.applicableSizes.includes(size);
      const nextSizes = exists 
        ? prev.applicableSizes.filter(s => s !== size) 
        : [...prev.applicableSizes, size];
      return { ...prev, applicableSizes: nextSizes };
    });
  };

  const handleProductToggle = (productId) => {
    setFormData(prev => {
      const exists = prev.applicableProducts.includes(productId);
      const nextProducts = exists
        ? prev.applicableProducts.filter(p => p !== productId)
        : [...prev.applicableProducts, productId];
      return { ...prev, applicableProducts: nextProducts };
    });
  };

  const handleAddBundleItem = () => {
    if (products.length === 0) return;
    setFormData(prev => ({
      ...prev,
      bundleItems: [
        ...prev.bundleItems,
        { product: products[0]._id, size: '50ml', quantity: 1 }
      ]
    }));
  };

  const handleUpdateBundleItem = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.bundleItems];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, bundleItems: updated };
    });
  };

  const handleRemoveBundleItem = (index) => {
    setFormData(prev => ({
      ...prev,
      bundleItems: prev.bundleItems.filter((_, i) => i !== index)
    }));
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const res = await uploadImageToCloudinary(file, 'm20/offers');
      const url = res?.secure_url || res?.url;
      const publicId = res?.public_id || res?.publicId || '';
      if (!url) {
        throw new Error('لم يتم استلام رابط الصورة من Cloudinary.');
      }

      setFormData(prev => ({
        ...prev,
        bannerImage: {
          url,
          publicId,
          alt: prev.title ? `${prev.title} Banner` : 'M20 Offer Banner'
        }
      }));
      showToast('تم رفع صورة العرض إلى Cloudinary بنجاح');
    } catch (err) {
      console.error('Offer banner upload failed:', err);
      showError(
        'فشل رفع الصورة',
        err.response?.data?.message || err.message || 'تعذر رفع صورة البانر إلى السحابة.'
      );
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showError('بيانات غير مكتملة', 'يرجى إدخال عنوان العرض.');
      return;
    }

    if (formData.offerType === 'bundle' && formData.bundleItems.length < 2) {
      showError('تنبيه', 'يجب تحديد منتجين على الأقل لتكوين باقة (Bundle).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        discountValue: Number(formData.discountValue) || 0,
        bundlePrice: formData.bundlePrice !== '' ? Number(formData.bundlePrice) : null,
        priority: Number(formData.priority) || 0
      };

      if (editingOffer) {
        const updated = await updateOffer(editingOffer._id, payload);
        showSuccess('تم التحديث', 'تم تحديث بيانات العرض بنجاح.');
        setIsModalOpen(false);
        fetchOffersList();
      } else {
        const created = await createOffer(payload);
        showSuccess('تم الإنشاء', 'تم إضافة العرض الجديد بنجاح.');
        setIsModalOpen(false);
        fetchOffersList();
      }
    } catch (err) {
      console.error('Submit offer error:', err);
      showError('خطأ', err.response?.data?.message || 'فشل حفظ العرض.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered offers
  const now = new Date();
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          offer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          offer.badge?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterType === 'active') {
      const isExpired = offer.endDate && new Date(offer.endDate) < now;
      return offer.active && !isExpired;
    }
    if (filterType === 'inactive') return !offer.active;
    if (filterType === 'expired') {
      return offer.endDate && new Date(offer.endDate) < now;
    }
    if (filterType === 'bundle') return offer.offerType === 'bundle';
    if (filterType === 'product_specific') return offer.offerType === 'product_specific';

    return true;
  });

  const activeCount = offers.filter(o => o.active && (!o.endDate || new Date(o.endDate) >= now)).length;
  const bundleCount = offers.filter(o => o.offerType === 'bundle').length;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-6 rounded-card border border-line shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink leading-tight">إدارة العروض والباقات الترويجية</h1>
          </div>
          <p className="text-xs text-ink-2 mt-1">
            إنشاء وإدارة عروض الخصم المباشرة، الباقات الثنائية والثلاثية، وتحديد مدة وتفاصيل العرض على المتجر.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchOffersList}
            disabled={loading}
            className="p-2.5 text-ink-2 hover:text-brand-700 bg-canvas hover:bg-line rounded-control transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs flex-1 sm:flex-none"
          >
            <Plus size={16} />
            <span>إضافة عرض جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-card border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">إجمالي العروض</span>
          <span className="text-2xl font-semibold text-brand-700 mt-1 block">{offers.length}</span>
        </div>
        <div className="bg-surface p-4 rounded-card border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">العروض النشطة حالياً</span>
          <span className="text-2xl font-semibold text-success mt-1 block">{activeCount}</span>
        </div>
        <div className="bg-surface p-4 rounded-card border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">عروض الباقات (Bundles)</span>
          <span className="text-2xl font-semibold text-warning mt-1 block">{bundleCount}</span>
        </div>
        <div className="bg-surface p-4 rounded-card border border-line shadow-card">
          <span className="text-xs text-ink-2 font-medium block">المنتجات المتاحة</span>
          <span className="text-2xl font-semibold text-brand-700 mt-1 block">{products.length}</span>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-surface p-4 rounded-card border border-line shadow-card">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            placeholder="البحث باسم العرض، الوصف أو الشارة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'active', label: 'النشطة' },
            { id: 'bundle', label: 'الباقات' },
            { id: 'product_specific', label: 'خصم عطور محددة' },
            { id: 'expired', label: 'المنتهية' },
            { id: 'inactive', label: 'المعطلة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 text-xs rounded-control whitespace-nowrap transition-colors font-medium ${
                filterType === tab.id
                  ? 'bg-brand-700 text-white'
                  : 'bg-canvas text-ink-2 hover:bg-line'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Grid / List */}
      {loading ? (
        <div className="bg-surface p-12 text-center rounded-card border border-line shadow-card">
          <div className="w-8 h-8 border-2 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-ink-2">جاري تحميل العروض...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-surface p-12 text-center rounded-card border border-line shadow-card">
          <Sparkles size={36} className="text-ink-3 mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink-2">لا توجد عروض مطابقة</p>
          <p className="text-xs text-ink-2 mt-1">ابدأ بإنشاء أول عرض ترويجي أو باقة خاصة لمتجرك.</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs mt-4"
          >
            <Plus size={14} /> إضافة عرض الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOffers.map((offer) => {
            const isExpired = offer.endDate && new Date(offer.endDate) < now;
            const isLive = offer.active && !isExpired;

            return (
              <div 
                key={offer._id}
                className={`bg-surface rounded-control border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm ${
                  isLive ? 'border-line hover:border-brand-700' : 'border-line opacity-75'
                }`}
              >
                {/* Banner / Header */}
                <div className="relative h-36 bg-canvas overflow-hidden">
                  {offer.bannerImage?.url ? (
                    <img 
                      src={offer.bannerImage.url} 
                      alt={offer.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/img/offers.png';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 text-white p-4 text-center">
                      <Sparkles size={28} className="opacity-80 mb-1" />
                      <span className="font-serif text-sm tracking-widest uppercase">M20 PRIVILEGE</span>
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                    {offer.badge && (
                      <span className="bg-brand-700 text-white text-xs font-semibold px-2 py-0.5 rounded-control tracking-wider uppercase shadow-card">
                        {offer.badge}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-control tracking-wider uppercase shadow-sm ${
                      isLive 
                        ? 'bg-success text-white' 
                        : isExpired 
                        ? 'bg-danger text-white' 
                        : 'bg-ink text-white'
                    }`}>
                      {isLive ? 'نشط' : isExpired ? 'منتهي' : 'معطل'}
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2">
                    <span className="bg-surface/95 backdrop-blur-sm text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-control shadow-card">
                      {offer.offerType === 'bundle' ? 'باقة عطور (Bundle)' : 'خصم عطور'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-brand-700 leading-snug line-clamp-1">{offer.title}</h3>
                    {offer.subtitle && (
                      <p className="text-xs text-ink-2 line-clamp-1 mt-0.5">{offer.subtitle}</p>
                    )}
                    {offer.description && (
                      <p className="text-xs text-ink-2 mt-2 line-clamp-2 leading-relaxed">{offer.description}</p>
                    )}
                  </div>

                  {/* Discount / Pricing Highlight */}
                  <div className="bg-canvas border border-line p-2.5 rounded-control">
                    {offer.offerType === 'bundle' ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-2">سعر الباقة الإجمالي:</span>
                        <span className="font-semibold text-brand-700">
                          {offer.bundlePrice ? `${offer.bundlePrice} EGP` : 'سعر خاص'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-2">قيمة الخصم:</span>
                        <span className="font-semibold text-brand-700">
                          {offer.discountType === 'percentage' 
                            ? `${offer.discountValue}% خصم` 
                            : `${offer.discountValue} EGP خصم ثابت`}
                        </span>
                      </div>
                    )}

                    {/* Applicable sizes pills */}
                    {offer.applicableSizes && offer.applicableSizes.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-line">
                        <span className="text-xs text-ink-3">المقاسات:</span>
                        <div className="flex gap-1">
                          {offer.applicableSizes.map(s => (
                            <span key={s} className="text-xs bg-surface border border-line text-ink-2 px-1.5 py-0.5 rounded-control font-mono">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bundle items list summary */}
                    {offer.offerType === 'bundle' && offer.bundleItems?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-line text-xs text-ink-2 space-y-0.5">
                        <span className="font-semibold text-ink-2 block">محتويات الباقة ({offer.bundleItems.length} عطور):</span>
                        {offer.bundleItems.slice(0, 2).map((b, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate max-w-[180px]">{b.product?.name || 'عطر إيلان'}</span>
                            <span className="text-ink-3 font-mono">{b.size} ({b.quantity}x)</span>
                          </div>
                        ))}
                        {offer.bundleItems.length > 2 && (
                          <span className="text-ink-3 italic block">+ {offer.bundleItems.length - 2} عطور أخرى</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-xs text-ink-2 border-t border-line pt-2">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-ink-3" />
                      <span>{offer.endDate ? `حتى ${new Date(offer.endDate).toLocaleDateString('ar-EG')}` : 'عرض مستمر'}</span>
                    </span>
                    <span className="text-ink-3 text-xs">ترتيب العرض: {offer.priority || 0}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <button
                      onClick={() => handleToggleActive(offer._id, offer.active)}
                      className={`text-xs px-2.5 py-1 rounded-control font-medium flex items-center gap-1 transition-colors ${
                        offer.active 
                          ? 'bg-success-50 text-success hover:bg-success-50' 
                          : 'bg-canvas text-ink-2 hover:bg-line'
                      }`}
                    >
                      {offer.active ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>{offer.active ? 'مفعل' : 'معطل'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(offer)}
                        className="p-1.5 text-ink-2 hover:text-brand-700 hover:bg-canvas rounded-control transition-colors"
                        title="تعديل العرض"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(offer._id, offer.title)}
                        className="p-1.5 text-ink-3 hover:text-danger hover:bg-danger-50 rounded-control transition-colors"
                        title="حذف العرض"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-surface w-full max-w-2xl rounded-control shadow-pop border border-line my-8 overflow-hidden text-right">
            
            {/* Modal Header */}
            <div className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-warning" />
                <h2 className="text-sm font-semibold tracking-wide">
                  {editingOffer ? 'تعديل بيانات العرض' : 'إنشاء عرض ترويجي جديد'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-control"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Offer Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1.5">نوع العرض *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'product_specific', label: 'خصم على عطور محددة' },
                    { id: 'bundle', label: 'باقة عطور (Bundle)' },
                    { id: 'general', label: 'عرض ترويجي عام' },
                  ].map((type) => (
                    <button
                      type="button"
                      key={type.id}
                      onClick={() => setFormData(prev => ({ ...prev, offerType: type.id }))}
                      className={`py-2 px-3 text-xs font-medium rounded-control border text-center transition-all ${
                        formData.offerType === type.id
                          ? 'border-brand-700 bg-brand-700 text-white shadow-sm'
                          : 'border-line bg-surface text-ink-2 hover:bg-canvas'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">عنوان العرض *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عرض التوأم الملكي، خصم 20%"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">الشارة أو التميز (Badge)</label>
                  <input
                    type="text"
                    placeholder="مثال: الأكثر طلباً، خصم 20%، وفر 300 ج"
                    value={formData.badge}
                    onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">العنوان الفرعي (Subtitle)</label>
                <input
                  type="text"
                  placeholder="مثال: احصل على قطعتين بسعر حصري لفترة محدودة"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">وصف العرض وتفاصيله</label>
                <textarea
                  rows={2}
                  placeholder="اكتب تفاصيل إضافية عن العرض للعملاء..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                />
              </div>

              {/* Discount / Pricing Fields */}
              {formData.offerType !== 'bundle' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-canvas border border-line rounded-control">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">نوع الخصم</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                      className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700 bg-surface"
                    >
                      <option value="percentage">نسبة مئوية (%)</option>
                      <option value="fixed">مبلغ ثابت بالجنيه (EGP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      قيمة الخصم ({formData.discountType === 'percentage' ? '%' : 'EGP'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.discountValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                      className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700 bg-surface"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-canvas border border-line rounded-control space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">
                      سعر الباقة الإجمالي الثابت (EGP) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="مثال: 550"
                      value={formData.bundlePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, bundlePrice: e.target.value }))}
                      className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700 bg-surface"
                    />
                    <p className="text-xs text-ink-2 mt-1">
                      سيتم احتساب هذا السعر لكامل محتويات الباقة بدلاً من مجموع أسعارها الفردية.
                    </p>
                  </div>

                  {/* Bundle Items Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-ink-2">مكونات الباقة (Bundle Fragrances)</label>
                      <button
                        type="button"
                        onClick={handleAddBundleItem}
                        className="text-xs text-brand-700 hover:underline font-semibold flex items-center gap-1"
                      >
                        <Plus size={12} /> إضافة عطر للباقة
                      </button>
                    </div>

                    {formData.bundleItems.length === 0 ? (
                      <p className="text-xs text-warning bg-warning-50 p-2 rounded-control border border-warning/20">
                        اضغط "إضافة عطر للباقة" لتحديد العطور المكونة لهذه الحزمة.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {formData.bundleItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-surface p-2 border border-line rounded-control">
                            <select
                              value={item.product}
                              onChange={(e) => handleUpdateBundleItem(idx, 'product', e.target.value)}
                              className="flex-1 h-8 px-2 text-xs border border-line rounded-control focus:outline-none bg-surface"
                            >
                              {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name} ({p.nameAr || ''})</option>
                              ))}
                            </select>

                            <select
                              value={item.size}
                              onChange={(e) => handleUpdateBundleItem(idx, 'size', e.target.value)}
                              className="w-24 h-8 px-2 text-xs border border-line rounded-control focus:outline-none bg-surface font-mono"
                            >
                              {AVAILABLE_SIZES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>

                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateBundleItem(idx, 'quantity', Number(e.target.value) || 1)}
                              className="w-16 h-8 px-2 text-xs border border-line rounded-control focus:outline-none text-center"
                              title="الكمية"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveBundleItem(idx)}
                              className="p-1.5 text-ink-3 hover:text-danger rounded-control"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sizes Selection (Applicable sizes) */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1.5">
                  المقاسات التي يشملها العرض (30ml, 50ml, 100ml)
                </label>
                <div className="flex gap-2">
                  {AVAILABLE_SIZES.map(size => {
                    const selected = formData.applicableSizes.includes(size);
                    return (
                      <button
                        type="button"
                        key={size}
                        onClick={() => handleSizeToggle(size)}
                        className={`px-4 py-2 text-xs font-mono rounded-control border transition-all flex items-center gap-1.5 ${
                          selected
                            ? 'bg-brand-700 text-white border-brand-700'
                            : 'bg-surface text-ink-2 border-line hover:bg-canvas'
                        }`}
                      >
                        {selected && <Check size={12} />}
                        <span>{size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product selector for product_specific */}
              {formData.offerType === 'product_specific' && (
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1.5">
                    المنتجات المشمولة بالعرض (اتركها فارغة لتطبيق العرض على كل العطور بالمقاسات المختارة)
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-line rounded-control p-2 space-y-1 bg-surface">
                    {products.map(product => {
                      const selected = formData.applicableProducts.includes(product._id);
                      return (
                        <label 
                          key={product._id}
                          className="flex items-center gap-2 text-xs text-ink-2 hover:bg-canvas p-1 rounded-control cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleProductToggle(product._id)}
                            className="rounded-control border-line text-brand-700 focus:ring-brand-700"
                          />
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs text-ink-3">({product.category || 'العطور'})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Banner Image Upload & URL */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  صورة البانر (رفع عبر Cloudinary أو إدخال رابط مباشر)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-control text-xs font-semibold cursor-pointer transition-colors ${
                    uploadingBanner
                      ? 'bg-line text-ink-2 cursor-not-allowed'
                      : 'bg-brand-700 hover:bg-brand-900 text-white'
                  }`}>
                    <Upload size={13} />
                    <span>{uploadingBanner ? 'جاري الرفع...' : 'رفع صورة'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      disabled={uploadingBanner}
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="https://... أو /img/offers.png"
                    value={formData.bannerImage.url}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      bannerImage: { ...prev.bannerImage, url: e.target.value }
                    }))}
                    className="flex-1 min-w-[180px] h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                  />
                  {formData.bannerImage.url && (
                    <>
                      <img 
                        src={formData.bannerImage.url} 
                        alt="Preview" 
                        className="w-9 h-9 object-cover rounded-control border border-line" 
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          bannerImage: { url: '', publicId: '', alt: '' }
                        }))}
                        className="h-9 px-2.5 text-xs border border-line text-ink-2 hover:text-danger rounded-control cursor-pointer"
                        title="إزالة الصورة"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Dates & Scheduling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">تاريخ البداية (Start Date)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">
                    تاريخ النهاية (End Date - اختياري)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                  />
                </div>
              </div>

              {/* Priority & Active Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line">
                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">أولوية الظهور (Priority)</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full h-9 px-3 text-xs border border-line rounded-control focus:outline-none focus:border-brand-700"
                    title="الرقم الأعلى يظهر أولاً"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-700"></div>
                    <span className="mr-3 text-xs font-medium text-ink-2">تفعيل العرض فوراً</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs text-ink-2 hover:bg-canvas rounded-control transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingOffer ? 'حفظ التعديلات' : 'إنشاء العرض'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

