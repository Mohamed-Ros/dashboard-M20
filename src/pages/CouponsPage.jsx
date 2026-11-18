import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Calendar, 
  Percent, 
  AlertCircle, 
  X,
  RefreshCw,
  Truck,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Clock,
  Hash
} from 'lucide-react';
import { getCoupons, createCoupon, deleteCoupon, toggleCouponActive } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

export default function CouponsPage() {
  const { lang, isRTL, formatCurrency } = useLanguage();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'FREE_SHIPPING',
    discountAmount: 0,
    minPurchaseAmount: 0,
    usageLimit: '',
    expiryDate: '',
    active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCouponsList = async () => {
    setLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsList();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (id, currentStatus) => {
    setTogglingId(id);
    try {
      const res = await toggleCouponActive(id);
      setCoupons((prev) =>
        prev.map((c) => (c._id === id ? { ...c, active: res?.active !== undefined ? res.active : !currentStatus } : c))
      );
      showToast(
        lang === 'ar'
          ? (currentStatus ? 'تم تعطيل الكوبون' : 'تم تفعيل الكوبون بنجاح')
          : (currentStatus ? 'Coupon deactivated' : 'Coupon activated')
      );
    } catch (err) {
      console.error(err);
      showError(
        lang === 'ar' ? 'خطأ' : 'Error',
        lang === 'ar' ? 'تعذر تغيير حالة الكوبون' : 'Failed to update coupon status'
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, code) => {
    const confirmed = await showConfirm(
      lang === 'ar' ? 'تأكيد حذف الكوبون' : 'Confirm Coupon Deletion',
      lang === 'ar' ? `هل أنت متأكد من حذف كود الخصم "${code}"؟` : `Are you sure you want to delete promo code "${code}"?`,
      lang === 'ar' ? 'نعم، احذف' : 'Yes, Delete',
      lang === 'ar' ? 'إلغاء' : 'Cancel'
    );
    if (!confirmed) return;
    try {
      await deleteCoupon(id);
      setCoupons(prev => prev.filter(c => c._id !== id));
      showToast(lang === 'ar' ? 'تم حذف الكوبون بنجاح' : 'Coupon deleted successfully');
    } catch (err) {
      console.error(err);
      showError(
        lang === 'ar' ? 'تعذر الحذف' : 'Failed to Delete',
        lang === 'ar' ? 'تعذر حذف الكوبون.' : 'Could not delete coupon.'
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountAmount: formData.discountType === 'FREE_SHIPPING' ? 0 : Math.round(Number(formData.discountAmount || 0)),
        minPurchaseAmount: Math.round(Number(formData.minPurchaseAmount || 0)),
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        expiryDate: formData.expiryDate ? formData.expiryDate : null,
        active: Boolean(formData.active)
      };

      await createCoupon(payload);
      showSuccess(
        lang === 'ar' ? 'تم إنشاء الكوبون بنجاح' : 'Promo Code Created',
        lang === 'ar' ? `تم تفعيل كود الخصم ${payload.code} بنجاح` : `Promo code ${payload.code} is now ready to use`
      );
      setIsModalOpen(false);
      setFormData({
        code: '',
        discountType: 'FREE_SHIPPING',
        discountAmount: 0,
        minPurchaseAmount: 0,
        usageLimit: '',
        expiryDate: '',
        active: true
      });
      fetchCouponsList();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || (lang === 'ar' ? 'تعذر إنشاء الكوبون، تأكد أن الكود غير مكرر.' : 'Could not create coupon. Ensure code is unique.');
      setError(msg);
      showError(lang === 'ar' ? 'خطأ في إنشاء الكوبون' : 'Error Creating Coupon', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>{lang === 'ar' ? 'إدارة الكوبونات والخصومات' : 'Coupons & Promo Codes'}</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            {lang === 'ar'
              ? 'إنشاء أكواد الشحن المجاني المباشر، الخصومات الثابتة أو النسبية، والتحكم في الشروط وتاريخ الصلاحية.'
              : 'Create direct Free Shipping promo codes, percentage or fixed discounts, usage limits, and expiration.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCouponsList}
            className="p-2 rounded-control border border-line hover:bg-canvas text-ink-2 transition-colors"
            title={lang === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={14} strokeWidth={1.5} />
            <span>{lang === 'ar' ? 'إنشاء كود خصم جديد' : 'Create New Promo Code'}</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-ink-2">
          {lang === 'ar' ? 'جاري تحميل الكوبونات...' : 'Loading promo codes...'}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-surface rounded-card p-10 text-center border border-line text-xs text-ink-2 shadow-card">
          {lang === 'ar' ? 'لا توجد كوبونات خصم حالياً.' : 'No promo codes found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => {
            const isFreeShipping = coupon.discountType === 'FREE_SHIPPING' || coupon.discountType === 'free_shipping';
            const isPercentage = coupon.discountType === 'percentage';

            return (
              <div
                key={coupon._id}
                className="bg-surface rounded-card border border-line shadow-card p-4 space-y-3 flex flex-col justify-between hover:border-line transition-colors"
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm text-brand-700 tracking-wider">{coupon.code}</span>
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        className="p-1 text-ink-3 hover:text-ink-2"
                        title={lang === 'ar' ? 'نسخ الكود' : 'Copy code'}
                      >
                        {copiedCode === coupon.code ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                      </button>
                    </div>

                    {/* Active toggle button */}
                    <button
                      onClick={() => handleToggleActive(coupon._id, coupon.active)}
                      disabled={togglingId === coupon._id}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                        coupon.active
                          ? 'bg-success-50 text-success border border-success/20 hover:bg-success-50'
                          : 'bg-canvas text-ink-2 border border-line hover:bg-line'
                      }`}
                    >
                      {coupon.active ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>
                          <span>{lang === 'ar' ? 'نشط' : 'Active'}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-ink-3 inline-block"></span>
                          <span>{lang === 'ar' ? 'معطل' : 'Inactive'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Discount Type Banner */}
                  <div className="pt-2.5">
                    {isFreeShipping ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-brand-700/10 text-brand-700 border border-brand-700/20 w-fit">
                        <Truck size={13} className="shrink-0" />
                        <span className="text-xs font-semibold">
                          {lang === 'ar' ? 'شحن مجاني مباشر (100%)' : 'Direct Free Shipping (100%)'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-warning-50 text-warning border border-warning/20 w-fit">
                        {isPercentage ? <Percent size={13} className="shrink-0" /> : <DollarSign size={13} className="shrink-0" />}
                        <span className="text-xs font-semibold font-mono">
                          {isPercentage ? `${coupon.discountAmount ?? coupon.discountValue}%` : formatCurrency(coupon.discountAmount ?? coupon.discountValue)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Conditions */}
                  <div className="pt-3 space-y-1.5 text-xs text-ink-2">
                    {(coupon.minPurchaseAmount > 0 || coupon.minimumSpend > 0) && (
                      <p className="flex items-center justify-between">
                        <span className="text-ink-3">{lang === 'ar' ? 'الحد الأدنى للطلب:' : 'Min Subtotal:'}</span>
                        <span className="font-semibold text-ink-2 font-mono">
                          {formatCurrency(coupon.minPurchaseAmount || coupon.minimumSpend)}
                        </span>
                      </p>
                    )}

                    {(coupon.usageLimit || coupon.maxUsage) && (
                      <p className="flex items-center justify-between">
                        <span className="text-ink-3">{lang === 'ar' ? 'مرات الاستخدام المتاحة:' : 'Usage Limit:'}</span>
                        <span className="font-semibold text-ink-2 font-mono">
                          {coupon.usageLimit || coupon.maxUsage}
                        </span>
                      </p>
                    )}

                    {(coupon.expiryDate || coupon.expiresAt) && (
                      <p className="flex items-center justify-between">
                        <span className="text-ink-3">{lang === 'ar' ? 'تاريخ الانتهاء:' : 'Expires:'}</span>
                        <span className="font-semibold text-ink-2 font-mono text-xs">
                          {new Date(coupon.expiryDate || coupon.expiresAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer: Used Count & Delete */}
                <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs">
                  <span className="text-xs text-ink-3 font-mono">
                    {lang === 'ar'
                      ? `مرات الاستخدام: ${coupon.usedCount ?? coupon.usageCount ?? 0}`
                      : `Used: ${coupon.usedCount ?? coupon.usageCount ?? 0} times`}
                  </span>

                  <button
                    onClick={() => handleDelete(coupon._id, coupon.code)}
                    className="p-1.5 rounded-control border border-line hover:bg-danger-50 text-ink-3 hover:text-danger transition-colors"
                    title={lang === 'ar' ? 'حذف الكوبون' : 'Delete coupon'}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
          <div className="fixed inset-0 bg-black/40 transition-opacity duration-150" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-md bg-surface rounded-card border border-line shadow-card shadow-pop overflow-hidden z-10">
            <div className="px-5 py-3.5 border-b border-line bg-canvas flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-700">
                {lang === 'ar' ? 'إنشاء كود خصم جديد' : 'Create New Promo Code'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-ink-3 hover:text-ink-2">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              {error && (
                <div className="p-2.5 rounded-control bg-danger-50 border border-danger/20 text-danger flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block font-medium text-ink-2 mb-1">
                  {lang === 'ar' ? 'كود الخصم (Promo Code) *' : 'Promo Code *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().trim() })}
                  placeholder={lang === 'ar' ? 'مثال: FREESHIP أو M20' : 'e.g. FREESHIP or M20'}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              {/* Discount Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">
                    {lang === 'ar' ? 'نوع الخصم' : 'Discount Type'}
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  >
                    <option value="FREE_SHIPPING">
                      {lang === 'ar' ? 'شحن مجاني (100%)' : 'Free Shipping (100%)'}
                    </option>
                    <option value="percentage">
                      {lang === 'ar' ? 'نسبة مئوية (%)' : 'Percentage (%)'}
                    </option>
                    <option value="fixed">
                      {lang === 'ar' ? 'مبلغ ثابت (ج.م)' : 'Fixed Amount (EGP)'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">
                    {lang === 'ar' ? 'قيمة الخصم' : 'Discount Value'}
                  </label>
                  {formData.discountType === 'FREE_SHIPPING' ? (
                    <div className="h-9 px-3 bg-success-50 border border-success/20 rounded-control flex items-center text-success text-xs font-semibold">
                      {lang === 'ar' ? '100% خصم الشحن' : '100% Free Shipping'}
                    </div>
                  ) : (
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: Math.round(Number(e.target.value)) })}
                      placeholder="10"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  )}
                </div>
              </div>

              {/* Minimum Order Subtotal & Usage Limit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">
                    {lang === 'ar' ? 'الحد الأدنى للطلب (اختياري)' : 'Min Order Subtotal (Optional)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.minPurchaseAmount}
                    onChange={(e) => setFormData({ ...formData, minPurchaseAmount: Math.round(Number(e.target.value)) })}
                    placeholder="0"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block font-medium text-ink-2 mb-1">
                    {lang === 'ar' ? 'أقصى عدد استخدام (اختياري)' : 'Usage Limit (Optional)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder={lang === 'ar' ? 'غير محدود' : 'Unlimited'}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block font-medium text-ink-2 mb-1">
                  {lang === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'Expiration Date (Optional)'}
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="couponActiveCheckbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 rounded-control border-line text-brand-700 focus:ring-brand-700 cursor-pointer"
                />
                <label htmlFor="couponActiveCheckbox" className="font-medium text-ink-2 cursor-pointer select-none">
                  {lang === 'ar' ? 'تفعيل الكود فوراً' : 'Activate promo code immediately'}
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submitting ? (lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (lang === 'ar' ? 'إنشاء الكود' : 'Create Code')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
