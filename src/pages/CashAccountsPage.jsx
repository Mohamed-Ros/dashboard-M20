import React, { useState, useEffect } from 'react';
import { 
  Wallet, Plus, Smartphone, CreditCard, DollarSign, 
  ArrowUpDown, RefreshCw, X, Check, Building2, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  getCashAccounts, createCashAccount, adjustCashAccount 
} from '../services/api';
import { showSuccess, showError, showToast } from '../utils/swal';


const ACCOUNT_TYPE_MAP = {
  cash: { label: 'خزينة نقدية (Cash)', icon: DollarSign, color: 'text-success bg-success-50 border-success/20' },
  vodafone_cash: { label: 'فودافون كاش', icon: Smartphone, color: 'text-danger bg-danger-50 border-danger/20' },
  instapay: { label: 'إنستاباي (InstaPay)', icon: Smartphone, color: 'text-info bg-info-50 border-info/20' },
  bank: { label: 'حساب بنكي', icon: Building2, color: 'text-info bg-info-50 border-info/20' },
  cod_courier: { label: 'تحصيلات مناديب الشحن', icon: CreditCard, color: 'text-warning bg-warning-50 border-warning/20' },
  other: { label: 'حساب آخر', icon: Wallet, color: 'text-ink-2 bg-canvas border-line' },
};

