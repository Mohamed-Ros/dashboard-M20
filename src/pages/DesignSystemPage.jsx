import React, { useState } from 'react';
import { Package, Truck, CheckCircle2, Clock, XCircle, Plus, Download, Search, Inbox } from 'lucide-react';
import {
  Button, Card, CardHeader, CardBody, CardFooter, Badge, PageHeader, StatCard,
  TableCard, Table, THead, Th, Tr, Td, EmptyState, Field, Input, Select, Textarea, Segmented,
} from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const SWATCHES = [
  { group: 'Surfaces', items: [['canvas', 'bg-canvas', '#F4F6F4', 'App background'], ['surface', 'bg-surface', '#FFFFFF', 'Cards, topbar, inputs'], ['line', 'bg-line', '#E3E8E5', 'Borders, dividers']] },
  { group: 'Ink', items: [['ink', 'bg-ink', '#12201C', 'Primary text'], ['ink-2', 'bg-ink-2', '#4B5B56', 'Secondary text'], ['ink-3', 'bg-ink-3', '#8A9893', 'Muted, placeholder']] },
  { group: 'Brand', items: [['brand-900', 'bg-brand-900', '#0F3830', 'Sidebar'], ['brand-700', 'bg-brand-700', '#174F43', 'Primary actions'], ['brand-50', 'bg-brand-50', '#EAF2EF', 'Soft tint, hover'], ['accent', 'bg-accent', '#FF9D00', 'Highlight, key CTA'], ['accent-50', 'bg-accent-50', '#FFF4DE', 'Accent tint']] },
  { group: 'Status', items: [['success', 'bg-success', '#15803D', 'Done, delivered'], ['warning', 'bg-warning', '#B45309', 'Pending, attention'], ['danger', 'bg-danger', '#B91C1C', 'Failed, cancelled'], ['info', 'bg-info', '#1D4ED8', 'In progress']] },
];

const Section = ({ id, title, description, children }) => (
  <section id={id} className="mb-10 scroll-mt-4">
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="text-sm text-ink-2 mt-1 max-w-2xl leading-relaxed">{description}</p>}
    </div>
    {children}
  </section>
);

const Code = ({ children }) => (
  <code className="px-1.5 py-0.5 rounded bg-canvas border border-line text-xs font-mono text-brand-700">{children}</code>
);

