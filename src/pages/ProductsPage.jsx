import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Package, 
  Edit3, 
  Trash2, 
  Upload, 
  X, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Box,
  CheckCircle2,
  Tag,
  ArrowUpDown,
  ExternalLink,
  Clock,
  Timer,
  Wind,
  Sun,
  SunMedium,
  Moon,
  Briefcase,
  Coffee,
  PartyPopper,
  Gem,
  Heart,
  Award
} from 'lucide-react';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  uploadImageToCloudinary 
} from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

const FIXED_SIZES = ['30ml', '50ml', '100ml'];

export const OCCASIONS_LIST = [
  { id: 'morning', labelAr: 'صباحي', labelEn: 'Morning', icon: Sun },
  { id: 'daytime', labelAr: 'نهاري', labelEn: 'Daytime', icon: SunMedium },
  { id: 'night', labelAr: 'مسائي / سهرات', labelEn: 'Night', icon: Moon },
  { id: 'work/office', labelAr: 'العمل والمكتب', labelEn: 'Work & Office', icon: Briefcase },
  { id: 'casual', labelAr: 'كاجوال ويومي', labelEn: 'Casual', icon: Coffee },
  { id: 'parties', labelAr: 'حفلات واحتفالات', labelEn: 'Parties', icon: PartyPopper },
  { id: 'special occasions', labelAr: 'مناسبات خاصة', labelEn: 'Special Occasions', icon: Gem },
  { id: 'romantic dates', labelAr: 'لقاءات رومانسية', labelEn: 'Romantic Dates', icon: Heart },
  { id: 'formal events', labelAr: 'مناسبات رسمية', labelEn: 'Formal Events', icon: Award },
  { id: 'daily use', labelAr: 'استخدام يومي', labelEn: 'Daily Use', icon: Clock },
];

