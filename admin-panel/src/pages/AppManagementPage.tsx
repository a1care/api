import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FestivalBanner, ManagedAppConfig, ManagedAppKey } from "@/types";
import {
  Globe, Palette, Phone, Layout, Image as ImageIcon,
  Save, AlertCircle, CheckCircle2, Upload, Trash2, Plus,
  Monitor, Smartphone, Link, Shield, ChevronRight, Sparkles
} from "lucide-react";

const createDefaultConfig = (appKey: ManagedAppKey): ManagedAppConfig => {
  const label = appKey === "user_app" ? "User App" : "Provider App";
  return {
    appKey,
    env: {
      apiBaseUrl: "",
      websiteBaseUrl: "",
      cmsBaseUrl: "",
      assetsBaseUrl: ""
    },
    branding: {
      appName: `A1Care ${label}`,
      logoUrl: "",
      splashImageUrl: "",
      primaryColor: "#1d4ed8",
      secondaryColor: "#0f172a",
      accentColor: "#22c55e"
    },
    contact: {
      supportEmail: "",
      supportPhone: "",
      whatsappNumber: "",
      address: "",
      website: "",
      faq: "",
      privacyPolicy: "",
      termsAndConditions: ""
    },
    landing: {
      headline: "",
      subHeadline: "",
      playStoreUrl: "",
      appStoreUrl: "",
      festivalBanners: []
    },
    updatedAt: ""
  };
};

