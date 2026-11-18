import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Swal from 'sweetalert2';
import A4InvoiceSheets from '../components/orders/A4InvoiceSheets';
import { useLanguage } from '../context/LanguageContext';
import { EGYPT_GOVERNORATES, getGovernorateRate, getGovernorateObject } from '../data/egyptGovernorates';
import { 
  getOrders, 
  deleteOrder,
  bulkDeleteOrders,
  updateOrderStatus, 
  verifyOrderPayment, 
  confirmReturnRestock,
  processReturnRefund,
  getCashAccounts,
  getProducts,
  createAdminOrder
} from '../services/api';
import { 
  Truck, CheckCircle2, Clock, XCircle, Search, RefreshCw, 
  Eye, X, Tag, Smartphone, CreditCard, DollarSign, Home, Train, 
  MessageSquare, Phone, Mail, Printer, ShieldCheck, FileText, 
  ExternalLink, ZoomIn, ArrowUpDown, ChevronRight, Check, AlertCircle, Building, MapPin,
  Plus, Trash2, ShoppingBag, User, Wallet, RotateCcw, Undo2, AlertTriangle, Archive, Banknote, Save, Target
} from 'lucide-react';

const formatGovernorate = (govStr, isRTL) => {
  if (!govStr) return '-';
  const gov = getGovernorateObject(govStr);
  if (gov) {
    return isRTL ? gov.nameAr : gov.nameEn;
  }
  if (govStr.includes('(') && govStr.includes(')')) {
    const parts = govStr.split(/[()]/).filter(Boolean);
    return isRTL ? parts[0].trim() : (parts[1]?.trim() || parts[0].trim());
  }
  return govStr;
};

const statusConfig = {
  all: { labelAr: 'جميع الطلبات', labelEn: 'All Orders', color: 'text-ink-2', bg: 'bg-canvas', border: 'border-line' },
  pending: { labelAr: 'قيد الانتظار', labelEn: 'Pending', color: 'text-warning', bg: 'bg-warning-50', border: 'border-warning/20' },
  confirmed: { labelAr: 'تم التأكيد', labelEn: 'Confirmed', color: 'text-brand-700', bg: 'bg-brand-700/10', border: 'border-brand-700/25' },
  processing: { labelAr: 'جاري التجهيز', labelEn: 'Processing', color: 'text-warning', bg: 'bg-accent/15', border: 'border-accent/30' },
  shipped: { labelAr: 'جاري الشحن', labelEn: 'Shipped', color: 'text-info', bg: 'bg-info-50', border: 'border-info/20' },
  delivered: { labelAr: 'تم التوصيل', labelEn: 'Delivered', color: 'text-brand-700', bg: 'bg-brand-700/15', border: 'border-brand-700/30' },
  returned_from_shipping: { labelAr: 'مرتجع من الشحن', labelEn: 'Returned from Shipping', color: 'text-warning', bg: 'bg-warning-50/90', border: 'border-warning/20' },
  cancelled: { labelAr: 'ملغي', labelEn: 'Cancelled', color: 'text-danger', bg: 'bg-danger-50', border: 'border-danger/20' },
};

const renderPaymentMethodBadge = (method, isPaid, isRTL = true) => {
  let icon = <DollarSign size={12} strokeWidth={1.5} />;
  let label = isRTL ? 'عند الاستلام' : 'COD';
  
  if (method === 'vodafone_cash') {
    icon = <Smartphone size={12} strokeWidth={1.5} />;
    label = isRTL ? 'فودافون كاش' : 'Vodafone Cash';
  } else if (method === 'instapay') {
    icon = <Smartphone size={12} strokeWidth={1.5} />;
    label = isRTL ? 'إنستاباي' : 'InstaPay';
  } else if (method === 'card' || method === 'fawaterk') {
    icon = <CreditCard size={12} strokeWidth={1.5} />;
    label = isRTL ? 'دفع إلكتروني' : 'Card / Online';
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-canvas text-ink border border-line">
        {icon}
        <span>{label}</span>
      </span>
      {isPaid ? (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.2 rounded-full bg-success-50 text-success border border-success/20">
          <Check size={10} strokeWidth={2} /> {isRTL ? 'مدفوع' : 'Paid'}
        </span>
      ) : (
        <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.2 rounded-full bg-warning-50 text-warning border border-warning/20">
          {isRTL ? 'معلق' : 'Pending'}
        </span>
      )}
    </div>
  );
};

const initialNewOrderState = {
  customerName: '',
  customerPhone: '',
  customerPhone2: '',
  customerEmail: '',
  deliveryMethod: 'home_delivery',
  shippingAddress: {
    governorate: 'Giza',
    city: 'الجيزة',
    street: '',
    buildingNumber: '',
    floor: '',
    apartment: '',
    landmark: '',
    deliveryNotes: ''
  },
  metroPickup: {
    stationName: '',
    line: 'الخط الأول / الثاني',
    notes: ''
  },
  items: [
    { productId: '', size: '50ml', price: 1450, quantity: 1 }
  ],
  shipping: 65,
  discount: 0,
  paymentMethod: 'cash_on_delivery',
  paymentStatus: 'pending',
  orderStatus: 'confirmed',
  cashAccountId: '',
  adminNotes: ''
};

