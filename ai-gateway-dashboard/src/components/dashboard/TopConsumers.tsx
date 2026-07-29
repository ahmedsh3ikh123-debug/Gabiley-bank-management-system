"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { topConsumersData } from "@/data/mock-data";
import { getStatusBadgeClass } from "@/lib/utils";

export default function TopConsumers() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Top Consumers</h3>
        <button className="text-xs text-neon-blue hover:text-neon-blue/80 transition-colors flex items-center gap-1">
          View All <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-3">
        {topConsumersData.map((consumer, index) => (
          <motion.div
            key={consumer.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-xl bg-surface-light/30 hover:bg-surface-light/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center text-[11px] font-bold text-neon-blue">
                {consumer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium text-text-primary group-hover:text-neon-blue transition-colors">
                  {consumer.name}
                </p>
                <p className="text-[10px] text-text-muted">{consumer.requests} requests</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`status-badge text-[10px] ${getStatusBadgeClass(consumer.status)}`}>
                {consumer.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
