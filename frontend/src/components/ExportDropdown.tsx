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
  Sparkles,
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
  btnClassName = 'btn btn-secondary',
  size = 'md',
  align = 'right',
  tooltip = 'Export data to Excel, PDF, CSV, JSON and more',
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
        className={btnClassName}
        title={tooltip}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          cursor: 'pointer',
          padding: size === 'sm' ? '0.35rem 0.65rem' : '0.5rem 0.85rem',
          fontSize: size === 'sm' ? '0.8rem' : '0.875rem',
          fontWeight: 600,
          transition: 'all 0.15s ease',
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download size={size === 'sm' ? 14 : 15} style={{ opacity: 0.9 }} />
        <span>{label}</span>
        <ChevronDown
          size={13}
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
            minWidth: '230px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.15), 0 4px 10px -2px rgba(15, 23, 42, 0.05)',
            padding: '0.4rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            animation: 'fadeInScale 0.15s ease-out',
          }}
        >
          {/* Header indicator */}
          <div
            style={{
              padding: '0.4rem 0.65rem 0.35rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-tertiary, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
              marginBottom: '0.2rem',
            }}
          >
            <span>Choose Format</span>
            <Sparkles size={11} style={{ opacity: 0.7, color: 'var(--primary, #3b82f6)' }} />
          </div>

          {/* 1. PDF Document */}
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
              color: 'var(--text-primary, #1e293b)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>PDF Document</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
                  Formatted printable report
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.12rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
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
              color: 'var(--text-primary, #1e293b)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileSpreadsheet size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Excel Spreadsheet</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
                  Formatted MS Excel book
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.12rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
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
              color: 'var(--text-primary, #1e293b)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCode size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>CSV Spreadsheet</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
                  Universal comma-separated
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.12rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
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
              color: 'var(--text-primary, #1e293b)',
              cursor: 'pointer',
              fontSize: '0.84rem',
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileJson size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Raw JSON Data</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
                  Developer & backup format
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.12rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#d97706',
              }}
            >
              .JSON
            </span>
          </button>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--border-subtle, #f1f5f9)',
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
              background: copied ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              color: copied ? '#059669' : 'var(--text-primary, #1e293b)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '5px',
                  backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                  color: copied ? '#059669' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </div>
              <span style={{ fontWeight: 500 }}>
                {copied ? 'Copied into clipboard!' : 'Copy to Clipboard (TSV)'}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary, #94a3b8)' }}>Paste ready</span>
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
              color: 'var(--text-primary, #1e293b)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              textAlign: 'left',
              transition: 'background 0.12s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(100, 116, 139, 0.1)',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Printer size={13} />
              </div>
              <span style={{ fontWeight: 500 }}>Print Report</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary, #94a3b8)' }}>Printer</span>
          </button>
        </div>
      )}
    </div>
  );
};