export default function CashAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Add Account Form
  const [addForm, setAddForm] = useState({
    accountName: '',
    accountType: 'vodafone_cash',
    accountIdentifier: '',
    openingBalance: '',
    notes: '',
  });

  // Adjust Balance Form
  const [adjustForm, setAdjustForm] = useState({
    amountChange: '',
    type: 'deposit',
    reason: '',
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getCashAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading cash accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAdd = () => {
    setAddForm({
      accountName: '',
      accountType: 'vodafone_cash',
      accountIdentifier: '',
      openingBalance: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenAdjust = (account) => {
    setSelectedAccount(account);
    setAdjustForm({
      amountChange: '',
      type: 'deposit',
      reason: '',
    });
    setShowAdjustModal(true);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCashAccount({
        accountName: addForm.accountName,
        accountType: addForm.accountType,
        accountIdentifier: addForm.accountIdentifier,
        currentBalance: Number(addForm.openingBalance) || 0,
        notes: addForm.notes,
      });
      showSuccess('تمت الإضافة بنجاح', 'تم تسجيل حساب الخزينة الجديد بنجاح');
      setShowAddModal(false);
      fetchAccounts();
    } catch (err) {
      showError('خطأ أثناء الإضافة', err.response?.data?.message || 'حدث خطأ أثناء إضافة الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      await adjustCashAccount(selectedAccount._id, {
        amountChange: Number(adjustForm.amountChange),
        type: adjustForm.type,
        reason: adjustForm.reason,
      });
      showSuccess('تم تعديل الرصيد', 'تمت تسوية رصيد الحساب بنجاح');
      setShowAdjustModal(false);
      fetchAccounts();
    } catch (err) {
      showError('خطأ أثناء التعديل', err.response?.data?.message || 'حدث خطأ أثناء تعديل الرصيد');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCashBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>الخزائن وحسابات الدفع (Cash & Wallets Treasury)</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            متابعة أرصدة فودافون كاش، إنستاباي، التحصيل عند الاستلام، والتحويلات البنكية.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={14} />
            <span>إضافة خزينة / محفظة جديدة</span>
          </button>

          <button
            onClick={fetchAccounts}
            className="p-2 rounded-control border border-line hover:bg-canvas text-ink-2 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Total Treasury Summary Header */}
      <div className="bg-brand-700 text-white rounded-control p-5 border border-brand-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-white/70 block">إجمالي السيولة النقدية المتاحة (Total Liquid Funds)</span>
          <h2 className="text-2xl font-semibold font-mono text-white mt-1">
            {Math.round(totalCashBalance).toLocaleString()} ج.م
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-surface/10 px-3 py-2 rounded-control border border-white/15">
            <span className="text-white/60 block text-xs">عدد الخزائن والمحافظ</span>
            <span className="font-semibold text-white text-sm">{accounts.length} حسابات</span>
          </div>
        </div>
      </div>

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-ink-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
              <span>جاري تحميل الخزائن...</span>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-ink-3 bg-surface rounded-card border border-line shadow-card">
            لا توجد حسابات خزينة مسجلة. اضغط "إضافة خزينة / محفظة جديدة".
          </div>
        ) : (
          accounts.map((account) => {
            const typeInfo = ACCOUNT_TYPE_MAP[account.accountType] || ACCOUNT_TYPE_MAP.other;
            const Icon = typeInfo.icon;

            return (
              <div key={account._id} className="bg-surface rounded-card border border-line shadow-card p-4 space-y-3 flex flex-col justify-between hover:border-line transition-shadow duration-150">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-control border text-xs font-medium flex items-center gap-1.5 ${typeInfo.color}`}>
                      <Icon size={13} />
                      <span>{typeInfo.label}</span>
                    </span>

                    <span className="text-xs text-ink-3 font-mono">
                      {account.accountIdentifier || '—'}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-ink mt-2">
                    {account.accountName}
                  </h3>

                  <div className="mt-3">
                    <span className="text-xs text-ink-2 block">الرصيد الفعلي الحالي:</span>
                    <span className="text-xl font-semibold font-mono text-ink block mt-0.5">
                      {Math.round(account.currentBalance || 0).toLocaleString()} <span className="text-xs text-ink-2 font-normal">ج.م</span>
                    </span>
                  </div>

                  {account.notes && (
                    <p className="text-xs text-ink-2 mt-2 line-clamp-1">
                      {account.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-ink-3">
                    آخر حركة: {new Date(account.updatedAt || Date.now()).toLocaleDateString('ar-EG')}
                  </span>

                  <button
                    onClick={() => handleOpenAdjust(account)}
                    className="px-3 py-1 bg-canvas hover:bg-brand-700 hover:text-white text-ink-2 rounded-control text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <ArrowUpDown size={12} />
                    <span>تعديل الرصيد</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-surface rounded-card border border-line shadow-card overlay-shadow z-10">
            <div className="px-5 py-3.5 border-b border-line bg-canvas flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                <Wallet size={16} />
                <span>إضافة خزينة / محفظة نقدية جديدة</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-ink-3 hover:text-ink-2">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-ink-2 mb-1">اسم الحساب / الخزينة *</label>
                <input
                  type="text"
                  required
                  value={addForm.accountName}
                  onChange={(e) => setAddForm({ ...addForm, accountName: e.target.value })}
                  placeholder="مثال: محفظة فودافون كاش الرئيسية"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">نوع الحساب *</label>
                  <select
                    value={addForm.accountType}
                    onChange={(e) => setAddForm({ ...addForm, accountType: e.target.value })}
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                  >
                    {Object.entries(ACCOUNT_TYPE_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">رقم المحفظة / الآيبان</label>
                  <input
                    type="text"
                    value={addForm.accountIdentifier}
                    onChange={(e) => setAddForm({ ...addForm, accountIdentifier: e.target.value })}
                    placeholder="010XXXXXXXX"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink-2 mb-1">الرصيد الافتتاحي (ج.م)</label>
                <input
                  type="number"
                  step="any"
                  value={addForm.openingBalance}
                  onChange={(e) => setAddForm({ ...addForm, openingBalance: e.target.value })}
                  placeholder="0"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-medium text-ink-2 mb-1">ملاحظات</label>
                <textarea
                  rows="2"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="ملاحظات حول حدود السحب اليومي، المسؤول عن المحفظة..."
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submitting ? 'جاري الحفظ...' : 'إضافة الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowAdjustModal(false)} />
          <div className="relative w-full max-w-sm bg-surface rounded-card border border-line shadow-card overlay-shadow z-10">
            <div className="px-5 py-3.5 border-b border-line bg-canvas flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-700">
                تعديل رصيد: {selectedAccount.accountName}
              </h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-1 text-ink-3 hover:text-ink-2">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustBalance} className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 bg-canvas border border-line rounded-control">
                <span className="text-ink-2 text-xs block">الرصيد الحالي:</span>
                <span className="text-base font-semibold font-mono text-ink">
                  {selectedAccount.currentBalance?.toLocaleString()} ج.م
                </span>
              </div>

              <div>
                <label className="block font-medium text-ink-2 mb-1">نوع الحركة *</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                >
                  <option value="deposit">إيداع / تحويل وارد (+)</option>
                  <option value="withdrawal">سحب / تحويل صادر (-)</option>
                  <option value="transfer">تحويل بين حسابات</option>
                  <option value="correction">تسوية جرد دوري</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-ink-2 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustForm.amountChange}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amountChange: e.target.value })}
                  placeholder="500"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-medium text-ink-2 mb-1">السبب / الملاحظة *</label>
                <textarea
                  rows="2"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="مثال: سحب نقدي للمصروفات، تحصيل مندوب شركة الشحن..."
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submitting ? 'جاري التأكيد...' : 'تأكيد تعديل الرصيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

