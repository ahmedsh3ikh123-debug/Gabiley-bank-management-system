"use client";

import { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import { useLanguage } from "@/contexts/language-context";

import api from "@/lib/api";
import {
  Settings,
  Save,
  Loader2,
  Database,
  Shield,
  Globe,
  Lock,
  Server,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Building2,
  DollarSign,
  Mail,
  Phone,
  FolderArchive,
} from "lucide-react";

interface SettingsData {
  bank_name: string;
  currency: string;
  transfer_fee: string;
  min_balance: string;
  max_transfer: string;
  interest_rate: string;
  maintenance_mode: boolean;
  support_email: string;
  support_phone: string;
}

function SettingsContent() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    bank_name: "",
    currency: "USD",
    transfer_fee: "0",
    min_balance: "0",
    max_transfer: "100000",
    interest_rate: "0",
    maintenance_mode: false,
    support_email: "",
    support_phone: "",
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/settings");
      const data = res.data;
      if (data) {
        const map: SettingsData = {
          bank_name: "",
          currency: "USD",
          transfer_fee: "0",
          min_balance: "0",
          max_transfer: "100000",
          interest_rate: "0",
          maintenance_mode: false,
          support_email: "",
          support_phone: "",
        };
        data.forEach((item: { setting_key: string; setting_value: string }) => {
          const key = item.setting_key as keyof SettingsData;
          if (key === "maintenance_mode") {
            map[key] = item.setting_value === "true";
          } else {
            (map as any)[key] = item.setting_value;
          }
        });
        setSettings(map);
      }
    } catch {
      toastError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: String(value),
      }));
      await api.put("/admin/settings", { settings: payload });
      success("Settings saved successfully");
    } catch {
      toastError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBacking(true);
      const response = await api.get("/admin/backup/full", { responseType: "blob", timeout: 300000 });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers["content-disposition"];
      const fileName = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `gabiley-bank-backup-${new Date().toISOString().split("T")[0]}.zip`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      success("Full backup downloaded successfully — all data included");
    } catch {
      toastError("Failed to download backup");
    } finally {
      setBacking(false);
    }
  };

  const handleRestore = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith(".zip")) {
        toastError("Only .zip backup files are allowed");
        return;
      }

      try {
        setRestoring(true);
        const formData = new FormData();
        formData.append("backupZip", file);
        await api.post("/admin/restore/full", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        success("System restored successfully from " + file.name);
      } catch {
        toastError("Failed to restore system");
      } finally {
        setRestoring(false);
      }
    };
    input.click();
  };

  const updateSetting = (key: keyof SettingsData, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-md">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-32 rounded bg-gray-200" />
                <div className="h-3 w-48 rounded bg-gray-200" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-10 rounded bg-gray-100" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1A1918] dark:text-white">{t("settings")}</h1>
          <p className="mt-1 text-gray-500">{t("system_settings")}</p>
        </div>
        <Badge variant="outline" className="gap-1 border-gray-200 w-fit">
          <Shield className="h-3 w-3" />
          {user?.role === "super_admin" ? "Super Admin" : "Branch Manager"}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Globe className="h-4 w-4" />
            {t("main")}
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <DollarSign className="h-4 w-4" />
            {t("banking")}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Shield className="h-4 w-4" />
            {t("security")}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Server className="h-4 w-4" />
            {t("system")}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("bank_name")}</CardTitle>
                  <CardDescription>{t("main")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("bank_name")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={settings.bank_name}
                      onChange={(e) => updateSetting("bank_name", e.target.value)}
                      placeholder="Gabiley Bank"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("currency")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={settings.currency}
                      onChange={(e) => updateSetting("currency", e.target.value)}
                      placeholder="USD"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("support_email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="email"
                      value={settings.support_email}
                      onChange={(e) => updateSetting("support_email", e.target.value)}
                      placeholder="support@gabileybank.com"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("support_phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={settings.support_phone}
                      onChange={(e) => updateSetting("support_phone", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="pl-10 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings */}
        <TabsContent value="financial" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("banking")}</CardTitle>
                  <CardDescription>{t("banking")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("transfer_fee")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.transfer_fee}
                    onChange={(e) => updateSetting("transfer_fee", e.target.value)}
                    placeholder="0.00"
                    className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("min_balance")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.min_balance}
                    onChange={(e) => updateSetting("min_balance", e.target.value)}
                    placeholder="0.00"
                    className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("max_transfer")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.max_transfer}
                    onChange={(e) => updateSetting("max_transfer", e.target.value)}
                    placeholder="100000"
                    className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("interest_rate")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.interest_rate}
                    onChange={(e) => updateSetting("interest_rate", e.target.value)}
                    placeholder="0.00"
                    className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("system")}</CardTitle>
                  <CardDescription>{t("security")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-base font-medium text-gray-900">{t("maintenance_mode")}</Label>
                    <p className="text-sm text-gray-500">{t("system")}</p>
                  </div>
                </div>
                <Switch
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) => updateSetting("maintenance_mode", checked)}
                />
              </div>
              {settings.maintenance_mode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">{t("warning")}</p>
                      <p className="mt-1 text-sm text-amber-700">{t("system")}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("backup_restore")}</CardTitle>
                  <CardDescription>{t("system")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-gray-600">
                {t("backup_restore")}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-12 border-gray-200 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
                  onClick={handleBackup}
                  disabled={backing}
                >
                  {backing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FolderArchive className="mr-2 h-4 w-4" />
                  )}
                  {t("backup_restore")}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-[#1F8A4D] bg-[#1F8A4D] text-white hover:bg-[#176B3D] dark:border-[#1F8A4D] dark:bg-[#1F8A4D] dark:text-white dark:hover:bg-[#176B3D]"
                  onClick={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {t("restore")}
                </Button>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">{t("backup_restore")}</p>
                    <p className="mt-1 text-sm text-blue-700">{t("backup_restore")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-800 h-11 px-8"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t("save_changes")}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRoles={["super_admin", "branch_manager"]}>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
