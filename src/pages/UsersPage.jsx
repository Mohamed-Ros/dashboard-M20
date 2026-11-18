import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import { showSuccess, showError, showConfirm, showToast } from '../utils/swal';

import { 
  Users, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  MessageSquare, 
  UserPlus, 
  Trash2, 
  Edit3, 
  X, 
  Shield, 
  ShieldCheck, 
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'customer',
    isEmailVerified: true
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchUsersList = async () => {
    setLoading(true);
    try {
      const usersData = await getUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const handleCopyPhone = (phone, idx) => {
    navigator.clipboard.writeText(phone);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'admin',
      isEmailVerified: true
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      role: user.role || 'customer',
      isEmailVerified: Boolean(user.isEmailVerified)
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormSubmitting(true);

    try {
      if (modalMode === 'create') {
        await createUser({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          password: formData.password || undefined,
          role: formData.role,
          isEmailVerified: formData.isEmailVerified
        });
        setFormSuccess('تم إنشاء الحساب بنجاح.');
      } else {
        await updateUser(selectedUser._id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          password: formData.password || undefined,
          role: formData.role,
          isEmailVerified: formData.isEmailVerified
        });
        setFormSuccess('تم تحديث بيانات الحساب بنجاح.');
      }

      await fetchUsersList();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 800);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ الحساب.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    const confirmed = await showConfirm('تأكيد حذف الحساب', `هل أنت متأكد من رغبتك في حذف حساب "${name}" نهائياً؟`, 'نعم، احذف', 'إلغاء');
    if (!confirmed) return;

    try {
      await deleteUser(id);
      showToast('تم حذف الحساب بنجاح');
      await fetchUsersList();
    } catch (err) {
      showError('فشل الحذف', err.response?.data?.message || 'فشل حذف الحساب.');
    }
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    const name = (u.name || '').toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    const email = (u.email || '').toLowerCase();

    const matchesSearch = name.includes(term) || phone.includes(term) || email.includes(term);
    
    if (filterType === 'admins') return matchesSearch && (u.role === 'admin' || u.role === 'superadmin');
    if (filterType === 'customers') return matchesSearch && u.role === 'customer';
    if (filterType === 'purchased') return matchesSearch && (u.totalOrders || 0) > 0;
    if (filterType === 'founding') return matchesSearch && u.isFirst100;
    return matchesSearch;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
    customers: users.filter(u => u.role === 'customer' || !u.role).length,
    purchased: users.filter(u => (u.totalOrders || 0) > 0).length,
    founding: users.filter(u => u.isFirst100).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink leading-tight">
            
            <span>إدارة الحسابات والمستخدمين</span>
          </h1>
          <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
            إدارة حسابات المدراء (Super Admin & Admin) وسجلات العملاء وقوائم التواصل.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <UserPlus size={14} strokeWidth={1.5} />
            <span>إضافة حساب جديد</span>
          </button>

          <button
            onClick={fetchUsersList}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
            title="تحديث القائمة"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Filter cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterType('all')}
          className={`p-3.5 rounded-control border text-right transition-colors duration-150 ${
            filterType === 'all'
              ? 'bg-brand-700 text-white border-brand-700'
              : 'bg-surface border-line hover:border-line text-ink-2'
          }`}
        >
          <span className="text-xs block">جميع الحسابات</span>
          <b className="text-lg mt-1 block">{stats.total}</b>
        </button>

        <button
          onClick={() => setFilterType('admins')}
          className={`p-3.5 rounded-control border text-right transition-colors duration-150 ${
            filterType === 'admins'
              ? 'bg-brand-700 text-white border-brand-700'
              : 'bg-surface border-line hover:border-line text-ink-2'
          }`}
        >
          <span className="text-xs block">المدراء والمسؤولين</span>
          <b className="text-lg mt-1 block">{stats.admins}</b>
        </button>

        <button
          onClick={() => setFilterType('customers')}
          className={`p-3.5 rounded-control border text-right transition-colors duration-150 ${
            filterType === 'customers'
              ? 'bg-brand-700 text-white border-brand-700'
              : 'bg-surface border-line hover:border-line text-ink-2'
          }`}
        >
          <span className="text-xs block">العملاء</span>
          <b className="text-lg mt-1 block">{stats.customers}</b>
        </button>

        <button
          onClick={() => setFilterType('purchased')}
          className={`p-3.5 rounded-control border text-right transition-colors duration-150 ${
            filterType === 'purchased'
              ? 'bg-brand-700 text-white border-brand-700'
              : 'bg-surface border-line hover:border-line text-ink-2'
          }`}
        >
          <span className="text-xs block">قاموا بالشراء</span>
          <b className="text-lg mt-1 block">{stats.purchased}</b>
        </button>
      </div>

      {/* Search */}
      <div className="bg-surface rounded-control p-3.5 border border-line">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف، أو البريد الإلكتروني..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full pr-9"
          />
          <Search size={14} className="text-ink-3 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-xs text-ink-2 bg-surface rounded-card border border-line shadow-card">
          جاري تحميل بيانات الحسابات...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-surface rounded-card p-10 text-center border border-line text-xs text-ink-2 shadow-card">
          لا توجد نتائج مطابقة لخيارات البحث.
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-canvas text-ink-2 font-semibold border-b border-line">
                <tr>
                  <th className="py-3 px-4">اسم الحساب</th>
                  <th className="py-3 px-4">الصلاحية / الدور</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">البريد الإلكتروني</th>
                  <th className="py-3 px-4">الطلبات</th>
                  <th className="py-3 px-4">تاريخ التسجيل</th>
                  <th className="py-3 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-normal text-ink-2">
                {filteredUsers.map((u, idx) => {
                  const hasOrders = (u.totalOrders || 0) > 0;
                  const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');

                  return (
                    <tr key={u._id || idx} className="hover:bg-canvas transition-colors duration-150">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-ink">{u.name || 'مستخدم'}</p>
                          <span className="text-xs text-ink-3 font-mono">
                            {u.userId || '-'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {u.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-control bg-brand-700 text-white text-xs font-medium">
                            <ShieldCheck size={12} />
                            <span>سوبر أدمن</span>
                          </span>
                        ) : u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-control bg-ink text-white text-xs font-medium">
                            <Shield size={12} />
                            <span>مسؤول (أدمن)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-control bg-canvas text-ink-2 text-xs">
                            <span>عميل</span>
                            {u.isFirst100 && <span className="text-warning font-semibold mr-1">• عضو تأسيس</span>}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{u.phone || '-'}</span>
                          {u.phone && (
                            <button
                              onClick={() => handleCopyPhone(u.phone, idx)}
                              className="p-1 text-ink-3 hover:text-ink-2"
                              title="نسخ الرقم"
                            >
                              {copiedIndex === idx ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-ink-2">
                        {u.email ? (
                          <div className="flex items-center gap-1">
                            <span>{u.email}</span>
                            {u.isEmailVerified && <CheckCircle2 size={12} className="text-success" title="مؤكد" />}
                          </div>
                        ) : (
                          <span className="text-ink-3">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {hasOrders ? (
                          <span className="text-xs font-medium text-success">
                            {u.totalOrders} طلب (EGP {u.totalSpent || 0})
                          </span>
                        ) : (
                          <span className="text-xs text-ink-3">
                            لا توجد طلبات
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-ink-2 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}
                      </td>

                      <td className="py-3 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/2${cleanPhone}?text=${encodeURIComponent(`مرحباً ${u.name || ''}، معك إدارة M20.`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-control border border-line hover:bg-canvas text-ink-2 transition-colors duration-150"
                              title="مراسلة واتساب"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-control border border-line hover:bg-canvas text-ink-2 transition-colors duration-150"
                            title="تعديل الحساب والصلاحية"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            className="p-1.5 rounded-control border border-line hover:bg-danger-50 hover:text-danger text-ink-3 transition-colors duration-150"
                            title="حذف الحساب"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface rounded-card border border-line shadow-card w-full max-w-md overflow-hidden text-right">
            
            {/* Modal Header */}
            <div className="bg-brand-700 text-white p-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus size={16} />
                <span>{modalMode === 'create' ? 'إنشاء حساب جديد بواسطة السوبر أدمن' : 'تعديل بيانات الحساب والصلاحية'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-danger-50 text-danger border border-danger/20 rounded-control flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-success-50 text-success border border-success/20 rounded-control flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 text-success" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="font-semibold text-ink-2 block">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: أحمد محمد"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-10 text-sm w-full"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="font-semibold text-ink-2 block">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-10 text-sm w-full"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="font-semibold text-ink-2 block">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@m20fragrance.com"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-10 text-sm w-full"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="font-semibold text-ink-2 block">
                  {modalMode === 'create' ? 'كلمة المرور *' : 'تغيير كلمة المرور (اتركها فارغة للإبقاء على الحالية)'}
                </label>
                <input
                  type="password"
                  required={modalMode === 'create'}
                  minLength={4}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-10 text-sm w-full"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="font-semibold text-ink-2 block">
                  نوع الحساب والصلاحية *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-10 text-sm w-full"
                >
                  <option value="superadmin">سوبر أدمن (صلاحيات إدارية كاملة)</option>
                  <option value="admin">مسؤول / أدمن (إدارة المنتجات والطلبات)</option>
                  <option value="customer">عميل عادي</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {formSubmitting ? 'جاري الحفظ...' : modalMode === 'create' ? 'إنشاء الحساب' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

