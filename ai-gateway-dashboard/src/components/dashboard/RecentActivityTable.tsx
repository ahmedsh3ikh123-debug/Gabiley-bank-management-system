"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";
import { recentActivityData } from "@/data/mock-data";
import { getStatusBadgeClass, getStatusColor } from "@/lib/utils";

export default function RecentActivityTable() {
  const [filter, setFilter] = useState("all");

  const filteredData = filter === "all"
    ? recentActivityData
    : recentActivityData.filter((item) => {
        if (filter === "success") return item.status.startsWith("2");
        if (filter === "error") return item.status.startsWith("4") || item.status.startsWith("5");
        return true;
      });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Recent API Activity</h3>
          <p className="text-xs text-text-muted mt-0.5">Real-time request logs</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Filter..."
              className="bg-surface-light/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-blue/50 transition-all w-36"
            />
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-surface-light/50 border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-neon-blue/50 transition-all cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Errors</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-medium text-text-muted uppercase tracking-wider pb-3">Time</th>
              <th className="text-left text-[11px] font-medium text-text-muted uppercase tracking-wider pb-3">API Endpoint</th>
              <th className="text-left text-[11px] font-medium text-text-muted uppercase tracking-wider pb-3">Consumer</th>
              <th className="text-left text-[11px] font-medium text-text-muted uppercase tracking-wider pb-3">Status</th>
              <th className="text-left text-[11px] font-medium text-text-muted uppercase tracking-wider pb-3">Response Time</th>
              <th className="text-left text-[11px] font-medium text-text-muted uppercase tracking-wider pb-3">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="table-row border-b border-border/50 last:border-0"
              >
                <td className="py-3 text-xs text-text-muted font-mono">{row.time}</td>
                <td className="py-3">
                  <span className="text-xs font-mono text-neon-blue">{row.endpoint}</span>
                </td>
                <td className="py-3">
                  <span className="text-xs text-text-secondary">{row.consumer}</span>
                </td>
                <td className="py-3">
                  <span className={`status-badge ${getStatusBadgeClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3">
                  <span className={`text-xs font-mono ${getStatusColor(row.status === "200" ? "200" : row.status.startsWith("5") ? "500" : "error")}`}>
                    {row.responseTime}
                  </span>
                </td>
                <td className="py-3">
                  <span className="text-xs font-mono text-text-muted">{row.ip}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
