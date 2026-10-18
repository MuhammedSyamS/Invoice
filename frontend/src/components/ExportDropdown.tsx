import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileCode,
  FileJson,
  Copy,
  Check,
  Printer,
} from 'lucide-react';
import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  exportToJSON,
  copyTableToClipboard,
  printTableReport,
  type ExportDataOptions,
} from '../services/exportService';

export interface ExportDropdownProps {
  /** Function returning latest export data payload or static payload */
  getData: () => ExportDataOptions;
  label?: string;
  btnClassName?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  tooltip?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  getData,
  label = 'Export',
  btnClassName,
  size = 'md',
  align = 'right',
  tooltip = 'Export data in executive Black & White PDF, Excel, CSV and more',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleAction = async (actionType: 'excel' | 'pdf' | 'csv' | 'json' | 'copy' | 'print') => {
    try {
      setIsExporting(actionType);
      const data = getData();

      if (actionType === 'excel') {
        exportToExcel(data);
      } else if (actionType === 'pdf') {
        exportToPDF(data);
      } else if (actionType === 'csv') {
        exportToCSV(data);
      } else if (actionType === 'json') {
        exportToJSON(data);
      } else if (actionType === 'copy') {
        const ok = await copyTableToClipboard(data);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        }
      } else if (actionType === 'print') {
        printTableReport(data);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(null);
      if (actionType !== 'copy') {
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={btnClassName || 'btn btn-secondary'}
        title={tooltip}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          cursor: 'pointer',
          padding: size === 'sm' ? '0.35rem 0.65rem' : '0.45rem 0.85rem',
          fontSize: size === 'sm' ? '0.8rem' : '0.85rem',
          fontWeight: 700,
          borderRadius: 'var(--radius-sm, 6px)',
          border: '1.5px solid var(--border-color, #27272a)',
          backgroundColor: 'var(--bg-card, #121215)',
          color: 'var(--text-primary, #f4f4f5)',
          transition: 'all 0.15s ease',
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download size={size === 'sm' ? 13 : 14} style={{ opacity: 0.9 }} />
        <span>{label}</span>
        <ChevronDown
          size={12}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            opacity: 0.7,
            marginLeft: '0.1rem',
          }}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 1050,
            minWidth: '245px',
            backgroundColor: 'var(--bg-card, #121215)',
            borderRadius: '8px',
            border: '1.5px solid var(--border-color, #27272a)',
            boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.4)',
            padding: '0.4rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            animation: 'fadeInScale 0.15s ease-out',
          }}
        >
          {/* Header indicator with Obsidian Black & White branding */}
          <div
            style={{
              padding: '0.4rem 0.65rem 0.35rem',
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted, #71717a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1.5px solid var(--border-subtle, #1f1f23)',
              marginBottom: '0.25rem',
            }}
          >
            <span>SELECT EXPORT FORMAT</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary, #a1a1aa)' }}>
              HIGHPHAUS B&W
            </span>
          </div>

          {/* 1. PDF Document (Featured Primary Option) */}
          <button
            type="button"
            onClick={() => handleAction('pdf')}
            disabled={isExporting === 'pdf'}
            className="export-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.5rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary, #f4f4f5)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: '#ffffff',
                  color: '#09090b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                <FileText size={14} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>PDF Document</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                  Invoice White & Black style
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.12rem 0.4rem',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#09090b',
                letterSpacing: '0.04em',
              }}
            >
              .PDF
            </span>
          </button>

          {/* 2. Excel Spreadsheet */}
          <button
            type="button"
            onClick={() => handleAction('excel')}
            disabled={isExporting === 'excel'}
            className="export-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.5rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary, #f4f4f5)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary, #f4f4f5)',
                  border: '1px solid var(--border-color, #27272a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileSpreadsheet size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Excel Spreadsheet</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                  Native .xlsx workbook
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.12rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary, #a1a1aa)',
                border: '1px solid var(--border-color, #27272a)',
              }}
            >
              .XLSX
            </span>
          </button>

          {/* 3. CSV File */}
          <button
            type="button"
            onClick={() => handleAction('csv')}
            disabled={isExporting === 'csv'}
            className="export-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.5rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary, #f4f4f5)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary, #f4f4f5)',
                  border: '1px solid var(--border-color, #27272a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCode size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>CSV Spreadsheet</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                  Standard UTF-8 BOM
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.12rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary, #a1a1aa)',
                border: '1px solid var(--border-color, #27272a)',
              }}
            >
              .CSV
            </span>
          </button>

          {/* 4. JSON Format */}
          <button
            type="button"
            onClick={() => handleAction('json')}
            disabled={isExporting === 'json'}
            className="export-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.5rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary, #f4f4f5)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary, #f4f4f5)',
                  border: '1px solid var(--border-color, #27272a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileJson size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Raw JSON Data</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #a1a1aa)' }}>
                  Structured data dump
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.12rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary, #a1a1aa)',
                border: '1px solid var(--border-color, #27272a)',
              }}
            >
              .JSON
            </span>
          </button>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--border-subtle, #1f1f23)',
              margin: '0.2rem 0',
            }}
          />

          {/* 5. Copy Table */}
          <button
            type="button"
            onClick={() => handleAction('copy')}
            disabled={copied}
            className="export-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: copied ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: copied ? 'var(--success, #10b981)' : 'var(--text-primary, #f4f4f5)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '5px',
                  backgroundColor: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: copied ? '#10b981' : 'var(--text-secondary, #a1a1aa)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </div>
              <span style={{ fontWeight: 600 }}>
                {copied ? 'Copied into clipboard!' : 'Copy to Clipboard (TSV)'}
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #71717a)' }}>Sheets ready</span>
          </button>

          {/* 6. Print Report */}
          <button
            type="button"
            onClick={() => handleAction('print')}
            className="export-dropdown-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary, #f4f4f5)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary, #a1a1aa)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Printer size={13} />
              </div>
              <span style={{ fontWeight: 600 }}>Print Report</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #71717a)' }}>B&W View</span>
          </button>
        </div>
      )}
    </div>
  );
};