const createBanner = (): FestivalBanner => ({
  id: `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: "",
  imageUrl: "",
  redirectUrl: "",
  active: true
});

type SectionKey = "env" | "branding" | "contact" | "landing" | "banners" | "legal";

const sections: Array<{ key: SectionKey; label: string; icon: any }> = [
  { key: "env", label: "Gateways", icon: Globe },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "landing", label: "Landing", icon: Layout },
  { key: "banners", label: "Banners", icon: ImageIcon },
  { key: "legal", label: "Legal", icon: Shield }
];

type Props = {
  appKey: ManagedAppKey;
};

export function AppManagementPage({ appKey }: Props) {
  const [formState, setFormState] = useState<ManagedAppConfig>(createDefaultConfig(appKey));
  const [status, setStatus] = useState<string>("");
  const [activeSection, setActiveSection] = useState<SectionKey>("env");
  const [uploadingTarget, setUploadingTarget] = useState<string>("");

  const title = useMemo(
    () => (appKey === "user_app" ? "User Application" : "Provider Application"),
    [appKey]
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["app-management", appKey],
    queryFn: async () => {
      const res = await api.get(`/admin/app-management/${appKey}`);
      return res.data.data as ManagedAppConfig;
    }
  });

  useEffect(() => {
    if (data) {
      setFormState(data);
    }
  }, [data]);

  useEffect(() => {
    setFormState(createDefaultConfig(appKey));
    setStatus("");
    setActiveSection("env");
  }, [appKey]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/admin/app-management/${appKey}`, formState);
      return res.data.data as ManagedAppConfig;
    },
    onSuccess: (next) => {
      setFormState(next);
      setStatus(`Configuration synchronized successfully at ${new Date(next.updatedAt).toLocaleTimeString()}`);
      setTimeout(() => setStatus(""), 5000);
    },
    onError: () => {
      setStatus("Sync failed. Critical error while writing to configuration store.");
    }
  });

  const updatePath = (path: string, value: string) => {
    setFormState((prev) => {
      const next = structuredClone(prev) as any;
      const parts = path.split(".");
      let current = next;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const updateBanner = (index: number, key: keyof FestivalBanner, value: string | boolean) => {
    setFormState((prev) => {
      const next = structuredClone(prev);
      (next.landing.festivalBanners[index] as any)[key] = value;
      return next;
    });
  };

  const uploadAsset = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("asset", file);
    const res = await api.post("/admin/app-management/upload", form);
    return res.data?.data?.url as string;
  };

  const handleUploadToPath = async (path: string, file: File | null, targetLabel: string) => {
    if (!file) return;
    try {
      setUploadingTarget(targetLabel);
      const url = await uploadAsset(file);
      if (!url) throw new Error("URL missing in response");
      updatePath(path, url);
      setStatus(`${targetLabel} asset uploaded and linked.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Upload failed";
      setStatus(`Asset upload error: ${msg}`);
    } finally {
      setUploadingTarget("");
    }
  };

  const handleBannerImageUpload = async (index: number, file: File | null) => {
    if (!file) return;
    try {
      setUploadingTarget(`Banner #${index + 1}`);
      const url = await uploadAsset(file);
      if (!url) throw new Error("URL missing in response");
      updateBanner(index, "imageUrl", url);
      setStatus(`Banner #${index + 1} synchronized.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Upload failed";
      setStatus(`Banner asset error: ${msg}`);
    } finally {
      setUploadingTarget("");
    }
  };

  const addBanner = () => {
    setFormState((prev) => ({
      ...prev,
      landing: {
        ...prev.landing,
        festivalBanners: [...prev.landing.festivalBanners, createBanner()]
      }
    }));
  };

  const removeBanner = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      landing: {
        ...prev.landing,
        festivalBanners: prev.landing.festivalBanners.filter((_, idx) => idx !== index)
      }
    }));
  };

  return (
    <div className="space-y-10 animate-in">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--card-bg)] p-10 rounded-[32px] border border-[var(--border-color)] shadow-sm shadow-blue-50">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">{title} <span className="text-blue-600 dark:text-blue-400">Registry</span></h1>
          </div>
          <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] ml-5">CENTRALIZED APP CONFIGURATION STORE</p>
        </div>

        <div className="flex bg-[var(--bg-main)]/80 p-1.5 rounded-2xl overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shrink-0 ${activeSection === section.key ? "bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
              onClick={() => setActiveSection(section.key)}
            >
              <section.icon size={16} />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-[var(--card-bg)] rounded-[40px] border border-[var(--border-color)] shadow-sm">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="font-black text-[10px] text-[var(--text-muted)] uppercase tracking-widest animate-pulse">Querying Platform Store...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeSection === "env" && (
              <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-main)]">Infrastructure Gateways</h3>
                    <p className="text-sm font-medium text-[var(--text-muted)]">Manage critical API and asset cluster endpoints.</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">API Cluster URL</label>
                    <input className="w-full h-14 bg-[var(--bg-main)] border-none rounded-2xl px-6 text-[var(--text-main)] font-bold placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-blue-100 transition-all" placeholder="e.g. https://api.a1care.247/v1" value={formState.env.apiBaseUrl} onChange={(e) => updatePath("env.apiBaseUrl", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Asset Cluster URL</label>
                    <input className="w-full h-14 bg-[var(--bg-main)] border-none rounded-2xl px-6 text-[var(--text-main)] font-bold placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-blue-100 transition-all" placeholder="e.g. https://cdn.a1care.247/uploads" value={formState.env.assetsBaseUrl} onChange={(e) => updatePath("env.assetsBaseUrl", e.target.value)} />
                  </div>
                </div>
              </section>
            )}

            {activeSection === "branding" && (
              <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-main)]">Identity & Theme</h3>
                    <p className="text-sm font-medium text-[var(--text-muted)]">Visual brand identity and application color tokens.</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Logo URL</label>
                      <div className="flex gap-2">
                        <input className="flex-1 h-14 bg-[var(--bg-main)] border-none rounded-2xl px-6 text-[var(--text-main)] font-bold focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Path to SVG/PNG logo" value={formState.branding.logoUrl} onChange={(e) => updatePath("branding.logoUrl", e.target.value)} />
                        <label className="h-14 px-6 bg-slate-900 text-white rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all">
                          <Upload size={20} />
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadToPath("branding.logoUrl", e.target.files?.[0] ?? null, "Branding Logo")} />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Splash Art URL</label>
                      <div className="flex gap-2">
                        <input className="flex-1 h-14 bg-[var(--bg-main)] border-none rounded-2xl px-6 text-[var(--text-main)] font-bold focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Path to Launch image" value={formState.branding.splashImageUrl} onChange={(e) => updatePath("branding.splashImageUrl", e.target.value)} />
                        <label className="h-14 px-6 bg-slate-900 text-white rounded-2xl flex items-center justify-center cursor-pointer active:scale-95 transition-all">
                          <Upload size={20} />
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadToPath("branding.splashImageUrl", e.target.files?.[0] ?? null, "Splash Art")} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-8 pt-4">
                    {[
                      { label: "Primary Tint", path: "branding.primaryColor", value: formState.branding.primaryColor },
                      { label: "Secondary", path: "branding.secondaryColor", value: formState.branding.secondaryColor },
                      { label: "Accent", path: "branding.accentColor", value: formState.branding.accentColor },
                    ].map(color => (
                      <div key={color.path} className="flex items-center gap-4 bg-[var(--bg-main)] p-4 rounded-3xl border border-[var(--border-color)] group">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-inner cursor-pointer group-hover:scale-105 transition-transform">
                          <input type="color" className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer border-none" value={color.value || "#000000"} onChange={(e) => updatePath(color.path, e.target.value)} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{color.label}</p>
                          <p className="text-sm font-black text-[var(--text-main)] font-mono mt-0.5">{color.value?.toUpperCase() || "#000000"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {activeSection === "banners" && (
              <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-50 dark:bg-pink-500/10 text-pink-600 rounded-2xl flex items-center justify-center">
                      <ImageIcon size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--text-main)]">Dynamic Banners</h3>
                      <p className="text-sm font-medium text-[var(--text-muted)]">Promotional flashes appearing on the app dashboard.</p>
                    </div>
                  </div>
                  <button className="h-12 px-6 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-100" onClick={addBanner}>
                    <Plus size={18} /> Add Banner
                  </button>
                </div>

                <div className="grid gap-6">
                  {formState.landing.festivalBanners.map((banner, index) => (
                    <div key={banner.id} className="relative group bg-[var(--bg-main)] rounded-3xl p-8 border border-[var(--border-color)] hover:border-blue-200 transition-all">
                      <button className="absolute top-6 right-6 p-2 text-[var(--text-muted)] hover:text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 rounded-xl transition-all" onClick={() => removeBanner(index)}>
                        <Trash2 size={18} />
                      </button>

                      <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                          <div className="w-full aspect-[21/9] bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden flex items-center justify-center relative">
                            {banner.imageUrl ? (
                              <img src={banner.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                              <div className="text-slate-200 flex flex-col items-center gap-2">
                                <ImageIcon size={32} />
                                <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                              </div>
                            )}
                            <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <span className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <Upload size={16} /> Replace
                              </span>
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerImageUpload(index, e.target.files?.[0] ?? null)} />
                            </label>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer group/check">
                            <input type="checkbox" className="w-6 h-6 rounded-lg border-[var(--border-color)] text-blue-600 dark:text-blue-400 focus:ring-blue-100 transition-all" checked={banner.active} onChange={(e) => updateBanner(index, "active", e.target.checked)} />
                            <span className="text-sm font-bold text-[var(--text-muted)] group-hover/check:text-[var(--text-main)] transition-colors">Visible in Production</span>
                          </label>
                        </div>

                        <div className="lg:col-span-2 grid gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Internal Label</label>
                            <input className="w-full h-12 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 font-bold text-[var(--text-main)] focus:ring-2 focus:ring-blue-100" placeholder="e.g. Summer Health Campaign" value={banner.title} onChange={(e) => updateBanner(index, "title", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Redirect Action (Deep Link)</label>
                            <div className="relative">
                              <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                              <input className="w-full h-12 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 font-bold text-[var(--text-main)] focus:ring-2 focus:ring-blue-100" placeholder="a1care://services/category/..." value={banner.redirectUrl} onChange={(e) => updateBanner(index, "redirectUrl", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {formState.landing.festivalBanners.length === 0 && (
                    <div className="p-20 text-center bg-[var(--bg-main)] rounded-[40px] border-4 border-dashed border-[var(--border-color)] text-[var(--text-muted)]">
                      <Sparkles size={48} className="mx-auto mb-4 opacity-40" />
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Launch your first promotional pulse</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Other sections would follow same premium pattern... */}
          </div>
        )}
      </main>

      {/* Synchronous Global Action Bar */}
      <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-8">
        <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[32px] p-4 flex items-center justify-between shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="flex-1 pl-6">
            {uploadingTarget ? (
              <div className="flex items-center gap-3 text-blue-400 animate-pulse">
                <Upload size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Syncing Asset: {uploadingTarget}</span>
              </div>
            ) : status ? (
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle2 size={18} />
                <span className="text-xs font-black uppercase tracking-widest">{status}</span>
              </div>
            ) : (
              <div>
                <p className="text-white font-black text-sm tracking-tight">Deployment Ready</p>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Push local modifications to registry cluster</p>
              </div>
            )}
          </div>

          <button
            className="h-16 px-10 bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:bg-blue-500/100 text-white font-black rounded-[24px] flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 transition-all group disabled:opacity-50"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <Save size={24} />}
            <span className="text-base uppercase tracking-tighter">Commit Architecture</span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </footer>
    </div>
  );
}
