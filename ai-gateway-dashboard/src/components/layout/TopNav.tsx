"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
  Clock,
} from "lucide-react";

export default function TopNav() {
  const [showProfile, setShowProfile] = useState(false);
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [selectedTime, setSelectedTime] = useState("Last 24 Hours");

  const timeOptions = [
    "Last 1 Hour",
    "Last 6 Hours",
    "Last 12 Hours",
    "Last 24 Hours",
    "Last 7 Days",
    "Last 30 Days",
  ];

  return (
    <header className="sticky top-0 z-40 h-16 bg-surface/60 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search APIs, consumers, endpoints..."
            className="w-full bg-surface-light/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowTimeFilter(!showTimeFilter)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-xl hover:border-neon-blue/30 transition-all"
          >
            <Clock className="w-4 h-4" />
            <span>{selectedTime}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showTimeFilter && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-48 glass-card p-1.5 z-50"
              >
                {timeOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedTime(option);
                      setShowTimeFilter(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                      selectedTime === option
                        ? "bg-neon-blue/10 text-neon-blue"
                        : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-light/50 transition-all relative">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-neon-pink rounded-full" />
        </button>

        <button className="p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-light/50 transition-all">
          <Settings className="w-[18px] h-[18px]" />
        </button>

        <div className="w-px h-8 bg-border mx-1" />

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-light/50 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-text-primary leading-tight">John Doe</p>
              <p className="text-[11px] text-text-muted">Admin</p>
            </div>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </button>
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-56 glass-card p-1.5 z-50"
              >
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium text-text-primary">John Doe</p>
                  <p className="text-xs text-text-muted">john@company.com</p>
                </div>
                {["My Profile", "Organization", "Billing", "Preferences"].map((item) => (
                  <button
                    key={item}
                    className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-all"
                  >
                    {item}
                  </button>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
