import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "./Brand";
import { IconButton } from "./ui";

export function AppShell({
  breadcrumb,
  command,
  children,
  onHome,
  onSettings,
  onLogout,
}: {
  breadcrumb?: ReactNode;
  command?: ReactNode;
  children: ReactNode;
  onHome: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar__left">
          <button type="button" className="brand-button" onClick={onHome}>
            <BrandMark size={38} />
            <span className="brand-text">
              <strong>OT-Form</strong>
              <small>บันทึกค่าตอบแทนนอกเวลาราชการ</small>
            </span>
          </button>
          {breadcrumb && (
            <div className="breadcrumb">
              <ChevronRight size={14} />
              {breadcrumb}
            </div>
          )}
        </div>

        <div className="top-bar__right">
          <IconButton label="ตั้งค่าระบบ" onClick={onSettings}>
            <SettingsIcon size={18} />
          </IconButton>
          <IconButton label="ออกจากระบบ" onClick={onLogout}>
            <LogOut size={18} />
          </IconButton>
        </div>
      </header>

      {command && <div className="command-bar">{command}</div>}

      <main className="app-main">{children}</main>
    </div>
  );
}

export function PageHeader({
  back,
  eyebrow,
  title,
  description,
  actions,
}: {
  back?: { label: string; onClick: () => void };
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="page-head__main">
        {back && (
          <button type="button" className="back-link" onClick={back.onClick}>
            <ArrowLeft size={16} /> {back.label}
          </button>
        )}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}
