"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
  Landmark, ArrowRight, Shield, CreditCard, ArrowLeftRight,
  Banknote, FileText, Users, BarChart3, CheckCircle2, Star,
  Zap, Lock, Eye, ChevronRight, Menu, X, Wallet, Globe,
  Bell, LayoutDashboard, Sparkles, Sun, Moon, ChevronDown,
} from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const features = [
    { icon: CreditCard, title: t("account_management"), description: t("account_management_desc"), color: "bg-primary/10 text-primary" },
    { icon: ArrowLeftRight, title: t("transactions_feature"), description: t("transactions_desc"), color: "bg-secondary/10 text-secondary" },
    { icon: Banknote, title: t("fund_transfers"), description: t("fund_transfers_desc"), color: "bg-purple-500/10 text-purple-500" },
    { icon: FileText, title: t("loan_services"), description: t("loan_services_desc"), color: "bg-pink-500/10 text-pink-500" },
    { icon: BarChart3, title: t("reports_analytics"), description: t("reports_desc"), color: "bg-sky-500/10 text-sky-500" },
    { icon: Users, title: t("employee_management"), description: t("employee_desc"), color: "bg-orange-500/10 text-orange-500" },
  ];

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F8CC58] to-[#E4B155] shadow-xl shadow-[#F8CC58]/25">
            <Landmark className="h-8 w-8 text-[#1A1918] dark:text-white" />
          </div>
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#F8CC58]/40 border-t-[#F8CC58]" />
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background Image - Light Mode */}
      <div className="fixed inset-0 pointer-events-none dark:hidden">
        <img src="/auth-bg.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/40 to-white/70" />
      </div>
      {/* Background Image - Dark Mode */}
      <div className="fixed inset-0 pointer-events-none hidden dark:block">
        <img src="/auth-bg.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-black dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 lg:h-24">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8CC58] to-[#E4B155] shadow-lg shadow-[#F8CC58]/20">
                <img src="/logo.png" alt="Gabiley Bank" className="h-16 w-16 object-cover rounded-xl" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-extrabold tracking-wide text-white">Gabiley Bank</span>
                <span className="block text-[11px] text-[#F8CC58] tracking-wider uppercase">{t("management_system")}</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-base font-semibold text-gray-300 hover:text-white hover:bg-[#22c55e] px-4 py-2 rounded-xl transition-all duration-300">{t("powerful_features")}</a>
              <a href="#dashboard" className="text-base font-semibold text-gray-300 hover:text-white hover:bg-[#22c55e] px-4 py-2 rounded-xl transition-all duration-300">{t("dashboard_preview")}</a>
              <a href="#how-it-works" className="text-base font-semibold text-gray-300 hover:text-white hover:bg-[#22c55e] px-4 py-2 rounded-xl transition-all duration-300">{t("how_it_works")}</a>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="relative">
                <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{language === "en" ? "EN" : language === "so" ? "SO" : "AR"}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 py-2 rounded-xl bg-black border border-gray-800 shadow-xl z-50">
                    <button onClick={() => { setLanguage("en"); setLangMenuOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${language === "en" ? "text-[#F8CC58] bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/10"}`}>
                      English
                    </button>
                    <button onClick={() => { setLanguage("so"); setLangMenuOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${language === "so" ? "text-[#F8CC58] bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/10"}`}>
                      Soomaali
                    </button>
                    <button onClick={() => { setLanguage("ar"); setLangMenuOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${language === "ar" ? "text-[#F8CC58] bg-white/10" : "text-gray-300 hover:text-white hover:bg-white/10"}`}>
                      العربية
                    </button>
                  </div>
                )}
              </div>



              <Link href="/login">
                <Button variant="ghost" className="hidden sm:flex">{t("login")}</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:to-[#16a34a]/90 text-white font-semibold shadow-lg shadow-[#22c55e]/20">
                  {t("register")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 bg-black">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">{t("powerful_features")}</a>
              <a href="#dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">{t("dashboard_preview")}</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">{t("how_it_works")}</a>
              <div className="pt-2 border-t border-gray-800 space-y-2">
                <div className="flex items-center gap-2 px-4 py-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <button onClick={() => setLanguage("en")} className={`px-3 py-1 rounded-lg text-xs ${language === "en" ? "bg-[#F8CC58] text-black" : "text-gray-400 hover:text-white"}`}>EN</button>
                  <button onClick={() => setLanguage("so")} className={`px-3 py-1 rounded-lg text-xs ${language === "so" ? "bg-[#F8CC58] text-black" : "text-gray-400 hover:text-white"}`}>SO</button>
                  <button onClick={() => setLanguage("ar")} className={`px-3 py-1 rounded-lg text-xs ${language === "ar" ? "bg-[#F8CC58] text-black" : "text-gray-400 hover:text-white"}`}>AR</button>
                </div>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">{t("login")}</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-5 mb-10 animate-fade-in">
              <div className="flex h-24 w-24 lg:h-32 lg:w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F8CC58] to-[#E4B155] shadow-2xl shadow-[#F8CC58]/30">
                <img src="/logo.png" alt="Gabiley Bank" className="h-20 w-20 lg:h-28 lg:w-28 object-cover rounded-2xl" />
              </div>
              <div className="text-left">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">Gabiley Bank</h2>
                <p className="text-lg sm:text-xl text-[#F8CC58] font-semibold tracking-wider uppercase mt-1">{t("management_system")}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-8 animate-fade-in">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary tracking-wider uppercase">{t("secure_banking")}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 animate-slide-up">
              <span className="text-foreground">{t("modern_banking")}</span>
              <br />
              <span className="bg-gradient-to-r from-[#22c55e] via-[#2BA85E] to-[#F8CC58] bg-clip-text text-transparent">{t("management_system")}</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {t("landing_desc")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link href="/register">
                <Button size="lg" className="relative bg-gradient-to-r from-[#22c55e] via-[#22c55e] to-[#16a34a] hover:from-[#22c55e]/90 hover:via-[#22c55e]/80 hover:to-[#16a34a]/90 text-white text-[15px] font-bold shadow-xl shadow-[#22c55e]/30 px-8 h-14 rounded-2xl">
                  <span className="relative flex items-center">
                    {t("start_free_account")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </span>
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-[15px] font-semibold px-8 h-14 rounded-2xl">{t("sign_in_dashboard")}</Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Lock className="h-3.5 w-3.5" /><span>{t("ssl_encrypted")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Shield className="h-3.5 w-3.5" /><span>{t("two_fa_security")}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" /><span>{t("pci_compliant")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative py-12 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: t("customers_label") },
              { value: "$50M+", label: t("total_balance_label") },
              { value: "100K+", label: t("transactions_label") },
              { value: "99.9%", label: t("uptime_label") },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-[#22c55e] to-[#F8CC58] bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 border border-secondary/20 px-4 py-1.5 mb-6">
              <Zap className="h-3.5 w-3.5 text-secondary" />
              <span className="text-[11px] font-semibold text-secondary tracking-wider uppercase">{t("powerful_features")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">{t("everything_you_need")}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("features_desc")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={feature.title} className="group relative p-6 rounded-2xl bg-card border border-border hover:shadow-xl transition-all duration-500 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color} mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                <div className="mt-4 flex items-center gap-1.5 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>{t("learn_more")}</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section id="dashboard" className="relative py-20 lg:py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 mb-6">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary tracking-wider uppercase">{t("dashboard_preview")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">{t("your_financial_dashboard")}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("dashboard_preview_desc")}</p>
          </div>
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-secondary/10 to-primary/20 rounded-3xl blur-2xl opacity-50" />
            <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-background text-muted-foreground text-xs border border-border">
                    <Lock className="h-3 w-3" />
                    <span>gabileybank.com/dashboard</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-background">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("good_morning")}</p>
                    <h3 className="text-xl font-bold text-foreground">{t("welcome_back")}, Ahmed!</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Bell className="h-4 w-4 text-primary" /></div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-xs font-bold text-white">AH</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: t("total_balance_dash"), value: "$24,562", icon: Wallet, border: "border-secondary/30" },
                    { label: t("customers_dash"), value: "1,234", icon: Users, border: "border-blue-500/30" },
                    { label: t("transactions_dash"), value: "5,678", icon: ArrowLeftRight, border: "border-emerald-500/30" },
                    { label: t("pending_loans_dash"), value: "12", icon: FileText, border: "border-amber-500/30" },
                  ].map((stat) => (
                    <div key={stat.label} className={`relative overflow-hidden rounded-xl border ${stat.border} bg-card p-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><stat.icon className="h-4 w-4 text-muted-foreground" /></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t("monthly_transactions")}</p>
                      <p className="text-xs text-muted-foreground">{t("deposits_vs_withdrawals")}</p>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-[#22c55e]" /><span className="text-muted-foreground">{t("deposits_label")}</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" /><span className="text-muted-foreground">{t("withdrawals_label")}</span></div>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col gap-1">
                        <div className="w-full rounded-t bg-primary/80 transition-all duration-500" style={{ height: `${height}%` }} />
                        <div className="w-full rounded-t bg-red-500/60 transition-all duration-500" style={{ height: `${Math.max(10, height - 30)}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>{t("jan")}</span><span>{t("feb")}</span><span>{t("mar")}</span><span>{t("apr")}</span><span>{t("may")}</span><span>{t("jun")}</span>
                    <span>{t("jul")}</span><span>{t("aug")}</span><span>{t("sep")}</span><span>{t("oct")}</span><span>{t("nov")}</span><span>{t("dec")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-20 lg:py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-[11px] font-semibold text-purple-500 tracking-wider uppercase">{t("simple_process")}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">{t("how_it_works")}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("how_it_works_desc")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary/50 via-secondary/50 to-primary/50" />
            {[
              { step: "01", title: t("create_account"), description: t("create_account_desc"), icon: Users, color: "from-[#22c55e] to-[#16a34a]" },
              { step: "02", title: t("login_verify"), description: t("login_verify_desc"), icon: Lock, color: "from-[#F8CC58] to-[#E4B155]" },
              { step: "03", title: t("access_dashboard"), description: t("access_dashboard_desc"), icon: LayoutDashboard, color: "from-[#7c3aed] to-[#6d28d9]" },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="relative z-10 mx-auto mb-6">
                  <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} shadow-lg`}>
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 mb-3">
                  <span className="text-xs font-bold text-muted-foreground">{t("step")} {item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative py-20 lg:py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">{t("trusted_by_thousands")}</h2>
            <p className="text-lg text-muted-foreground">{t("trusted_desc")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ahmed Hassan", role: t("business_owner"), content: t("testimonial_1"), rating: 5 },
              { name: "Fatima Ali", role: t("customer_role"), content: t("testimonial_2"), rating: 5 },
              { name: "Omar Ibrahim", role: t("employee_role"), content: t("testimonial_3"), rating: 5 },
            ].map((testimonial, i) => (
              <div key={testimonial.name} className="p-6 rounded-2xl bg-card border border-border hover:shadow-xl transition-all duration-300 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-secondary text-secondary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">&quot;{testimonial.content}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-xs font-bold text-white">
                    {testimonial.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 lg:py-28 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative p-12 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/10 border border-primary/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">{t("ready_to_get_started")}</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">{t("ready_desc")}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-gradient-to-r from-[#F8CC58] via-[#F8CC58] to-[#E4B155] hover:from-[#F8CC58]/90 hover:via-[#F8CC58]/90 hover:to-[#E4B155]/90 text-[#1A1918] text-[15px] font-extrabold shadow-xl shadow-[#F8CC58]/30 px-8 h-14 rounded-2xl">
                    {t("create_free_account")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-[15px] font-semibold px-8 h-14 rounded-2xl">{t("sign_in_dashboard")}</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8CC58] to-[#E4B155]">
                  <img src="/logo.png" alt="Gabiley Bank" className="h-12 w-12 object-cover rounded-xl" />
                </div>
                <div>
                  <span className="text-lg font-extrabold tracking-wide text-foreground">Gabiley Bank</span>
                  <span className="block text-[10px] text-secondary tracking-wider uppercase">{t("management_system")}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{t("landing_desc")}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">{t("quick_links")}</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("powerful_features")}</a></li>
                <li><a href="#dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("dashboard_preview")}</a></li>
                <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("how_it_works")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">{t("account_link")}</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("login")}</Link></li>
                <li><Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("register")}</Link></li>
                <li><Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("forgot_password_link")}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">{t("copyright")}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs"><Lock className="h-3 w-3" /><span>{t("ssl_256")}</span></div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs"><Shield className="h-3 w-3" /><span>{t("security")}</span></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
