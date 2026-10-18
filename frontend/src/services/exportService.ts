import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getStoredSettings } from './storageService';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportDataOptions<T = any> {
  filename: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  jsonData?: T[];
  summaryCards?: { label: string; value: string }[];
}

/**
 * Clean cell text for CSV / TSV / Export
 */
const sanitizeCell = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

/**
 * Determines whether a column likely contains numeric/monetary data
 */
const isNumericColumn = (rows: (string | number | boolean | null | undefined)[][], colIndex: number): boolean => {
  let sampleCount = 0;
  let numericCount = 0;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const val = rows[i]?.[colIndex];
    if (val !== null && val !== undefined && val !== '') {
      sampleCount++;
      const str = String(val).replace(/[$€£₹,\s]/g, '').trim();
      if (!isNaN(Number(str))) {
        numericCount++;
      }
    }
  }

  return sampleCount > 0 && numericCount / sampleCount >= 0.7;
};

/**
 * 1. Export as native Microsoft Excel (.xlsx) with clean executive layout
 */
export const exportToExcel = (options: ExportDataOptions): void => {
  const { filename, title, headers, rows, summaryCards } = options;
  const settings = getStoredSettings();

  const wsData: any[][] = [];

  // 1. Company Brand Header
  wsData.push([settings.companyName || 'HIGHPHAUS']);
  if (settings.tagline) {
    wsData.push([settings.tagline]);
  }
  wsData.push([`${settings.address || ''}${settings.pincode ? ` - ${settings.pincode}` : ''}`]);
  if (settings.taxId) {
    wsData.push([`GSTIN / Tax ID: ${settings.taxId}`]);
  }
  wsData.push([]); // Spacer

  // 2. Document Title & Generation Meta
  wsData.push([title.toUpperCase()]);
  if (options.subtitle) {
    wsData.push([options.subtitle]);
  }
  wsData.push([`Generated on: ${new Date().toLocaleString()} | Total Records: ${rows.length}`]);

  // 3. Optional Summary Metrics
  if (summaryCards && summaryCards.length > 0) {
    wsData.push([]);
    wsData.push(summaryCards.map((c) => `${c.label.toUpperCase()}: ${c.value}`));
  }
  wsData.push([]); // Empty row before table

  // 4. Table Headers
  wsData.push(headers.map((h) => h.toUpperCase()));

  // 5. Table Rows (preserve numbers for Excel formula compatibility)
  rows.forEach((row) => {
    wsData.push(
      row.map((cell) => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'number') return cell;
        const str = String(cell).trim();
        // Check if raw numeric
        if (/^-?\d+(\.\d+)?$/.test(str)) {
          return Number(str);
        }
        return str;
      })
    );
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column width calculations
  const colWidths = headers.map((h, colIndex) => {
    let maxLen = h.length;
    rows.forEach((r) => {
      const cellVal = String(r[colIndex] ?? '');
      if (cellVal.length > maxLen) {
        maxLen = Math.min(cellVal.length, 50);
      }
    });
    return { wch: Math.max(maxLen + 4, 14) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ledger Data');

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
};

/**
 * 2. Export as High-Contrast Black & White PDF Document (.pdf)
 * Strictly matches the HighPhaus Invoice PDF typography, black accent bar, and executive layout.
 */
export const exportToPDF = (options: ExportDataOptions): void => {
  const { filename, title, subtitle, headers, rows, summaryCards } = options;
  const settings = getStoredSettings();

  // Create A4 PDF (Landscape if > 6 columns, else Portrait)
  const orientation = headers.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  let currentY = 32;

  // --------------------------------------------------------------------------
  // HEADER SECTION (Matches InvoiceViewModal header layout)
  // --------------------------------------------------------------------------

  // Left: Monogram Badge & Company Identity
  const companyName = (settings.companyName || 'HIGHPHAUS').toUpperCase();
  const companyTagline = (settings.tagline || 'CREATIVE MARKETING & DIGITAL GROWTH AGENCY').toUpperCase();
  const companyAddress = settings.address?.trim()
    ? `${settings.address.trim()}${settings.pincode ? ` - ${settings.pincode.trim()}` : ''}`
    : '';
  const companyTaxId = settings.taxId?.trim() ? `GSTIN: ${settings.taxId.trim()}` : '';

  // Monogram box [Obsidian Black Background #09090b with white text]
  doc.setFillColor(9, 9, 11); // #09090b
  doc.rect(margin, currentY, 32, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('HP', margin + 16, currentY + 20, { align: 'center' });

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(9, 9, 11); // #09090b
  doc.text(companyName, margin + 40, currentY + 13);

  // Tagline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(82, 82, 91); // #52525b
  doc.text(companyTagline, margin + 40, currentY + 22);

  // Address & GSTIN
  if (companyAddress || companyTaxId) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(113, 113, 122); // #71717a
    const addressLine = [companyAddress, companyTaxId].filter(Boolean).join(' • ');
    doc.text(addressLine, margin + 40, currentY + 31);
  }

  // Right: Document Title & Meta (Bold Obsidian Black #09090b)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(9, 9, 11);
  doc.text(title.toUpperCase(), pageWidth - margin, currentY + 15, { align: 'right' });

  // Right Subtitle / Generation Timestamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 82, 91);
  const dateStr = `GENERATED ON ${new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase()} • ${rows.length} RECORDS`;
  doc.text(dateStr, pageWidth - margin, currentY + 26, { align: 'right' });

  if (subtitle) {
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text(subtitle.toUpperCase(), pageWidth - margin, currentY + 35, { align: 'right' });
  }

  currentY += 42;

  // --------------------------------------------------------------------------
  // SIGNATURE BLACK ACCENT LINE (Exactly like the Invoice header divider)
  // --------------------------------------------------------------------------
  doc.setFillColor(9, 9, 11); // Obsidian Black #09090b
  doc.rect(margin, currentY, contentWidth, 2.5, 'F');
  currentY += 12;

  // --------------------------------------------------------------------------
  // EXECUTIVE KPI SUMMARY CARDS (Crisp rectangular boxes with black borders)
  // --------------------------------------------------------------------------
  if (summaryCards && summaryCards.length > 0) {
    const cardGap = 8;
    const cardCount = summaryCards.length;
    const cardWidth = Math.min(150, (contentWidth - (cardCount - 1) * cardGap) / cardCount);
    const cardHeight = 32;

    summaryCards.forEach((card, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);

      // Card box background and black outline
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(9, 9, 11); // #09090b
      doc.setLineWidth(1);
      doc.rect(cardX, currentY, cardWidth, cardHeight, 'FD');

      // Card Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(113, 113, 122); // #71717a
      doc.text(card.label.toUpperCase(), cardX + 8, currentY + 11);

      // Card Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(9, 9, 11); // #09090b
      doc.text(card.value, cardX + 8, currentY + 24);
    });

    currentY += cardHeight + 12;
  }

  // --------------------------------------------------------------------------
  // DATA TABLE (High-contrast Black Header, White Rows, Crisp Borders)
  // --------------------------------------------------------------------------
  const columnAlignments: Record<number, 'left' | 'center' | 'right'> = {};
  headers.forEach((_, colIdx) => {
    columnAlignments[colIdx] = isNumericColumn(rows, colIdx) ? 'right' : 'left';
  });

  const columnStyles: Record<number, any> = {};
  Object.keys(columnAlignments).forEach((key) => {
    const idx = Number(key);
    columnStyles[idx] = { halign: columnAlignments[idx] };
  });

  autoTable(doc, {
    startY: currentY,
    head: [headers.map((h) => h.toUpperCase())],
    body: rows.map((r) => r.map((c) => sanitizeCell(c))),
    theme: 'plain',
    margin: { left: margin, right: margin, bottom: 42 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 6, bottom: 6, left: 7, right: 7 },
      overflow: 'linebreak',
      textColor: [9, 9, 11], // Pure obsidian black text #09090b
      lineColor: [228, 228, 231], // #e4e4e7
      lineWidth: { bottom: 0.5 },
    },
    headStyles: {
      fillColor: [9, 9, 11], // Pure obsidian black #09090b
      textColor: [255, 255, 255], // Pure white #ffffff
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 7, bottom: 7, left: 7, right: 7 },
      lineColor: [9, 9, 11],
      lineWidth: 0,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250], // Crisp subtle off-white #fafafa
    },
    columnStyles,
    didDrawPage: (data) => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pageNum = data.pageNumber;

      // Signature Footer Black Line (Matches Invoice footer)
      doc.setFillColor(9, 9, 11); // #09090b
      doc.rect(margin, pageHeight - 28, contentWidth, 1.2, 'F');

      // Left footer: SaaS audit credential
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(113, 113, 122);
      const leftFooter = `${companyName} • VERIFIED FINANCIAL REPORT & AUDIT TRAIL`;
      doc.text(leftFooter, margin, pageHeight - 16);

      // Right footer: Page count
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(9, 9, 11);
      const rightFooter = `PAGE ${pageNum} OF ${totalPages}`;
      doc.text(rightFooter, pageWidth - margin, pageHeight - 16, { align: 'right' });
    },
  });

  const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalName);
};

