"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import StatsCards from "@/components/dashboard/StatsCards";
import RequestVolumeChart from "@/components/charts/RequestVolumeChart";
import RequestsByApiChart from "@/components/charts/RequestsByApiChart";
import ApiPerformanceChart from "@/components/charts/ApiPerformanceChart";
import RecentActivityTable from "@/components/dashboard/RecentActivityTable";
import TopConsumers from "@/components/dashboard/TopConsumers";
import SystemHealth from "@/components/dashboard/SystemHealth";
import Alerts from "@/components/dashboard/Alerts";

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed left-0 top-0 bottom-0 w-[260px] bg-surface/80 border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl skeleton" />
            <div className="space-y-1.5">
              <div className="w-20 h-3 skeleton rounded" />
              <div className="w-28 h-2 skeleton rounded" />
            </div>
          </div>
        </div>
        <div className="p-3 space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-[18px] h-[18px] skeleton rounded" />
              <div className="w-24 h-3 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="ml-[260px]">
        <div className="h-16 border-b border-border bg-surface/60 flex items-center px-6">
          <div className="w-96 h-10 skeleton rounded-xl" />
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 h-80 skeleton rounded-2xl" />
            <div className="h-80 skeleton rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoadingSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-background"
        >
          <Sidebar />
          <div className="ml-[260px] transition-all duration-300">
            <TopNav />
            <main className="p-6">
              <div className="mb-6">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
                  <p className="text-sm text-text-muted mt-1">
                    Monitor your AI API gateway performance and traffic
                  </p>
                </motion.div>
              </div>

              <StatsCards />

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mt-6">
                <div className="xl:col-span-3 space-y-6">
                  <RequestVolumeChart />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RequestsByApiChart />
                    <ApiPerformanceChart />
                  </div>
                  <RecentActivityTable />
                </div>
                <div className="space-y-6">
                  <TopConsumers />
                  <SystemHealth />
                  <Alerts />
                </div>
              </div>
            </main>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
