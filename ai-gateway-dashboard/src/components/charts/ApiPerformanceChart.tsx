"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { apiPerformanceData } from "@/data/mock-data";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-border">
        <p className="text-xs text-text-muted mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">{entry.name}:</span>
            <span className="font-medium text-text-primary">{entry.value}{entry.name === "latency" ? "ms" : entry.name === "errorRate" ? "%" : ""}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const barColors = ["#3B82F6", "#8B5CF6", "#10B981", "#F97316", "#EC4899", "#06B6D4"];

export default function ApiPerformanceChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-text-primary">API Performance</h3>
          <p className="text-xs text-text-muted mt-0.5">Latency by API endpoint (ms)</p>
        </div>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={apiPerformanceData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748B", fontSize: 10 }}
              axisLine={{ stroke: "#1E293B" }}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="latency" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {apiPerformanceData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
