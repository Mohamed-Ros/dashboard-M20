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
  marketing: { label: 'تسويق وإعلانات', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  rent_utilities: { label: 'إيجار ومرافق وخدمات', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  salaries: { label: 'رواتب ومكافآت', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  packaging_shipping: { label: 'تغليف وشحن إضافي', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  software_tools: { label: 'برمجيات واشتراكات', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  maintenance: { label: 'صيانة ومعدات', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  other: { label: 'مصروفات أخرى', color: 'bg-slate-100 text-slate-700 border-line' },
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
    <div className="space-y-6 text-right font-['Cairo',sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-brand-700 flex items-center gap-2">
            <DollarSign size={20} strokeWidth={1.5} className="text-brand-700" />
            <span>المصروفات التشغيلية (Operating Expenses)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تسجيل مصروفات التسويق، التشغيل، والخدمات ومتابعة أثرها على صافي الأرباح.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-control bg-brand-700 hover:bg-brand-900 text-white text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 h-9"
          >
            <Plus size={14} />
            <span>تسجيل مصروف جديد</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-control border border-line hover:bg-slate-50 text-slate-700 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-control p-4 border border-line">
          <span className="text-xs text-slate-500 block">إجمالي المصروفات التشغيلية</span>
          <h3 className="text-xl font-bold text-danger mt-1">{Math.round(totalExpenseAmount).toLocaleString()} ج.م</h3>
        </div>

        <div className="bg-white rounded-control p-4 border border-line">
          <span className="text-xs text-slate-500 block">مصروفات التسويق والإعلانات</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {Math.round(summary.byCategory?.marketing || 0).toLocaleString()} ج.م
          </h3>
        </div>

        <div className="bg-white rounded-control p-4 border border-line">
          <span className="text-xs text-slate-500 block">مصروفات الرواتب والمكافآت</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {Math.round(summary.byCategory?.salaries || 0).toLocaleString()} ج.م
          </h3>
        </div>

        <div className="bg-white rounded-control p-4 border border-line">
          <span className="text-xs text-slate-500 block">التشغيل والمرافق والبرمجيات</span>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {Math.round((summary.byCategory?.rent_utilities || 0) + (summary.byCategory?.software_tools || 0) + (summary.byCategory?.other || 0)).toLocaleString()} ج.م
          </h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-control p-3 border border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Filter size={12} />
            فلترة حسب التصنيف:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 bg-canvas border border-line rounded-control px-3 text-xs outline-none text-slate-700"
          >
            <option value="">جميع التصنيفات</option>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {expenses.length} مصروف مسجل
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-canvas text-slate-700 font-semibold border-b border-line">
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
            <tbody className="divide-y divide-line font-normal text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري تحميل المصروفات...</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    لا توجد مصروفات مسجلة في هذا التصنيف.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const catInfo = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES.other;
                  return (
                    <tr key={expense._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {expense.title}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-control border text-[11px] font-medium ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {new Date(expense.date).toLocaleDateString('ar-EG')}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-danger">
                        {expense.amount.toLocaleString()} ج.م
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {expense.paidFromAccount?.accountName || '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {expense.notes || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(expense)}
                          title="حذف المصروف"
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
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
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">اسم / بيان المصروف *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: حملة إعلانية فيسبوك وإنستجرام"
                  className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-3 text-xs outline-none focus:border-brand-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">التصنيف *</label>
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
                  <label className="block font-medium text-slate-700 mb-1">المبلغ (ج.م) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="3500"
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-3 text-xs font-mono outline-none focus:border-brand-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">تاريخ الصرف *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-9 bg-surface rounded-card border border-line shadow-card px-3 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">الخزينة المسدد منها</label>
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
                <label className="block font-medium text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات توثيقية إضافية..."
                  className="w-full bg-surface rounded-card border border-line shadow-card p-2 text-xs outline-none focus:border-brand-700"
                />
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-line rounded-control hover:bg-slate-50 text-slate-700 h-9"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-700 text-white rounded-control hover:bg-brand-900 h-9 font-medium disabled:opacity-50"
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