export default function DesignSystemPage() {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [seg, setSeg] = useState('all');

  return (
    <div>
      <PageHeader
        title={ar ? 'نظام التصميم' : 'Design System'}
        description={ar
          ? 'مرجع حيّ لكل ما يُبنى به الداشبورد: الألوان والخطوط والمكونات. أي صفحة جديدة تُبنى من هذه القطع فقط.'
          : 'Living reference for everything the dashboard is built from: tokens and components. New pages are assembled from these pieces only.'}
        badge={<Badge tone="brand">v1</Badge>}
      />

      {/* Tokens: colour */}
      <Section id="color" title="Colour" description="Defined once as CSS tokens in index.css (@theme). Use the utility name (bg-brand-700, text-ink-2, border-line), never raw hex.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SWATCHES.map((g) => (
            <Card key={g.group}>
              <CardHeader title={g.group} />
              <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {g.items.map(([name, cls, hex, use]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className={`w-12 h-12 shrink-0 rounded-control border border-line ${cls}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{name}</p>
                      <p className="text-xs text-ink-3 font-mono">{hex}</p>
                      <p className="text-xs text-ink-2 truncate">{use}</p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      </Section>

      {/* Type */}
      <Section id="type" title="Typography" description="Montserrat (English) and Cairo (Arabic) for everything. The thin display face is for brand moments only (.font-brand).">
        <Card>
          <CardBody className="space-y-4">
            {[
              ['text-2xl font-semibold', 'Page title / 24 semibold'],
              ['text-lg font-semibold', 'Section title / 18 semibold'],
              ['text-base font-semibold', 'Card group title / 16 semibold'],
              ['text-sm', 'Body / 14 regular. The default for tables, forms, paragraphs'],
              ['text-xs text-ink-2', 'Caption / 12. Hints, meta, helper text'],
              ['text-xs font-semibold uppercase tracking-wide text-ink-2', 'Label / 12 semibold uppercase. Table headers, stat labels'],
            ].map(([cls, label]) => (
              <p key={label} className={cls}>{label}</p>
            ))}
          </CardBody>
        </Card>
      </Section>

      {/* Button */}
      <Section id="buttons" title="Button" description={<>One control for every action. Variants: <Code>primary</Code> <Code>accent</Code> <Code>secondary</Code> <Code>ghost</Code> <Code>danger</Code>. Sizes: <Code>sm</Code> <Code>md</Code> <Code>lg</Code>.</>}>
        <Card>
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button icon={Plus}>Primary</Button>
              <Button variant="accent" icon={Plus}>Accent</Button>
              <Button variant="secondary" icon={Download}>Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardBody>
        </Card>
      </Section>

      {/* Badge */}
      <Section id="badges" title="Badge" description="Status and labels. Always pair colour with a word, never colour alone.">
        <Card>
          <CardBody className="flex flex-wrap gap-2.5">
            <Badge>Neutral</Badge>
            <Badge tone="brand">Brand</Badge>
            <Badge tone="accent" dot>Accent</Badge>
            <Badge tone="success" dot>Delivered</Badge>
            <Badge tone="warning" dot>Pending</Badge>
            <Badge tone="danger" dot>Cancelled</Badge>
            <Badge tone="info" dot>Shipping</Badge>
          </CardBody>
        </Card>
      </Section>

      {/* StatCard */}
      <Section id="stats" title="StatCard" description="One KPI: label, value, hint. Pass `to` to make the whole card a link.">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Shipping" value="12" hint="Value: 18,400 EGP" icon={Truck} tone="info" />
          <StatCard label="Delivered" value="148" hint="Revenue: 214,900 EGP" icon={CheckCircle2} tone="success" />
          <StatCard label="Pending" value="7" hint="Awaiting: 9,300 EGP" icon={Clock} tone="warning" />
          <StatCard label="Cancelled" value="3" hint="Amount: 2,100 EGP" icon={XCircle} tone="danger" />
        </div>
      </Section>

      {/* Card */}
      <Section id="cards" title="Card" description="The only surface. Header (title, icon, action), body, optional footer.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader icon={Package} title="Card with header" description="Optional description line" action={<Button size="sm" variant="secondary">Action</Button>} />
            <CardBody><p className="text-sm text-ink-2 leading-relaxed">Body content sits on a 20px grid. Use CardBody for padding so every card breathes the same.</p></CardBody>
            <CardFooter><span className="text-xs text-ink-2">Footer for secondary info</span></CardFooter>
          </Card>
          <Card interactive>
            <CardBody>
              <p className="text-sm font-semibold text-ink">Interactive card</p>
              <p className="text-sm text-ink-2 mt-1">Adds a hover state. Use for cards that are links.</p>
            </CardBody>
          </Card>
        </div>
      </Section>

      {/* Form */}
      <Section id="forms" title="Form controls" description="Field wraps a label, a control, and a hint or error. Controls share one height (40px) and focus ring.">
        <Card>
          <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Product name" htmlFor="ds-name" required hint="Shown to customers on the storefront"><Input id="ds-name" placeholder="e.g. M20 Crown" /></Field>
            <Field label="Category" htmlFor="ds-cat"><Select id="ds-cat"><option>Men</option><option>Women</option><option>Unisex</option></Select></Field>
            <Field label="Search" htmlFor="ds-search"><div className="relative"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input id="ds-search" className="ps-9" placeholder="Search orders…" /></div></Field>
            <Field label="Price" htmlFor="ds-price" error="Price must be greater than 0"><Input id="ds-price" invalid defaultValue="0" /></Field>
            <Field label="Notes" htmlFor="ds-notes" className="md:col-span-2"><Textarea id="ds-notes" placeholder="Internal notes" /></Field>
            <div><p className="text-xs font-semibold text-ink-2 mb-1.5">Segmented</p><Segmented value={seg} onChange={setSeg} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'done', label: 'Done' }]} /></div>
          </CardBody>
        </Card>
      </Section>

      {/* Table */}
      <Section id="tables" title="Table" description="TableCard scrolls on small screens. Th for headers, Td for cells (mono for IDs and phones, align=end for numbers and actions).">
        <TableCard>
          <Table>
            <THead><tr><Th>Order</Th><Th>Customer</Th><Th>Status</Th><Th align="end">Total</Th></tr></THead>
            <tbody>
              <Tr><Td mono>#1042</Td><Td className="font-medium">Karim Ahmed</Td><Td><Badge tone="success" dot>Delivered</Badge></Td><Td align="end" className="tabular-nums">1,550 EGP</Td></Tr>
              <Tr><Td mono>#1043</Td><Td className="font-medium">Salma Hassan</Td><Td><Badge tone="info" dot>Shipping</Badge></Td><Td align="end" className="tabular-nums">2,350 EGP</Td></Tr>
              <Tr><Td mono>#1044</Td><Td className="font-medium">Omar Khaled</Td><Td><Badge tone="warning" dot>Pending</Badge></Td><Td align="end" className="tabular-nums">900 EGP</Td></Tr>
            </tbody>
          </Table>
        </TableCard>
      </Section>

      {/* Empty */}
      <Section id="empty" title="EmptyState" description="Every empty list explains itself and offers the next action.">
        <Card><EmptyState icon={Inbox} title="No orders yet" description="Orders appear here as soon as customers check out on the store." action={<Button icon={Plus}>Create manual order</Button>} /></Card>
      </Section>

      {/* Shell rules */}
      <Section id="shell" title="Page anatomy" description="Every page follows the same order, so the app feels like one product.">
        <Card>
          <CardBody>
            <ol className="space-y-2.5 text-sm text-ink-2 list-decimal ps-5 leading-relaxed">
              <li><span className="font-semibold text-ink">Topbar</span> (automatic): breadcrumb from <Code>config/navigation.js</Code>, language, store link.</li>
              <li><span className="font-semibold text-ink">PageHeader</span>: title, short description, status badge, and the page's primary actions on the end side.</li>
              <li><span className="font-semibold text-ink">StatCards</span> row (optional): 3–4 KPIs, always the first block of content.</li>
              <li><span className="font-semibold text-ink">Cards / TableCard</span>: the working content. Filters sit above tables inside the same card flow.</li>
              <li><span className="font-semibold text-ink">EmptyState</span> for every list that can be empty; skeleton (animate-pulse on bg-canvas) for loading.</li>
            </ol>
            <p className="text-sm text-ink-2 mt-4">To add a page: create the file, add one route in <Code>App.jsx</Code>, add one item in <Code>config/navigation.js</Code>. The sidebar, drawer, breadcrumb and page title update by themselves.</p>
          </CardBody>
        </Card>
      </Section>
    </div>
  );
}
