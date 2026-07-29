"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { requestsByApiData } from "@/data/mock-data";

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
          <span className="text-text-secondary">{payload[0].name}:</span>
          <span className="font-medium text-text-primary">{payload[0].value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function RequestsByApiChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-5"
    >
      <div className="mb-5">
        <h3 className="text-base font-semibold text-text-primary">Requests by API</h3>
        <p className="text-xs text-text-muted mt-0.5">Distribution across API endpoints</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-[200px] w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={requestsByApiData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {requestsByApiData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {requestsByApiData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-text-secondary">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-text-primary">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
