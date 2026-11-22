import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button, Card, CardHeader, CardBody, Badge, PageHeader, StatCard, TableCard, Table, THead, Th, Tr, Td, EmptyState, ProductThumb } from '../components/ui';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { getOrders, getProducts, getUsers, getTrafficOverview } from '../services/api';
import {
  RefreshCw, Truck, CheckCircle2, Clock, XCircle,
  TrendingUp, Eye, ArrowRight, ArrowLeft, MessageSquare, Users as UsersIcon
} from 'lucide-react';

export default function OverviewPage() {
  const { lang, isRTL } = useLanguage();
  const tr = (ar, en) => (lang === 'ar' ? ar : en);
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const EGP = tr('ج.م', 'EGP');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);

  // Metrics
  const [orderMetrics, setOrderMetrics] = useState({
    delivered: { count: 0, total: 0 },
    shipped: { count: 0, total: 0 },
    pending: { count: 0, total: 0 },
    cancelled: { count: 0, total: 0 },
    totalRevenue: 0,
  });

  const [traffic, setTraffic] = useState({
    todayVisits: 0,
    todayPageViews: 0,
    conversionRate: 0,
    activeNow: 0,
    series: [],
    topProducts: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, productsData, usersData, trafficData] = await Promise.all([
        getOrders({ sort: '-createdAt' }).catch(() => []),
        getProducts().catch(() => []),
        getUsers().catch(() => []),
        getTrafficOverview().catch(() => null),
      ]);
      if (trafficData) setTraffic((prev) => ({ ...prev, ...trafficData }));

      const oList = Array.isArray(ordersData) ? ordersData : [];
      const pList = Array.isArray(productsData) ? productsData : [];
      const uList = Array.isArray(usersData) ? usersData : [];

      setOrders(oList);
      setProducts(pList);
      setUsers(uList);

      let deliveredCount = 0, deliveredTotal = 0;
      let shippedCount = 0, shippedTotal = 0;
      let pendingCount = 0, pendingTotal = 0;
      let cancelledCount = 0, cancelledTotal = 0;
      let totalRev = 0;

      oList.forEach(o => {
        const amt = o.total || 0;
        if (o.orderStatus === 'delivered') {
          deliveredCount++;
          deliveredTotal += amt;
          totalRev += amt;
        } else if (o.orderStatus === 'shipped') {
          shippedCount++;
          shippedTotal += amt;
          totalRev += amt;
        } else if (o.orderStatus === 'cancelled') {
          cancelledCount++;
          cancelledTotal += amt;
        } else {
          pendingCount++;
          pendingTotal += amt;
        }
      });

      setOrderMetrics({
        delivered: { count: deliveredCount, total: deliveredTotal },
        shipped: { count: shippedCount, total: shippedTotal },
        pending: { count: pendingCount, total: pendingTotal },
        cancelled: { count: cancelledCount, total: cancelledTotal },
        totalRevenue: totalRev,
      });

    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const topViewedProducts = (traffic.topProducts || []).map((p) => ({
    _id: p._id,
    name: p.name,
    family: p.family || 'Signature',
    price: p.price,
    image: p.image || '/img/product.png',
    viewsCount: p.views || 0,
    cartAdds: p.cartAdds || 0,
  }));

  const chartData = (traffic.series || []).map((d) => ({
    day: new Date(`${d.date}T12:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' }),
    visits: d.visits,
  }));

  const money = (n) => `${Number(n || 0).toLocaleString()} ${EGP}`;

  return (
    <div>
      <PageHeader
        title={tr('لوحة المتابعة العامة', 'Overview')}
        description={tr(
          'متابعة حركة الزيارات، اهتمامات الزوار، وحالة الطلبات والمبيعات.',
          'Traffic, visitor interest, and the live status of orders and sales.'
        )}
        badge={<Badge tone="success" dot>{tr('متصل', 'Live')}</Badge>}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} loading={loading}>
            {tr('تحديث البيانات', 'Refresh')}
          </Button>
        }
      />

      {/* Orders status */}
      <section className="mb-8" aria-labelledby="orders-status">
        <div className="flex items-center justify-between mb-3">
          <h2 id="orders-status" className="text-base font-semibold text-ink">{tr('حالة الطلبات والشحنات', 'Orders & shipments')}</h2>
          <Link to="/orders" className="text-sm font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
            {tr('عرض كل الشحنات', 'View all')} <Arrow size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard to="/orders?status=shipped" icon={Truck} tone="info" loading={loading}
            label={tr('جاري الشحن', 'Shipping')} value={orderMetrics.shipped.count}
            hint={`${tr('القيمة', 'Value')}: ${money(orderMetrics.shipped.total)}`} />
          <StatCard to="/orders?status=delivered" icon={CheckCircle2} tone="success" loading={loading}
            label={tr('تم التسليم', 'Delivered')} value={orderMetrics.delivered.count}
            hint={`${tr('إيرادات', 'Revenue')}: ${money(orderMetrics.delivered.total)}`} />
          <StatCard to="/orders?status=pending" icon={Clock} tone="warning" loading={loading}
            label={tr('قيد المراجعة', 'Pending')} value={orderMetrics.pending.count}
            hint={`${tr('قيد الانتظار', 'Awaiting')}: ${money(orderMetrics.pending.total)}`} />
          <StatCard to="/orders?status=cancelled" icon={XCircle} tone="danger" loading={loading}
            label={tr('ملغي', 'Cancelled')} value={orderMetrics.cancelled.count}
            hint={`${tr('المبلغ', 'Amount')}: ${money(orderMetrics.cancelled.total)}`} />
        </div>
      </section>

      {/* Traffic + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={TrendingUp}
            title={tr('حركة زيارات الموقع', 'Store traffic')}
            description={tr('إحصائيات توافد الزوار يومياً', 'Daily visitor volume')}
            action={
              <div className="flex items-center gap-2">
                <Badge tone="accent" dot>{traffic.activeNow} {tr('زائر الآن', 'online now')}</Badge>
              </div>
            }
          />
          <CardBody>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { l: tr('زيارات اليوم', 'Visits today'), v: Number(traffic.todayVisits).toLocaleString() },
                { l: tr('مشاهدات الصفحات اليوم', 'Page views today'), v: Number(traffic.todayPageViews).toLocaleString() },
                { l: tr('معدل التحويل', 'Conversion'), v: `${traffic.conversionRate}%`, good: true },
              ].map((m) => (
                <div key={m.l} className="rounded-control bg-canvas border border-line p-3">
                  <p className="text-xs text-ink-2">{m.l}</p>
                  <p className={`mt-0.5 text-xl font-semibold tabular-nums ${m.good ? 'text-success' : 'text-ink'}`}>{m.v}</p>
                </div>
              ))}
            </div>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF9D00" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#FF9D00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#8A9893" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8A9893" fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    formatter={(value) => [value, tr('الزيارات', 'Visits')]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E3E8E5', fontSize: 12, boxShadow: '0 12px 32px -8px rgba(15,56,48,.18)' }}
                  />
                  <Area type="monotone" dataKey="visits" stroke="#FF9D00" strokeWidth={2.5} fill="url(#visitsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader icon={Eye} title={tr('العطور الأكثر زيارة', 'Most viewed fragrances')} action={<Badge>{tr('أعلى 5', 'Top 5')}</Badge>} />
          <CardBody className="flex-1 py-2">
            {topViewedProducts.length === 0 ? (
              <EmptyState title={tr('لا توجد منتجات', 'No products yet')} />
            ) : (
              topViewedProducts.map((p, idx) => {
                const maxViews = topViewedProducts[0]?.viewsCount || 1;
                return (
                  <div key={p._id || idx} className="flex items-center gap-3 py-2.5 border-b border-line last:border-b-0">
                    <span className={`w-6 shrink-0 text-center text-sm font-semibold tabular-nums ${idx === 0 ? 'text-accent' : 'text-ink-3'}`}>
                      {idx + 1}
                    </span>
                    <ProductThumb src={p.image} alt={p.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                        <p className="text-sm font-semibold text-brand-700 tabular-nums shrink-0">{p.viewsCount.toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-ink-2 truncate">{p.family} · {p.price} {EGP}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.max(6, Math.round((p.viewsCount / maxViews) * 100))}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-ink-3">{p.cartAdds} {tr('إضافة للسلة', 'added to cart')}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardBody>
          <div className="px-5 pb-5">
            <Button as={Link} to="/products" className="w-full" iconEnd={Arrow}>
              {tr('إدارة كتالوج العطور', 'Manage catalog')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Customers */}
      <section aria-labelledby="customers">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 id="customers" className="text-base font-semibold text-ink">{tr('سجل العملاء والنشاط', 'Customers & activity')}</h2>
            <p className="text-sm text-ink-2">{tr('بيانات العملاء والزوار المسجلين', 'Registered customers and visitors')}</p>
          </div>
          <Link to="/users" className="text-sm font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
            {tr('عرض كل العملاء', 'View all')} <Arrow size={14} />
          </Link>
        </div>

        <TableCard>
          {users.length === 0 ? (
            <EmptyState icon={UsersIcon} title={tr('لا يوجد عملاء بعد', 'No customers yet')} description={tr('سيظهر العملاء هنا عند تسجيلهم في المتجر.', 'Customers appear here once they register on the store.')} />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>{tr('العميل', 'Customer')}</Th>
                  <Th>{tr('الهاتف', 'Phone')}</Th>
                  <Th>{tr('الحالة', 'Status')}</Th>
                  <Th align="end">{tr('تواصل', 'Contact')}</Th>
                </tr>
              </THead>
              <tbody>
                {users.slice(0, 5).map((u, idx) => {
                  const hasOrders = (u.totalOrders || 0) > 0;
                                    const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');
                  return (
                    <Tr key={u._id || idx}>
                      <Td className="font-medium">{u.name || tr('عميل', 'Customer')}</Td>
                      <Td mono>{u.phone}</Td>
                      <Td>
                        {hasOrders ? (
                          <Badge tone="success" dot>{tr(`تم الشراء (${u.totalOrders})`, `Purchased (${u.totalOrders})`)}</Badge>
                        ) : (
                          <Badge tone="warning" dot>{tr('سلة انتظار', 'Cart waiting')}</Badge>
                        )}
                      </Td>
                      <Td align="end">
                        <Button
                          as="a"
                          size="sm"
                          variant="secondary"
                          icon={MessageSquare}
                          href={`https://wa.me/2${cleanPhone}?text=${encodeURIComponent(tr(`مرحباً ${u.name || ''}، معك خدمة عملاء M20.`, `Hello ${u.name || ''}, this is M20 customer care.`))}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {tr('مراسلة', 'Message')}
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </TableCard>
      </section>
    </div>
  );
}
