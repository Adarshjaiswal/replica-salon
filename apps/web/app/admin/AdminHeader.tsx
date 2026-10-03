"use client";

import {
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterAdminCommands, type AdminCommand } from "./adminCommands";

interface AdminHeaderProps {
  commands: AdminCommand[];
  collapsed: boolean;
  refreshing: boolean;
  title: string;
  userName: string;
  userRole: string;
  onCommand: (path: string) => void;
  onLogout: () => void;
  onOpenMobileNavigation: () => void;
  onRefresh: () => void;
  onToggleCollapsed: () => void;
}

export default function AdminHeader({
  commands,
  collapsed,
  refreshing,
  title,
  userName,
  userRole,
  onCommand,
  onLogout,
  onOpenMobileNavigation,
  onRefresh,
  onToggleCollapsed,
}: AdminHeaderProps): React.ReactElement {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const filteredCommands = useMemo(() => {
    return filterAdminCommands(commands, query);
  }, [commands, query]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function selectCommand(command: AdminCommand): void {
    setQuery("");
    setSearchOpen(false);
    onCommand(command.path);
  }

  return (
    <header className="enterprise-admin-header">
      <div className="admin-header-leading">
        <button
          aria-label="Open navigation"
          className="admin-header-icon mobile-only"
          onClick={onOpenMobileNavigation}
          title="Open navigation"
          type="button"
        >
          <Menu aria-hidden="true" size={19} />
        </button>
        <button
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="admin-header-icon desktop-sidebar-control"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          type="button"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" size={19} />
          ) : (
            <PanelLeftClose aria-hidden="true" size={19} />
          )}
        </button>
      </div>

      <div className="admin-command-search">
        <Search aria-hidden="true" size={19} />
        <input
          aria-controls="admin-command-results"
          aria-expanded={searchOpen}
          aria-label="Search admin menu"
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Search menu - jump to any screen"
          ref={searchRef}
          type="search"
          value={query}
        />
        <kbd>⌘K</kbd>
        {searchOpen ? (
          <div
            className="admin-command-results"
            id="admin-command-results"
            role="listbox"
          >
            {filteredCommands.length > 0 ? (
              filteredCommands.map((command) => (
                <button
                  aria-selected="false"
                  key={command.path}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCommand(command)}
                  role="option"
                  type="button"
                >
                  <span>{command.label}</span>
                  <small>{command.group}</small>
                </button>
              ))
            ) : (
              <p>No matching admin screen</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="admin-header-actions">
        <button
          aria-label="Refresh current page"
          className="admin-header-icon"
          disabled={refreshing}
          onClick={onRefresh}
          title="Refresh current page"
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} />
        </button>
        <div className="admin-profile-menu">
          <button
            aria-expanded={profileOpen}
            className="admin-profile-trigger"
            onClick={() => setProfileOpen((open) => !open)}
            type="button"
          >
            <span className="admin-profile-avatar" aria-hidden="true">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="admin-profile-copy">
              <strong>{userName}</strong>
              <small>{userRole}</small>
            </span>
            <ChevronDown aria-hidden="true" size={15} />
          </button>
          {profileOpen ? (
            <div className="admin-profile-popover">
              <div>
                <ShieldCheck aria-hidden="true" size={18} />
                <span>
                  <strong>{title}</strong>
                  <small>Secure admin session</small>
                </span>
              </div>
              <button onClick={onLogout} type="button">
                <LogOut aria-hidden="true" size={17} />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
