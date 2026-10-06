"use client";

import { ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import BrandLogo from "../BrandLogo";

interface AdminSidebarProps {
  children: ReactNode;
  collapsed: boolean;
  open: boolean;
  userName: string;
  onClose: () => void;
}

export default function AdminSidebar({
  children,
  collapsed,
  open,
  userName,
  onClose,
}: AdminSidebarProps): React.ReactElement {
  return (
    <aside
      className={`admin-sidebar ${open ? "admin-sidebar-open" : ""} ${collapsed ? "admin-sidebar-collapsed" : ""}`}
      aria-label="Admin navigation"
    >
      <div className="admin-brand-row">
        <div className="auth-brand">
          <BrandLogo className="replica-brand-admin" subtitle="Admin" />
        </div>
        <button
          aria-label="Close navigation"
          className="admin-header-icon mobile-only"
          onClick={onClose}
          title="Close navigation"
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      {children}
      <div className="admin-sidebar-account">
        <span className="admin-account-avatar" aria-hidden="true">
          {userName.charAt(0).toUpperCase()}
        </span>
        <span className="admin-account-copy">
          <strong>{userName}</strong>
          <small>Administrator</small>
        </span>
        <ShieldCheck aria-hidden="true" size={17} />
      </div>
    </aside>
  );
}
