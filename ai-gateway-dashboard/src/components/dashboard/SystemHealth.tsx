"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { systemHealthData } from "@/data/mock-data";
import { getStatusBadgeClass } from "@/lib/utils";

export default function SystemHealth() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">System Health</h3>
        <button className="text-xs text-neon-blue hover:text-neon-blue/80 transition-colors flex items-center gap-1">
          Details <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2.5">
        {systemHealthData.map((service, index) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.08 }}
            className="flex items-center justify-between p-3 rounded-xl bg-surface-light/30 hover:bg-surface-light/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                service.status === "Healthy" ? "bg-neon-green" : "bg-neon-orange"
              } ${service.status === "Healthy" ? "animate-pulse-glow" : ""}`} />
              <div>
                <p className="text-xs font-medium text-text-primary">{service.name}</p>
                <p className="text-[10px] text-text-muted">Uptime: {service.uptime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-text-muted font-mono">{service.latency}</span>
              <span className={`status-badge text-[10px] ${getStatusBadgeClass(service.status)}`}>
                {service.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
