import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formatDateUi, formatTimeUi } from "../lib/thai";

export function assetUrl(name: string): string {
  const base = import.meta.env.BASE_URL || "./";
  return `${base}assets/${name}`;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "gold" | "danger" | "soft";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={label}
      title={label}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "sky" | "gold" | "pink" | "green" | "red" | "violet";
  className?: string;
}) {
  return <span className={`badge badge--${tone} ${className}`}>{children}</span>;
}

export function Card({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      {label && (
        <span className="field__label">
          {label}
          {required && <span className="field__required">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function DateInput({
  value,
  onChange,
  min,
  max,
  required,
  className = "input",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className="date-input-wrap">
      <input
        type="date"
        className={`${className} date-input`}
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={`date-input-display ${value ? "" : "is-placeholder"}`}>
        {value ? formatDateUi(value) : "เลือกวันที่"}
      </span>
    </div>
  );
}

export function TimeInput({
  value,
  onChange,
  disabled,
  className = "input",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="time-input-wrap">
      <input
        type="time"
        className={`${className} time-input`}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={`time-input-display ${value ? "" : "is-placeholder"}`}>
        {value ? formatTimeUi(value) : disabled ? "-" : "--:--"}
      </span>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={`segmented__item ${value === option.value ? "is-active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "sky",
  className = "",
}: {
  value: number;
  tone?: "sky" | "gold" | "green";
  className?: string;
}) {
  return (
    <div
      className={`progress progress--${tone} ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal modal--${size} ${className}`}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="ปิด" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

type ToastTone = "success" | "error" | "info";
type ToastFn = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ToastFn>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: string; message: string; tone: ToastTone }[]>(
    [],
  );

  const notify = useCallback<ToastFn>((message, tone = "success") => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    setToasts((prev) => [...prev, { id, message, tone }].slice(-3));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast--${toast.tone}`}>
              <span className="toast__dot" />
              {toast.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}
