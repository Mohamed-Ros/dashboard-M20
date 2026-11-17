import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';
import { getGovernorateObject } from '../../data/egyptGovernorates';

const SITE_URL = 'https://m20fragrance.store';

const governorateName = (govStr) => {
  if (!govStr) return '-';
  const gov = getGovernorateObject(govStr);
  if (gov) return gov.nameAr;
  if (govStr.includes('(') && govStr.includes(')')) {
    return govStr.split(/[()]/).filter(Boolean)[0].trim();
  }
  return govStr;
};

const money = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

/**
 * One invoice. Rendered at natural size, then scaled down (never up) so it always
 * fits its cell completely - nothing is clipped even for orders with many items.
 */
function InvoiceCell({ order, cols }) {
  const cellRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const cell = cellRef.current;
    const inner = innerRef.current;
    if (!cell || !inner) return;
    const availH = cell.clientHeight;
    const natH = inner.scrollHeight;
    setScale(natH > availH && natH > 0 ? Math.max(0.5, availH / natH) : 1);
  }, [order, cols]);

  const shippingFee = order.shipping || order.metroPickupFee || 0;
  const address =
    order.deliveryMethod === 'metro_pickup'
      ? `استلام محطة مترو: ${order.metroPickup?.stationNameAr || order.metroPickup?.stationName || '-'}`
      : `${governorateName(order.shippingAddress?.governorate)} - ${order.shippingAddress?.city || ''} - ${order.shippingAddress?.street || ''}`;

  return (
    <div
      ref={cellRef}
      className="a4-cell"
      style={{ boxSizing: 'border-box', padding: '5mm', overflow: 'hidden', border: '0.3mm dashed #94A3B8' }}
    >
      <div
        ref={innerRef}
        dir="rtl"
        style={{
          width: `${100 / scale}%`,
          transform: `scale(${scale})`,
          transformOrigin: 'top right',
          fontFamily: "'Cairo', 'Segoe UI', sans-serif",
          fontSize: '10px',
          color: '#0F172A',
          lineHeight: 1.35
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '1.5px solid #174F43', paddingBottom: '5px', marginBottom: '6px' }}>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#174F43', letterSpacing: '1px' }}>M20</div>
          <div style={{ fontSize: '8px', textTransform: 'uppercase', color: '#64748B' }}>HAUTE PARFUMERIE • ATELIER DU CAIRE</div>
          <div style={{ marginTop: '3px', fontSize: '11px', fontWeight: 700 }}>فاتورة طلب رقم #{order.orderNumber}</div>
          <div style={{ fontSize: '8px', color: '#64748B' }}>
            {new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '5px', borderRadius: '4px', marginBottom: '6px', border: '1px solid #E2E8F0', fontSize: '9.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
            <span><strong>العميل:</strong> {order.customer?.name || 'عميل M20'}</span>
            <span style={{ fontFamily: 'monospace', direction: 'ltr' }}>{order.customerPhone || order.customer?.phone}</span>
          </div>
          {order.customerPhone2 && (
            <div style={{ fontSize: '8.5px', color: '#64748B', fontFamily: 'monospace' }}>هاتف بديل: {order.customerPhone2}</div>
          )}
          <div style={{ marginTop: '2px', fontSize: '8.5px', color: '#475569' }}>
            <strong>العنوان:</strong> {address}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
              <th style={{ padding: '2px 0', textAlign: 'right' }}>العطر</th>
              <th style={{ padding: '2px', textAlign: 'center' }}>الحجم</th>
              <th style={{ padding: '2px', textAlign: 'center' }}>العدد</th>
              <th style={{ padding: '2px 0', textAlign: 'left' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px dashed #E2E8F0' }}>
                <td style={{ padding: '3px 0', fontWeight: 700 }}>{item.productName}</td>
                <td style={{ padding: '3px', textAlign: 'center', fontFamily: 'monospace' }}>{item.size}</td>
                <td style={{ padding: '3px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                <td style={{ padding: '3px 0', textAlign: 'left', fontWeight: 700 }}>{money(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ background: '#F8FAFC', padding: '5px', borderRadius: '4px', marginBottom: '6px', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>المجموع الفرعي:</span><span>{money(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
              <span>الخصم:</span><span>-{money(order.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>الشحن:</span><span>{shippingFee === 0 ? 'مجاناً' : money(shippingFee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '3px', marginTop: '2px', fontWeight: 900, fontSize: '12px', color: '#174F43' }}>
            <span>الإجمالي النهائي:</span><span>{money(order.total)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #E2E8F0', padding: '5px', borderRadius: '6px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '9px', color: '#174F43' }}>امسح للتحقق ومتابعة الشحنة</div>
            <div style={{ fontSize: '8px', color: '#64748B', direction: 'ltr', textAlign: 'right' }}>m20fragrance.store/track-order</div>
            <div style={{ marginTop: '2px', fontSize: '7.5px', color: '#94A3B8' }}>شكراً لاختياركم دار عطور M20</div>
          </div>
          <div style={{ padding: '2px', background: '#fff', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
            <QRCodeSVG value={`${SITE_URL}/track-order?order=${order.orderNumber}`} size={46} level="M" />
          </div>
        </div>
      </div>
    </div>
  );
}

const PRINT_CSS = `
@media screen {
  .a4-page { box-shadow: 0 2px 14px rgba(15,23,42,.18); margin: 0 auto 16px; }
}
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { background: #fff !important; }
  body > #root { display: none !important; }
  #a4-print-root { position: static !important; background: #fff !important; overflow: visible !important; padding: 0 !important; }
  .a4-no-print { display: none !important; }
  .a4-page { box-shadow: none !important; margin: 0 !important; break-after: page; page-break-after: always; }
  .a4-page:last-child { break-after: auto; page-break-after: auto; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

/**
 * Full-screen preview + print of many invoices on A4 sheets.
 * perPage: 4 (2x2, A6 each) or 6 (2x3). Printing is done by the browser, so text and
 * the QR codes stay vector-sharp at any printer resolution.
 */
export default function A4InvoiceSheets({ orders, perPage = 4, onClose }) {
  const rows = perPage === 6 ? 3 : 2;
  const pages = [];
  for (let i = 0; i < orders.length; i += perPage) pages.push(orders.slice(i, i + perPage));

  return createPortal(
    <div
      id="a4-print-root"
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#E2E8F0', overflow: 'auto', padding: '16px' }}
    >
      <style>{PRINT_CSS}</style>

      <div
        className="a4-no-print"
        style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', direction: 'rtl' }}
      >
        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#174F43', color: '#fff', fontWeight: 700, fontSize: '12px', borderRadius: '12px', border: 0, cursor: 'pointer' }}
        >
          <Printer size={15} /> طباعة ({orders.length} فاتورة • {pages.length} ورقة A4)
        </button>
        <button
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#fff', color: '#334155', fontWeight: 700, fontSize: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', cursor: 'pointer' }}
        >
          <X size={15} /> إغلاق
        </button>
        <span style={{ fontSize: '11px', color: '#475569' }}>
          في نافذة الطباعة: الحجم A4 • الهوامش "بدون" • المقياس 100%
        </span>
      </div>

      {pages.map((chunk, pi) => (
        <div
          key={pi}
          className="a4-page"
          style={{
            width: '210mm',
            height: '297mm',
            background: '#fff',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}
        >
          {chunk.map((order) => (
            <InvoiceCell key={order._id || order.orderNumber} order={order} cols={perPage} />
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
}
