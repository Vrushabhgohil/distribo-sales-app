import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Image, Platform, Share } from 'react-native';
import { Order } from '@/types';

const INVOICE_STORAGE_PREFIX = '@motiba_invoice_';

export interface GeneratedInvoice {
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  generatedAt: string;
  totalAmount: number;
}

let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const logoModule = require('@/assets/images/invoice-logo.png');
    const asset = Asset.fromModule(logoModule);
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri || Image.resolveAssetSource(logoModule)?.uri;

    if (uri) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read logo'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      cachedLogoDataUri = dataUri;
      return dataUri;
    }
  } catch {
    // Fallback below if asset conversion fails
  }

  return '';
}

function escapeHtml(value?: string | number | null): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function computeTotals(order: Order) {
  const items = order.items || [];
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + (item.total_price || item.quantity * item.unit_price),
    0
  );
  const discountAmount = order.discount_amount || 0;
  const taxAmount = order.tax_amount || 0;
  const subtotal =
    itemsSubtotal > 0
      ? itemsSubtotal
      : (order.total_amount || 0) + discountAmount - taxAmount;
  const finalTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  return { items, subtotal, discountAmount, taxAmount, finalTotal };
}

export const invoiceService = {
  getInvoiceNumber(order: Pick<Order, 'id' | 'order_number'>): string {
    if (order.order_number) {
      return order.order_number.startsWith('ORD-')
        ? `INV-${order.order_number.slice(4)}`
        : `INV-${order.order_number}`;
    }
    return `INV-${order.id.slice(0, 8).toUpperCase()}`;
  },

  async ensureInvoiceForOrder(order: Order): Promise<GeneratedInvoice> {
    const key = `${INVOICE_STORAGE_PREFIX}${order.id}`;
    try {
      const existing = await AsyncStorage.getItem(key);
      if (existing) {
        return JSON.parse(existing) as GeneratedInvoice;
      }
    } catch {
      // Proceed to create
    }

    const { finalTotal } = computeTotals(order);
    const invoice: GeneratedInvoice = {
      invoiceNumber: this.getInvoiceNumber(order),
      orderId: order.id,
      orderNumber: order.order_number,
      generatedAt: new Date().toISOString(),
      totalAmount: finalTotal,
    };

    try {
      await AsyncStorage.setItem(key, JSON.stringify(invoice));
    } catch {
      // Non-fatal storage error
    }
    return invoice;
  },

  buildInvoiceShareText(order: Order): string {
    const invoiceNumber = this.getInvoiceNumber(order);
    const { items, subtotal, discountAmount, taxAmount, finalTotal } = computeTotals(order);
    const orderDate = new Date(order.order_date || order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const storeAddress = [
      order.store?.address,
      order.store?.area,
      order.store?.city,
      order.store?.pincode,
    ]
      .filter(Boolean)
      .join(', ');

    const lines: string[] = [
      `*MOTIBA FMCG DISTRIBUTION (Aarvi Enterprise)*`,
      `*Order Invoice: ${invoiceNumber}*`,
      `Order #: ${order.order_number}`,
      `Date: ${orderDate}`,
      ``,
      `*Store Details:*`,
      `${order.store?.name || 'Retail Outlet'}`,
    ];

    if (order.store?.owner_name) lines.push(`Owner: ${order.store.owner_name}`);
    if (order.store?.mobile) lines.push(`Phone: ${order.store.mobile}`);
    if (storeAddress) lines.push(`Address: ${storeAddress}`);
    if (order.store?.gst_number) lines.push(`GSTIN: ${order.store.gst_number}`);

    lines.push(``);
    lines.push(`*Order Items (${items.length}):*`);

    items.forEach((item, idx) => {
      const name = item.product?.name || 'Product';
      const sku = item.product?.sku ? ` (${item.product.sku})` : '';
      const lineTotal = item.total_price || item.quantity * item.unit_price;
      lines.push(
        `${idx + 1}. ${name}${sku} — ${item.quantity} × ₹${item.unit_price.toLocaleString('en-IN')} = ₹${lineTotal.toLocaleString('en-IN')}`
      );
    });

    lines.push(``);
    lines.push(`Subtotal: ₹${subtotal.toLocaleString('en-IN')}`);
    if (discountAmount > 0) {
      lines.push(`Discount: -₹${discountAmount.toLocaleString('en-IN')}`);
    }
    if (taxAmount > 0) {
      lines.push(`GST Tax: ₹${Math.round(taxAmount).toLocaleString('en-IN')}`);
    }
    lines.push(`*Final Payable Amount: ₹${Math.round(finalTotal).toLocaleString('en-IN')}*`);

    if (order.store?.payment_terms) {
      lines.push(`Payment Terms: ${order.store.payment_terms}`);
    }
    if (order.salesperson?.name) {
      lines.push(
        `Sales Officer: ${order.salesperson.name} (${order.salesperson.employee_id})`
      );
    }

    return lines.join('\n');
  },

  buildInvoiceHtml(order: Order, logoDataUri = ''): string {
    const invoiceNumber = this.getInvoiceNumber(order);
    const { items, subtotal, discountAmount, taxAmount, finalTotal } = computeTotals(order);

    const orderDate = new Date(order.order_date || order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const storeAddress = [
      order.store?.address,
      order.store?.area,
      order.store?.city,
      order.store?.pincode,
    ]
      .filter(Boolean)
      .join(', ');

    const logoHtml = logoDataUri
      ? `<img src="${logoDataUri}" alt="Motiba Logo" class="logo-img" />`
      : `<div class="brand">MOTIBA</div>`;

    const rowsHtml =
      items.length > 0
        ? items
            .map((item, idx) => {
              const name = escapeHtml(item.product?.name || 'Product');
              const sku = escapeHtml(item.product?.sku || 'N/A');
              const pack = escapeHtml(
                [item.product?.pack_size, item.product?.unit].filter(Boolean).join(' ')
              );
              const qty = item.quantity || 0;
              const unitPrice = (item.unit_price || 0).toLocaleString('en-IN');
              const lineTotal = (item.total_price || qty * (item.unit_price || 0)).toLocaleString(
                'en-IN'
              );
              return `
                <tr>
                  <td class="center">${idx + 1}</td>
                  <td>
                    <div class="prod-name">${name}</div>
                    <div class="prod-sku">SKU: ${sku}${pack ? ` &bull; ${pack}` : ''}</div>
                  </td>
                  <td class="num">${qty}</td>
                  <td class="num">&#8377;${unitPrice}</td>
                  <td class="num bold">&#8377;${lineTotal}</td>
                </tr>
              `;
            })
            .join('')
        : `<tr><td colspan="5" style="text-align:center;color:#795B50;padding:18px;">No line items recorded</td></tr>`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <style>
    @page { margin: 0; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #332019;
      margin: 0;
      padding: 32px 36px;
      background: #FFFFFF;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #970F18;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .brand-block {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-img {
      height: 68px;
      width: auto;
      max-width: 180px;
      object-fit: contain;
    }
    .company-info {
      display: flex;
      flex-direction: column;
    }
    .brand {
      font-size: 22px;
      font-weight: 800;
      color: #970F18;
      letter-spacing: 0.4px;
    }
    .company-name {
      font-size: 16px;
      font-weight: 800;
      color: #970F18;
    }
    .company-sub {
      font-size: 12px;
      color: #5C4137;
      margin-top: 2px;
      line-height: 1.4;
    }
    .inv-meta {
      text-align: right;
    }
    .inv-title {
      font-size: 22px;
      font-weight: 800;
      color: #332019;
      letter-spacing: 1px;
    }
    .inv-num {
      font-size: 14px;
      color: #970F18;
      font-weight: 800;
      margin-top: 4px;
    }
    .inv-date {
      font-size: 12px;
      color: #5C4137;
      margin-top: 2px;
    }
    .details-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 22px;
    }
    .detail-box {
      flex: 1;
      background: #FAF7F2;
      border: 1px solid #E9E0D2;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .box-label {
      font-size: 10px;
      font-weight: 800;
      color: #970F18;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
      border-bottom: 1px solid #E9E0D2;
      padding-bottom: 4px;
    }
    .box-title {
      font-size: 15px;
      font-weight: 800;
      color: #332019;
      margin-bottom: 4px;
    }
    .box-line {
      font-size: 12px;
      color: #5C4137;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #970F18;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 10px;
      text-align: left;
    }
    th.center, td.center { text-align: center; }
    th.num, td.num { text-align: right; }
    tbody tr:nth-child(even) {
      background: #FAF8F5;
    }
    td {
      padding: 10px 10px;
      border-bottom: 1px solid #E9E0D2;
      font-size: 12px;
      vertical-align: top;
    }
    td.bold { font-weight: 700; color: #332019; }
    .prod-name { font-weight: 700; color: #332019; font-size: 13px; }
    .prod-sku { font-size: 11px; color: #795B50; margin-top: 2px; }
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-top: 8px;
    }
    .notes-box {
      flex: 1;
      background: #FAF7F2;
      border: 1px solid #E9E0D2;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 12px;
      color: #5C4137;
    }
    .totals {
      width: 300px;
      margin-left: auto;
      background: #FAF7F2;
      border: 1px solid #E9E0D2;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 7px;
      color: #5C4137;
    }
    .tot-discount {
      color: #28633B;
      font-weight: 700;
    }
    .tot-final {
      border-top: 2px solid #970F18;
      padding-top: 10px;
      margin-top: 8px;
      margin-bottom: 0;
      font-size: 16px;
      font-weight: 800;
      color: #970F18;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="brand-block">
      ${logoHtml}
      <div class="company-info">
        <div class="company-name">Motiba FMCG Distribution</div>
        <div class="company-sub">Aarvi Enterprise &bull; Authorized FMCG Distributor</div>
        ${order.salesperson && 'assigned_area' in order.salesperson && order.salesperson.assigned_area ? `<div class="company-sub">Territory: ${escapeHtml(order.salesperson.assigned_area)}</div>` : ''}
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-title">INVOICE</div>
      <div class="inv-num">${escapeHtml(invoiceNumber)}</div>
      <div class="inv-date">Order #: ${escapeHtml(order.order_number)}</div>
      <div class="inv-date">Date: ${escapeHtml(orderDate)}</div>
    </div>
  </div>

  <div class="details-grid">
    <div class="detail-box">
      <div class="box-label">Billed To (Store Details)</div>
      <div class="box-title">${escapeHtml(order.store?.name || 'Retail Outlet')}</div>
      ${order.store?.owner_name ? `<div class="box-line"><strong>Owner / Contact:</strong> ${escapeHtml(order.store.owner_name)}</div>` : ''}
      ${order.store?.mobile ? `<div class="box-line"><strong>Mobile:</strong> ${escapeHtml(order.store.mobile)}${order.store?.alternate_mobile ? `, ${escapeHtml(order.store.alternate_mobile)}` : ''}</div>` : ''}
      ${storeAddress ? `<div class="box-line"><strong>Address:</strong> ${escapeHtml(storeAddress)}</div>` : ''}
      ${order.store?.store_type ? `<div class="box-line"><strong>Store Type:</strong> ${escapeHtml(order.store.store_type)}</div>` : ''}
      ${order.store?.gst_number ? `<div class="box-line"><strong>GSTIN:</strong> ${escapeHtml(order.store.gst_number)}</div>` : ''}
    </div>
    <div class="detail-box">
      <div class="box-label">Motiba &amp; Order Details</div>
      <div class="box-title">Aarvi Enterprise (Motiba)</div>
      ${order.salesperson?.name ? `<div class="box-line"><strong>Sales Officer:</strong> ${escapeHtml(order.salesperson.name)}</div>` : ''}
      ${order.salesperson?.employee_id ? `<div class="box-line"><strong>Employee ID:</strong> ${escapeHtml(order.salesperson.employee_id)}</div>` : ''}
      ${order.salesperson?.mobile ? `<div class="box-line"><strong>Contact:</strong> ${escapeHtml(order.salesperson.mobile)}</div>` : ''}
      <div class="box-line"><strong>Payment Terms:</strong> ${escapeHtml(order.store?.payment_terms || 'Net 30')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width:38px;">#</th>
        <th>Product &amp; SKU</th>
        <th class="num" style="width:65px;">Qty</th>
        <th class="num" style="width:95px;">Unit Price</th>
        <th class="num" style="width:110px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="bottom-section">
    ${
      order.notes
        ? `<div class="notes-box"><div class="box-label" style="margin-bottom:4px;">Order Notes</div>${escapeHtml(order.notes)}</div>`
        : '<div style="flex:1;"></div>'
    }
    <div class="totals">
      <div class="tot-row"><span>Subtotal</span><span>&#8377;${subtotal.toLocaleString('en-IN')}</span></div>
      ${
        discountAmount > 0
          ? `<div class="tot-row tot-discount"><span>Order Discount</span><span>-&#8377;${discountAmount.toLocaleString('en-IN')}</span></div>`
          : ''
      }
      <div class="tot-row"><span>Applicable Taxes (GST)</span><span>&#8377;${Math.round(taxAmount).toLocaleString('en-IN')}</span></div>
      <div class="tot-row tot-final"><span>Final Payable</span><span>&#8377;${Math.round(finalTotal).toLocaleString('en-IN')}</span></div>
    </div>
  </div>
</body>
</html>`;
  },

  async printOrDownloadPdf(order: Order): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      const logoDataUri = await getLogoDataUri();
      const html = this.buildInvoiceHtml(order, logoDataUri);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return { success: true };
      }
      const { uri } = await Print.printToFileAsync({ html });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        const invoiceNumber = this.getInvoiceNumber(order);
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Save Invoice ${invoiceNumber}`,
        });
      }
      return { success: true, uri };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF invoice.';
      return { success: false, error: message };
    }
  },

  async shareInvoice(order: Order): Promise<{ success: boolean; error?: string }> {
    try {
      const invoiceNumber = this.getInvoiceNumber(order);
      const shareText = this.buildInvoiceShareText(order);

      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({
            title: `Motiba Invoice ${invoiceNumber}`,
            text: shareText,
          });
          return { success: true };
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareText);
        }
        const logoDataUri = await getLogoDataUri();
        const html = this.buildInvoiceHtml(order, logoDataUri);
        await Print.printAsync({ html });
        return { success: true };
      }

      await Share.share({
        title: `Motiba Invoice ${invoiceNumber}`,
        message: shareText,
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to share invoice.';
      return { success: false, error: message };
    }
  },
};
