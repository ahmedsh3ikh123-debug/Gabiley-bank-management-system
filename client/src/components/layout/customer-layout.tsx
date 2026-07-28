"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Topbar } from "./topbar";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OfflineBanner } from "@/components/offline/offline-banner";
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Send,
  Banknote,
  Bell,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const customerNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "My Accounts", href: "/accounts", icon: <CreditCard className="h-5 w-5" /> },
  { label: "Transactions", href: "/transactions", icon: <ArrowLeftRight className="h-5 w-5" /> },
  { label: "Transfer", href: "/transfer", icon: <Send className="h-5 w-5" /> },
  { label: "Loans", href: "/loans", icon: <Banknote className="h-5 w-5" /> },
  { label: "Notifications", href: "/notifications", icon: <Bell className="h-5 w-5" /> },
  { label: "Profile", href: "/profile", icon: <User className="h-5 w-5" /> },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (!loading && user && user.role !== "customer") {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "customer") return null;

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />

      {/* Top navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F8A4D] text-white font-bold text-sm">
              GB
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wide">Gabiley Bank</h1>
              <p className="text-xs text-[#F8CC58]/80">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Offline
              </span>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex gap-1 overflow-x-auto px-4 scrollbar-thin">
          {customerNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <p>Gabiley Bank Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
