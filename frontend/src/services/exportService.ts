import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
 * 1. Export as native Microsoft Excel (.xlsx)
 */
export const exportToExcel = (options: ExportDataOptions): void => {
  const { filename, title, headers, rows } = options;

  // Prepare worksheet data starting with Title, Subtitle, blank row, then headers & data
  const wsData: any[][] = [];

  // Title header block in Excel
  wsData.push([title]);
  if (options.subtitle) {
    wsData.push([options.subtitle]);
  }
  wsData.push([`Exported on: ${new Date().toLocaleString()}`]);
  
  if (options.summaryCards && options.summaryCards.length > 0) {
    const summaryRow = options.summaryCards.map((c) => `${c.label}: ${c.value}`).join(' | ');
    wsData.push([summaryRow]);
  }
  wsData.push([]); // Empty row before table

  // Table headers and rows
  wsData.push(headers);
  rows.forEach((row) => {
    wsData.push(row.map((cell) => (cell === null || cell === undefined ? '' : cell)));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-fit column widths based on maximum string lengths
  const colWidths = headers.map((h, colIndex) => {
    let maxLen = h.length;
    rows.forEach((r) => {
      const cellVal = String(r[colIndex] ?? '');
      if (cellVal.length > maxLen) {
        maxLen = Math.min(cellVal.length, 60); // Cap width at 60 chars
      }
    });
    return { wch: Math.max(maxLen + 3, 12) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report Data');

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName);
};

/**
 * 2. Export as Styled Table PDF (.pdf)
 */
export const exportToPDF = (options: ExportDataOptions): void => {
  const { filename, title, subtitle, headers, rows, summaryCards } = options;

  // Create A4 PDF (Landscape if > 6 columns, else Portrait)
  const orientation = headers.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 36;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, 36, currentY);

  currentY += 16;

  // Subtitle / Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  const dateStr = `Generated on ${new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} • Total Records: ${rows.length}`;
  const subText = subtitle ? `${subtitle} | ${dateStr}` : dateStr;
  doc.text(subText, 36, currentY);

  currentY += 12;

  // Optional summary metrics in PDF
  if (summaryCards && summaryCards.length > 0) {
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const summaryStr = summaryCards.map((c) => `${c.label}: ${c.value}`).join('   |   ');
    doc.text(summaryStr, 36, currentY);
    currentY += 8;
  }

  // Draw separator line
  currentY += 4;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(36, currentY, pageWidth - 36, currentY);
  currentY += 12;

  // Build AutoTable
  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: rows.map((r) => r.map((c) => sanitizeCell(c))),
    theme: 'striped',
    margin: { left: 36, right: 36, bottom: 40 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      overflow: 'linebreak',
      textColor: [51, 65, 85], // slate-700
    },
    headStyles: {
      fillColor: [30, 41, 59], // dark slate
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pageNum = data.pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      const footerText = `Page ${pageNum} of ${totalPages} — HighPhaus Financial Management SaaS`;
      doc.text(footerText, pageWidth - 36, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    },
  });

  const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalName);
};

/**
 * 3. Export as CSV (.csv)
 */
export const exportToCSV = (options: ExportDataOptions): void => {
  const { filename, headers, rows } = options;

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel compatibility
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
    // Convert headers + rows into objects array
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
 * When pasted into Excel or Google Sheets, auto-formats into separate cells!
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
    console.warn('Clipboard write failed, falling back to textarea element', err);
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
 */
export const printTableReport = (options: ExportDataOptions): void => {
  const { title, subtitle, headers, rows, summaryCards } = options;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    window.print();
    return;
  }

  const summaryHtml =
    summaryCards && summaryCards.length > 0
      ? `<div style="display: flex; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          ${summaryCards
            .map(
              (c) => `
            <div style="background: #f1f5f9; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 13px;">
              <span style="color: #64748b; font-weight: 500;">${c.label}:</span>
              <strong style="color: #0f172a; margin-left: 4px;">${c.value}</strong>
            </div>`
            )
            .join('')}
        </div>`
      : '';

  const tableRowsHtml = rows
    .map(
      (row, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        ${row
          .map(
            (c) => `
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155;">
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
        <title>${title} - Print View</title>
        <meta charset="utf-8" />
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 15mm; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 20px;
            padding: 0;
          }
          h1 { margin: 0 0 4px 0; font-size: 20px; color: #0f172a; }
          p.subtitle { margin: 0 0 16px 0; font-size: 13px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th {
            background-color: #1e293b;
            color: #ffffff;
            font-weight: 600;
            font-size: 12px;
            text-align: left;
            padding: 9px 10px;
            border-bottom: 2px solid #0f172a;
          }
          .footer {
            margin-top: 24px;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">${subtitle || ''} Generated on ${new Date().toLocaleString()}</p>
        ${summaryHtml}
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <span>HighPhaus Financial Enterprise SaaS</span>
          <span>Records count: ${rows.length}</span>
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
