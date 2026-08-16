"use client";

import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { cn, getRoleLabel } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OfflineIndicator } from "@/components/offline/offline-banner";
import { LanguageModal } from "@/components/ui/language-modal";
import {
  Bell,
  Moon,
  Sun,
  Globe,
  LogOut,
  User,
  Settings,
  Search,
  Menu,
  Mail,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function Topbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme: themeMode, setTheme } = useTheme();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageModalOpen, setLanguageModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchMessageUnreadCount();
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchMessageUnreadCount();
      }, 30000);
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

  const fetchMessageUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/messages/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessageUnreadCount(data.count || 0);
      }
    } catch {
      // ignore
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center px-4 shadow-sm lg:px-6 transition-all duration-300 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 backdrop-blur-xl">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const event = new CustomEvent("toggle-sidebar");
            window.dispatchEvent(event);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hidden items-center gap-1.5 text-sm md:flex text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-900 dark:text-white">{t("dashboard")}</span>
        </nav>
      </div>

      {/* Center - Search */}
      <div className="mx-auto flex-1 max-w-md px-4 lg:px-8">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:border-[#1F8A4D] focus:ring-[#1F8A4D]/20 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-500"
          />
        </form>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Offline Indicator */}
        <div className="hidden sm:block">
          <OfflineIndicator />
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(themeMode === "dark" ? "light" : "dark")}
          className="h-9 w-9 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          onClick={() => router.push("/settings")}
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>

        {/* Language Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          onClick={() => setLanguageModalOpen(true)}
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">Change language</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-lg transition-colors",
            "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          )}
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#F8CC58] px-1 text-[10px] font-bold text-[#1A1918] dark:text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Messages */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-lg transition-colors",
            "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          )}
          onClick={() => router.push("/messages")}
        >
          <Mail className="h-4 w-4" />
          {messageUnreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#1F8A4D] px-1 text-[10px] font-bold text-white">
              {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
            </span>
          )}
        </Button>

        {/* Divider */}
        <div className="mx-1 hidden h-6 w-px bg-gray-200 dark:bg-gray-700 sm:block" />

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative flex h-9 items-center gap-2 rounded-lg px-2 transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1F8A4D] to-[#155c34] text-xs font-bold text-white overflow-hidden">
                  {user.profile_picture ? (
                    <img
                      src={user.profile_picture}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
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
                <div className="hidden flex-col items-start text-left lg:flex">
                  <span className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.full_name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-1 w-fit text-xs bg-[#1F8A4D]/10 text-[#1F8A4D] dark:bg-[#1F8A4D]/30 dark:text-white">
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Language Modal */}
      <LanguageModal open={languageModalOpen} onOpenChange={setLanguageModalOpen} />
    </header>
  );
}
