import React from 'react';
import { X } from 'lucide-react';

export interface CIProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
  wrapStyle?: React.CSSProperties;
  wrapClassName?: string;
}

export const CI: React.FC<CIProps> = ({ onClear, wrapStyle, wrapClassName, value, ...rest }) => (
  <div className={`ci-wrap${wrapClassName ? ' ' + wrapClassName : ''}`} style={wrapStyle}>
    <input value={value} {...rest} />
    {String(value ?? '').length > 0 && (
      <button type="button" className="ci-clear" onClick={onClear} title="Clear field" tabIndex={-1}>
        <X size={11} strokeWidth={2.5} />
      </button>
    )}
  </div>
);

export interface CTProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onClear: () => void;
  wrapStyle?: React.CSSProperties;
  wrapClassName?: string;
}

export const CT: React.FC<CTProps> = ({ onClear, wrapStyle, wrapClassName, value, ...rest }) => (
  <div className={`ci-wrap ci-textarea${wrapClassName ? ' ' + wrapClassName : ''}`} style={wrapStyle}>
    <textarea value={value} {...rest} />
    {String(value ?? '').length > 0 && (
      <button type="button" className="ci-clear" onClick={onClear} title="Clear field" tabIndex={-1}>
        <X size={11} strokeWidth={2.5} />
      </button>
    )}
  </div>
);
