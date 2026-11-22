import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Save, 
  Check, 
  Upload, 
  Trash2, 
  Sliders, 
  Sparkles, 
  PhoneCall, 
  BellRing, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  MapPin, 
  Layers, 
  DollarSign,
  Activity,
  Eye,
  EyeOff,
  Target,
  Power
} from 'lucide-react';
import { uploadImageToCloudinary, getAdminSettings, updateSettings } from '../services/api';
import { EGYPT_GOVERNORATES, TIER_DESCRIPTIONS } from '../data/egyptGovernorates';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showWarning, showError, showToast } from '../utils/swal';

export default function CMSPage() {
  const { lang, isRTL, formatCurrency } = useLanguage();
  const [activeTab, setActiveTab] = useState('shipping'); // 'shipping' | 'banners' | 'contact'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Slides
  const [slides, setSlides] = useState([]);

  // Announcement
  const [announcement, setAnnouncement] = useState({
    text: 'شحن مجاني للطلبات المؤهلة | عينات مجانية مع كل طلب',
    active: true
  });

  // Contact
  const [contact, setContact] = useState({
    whatsapp: '201132687324',
    instagram: 'https://instagram.com/m20.perfumes',
    facebook: 'https://facebook.com/m20.perfumes.eg',
    tiktok: 'https://tiktok.com/@m20.perfumes',
    phone: '01132687324'
  });

  // Shipping Rates (27 Governorates - Origin: Giza - Strict Whole Integers)
  const [shippingRates, setShippingRates] = useState(() => {
    const initial = {};
    EGYPT_GOVERNORATES.forEach((gov) => {
      initial[gov.nameEn] = gov.defaultRate;
    });
    return initial;
  });

  const [metroPickupFee, setMetroPickupFee] = useState(0);
  // Real carrier cost per governorate (blank = use the default real cost), warn threshold, per-order overhead
  const [realCosts, setRealCosts] = useState({});
  const [defaultRealCost, setDefaultRealCost] = useState(50);
  const [costWarnPercent, setCostWarnPercent] = useState(30);
  const COST_COLS = [
    { k: 'bottle', ar: 'زجاجة', en: 'Bottle' },
    { k: 'oil', ar: 'زيت', en: 'Oil' },
    { k: 'alcohol', ar: 'كحول', en: 'Alcohol' },
    { k: 'rawShipping', ar: 'شحن خامات', en: 'Raw ship.' },
    { k: 'box', ar: 'علبة', en: 'Box' },
    { k: 'card', ar: 'كارت', en: 'Card' },
    { k: 'marketing', ar: 'تسويق/ديزاين', en: 'Mktg/Design' }
  ];
  const [costTable, setCostTable] = useState({
    '30ml': { bottle: 45, oil: 35, alcohol: 10, rawShipping: 10, box: 45, card: 5, marketing: 25 },
    '50ml': { bottle: 55, oil: 55, alcohol: 10, rawShipping: 10, box: 45, card: 5, marketing: 25 },
    '100ml': { bottle: 60, oil: 100, alcohol: 20, rawShipping: 10, box: 45, card: 5, marketing: 25 }
  });
  const [orderCosts, setOrderCosts] = useState({ operatingPerOrder: 0, operatingPercent: 0 });

  // Payment fees: gateway % is charged to the customer; wallet % is only an internal cost
  const [payFees, setPayFees] = useState({ fawaterk: 2.4, fawaterkEnabled: true, vodafoneCash: 0, instaPay: 0 });

  // Marketing Tracking & Pixels (Meta Pixel, CAPI, TikTok Pixel)
  const [tracking, setTracking] = useState({
    enableTracking: true,
    metaPixelId: '',
    metaCapiAccessToken: '',
    tiktokPixelId: ''
  });
  const [showCapiToken, setShowCapiToken] = useState(false);

  // Temporary store pause
  const [storeStatus, setStoreStatus] = useState({
    paused: false,
    messageAr: 'المتجر متوقف مؤقتاً لأعمال الصيانة، نعود قريباً.',
    messageEn: 'The store is temporarily paused for maintenance. We will be back soon.',
    resumeAt: ''
  });

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getAdminSettings();
        if (data) {
          if (Array.isArray(data.heroSlides)) {
            setSlides(data.heroSlides);
          }
          if (data.payments) {
            setPayFees({
              fawaterk: Number(data.payments.fawaterk?.feePercent ?? 2.4),
              fawaterkEnabled: data.payments.fawaterk?.enabled !== false,
              vodafoneCash: Number(data.payments.vodafoneCash?.feePercent ?? 0),
              instaPay: Number(data.payments.instaPay?.feePercent ?? 0)
            });
          }
          if (data.announcement) {
            setAnnouncement({
              text: data.announcement.text || 'شحن مجاني للطلبات المؤهلة | عينات مجانية مع كل طلب',
              active: data.announcement.active !== false
            });
          }
          if (data.socialMedia || data.whatsappNumber || data.supportPhone) {
            setContact({
              whatsapp: data.socialMedia?.whatsapp || data.whatsappNumber || '201132687324',
              phone: data.socialMedia?.phone || data.supportPhone || '01132687324',
              instagram: data.socialMedia?.instagram || 'https://instagram.com/m20.perfumes',
              facebook: data.socialMedia?.facebook || 'https://facebook.com/m20.perfumes.eg',
              tiktok: data.socialMedia?.tiktok || 'https://tiktok.com/@m20.perfumes'
            });
          }
          if (data.shipping) {
            if (data.shipping.metroPickupCustomerFee !== undefined) {
              setMetroPickupFee(Math.round(Number(data.shipping.metroPickupCustomerFee)));
            }
            if (data.shipping.defaultRealCost !== undefined) setDefaultRealCost(Math.round(Number(data.shipping.defaultRealCost)));
            if (data.shipping.costWarnPercent !== undefined) setCostWarnPercent(Number(data.shipping.costWarnPercent));
            if (data.shipping.realCostMap) {
              const rawReal = data.shipping.realCostMap;
              const loadedReal = {};
              EGYPT_GOVERNORATES.forEach((gov) => {
                const v = rawReal[gov.nameEn] ?? rawReal[gov.nameAr] ?? rawReal[gov.id];
                if (v !== undefined && v !== null) loadedReal[gov.nameEn] = Math.round(Number(v));
              });
              setRealCosts(loadedReal);
            }
            if (data.costTable) {
              const norm = {};
              Object.entries(data.costTable).forEach(([sz, r]) => { norm[sz] = { ...r, box: r.box ?? r.bag ?? 45 }; });
              setCostTable(norm);
            }
            if (data.orderCosts) {
              setOrderCosts({
                operatingPerOrder: Number(data.orderCosts.operatingPerOrder) || 0,
                operatingPercent: Number(data.orderCosts.operatingPercent) || 0
              });
            }
            if (data.shipping.governorateRates) {
              const loadedRates = {};
              const raw = data.shipping.governorateRates;
              EGYPT_GOVERNORATES.forEach((gov) => {
                let rate = gov.defaultRate;
                if (raw instanceof Map) {
                  if (raw.has(gov.nameEn)) rate = Math.round(Number(raw.get(gov.nameEn)));
                  else if (raw.has(gov.nameAr)) rate = Math.round(Number(raw.get(gov.nameAr)));
                } else if (typeof raw === 'object') {
                  if (raw[gov.nameEn] !== undefined) rate = Math.round(Number(raw[gov.nameEn]));
                  else if (raw[gov.nameAr] !== undefined) rate = Math.round(Number(raw[gov.nameAr]));
                }
                loadedRates[gov.nameEn] = rate;
              });
              setShippingRates(loadedRates);
            }
          }
          if (data.storeStatus) {
            setStoreStatus((prev) => ({
              paused: !!data.storeStatus.paused,
              messageAr: data.storeStatus.messageAr || prev.messageAr,
              messageEn: data.storeStatus.messageEn || prev.messageEn,
              resumeAt: data.storeStatus.resumeAt ? String(data.storeStatus.resumeAt).slice(0, 16) : ''
            }));
          }
          if (data.tracking) {
            setTracking({
              enableTracking: data.tracking.enableTracking !== false,
              metaPixelId: data.tracking.metaPixelId || '',
              metaCapiAccessToken: data.tracking.metaCapiAccessToken || '',
              tiktokPixelId: data.tracking.tiktokPixelId || ''
            });
          }
        }
      } catch (err) {
        console.warn('Could not load settings from server, using defaults:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleRateChange = (govEn, val) => {
    const intVal = val === '' ? 0 : Math.max(0, Math.round(Number(val)));
    setShippingRates((prev) => ({
      ...prev,
      [govEn]: intVal
    }));
  };

  const handleResetToTierDefaults = () => {
    const defaults = {};
    EGYPT_GOVERNORATES.forEach((gov) => {
      defaults[gov.nameEn] = gov.defaultRate;
    });
    setShippingRates(defaults);
    setMetroPickupFee(0);
    showToast(
      lang === 'ar'
        ? 'تمت استعادة أسعار الشحن الأصلية للمحافظات الـ 27 بنجاح'
        : 'Restored origin (Giza) 27 governorate default tier rates'
    );
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadImageToCloudinary(file, 'm20/banners');
      const imageUrl = res?.secure_url || res?.url;
      const publicId = res?.public_id || res?.publicId || '';
      if (!imageUrl) {
        throw new Error('لم يتم استلام رابط الصورة من Cloudinary.');
      }

      const newSlide = {
        id: Date.now(),
        image: imageUrl,
        publicId,
        alt: file.name ? `M20 Banner - ${file.name}` : 'M20 Banner',
        link: '/offers',
        active: true
      };
      setSlides(prev => [...prev, newSlide]);
      showToast(lang === 'ar' ? 'تم رفع البانر بنجاح' : 'Banner uploaded successfully');
    } catch (err) {
      console.error('CMS banner upload failed:', err);
      showError(
        lang === 'ar' ? 'فشل رفع الصورة' : 'Image Upload Failed',
        err.response?.data?.message || err.message || (lang === 'ar' ? 'تعذر رفع البانر.' : 'Could not upload banner.')
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeSlide = (id) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  const toggleSlide = (id) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const updateSlideLink = (id, link) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, link } : s));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

    try {
      // Map both English and Arabic keys with whole integer rates
      const ratesPayload = {};
      EGYPT_GOVERNORATES.forEach((gov) => {
        const rate = Math.round(Number(shippingRates[gov.nameEn] ?? gov.defaultRate));
        ratesPayload[gov.nameEn] = rate;
        ratesPayload[gov.nameAr] = rate;
        ratesPayload[gov.id] = rate;
      });
      ratesPayload['بور سعيد'] = Math.round(Number(shippingRates['Port Said'] ?? 80));

      const realPayload = {};
      EGYPT_GOVERNORATES.forEach((gov) => {
        const v = realCosts[gov.nameEn];
        if (v === undefined || v === '' || v === null) return;
        const n = Math.max(0, Math.round(Number(v)));
        realPayload[gov.nameEn] = n;
        realPayload[gov.nameAr] = n;
        realPayload[gov.id] = n;
      });

      const payload = {
        payments: {
          fawaterk: { enabled: payFees.fawaterkEnabled, feePercent: Math.max(0, Number(payFees.fawaterk) || 0), feeInitialized: true },
          vodafoneCash: { feePercent: Math.max(0, Number(payFees.vodafoneCash) || 0) },
          instaPay: { feePercent: Math.max(0, Number(payFees.instaPay) || 0) }
        },
        orderCosts,
        costTable,
        announcement,
        socialMedia: contact,
        heroSlides: slides,
        whatsappNumber: contact.whatsapp,
        supportPhone: contact.phone,
        shipping: {
          governorateRates: ratesPayload,
          realCostMap: realPayload,
          defaultRealCost: Math.round(Number(defaultRealCost) || 0),
          costWarnPercent: Number(costWarnPercent) || 0,
          metroPickupCustomerFee: Math.round(Number(metroPickupFee || 0)),
          defaultCustomerRate: 75
        },
        storeStatus: {
          paused: storeStatus.paused,
          messageAr: (storeStatus.messageAr || '').trim(),
          messageEn: (storeStatus.messageEn || '').trim(),
          resumeAt: storeStatus.resumeAt || null
        },
        tracking: {
          enableTracking: tracking.enableTracking,
          metaPixelId: (tracking.metaPixelId || '').trim(),
          metaCapiAccessToken: (tracking.metaCapiAccessToken || '').trim(),
          tiktokPixelId: (tracking.tiktokPixelId || '').trim()
        }
      };

      await updateSettings(payload);

      setSuccess(true);
      showSuccess(
        lang === 'ar' ? 'تم الحفظ بنجاح' : 'Settings Saved',
        lang === 'ar' ? 'تم تحديث أسعار الشحن وإعدادات المتجر وحفظها بقاعدة البيانات.' : 'Governorate shipping rates & store settings successfully updated.'
      );
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Settings save error:', err);
      showError(
        lang === 'ar' ? 'خطأ في الحفظ' : 'Save Error',
        err.response?.data?.message || (lang === 'ar' ? 'تعذر حفظ الإعدادات بقاعدة البيانات.' : 'Failed to save settings.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${isRTL ? "font-['Cairo',sans-serif] text-right" : "font-sans text-left"} pb-8`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>{lang === 'ar' ? 'إعدادات المتجر والشحن' : 'Storefront & Shipping Settings'}</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            {lang === 'ar'
              ? 'تكوين أسعار شحن المحافظات الـ 27 (انطلاق من الجيزة - أرقام صحيحة)، السلايدر الرئيسي، وبيانات التواصل.'
              : 'Configure 27 governorate shipping rates (origin: Giza - whole EGP integers only), banners, and contact channels.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs self-start sm:self-auto"
        >
          {success ? (
            <>
              <Check size={15} className="text-success" />
              <span>{lang === 'ar' ? 'تم الحفظ' : 'Saved'}</span>
            </>
          ) : (
            <>
              <Save size={15} />
              <span>{saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Settings')}</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('shipping')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'shipping'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <Truck size={14} />
          <span>{lang === 'ar' ? 'أسعار شحن المحافظات (27 محافظة)' : 'Governorate Shipping Rates (27)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'banners'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <Sparkles size={14} />
          <span>{lang === 'ar' ? 'السلايدر وشريط الإعلانات' : 'Banners & Announcements'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'contact'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <PhoneCall size={14} />
          <span>{lang === 'ar' ? 'بيانات التواصل وروابط المتجر' : 'Contact & Social'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'tracking'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <Activity size={14} />
          <span>{lang === 'ar' ? 'التتبع والإعلانات (Meta & TikTok)' : 'Ad Tracking & Pixels (Meta & TikTok)'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('storeStatus')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'storeStatus'
              ? 'border-brand-700 text-brand-700'
              : 'border-transparent text-ink-2 hover:text-ink'
          }`}
        >
          <Power size={14} />
          <span>{lang === 'ar' ? 'حالة المتجر (إيقاف مؤقت)' : 'Store Status (Pause)'}</span>
          {storeStatus.paused && <span className="w-2 h-2 rounded-full bg-danger" />}
        </button>
      </div>

      {/* TAB 5: TEMPORARY STORE PAUSE */}
      {activeTab === 'storeStatus' && (
        <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-5">
          <div className={`flex items-center justify-between gap-4 p-4 rounded-2xl border ${storeStatus.paused ? 'bg-danger-50 border-danger/20' : 'bg-success-50 border-success/20'}`}>
            <div>
              <h3 className={`text-sm font-extrabold ${storeStatus.paused ? 'text-danger' : 'text-success'}`}>
                {storeStatus.paused
                  ? (lang === 'ar' ? '⛔ المتجر متوقف حالياً' : '⛔ Store is paused')
                  : (lang === 'ar' ? '🟢 المتجر يعمل ويستقبل الطلبات' : '🟢 Store is live and taking orders')}
              </h3>
              <p className="text-xs text-ink-2 mt-1">
                {lang === 'ar'
                  ? 'عند الإيقاف تظهر للزوار صفحة "المتجر متوقف مؤقتاً" ولا يمكن إتمام أي طلب من الموقع. يمكنك إنشاء طلبات يدوياً من لوحة التحكم كالمعتاد.'
                  : 'While paused, visitors see a "temporarily paused" page and cannot place orders. You can still create manual orders from the dashboard.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStoreStatus({ ...storeStatus, paused: !storeStatus.paused })}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${storeStatus.paused ? 'bg-danger' : 'bg-success'}`}
              aria-label="toggle store pause"
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface shadow transition ${storeStatus.paused ? (isRTL ? '-translate-x-7' : 'translate-x-7') : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-2">{lang === 'ar' ? 'رسالة الإيقاف (عربي)' : 'Pause message (Arabic)'}</label>
              <textarea
                rows={3}
                value={storeStatus.messageAr}
                onChange={(e) => setStoreStatus({ ...storeStatus, messageAr: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-2">{lang === 'ar' ? 'رسالة الإيقاف (إنجليزي)' : 'Pause message (English)'}</label>
              <textarea
                rows={3}
                dir="ltr"
                value={storeStatus.messageEn}
                onChange={(e) => setStoreStatus({ ...storeStatus, messageEn: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-2">{lang === 'ar' ? 'موعد العودة المتوقع (اختياري، للعرض فقط)' : 'Expected return (optional, display only)'}</label>
              <input
                type="datetime-local"
                value={storeStatus.resumeAt}
                onChange={(e) => setStoreStatus({ ...storeStatus, resumeAt: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
              <p className="text-xs text-ink-3">{lang === 'ar' ? 'لا يعيد فتح المتجر تلقائياً؛ أعد التفعيل يدوياً.' : 'Does not reopen the store automatically; switch it back on manually.'}</p>
            </div>
          </div>
          <p className="text-xs text-ink-2">{lang === 'ar' ? 'اضغط "حفظ التعديلات" بالأعلى لتطبيق التغيير.' : 'Click "Save Settings" at the top to apply.'}</p>
        </div>
      )}

      {/* TAB 1: SHIPPING RATES CONFIGURATION */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          {/* Top Info Banner & Reset Action */}
          <div className="bg-surface rounded-card border border-line shadow-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-control bg-brand-700/10 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-ink">
                  {lang === 'ar' ? 'نقطة الانطلاق: الجيزة (Giza Origin)' : 'Shipping Origin: Giza, Egypt'}
                </h3>
                <p className="text-xs text-ink-2 mt-0.5">
                  {lang === 'ar'
                    ? 'الأسعار محددة وفقاً لـ 6 مستويات جغرافية وبأرقام صحيحة فقط (بدون كسور عشرية). تستخدم في حساب رسوم العميل والتكلفة المسجلة لشركات الشحن.'
                    : 'Rates configured across 6 geographical tiers using strict whole EGP integers (no decimals). Used for checkout charging and carrier logistics recording.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToTierDefaults}
              className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs shrink-0 self-start sm:self-auto"
            >
              <RotateCcw size={13} />
              <span>{lang === 'ar' ? 'استعادة أسعار المستويات الأصلية' : 'Reset to Giza Tier Defaults'}</span>
            </button>
          </div>

          {/* Metro Pickup Fee Setting */}
          <div className="bg-surface rounded-card border border-line shadow-card p-4 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-ink">
                {lang === 'ar' ? 'رسوم الاستلام من محطات المترو' : 'Metro Station Pickup Fee'}
              </h4>
              <p className="text-xs text-ink-2">
                {lang === 'ar' ? 'القيمة التي يتحملها العميل عند اختيار الاستلام من محطة مترو (افتراضي 0 ج.م)' : 'Customer charge when selecting Metro station pickup (default: 0 EGP)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={metroPickupFee}
                onChange={(e) => setMetroPickupFee(Math.max(0, Math.round(Number(e.target.value))))}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-24"
              />
              <span className="text-xs text-ink-2 font-semibold">{lang === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          {/* Real cost & per-order cost settings */}
          <div className="bg-surface rounded-card border border-line shadow-card p-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-ink">{lang === 'ar' ? 'تكلفة الشحن الفعلية وتكاليف الأوردر' : 'Real Shipping Cost & Per-Order Costs'}</h4>
              <p className="text-xs text-ink-2">
                {lang === 'ar'
                  ? 'تكلفة الشركة الفعلية تُخصم من ربح كل أوردر. المنطقة بدون تكلفة محددة تستخدم التكلفة الافتراضية. يظهر تحذير لو تكلفة الشحن تعدت النسبة من قيمة المنتجات.'
                  : 'Real carrier cost is deducted from each order profit. Regions without an explicit cost use the default. An order is flagged when shipping exceeds the % of products value.'}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="text-xs text-ink-2 space-y-1">
                <span className="block">{lang === 'ar' ? 'تكلفة الشحن الافتراضية (ج.م)' : 'Default real shipping (EGP)'}</span>
                <input type="number" min="0" step="1" value={defaultRealCost} onChange={(e) => setDefaultRealCost(Math.max(0, Math.round(Number(e.target.value))))} className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
              </label>
              <label className="text-xs text-ink-2 space-y-1">
                <span className="block">{lang === 'ar' ? 'حد التحذير (% من قيمة المنتجات)' : 'Warn above (% of products)'}</span>
                <input type="number" min="0" max="100" step="1" value={costWarnPercent} onChange={(e) => setCostWarnPercent(Math.max(0, Number(e.target.value)))} className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
              </label>
              <label className="text-xs text-ink-2 space-y-1">
                <span className="block">{lang === 'ar' ? 'مصروفات تشغيلية / أوردر (ج.م)' : 'Operating cost / order (EGP)'}</span>
                <input type="number" min="0" step="1" value={orderCosts.operatingPerOrder} onChange={(e) => setOrderCosts((p) => ({ ...p, operatingPerOrder: Math.max(0, Number(e.target.value)) }))} className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
              </label>
              <label className="text-xs text-ink-2 space-y-1">
                <span className="block">{lang === 'ar' ? 'مصروفات تشغيلية (% من الأوردر)' : 'Operating cost (% of order)'}</span>
                <input type="number" min="0" step="0.1" value={orderCosts.operatingPercent} onChange={(e) => setOrderCosts((p) => ({ ...p, operatingPercent: Math.max(0, Number(e.target.value)) }))} className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
              </label>
            </div>
          </div>

          {/* Payment fee percentages */}
          <div className="bg-surface rounded-card border border-line shadow-card p-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-ink">{lang === 'ar' ? 'نسب رسوم الدفع' : 'Payment fee percentages'}</h4>
              <p className="text-xs text-ink-2">
                {lang === 'ar'
                  ? 'نسبة البوابة بتتضاف على إجمالي الأوردر وتتقرّب لأقرب جنيه. نسب فودافون كاش وإنستاباي تكلفة داخلية فقط ولا تُضاف على العميل. كل النسب بتظهر في حصر الدفتر.'
                  : 'The gateway % is added to the order total and rounded to the nearest EGP. Vodafone/InstaPay % are internal costs only. All appear in the ledger tally.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-xs text-ink-2 space-y-1">
                <span className="flex items-center justify-between">
                  <span>{lang === 'ar' ? 'بوابة الدفع (على العميل) %' : 'Payment gateway (charged to customer) %'}</span>
                  <span className="flex items-center gap-1">
                    <input type="checkbox" checked={payFees.fawaterkEnabled} onChange={(e) => setPayFees((p) => ({ ...p, fawaterkEnabled: e.target.checked }))} />
                    {lang === 'ar' ? 'مفعّلة' : 'On'}
                  </span>
                </span>
                <input type="number" min="0" step="0.1" value={payFees.fawaterk} onChange={(e) => setPayFees((p) => ({ ...p, fawaterk: e.target.value }))} className="rounded-control border border-line bg-surface px-3 text-ink outline-none hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
              </label>
              <label className="text-xs text-ink-2 space-y-1">
                <span className="block">{lang === 'ar' ? 'فودافون كاش (تكلفة داخلية) %' : 'Vodafone Cash (internal cost) %'}</span>
                <input type="number" min="0" step="0.1" value={payFees.vodafoneCash} onChange={(e) => setPayFees((p) => ({ ...p, vodafoneCash: e.target.value }))} className="rounded-control border border-line bg-surface px-3 text-ink outline-none hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
              </label>
              <label className="text-xs text-ink-2 space-y-1">
                <span className="block">{lang === 'ar' ? 'إنستاباي (تكلفة داخلية) %' : 'InstaPay (internal cost) %'}</span>
                <input type="number" min="0" step="0.1" value={payFees.instaPay} onChange={(e) => setPayFees((p) => ({ ...p, instaPay: e.target.value }))} className="rounded-control border border-line bg-surface px-3 text-ink outline-none hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-full" />
              </label>
            </div>
          </div>

          {/* Cost per size table */}
          <div className="bg-surface rounded-card border border-line shadow-card p-4 space-y-3 overflow-x-auto">
            <div>
              <h4 className="text-xs font-semibold text-ink">{lang === 'ar' ? 'جدول تكلفة الزجاجة لكل مقاس' : 'Bottle cost table by size'}</h4>
              <p className="text-xs text-ink-2">
                {lang === 'ar'
                  ? 'الأوردر بيحسب تكاليفه من الجدول ده: COGS = زجاجة + زيت + كحول + شحن خام + علبة + كارت (التصنيع = زيت + كحول + شحن خام، الباكدج = زجاجة + علبة + كارت). التسويق والديزاين بند مستقل، ودعم الشحن (50) بيتضاف من تكلفة الشحن الفعلية.'
                  : 'Order costs are calculated from this table: COGS = bottle + oil + alcohol + raw shipping + box + card (manufacturing = oil + alcohol + raw shipping, packaging = bottle + box + card), marketing = mktg/design. Shipping comes from the real shipping cost.'}
              </p>
            </div>
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-ink-2">
                  <th className="text-start p-1">{lang === 'ar' ? 'المقاس' : 'Size'}</th>
                  {COST_COLS.map((c) => <th key={c.k} className="p-1 font-medium">{lang === 'ar' ? c.ar : c.en}</th>)}
                  <th className="p-1 font-semibold">COGS</th>
                  <th className="p-1 font-semibold">{lang === 'ar' ? 'الإجمالي الشامل (+دعم شحن)' : 'All-in (+ship. support)'}</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(costTable).map((size) => {
                  const row = costTable[size];
                  const sum = COST_COLS.reduce((a, c) => a + (Number(row[c.k]) || 0), 0);
                  return (
                    <tr key={size} className="border-t border-line">
                      <td className="p-1 font-semibold text-ink">{size}</td>
                      {COST_COLS.map((c) => (
                        <td key={c.k} className="p-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row[c.k] ?? 0}
                            onChange={(e) => setCostTable((prev) => ({ ...prev, [size]: { ...prev[size], [c.k]: Math.max(0, Number(e.target.value)) } }))}
                            className="rounded-control border border-line bg-surface px-2 text-ink outline-none hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-16"
                          />
                        </td>
                      ))}
                      <td className="p-1 text-center font-mono font-semibold text-ink">{sum - (Number(row.marketing) || 0)}</td>
                      <td className="p-1 text-center font-mono font-semibold text-brand-700">{sum + Number(defaultRealCost || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 6 Tiers Grid */}
          {[1, 2, 3, 4, 5, 6].map((tierNum) => {
            const tierInfo = TIER_DESCRIPTIONS[tierNum];
            const govsInTier = EGYPT_GOVERNORATES.filter((g) => g.tier === tierNum);

            return (
              <div key={tierNum} className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
                {/* Tier Header */}
                <div className="px-4 py-2.5 bg-canvas border-b border-line flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-control text-xs font-semibold uppercase tracking-wider bg-brand-700 text-white">
                      Tier {tierNum}
                    </span>
                    <h3 className="text-xs font-semibold text-ink">
                      {lang === 'ar' ? tierInfo.nameAr : tierInfo.nameEn}
                    </h3>
                  </div>

                  <span className="text-xs text-ink-2 font-mono font-semibold">
                    {lang === 'ar' ? `السعر الافتراضي: ${tierInfo.defaultRate} ج.م` : `Default: ${tierInfo.defaultRate} EGP`}
                  </span>
                </div>

                {/* Governorates Table */}
                <div className="divide-y divide-line">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                    {govsInTier.map((gov) => {
                      const currentVal = shippingRates[gov.nameEn] ?? gov.defaultRate;

                      return (
                        <div
                          key={gov.id}
                          className="flex items-center justify-between p-2.5 bg-canvas border border-line rounded-control hover:border-line transition-colors"
                        >
                          <div>
                            <span className="text-xs font-semibold text-ink block">
                              {lang === 'ar' ? gov.nameAr : gov.nameEn}
                            </span>
                            <span className="text-xs text-ink-3 font-mono">
                              {lang === 'ar' ? `المستوى ${gov.tier}` : `Tier ${gov.tier}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={currentVal}
                              onChange={(e) => handleRateChange(gov.nameEn, e.target.value)}
                              className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-16"
                            />
                            <span className="text-xs text-ink-2 font-medium">
                              {lang === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 border-s border-line ps-2 ms-2" title={lang === 'ar' ? 'تكلفة الشحن الفعلية' : 'Real carrier cost'}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder={String(defaultRealCost)}
                              value={realCosts[gov.nameEn] ?? ''}
                              onChange={(e) => setRealCosts((prev) => ({ ...prev, [gov.nameEn]: e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value))) }))}
                              className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 h-9 text-xs w-16"
                            />
                            <span className="text-[10px] text-ink-3">{lang === 'ar' ? 'فعلي' : 'real'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: BANNERS & ANNOUNCEMENT */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          {/* Main Slider Section */}
          <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-brand-700" />
                  <span>{lang === 'ar' ? 'صور السلايدر الرئيسي (Hero Carousel)' : 'Hero Carousel Banners'}</span>
                </h2>
                <p className="text-xs text-ink-2">
                  {lang === 'ar' ? 'الصور المعروضة في أعلى الصفحة الرئيسية للمتجر.' : 'Active promotional slides displayed on the storefront home header.'}
                </p>
              </div>

              <label className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs">
                <Upload size={14} />
                <span>{uploading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'إضافة صورة جديدة' : 'Add Image')}</span>
                <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {slides.map((slide) => (
                <div key={slide.id} className="border border-line rounded-control overflow-hidden bg-canvas flex flex-col justify-between">
                  <div>
                    <div className="aspect-[16/9] bg-line relative">
                      <img src={slide.image} alt={slide.alt} className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 text-xs bg-surface border border-line px-1.5 py-0.5 rounded-control font-medium">
                        {slide.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Inactive')}
                      </span>
                    </div>

                    <div className="p-3 space-y-2 text-xs">
                      <div>
                        <label className="block text-xs text-ink-2 mb-0.5">{lang === 'ar' ? 'الرابط عند النقر' : 'Target Link'}</label>
                        <input
                          type="text"
                          value={slide.link || ''}
                          onChange={(e) => updateSlideLink(slide.id, e.target.value)}
                          placeholder="/offers"
                          className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border-t border-line bg-surface flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => toggleSlide(slide.id)}
                      className={`text-[11px] font-medium ${slide.active ? 'text-warning' : 'text-success'}`}
                    >
                      {slide.active ? (lang === 'ar' ? 'تعطيل' : 'Deactivate') : (lang === 'ar' ? 'تفعيل' : 'Activate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(slide.id)}
                      className="text-ink-3 hover:text-danger"
                      title={lang === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-4">
            <div className="pb-3 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                  <BellRing size={16} className="text-brand-700" />
                  <span>{lang === 'ar' ? 'شريط الإعلانات العلوي (Announcement Bar)' : 'Announcement Bar'}</span>
                </h2>
                <p className="text-xs text-ink-2">
                  {lang === 'ar' ? 'النص الترويجي المعروض في الشريط العلوي لكل صفحات المتجر.' : 'Top announcement banner text shown across all storefront pages.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="announcementActive"
                  checked={announcement.active}
                  onChange={(e) => setAnnouncement({ ...announcement, active: e.target.checked })}
                  className="h-4 w-4 rounded-control border-line text-brand-700 focus:ring-brand-700"
                />
                <label htmlFor="announcementActive" className="text-xs font-medium text-ink-2 cursor-pointer">
                  {announcement.active ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'معطل' : 'Disabled')}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">
                {lang === 'ar' ? 'نص الإعلان' : 'Announcement Text'}
              </label>
              <input
                type="text"
                value={announcement.text}
                onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT & SOCIAL */}
      {activeTab === 'contact' && (
        <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-4">
          <div className="pb-3 border-b border-line">
            <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
              <PhoneCall size={16} className="text-brand-700" />
              <span>{lang === 'ar' ? 'بيانات التواصل وحسابات السوشيال ميديا' : 'Contact Channels & Social Media'}</span>
            </h2>
            <p className="text-xs text-ink-2">
              {lang === 'ar' ? 'أرقام الواتساب والدعم الفني وروابط الحسابات الرسمية.' : 'Customer care numbers, official WhatsApp link, and social channels.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-ink-2 mb-1">{lang === 'ar' ? 'رقم الواتساب الرسمي (بدون +)' : 'WhatsApp Number (without +)'}</label>
              <input
                type="text"
                value={contact.whatsapp}
                onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-2 mb-1">{lang === 'ar' ? 'رقم هاتف الدعم الفني المباشر' : 'Customer Support Phone'}</label>
              <input
                type="text"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-2 mb-1">Instagram</label>
              <input
                type="text"
                value={contact.instagram}
                onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-2 mb-1">TikTok</label>
              <input
                type="text"
                value={contact.tiktok}
                onChange={(e) => setContact({ ...contact, tiktok: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-ink-2 mb-1">Facebook</label>
              <input
                type="text"
                value={contact.facebook}
                onChange={(e) => setContact({ ...contact, facebook: e.target.value })}
                className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AD TRACKING & PIXELS (META PIXEL, CAPI, TIKTOK PIXEL) */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-surface rounded-card border border-line shadow-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-control bg-brand-700/10 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                <Target size={18} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-ink">
                  {lang === 'ar' ? 'تتبع الإعلانات والتحويلات (Meta Pixel + CAPI & TikTok)' : 'E-Commerce Tracking & Conversion APIs'}
                </h3>
                <p className="text-xs text-ink-2 mt-0.5">
                  {lang === 'ar'
                    ? 'ربط بكسل ميتا وبكسل تيك توك مع نظام Conversions API المدمج من السيرفر لمنع تكرار التحويلات (Deduplication) وتتبع أرباح الحملات الإعلانية بدقة.'
                    : 'Configure Meta Pixel, TikTok Pixel, and server-side Conversions API (CAPI) with deduplicated purchase events (order_${orderNumber}) and EGP currency.'}
                </p>
              </div>
            </div>

            {/* Global Enable Toggle */}
            <div className="flex items-center gap-2 bg-canvas border border-line px-3 py-1.5 rounded-control">
              <span className="text-xs font-semibold text-ink-2">
                {lang === 'ar' ? 'حالة التتبع:' : 'Tracking:'}
              </span>
              <button
                type="button"
                onClick={() => setTracking({ ...tracking, enableTracking: !tracking.enableTracking })}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  tracking.enableTracking ? 'bg-brand-700' : 'bg-ink-3'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm ring-0 transition duration-200 ease-in-out ${
                    tracking.enableTracking ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold ${tracking.enableTracking ? 'text-brand-700' : 'text-ink-3'}`}>
                {tracking.enableTracking ? (lang === 'ar' ? 'مفعل' : 'Active') : (lang === 'ar' ? 'معطل' : 'Disabled')}
              </span>
            </div>
          </div>

          {/* Quick Launch Marketing & Ads Analytics Dashboard Banner */}
          <div className="bg-brand-700/5 border border-brand-700/20 rounded-control p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-brand-700">
                {lang === 'ar' ? 'لوحة تحليلات التسويق والإعلانات المتقدمة (Marketing & Ads Analytics)' : 'Advanced Marketing & Ads Analytics Dashboard'}
              </h4>
              <p className="text-xs text-ink-2 mt-0.5">
                {lang === 'ar'
                  ? 'عرض أداء الحملات الإعلانية، حساب ROAS و CPA، قمع التحويل بالكامل، وأرباح كل قناة تسويقية.'
                  : 'Track live Ad Spend, ROAS, CPA, conversion funnels, and net profit per acquisition channel.'}
              </p>
            </div>
            <Link
              to="/marketing"
              className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs shrink-0"
            >
              <Target size={14} className="text-accent" />
              <span>{lang === 'ar' ? 'فتح لوحة تحليلات الإعلانات' : 'Open Analytics Dashboard'}</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta (Facebook & Instagram) Configuration */}
            <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-control bg-info-50 text-info flex items-center justify-center font-semibold text-xs">
                    M
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ink">
                      {lang === 'ar' ? 'إعدادات Meta (Facebook & Instagram)' : 'Meta Pixel & Conversions API'}
                    </h4>
                    <span className="text-xs text-ink-3 font-mono">fbq + Graph API v19.0</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  tracking.metaPixelId ? 'bg-success-50 text-success border border-success/20' : 'bg-canvas text-ink-2'
                }`}>
                  {tracking.metaPixelId ? (lang === 'ar' ? 'مضبوط' : 'Configured') : (lang === 'ar' ? 'غير محدد' : 'Not set')}
                </span>
              </div>

              {/* Meta Pixel ID */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'معرف بكسل ميتا (Meta Pixel ID)' : 'Meta Pixel ID'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: 123456789012345"
                  value={tracking.metaPixelId}
                  onChange={(e) => setTracking({ ...tracking, metaPixelId: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
                <p className="text-xs text-ink-3 mt-1">
                  {lang === 'ar'
                    ? 'يتم حقنه تلقائياً في واجهة المتجر لإطلاق أحداث: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.'
                    : 'Injected into storefront for client-side events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.'}
                </p>
              </div>

              {/* Meta CAPI Access Token */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'توكن واجهة التحويلات (Meta CAPI Access Token)' : 'Meta CAPI Access Token (Server-Side)'}
                </label>
                <div className="relative">
                  <input
                    type={showCapiToken ? 'text' : 'password'}
                    placeholder="EAAG..."
                    value={tracking.metaCapiAccessToken}
                    onChange={(e) => setTracking({ ...tracking, metaCapiAccessToken: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full pl-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCapiToken(!showCapiToken)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-ink-3 hover:text-ink-2 cursor-pointer"
                  >
                    {showCapiToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs text-ink-3 mt-1">
                  {lang === 'ar'
                    ? 'سري ومحمي في السيرفر فقط (لا يظهر في كود المتجر). يُرسل حدث الشراء من السيرفر فورا عند تأكيد الطلب مع تشفير SHA-256 للبيانات.'
                    : 'Stored securely in backend only. Dispatches server-side Purchase event with SHA-256 hashed customer data on order creation.'}
                </p>
              </div>
            </div>

            {/* TikTok Configuration */}
            <div className="bg-surface rounded-card border border-line shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-control bg-ink text-white flex items-center justify-center font-semibold text-xs">
                    TT
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ink">
                      {lang === 'ar' ? 'إعدادات TikTok Pixel' : 'TikTok Pixel'}
                    </h4>
                    <span className="text-xs text-ink-3 font-mono">ttq (E-Commerce Events)</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  tracking.tiktokPixelId ? 'bg-success-50 text-success border border-success/20' : 'bg-canvas text-ink-2'
                }`}>
                  {tracking.tiktokPixelId ? (lang === 'ar' ? 'مضبوط' : 'Configured') : (lang === 'ar' ? 'غير محدد' : 'Not set')}
                </span>
              </div>

              {/* TikTok Pixel ID */}
              <div>
                <label className="block text-xs font-semibold text-ink-2 mb-1">
                  {lang === 'ar' ? 'معرف بكسل تيك توك (TikTok Pixel ID)' : 'TikTok Pixel ID'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: C123456789ABCDEF"
                  value={tracking.tiktokPixelId}
                  onChange={(e) => setTracking({ ...tracking, tiktokPixelId: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
                <p className="text-xs text-ink-3 mt-1">
                  {lang === 'ar'
                    ? 'يتم حقن كود تيك توك تلقائياً لتسجيل تصفح العطور والإضافة للسلة وإتمام الشراء بعملة الجنيه المصري (EGP).'
                    : 'Injected into storefront for TikTok ad tracking: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase.'}
                </p>
              </div>

              {/* Deduplication & Attribution Info Box */}
              <div className="bg-brand-700/5 border border-brand-700/15 rounded-control p-3 space-y-1.5 text-ink-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-brand-700">
                  <ShieldCheck size={14} />
                  <span>{lang === 'ar' ? 'نظام منع التكرار التلقائي (Deduplication)' : 'Built-in Deduplication'}</span>
                </div>
                <p className="leading-relaxed text-ink-2 text-xs">
                  {lang === 'ar'
                    ? 'يتم إرسال معرّف موحد للحدث (order_{orderNumber}) لكل من بكسل المتصفح وواجهة السيرفر CAPI، مما يتيح لميتا دمج الحدثين بدقة ومنع احتساب الشراء مرتين.'
                    : 'Identical event_id (order_${orderNumber}) is shared between client pixel and server CAPI, allowing Meta to deduplicate without double counting.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
