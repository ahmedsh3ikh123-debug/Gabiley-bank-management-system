"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  HeartPulse,
  Layers,
  Package,
  Shield,
  Gauge,
  CreditCard,
  Key,
  Lock,
  FileKey,
  Network,
  ShieldAlert,
  Server,
  Boxes,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { sidebarNavigation } from "@/data/mock-data";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  BarChart3,
  Activity,
  HeartPulse,
  Layers,
  Package,
  Shield,
  Gauge,
  CreditCard,
  Key,
  Lock,
  FileKey,
  Network,
  ShieldAlert,
  Server,
  Boxes,
  ScrollText,
  Settings,
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-surface/80 backdrop-blur-xl border-r border-border"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center glow-blue">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-text-primary">AI Gateway</h1>
                <p className="text-[10px] text-text-muted">Management Console</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center glow-blue mx-auto">
            <Zap className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-1">
          {sidebarNavigation.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  "sidebar-item flex items-center gap-3 px-3 py-2.5 text-sm transition-all",
                  item.active
                    ? "bg-neon-blue/10 text-neon-blue border-l-3 border-neon-blue"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                )}
              >
                {Icon && <Icon className="w-[18px] h-[18px] shrink-0" />}
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </a>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-border">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-glow" />
                <span className="text-xs font-medium text-text-primary">System Status</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">Uptime</span>
                  <span className="text-neon-green">99.99%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">Latency</span>
                  <span className="text-text-secondary">12ms</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-muted">Throughput</span>
                  <span className="text-text-secondary">24K/min</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-glow" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-neon-blue/50 transition-all"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
