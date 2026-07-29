"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CreditCard,
  ArrowLeftRight,
  Banknote,
  Settings,
  BarChart3,
  Shield,
  Bell,
  Megaphone,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Building2,
  FileText,
  UserCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "teller", "customer_service", "accountant", "ict_staff", "customer"] },
    ],
  },
  {
    title: "BANKING",
    items: [
      { label: "accounts", href: "/accounts", icon: <CreditCard className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "teller", "customer_service", "customer"] },
      { label: "transactions", href: "/transactions", icon: <ArrowLeftRight className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "teller", "customer_service", "accountant", "customer"] },
      { label: "transfers", href: "/transfer", icon: <Banknote className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "teller", "customer_service", "customer"] },
      { label: "loans", href: "/loans", icon: <FileText className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "accountant", "customer"] },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "users", href: "/users", icon: <Users className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "teller", "customer_service", "accountant", "ict_staff"] },
      { label: "customers", href: "/customers", icon: <Users className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "customer_service"] },
      { label: "employees", href: "/employees", icon: <UserCog className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager"] },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "reports", href: "/reports", icon: <BarChart3 className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "accountant"] },
      { label: "audit_logs", href: "/audit-logs", icon: <Shield className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "ict_staff"] },
      { label: "settings", href: "/settings", icon: <Settings className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager"] },
    ],
  },
  {
    title: "OTHER",
    items: [
      { label: "notifications", href: "/notifications", icon: <Bell className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "teller", "customer_service", "accountant", "ict_staff", "customer"] },
      { label: "announcements", href: "/announcements", icon: <Megaphone className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager"] },
      { label: "profile", href: "/profile", icon: <UserCircle className="h-[18px] w-[18px]" />, roles: ["super_admin", "branch_manager", "teller", "customer_service", "accountant", "ict_staff", "customer"] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const theme = {
    sidebar: "bg-gradient-to-b from-[#176B3D] via-[#155c34] to-[#104628]",
    sidebarHover: "hover:bg-white/10 hover:translate-x-0.5",
    sidebarActive: "bg-white/10",
    sidebarText: "text-white/60",
    sidebarActiveText: "text-white",
    sidebarAccent: "#F8CC58",
  };

  useEffect(() => {
    const handleMobileToggle = () => setMobileOpen((prev) => !prev);
    window.addEventListener("toggle-sidebar", handleMobileToggle);
    return () => window.removeEventListener("toggle-sidebar", handleMobileToggle);
  }, []);

  const handleCollapse = (next: boolean) => {
    setCollapsed(next);
    window.dispatchEvent(
      new CustomEvent("sidebar-resize", { detail: { width: next ? 68 : 260 } })
    );
  };

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => user && item.roles.includes(user.role)),
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg lg:hidden transition-all duration-300"
        style={{ background: `linear-gradient(135deg, ${theme.sidebarAccent}, ${theme.sidebarAccent}cc)` }}
      >
        {mobileOpen ? <X className="h-5 w-5 text-[#1A1918] dark:text-white" /> : <Menu className="h-5 w-5 text-[#1A1918] dark:text-white" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen text-white transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
          theme.sidebar,
          collapsed ? "w-[68px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Background image */}
        <div className="absolute inset-0 bg-[url('/bank-bg.svg')] bg-cover bg-center opacity-[0.08] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/50 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#1F8A4D]/[0.1] to-transparent pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-full h-48 bg-gradient-to-t from-[#1F8A4D]/[0.06] to-transparent pointer-events-none" />

        {/* Logo area */}
        <div
          className={cn(
            "relative flex h-16 items-center border-b transition-all duration-300",
            collapsed ? "justify-center px-2" : "px-5",
            "border-white/10"
          )}
        >
          {!collapsed ? (
            <div className="flex items-center gap-3 w-full">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.sidebarAccent}, ${theme.sidebarAccent}cc)` }}>
                <img src="/logo.png" alt="Gabiley Bank" className="h-10 w-10 object-cover rounded-lg" style={{ filter: "saturate(1.3) contrast(1.1) brightness(1.05)" }} />
                <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20 pointer-events-none" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-wide text-white">Gabiley Bank</span>
                <span className="text-[10px] text-[#F8CC58]/80 tracking-wider uppercase">Management System</span>
              </div>
              <button
                onClick={() => handleCollapse(!collapsed)}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-white/60" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.sidebarAccent}, ${theme.sidebarAccent}cc)` }}>
                <img src="/logo.png" alt="Gabiley Bank" className="h-10 w-10 object-cover rounded-lg" style={{ filter: "saturate(1.3) contrast(1.1) brightness(1.05)" }} />
                <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20 pointer-events-none" />
              </div>
              <button
                onClick={() => handleCollapse(!collapsed)}
                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-white/60" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          {filteredSections.map((section, sectionIdx) => (
            <div key={section.title} className={cn("mb-1", sectionIdx > 0 && "mt-3")}>
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: `${theme.sidebarAccent}99` }}>
                    {t(section.title.toLowerCase())}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: `${theme.sidebarAccent}25` }} />
                </div>
              )}

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const isNotifications = item.href === "/notifications";
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                          collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                          isActive
                            ? `${theme.sidebarActive} ${theme.sidebarActiveText} shadow-lg`
                            : `${theme.sidebarText} ${theme.sidebarHover} hover:translate-x-0.5`
                        )}
                        style={isActive ? {
                          boxShadow: `0 4px 12px ${theme.sidebarAccent}20`
                        } : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {/* Active accent left border */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full" style={{ backgroundColor: theme.sidebarAccent }} />
                        )}

                        <span
                          className={cn(
                            "shrink-0 transition-colors duration-200",
                            isActive ? "" : "text-white/50 group-hover:text-white/70"
                          )}
                          style={isActive ? { color: theme.sidebarAccent } : undefined}
                        >
                          {item.icon}
                        </span>

                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{t(item.label)}</span>
                            {isNotifications && unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-[#1A1918] dark:text-white" style={{ backgroundColor: theme.sidebarAccent }}>
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </>
                        )}

                        {collapsed && isNotifications && unreadCount > 0 && (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full" style={{ backgroundColor: theme.sidebarAccent }} />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Separator */}
        <div className="relative mx-3 h-px" style={{ background: `linear-gradient(90deg, transparent, ${theme.sidebarAccent}40, transparent)` }} />

        {/* User info */}
        <div className={cn("relative p-3 transition-all duration-300", collapsed && "px-2 py-3")}>
          {user && !collapsed ? (
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-white/10 transition-all duration-300" style={{ background: `linear-gradient(135deg, ${theme.sidebarAccent}10, transparent)` }}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-[#1A1918] dark:text-white overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.sidebarAccent}, ${theme.sidebarAccent}cc)` }}>
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span className={user.profile_picture ? 'sr-only' : ''}>
                  {user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                <p className="text-[10px] capitalize px-2 py-0.5 rounded-full w-fit mt-0.5" style={{ background: `${theme.sidebarAccent}20`, color: theme.sidebarAccent }}>
                  {user.role.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          ) : user && collapsed ? (
            <div className="flex justify-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-[#1A1918] dark:text-white overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, ${theme.sidebarAccent}, ${theme.sidebarAccent}cc)` }}>
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span className={user.profile_picture ? 'sr-only' : ''}>
                  {user.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Logout */}
        <div className={cn("relative px-3 pb-3 transition-all duration-300", collapsed && "px-2 pb-3")}>
          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent",
              "text-white/50 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/20",
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
