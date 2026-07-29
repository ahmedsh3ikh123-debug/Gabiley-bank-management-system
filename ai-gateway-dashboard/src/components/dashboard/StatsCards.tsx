"use client";

import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { statsCards } from "@/data/mock-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Users,
};

const colorMap = {
  blue: {
    bg: "bg-neon-blue/10",
    border: "border-neon-blue/20",
    glow: "glow-blue",
    icon: "text-neon-blue",
    gradient: "from-neon-blue/20 to-transparent",
  },
  green: {
    bg: "bg-neon-green/10",
    border: "border-neon-green/20",
    glow: "glow-green",
    icon: "text-neon-green",
    gradient: "from-neon-green/20 to-transparent",
  },
  pink: {
    bg: "bg-neon-pink/10",
    border: "border-neon-pink/20",
    glow: "glow-pink",
    icon: "text-neon-pink",
    gradient: "from-neon-pink/20 to-transparent",
  },
  purple: {
    bg: "bg-neon-purple/10",
    border: "border-neon-purple/20",
    glow: "glow-purple",
    icon: "text-neon-purple",
    gradient: "from-neon-purple/20 to-transparent",
  },
  cyan: {
    bg: "bg-neon-cyan/10",
    border: "border-neon-cyan/20",
    glow: "glow-cyan",
    icon: "text-neon-cyan",
    gradient: "from-neon-cyan/20 to-transparent",
  },
  orange: {
    bg: "bg-neon-orange/10",
    border: "border-neon-orange/20",
    glow: "glow-orange",
    icon: "text-neon-orange",
    gradient: "from-neon-orange/20 to-transparent",
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function StatsCards() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
    >
      {statsCards.map((stat) => {
        const Icon = iconMap[stat.icon];
        const colors = colorMap[stat.color];
        return (
          <motion.div
            key={stat.title}
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`glass-card glass-card-hover p-4 cursor-pointer relative overflow-hidden group`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center`}>
                  {Icon && <Icon className={`w-[18px] h-[18px] ${colors.icon}`} />}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  stat.trend === "up" && stat.title !== "Error Rate"
                    ? "text-neon-green"
                    : stat.trend === "down" && stat.title === "Error Rate"
                    ? "text-neon-green"
                    : "text-red-400"
                }`}>
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary mb-0.5">{stat.value}</p>
              <p className="text-xs text-text-muted">{stat.title}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