const initialProductState = {
  name: '',
  shortDescription: '',
  description: '',
  gender: 'MEN',
  notes: {
    top: [],
    heart: [],
    base: []
  },
  longevityHours: '',
  sillageHours: '',
  occasions: [],
  variants: [
    { size: '30ml', price: 850, compareAtPrice: 1100, oldPrice: 1100 },
    { size: '50ml', price: 1450, compareAtPrice: 1800, oldPrice: 1800 },
    { size: '100ml', price: 2200, compareAtPrice: 2800, oldPrice: 2800 }
  ],
  mainImage: { url: '', publicId: '', alt: '' },
  hoverImage: { url: '', publicId: '', alt: '' },
  pyramidImage: { url: '', publicId: '', alt: '' },
  packagingImage: { url: '', publicId: '', alt: '' },
  featured: false,
  preOrder: { enabled: false, expectedDate: '', noteAr: '', noteEn: '' },
  active: true
};

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialProductState);
  const [submitting, setSubmitting] = useState(false);
  
  // Notes helpers
  const [topNotesStr, setTopNotesStr] = useState('');
  const [heartNotesStr, setHeartNotesStr] = useState('');
  const [baseNotesStr, setBaseNotesStr] = useState('');
  // English version of the content
  const [en, setEn] = useState({ name: '', shortDescription: '', description: '', top: '', heart: '', base: '' });

  // Image Uploading State map for 4 roles
  const [uploadingRole, setUploadingRole] = useState(null);

  const fetchProductsList = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsList();
    if (searchParams.get('action') === 'new') {
      handleOpenNew();
    }
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(initialProductState);
    setEn({ name: '', shortDescription: '', description: '', top: '', heart: '', base: '' });
    setTopNotesStr('البرغموت, الفلفل الوردي, الزعفران');
    setHeartNotesStr('الورد الجوري, الياسمين, القهوة');
    setBaseNotesStr('العود الملكي, العنبر الداكن, الفانيليا, المسك');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingId(product._id);
    
    // Map variants ensuring 30ml, 50ml, 100ml
    const vMap = {};
    (product.variants || []).forEach(v => {
      if (v && v.size) vMap[v.size.toLowerCase()] = v;
    });

    const normalizedVariants = FIXED_SIZES.map(s => {
      const ext = vMap[s.toLowerCase()] || {};
      const curPrice = ext.price || ext.sellingPrice || 0;
      const oldPr = ext.compareAtPrice !== undefined ? ext.compareAtPrice : (ext.oldPrice !== undefined ? ext.oldPrice : '');
      return {
        size: s,
        price: curPrice,
        compareAtPrice: oldPr,
        oldPrice: oldPr
      };
    });

    // Extract images by explicit role
    const getRoleImg = (roleName) => {
      if (product[roleName] && product[roleName].url) {
        return { url: product[roleName].url, publicId: product[roleName].publicId || '', alt: product[roleName].alt || '' };
      }
      const foundInArr = (product.images || []).find(i => i.role === roleName || (roleName === 'mainImage' && i.role === 'main') || (roleName === 'hoverImage' && i.role === 'hover') || (roleName === 'pyramidImage' && i.role === 'pyramid') || (roleName === 'packagingImage' && i.role === 'packaging'));
      if (foundInArr) {
        return { url: foundInArr.url, publicId: foundInArr.publicId || '', alt: foundInArr.alt || '' };
      }
      return { url: '', publicId: '', alt: '' };
    };

    setFormData({
      name: product.name || '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      gender: (product.gender || 'MEN').toUpperCase() === 'WOMEN' ? 'WOMEN' : 'MEN',
      notes: product.notes || { top: [], heart: [], base: [] },
      variants: normalizedVariants,
      mainImage: getRoleImg('mainImage'),
      hoverImage: getRoleImg('hoverImage'),
      pyramidImage: getRoleImg('pyramidImage'),
      packagingImage: getRoleImg('packagingImage'),
      longevityHours: product.longevityHours !== undefined && product.longevityHours !== null ? product.longevityHours : '',
      sillageHours: product.sillageHours !== undefined && product.sillageHours !== null ? product.sillageHours : '',
      occasions: Array.isArray(product.occasions) ? product.occasions : [],
      featured: !!product.featured,
      preOrder: {
        enabled: !!product.preOrder?.enabled,
        expectedDate: product.preOrder?.expectedDate ? String(product.preOrder.expectedDate).slice(0, 10) : '',
        noteAr: product.preOrder?.noteAr || '',
        noteEn: product.preOrder?.noteEn || ''
      },
      active: product.active !== undefined ? product.active : true
    });

    const tEn = product.translations?.en || {};
    setEn({
      name: tEn.name || '',
      shortDescription: tEn.shortDescription || '',
      description: tEn.description || '',
      top: (tEn.notes?.top || []).join(', '),
      heart: (tEn.notes?.heart || []).join(', '),
      base: (tEn.notes?.base || []).join(', '),
    });
    setTopNotesStr((product.notes?.top || []).join(', '));
    setHeartNotesStr((product.notes?.heart || []).join(', '));
    setBaseNotesStr((product.notes?.base || []).join(', '));
    setIsModalOpen(true);
  };

  const handleSingleImageUpload = async (e, roleKey) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRole(roleKey);
    try {
      const res = await uploadImageToCloudinary(file, 'm20/products');
      const url = res?.secure_url || res?.url;
      const publicId = res?.public_id || res?.publicId || '';
      if (!url) {
        throw new Error('لم يتم استلام رابط الصورة من Cloudinary.');
      }
      
      setFormData(prev => ({
        ...prev,
        [roleKey]: {
          url,
          publicId,
          alt: `${prev.name || 'عطر'} - ${roleKey}`
        }
      }));
      showToast('تم رفع الصورة إلى Cloudinary بنجاح');
    } catch (err) {
      console.error('Image upload failed:', err);
      showError(
        'فشل رفع الصورة',
        err.response?.data?.message || err.message || 'تعذر رفع الصورة إلى Cloudinary. يرجى المحاولة مرة أخرى.'
      );
    } finally {
      setUploadingRole(null);
      e.target.value = '';
    }
  };

  const handleImageUrlChange = (roleKey, urlVal) => {
    setFormData(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        url: urlVal.trim()
      }
    }));
  };

  const handleRemoveImage = (roleKey) => {
    setFormData(prev => ({
      ...prev,
      [roleKey]: { url: '', publicId: '', alt: '' }
    }));
  };

  const handleVariantPriceChange = (sizeName, field, value) => {
    setFormData(prev => {
      const updated = prev.variants.map(v => {
        if (v.size === sizeName) {
          const numVal = value === '' ? '' : Math.max(0, Number(value));
          if (field === 'price') {
            return { ...v, price: numVal };
          }
          if (field === 'compareAtPrice' || field === 'oldPrice') {
            return { ...v, compareAtPrice: numVal, oldPrice: numVal };
          }
        }
        return v;
      });
      return { ...prev, variants: updated };
    });
  };

  const toggleOccasion = (occId) => {
    setFormData(prev => {
      const cur = prev.occasions || [];
      const updated = cur.includes(occId) ? cur.filter(x => x !== occId) : [...cur, occId];
      return { ...prev, occasions: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('بيانات ناقصة', 'يرجى إدخال اسم العطر');
      return;
    }

    if (!formData.mainImage?.url) {
      showError('صورة ناقصة', 'يرجى تحديد الصورة الرئيسية للمنتج (Main Image)');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      shortDescription: formData.shortDescription.trim(),
      description: formData.description.trim() || formData.shortDescription.trim(),
      gender: formData.gender,
      notes: {
        top: topNotesStr.split(',').map(s => s.trim()).filter(Boolean),
        heart: heartNotesStr.split(',').map(s => s.trim()).filter(Boolean),
        base: baseNotesStr.split(',').map(s => s.trim()).filter(Boolean)
      },
      translations: {
        en: {
          name: en.name.trim(),
          shortDescription: en.shortDescription.trim(),
          description: en.description.trim(),
          notes: { top: en.top, heart: en.heart, base: en.base }
        }
      },
      longevityHours: formData.longevityHours !== '' && formData.longevityHours !== null ? Number(formData.longevityHours) : null,
      sillageHours: formData.sillageHours !== '' && formData.sillageHours !== null ? Number(formData.sillageHours) : null,
      occasions: formData.occasions || [],
      variants: formData.variants.map(v => ({
        size: v.size,
        price: Number(v.price) || 0,
        compareAtPrice: v.compareAtPrice && Number(v.compareAtPrice) > 0 ? Number(v.compareAtPrice) : null,
        oldPrice: v.compareAtPrice && Number(v.compareAtPrice) > 0 ? Number(v.compareAtPrice) : null,
        stock: 999
      })),
      mainImage: formData.mainImage,
      hoverImage: formData.hoverImage,
      pyramidImage: formData.pyramidImage,
      packagingImage: formData.packagingImage,
      featured: formData.featured,
      preOrder: {
        enabled: !!formData.preOrder?.enabled,
        expectedDate: formData.preOrder?.expectedDate || null,
        noteAr: (formData.preOrder?.noteAr || '').trim(),
        noteEn: (formData.preOrder?.noteEn || '').trim()
      },
      active: formData.active
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        showSuccess('تم التحديث بنجاح', 'تم تحديث بيانات العطر والأسعار والصور بنجاح');
      } else {
        await createProduct(payload);
        showSuccess('تمت الإضافة بنجاح', 'تم تسجيل العطر الفاخر الجديد بنجاح');
      }

      setIsModalOpen(false);
      fetchProductsList();
    } catch (err) {
      showError('خطأ أثناء الحفظ', err.response?.data?.message || 'تعذر حفظ العطر');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = await showConfirm(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف عطر "${product.name}" نهائياً من المتجر؟`,
      'نعم، احذف',
      'إلغاء'
    );
    if (!confirmed) return;

    try {
      await deleteProduct(product._id);
      showToast('تم حذف العطر بنجاح');
      fetchProductsList();
    } catch (err) {
      showError('تعذر الحذف', err.response?.data?.message || 'تعذر حذف العطر');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (p.shortDescription || '').toLowerCase().includes(search.toLowerCase());
    const g = (p.gender || 'MEN').toUpperCase();
    const matchGender = filterGender === 'ALL' || g === filterGender;
    return matchSearch && matchGender;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-semibold text-ink leading-tight">
                كتالوج العطور والمنتجات التامة (Products)
              </h1>
              <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
                إدارة العطور الفاخرة، الأحجام الثابتة (30ml / 50ml / 100ml)، الأسعار المشطوبة، والصور الـ 4 المخصصة.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={16} />
            <span>إضافة عطر جديد</span>
          </button>

          <button
            onClick={fetchProductsList}
            className="p-2.5 rounded-card border border-line bg-surface hover:bg-canvas text-ink-2 transition-colors shadow-card"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.7} className={loading ? 'animate-spin text-brand-700' : ''} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface p-3.5 rounded-card border border-line shadow-card">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute right-3.5 top-3 text-ink-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الوصف..."
            className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full pr-9 pl-3"
          />
        </div>

        {/* Gender Filter Toggle */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto bg-canvas p-1 rounded-control">
          <button
            onClick={() => setFilterGender('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterGender === 'ALL' ? 'bg-surface text-brand-700 shadow-2xs' : 'text-ink-2 hover:text-ink'
            }`}
          >
            الكل ({products.length})
          </button>
          <button
            onClick={() => setFilterGender('MEN')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterGender === 'MEN' ? 'bg-brand-700 text-white shadow-2xs' : 'text-ink-2 hover:text-ink'
            }`}
          >
            رجالي (MEN)
          </button>
          <button
            onClick={() => setFilterGender('WOMEN')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterGender === 'WOMEN' ? 'bg-danger text-white shadow-2xs' : 'text-ink-2 hover:text-ink'
            }`}
          >
            نسائي (WOMEN)
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-ink-3 bg-surface rounded-card border border-line shadow-card">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold text-xs">جاري تحميل كتالوج العطور...</span>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-ink-3 bg-surface rounded-card border border-line p-6 shadow-card">
            <Package size={36} className="mx-auto text-ink-3 mb-2" strokeWidth={1.5} />
            <p className="font-semibold text-ink-2 text-sm">لا توجد عطور مطابقة للبحث</p>
            <p className="text-xs text-ink-3 mt-1">اضغط على "إضافة عطر جديد" لإضافة عطر بالصور والأسعار المحدثة.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isMen = (product.gender || 'MEN').toUpperCase() === 'MEN';
            const mainImg = product.mainImage?.url || product.images?.find(i => i.role === 'main')?.url || product.images?.[0]?.url || '/img/product.png';
            const hoverImg = product.hoverImage?.url || product.images?.find(i => i.role === 'hover')?.url || '/img/Story.png';
            const pyramidImg = product.pyramidImage?.url || product.images?.find(i => i.role === 'pyramid')?.url;
            const packagingImg = product.packagingImage?.url || product.images?.find(i => i.role === 'packaging')?.url;

            return (
              <div key={product._id} className="bg-surface rounded-card border border-line shadow-card hover:shadow-card transition-all duration-200 flex flex-col justify-between overflow-hidden group">
                <div>
                  {/* Top Image Box with Hover Transition */}
                  <div className="relative aspect-4/3 bg-photo overflow-hidden">
                    <img
                      src={mainImg}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/img/product.png'; }}
                    />
                    {hoverImg && (
                      <img
                        src={hoverImg}
                        alt={`${product.name} hover`}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    )}

                    {/* Gender Badge */}
                    <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                      isMen ? 'bg-brand-700 text-white' : 'bg-danger text-white'
                    }`}>
                      {isMen ? 'MEN • رجالي' : 'WOMEN • نسائي'}
                    </span>

                    {/* Image Roles Indicator Dots */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full text-xs text-white">
                      <span>4 صور</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-success" title="Main Image" />
                      {hoverImg && <div className="w-1.5 h-1.5 rounded-full bg-info" title="Hover Image" />}
                      {pyramidImg && <div className="w-1.5 h-1.5 rounded-full bg-warning" title="Pyramid Image" />}
                      {packagingImg && <div className="w-1.5 h-1.5 rounded-full bg-info" title="Packaging Image" />}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-sm text-brand-700 line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-ink-2 font-light mt-0.5 line-clamp-2 leading-relaxed">
                        {product.shortDescription || product.description || 'عطر فاخر مصنوع بتركيز استثنائي.'}
                      </p>
                    </div>

                    {/* Olfactory Notes Preview */}
                    {product.notes && (product.notes.top?.length > 0 || product.notes.heart?.length > 0 || product.notes.base?.length > 0) && (
                      <div className="p-2.5 bg-canvas rounded-control border border-line space-y-1 text-xs">
                        {product.notes.top?.length > 0 && (
                          <div className="flex items-center gap-1 text-ink-2 truncate">
                            <span className="font-semibold text-brand-700 shrink-0">القمة:</span>
                            <span className="truncate">{product.notes.top.join(', ')}</span>
                          </div>
                        )}
                        {product.notes.heart?.length > 0 && (
                          <div className="flex items-center gap-1 text-ink-2 truncate">
                            <span className="font-semibold text-brand-700 shrink-0">القلب:</span>
                            <span className="truncate">{product.notes.heart.join(', ')}</span>
                          </div>
                        )}
                        {product.notes.base?.length > 0 && (
                          <div className="flex items-center gap-1 text-ink-2 truncate">
                            <span className="font-semibold text-brand-700 shrink-0">القاعدة:</span>
                            <span className="truncate">{product.notes.base.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Performance & Occasions Preview */}
                    {(product.longevityHours || product.sillageHours || product.occasions?.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                        {product.longevityHours && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-control bg-warning-50 text-warning border border-warning/80 font-semibold">
                            <Clock size={11} className="text-warning" />
                            <span>ثبات {product.longevityHours} س</span>
                          </span>
                        )}
                        {product.sillageHours && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-control bg-info-50 text-info border border-info/80 font-semibold">
                            <Wind size={11} className="text-info" />
                            <span>فوحان {product.sillageHours} س</span>
                          </span>
                        )}
                        {product.occasions?.slice(0, 2).map((occId) => {
                          const found = OCCASIONS_LIST.find(o => o.id === occId);
                          return found ? (
                            <span key={occId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-control bg-canvas text-ink-2 font-medium">
                              {found.labelAr}
                            </span>
                          ) : null;
                        })}
                        {product.occasions?.length > 2 && (
                          <span className="text-ink-3 font-mono font-semibold">+{product.occasions.length - 2}</span>
                        )}
                      </div>
                    )}

                    {/* Sizes & Prices Matrix */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {FIXED_SIZES.map(sz => {
                        const variant = (product.variants || []).find(v => v.size?.toLowerCase() === sz.toLowerCase()) || {};
                        const price = variant.price || 0;
                        const oldPrice = variant.compareAtPrice || variant.oldPrice;

                        return (
                          <div key={sz} className="p-2 bg-surface rounded-card border border-line text-center shadow-card">
                            <span className="font-semibold text-xs text-brand-700 block">{sz}</span>
                            {oldPrice && oldPrice > price && (
                              <span className="text-xs text-ink-3 line-through block -mt-0.5">
                                {oldPrice} ج.م
                              </span>
                            )}
                            <span className="text-xs font-semibold text-ink font-mono block">
                              {price} ج.م
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-canvas/80 border-t border-line flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-2">
                    {product.active !== false ? '🟢 معروض بالمتجر' : '⚪ مخفي'}
                    {product.preOrder?.enabled && <span className="mr-2 text-warning">⏳ طلب مسبق</span>}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                    >
                      <Edit3 size={13} className="text-brand-700" />
                      <span>تعديل العطر</span>
                    </button>

                    <button
                      onClick={() => handleDelete(product)}
                      className="p-1.5 rounded-control text-ink-3 hover:text-danger hover:bg-danger-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Product Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-surface rounded-card border border-line shadow-pop z-10 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line bg-canvas flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-control bg-brand-700/10 text-brand-700 flex items-center justify-center">
                  <Package size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-brand-700">
                    {editingId ? `تعديل العطر: ${formData.name}` : 'إضافة عطر فاخر جديد'}
                  </h2>
                  <p className="text-xs text-ink-3">إدارة تفاصيل العطر، النوتات، الأحجام الثابتة، والصور الـ 4</p>
                </div>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-ink-3 hover:text-ink-2 rounded-control">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs overflow-y-auto flex-1">
              {/* Section 1: Basic Info */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Product Name */}
                  <div className="sm:col-span-8">
                    <label className="block font-semibold text-ink-2 mb-1">اسم العطر الفاخر (Product Name) *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: M20 Signature Noir"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-10 text-sm w-full"
                    />
                  </div>

                  {/* Gender Selector (MEN / WOMEN) */}
                  <div className="sm:col-span-4">
                    <label className="block font-semibold text-ink-2 mb-1">القسم / الجنس (Gender) *</label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-canvas rounded-control h-10">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'MEN' })}
                        className={`h-full text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                          formData.gender === 'MEN' ? 'bg-brand-700 text-white shadow-xs' : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        MEN (رجالي)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'WOMEN' })}
                        className={`h-full text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                          formData.gender === 'WOMEN' ? 'bg-danger text-white shadow-xs' : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        WOMEN (نسائي)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Short Description */}
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">الوصف المختصر (Short Description)</label>
                  <textarea
                    rows="2"
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    placeholder="وصف تسويقي جذاب يظهر على كروت المنتجات وتفاصيل العطر..."
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              {/* Section 2: Fragrance Notes */}
              <div className="p-4 bg-canvas border border-line rounded-card space-y-3">
                <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                  <Sparkles size={15} />
                  <span>الهرم العطري والنوتات (Fragrance Notes)</span>
                </span>
                <p className="text-xs text-ink-3 font-medium">اكتب النوتات مفصولة بفواصل (مثال: البرغموت, الفلفل الوردي)</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">1. مقدمة العطر (Top Notes)</label>
                    <input
                      type="text"
                      value={topNotesStr}
                      onChange={(e) => setTopNotesStr(e.target.value)}
                      placeholder="البرغموت, الفلفل الوردي"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">2. قلب العطر (Heart Notes)</label>
                    <input
                      type="text"
                      value={heartNotesStr}
                      onChange={(e) => setHeartNotesStr(e.target.value)}
                      placeholder="الياسمين, الورد الجوري"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">3. قاعدة العطر (Base Notes)</label>
                    <input
                      type="text"
                      value={baseNotesStr}
                      onChange={(e) => setBaseNotesStr(e.target.value)}
                      placeholder="العود, العنبر, المسك"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2.2: English version (shown when the website is in English) */}
              <div className="p-4 bg-canvas border border-line rounded-card space-y-3" dir="ltr">
                <span className="font-semibold text-brand-700 text-xs block">
                  English version — shown when the visitor switches the site to English
                </span>
                <p className="text-xs text-ink-3">
                  The fields above are the Arabic version. Leave a field empty to fall back to the Arabic text.
                </p>
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">Product name (English)</label>
                  <input type="text" value={en.name} onChange={(e) => setEn({ ...en, name: e.target.value })} placeholder="NIGHT" className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
                </div>
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">Short description (English)</label>
                  <textarea rows="2" value={en.shortDescription} onChange={(e) => setEn({ ...en, shortDescription: e.target.value })} placeholder="A warm, dark evening scent opening with red ginger and cardamom..." className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
                </div>
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">Full description (English)</label>
                  <textarea rows="3" value={en.description} onChange={(e) => setEn({ ...en, description: e.target.value })} className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">Top notes</label>
                    <input type="text" value={en.top} onChange={(e) => setEn({ ...en, top: e.target.value })} placeholder="Red ginger, Cardamom" className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">Heart notes</label>
                    <input type="text" value={en.heart} onChange={(e) => setEn({ ...en, heart: e.target.value })} placeholder="Coffee, Caramel" className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">Base notes</label>
                    <input type="text" value={en.base} onChange={(e) => setEn({ ...en, base: e.target.value })} placeholder="Vanilla, Amber" className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
                  </div>
                </div>
              </div>

              {/* Section 2.5: Perfume Performance & Occasions (الثبات، الفوحان، وقائمة المناسبات) */}
              <div className="p-4 bg-surface border border-line rounded-card space-y-4 shadow-card">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <Timer size={15} />
                    <span>أداء العطر والمناسبات الموصى بها (Performance & Occasions)</span>
                  </span>
                  <span className="text-xs text-ink-3 font-medium">حقول اختيارية لتعزيز تجربة العميل</span>
                </div>

                {/* Longevity & Sillage Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-canvas border border-line rounded-control space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                      <Clock size={13} className="text-brand-700" />
                      <span>مدة الثبات بالساعات (Longevity)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.longevityHours}
                        onChange={(e) => setFormData({ ...formData, longevityHours: e.target.value })}
                        placeholder="مثال: 8 أو 12"
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                      <span className="text-xs font-semibold text-ink-2 shrink-0">ساعات</span>
                    </div>
                  </div>

                  <div className="p-3 bg-canvas border border-line rounded-control space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                      <Wind size={13} className="text-brand-700" />
                      <span>مدة الفوحان بالساعات (Sillage)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.sillageHours}
                        onChange={(e) => setFormData({ ...formData, sillageHours: e.target.value })}
                        placeholder="مثال: 4 أو 6"
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                      <span className="text-xs font-semibold text-ink-2 shrink-0">ساعات</span>
                    </div>
                  </div>
                </div>

                {/* Occasions Multi-Select */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold text-ink-2">
                    قائمة المناسبات المناسبة (اختر مناسبة أو أكثر):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {OCCASIONS_LIST.map((occ) => {
                      const IconComp = occ.icon;
                      const isSelected = (formData.occasions || []).includes(occ.id);
                      return (
                        <button
                          key={occ.id}
                          type="button"
                          onClick={() => toggleOccasion(occ.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-700 text-white border-brand-700 shadow-sm scale-[1.02]'
                              : 'bg-canvas text-ink-2 border-line hover:border-line hover:bg-canvas'
                          }`}
                        >
                          <IconComp size={16} strokeWidth={isSelected ? 2 : 1.5} />
                          <span className="text-xs">{occ.labelAr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Visibility & Pre-order */}
              <div className="p-4 bg-surface border border-line rounded-card space-y-3 shadow-card">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <Clock size={15} />
                    <span>الظهور والطلب المسبق (Visibility & Pre-order)</span>
                  </span>
                </div>

                <label className="flex items-center justify-between gap-3 p-3 bg-canvas border border-line rounded-control cursor-pointer">
                  <span className="text-xs font-semibold text-ink-2">معروض بالمتجر (إيقاف = إخفاء المنتج مؤقتاً)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-brand-700"
                    checked={formData.active !== false}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 bg-warning-50 border border-warning/20 rounded-control cursor-pointer">
                  <span className="text-xs font-semibold text-warning">تفعيل "طلب مسبق" (Pre-order) لهذا المنتج</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-amber-600"
                    checked={!!formData.preOrder?.enabled}
                    onChange={(e) => setFormData({ ...formData, preOrder: { ...formData.preOrder, enabled: e.target.checked } })}
                  />
                </label>

                {formData.preOrder?.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-ink-2">تاريخ التوفر المتوقع</label>
                      <input
                        type="date"
                        value={formData.preOrder?.expectedDate || ''}
                        onChange={(e) => setFormData({ ...formData, preOrder: { ...formData.preOrder, expectedDate: e.target.value } })}
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-ink-2">ملاحظة للعميل (عربي)</label>
                      <input
                        type="text"
                        value={formData.preOrder?.noteAr || ''}
                        onChange={(e) => setFormData({ ...formData, preOrder: { ...formData.preOrder, noteAr: e.target.value } })}
                        placeholder="يُشحن خلال ١٠ أيام من تاريخ الطلب"
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-ink-2">Customer note (English)</label>
                      <input
                        type="text"
                        value={formData.preOrder?.noteEn || ''}
                        onChange={(e) => setFormData({ ...formData, preOrder: { ...formData.preOrder, noteEn: e.target.value } })}
                        placeholder="Ships within 10 days of ordering"
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Sizes & Pricing (Fixed 30ml, 50ml, 100ml) */}
              <div className="p-4 bg-surface border border-line rounded-card space-y-3 shadow-card">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <Tag size={15} />
                    <span>الأسعار والأحجام الثابتة (30ml / 50ml / 100ml)</span>
                  </span>
                  <span className="text-xs text-ink-3 font-medium">كوبونات الخصم تُطبق دائماً على سعر البيع الفعلي</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {FIXED_SIZES.map(sz => {
                    const variant = formData.variants.find(v => v.size === sz) || { price: 0, compareAtPrice: '' };
                    return (
                      <div key={sz} className="p-3.5 bg-canvas border border-line rounded-card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-brand-700">{sz}</span>
                          <span className="text-xs bg-surface px-2 py-0.5 rounded-control border border-line text-ink-2 font-mono font-semibold">
                            ثابت
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-ink-2 mb-1">سعر البيع الفعلي (ج.م) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={variant.price}
                            onChange={(e) => handleVariantPriceChange(sz, 'price', e.target.value)}
                            placeholder="400"
                            className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-ink-3 mb-1">السعر المشطوب / العرض (اختياري)</label>
                          <input
                            type="number"
                            min="0"
                            value={variant.compareAtPrice || ''}
                            onChange={(e) => handleVariantPriceChange(sz, 'compareAtPrice', e.target.value)}
                            placeholder="مثال: 500"
                            className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Exactly 4 Defined Image Inputs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-line">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <ImageIcon size={15} />
                    <span>صور العطر الأربعة المخصصة (4 Defined Product Images)</span>
                  </span>
                  <span className="text-xs text-ink-3">كل صورة مخصصة لموضع محدد بالمتجر</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slot 1: Main Product Image */}
                  <div className="p-3.5 bg-canvas/70 border border-line rounded-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-brand-700 flex items-center gap-1">
                        <span>1. الصورة الرئيسية (Main Image) *</span>
                      </span>
                      <span className="text-xs bg-success-50 text-success font-semibold px-2 py-0.5 rounded-control">
                        الافتراضية
                      </span>
                    </div>
                    <p className="text-xs text-ink-3">زجاجة العطر النقية في الكتالوج وكروت المنتجات</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-control bg-surface border border-line p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.mainImage?.url ? (
                          <img src={formData.mainImage.url} alt="Main Preview" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon size={20} className="text-ink-3" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-surface border border-line hover:bg-canvas text-brand-700 rounded-control text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-card">
                              {uploadingRole === 'mainImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'mainImage')}
                            />
                          </label>

                          {formData.mainImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('mainImage')}
                              className="p-1.5 rounded-control text-ink-3 hover:text-danger hover:bg-danger-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.mainImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('mainImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر هنا..."
                          className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slot 2: Hover Image */}
                  <div className="p-3.5 bg-canvas/70 border border-line rounded-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-brand-700">
                        2. صورة التفاعل (Hover Image)
                      </span>
                      <span className="text-xs bg-info-50 text-info font-semibold px-2 py-0.5 rounded-control">
                        عند المرور
                      </span>
                    </div>
                    <p className="text-xs text-ink-3">تظهر بسلاسة عند تمرير الماوس فوق كارت العطر</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-control bg-surface border border-line p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.hoverImage?.url ? (
                          <img src={formData.hoverImage.url} alt="Hover Preview" className="w-full h-full object-contain" />
                        ) : (
                          <Sparkles size={20} className="text-ink-3" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-surface border border-line hover:bg-canvas text-brand-700 rounded-control text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-card">
                              {uploadingRole === 'hoverImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'hoverImage')}
                            />
                          </label>

                          {formData.hoverImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('hoverImage')}
                              className="p-1.5 rounded-control text-ink-3 hover:text-danger hover:bg-danger-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.hoverImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('hoverImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر..."
                          className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slot 3: Fragrance Pyramid Image */}
                  <div className="p-3.5 bg-canvas/70 border border-line rounded-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-brand-700">
                        3. صورة الهرم العطري (Pyramid Image)
                      </span>
                      <span className="text-xs bg-warning-50 text-warning font-semibold px-2 py-0.5 rounded-control">
                        تفاصيل النوتات
                      </span>
                    </div>
                    <p className="text-xs text-ink-3">تظهر في معرض صور العطر لشرح المكونات</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-control bg-surface border border-line p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.pyramidImage?.url ? (
                          <img src={formData.pyramidImage.url} alt="Pyramid Preview" className="w-full h-full object-contain" />
                        ) : (
                          <Layers size={20} className="text-ink-3" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-surface border border-line hover:bg-canvas text-brand-700 rounded-control text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-card">
                              {uploadingRole === 'pyramidImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'pyramidImage')}
                            />
                          </label>

                          {formData.pyramidImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('pyramidImage')}
                              className="p-1.5 rounded-control text-ink-3 hover:text-danger hover:bg-danger-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.pyramidImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('pyramidImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر..."
                          className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slot 4: Packaging Image */}
                  <div className="p-3.5 bg-canvas/70 border border-line rounded-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-brand-700">
                        4. صورة التغليف الفاخر (Packaging Image)
                      </span>
                      <span className="text-xs bg-info-50 text-info font-semibold px-2 py-0.5 rounded-control">
                        الباكيدج
                      </span>
                    </div>
                    <p className="text-xs text-ink-3">تظهر في المعرض لعرض العلبة الفاخرة والكيس</p>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-control bg-surface border border-line p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.packagingImage?.url ? (
                          <img src={formData.packagingImage.url} alt="Packaging Preview" className="w-full h-full object-contain" />
                        ) : (
                          <Box size={20} className="text-ink-3" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <label className="flex-1 cursor-pointer">
                            <span className="w-full h-8 bg-surface border border-line hover:bg-canvas text-brand-700 rounded-control text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-card">
                              {uploadingRole === 'packagingImage' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                              <span>رفع صورة من الجهاز</span>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSingleImageUpload(e, 'packagingImage')}
                            />
                          </label>

                          {formData.packagingImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleRemoveImage('packagingImage')}
                              className="p-1.5 rounded-control text-ink-3 hover:text-danger hover:bg-danger-50"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={formData.packagingImage?.url || ''}
                          onChange={(e) => handleImageUrlChange('packagingImage', e.target.value)}
                          placeholder="أو ضع رابط الصورة المباشر..."
                          className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-line flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {submitting ? 'جاري الحفظ...' : editingId ? 'تحديث العطر' : 'حفظ ونشر العطر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

