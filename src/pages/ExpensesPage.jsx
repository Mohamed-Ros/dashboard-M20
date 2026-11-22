import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, Trash2, Filter, RefreshCw, 
  X, Calendar, Wallet, PieChart, Tag
} from 'lucide-react';
import { 
  getExpenses, createExpense, deleteExpense, 
  getExpensesSummary, getCashAccounts 
} from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';


const EXPENSE_CATEGORIES = {
  marketing: { label: 'تسويق وإعلانات', color: 'bg-info-50 text-info border-info/20' },
  rent_utilities: { label: 'إيجار ومرافق وخدمات', color: 'bg-info-50 text-info border-info/20' },
  salaries: { label: 'رواتب ومكافآت', color: 'bg-success-50 text-success border-success/20' },
  packaging_shipping: { label: 'تغليف وشحن إضافي', color: 'bg-warning-50 text-warning border-warning/20' },
  software_tools: { label: 'برمجيات واشتراكات', color: 'bg-info-50 text-info border-info/20' },
  maintenance: { label: 'صيانة ومعدات', color: 'bg-info-50 text-info border-info/20' },
  other: { label: 'مصروفات أخرى', color: 'bg-canvas text-ink-2 border-line' },
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [cashAccounts, setCashAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'marketing',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paidFromAccount: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eData, sData, aData] = await Promise.all([
        getExpenses({ category: categoryFilter || undefined }).catch(() => []),
        getExpensesSummary().catch(() => ({})),
        getCashAccounts().catch(() => []),
      ]);
      setExpenses(Array.isArray(eData) ? eData : []);
      setSummary(sData || {});
      setCashAccounts(Array.isArray(aData) ? aData : []);

      if (aData?.length && !formData.paidFromAccount) {
        setFormData(prev => ({ ...prev, paidFromAccount: aData[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter]);

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'marketing',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paidFromAccount: cashAccounts[0]?._id || '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    setSubmitting(true);
    try {
      await createExpense({
        title: formData.title,
        category: formData.category,
        amount: Number(formData.amount),
        date: formData.date,
        paidFromAccount: formData.paidFromAccount || undefined,
        notes: formData.notes,
      });

      showSuccess('تم تسجيل المصروف بنجاح', 'تم تسجيل المصروف وتحديث حسابات الخزينة والأرباح');
      setShowModal(false);
      fetchData();
    } catch (err) {
      showError('خطأ أثناء الحفظ', err.response?.data?.message || 'حدث خطأ أثناء حفظ المصروف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense) => {
    const confirmed = await showConfirm('تأكيد الحذف', `هل أنت متأكد من حذف المصروف "${expense.title}"؟`, 'نعم، احذف', 'إلغاء');
    if (!confirmed) return;
    try {
      await deleteExpense(expense._id);
      showToast('تم حذف المصروف بنجاح');
      fetchData();
    } catch (err) {
      showError('تعذر الحذف', err.response?.data?.message || 'تعذر حذف المصروف');
    }
  };

  const totalExpenseAmount = summary.totalExpenses || expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>المصروفات التشغيلية (Operating Expenses)</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            تسجيل مصروفات التسويق، التشغيل، والخدمات ومتابعة أثرها على صافي الأرباح.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={14} />
            <span>تسجيل مصروف جديد</span>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 block">إجمالي المصروفات التشغيلية</span>
          <h3 className="text-xl font-semibold text-danger mt-1">{Math.round(totalExpenseAmount).toLocaleString()} ج.م</h3>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 block">مصروفات التسويق والإعلانات</span>
          <h3 className="text-xl font-semibold text-ink mt-1">
            {Math.round(summary.byCategory?.marketing || 0).toLocaleString()} ج.م
          </h3>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 block">مصروفات الرواتب والمكافآت</span>
          <h3 className="text-xl font-semibold text-ink mt-1">
            {Math.round(summary.byCategory?.salaries || 0).toLocaleString()} ج.م
          </h3>
        </div>

        <div className="bg-surface rounded-card p-4 border border-line shadow-card">
          <span className="text-xs text-ink-2 block">التشغيل والمرافق والبرمجيات</span>
          <h3 className="text-xl font-semibold text-ink mt-1">
            {Math.round((summary.byCategory?.rent_utilities || 0) + (summary.byCategory?.software_tools || 0) + (summary.byCategory?.other || 0)).toLocaleString()} ج.م
          </h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface rounded-control p-3 border border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-2 flex items-center gap-1">
            <Filter size={12} />
            فلترة حسب التصنيف:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 bg-canvas border border-line rounded-control px-3 text-xs outline-none text-ink-2"
          >
            <option value="">جميع التصنيفات</option>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-ink-2 font-mono">
          {expenses.length} مصروف مسجل
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-canvas text-ink-2 font-semibold border-b border-line">
              <tr>
                <th className="py-3 px-4">اسم / بيان المصروف</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">تاريخ الصرف</th>
                <th className="py-3 px-4 text-center">المبلغ (ج.م)</th>
                <th className="py-3 px-4">الخزينة / الحساب</th>
                <th className="py-3 px-4">ملاحظات</th>
                <th className="py-3 px-4 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-normal text-ink-2">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-ink-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل المصروفات...</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-ink-3">
                    لا توجد مصروفات مسجلة في هذا التصنيف.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const catInfo = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES.other;
                  return (
                    <tr key={expense._id} className="hover:bg-canvas transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        {expense.title}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-control border text-xs font-medium ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-ink-2">
                        {new Date(expense.date).toLocaleDateString('ar-EG')}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-semibold text-danger">
                        {expense.amount.toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-ink-2 text-xs">
                        {expense.paymentAccountName || expense.paymentAccount?.name || '—'}
                      </td>

                      <td className="py-3 px-4 text-ink-2 max-w-xs truncate">
                        {expense.notes || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(expense)}
                          title="حذف المصروف"
                          className="p-1.5 text-ink-3 hover:text-danger transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-surface rounded-card border border-line shadow-card overlay-shadow z-10">
            <div className="px-5 py-3.5 border-b border-line bg-canvas flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                <Plus size={16} />
                <span>تسجيل مصروف تشغيلي جديد</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-ink-3 hover:text-ink-2">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-ink-2 mb-1">اسم / بيان المصروف *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: حملة إعلانية فيسبوك وإنستجرام"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">التصنيف *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                  >
                    {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="3500"
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-ink-2 mb-1">تاريخ الصرف *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-3 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-ink-2 mb-1">الخزينة المسدد منها</label>
                  <select
                    value={formData.paidFromAccount}
                    onChange={(e) => setFormData({ ...formData, paidFromAccount: e.target.value })}
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-2 text-xs outline-none"
                  >
                    <option value="">-- بدون خصم من خزينة --</option>
                    {cashAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.accountName} (رصيد: {acc.currentBalance?.toLocaleString()} ج.م)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-ink-2 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات توثيقية إضافية..."
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submitting ? 'جاري الحفظ...' : 'تسجيل المصروف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