export default function OrdersPage() {
  const { lang, isRTL, formatCurrency } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const initialStatus = searchParams.get('status') || 'all';
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedChannel, setSelectedChannel] = useState('all');
  
  // Modals & Print Views
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [zoomReceiptUrl, setZoomReceiptUrl] = useState(null);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [printMode, setPrintMode] = useState(null); // 'invoice' | 'shipping' | null

  // Carrier Cost Inline Editing
  const [editingCarrierCost, setEditingCarrierCost] = useState(false);
  const [carrierCostInput, setCarrierCostInput] = useState('');
  const [savingCarrierCost, setSavingCarrierCost] = useState(false);

  // Create Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState(initialNewOrderState);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Return Shipping Modal State
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [returnForm, setReturnForm] = useState({
    outboundShippingCost: 65,
    returnShippingCost: 65,
    returnReason: 'رفض العميل الاستلام',
    paymentAccountId: '',
    notes: ''
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Customer Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState(null);
  const [refundForm, setRefundForm] = useState({
    refundAmount: 0,
    cashAccountId: '',
    notes: ''
  });
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [inspectingRestock, setInspectingRestock] = useState(false);

  // Bulk A4 invoice sheets
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [a4PerPage, setA4PerPage] = useState(4);
  const [showA4Sheets, setShowA4Sheets] = useState(false);

  const invoicePrintRef = useRef(null);
  const shippingPrintRef = useRef(null);

  const getItemImage = (item) => {
    if (item?.product && typeof item.product === 'object') {
      if (item.product.mainImage?.url) return item.product.mainImage.url;
      if (item.product.images?.[0]?.url) return item.product.images[0].url;
    }
    const prodId = item?.product?._id || item?.product || item?.productId;
    if (prodId && Array.isArray(productsList)) {
      const found = productsList.find(p => p._id === prodId || p.id === prodId);
      if (found?.mainImage?.url) return found.mainImage.url;
      if (found?.images?.[0]?.url) return found.images[0].url;
    }
    return '/img/product.png';
  };

  const fetchOrdersAndAccounts = async () => {
    setLoading(true);
    try {
      const [ordersData, accountsData, prodsData] = await Promise.all([
        getOrders({ sort: '-createdAt' }),
        getCashAccounts(),
        getProducts()
      ]);
      const ordersList = Array.isArray(ordersData) ? ordersData : [];
      setOrders(ordersList);
      setCashAccounts(Array.isArray(accountsData) ? accountsData : []);
      setProductsList(Array.isArray(prodsData) ? prodsData : []);

      const queryId = searchParams.get('id');
      if (queryId) {
        const found = ordersList.find(o => o._id === queryId);
        if (found) setSelectedOrder(found);
      }
    } catch (err) {
      console.error('Failed to fetch orders or accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndAccounts();
  }, []);

  useEffect(() => {
    const qStatus = searchParams.get('status');
    if (qStatus) setSelectedStatus(qStatus);
  }, [searchParams]);

  useEffect(() => {
    if (selectedOrder) {
      const defaultCost = Math.round(Number(
        selectedOrder.actualOutboundShippingCost ??
        selectedOrder.realShippingCost ??
        getGovernorateRate(selectedOrder.shippingAddress?.governorate) ??
        65
      ));
      setCarrierCostInput(defaultCost);
      setEditingCarrierCost(false);
    }
  }, [selectedOrder?._id]);

  const handleSaveCarrierCost = async () => {
    if (!selectedOrder) return;
    const cost = Math.max(0, Math.round(Number(carrierCostInput) || 0));
    setSavingCarrierCost(true);
    try {
      const res = await updateOrderStatus(selectedOrder._id, {
        actualOutboundShippingCost: cost
      });
      const updated = res || {
        ...selectedOrder,
        actualOutboundShippingCost: cost,
        realShippingCost: cost
      };
      setOrders(prev => prev.map(o => o._id === selectedOrder._id ? { ...o, ...updated, actualOutboundShippingCost: cost, realShippingCost: cost } : o));
      setSelectedOrder(prev => ({ ...prev, ...updated, actualOutboundShippingCost: cost, realShippingCost: cost }));
      setEditingCarrierCost(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: isRTL ? 'تم حفظ تكلفة الشحن الفعلية للشركة بنجاح' : 'Actual outbound carrier cost saved successfully',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        text: err.response?.data?.message || (isRTL ? 'تعذر حفظ تكلفة الشحن' : 'Failed to update carrier shipping cost')
      });
    } finally {
      setSavingCarrierCost(false);
    }
  };

  const handleOpenReturnModal = (order) => {
    setReturnModalOrder(order);
    const govRate = getGovernorateRate(order.shippingAddress?.governorate);
    const outFee = Math.round(Number(order.returnDetails?.outboundShippingFee ?? (order.actualOutboundShippingCost || order.realShippingCost || order.shipping || govRate || 65)));
    const retFee = Math.round(Number(order.returnDetails?.returnShippingFee ?? (order.actualReturnShippingCost || order.actualOutboundShippingCost || order.realShippingCost || order.shipping || govRate || 65)));
    setReturnForm({
      outboundShippingCost: outFee,
      returnShippingCost: retFee,
      returnReason: order.returnDetails?.returnReason || (isRTL ? 'رفض العميل الاستلام' : 'Customer Refused Delivery'),
      paymentAccountId: order.returnDetails?.paymentAccountId || (cashAccounts[0]?._id || ''),
      notes: order.returnDetails?.inspectionNotes || ''
    });
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'returned_from_shipping') {
      const targetOrder = orders.find(o => o._id === orderId) || (selectedOrder?._id === orderId ? selectedOrder : null);
      if (targetOrder) {
        handleOpenReturnModal(targetOrder);
        return;
      }
    }

    setUpdatingStatus(true);
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      const updated = res || { orderStatus: newStatus };
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updated, orderStatus: newStatus } : o));
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, ...updated, orderStatus: newStatus }));
      }
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: isRTL ? 'تم تحديث حالة الطلب بنجاح' : 'Order status updated successfully',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        text: err.response?.data?.message || (isRTL ? 'تعذر تحديث حالة الطلب' : 'Failed to update order status')
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnModalOrder) return;
    setSubmittingReturn(true);
    try {
      const outCost = Math.max(0, Math.round(Number(returnForm.outboundShippingCost) || 0));
      const retCost = Math.max(0, Math.round(Number(returnForm.returnShippingCost) || 0));
      const totalCharge = outCost + retCost;

      const res = await updateOrderStatus(returnModalOrder._id, {
        orderStatus: 'returned_from_shipping',
        outboundShippingCost: outCost,
        returnShippingCost: retCost,
        actualOutboundShippingCost: outCost,
        actualReturnShippingCost: retCost,
        returnReason: returnForm.returnReason,
        paymentAccountId: returnForm.paymentAccountId || null,
        notes: returnForm.notes
      });

      const updated = res || {
        ...returnModalOrder,
        orderStatus: 'returned_from_shipping',
        actualOutboundShippingCost: outCost,
        actualReturnShippingCost: retCost,
        realShippingCost: outCost,
        returnDetails: {
          isReturned: true,
          returnedAt: new Date(),
          outboundShippingFee: outCost,
          returnShippingFee: retCost,
          totalReturnShippingCost: totalCharge,
          returnReason: returnForm.returnReason,
          restockStatus: 'not_inspected',
          shippingExpenseRecorded: totalCharge > 0
        }
      };

      setOrders(prev => prev.map(o => o._id === returnModalOrder._id ? { ...o, ...updated } : o));
      if (selectedOrder && selectedOrder._id === returnModalOrder._id) {
        setSelectedOrder(prev => ({ ...prev, ...updated }));
      }

      setReturnModalOrder(null);
      Swal.fire({
        icon: 'success',
        title: isRTL ? 'تم تسجيل المرتجع ومصروف الشحن' : 'Return and shipping expense recorded',
        text: isRTL 
          ? `تم تعيين حالة الطلب إلى "مرتجع من الشحن"، وإدراج مصاريف الشحن (${totalCharge} ج.م) كمصروف في الحسابات دون المساس بالمخزون حتى الفحص.`
          : `Order status set to "Returned from Shipping", carrier charges (${totalCharge} EGP) recorded under Shipping Expenses.`
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: isRTL ? 'خطأ' : 'Error',
        text: err.response?.data?.message || (isRTL ? 'تعذر تسجيل بيانات المرتجع' : 'Failed to record return details')
      });
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleConfirmRestock = async (order, outcome) => {
    const isReusable = outcome === 'reusable';
    const result = await Swal.fire({
      title: isReusable ? 'تأكيد سلامة المنتجات واسترجاع السائل' : 'تسجيل تلف المنتجات المسترجعة',
      text: isReusable 
        ? 'هل تم فحص زجاجات العطر والتأكد من أنها سليمة ومغلقة تماماً؟ سيتم إعادة السائل الفعلي إلى رصيد Finished Liquid وتسجيل حركة RETURN بالمخزون.'
        : 'هل الزجاجات تالفة أو مفتوحة؟ سيتم تسجيل تلف الشحنة واستبعادها ولن يتم إضافتها للمخزون.',
      input: 'text',
      inputPlaceholder: 'ملاحظات الفحص والمعاينة (اختياري)...',
      icon: isReusable ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: isReusable ? 'تأكيد واسترجاع للمخزون' : 'تأكيد تسجيل التلف واستبعادها',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: isReusable ? '#174F43' : '#DC2626'
    });

    if (!result.isConfirmed) return;

    setInspectingRestock(true);
    try {
      const updated = await confirmReturnRestock(order._id, {
        inspectionOutcome: outcome,
        inspectionNotes: result.value || ''
      });

      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, ...updated } : o));
      if (selectedOrder && selectedOrder._id === order._id) {
        setSelectedOrder(prev => ({ ...prev, ...updated }));
      }

      Swal.fire({
        icon: 'success',
        title: isReusable ? 'تم استرجاع السائل للمخزون بنجاح' : 'تم توثيق تلف المرتجع',
        text: isReusable 
          ? 'تمت إضافة السائل للمخزون وتسجيل حركة في سجل المخزون.' 
          : 'تم توثيق التلف دون التأثير على المخزون.'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: err.response?.data?.message || 'تعذر إتمام عملية الفحص والاسترجاع'
      });
    } finally {
      setInspectingRestock(false);
    }
  };

  const handleOpenRefundModal = (order) => {
    setRefundModalOrder(order);
    setRefundForm({
      refundAmount: order.total || 0,
      cashAccountId: order.cashAccount || (cashAccounts[0]?._id || ''),
      notes: 'استرداد كامل لقيمة الطلب بعد رفض الاستلام وارتجاع الشحنة'
    });
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    if (!refundModalOrder) return;
    setSubmittingRefund(true);
    try {
      const updated = await processReturnRefund(refundModalOrder._id, refundForm);
      setOrders(prev => prev.map(o => o._id === refundModalOrder._id ? { ...o, ...updated } : o));
      if (selectedOrder && selectedOrder._id === refundModalOrder._id) {
        setSelectedOrder(prev => ({ ...prev, ...updated }));
      }
      setRefundModalOrder(null);
      Swal.fire({
        icon: 'success',
        title: 'تم استرداد المبلغ بنجاح',
        text: `تم خصم ${refundForm.refundAmount} ج.م من الخزينة المحددة وتسجيل حركة الاسترداد.`
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: err.response?.data?.message || 'تعذر معالجة الاسترداد'
      });
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedOrder) return;
    setVerifyingPayment(true);
    try {
      const res = await verifyOrderPayment(selectedOrder._id, {
        cashAccountId: selectedCashAccountId || null,
        amountReceived: selectedOrder.total
      });

      const updated = res || { ...selectedOrder, paymentStatus: 'paid', orderStatus: 'confirmed' };
      setOrders(prev => prev.map(o => o._id === selectedOrder._id ? { ...o, paymentStatus: 'paid', orderStatus: 'confirmed' } : o));
      setSelectedOrder(prev => ({ ...prev, paymentStatus: 'paid', orderStatus: 'confirmed' }));

      Swal.fire({
        icon: 'success',
        title: 'تم التحقق من الدفع وإيداعه بنجاح!',
        text: `تم تأكيد سداد الطلب #${selectedOrder.orderNumber} وترحيل المبلغ إلى حساب الخزينة المحدد وإرسال إشعار للعميل.`,
        confirmButtonColor: '#174F43',
        confirmButtonText: 'حسناً'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ في التحقق',
        text: err.response?.data?.message || 'تعذر التحقق من الدفع'
      });
    } finally {
      setVerifyingPayment(false);
    }
  };

  // ---- Delete orders (single / selected / all) ----
  const askDeleteConfirm = async ({ title, text, requireText }) => {
    const res = await Swal.fire({
      icon: 'warning',
      title,
      html: `<div style="text-align:right;font-size:13px;line-height:1.7">${text}</div>
        <label style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:12px;font-size:13px">
          <span>إرجاع المخزون (السائل والتغليف) للطلبات التي تم خصم مخزونها</span>
          <input id="swal-restock" type="checkbox" checked />
        </label>
        ${requireText ? `<p style="margin-top:12px;font-size:12px">اكتب <b>${requireText}</b> للتأكيد:</p><input id="swal-confirm-text" class="swal2-input" style="margin:6px auto 0" dir="ltr" />` : ''}`,
      showCancelButton: true,
      confirmButtonText: 'حذف نهائي',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#B91C1C',
      focusCancel: true,
      preConfirm: () => {
        const restoreStock = !!document.getElementById('swal-restock')?.checked;
        if (requireText) {
          const v = (document.getElementById('swal-confirm-text')?.value || '').trim();
          if (v !== requireText) {
            Swal.showValidationMessage('نص التأكيد غير مطابق');
            return false;
          }
        }
        return { restoreStock };
      }
    });
    return res.isConfirmed ? res.value : null;
  };

  const runDelete = async (fn, successText) => {
    try {
      await fn();
      setSelectedOrder(null);
      setSelectedIds(new Set());
      await fetchOrdersAndAccounts();
      Swal.fire({ icon: 'success', title: 'تم الحذف', text: successText, timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'تعذر الحذف', text: err.response?.data?.message || err.message || 'حدث خطأ غير متوقع' });
    }
  };

  const handleDeleteOrder = async (order) => {
    const opts = await askDeleteConfirm({
      title: `حذف الطلب #${order.orderNumber}؟`,
      text: 'سيتم حذف هذا الطلب نهائياً ولا يمكن التراجع.'
    });
    if (!opts) return;
    await runDelete(() => deleteOrder(order._id, opts.restoreStock), `تم حذف الطلب #${order.orderNumber}`);
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const opts = await askDeleteConfirm({
      title: `حذف ${ids.length} طلب؟`,
      text: `سيتم حذف الطلبات المحددة (${ids.length}) نهائياً ولا يمكن التراجع.`,
      requireText: ids.length > 5 ? 'DELETE' : null
    });
    if (!opts) return;
    await runDelete(() => bulkDeleteOrders({ ids, restoreStock: opts.restoreStock }), `تم حذف ${ids.length} طلب`);
  };

  const handleDeleteAll = async () => {
    const opts = await askDeleteConfirm({
      title: 'حذف كل الطلبات؟',
      text: `سيتم حذف <b>جميع الطلبات (${orders.length})</b> في النظام نهائياً، بما فيها المخفية بالفلترة. لا يمكن التراجع.<br/>أرصدة الخزائن لا تتغير، عدّلها من صفحة المالية إن لزم.`,
      requireText: 'DELETE ALL ORDERS'
    });
    if (!opts) return;
    await runDelete(
      () => bulkDeleteOrders({ all: true, confirm: 'DELETE ALL ORDERS', restoreStock: opts.restoreStock }),
      'تم حذف جميع الطلبات'
    );
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Create Order Handlers
  const handleOpenCreateOrder = () => {
    const firstProd = productsList[0];
    const firstVariant = firstProd?.variants?.find(v => v.size === '50ml') || firstProd?.variants?.[0];
    
    setCreateFormData({
      ...initialNewOrderState,
      items: [
        {
          productId: firstProd?._id || '',
          size: firstVariant?.size || '50ml',
          price: firstVariant?.price || 1450,
          quantity: 1
        }
      ]
    });
    setShowCreateModal(true);
  };

  const handleAddItemRow = () => {
    const firstProd = productsList[0];
    const firstVariant = firstProd?.variants?.find(v => v.size === '50ml') || firstProd?.variants?.[0];
    setCreateFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: firstProd?._id || '',
          size: firstVariant?.size || '50ml',
          price: firstVariant?.price || 1450,
          quantity: 1
        }
      ]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (createFormData.items.length <= 1) return;
    setCreateFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const handleItemProductOrSizeChange = (index, field, value) => {
    setCreateFormData(prev => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      const prod = productsList.find(p => p._id === (field === 'productId' ? value : item.productId));
      if (prod) {
        if (field === 'productId') {
          const v = prod.variants?.find(variant => variant.size === item.size) || prod.variants?.[0];
          if (v) {
            item.price = v.price;
            item.size = v.size;
          }
        } else if (field === 'size') {
          const v = prod.variants?.find(variant => variant.size === value);
          if (v) {
            item.price = v.price;
          }
        }
      }

      updated[index] = item;
      return { ...prev, items: updated };
    });
  };

  const handleItemQtyOrPriceChange = (index, field, value) => {
    setCreateFormData(prev => {
      const updated = [...prev.items];
      updated[index] = {
        ...updated[index],
        [field]: Number(value)
      };
      return { ...prev, items: updated };
    });
  };

  const createOrderSubtotal = createFormData.items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0
  );
  const createOrderTotal = Math.max(0, createOrderSubtotal + Number(createFormData.shipping || 0) - Number(createFormData.discount || 0));

  const handleSubmitCreateOrder = async (e) => {
    e.preventDefault();
    if (!createFormData.customerPhone?.trim()) {
      Swal.fire({ icon: 'warning', title: 'بيانات ناقصة', text: 'يرجى إدخال رقم هاتف العميل' });
      return;
    }

    if (!createFormData.items.length || !createFormData.items[0].productId) {
      Swal.fire({ icon: 'warning', title: 'بيانات ناقصة', text: 'يرجى اختيار عطر واحد على الأقل' });
      return;
    }

    setCreatingOrder(true);
    try {
      const payload = {
        customerName: createFormData.customerName?.trim() || 'عميل M20',
        customerPhone: createFormData.customerPhone.trim(),
        customerPhone2: createFormData.customerPhone2?.trim() || null,
        customerEmail: createFormData.customerEmail?.trim() || null,
        deliveryMethod: createFormData.deliveryMethod,
        shippingAddress: createFormData.deliveryMethod === 'home_delivery' ? createFormData.shippingAddress : {},
        metroPickup: createFormData.deliveryMethod === 'metro_pickup' ? createFormData.metroPickup : null,
        items: createFormData.items.map(i => ({
          productId: i.productId,
          size: i.size,
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1
        })),
        shipping: Number(createFormData.shipping) || 0,
        discount: Number(createFormData.discount) || 0,
        paymentMethod: createFormData.paymentMethod,
        paymentStatus: createFormData.paymentStatus,
        orderStatus: createFormData.orderStatus,
        cashAccountId: createFormData.cashAccountId || null,
        adminNotes: createFormData.adminNotes || 'تم إنشاؤه يدوياً من لوحة التحكم'
      };

      const res = await createAdminOrder(payload);
      setShowCreateModal(false);
      await fetchOrdersAndAccounts();

      Swal.fire({
        icon: 'success',
        title: 'تم إنشاء الطلب بنجاح!',
        text: `تم تسجيل الطلب رقم #${res.orderNumber || ''} بنجاح ويمكنك الآن طباعة الفاتورة أو البوليصة.`,
        confirmButtonColor: '#174F43',
        confirmButtonText: 'عرض تفاصيل الطلب'
      }).then(() => {
        if (res) setSelectedOrder(res);
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'تعذر إنشاء الطلب',
        text: err.response?.data?.message || 'حدث خطأ أثناء حفظ الطلب'
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.orderStatus === 'pending').length,
    confirmed: orders.filter(o => o.orderStatus === 'confirmed').length,
    processing: orders.filter(o => o.orderStatus === 'processing').length,
    shipped: orders.filter(o => o.orderStatus === 'shipped').length,
    delivered: orders.filter(o => o.orderStatus === 'delivered').length,
    returned_from_shipping: orders.filter(o => o.orderStatus === 'returned_from_shipping').length,
    cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
  };

  const marketingMetrics = React.useMemo(() => {
    const summary = {
      meta: { orders: 0, revenue: 0 },
      tiktok: { orders: 0, revenue: 0 },
      google: { orders: 0, revenue: 0 },
      direct: { orders: 0, revenue: 0 },
      other: { orders: 0, revenue: 0 }
    };

    let totalRevenue = 0;
    const campaignsMap = {};

    orders.forEach((o) => {
      const ch = (o.attribution?.channel || 'direct').toLowerCase();
      const target = summary[ch] ? summary[ch] : summary.other;
      target.orders += 1;

      if (['confirmed', 'processing', 'shipped', 'delivered'].includes(o.orderStatus)) {
        const rev = Math.round(Number(o.total || 0));
        target.revenue += rev;
        totalRevenue += rev;
      }

      if (o.attribution?.campaign) {
        const camp = o.attribution.campaign;
        campaignsMap[camp] = (campaignsMap[camp] || 0) + 1;
      }
    });

    const topCampaigns = Object.entries(campaignsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      channels: summary,
      totalRevenue,
      topCampaigns
    };
  }, [orders]);

  const filteredOrders = orders.filter(o => {
    const term = search.toLowerCase();
    const orderNum = (o.orderNumber || o._id || '').toLowerCase();
    const customerName = (o.customer?.name || '').toLowerCase();
    const phone = (o.customerPhone || o.customer?.phone || '').toLowerCase();
    const phone2 = (o.customerPhone2 || '').toLowerCase();
    const email = (o.customerEmail || o.customer?.email || '').toLowerCase();
    const coupon = (o.couponCode || '').toLowerCase();
    
    const matchesSearch = orderNum.includes(term) || customerName.includes(term) || phone.includes(term) || phone2.includes(term) || email.includes(term) || coupon.includes(term);
    const matchesStatus = selectedStatus === 'all' || o.orderStatus === selectedStatus;
    const matchesChannel = selectedChannel === 'all' || (o.attribution?.channel || 'direct').toLowerCase() === selectedChannel.toLowerCase();

    return matchesSearch && matchesStatus && matchesChannel;
  });

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-semibold text-ink leading-tight">
                إدارة الطلبات والشحنات والفواتير
              </h1>
              <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">
                إنشاء طلبات يدوية، التحقق الفوري من إيصالات الدفع، إدارة المرتجعات، وإصدار الفواتير وبوالص الشحن.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateOrder}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Plus size={16} />
            <span>إنشاء طلب يدوي جديد</span>
          </button>

          <button
            onClick={handleDeleteAll}
            disabled={orders.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-danger border border-danger/20 font-medium transition-colors duration-150 hover:bg-danger-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Trash2 size={14} />
            <span>حذف كل الطلبات</span>
          </button>

          <button
            onClick={fetchOrdersAndAccounts}
            className="p-2.5 rounded-card border border-line bg-surface/80 backdrop-blur hover:bg-canvas text-ink-2 transition-all duration-150 shadow-card"
            title="تحديث"
          >
            <RefreshCw size={14} strokeWidth={1.7} className={loading ? 'animate-spin text-brand-700' : ''} />
          </button>
        </div>
      </div>

      {/* Status Filter Cards with Glass & Glow */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          { key: 'all', label: 'الكل', count: statusCounts.all, icon: FileText },
          { key: 'pending', label: 'قيد المراجعة', count: statusCounts.pending, icon: Clock, color: 'text-warning' },
          { key: 'confirmed', label: 'تم التأكيد', count: statusCounts.confirmed, icon: CheckCircle2, color: 'text-brand-700' },
          { key: 'processing', label: 'جاري التجهيز', count: statusCounts.processing, icon: RefreshCw, color: 'text-accent' },
          { key: 'shipped', label: 'جاري الشحن', count: statusCounts.shipped, icon: Truck, color: 'text-info' },
          { key: 'delivered', label: 'تم التوصيل', count: statusCounts.delivered, icon: CheckCircle2, color: 'text-brand-700' },
          { key: 'returned_from_shipping', label: 'مرتجع شحن', count: statusCounts.returned_from_shipping, icon: RotateCcw, color: 'text-warning' },
          { key: 'cancelled', label: 'ملغي', count: statusCounts.cancelled, icon: XCircle, color: 'text-danger' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = selectedStatus === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                setSelectedStatus(item.key);
                setSearchParams(item.key === 'all' ? {} : { status: item.key });
              }}
              className={`p-3.5 rounded-2xl border text-right transition-all duration-200 relative overflow-hidden ${
                isActive 
                  ? 'bg-brand-700 text-white border-brand-700 shadow-lg shadow-[#174F43]/20 scale-[1.02]' 
                  : 'bg-surface/80 backdrop-blur-md border-line text-ink-2 hover:border-line hover:bg-surface shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{item.label}</span>
                <Icon size={16} strokeWidth={1.8} className={isActive ? 'text-white' : item.color || 'text-ink-3'} />
              </div>
              <p className={`text-lg font-black mt-1.5 ${isActive ? 'text-white' : 'text-ink'}`}>
                {item.count} <span className="text-xs font-normal opacity-80">طلب</span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Marketing Attribution & Channels Analytics Bar */}
      <div className="bg-surface rounded-card p-4 border border-line shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-700" />
            <h3 className="text-xs font-semibold text-brand-700">
              {isRTL ? 'تحليلات قنوات التسويق والاستحواذ (Attribution & Campaigns)' : 'Marketing & Attribution Channels'}
            </h3>
          </div>
          {marketingMetrics.topCampaigns.length > 0 && (
            <div className="text-xs text-ink-2 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-ink-2">{isRTL ? 'أبرز الحملات:' : 'Top Campaigns:'}</span>
              {marketingMetrics.topCampaigns.map(([camp, count]) => (
                <span key={camp} className="px-2 py-0.5 rounded-control bg-canvas font-mono text-xs text-ink-2 border border-line">
                  {camp} ({count})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Meta */}
          <div 
            onClick={() => setSelectedChannel(selectedChannel === 'meta' ? 'all' : 'meta')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'meta'
                ? 'bg-brand-700/10 border-brand-700 ring-1 ring-brand-700'
                : 'bg-canvas/60 border-line hover:bg-canvas/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-info">Meta (FB / IG)</span>
              <span className="text-xs px-1.5 py-0.2 rounded-control bg-info-50 text-info font-mono font-semibold">
                {marketingMetrics.channels.meta.orders} {isRTL ? 'طلب' : 'orders'}
              </span>
            </div>
            <div className="font-mono font-semibold text-sm text-brand-700">
              {marketingMetrics.channels.meta.revenue.toLocaleString()} ج.م
            </div>
            <span className="text-xs text-ink-3 block mt-0.5">
              {orders.length > 0 ? Math.round((marketingMetrics.channels.meta.orders / orders.length) * 100) : 0}% {isRTL ? 'حصة التحويل' : 'share'}
            </span>
          </div>

          {/* TikTok */}
          <div 
            onClick={() => setSelectedChannel(selectedChannel === 'tiktok' ? 'all' : 'tiktok')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'tiktok'
                ? 'bg-black/10 border-black ring-1 ring-black'
                : 'bg-canvas/60 border-line hover:bg-canvas/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-ink">TikTok</span>
              <span className="text-xs px-1.5 py-0.2 rounded-control bg-line text-ink font-mono font-semibold">
                {marketingMetrics.channels.tiktok.orders} {isRTL ? 'طلب' : 'orders'}
              </span>
            </div>
            <div className="font-mono font-semibold text-sm text-ink">
              {marketingMetrics.channels.tiktok.revenue.toLocaleString()} ج.م
            </div>
            <span className="text-xs text-ink-3 block mt-0.5">
              {orders.length > 0 ? Math.round((marketingMetrics.channels.tiktok.orders / orders.length) * 100) : 0}% {isRTL ? 'حصة التحويل' : 'share'}
            </span>
          </div>

          {/* Google / Search */}
          <div 
            onClick={() => setSelectedChannel(selectedChannel === 'google' ? 'all' : 'google')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'google'
                ? 'bg-info-50 border-info ring-1 ring-info'
                : 'bg-canvas/60 border-line hover:bg-canvas/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-info">Google / Search</span>
              <span className="text-xs px-1.5 py-0.2 rounded-control bg-info-50 text-info font-mono font-semibold">
                {marketingMetrics.channels.google.orders} {isRTL ? 'طلب' : 'orders'}
              </span>
            </div>
            <div className="font-mono font-semibold text-sm text-info">
              {marketingMetrics.channels.google.revenue.toLocaleString()} ج.م
            </div>
            <span className="text-xs text-ink-3 block mt-0.5">
              {orders.length > 0 ? Math.round((marketingMetrics.channels.google.orders / orders.length) * 100) : 0}% {isRTL ? 'حصة التحويل' : 'share'}
            </span>
          </div>

          {/* Direct / Organic */}
          <div 
            onClick={() => setSelectedChannel(selectedChannel === 'direct' ? 'all' : 'direct')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedChannel === 'direct'
                ? 'bg-line border-ink-3 ring-1 ring-ink-3'
                : 'bg-canvas/60 border-line hover:bg-canvas/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-ink">مباشر (Direct)</span>
              <span className="text-xs px-1.5 py-0.2 rounded-control bg-line text-ink font-mono font-semibold">
                {marketingMetrics.channels.direct.orders} {isRTL ? 'طلب' : 'orders'}
              </span>
            </div>
            <div className="font-mono font-semibold text-sm text-ink">
              {marketingMetrics.channels.direct.revenue.toLocaleString()} ج.م
            </div>
            <span className="text-xs text-ink-3 block mt-0.5">
              {orders.length > 0 ? Math.round((marketingMetrics.channels.direct.orders / orders.length) * 100) : 0}% {isRTL ? 'حصة التحويل' : 'share'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface/90 backdrop-blur-md rounded-card p-4 border border-line shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="بحث برقم الطلب، اسم العميل، الهاتف، الإيميل أو الكوبون..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full pr-10"
            />
            <Search size={16} className="text-ink-3 absolute right-3.5 top-3" />
          </div>

          {/* Acquisition Channel Filter Dropdown */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full sm:w-auto"
          >
            <option value="all">جميع قنوات التسويق</option>
            <option value="meta">Meta (Facebook & Instagram)</option>
            <option value="tiktok">TikTok</option>
            <option value="google">Google / Search</option>
            <option value="direct">مباشر (Direct / Organic)</option>
          </select>
        </div>

        <div className="text-xs text-ink-2 font-medium w-full sm:w-auto text-left flex items-center gap-3">
          <span>النتائج المعروضة: <strong>{filteredOrders.length}</strong> طلب</span>
          {(selectedStatus !== 'all' || selectedChannel !== 'all') && (
            <button
              onClick={() => { setSelectedStatus('all'); setSelectedChannel('all'); setSearchParams({}); }}
              className="text-brand-700 font-semibold hover:underline"
            >
              إلغاء الفلترة
            </button>
          )}
        </div>
      </div>

      {/* Bulk A4 invoice toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-brand-700/5 border border-brand-700/30 rounded-card px-4 py-3 text-xs">
          <span className="font-semibold text-brand-700">تم تحديد {selectedIds.size} طلب</span>
          <div className="flex items-center gap-1.5">
            <span className="text-ink-2">عدد الفواتير في الورقة:</span>
            {[4, 6].map((n) => (
              <button
                key={n}
                onClick={() => setA4PerPage(n)}
                className={`px-3 h-8 rounded-lg font-bold border transition-colors ${a4PerPage === n ? 'bg-brand-700 text-white border-brand-700' : 'bg-surface text-ink-2 border-line hover:bg-canvas'}`}
              >
                {n} فواتير
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowA4Sheets(true)}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
          >
            <Printer size={14} />
            <span>طباعة / تصدير A4 ({Math.ceil(selectedIds.size / a4PerPage)} ورقة)</span>
          </button>
          <button
            onClick={handleDeleteSelected}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-danger text-white font-medium shadow-card transition-colors duration-150 hover:bg-red-800 cursor-pointer whitespace-nowrap h-8 px-3 text-xs"
          >
            <Trash2 size={14} />
            <span>حذف المحدد ({selectedIds.size})</span>
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-ink-2 hover:underline font-semibold">
            إلغاء التحديد
          </button>
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-ink-2 bg-surface/60 rounded-card border border-line">
          <RefreshCw size={24} className="animate-spin text-brand-700 mx-auto mb-2" />
          <span>جاري تحميل قائمة الطلبات والشحنات...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-surface rounded-card border border-line p-12 text-center text-ink-2 space-y-3 shadow-card">
          <Truck size={36} className="mx-auto text-ink-3" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-ink">لا توجد طلبات مطابقة</h3>
          <p className="text-xs text-ink-3">يمكنك الضغط على "إنشاء طلب يدوي جديد" لتسجيل طلب جديد فوراً.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-canvas text-ink-2 border-b border-line font-semibold">
                <tr>
                  <th className="p-3.5 w-8">
                    <input
                      type="checkbox"
                      aria-label="تحديد كل الطلبات"
                      className="cursor-pointer accent-brand-700"
                      checked={filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o._id))}
                      onChange={(e) =>
                        setSelectedIds(e.target.checked ? new Set(filteredOrders.map((o) => o._id)) : new Set())
                      }
                    />
                  </th>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">العميل & الهاتف</th>
                  <th className="p-3.5">طريقة الاستلام & المحافظة</th>
                  <th className="p-3.5">محتويات الطلب</th>
                  <th className="p-3.5">طريقة الدفع</th>
                  <th className="p-3.5">الإجمالي</th>
                  <th className="p-3.5">حالة الطلب</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredOrders.map((order) => {
                  const isPaid = order.paymentStatus === 'paid';
                  const hasProof = !!(order.paymentScreenshot || order.paymentProofUrl);
                  return (
                    <tr key={order._id} className="hover:bg-canvas/70 transition-colors">
                      <td className="p-3.5 w-8">
                        <input
                          type="checkbox"
                          aria-label={`تحديد الطلب ${order.orderNumber}`}
                          className="cursor-pointer accent-brand-700"
                          checked={selectedIds.has(order._id)}
                          onChange={(e) =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(order._id); else next.delete(order._id);
                              return next;
                            })
                          }
                        />
                      </td>
                      {/* Order Number & Date */}
                      <td className="p-3.5 font-mono font-semibold text-brand-700">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="hover:underline flex items-center gap-1 text-xs"
                        >
                          <span>#{order.orderNumber}</span>
                        </button>
                        <span className="text-xs text-ink-3 block font-sans font-normal mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {order.attribution?.channel && (
                          <span className={`inline-block text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded mt-1 border ${
                            order.attribution.channel === 'meta'
                              ? 'bg-info-50 text-info border-info/20'
                              : order.attribution.channel === 'tiktok'
                              ? 'bg-ink text-white border-ink-3'
                              : order.attribution.channel === 'google'
                              ? 'bg-info-50 text-info border-info/20'
                              : 'bg-canvas text-ink-2 border-line'
                          }`}>
                            {order.attribution.channel.toUpperCase()}
                            {order.attribution.campaign ? ` : ${order.attribution.campaign}` : ''}
                          </span>
                        )}
                      </td>

                      {/* Customer Info */}
                      <td className="p-3.5">
                        <span className="font-semibold text-ink block">{order.customer?.name || 'عميل زائر'}</span>
                        <span className="text-xs font-mono text-ink-2 block dir-ltr text-right">{order.customerPhone || order.customer?.phone}</span>
                        {order.customerPhone2 && (
                          <span className="text-xs font-mono text-ink-3 block dir-ltr text-right">{order.customerPhone2}</span>
                        )}
                      </td>

                      {/* Delivery Info */}
                      <td className="p-3.5">
                        {order.deliveryMethod === 'metro_pickup' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-info bg-info-50 px-2 py-0.5 rounded-control border border-info/20">
                            <Train size={12} /> {order.metroPickup?.stationNameAr || order.metroPickup?.stationName || (isRTL ? 'محطة مترو' : 'Metro Station')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-2">
                            <Home size={12} className="text-ink-3" />
                            <span>{formatGovernorate(order.shippingAddress?.governorate, isRTL) || (isRTL ? 'توصيل منزلي' : 'Home Delivery')}</span>
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="p-3.5">
                        <span className="text-xs font-semibold text-ink">
                          {order.items?.length || 0} {isRTL ? 'عطر' : 'Items'}
                        </span>
                        <span className="text-xs text-ink-3 block truncate max-w-[150px]">
                          {order.items?.map(i => `${i.productName} (${i.size})`).join(', ')}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {renderPaymentMethodBadge(order.paymentMethod, isPaid, isRTL)}
                          {hasProof && (
                            <button
                              onClick={() => setZoomReceiptUrl(order.paymentScreenshot || order.paymentProofUrl)}
                              className="text-xs text-info hover:underline flex items-center gap-0.5 font-semibold"
                            >
                              <Eye size={10} /> {isRTL ? 'معاينة الإيصال' : 'View Proof'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="p-3.5 font-mono font-semibold text-ink text-xs">
                        {order.total?.toLocaleString()} ج.م
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <select
                          value={order.orderStatus}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none ${
                            statusConfig[order.orderStatus]?.bg || 'bg-canvas'
                          } ${statusConfig[order.orderStatus]?.color || 'text-ink'} ${
                            statusConfig[order.orderStatus]?.border || 'border-line'
                          }`}
                        >
                          <option value="pending">قيد الانتظار</option>
                          <option value="confirmed">تم التأكيد</option>
                          <option value="processing">جاري التجهيز</option>
                          <option value="shipped">جاري الشحن</option>
                          <option value="delivered">تم التوصيل</option>
                          <option value="returned_from_shipping">مرتجع من الشحن</option>
                          <option value="cancelled">ملغي</option>
                        </select>

                        {order.orderStatus === 'returned_from_shipping' && (
                          <div className="mt-1 flex flex-col gap-0.5 text-xs">
                            {order.returnDetails?.totalReturnShippingCost > 0 && (
                              <span className="font-mono text-warning font-semibold">
                                شحن: {order.returnDetails.totalReturnShippingCost} ج.م
                              </span>
                            )}
                            {order.returnDetails?.restockStatus === 'inspected_restocked' ? (
                              <span className="text-success font-semibold">✓ تم استرجاع المخزون</span>
                            ) : order.returnDetails?.restockStatus === 'inspected_damaged_discarded' ? (
                              <span className="text-danger font-semibold">✕ تالف / مستبعد</span>
                            ) : (
                              <span className="text-warning font-medium">بانتظار الفحص</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-control bg-canvas hover:bg-brand-700 hover:text-white text-ink-2 transition-colors"
                            title="عرض تفاصيل الطلب والفاتورة"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); handlePrint('shipping'); }}
                            className="p-1.5 rounded-control bg-canvas hover:bg-line text-ink-2 transition-colors"
                            title="طباعة بوليصة الشحن"
                          >
                            <Truck size={14} />
                          </button>
                          <button
                            onClick={() => { setSelectedOrder(order); handlePrint('invoice'); }}
                            className="p-1.5 rounded-control bg-canvas hover:bg-line text-ink-2 transition-colors"
                            title="طباعة فاتورة 10×15 سم"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-1.5 rounded-control bg-danger-50 hover:bg-danger/20 text-danger transition-colors"
                            title="حذف الطلب"
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
        </div>
      )}

      {/* CREATE MANUAL ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 rtl bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-surface rounded-card border border-line shadow-pop z-10 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line bg-canvas flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-control bg-brand-700/10 text-brand-700 flex items-center justify-center">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-brand-700">إنشاء طلب جديد يدوياً (Manual Order)</h2>
                  <p className="text-xs text-ink-3">تسجيل طلب مخصص، تحديد العطور والأحجام، وحساب الإجمالي</p>
                </div>
              </div>

              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-ink-3 hover:text-ink-2 rounded-control">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitCreateOrder} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              {/* Section 1: Customer Information */}
              <div className="p-4 bg-canvas/70 border border-line rounded-card space-y-3">
                <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                  <User size={15} />
                  <span>بيانات العميل (Customer Details)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">اسم العميل *</label>
                    <input
                      type="text"
                      required
                      value={createFormData.customerName}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerName: e.target.value })}
                      placeholder="مثال: أحمد محمد"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">رقم الهاتف الأساسي (WhatsApp/الاتصال) *</label>
                    <input
                      type="tel"
                      required
                      value={createFormData.customerPhone}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerPhone: e.target.value })}
                      placeholder="010xxxxxxxx"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">رقم هاتف إضافي (اختياري)</label>
                    <input
                      type="tel"
                      value={createFormData.customerPhone2}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerPhone2: e.target.value })}
                      placeholder="011xxxxxxxx"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-2 mb-1">البريد الإلكتروني (اختياري)</label>
                    <input
                      type="email"
                      value={createFormData.customerEmail}
                      onChange={(e) => setCreateFormData({ ...createFormData, customerEmail: e.target.value })}
                      placeholder="customer@gmail.com"
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Delivery & Shipping Details */}
              <div className="p-4 bg-canvas/70 border border-line rounded-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <Truck size={15} />
                    <span>{isRTL ? 'طريقة التوصيل والعنوان' : 'Delivery Method & Address'}</span>
                  </span>

                  <div className="flex items-center gap-1 bg-line/70 p-1 rounded-control">
                    <button
                      type="button"
                      onClick={() => setCreateFormData({
                        ...createFormData,
                        deliveryMethod: 'home_delivery',
                        shipping: getGovernorateRate(createFormData.shippingAddress.governorate) || 65
                      })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        createFormData.deliveryMethod === 'home_delivery' ? 'bg-brand-700 text-white shadow-2xs' : 'text-ink-2'
                      }`}
                    >
                      {isRTL ? 'توصيل منزلي' : 'Home Delivery'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, deliveryMethod: 'metro_pickup', shipping: 0 })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        createFormData.deliveryMethod === 'metro_pickup' ? 'bg-info text-white shadow-2xs' : 'text-ink-2'
                      }`}
                    >
                      {isRTL ? 'استلام محطة مترو' : 'Metro Pickup'}
                    </button>
                  </div>
                </div>

                {createFormData.deliveryMethod === 'home_delivery' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-ink-2 mb-1">{isRTL ? 'المحافظة *' : 'Governorate *'}</label>
                      <select
                        value={createFormData.shippingAddress.governorate}
                        onChange={(e) => {
                          const selGov = e.target.value;
                          const rate = getGovernorateRate(selGov);
                          setCreateFormData(prev => ({
                            ...prev,
                            shipping: rate,
                            shippingAddress: { ...prev.shippingAddress, governorate: selGov }
                          }));
                        }}
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      >
                        {EGYPT_GOVERNORATES.map(gov => (
                          <option key={gov.id} value={isRTL ? gov.nameAr : gov.nameEn}>
                            {isRTL ? `${gov.nameAr} (${gov.defaultRate} ج.م)` : `${gov.nameEn} (${gov.defaultRate} EGP)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-2 mb-1">المدينة / المنطقة *</label>
                      <input
                        type="text"
                        required
                        value={createFormData.shippingAddress.city}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          shippingAddress: { ...createFormData.shippingAddress, city: e.target.value }
                        })}
                        placeholder="مدينة نصر، التجمع، المهندسين..."
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-ink-2 mb-1">تفاصيل الشارع والعنوان *</label>
                      <input
                        type="text"
                        required
                        value={createFormData.shippingAddress.street}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          shippingAddress: { ...createFormData.shippingAddress, street: e.target.value }
                        })}
                        placeholder="اسم الشارع، رقم العمارة، الدور، الشقة..."
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-ink-2 mb-1">اسم محطة المترو *</label>
                      <input
                        type="text"
                        required
                        value={createFormData.metroPickup.stationName}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          metroPickup: { ...createFormData.metroPickup, stationName: e.target.value }
                        })}
                        placeholder="محطة الشهداء، أنور السادات، الأوبرا..."
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-2 mb-1">ملاحظات ميعاد الاستلام</label>
                      <input
                        type="text"
                        value={createFormData.metroPickup.notes}
                        onChange={(e) => setCreateFormData({
                          ...createFormData,
                          metroPickup: { ...createFormData.metroPickup, notes: e.target.value }
                        })}
                        placeholder="مثال: من الساعة 3 إلى 6 مساءً"
                        className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Ordered Items Builder */}
              <div className="p-4 bg-surface border border-line rounded-card space-y-3 shadow-card">
                <div className="flex items-center justify-between pb-1 border-b border-line">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <Tag size={15} />
                    <span>العطور والمنتجات المطلوبة (Order Items)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1 bg-brand-700 hover:bg-brand-900 text-white rounded-control text-xs font-semibold flex items-center gap-1 transition-colors shadow-card"
                  >
                    <Plus size={13} />
                    <span>إضافة عطر آخر</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {createFormData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-canvas p-2.5 rounded-control border border-line">
                      {/* Product Select */}
                      <div className="sm:col-span-5">
                        <label className="block text-xs font-semibold text-ink-2 mb-0.5">العطر</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductOrSizeChange(idx, 'productId', e.target.value)}
                          className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                          required
                        >
                          <option value="">-- اختر العطر --</option>
                          {productsList.map(p => (
                            <option key={p._id} value={p._id}>{p.name} ({p.gender || 'MEN'})</option>
                          ))}
                        </select>
                      </div>

                      {/* Size Select */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-ink-2 mb-0.5">الحجم</label>
                        <select
                          value={item.size}
                          onChange={(e) => handleItemProductOrSizeChange(idx, 'size', e.target.value)}
                          className="w-full h-8 bg-surface border border-line rounded-control px-2 text-xs font-semibold outline-none"
                        >
                          <option value="30ml">30ml</option>
                          <option value="50ml">50ml</option>
                          <option value="100ml">100ml</option>
                        </select>
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-ink-2 mb-0.5">السعر (ج.م)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleItemQtyOrPriceChange(idx, 'price', e.target.value)}
                          className="w-full h-8 bg-surface border border-line rounded-control px-2 text-xs font-mono font-semibold text-center outline-none"
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-ink-2 mb-0.5">الكمية</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemQtyOrPriceChange(idx, 'quantity', e.target.value)}
                          className="w-full h-8 bg-surface border border-line rounded-control px-2 text-xs font-mono font-semibold text-center outline-none"
                          required
                        />
                      </div>

                      {/* Delete */}
                      <div className="sm:col-span-1 flex justify-center pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={createFormData.items.length <= 1}
                          className="p-1.5 text-ink-3 hover:text-danger rounded-control disabled:opacity-20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Payment, Status & Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payment & Status Settings */}
                <div className="p-4 bg-canvas/70 border border-line rounded-card space-y-3">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <Wallet size={15} />
                    <span>إعدادات السداد وحالة الطلب</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink-2 mb-1">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</label>
                      <select
                        value={createFormData.paymentMethod}
                        onChange={(e) => setCreateFormData({ ...createFormData, paymentMethod: e.target.value })}
                        className="w-full h-8 bg-surface border border-line rounded-control px-2 text-xs outline-none"
                      >
                        <option value="cash_on_delivery">{isRTL ? 'عند الاستلام' : 'Cash on Delivery (COD)'}</option>
                        <option value="vodafone_cash">{isRTL ? 'فودافون كاش' : 'Vodafone Cash'}</option>
                        <option value="instapay">{isRTL ? 'إنستاباي' : 'InstaPay'}</option>
                        <option value="card">{isRTL ? 'بطاقة بنكية / فيزا' : 'Bank Card / Visa'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-2 mb-1">{isRTL ? 'حالة السداد' : 'Payment Status'}</label>
                      <select
                        value={createFormData.paymentStatus}
                        onChange={(e) => setCreateFormData({ ...createFormData, paymentStatus: e.target.value })}
                        className="w-full h-8 bg-surface border border-line rounded-control px-2 text-xs font-semibold outline-none"
                      >
                        <option value="pending">{isRTL ? 'معلق' : 'Pending'}</option>
                        <option value="paid">{isRTL ? 'مدفوع بالكامل' : 'Paid in Full'}</option>
                      </select>
                    </div>
                  </div>

                  {createFormData.paymentStatus === 'paid' && (
                    <div>
                      <label className="block text-xs font-semibold text-success mb-1">{isRTL ? 'إيداع المبلغ في الخزينة / الحساب:' : 'Deposit to Treasury Account:'}</label>
                      <select
                        value={createFormData.cashAccountId}
                        onChange={(e) => setCreateFormData({ ...createFormData, cashAccountId: e.target.value })}
                        className="w-full h-8 bg-surface border border-success/20 rounded-control px-2 text-xs font-semibold outline-none text-success"
                      >
                        <option value="">{isRTL ? '-- الحساب الافتراضي --' : '-- Default Account --'}</option>
                        {cashAccounts.map(acc => (
                          <option key={acc._id} value={acc._id}>
                            {acc.name} ({acc.type}) - {isRTL ? 'رصيد:' : 'Balance:'} {acc.balance?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1">{isRTL ? 'حالة الطلب الافتتاحية' : 'Initial Order Status'}</label>
                    <select
                      value={createFormData.orderStatus}
                      onChange={(e) => setCreateFormData({ ...createFormData, orderStatus: e.target.value })}
                      className="w-full h-8 bg-surface border border-line rounded-control px-2 text-xs font-semibold outline-none"
                    >
                      <option value="confirmed">{isRTL ? 'تم التأكيد' : 'Confirmed'}</option>
                      <option value="pending">{isRTL ? 'قيد المراجعة' : 'Pending Review'}</option>
                      <option value="processing">{isRTL ? 'جاري التجهيز' : 'Processing'}</option>
                    </select>
                  </div>
                </div>

                {/* Financial Summary Calculation */}
                <div className="p-4 bg-canvas border border-line rounded-card flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="font-semibold text-brand-700 text-xs block pb-1 border-b border-line">
                      {isRTL ? 'ملخص الحساب والفاتورة' : 'Order Financial Summary'}
                    </span>

                    <div className="flex items-center justify-between text-xs text-ink-2">
                      <span>{isRTL ? 'مجموع المنتجات:' : 'Products Subtotal:'}</span>
                      <strong className="font-mono">{createOrderSubtotal.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</strong>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span>{isRTL ? 'مصاريف الشحن (ج.م):' : 'Shipping Fee (EGP):'}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={createFormData.shipping}
                        onChange={(e) => setCreateFormData({ ...createFormData, shipping: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                        className="w-20 h-7 bg-surface border border-line rounded-control px-2 text-xs font-mono font-semibold text-center outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-success">{isRTL ? 'خصم إضافي (ج.م):' : 'Discount (EGP):'}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={createFormData.discount}
                        onChange={(e) => setCreateFormData({ ...createFormData, discount: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                        className="w-20 h-7 bg-surface border border-line rounded-control px-2 text-xs font-mono font-semibold text-center outline-none text-success"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-surface rounded-card border border-line flex items-center justify-between shadow-card">
                    <span className="font-semibold text-xs text-brand-700">{isRTL ? 'المبلغ الإجمالي النهائي:' : 'Total Amount:'}</span>
                    <strong className="text-base font-semibold text-brand-700 font-mono">
                      {createOrderTotal.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-line flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-10 px-4 text-sm"
                >
                  {creatingOrder ? 'جاري إنشاء الطلب...' : 'تأكيد وحفظ الطلب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL (PREMIUM ATELIER REDESIGN) */}
      {selectedOrder && !printMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 rtl bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-surface rounded-3xl border border-line shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden font-['Cairo',sans-serif]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line bg-canvas flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-gradient-to-br from-brand-700 to-brand-700 text-white flex items-center justify-center shadow-card">
                  <ShoppingBag size={20} strokeWidth={1.7} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-brand-700 font-mono">
                      طلب #{selectedOrder.orderNumber}
                    </h2>
                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig[selectedOrder.orderStatus]?.bg || 'bg-canvas'} ${statusConfig[selectedOrder.orderStatus]?.color || 'text-ink-2'} ${statusConfig[selectedOrder.orderStatus]?.border || 'border-line'}`}>
                      {statusConfig[selectedOrder.orderStatus]?.[isRTL ? 'labelAr' : 'labelEn'] || selectedOrder.orderStatus}
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 font-medium flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} className="text-ink-3" />
                    <span>{isRTL ? 'تاريخ ووقت الطلب:' : 'Order Date & Time:'}</span>
                    <span className="font-sans font-semibold text-ink-2">
                      {new Date(selectedOrder.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint('shipping')}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                  title={isRTL ? 'طباعة بوليصة شحن الشحنة' : 'Print Shipping Slip'}
                >
                  <Truck size={14} className="text-brand-700" />
                  <span>{isRTL ? 'بوليصة الشحن' : 'Shipping Slip'}</span>
                </button>

                <button
                  onClick={() => handlePrint('invoice')}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                  title={isRTL ? 'طباعة فاتورة حرارية 10×15 سم مع QR Code' : 'Print Thermal Invoice 10x15cm'}
                >
                  <Printer size={14} />
                  <span>{isRTL ? 'فاتورة 10×15' : 'Invoice 10x15'}</span>
                </button>

                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink-2 hover:bg-canvas rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              
              {/* Order Status Control Strip */}
              <div className="p-3 bg-canvas rounded-card border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-brand-700 text-xs">{isRTL ? 'تحديث مرحلة الطلب:' : 'Update Order Status:'}</span>
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
                    disabled={updatingStatus}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                  >
                    <option value="pending">{isRTL ? 'قيد الانتظار والمراجعة' : 'Pending Review'}</option>
                    <option value="confirmed">{isRTL ? 'تم التأكيد من الأتيليه' : 'Confirmed by Atelier'}</option>
                    <option value="processing">{isRTL ? 'جاري التجهيز والتعبئة' : 'Processing & Packaging'}</option>
                    <option value="shipped">{isRTL ? 'تم التسليم لمندوب الشحن' : 'Shipped / Dispatched'}</option>
                    <option value="delivered">{isRTL ? 'تم التوصيل للعميل بنجاح' : 'Delivered Successfully'}</option>
                    <option value="returned_from_shipping">{isRTL ? 'مرتجع من الشحن' : 'Returned from Shipping'}</option>
                    <option value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-ink-2 text-xs">حالة السداد:</span>
                  {selectedOrder.paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-success-50 text-success border border-success/20">
                      <CheckCircle2 size={12} /> تم الدفع بنجاح
                    </span>
                  ) : selectedOrder.paymentStatus === 'refunded' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-info-50 text-info border border-info/20">
                      <Undo2 size={12} /> مسترد للعميل
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-warning-50 text-warning border border-warning/20">
                      <Clock size={12} /> معلق / بانتظار التأكيد
                    </span>
                  )}
                </div>
              </div>

              {/* RETURNED FROM SHIPPING MANAGEMENT CARD */}
              {(selectedOrder.orderStatus === 'returned_from_shipping' || selectedOrder.returnDetails?.isReturned) && (
                <div className="p-4 rounded-card border border-warning/20 bg-warning-50/70 space-y-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-warning/20">
                    <div className="flex items-center gap-2 text-warning font-semibold text-xs">
                      <RotateCcw size={16} className="text-warning" />
                      <span>إدارة المرتجع ومصاريف الشحن والفحص</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReturnModal(selectedOrder)}
                      className="px-3 py-1 bg-surface hover:bg-warning-50 text-warning font-semibold rounded-card border border-warning/20 shadow-card text-xs transition-all flex items-center gap-1.5"
                    >
                      <span>تعديل مصاريف الشحن</span>
                    </button>
                  </div>

                  {/* 1. Shipping Charges Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-surface p-3 rounded-card border border-warning/20 text-ink">
                    <div>
                      <span className="text-xs text-ink-2 font-medium block">شحن ذهاباً للعميل:</span>
                      <strong className="text-xs font-mono text-ink">
                        {selectedOrder.returnDetails?.outboundShippingFee ?? 0} ج.م
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-ink-2 font-medium block">شحن عودة / إياب:</span>
                      <strong className="text-xs font-mono text-ink">
                        {selectedOrder.returnDetails?.returnShippingFee ?? 0} ج.م
                      </strong>
                    </div>
                    <div>
                      <span className="text-xs text-warning font-semibold block">إجمالي تكلفة الشحن على الشركة:</span>
                      <strong className="text-xs font-mono text-warning font-semibold">
                        {selectedOrder.returnDetails?.totalReturnShippingCost ?? ((selectedOrder.returnDetails?.outboundShippingFee || 0) + (selectedOrder.returnDetails?.returnShippingFee || 0))} ج.م
                      </strong>
                    </div>
                  </div>

                  {/* Return Reason & Finance Expense Indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2 bg-warning-50/60 p-2.5 rounded-control border border-warning/90">
                    <div>
                      <span className="font-semibold text-warning">سبب الارتجاع: </span>
                      <span>{selectedOrder.returnDetails?.returnReason || 'رفض الاستلام / تعذر التوصيل'}</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-success bg-surface/90 px-2 py-0.5 rounded-control border border-success/20">
                      <Check size={12} className="text-success" />
                      <span>مسجل كمصروف شحن ونقل رسمي في المالية (يُخصم من صافي الربح)</span>
                    </div>
                  </div>

                  {/* 2. Physical Inspection & Inventory Restocking Section */}
                  <div className="p-3 bg-surface rounded-card border border-warning/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink text-xs flex items-center gap-1.5">
                        <Archive size={14} className="text-brand-700" />
                        <span>حالة الفحص الفعلي واسترجاع المخزون:</span>
                      </span>

                      {selectedOrder.returnDetails?.restockStatus === 'inspected_restocked' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-success-50 text-success border border-success/20">
                          <CheckCircle2 size={12} /> تم الفحص واسترجاع السائل للمخزون بنجاح
                        </span>
                      ) : selectedOrder.returnDetails?.restockStatus === 'inspected_damaged_discarded' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-danger-50 text-danger border border-danger/20">
                          <XCircle size={12} /> تم الفحص: منتجات تالفة وتم استبعادها (لم تُضف للمخزون)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-warning-50 text-warning border border-warning/20">
                          <Clock size={12} /> قيد انتظار الفحص الفعلي والمعاينة
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-ink-2 leading-relaxed font-light">
                      * التزاماً بقواعد الجودة، لا يتم استرجاع السائل تلقائياً لمجرد تغيير حالة الطلب، بل بعد استلام المنتجات وفحصها والتأكد من أنها مغلقة تماماً وسليمة.
                    </p>

                    {selectedOrder.returnDetails?.restockStatus !== 'inspected_restocked' && selectedOrder.returnDetails?.restockStatus !== 'inspected_damaged_discarded' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmRestock(selectedOrder, 'reusable')}
                          disabled={inspectingRestock}
                          className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                        >
                          <Check size={14} />
                          <span>تأكيد فحص واسترجاع العطور للمخزون</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConfirmRestock(selectedOrder, 'damaged')}
                          disabled={inspectingRestock}
                          className="px-3 py-1.5 bg-danger-50 hover:bg-danger-50 text-danger font-semibold rounded-control text-xs border border-danger/20 transition-all disabled:opacity-50"
                        >
                          <X size={14} />
                          <span>تسجيل تلف الشحنة (غير صالحة)</span>
                        </button>
                      </div>
                    )}

                    {selectedOrder.returnDetails?.inspectionNotes && (
                      <p className="text-xs text-ink-2 bg-canvas p-2 rounded-control border border-line mt-1">
                        <strong>ملاحظات الفحص:</strong> {selectedOrder.returnDetails.inspectionNotes}
                      </p>
                    )}
                  </div>

                  {/* 3. Customer Refund Section if Payment Was Collected */}
                  {selectedOrder.paymentStatus === 'paid' && (
                    <div className="p-3 bg-brand-700/10 rounded-control border border-brand-700/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold text-brand-700 text-xs block">
                          تم تحصيل قيمة الطلب مسبقاً ({selectedOrder.total?.toLocaleString()} ج.م)
                        </span>
                        <span className="text-xs text-ink-2">
                          نظراً لارتجاع الشحنة، يمكنك تسجيل استرداد المبلغ وخصمه من الخزينة.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRefundModal(selectedOrder)}
                        className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs shrink-0"
                      >
                        <Undo2 size={14} className="text-accent" />
                        <span>معالجة استرداد المبلغ للعميل</span>
                      </button>
                    </div>
                  )}

                  {selectedOrder.paymentStatus === 'refunded' && (
                    <div className="p-2.5 bg-success-50 rounded-control border border-success/20 flex items-center justify-between text-xs text-success font-medium">
                      <span>✓ تم استرداد مبلغ {selectedOrder.returnDetails?.refundAmount || selectedOrder.total} ج.م للعميل بنجاح.</span>
                      {selectedOrder.returnDetails?.refundNotes && (
                        <span className="text-xs text-success font-normal">({selectedOrder.returnDetails.refundNotes})</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Verification Card */}
              {selectedOrder.paymentStatus !== 'paid' ? (
                <div className="p-4 rounded-card border border-warning/90 bg-warning-50/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-warning font-semibold text-xs">
                      <AlertCircle size={16} className="text-warning" />
                      <span>تأكيد السداد والتحقق من إشعار الدفع اليدوي</span>
                    </div>

                    {(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl) && (
                      <button
                        type="button"
                        onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface hover:bg-canvas text-info font-semibold rounded-control border border-info/20 shadow-card text-xs transition-all"
                      >
                        <ZoomIn size={14} />
                        <span>معاينة وتكبير إشعار التحويل</span>
                      </button>
                    )}
                  </div>

                  {/* Payment Proof Preview if present */}
                  {(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl) && (
                    <div className="flex items-center gap-3 p-2.5 bg-surface rounded-card border border-warning/20">
                      <img
                        src={selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl}
                        alt="إيصال التحويل"
                        onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}
                        className="w-14 h-14 object-cover rounded-control border border-line cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                      />
                      <div className="flex-1 space-y-0.5 text-xs">
                        <p className="font-semibold text-ink">مرفق إشعار تحويل من العميل</p>
                        {selectedOrder.paymentSenderPhone && (
                          <p className="text-ink-2">رقم المحفظة المحوّل منها: <strong className="font-mono text-brand-700">{selectedOrder.paymentSenderPhone}</strong></p>
                        )}
                        <p className="text-info font-medium cursor-pointer hover:underline" onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}>
                          اضغط لتكبير الصورة وفحص تفاصيل العملية
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Verify Payment Action Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 items-center pt-1">
                    <select
                      value={selectedCashAccountId}
                      onChange={(e) => setSelectedCashAccountId(e.target.value)}
                      className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full sm:flex-1"
                    >
                      <option value="">-- اختر خزينة / حساب التحويل المالي للإيداع --</option>
                      {cashAccounts.map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name} ({acc.type}) - رصيد: {acc.balance?.toLocaleString()} ج.م
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleVerifyPayment}
                      disabled={verifyingPayment}
                      className="w-full sm:w-auto px-5 py-2 bg-success hover:bg-success text-white font-semibold rounded-control text-xs flex items-center justify-center gap-1.5 transition-colors shadow-card disabled:opacity-50"
                    >
                      {verifyingPayment ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      <span>تأكيد سداد وإيداع ({selectedOrder.total?.toLocaleString()} ج.م)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-card border border-success/20 bg-success-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-success font-semibold text-xs">
                    <CheckCircle2 size={17} className="text-success" />
                    <span>تم التحقق من الدفع وتأكيد السداد الكامل ({selectedOrder.total?.toLocaleString()} ج.م)</span>
                  </div>
                  {(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl) && (
                    <button
                      type="button"
                      onClick={() => setZoomReceiptUrl(selectedOrder.paymentScreenshot || selectedOrder.paymentProofUrl)}
                      className="text-xs text-success font-semibold hover:underline flex items-center gap-1"
                    >
                      <Eye size={13} /> عرض إشعار السداد
                    </button>
                  )}
                </div>
              )}

              {/* Customer & Delivery Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Marketing Attribution & Ad Source Card */}
                {selectedOrder.attribution && (
                  <div className="p-4 bg-canvas/90 border border-line rounded-card space-y-2.5 sm:col-span-2">
                    <div className="flex items-center justify-between pb-2 border-b border-line">
                      <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                        <Target size={15} />
                        <span>مصدر الزيارة والتسويق (Attribution & Campaigns)</span>
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        selectedOrder.attribution.channel === 'meta'
                          ? 'bg-info-50 text-info border border-info/20'
                          : selectedOrder.attribution.channel === 'tiktok'
                          ? 'bg-ink text-white'
                          : selectedOrder.attribution.channel === 'google'
                          ? 'bg-info-50 text-info border border-info/20'
                          : 'bg-line text-ink'
                      }`}>
                        {(selectedOrder.attribution.channel || 'direct').toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-xs text-ink-3 block">القناة:</span>
                        <strong className="text-ink font-semibold">{selectedOrder.attribution.channel || 'direct'}</strong>
                      </div>
                      <div>
                        <span className="text-xs text-ink-3 block">المصدر / الوسيط:</span>
                        <span className="font-mono text-ink-2">
                          {selectedOrder.attribution.source || '-'}/{selectedOrder.attribution.medium || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-ink-3 block">اسم الحملة:</span>
                        <span className="font-mono font-semibold text-ink">{selectedOrder.attribution.campaign || 'Direct / None'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-ink-3 block">معرّف تتبع CAPI:</span>
                        <span className="font-mono text-xs text-ink-2 truncate block" title={selectedOrder.metaEventId || `order_${selectedOrder.orderNumber}`}>
                          {selectedOrder.metaEventId || `order_${selectedOrder.orderNumber}`}
                        </span>
                      </div>
                    </div>

                    {(selectedOrder.attribution.fbclid || selectedOrder.attribution.ttclid) && (
                      <div className="pt-1.5 border-t border-line flex items-center gap-4 text-xs text-ink-2 font-mono">
                        {selectedOrder.attribution.fbclid && (
                          <span>fbclid: <span className="text-ink-2 truncate max-w-[200px] inline-block align-bottom">{selectedOrder.attribution.fbclid}</span></span>
                        )}
                        {selectedOrder.attribution.ttclid && (
                          <span>ttclid: <span className="text-ink-2 truncate max-w-[200px] inline-block align-bottom">{selectedOrder.attribution.ttclid}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Card */}
                <div className="p-4 bg-canvas/90 border border-line rounded-card space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                      <User size={15} />
                      <span>بيانات العميل (Customer Profile)</span>
                    </span>
                    {selectedOrder.customer?.isFirst100 && (
                      <span className="text-xs bg-warning-50 text-warning border border-warning/20 font-semibold px-2 py-0.5 rounded-full">
                        نادي الـ 100 الأوائل ⭐
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-ink-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-2">الاسم الكامل:</span>
                      <strong className="text-ink font-semibold text-sm">
                        {selectedOrder.customer?.name || 'عميل M20'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-ink-2">رقم الموبايل الأساسي:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-ink dir-ltr">
                          {selectedOrder.customerPhone || selectedOrder.customer?.phone}
                        </span>
                        <a 
                          href={`tel:${selectedOrder.customerPhone || selectedOrder.customer?.phone}`} 
                          className="p-1 rounded-control bg-surface border border-line text-ink-2 hover:text-brand-700"
                          title="اتصال"
                        >
                          <Phone size={12} />
                        </a>
                        <a 
                          href={`https://wa.me/20${(selectedOrder.customerPhone || selectedOrder.customer?.phone || '').replace(/^0/, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1 rounded-control bg-success-50 border border-success/20 text-success hover:bg-success-50"
                          title="واتساب"
                        >
                          <MessageSquare size={12} />
                        </a>
                      </div>
                    </div>

                    {selectedOrder.customerPhone2 && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-2">رقم موبايل ثاني:</span>
                        <span className="font-mono font-semibold text-ink dir-ltr">{selectedOrder.customerPhone2}</span>
                      </div>
                    )}

                    {selectedOrder.customerEmail && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-2">البريد الإلكتروني:</span>
                        <span className="font-sans text-ink font-medium">{selectedOrder.customerEmail}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-line">
                      <span className="text-ink-2">طريقة الدفع:</span>
                      {renderPaymentMethodBadge(selectedOrder.paymentMethod, selectedOrder.paymentStatus === 'paid')}
                    </div>
                  </div>
                </div>

                {/* Delivery & Shipping Card */}
                <div className="p-4 bg-canvas/90 border border-line rounded-card space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                      {selectedOrder.deliveryMethod === 'metro_pickup' ? <Train size={15} /> : <Home size={15} />}
                      <span>الشحن والتوصيل (Fulfillment)</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedOrder.deliveryMethod === 'metro_pickup'
                        ? 'bg-info-50 text-info border border-info/20'
                        : 'bg-info-50 text-info border border-info/20'
                    }`}>
                      {selectedOrder.deliveryMethod === 'metro_pickup' ? (isRTL ? 'استلام محطة مترو' : 'Metro Pickup') : (isRTL ? 'توصيل للمنزل' : 'Home Delivery')}
                    </span>
                  </div>

                  <div className="space-y-2 text-ink-2 text-xs">
                    {selectedOrder.deliveryMethod === 'metro_pickup' ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-2">{isRTL ? 'محطة المترو:' : 'Metro Station:'}</span>
                          <strong className="text-brand-700 font-semibold">
                            {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName || (isRTL ? 'محطة مترو' : 'Metro Station')}
                          </strong>
                        </div>
                        {selectedOrder.metroPickup?.line && (
                          <div className="flex items-center justify-between">
                            <span className="text-ink-2">{isRTL ? 'الخط:' : 'Line:'}</span>
                            <span className="text-ink font-medium">{selectedOrder.metroPickup?.line}</span>
                          </div>
                        )}
                        <div className="p-2 bg-surface rounded-card border border-line text-ink-2 text-xs leading-relaxed shadow-card">
                          {selectedOrder.metroPickup?.pickupNote || (isRTL ? 'سيتم التواصل مع العميل لتحديد موعد ومكان المقابلة في المحطة.' : 'Customer will be contacted for meeting point.')}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-2">{isRTL ? 'المحافظة والمدينة:' : 'Governorate & City:'}</span>
                          <strong className="text-ink font-semibold">
                            {formatGovernorate(selectedOrder.shippingAddress?.governorate, isRTL)} • {selectedOrder.shippingAddress?.city || '-'}
                          </strong>
                        </div>

                        <div>
                          <span className="text-ink-2 block mb-0.5">{isRTL ? 'العنوان بالتفصيل:' : 'Full Address:'}</span>
                          <p className="text-ink font-semibold bg-surface p-2 rounded-card border border-line leading-snug shadow-card">
                            {selectedOrder.shippingAddress?.street}
                            {selectedOrder.shippingAddress?.buildingNumber && ` (${isRTL ? 'مبنى' : 'Bldg'} ${selectedOrder.shippingAddress.buildingNumber})`}
                            {selectedOrder.shippingAddress?.floor && ` - ${isRTL ? 'دور' : 'Fl.'} ${selectedOrder.shippingAddress.floor}`}
                            {selectedOrder.shippingAddress?.apartment && ` - ${isRTL ? 'شقة' : 'Apt.'} ${selectedOrder.shippingAddress.apartment}`}
                          </p>
                        </div>

                        {selectedOrder.shippingAddress?.deliveryNotes && (
                          <div>
                            <span className="text-ink-3 text-xs block">{isRTL ? 'ملاحظات / علامات مميزة:' : 'Delivery Notes:'}</span>
                            <p className="text-ink-2 text-xs italic bg-canvas p-1.5 rounded-control border border-line">
                              {selectedOrder.shippingAddress.deliveryNotes}
                            </p>
                          </div>
                        )}

                        {/* Carrier & Outbound Cost Configuration */}
                        <div className="pt-2.5 border-t border-line mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-ink-2 text-xs font-medium">
                              {isRTL ? 'رسوم الشحن على العميل:' : 'Customer Shipping Fee:'}
                            </span>
                            <span className="font-mono font-semibold text-ink">
                              {(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? 0) === 0 ? (
                                <span className="inline-flex items-center gap-1 text-success bg-success-50 px-2 py-0.5 rounded-control border border-success/20 text-xs">
                                  <Check size={11} /> {isRTL ? '0 ج.م (شحن مجاني)' : '0 EGP (Free Shipping)'}
                                </span>
                              ) : (
                                `${Math.round(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? 0)} ${isRTL ? 'ج.م' : 'EGP'}`
                              )}
                            </span>
                          </div>

                          {selectedOrder.shippingDiscount > 0 && (
                            <div className="flex items-center justify-between text-xs text-success font-semibold">
                              <span>{isRTL ? 'خصم الشحن المطبق:' : 'Shipping Promo Discount:'}</span>
                              <span className="font-mono">-{Math.round(selectedOrder.shippingDiscount)} {isRTL ? 'ج.م' : 'EGP'}</span>
                            </div>
                          )}

                          <div className="p-2.5 bg-surface rounded-card border border-line space-y-1.5 shadow-card">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Truck size={13} className="text-brand-700" />
                                <span className="text-ink font-semibold text-xs">
                                  {isRTL ? 'تكلفة الشحن الفعلية للشركة (مندوب الشحن):' : 'Carrier Cost Paid by M20:'}
                                </span>
                              </div>
                              {!editingCarrierCost && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCarrierCost(true)}
                                  className="text-xs text-brand-700 font-semibold hover:underline"
                                >
                                  {isRTL ? 'تعديل التكلفة' : 'Edit Cost'}
                                </button>
                              )}
                            </div>

                            {editingCarrierCost ? (
                              <div className="flex items-center gap-2 pt-1">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={carrierCostInput}
                                  onChange={(e) => setCarrierCostInput(e.target.value)}
                                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-24"
                                  placeholder="65"
                                />
                                <span className="text-xs text-ink-2 font-mono">{isRTL ? 'ج.م' : 'EGP'}</span>
                                <button
                                  type="button"
                                  onClick={handleSaveCarrierCost}
                                  disabled={savingCarrierCost}
                                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                                >
                                  {savingCarrierCost ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                                  <span>{isRTL ? 'حفظ' : 'Save'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCarrierCostInput(Math.round(Number(selectedOrder.actualOutboundShippingCost ?? selectedOrder.realShippingCost ?? getGovernorateRate(selectedOrder.shippingAddress?.governorate) ?? 65)));
                                    setEditingCarrierCost(false);
                                  }}
                                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                                >
                                  {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-semibold text-ink text-sm">
                                  {Math.round(Number(selectedOrder.actualOutboundShippingCost ?? selectedOrder.realShippingCost ?? getGovernorateRate(selectedOrder.shippingAddress?.governorate) ?? 65))} {isRTL ? 'ج.م' : 'EGP'}
                                </span>
                                <span className="text-xs text-ink-3">
                                  {isRTL ? '(يُقيد كمصروف شحن ونقل في الأرباح والخسائر)' : '(Recorded under Shipping Expenses in P&L)'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Order Products & Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-700 text-xs flex items-center gap-1.5">
                    <ShoppingBag size={15} />
                    <span>منتجات الطلب ({selectedOrder.items?.length || 0} عطور)</span>
                  </span>
                  <span className="text-xs text-ink-3 font-medium">الأسعار تشمل الضرائب والمصنعية</span>
                </div>

                <div className="border border-line rounded-card overflow-hidden shadow-card">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-canvas border-b border-line font-semibold text-ink-2">
                      <tr>
                        <th className="p-3">العطر / المنتج</th>
                        <th className="p-3 text-center">الحجم</th>
                        <th className="p-3 text-center">سعر الوحدة</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {(selectedOrder.items || []).map((item, idx) => {
                        const imgSrc = getItemImage(item);
                        return (
                          <tr key={idx} className="hover:bg-canvas/60 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={imgSrc}
                                  alt={item.productName}
                                  className="w-12 h-12 object-cover rounded-control bg-photo shrink-0"
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/img/product.png'; }}
                                />
                                <div>
                                  <h4 className="font-semibold text-ink text-xs sm:text-sm">{item.productName}{item.isPreOrder && <span className="mr-2 px-1.5 py-0.5 rounded-control bg-warning-50 text-warning text-xs font-semibold">طلب مسبق</span>}</h4>
                                  <span className="text-xs text-ink-3 font-mono block mt-0.5">
                                    SKU: {item.variantSKU || '-'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-control bg-canvas border border-line text-ink font-semibold text-xs font-mono">
                                {item.size}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-semibold text-ink">
                              {item.price?.toLocaleString()} ج.م
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-control bg-canvas font-semibold font-mono text-ink">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="p-3 text-left font-mono font-semibold text-brand-700 text-xs sm:text-sm">
                              {(item.price * item.quantity).toLocaleString()} ج.م
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals Breakdown */}
              <div className="p-4 bg-canvas rounded-card border border-line space-y-2">
                <span className="font-semibold text-brand-700 text-xs block pb-1 border-b border-line">
                  {isRTL ? 'ملخص الحسابات والمبالغ' : 'Financial Summary'}
                </span>

                <div className="flex justify-between text-ink-2 text-xs">
                  <span>{isRTL ? 'المجموع الفرعي للمنتجات:' : 'Products Subtotal:'}</span>
                  <span className="font-mono font-semibold text-ink">{selectedOrder.subtotal?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>

                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-success text-xs font-semibold">
                    <span>{isRTL ? 'الخصم المطبق (كوبون / عرض):' : 'Applied Discount:'}</span>
                    <span className="font-mono">-{selectedOrder.discount?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}

                <div className="flex justify-between text-ink-2 text-xs">
                  <span>{isRTL ? 'رسوم التوصيل والشحن (المحصلة من العميل):' : 'Shipping Fee Charged:'}</span>
                  <span className="font-mono font-semibold text-ink">
                    {(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? selectedOrder.metroPickupFee ?? 0) === 0 ? (
                      <span className="text-success font-semibold">{isRTL ? 'شحن مجاني (0 ج.م)' : 'Free Shipping (0 EGP)'}</span>
                    ) : (
                      `${Math.round(selectedOrder.shippingFeeCharged ?? selectedOrder.shipping ?? selectedOrder.metroPickupFee)} ${isRTL ? 'ج.م' : 'EGP'}`
                    )}
                  </span>
                </div>

                {selectedOrder.shippingDiscount > 0 && (
                  <div className="flex justify-between text-success text-xs font-semibold">
                    <span>{isRTL ? 'خصم الشحن المباشر (كوبون):' : 'Shipping Promo Discount:'}</span>
                    <span className="font-mono">-{Math.round(selectedOrder.shippingDiscount)} {isRTL ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2.5 border-t border-line text-sm font-semibold text-brand-700">
                  <span className="text-sm">{isRTL ? 'المبلغ الإجمالي النهائي المطلوب:' : 'Total Amount Due:'}</span>
                  <span className="font-mono text-base">{selectedOrder.total?.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              {/* Order Status History Audit Trail */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="p-4 bg-canvas/90 rounded-card border border-line space-y-2.5">
                  <span className="font-semibold text-brand-700 text-xs block pb-1 border-b border-line">
                    {isRTL ? 'سجل تتبع ومراحل الطلب' : 'Status Audit History'}
                  </span>
                  <div className="space-y-2 pt-1">
                    {selectedOrder.statusHistory.map((h, idx) => (
                      <div key={idx} className="flex items-start justify-between text-xs border-r-2 border-brand-700 pr-2.5 py-0.5">
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-ink">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] ${statusConfig[h.status]?.bg || 'bg-canvas'} ${statusConfig[h.status]?.color || 'text-ink'}`}>
                              {statusConfig[h.status]?.[isRTL ? 'labelAr' : 'labelEn'] || h.status}
                            </span>
                            {h.changedBy && (
                              <span className="text-xs text-ink-3 font-normal">{isRTL ? `بواسطة: ${h.changedBy}` : `By: ${h.changedBy}`}</span>
                            )}
                          </div>
                          {h.note && <p className="text-xs text-ink-2 mt-0.5">{h.note}</p>}
                        </div>
                        <span className="text-xs text-ink-3 font-mono shrink-0">
                          {new Date(h.changedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-line bg-canvas flex items-center justify-between shrink-0">
              <span className="text-xs text-ink-3 font-medium">
                معرف الطلب الداخلي: {selectedOrder._id}
              </span>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-control bg-line hover:bg-ink-3 text-ink text-xs font-semibold transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RETURN FROM SHIPPING MODAL */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface rounded-card border border-line shadow-pop overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-warning/10 border-b border-warning/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-control bg-warning-50 flex items-center justify-center text-warning">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-warning">
                    تسجيل شحنة مرتجعة وتكاليف الشحن
                  </h3>
                  <span className="text-xs font-mono text-warning font-semibold block">
                    طلب رقم #{returnModalOrder.orderNumber} • العميل: {returnModalOrder.customer?.name || returnModalOrder.customerPhone || 'عميل M20'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="p-1.5 rounded-control text-ink-3 hover:text-ink-2 hover:bg-canvas transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-warning-50/80 rounded-control border border-warning/20 text-warning leading-relaxed text-xs">
                <p className="font-semibold flex items-center gap-1.5 mb-1 text-warning">
                  <AlertCircle size={14} />
                  <span>تنبيه القواعد المالية المتبعة:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-warning/90 text-xs">
                  <li>تتحمل دار M20 تكاليف الشحن الفعلية لشركة الشحن عند رفض العميل الاستلام.</li>
                  <li>تُسجل هذه الرسوم تلقائياً في المالية كمصروف نقل وتشغيل (تُخصم من صافي الربح ولا تُضاف لتكلفة تصنيع المنتجات).</li>
                  <li>لا يتم استرجاع المخزون تلقائياً حتى استلام المنتجات المرتجعة فعلياً وفحص سلامتها.</li>
                </ul>
              </div>

              {/* Shipping Charges Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {isRTL ? 'تكلفة الشحن ذهاباً للعميل (ج.م) *' : 'Outbound Carrier Cost (EGP) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={returnForm.outboundShippingCost}
                    onChange={(e) => setReturnForm({ ...returnForm, outboundShippingCost: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    placeholder="65"
                  />
                  <span className="text-xs text-ink-3 mt-0.5 block">{isRTL ? 'رسوم التوصيل الصادرة للعنوان' : 'Outbound delivery fee paid to courier'}</span>
                </div>

                <div>
                  <label className="block font-semibold text-ink-2 mb-1">
                    {isRTL ? 'تكلفة الشحن إياباً / عودة للمخزن (ج.م) *' : 'Return Carrier Cost (EGP) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={returnForm.returnShippingCost}
                    onChange={(e) => setReturnForm({ ...returnForm, returnShippingCost: e.target.value })}
                    className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                    placeholder="65"
                  />
                  <span className="text-xs text-ink-3 mt-0.5 block">{isRTL ? 'إذا كانت شركة الشحن تحاسب على العودة' : 'If carrier charges return fee'}</span>
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-canvas rounded-control border border-line flex items-center justify-between">
                <span className="font-semibold text-ink-2">{isRTL ? 'إجمالي تكلفة الشحن المتكبدة على M20:' : 'Total Carrier Shipping Cost:'}</span>
                <span className="font-mono font-semibold text-sm text-danger">
                  {Math.round((Number(returnForm.outboundShippingCost) || 0) + (Number(returnForm.returnShippingCost) || 0)).toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  {isRTL ? 'سبب الارتجاع *' : 'Return Reason *'}
                </label>
                <select
                  value={returnForm.returnReason}
                  onChange={(e) => setReturnForm({ ...returnForm, returnReason: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                >
                  <option value={isRTL ? 'رفض العميل الاستلام' : 'Customer Refused Delivery'}>
                    {isRTL ? 'رفض العميل الاستلام عند وصول المندوب' : 'Customer refused delivery upon courier arrival'}
                  </option>
                  <option value={isRTL ? 'تعذر التواصل مع العميل أو الهاتف مغلق' : 'Customer Unreachable / Phone Off'}>
                    {isRTL ? 'تعذر التواصل مع العميل أو الهاتف مغلق' : 'Customer unreachable or phone off'}
                  </option>
                  <option value={isRTL ? 'عنوان غير دقيق أو خارج نطاق التغطية' : 'Invalid Address or Out of Coverage'}>
                    {isRTL ? 'عنوان غير دقيق أو خارج نطاق التغطية' : 'Invalid address or out of delivery zone'}
                  </option>
                  <option value={isRTL ? 'طلب العميل الإلغاء بعد خروج الشحنة' : 'Customer Cancelled After Dispatch'}>
                    {isRTL ? 'طلب العميل الإلغاء بعد خروج الشحنة' : 'Customer cancelled after dispatch'}
                  </option>
                  <option value={isRTL ? 'تأخر شركة الشحن في التسليم' : 'Courier Delay'}>
                    {isRTL ? 'تأخر شركة الشحن ورغبة العميل في الإلغاء' : 'Courier delayed and customer refused'}
                  </option>
                  <option value={isRTL ? 'سبب آخر' : 'Other Reason'}>
                    {isRTL ? 'سبب آخر (موضح بالملاحظات)' : 'Other reason (specified in notes)'}
                  </option>
                </select>
              </div>

              {/* Cash Account for Shipping Expense */}
              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  الخزينة / حساب الدفع لسداد مصاريف الشحن
                </label>
                <select
                  value={returnForm.paymentAccountId}
                  onChange={(e) => setReturnForm({ ...returnForm, paymentAccountId: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                >
                  <option value="">-- اختياري: سداد لاحق / غير مخصوم فوراً من الخزينة --</option>
                  {cashAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type}) - رصيد: {acc.balance?.toLocaleString()} ج.م
                    </option>
                  ))}
                </select>
                <span className="text-xs text-ink-3 mt-0.5 block">في حال تم خصم الرسوم نقداً أو من محفظة شركة الشحن</span>
              </div>

              {/* Inspection / Courier Notes */}
              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  ملاحظات إضافية أو تقرير المندوب
                </label>
                <textarea
                  rows="2"
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="ملاحظات شركة الشحن، حالة الطرد الخارجي، إلخ..."
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReturnModalOrder(null)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submittingReturn ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>حفظ وتسجيل الشحنة المرتجعة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER REFUND MODAL */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface rounded-card border border-line shadow-pop overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-brand-700/10 border-b border-brand-700/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-control bg-brand-700/15 flex items-center justify-center text-brand-700">
                  <Undo2 size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-brand-700">
                    معالجة استرداد المبلغ للعميل (Refund)
                  </h3>
                  <span className="text-xs font-mono text-ink-2 font-semibold block">
                    طلب رقم #{refundModalOrder.orderNumber} • المبلغ المحصل: {refundModalOrder.total?.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="p-1.5 rounded-control text-ink-3 hover:text-ink-2 hover:bg-canvas transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitRefund} className="p-6 space-y-4 text-xs">
              <p className="text-ink-2 leading-relaxed text-xs">
                نظراً لارتجاع الشحنة بعد تحصيل قيمتها مسبقاً، سيتم صرف المبلغ وإرجاعه للعميل وخصمه تلقائياً من الخزينة المحددة وتسجيل قيد استرداد مالي.
              </p>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  مبلغ الاسترداد (ج.م) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  max={refundModalOrder.total}
                  required
                  value={refundForm.refundAmount}
                  onChange={(e) => setRefundForm({ ...refundForm, refundAmount: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  الخزينة / الحساب المالي المراد الصرف منه *
                </label>
                <select
                  required
                  value={refundForm.cashAccountId}
                  onChange={(e) => setRefundForm({ ...refundForm, cashAccountId: e.target.value })}
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                >
                  <option value="">-- اختر الخزينة أو المحفظة --</option>
                  {cashAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type}) - رصيد: {acc.balance?.toLocaleString()} ج.م
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-2 mb-1">
                  ملاحظات أو رقم معاملة التحويل (إن وجد)
                </label>
                <textarea
                  rows="2"
                  value={refundForm.notes}
                  onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                  placeholder="رقم مرجع إنستاباي، فودافون كاش، إلخ..."
                  className="rounded-control border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3 h-9 text-xs w-full"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface text-brand-700 border border-line font-medium transition-colors duration-150 hover:bg-brand-50 hover:border-brand-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
                >
                  {submittingRefund ? <RefreshCw size={14} className="animate-spin text-accent" /> : <Check size={14} className="text-accent" />}
                  <span>تأكيد خصم وصرف الاسترداد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR PAYMENT PROOF */}
      {zoomReceiptUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setZoomReceiptUrl(null)}>
          <div className="relative max-w-lg max-h-[85vh] bg-surface p-2 rounded-card overflow-hidden shadow-pop" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomReceiptUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            <img src={zoomReceiptUrl} alt="إشعار الدفع" className="max-h-[80vh] w-auto object-contain rounded-control" />
          </div>
        </div>
      )}

      {showA4Sheets && (
        <A4InvoiceSheets
          orders={orders.filter((o) => selectedIds.has(o._id))}
          perPage={a4PerPage}
          onClose={() => setShowA4Sheets(false)}
        />
      )}

      {/* HIDDEN PRINT VIEW CONTAINER */}
      {printMode && selectedOrder && (
        <div className="fixed inset-0 z-100 bg-surface flex flex-col items-center justify-center p-4">
          <div className="no-print mb-4 flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-control bg-brand-700 text-white font-medium shadow-card transition-colors duration-150 hover:bg-brand-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-8 px-3 text-xs"
            >
              <Printer size={16} />
              <span>طباعة فورية</span>
            </button>
            <button 
              onClick={() => setPrintMode(null)}
              className="px-4 py-2 border border-line text-ink-2 font-semibold rounded-control text-xs"
            >
              إغلاق
            </button>
          </div>

          {printMode === 'invoice' && (
            <div 
              ref={invoicePrintRef}
              style={{
                width: '100mm',
                minHeight: '148mm',
                padding: '6mm',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                margin: '0 auto',
                fontSize: '10px',
                border: '1px solid #E2E8F0'
              }}
            >
              {/* Thermal Invoice Top */}
              <div style={{ textAlign: 'center', borderBottom: '1.5px solid #174F43', paddingBottom: '6px', marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#174F43', letterSpacing: '1px' }}>M20</h1>
                <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', color: '#64748B' }}>HAUTE PARFUMERIE • ATELIER DU CAIRE</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: 'bold' }}>فاتورة طلب رقم #{selectedOrder.orderNumber}</p>
                <p style={{ margin: 0, fontSize: '8px', color: '#64748B' }}>{new Date(selectedOrder.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              {/* Customer Box */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontSize: '9.5px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>العميل:</strong> {selectedOrder.customer?.name || 'عميل M20'}</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedOrder.customerPhone || selectedOrder.customer?.phone}</span>
                </div>
                {selectedOrder.customerPhone2 && (
                  <div style={{ fontSize: '8.5px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                    هاتف بديل: {selectedOrder.customerPhone2}
                  </div>
                )}
                <div style={{ marginTop: '3px', fontSize: '8.5px', color: '#475569' }}>
                  {selectedOrder.deliveryMethod === 'metro_pickup' ? (
                    <span><strong>استلام محطة مترو:</strong> {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName}</span>
                  ) : (
                    <span><strong>العنوان:</strong> {formatGovernorate(selectedOrder.shippingAddress?.governorate, isRTL)} - {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.street}</span>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '9px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #CBD5E1', textAlign: 'right', color: '#475569' }}>
                    <th style={{ padding: '3px 0' }}>العطر</th>
                    <th style={{ padding: '3px', textAlign: 'center' }}>الحجم</th>
                    <th style={{ padding: '3px', textAlign: 'center' }}>العدد</th>
                    <th style={{ padding: '3px 0', textAlign: 'left' }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed #E2E8F0' }}>
                      <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{item.productName}</td>
                      <td style={{ padding: '4px', textAlign: 'center', fontFamily: 'monospace' }}>{item.size}</td>
                      <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                      <td style={{ padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>{(item.price * item.quantity).toLocaleString()} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '6px', borderRadius: '4px', marginBottom: '8px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>المجموع الفرعي:</span>
                  <span>{selectedOrder.subtotal?.toLocaleString()} ج.م</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', marginBottom: '2px' }}>
                    <span>الخصم:</span>
                    <span>-{selectedOrder.discount?.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>الشحن:</span>
                  <span>{(selectedOrder.shipping || selectedOrder.metroPickupFee || 0) === 0 ? 'مجاناً' : `${selectedOrder.shipping || selectedOrder.metroPickupFee} ج.م`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', fontWeight: '900', fontSize: '12px', color: '#174F43' }}>
                  <span>الإجمالي النهائي:</span>
                  <span>{selectedOrder.total?.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* QR Code Verification Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '6px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '9px', color: '#174F43' }}>امسح للتحقق ومتابعة الشحنة</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#64748B' }}>m20fragrance.store/track-order</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '7.5px', color: '#94A3B8' }}>شكراً لاختياركم دار عطور M20</p>
                </div>
                <div style={{ padding: '3px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                  <QRCodeSVG 
                    value={`https://m20fragrance.store/track-order?order=${selectedOrder.orderNumber}`} 
                    size={48}
                    level="M"
                  />
                </div>
              </div>
            </div>
          )}

          {printMode === 'shipping' && (
            <div 
              ref={shippingPrintRef}
              style={{
                width: '100mm',
                minHeight: '148mm',
                padding: '6mm',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                margin: '0 auto',
                fontSize: '11px',
                border: '2px solid #174F43'
              }}
            >
              {/* Shipping Label Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #174F43', paddingBottom: '6px', marginBottom: '8px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#174F43' }}>M20 PARFUMS</h1>
                  <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', color: '#64748B' }}>Fragile • Luxury Goods</p>
                </div>
                <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '13px', color: '#174F43' }}>
                  بوليصة شحن
                </div>
              </div>

              {/* Receiver Info */}
              <div style={{ border: '1.5px solid #174F43', padding: '8px', borderRadius: '6px', marginBottom: '8px', backgroundColor: '#F8FAFC' }}>
                <span style={{ display: 'inline-block', backgroundColor: '#174F43', color: '#FFFFFF', fontSize: '8px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '2px', marginBottom: '4px' }}>
                  المرسل إليه (المستلم)
                </span>
                <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: 'bold', color: '#174F43' }}>
                  {selectedOrder.customer?.name || 'عميل M20'}
                </p>
                <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  هاتف 1: {selectedOrder.customerPhone || selectedOrder.customer?.phone}
                </p>
                {selectedOrder.customerPhone2 && (
                  <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    هاتف 2: {selectedOrder.customerPhone2}
                  </p>
                )}
                <div style={{ marginTop: '4px', borderTop: '1px solid #CBD5E1', paddingTop: '4px' }}>
                  {selectedOrder.deliveryMethod === 'metro_pickup' ? (
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#174F43' }}>
                      تسليم محطة مترو: {selectedOrder.metroPickup?.stationNameAr || selectedOrder.metroPickup?.stationName}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>
                      <strong>العنوان:</strong> {formatGovernorate(selectedOrder.shippingAddress?.governorate, isRTL)} - {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.street} (مبنى: {selectedOrder.shippingAddress?.buildingNumber || '-'})
                      {selectedOrder.shippingAddress?.deliveryNotes && ` [ملاحظات: ${selectedOrder.shippingAddress?.deliveryNotes}]`}
                    </p>
                  )}
                </div>
              </div>

              {/* COD / Payment Notice */}
              <div style={{ border: '2px dashed #174F43', padding: '6px', textAlign: 'center', marginBottom: '8px', borderRadius: '6px', backgroundColor: selectedOrder.paymentStatus === 'paid' ? '#ECFDF5' : '#FEF3C7' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748B' }}>
                  {selectedOrder.paymentStatus === 'paid' ? 'حالة السداد:' : 'المبلغ المطلوب تحصيله عند الاستلام (COD):'}
                </span>
                <p style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: '900', color: selectedOrder.paymentStatus === 'paid' ? '#047857' : '#B45309' }}>
                  {selectedOrder.paymentStatus === 'paid' ? 'مدفوع بالكامل مسبقاً (لا يتم تحصيل أموال)' : `${selectedOrder.total?.toLocaleString()} جنيه مصري`}
                </p>
              </div>

              {/* Fragile & Dispatch info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#B91C1C' }}>⚠️ تنبيه: محتويات قابلة للكسر (عطور زجاجية فاخرة)</p>
                  <p style={{ margin: '2px 0 0 0' }}>المرسل: دار M20 للعطور • القاهرة</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <QRCodeSVG value={`https://m20fragrance.store/track-order?order=${selectedOrder.orderNumber}`} size={38} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

