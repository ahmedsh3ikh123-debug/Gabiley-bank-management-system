"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import { alertsData } from "@/data/mock-data";

const alertIcons = {
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const alertColors = {
  warning: {
    bg: "bg-neon-orange/10",
    border: "border-neon-orange/20",
    icon: "text-neon-orange",
  },
  error: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: "text-red-400",
  },
  info: {
    bg: "bg-neon-blue/10",
    border: "border-neon-blue/20",
    icon: "text-neon-blue",
  },
};

export default function Alerts() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Alerts</h3>
        <span className="text-[10px] text-text-muted bg-surface-light px-2 py-0.5 rounded-full">
          {alertsData.length} active
        </span>
      </div>
      <div className="space-y-2.5">
        {alertsData.map((alert, index) => {
          const Icon = alertIcons[alert.type as keyof typeof alertIcons];
          const colors = alertColors[alert.type as keyof typeof alertColors];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className={`p-3 rounded-xl border ${colors.border} ${colors.bg} group hover:scale-[1.01] transition-all cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${colors.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-text-primary truncate">{alert.title}</p>
                    <span className="text-[10px] text-text-muted shrink-0">{alert.time}</span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-1 line-clamp-2">{alert.message}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