/**
 * 3. Export as CSV (.csv) with UTF-8 BOM
 */
export const exportToCSV = (options: ExportDataOptions): void => {
  const { filename, headers, rows } = options;

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Windows Excel compatibility
    [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const finalName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', finalName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 4. Export as JSON (.json)
 */
export const exportToJSON = (options: ExportDataOptions): void => {
  const { filename, jsonData, headers, rows } = options;

  let exportObj: any;
  if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
    exportObj = jsonData;
  } else {
    exportObj = rows.map((r) => {
      const item: Record<string, any> = {};
      headers.forEach((h, idx) => {
        item[h] = r[idx] ?? null;
      });
      return item;
    });
  }

  const jsonStr = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const finalName = filename.endsWith('.json') ? filename : `${filename}.json`;
  link.setAttribute('download', finalName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 5. Copy to Clipboard as TSV (Tab Separated Values)
 */
export const copyTableToClipboard = async (options: ExportDataOptions): Promise<boolean> => {
  const { headers, rows } = options;
  const tsvContent = [
    headers.map((h) => String(h).replace(/\t|\r?\n/g, ' ')).join('\t'),
    ...rows.map((row) =>
      row
        .map((cell) => (cell === null || cell === undefined ? '' : String(cell).replace(/\t|\r?\n/g, ' ')))
        .join('\t')
    ),
  ].join('\r\n');

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(tsvContent);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed, using fallback', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = tsvContent;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    console.error('Fallback clipboard copy failed', e);
    return false;
  }
};

/**
 * 6. Print Formatted Table View
 * Styled exactly like the Black & White Invoice printable document.
 */
export const printTableReport = (options: ExportDataOptions): void => {
  const { title, subtitle, headers, rows, summaryCards } = options;
  const settings = getStoredSettings();

  const companyName = (settings.companyName || 'HIGHPHAUS').toUpperCase();
  const companyTagline = (settings.tagline || 'Creative Marketing & Digital Growth Agency').toUpperCase();
  const companyAddress = settings.address?.trim()
    ? `${settings.address.trim()}${settings.pincode ? ` - ${settings.pincode.trim()}` : ''}`
    : '';
  const companyTaxId = settings.taxId?.trim() ? `GSTIN: ${settings.taxId.trim()}` : '';

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    window.print();
    return;
  }

  const summaryHtml =
    summaryCards && summaryCards.length > 0
      ? `<div style="display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          ${summaryCards
            .map(
              (c) => `
            <div style="border: 1.5px solid #09090b; background: #ffffff; padding: 6px 14px; border-radius: 4px; min-width: 130px;">
              <div style="color: #71717a; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;">${c.label}</div>
              <div style="color: #09090b; font-weight: 800; font-size: 14px; margin-top: 2px;">${c.value}</div>
            </div>`
            )
            .join('')}
        </div>`
      : '';

  const tableRowsHtml = rows
    .map(
      (row, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'}; border-bottom: 1px solid #e4e4e7;">
        ${row
          .map(
            (c, cIdx) => `
          <td style="padding: 7px 10px; font-size: 11px; color: #09090b; text-align: ${
            isNumericColumn(rows, cIdx) ? 'right' : 'left'
          };">
            ${sanitizeCell(c)}
          </td>`
          )
          .join('')}
      </tr>`
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - HighPhaus Report</title>
        <meta charset="utf-8" />
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { margin: 12mm; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #09090b;
            background: #ffffff;
            margin: 24px;
            padding: 0;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .company-badge {
            width: 32px;
            height: 32px;
            background: #09090b;
            color: #ffffff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 12px;
            border-radius: 4px;
            margin-right: 8px;
          }
          .black-accent-line {
            width: 100%;
            height: 3px;
            background-color: #09090b;
            margin-top: 8px;
            margin-bottom: 14px;
          }
          .footer-black-line {
            width: 100%;
            height: 1.5px;
            background-color: #09090b;
            margin-top: 24px;
            margin-bottom: 8px;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th {
            background-color: #09090b !important;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 8px 10px;
            border: none;
          }
          .footer-meta {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #71717a;
            font-weight: 600;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div style="display: flex; align-items: center;">
            <div class="company-badge">HP</div>
            <div>
              <div style="font-size: 16px; font-weight: 900; letter-spacing: -0.01em; color: #09090b;">${companyName}</div>
              <div style="font-size: 9px; font-weight: 700; color: #52525b; text-transform: uppercase;">${companyTagline}</div>
              ${companyAddress || companyTaxId ? `<div style="font-size: 9px; color: #71717a;">${[companyAddress, companyTaxId].filter(Boolean).join(' • ')}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: 900; color: #09090b; text-transform: uppercase;">${title}</div>
            <div style="font-size: 10px; color: #52525b; font-weight: 600; margin-top: 2px;">
              ${subtitle ? `${subtitle} • ` : ''}GENERATED: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} (${rows.length} RECORDS)
            </div>
          </div>
        </div>

        <div class="black-accent-line"></div>

        ${summaryHtml}

        <table>
          <thead>
            <tr>
              ${headers
                .map(
                  (h, idx) =>
                    `<th style="text-align: ${isNumericColumn(rows, idx) ? 'right' : 'left'};">${h}</th>`
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer-black-line"></div>
        <div class="footer-meta">
          <span>${companyName} FINANCIAL MANAGEMENT SAAS • VERIFIED & CONFIDENTIAL</span>
          <span>RECORDS COUNT: ${rows.length}</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};
