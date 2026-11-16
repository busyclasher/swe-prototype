// Reusable UI building blocks (ui-agent.md section 4).

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export function Button({ variant = 'primary', size, icon, children, className = '', type = 'button', ...rest }) {
  return (
    <button type={type} className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** Link styled as a button (hash routing). */
export function ButtonLink({ to, variant = 'secondary', size, icon, children, className = '' }) {
  return (
    <a href={`#${to}`} className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      <span>{children}</span>
    </a>
  );
}

const TONE_ICON = { success: 'checkCircle', warning: 'alert', danger: 'xCircle', info: 'info', neutral: null, primary: null };

/** Status badge: always text (+ icon), never colour alone (NFR-04). */
export function Badge({ tone = 'neutral', icon, children }) {
  const iconName = icon === undefined ? TONE_ICON[tone] : icon;
  return (
    <span className={`badge badge-${tone}`}>
      {iconName && <Icon name={iconName} size={14} />}
      {children}
    </span>
  );
}

export function Card({ title, subtitle, actions, children, className = '', as: Tag = 'section', id }) {
  const headingId = useId();
  return (
    <Tag className={`card ${className}`} aria-labelledby={title ? headingId : undefined} id={id}>
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title && <h2 id={headingId} className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function MetricCard({ label, value, hint, icon, tone }) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ''}`}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {icon && <span className="metric-icon"><Icon name={icon} size={18} /></span>}
      </div>
      <div className="metric-value tabular">{value}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={icon} size={22} /></span>
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}

export function Alert({ tone = 'info', title, children, className = '' }) {
  return (
    <div className={`alert alert-${tone} ${className}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={TONE_ICON[tone] || 'info'} size={20} />
      <div>
        {title && <p className="alert-title">{title}</p>}
        {children && <div className="alert-body">{children}</div>}
      </div>
    </div>
  );
}

/**
 * Form field wrapper. Children receive the generated id via render prop or
 * pass `id` yourself. Error text is linked with aria-describedby.
 */
export function Field({ label, hint, error, required, children, id: givenId, className = '' }) {
  const autoId = useId();
  const id = givenId || autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
      {error && (
        <p id={errId} className="field-error">
          <Icon name="xCircle" size={14} /> {error}
        </p>
      )}
    </div>
  );
}

/** Accessible modal dialog with focus management and Escape to close. */
export function Modal({ open, title, onClose, children, footer, tone }) {
  const ref = useRef(null);
  const titleId = useId();
  const lastFocus = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const node = ref.current;
    const focusables = () =>
      node.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])');
    const first = node.querySelector('[data-autofocus]') || focusables()[0];
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === 'Tab') {
        const items = Array.from(focusables());
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      lastFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${tone ? `modal-${tone}` : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <header className="modal-header">
          <h2 id={titleId} className="modal-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

// ---------- Toasts ----------
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((tone, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, tone, message }]); // at most 3 visible
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  // Cleared when the signed-in user changes, so one user's messages are never shown to the next.
  push.clear = () => setToasts([]);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={TONE_ICON[t.tone] || 'info'} size={18} />
            <span>{t.message}</span>
            <button type="button" className="icon-btn icon-btn-sm" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Simple progress bar with a text value alongside (never colour alone). */
export function Meter({ value, max, tone = 'primary', label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className={`meter-fill meter-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Definition-list style key/value rows. */
export function DataList({ items }) {
  return (
    <dl className="datalist">
      {items.map(([k, v]) => (
        <div key={k} className="datalist-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
