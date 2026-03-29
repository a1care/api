import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SystemConfig, MobileFirebaseClient } from "@/types";
import {
    Flame, Globe, Smartphone, Save, CheckCircle2, AlertCircle,
    ChevronRight, Eye, EyeOff, RefreshCw, Shield, Cpu, CreditCard, Mail, Server, Video
} from "lucide-react";

// ─── Default (hardcoded fallback) ────────────────────────────────────────────
const DEFAULT_CONFIG: SystemConfig = {
    website: {
        apiKey: "AIzaSyC4OkQrUi2FGx0hIV0fjDyD0Hwv7tQoo8w",
        authDomain: "a1carewebsite.firebaseapp.com",
        projectId: "a1carewebsite",
        storageBucket: "a1carewebsite.firebasestorage.app",
        messagingSenderId: "742774308338",
        appId: "1:742774308338:web:a4b403b3ded90987d57f6b",
        measurementId: "G-ZSZKQTXE94",
    },
    projectNumber: "742774308338",
    projectId: "a1carewebsite",
    storageBucket: "a1carewebsite.firebasestorage.app",
    clients: [
        { platform: "android", appLabel: "customer", appId: "1:742774308338:android:8d9bed5df8563aded57f6b", apiKey: "AIzaSyBMiouUypgK29NCCIWb7ImaPedjiC4BuDA", packageName: "com.a1care.customer" },
        { platform: "android", appLabel: "partner", appId: "1:742774308338:android:9e284d859cc3f88ad57f6b", apiKey: "AIzaSyBMiouUypgK29NCCIWb7ImaPedjiC4BuDA", packageName: "com.a1care.partner" },
        { platform: "ios", appLabel: "customer", appId: "1:742774308338:ios:9851205c6bcfd638d57f6b", apiKey: "AIzaSyDy87QysRYviXSwTTKCjmpM84DxAOc69zM", packageName: "com.a1care.customer.ios" },
        { platform: "ios", appLabel: "partner", appId: "1:742774308338:ios:d30961469549b8c8d57f6b", apiKey: "AIzaSyDy87QysRYviXSwTTKCjmpM84DxAOc69zM", packageName: "com.a1care.partner.ios" },
    ],
    firebase: {
        clientEmail: "",
        privateKey: ""
    },
    googleMapsApiKey: "AIzaSyCQp47kwCVpsPbgSWB-c9HrlsqyiLwe06o",
    easebuzz: {
        merchantKey: "NQOKGR29D",
        salt: "DZJLI6TFN",
        env: "test"
    },
    email: {
        user: "support@a1care247.com",
        pass: "",
        host: "smtp.gmail.com",
        port: 587,
        from: "A1Care <support@a1care247.com>"
    },
    twilio: {
        accountSid: "",
        authToken: "",
        verifyServiceSid: ""
    },
    aws: {
        accessKeyId: "",
        secretAccessKey: "",
        region: "ap-south-1",
        bucketName: "a1-care"
    },
    redis: {
        url: "",
        host: "",
        port: 6379,
        pass: ""
    },
    zego: {
        appId: 0,
        serverSecret: ""
    },
    updatedAt: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
    android: "Android",
    ios: "iOS",
};

const APP_LABELS: Record<string, string> = {
    customer: "Customer App",
    partner: "Partner App",
};


function MaskedInput({ value, onChange, placeholder, id }: {
    value: string; onChange: (v: string) => void; placeholder?: string; id: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center">
            <input
                id={id}
                type={show ? "text" : "password"}
                className="w-full h-12 bg-[var(--bg-main)] border-none rounded-2xl px-5 pr-12 text-[var(--text-main)] font-mono text-sm font-bold placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-orange-200 transition-all"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            <button
                type="button"
                className="absolute right-4 text-[var(--text-muted)] hover:text-orange-500 transition-colors"
                onClick={() => setShow((s) => !s)}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

function FieldRow({ label, value, onChange, masked = false, id, note, type = "text" }: {
    label: string; value: string | number; onChange: (v: string) => void;
    masked?: boolean; id: string; note?: string; type?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.18em] ml-1">
                {label}
            </label>
            {masked ? (
                <MaskedInput id={id} value={value?.toString() ?? ""} onChange={onChange} placeholder={`Enter ${label}`} />
            ) : (
                <input
                    id={id}
                    type={type}
                    className="w-full h-12 bg-[var(--bg-main)] border-none rounded-2xl px-5 text-[var(--text-main)] font-mono text-sm font-bold placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-orange-200 transition-all"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={`Enter ${label}`}
                />
            )}
            {note && <p className="text-[10px] text-[var(--text-muted)] ml-1">{note}</p>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SystemSettingsPage() {
    const [form, setForm] = useState<SystemConfig>(DEFAULT_CONFIG);
    const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"website" | "project" | "clients" | "firebase" | "maps" | "easebuzz" | "email" | "twilio" | "aws" | "redis" | "zego">("website");

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["system-config"],
        queryFn: async () => {
            const res = await api.get("/admin/system-config");
            return res.data.data as SystemConfig;
        },
    });

    useEffect(() => {
        if (data) setForm(data);
    }, [data]);

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await api.put("/admin/system-config", form);
            return res.data.data as SystemConfig;
        },
        onSuccess: (next) => {
            setForm(next);
            setStatus({ ok: true, msg: `System Settings saved at ${new Date(next.updatedAt).toLocaleTimeString()}` });
            setTimeout(() => setStatus(null), 5000);
        },
        onError: () => {
            setStatus({ ok: false, msg: "Save failed — check backend logs." });
        },
    });

    const setWebsite = (key: keyof SystemConfig["website"], val: string) =>
        setForm((p) => ({ ...p, website: { ...p.website, [key]: val } }));

    const setClient = (idx: number, key: keyof MobileFirebaseClient, val: string) =>
        setForm((p) => {
            const clients = [...p.clients];
            clients[idx] = { ...clients[idx], [key]: val } as MobileFirebaseClient;
            return { ...p, clients };
        });

    const setEasebuzz = (key: keyof SystemConfig["easebuzz"], val: string) =>
        setForm(p => ({ ...p, easebuzz: { ...p.easebuzz, [key]: val } }));

    const setEmail = (key: keyof SystemConfig["email"], val: string | number) =>
        setForm(p => ({ ...p, email: { ...p.email, [key]: val } }));

    const setTwilio = (key: keyof SystemConfig["twilio"], val: string) =>
        setForm(p => ({ ...p, twilio: { ...p.twilio, [key]: val } }));

    const setAWS = (key: keyof SystemConfig["aws"], val: string) =>
        setForm(p => ({ ...p, aws: { ...p.aws, [key]: val } }));

    const setRedis = (key: keyof SystemConfig["redis"], val: string | number) =>
        setForm(p => ({ ...p, redis: { ...p.redis, [key]: val } }));

    const setZego = (key: keyof SystemConfig["zego"], val: string | number) =>
        setForm(p => ({ ...p, zego: { ...p.zego, [key]: val } }));

    const tabs = [
        { key: "website" as const, label: "Firebase Web", icon: Globe },
        { key: "project" as const, label: "Firebase Project", icon: Cpu },
        { key: "clients" as const, label: "Mobile Apps", icon: Smartphone },
        { key: "firebase" as const, label: "FCM Console", icon: Shield },
        { key: "maps" as const, label: "Google Maps", icon: Globe },
        { key: "easebuzz" as const, label: "Easebuzz", icon: CreditCard },
        { key: "email" as const, label: "Email (SMTP)", icon: Mail },
        { key: "twilio" as const, label: "Twilio", icon: Mail },
        { key: "aws" as const, label: "AWS S3", icon: Server },
        { key: "redis" as const, label: "Redis Caching", icon: RefreshCw },
        { key: "zego" as const, label: "ZegoCloud", icon: Video },
    ];

    return (
        <div className="space-y-10 animate-in">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--card-bg)] p-10 rounded-[32px] border border-[var(--border-color)] shadow-sm shadow-orange-50">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <Shield size={22} />
                        </div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">
                            System <span className="text-orange-500">Settings</span>
                        </h1>
                    </div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-13">
                        Central registry for all API credentials & service clusters
                    </p>
                    {form.updatedAt && (
                        <p className="text-xs font-semibold text-[var(--text-muted)] ml-13">
                            Last synchronized: {new Date(form.updatedAt).toLocaleString()}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="h-10 px-4 bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-orange-500 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all"
                    >
                        <RefreshCw size={14} /> Sync
                    </button>
                    <div className="flex bg-[var(--bg-main)]/80 p-1.5 rounded-2xl overflow-x-auto max-w-[50vw]">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shrink-0 ${activeTab === t.key ? "bg-[var(--card-bg)] text-orange-500 shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                <t.icon size={14} />
                                <span className="hidden sm:inline">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto pb-36 space-y-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-24 bg-[var(--card-bg)] rounded-[40px] border border-[var(--border-color)] space-y-4">
                        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest animate-pulse">
                            Communicating with Platform Store…
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── Website / JS SDK ── */}
                        {activeTab === "website" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Firebase Web SDK</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">
                                            Synchronized with JS clients and Admin Panel.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow id="ws-apiKey" label="API Key" value={form.website.apiKey} onChange={(v) => setWebsite("apiKey", v)} masked />
                                    <FieldRow id="ws-authDomain" label="Auth Domain" value={form.website.authDomain} onChange={(v) => setWebsite("authDomain", v)} />
                                    <FieldRow id="ws-projectId" label="Project ID" value={form.website.projectId} onChange={(v) => setWebsite("projectId", v)} />
                                    <FieldRow id="ws-storageBucket" label="Storage Bucket" value={form.website.storageBucket} onChange={(v) => setWebsite("storageBucket", v)} />
                                    <FieldRow id="ws-messagingSenderId" label="Messaging Sender ID" value={form.website.messagingSenderId} onChange={(v) => setWebsite("messagingSenderId", v)} />
                                    <FieldRow id="ws-appId" label="App ID" value={form.website.appId} onChange={(v) => setWebsite("appId", v)} masked />
                                    <FieldRow id="ws-measurementId" label="Measurement ID" value={form.website.measurementId} onChange={(v) => setWebsite("measurementId", v)}
                                        note="Optional — required for Analytics" />
                                </div>
                            </section>
                        )}

                        {/* ── Project Info ── */}
                        {activeTab === "project" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                                        <Cpu size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Project Hierarchy</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">Core identifiers for Firebase server-side operations.</p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow id="proj-number" label="Project Number (Sender ID)" value={form.projectNumber} onChange={(v) => setForm((p) => ({ ...p, projectNumber: v }))} />
                                    <FieldRow id="proj-id" label="Project ID" value={form.projectId} onChange={(v) => setForm((p) => ({ ...p, projectId: v }))} />
                                    <FieldRow id="proj-storage" label="Cloud Storage Bucket" value={form.storageBucket} onChange={(v) => setForm((p) => ({ ...p, storageBucket: v }))} />
                                </div>
                            </section>
                        )}

                        {/* ── Mobile Clients ── */}
                        {activeTab === "clients" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                                        <Smartphone size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Mobile Application Registry</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">
                                            Operational keys for Android and iOS clients.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-8">
                                    {form.clients.map((client, idx) => {
                                        const isAndroid = client.platform === "android";
                                        return (
                                            <div key={idx} className="bg-[var(--bg-main)] rounded-3xl p-8 border border-[var(--border-color)] space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${isAndroid ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                                                        {PLATFORM_LABELS[client.platform]}
                                                    </span>
                                                    <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-color)]">
                                                        {APP_LABELS[client.appLabel] ?? client.appLabel}
                                                    </span>
                                                </div>

                                                <div className="grid lg:grid-cols-2 gap-6">
                                                    <FieldRow id={`client-${idx}-appId`} label="App ID (Native)" value={client.appId} onChange={(v) => setClient(idx, "appId", v)} masked />
                                                    <FieldRow id={`client-${idx}-apiKey`} label="API Key" value={client.apiKey} onChange={(v) => setClient(idx, "apiKey", v)} masked />
                                                    <FieldRow id={`client-${idx}-pkgName`} label={isAndroid ? "Package Name" : "Bundle ID"} value={client.packageName} onChange={(v) => setClient(idx, "packageName", v)} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ── Firebase Service Account ── */}
                        {activeTab === "firebase" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">FCM Service Account (Server-side)</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">
                                            Found in Firebase Console → Project Settings → Service Accounts.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-1 gap-6">
                                    <FieldRow 
                                        id="fb-email" 
                                        label="Client Email" 
                                        value={form.firebase?.clientEmail || ""} 
                                        onChange={(v) => setForm(p => ({ ...p, firebase: { ...p.firebase!, clientEmail: v } }))} 
                                        note="e.g. firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com"
                                    />
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.18em] ml-1">Private Key</label>
                                        <textarea 
                                            className="w-full h-48 bg-[var(--bg-main)] border-none rounded-2xl p-5 text-[var(--text-main)] font-mono text-xs font-bold focus:ring-2 focus:ring-orange-200 transition-all"
                                            value={form.firebase?.privateKey || ""}
                                            onChange={(e) => setForm(p => ({ ...p, firebase: { ...p.firebase!, privateKey: e.target.value } }))}
                                            placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                                        />
                                        <p className="text-[10px] text-[var(--text-muted)] ml-1">Paste the ENTIRE private_key string from your service account JSON file.</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ── Google Maps ── */}
                        {activeTab === "maps" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Google Location Services</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">
                                            Keys for Places, Geocoding, and Directions APIs.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-1 gap-6">
                                    <FieldRow id="maps-apiKey" label="Google Cloud API Key" value={form.googleMapsApiKey} onChange={(v) => setForm(p => ({ ...p, googleMapsApiKey: v }))} masked note="Ensure 'Restrictions' in Google Console allow your Bundle IDs and Web Domains." />
                                </div>
                            </section>
                        )}

                        {/* ── Easebuzz ── */}
                        {activeTab === "easebuzz" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Easebuzz Payment Gateway</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">Configuration for integrated UPI and Card payments.</p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow id="eb-merchant" label="Merchant Key" value={form.easebuzz.merchantKey} onChange={(v) => setEasebuzz("merchantKey", v)} masked />
                                    <FieldRow id="eb-salt" label="Salt Key" value={form.easebuzz.salt} onChange={(v) => setEasebuzz("salt", v)} masked />
                                    <div className="space-y-1.5 lg:col-span-2">
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.18em] ml-1">Environment</label>
                                        <div className="flex gap-4">
                                            {["test", "prod"].map(env => (
                                                <button key={env} type="button" onClick={() => setForm(p => ({ ...p, easebuzz: { ...p.easebuzz, env: env as any } }))}
                                                    className={`px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${form.easebuzz.env === env ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}>
                                                    {env}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ── Email ── */}
                        {activeTab === "email" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">SMTP Email Delivery</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">Credential vault for transaction and notification emails.</p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow id="email-host" label="SMTP Host" value={form.email.host} onChange={(v) => setEmail("host", v)} />
                                    <FieldRow id="email-port" label="SMTP Port" value={form.email.port} onChange={(v) => setEmail("port", parseInt(v) || 587)} type="number" />
                                    <FieldRow id="email-user" label="Username / Email" value={form.email.user} onChange={(v) => setEmail("user", v)} />
                                    <FieldRow id="email-pass" label="Password / App Key" value={form.email.pass} onChange={(v) => setEmail("pass", v)} masked />
                                    <FieldRow id="email-from" label="Display 'From' Address" value={form.email.from} onChange={(v) => setEmail("from", v)} note="e.g. A1Care <noreply@a1care247.com>" />
                                </div>
                            </section>
                        )}

                        {/* ── Twilio ── */}
                        {activeTab === "twilio" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Twilio SMS & OTP</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">Communications platform for OTP verification.</p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow id="tw-sid" label="Account SID" value={form.twilio.accountSid} onChange={(v) => setTwilio("accountSid", v)} />
                                    <FieldRow id="tw-token" label="Auth Token" value={form.twilio.authToken} onChange={(v) => setTwilio("authToken", v)} masked />
                                    <FieldRow id="tw-v-sid" label="Verify Service SID" value={form.twilio.verifyServiceSid} onChange={(v) => setTwilio("verifyServiceSid", v)} />
                                </div>
                            </section>
                        )}

                        {/* ── AWS ── */}
                        {activeTab === "aws" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                                        <Server size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">AWS S3 Infrastructure</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">Object storage for reports, profiles, and service assets.</p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow id="aws-key" label="Access Key ID" value={form.aws.accessKeyId} onChange={(v) => setAWS("accessKeyId", v)} />
                                    <FieldRow id="aws-secret" label="Secret Access Key" value={form.aws.secretAccessKey} onChange={(v) => setAWS("secretAccessKey", v)} masked />
                                    <FieldRow id="aws-region" label="Region" value={form.aws.region} onChange={(v) => setAWS("region", v)} />
                                    <FieldRow id="aws-bucket" label="Bucket Name" value={form.aws.bucketName} onChange={(v) => setAWS("bucketName", v)} />
                                </div>
                            </section>
                        )}

                        {/* ── Redis ── */}
                        {activeTab === "redis" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
                                        <RefreshCw size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">Redis Caching & Queue</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">Performance layer for distributed sessions and locks.</p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow id="redis-url" label="Public URL" value={form.redis.url} onChange={(v) => setRedis("url", v)} note="e.g. redis://default:pass@host:port" masked />
                                    <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                                        <FieldRow id="redis-host" label="Hostname" value={form.redis.host} onChange={(v) => setRedis("host", v)} />
                                        <FieldRow id="redis-port" label="Port" value={form.redis.port} onChange={(v) => setRedis("port", parseInt(v) || 6379)} type="number" />
                                    </div>
                                    <FieldRow id="redis-pass" label="Auth Password" value={form.redis.pass} onChange={(v) => setRedis("pass", v)} masked />
                                </div>
                            </section>
                        )}

                        {/* ── ZegoCloud ── */}
                        {activeTab === "zego" && (
                            <section className="bg-[var(--card-bg)] rounded-[40px] p-10 lg:p-14 border border-[var(--border-color)] shadow-sm space-y-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                                        <Video size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--text-main)]">ZegoCloud (Video Consultations)</h3>
                                        <p className="text-sm font-medium text-[var(--text-muted)]">Configuration for initiating and joining video calls.</p>
                                    </div>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <FieldRow
                                        id="zego-appid"
                                        label="App ID"
                                        value={form.zego?.appId?.toString() || "0"}
                                        onChange={(v) => setZego("appId", parseInt(v) || 0)}
                                    />
                                    <FieldRow
                                        id="zego-serversecret"
                                        label="Server Secret"
                                        value={form.zego?.serverSecret || ""}
                                        onChange={(v) => setZego("serverSecret", v)}
                                        masked
                                    />
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
            <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-8">
                <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[32px] p-4 flex items-center justify-between shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    <div className="flex-1 pl-6">
                        {status ? (
                            <div className={`flex items-center gap-3 ${status.ok ? "text-emerald-400" : "text-red-400"}`}>
                                {status.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                <span className="text-xs font-black uppercase tracking-widest">{status.msg}</span>
                            </div>
                        ) : (
                            <div>
                                <p className="text-white font-black text-sm tracking-tight">System Configuration Vault</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    Synchronize credentials to all API & Apps
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="h-16 px-10 bg-orange-500 hover:bg-orange-400 text-white font-black rounded-[24px] flex items-center justify-center gap-3 shadow-xl shadow-orange-500/30 active:scale-95 transition-all group disabled:opacity-50"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                    >
                        {mutation.isPending
                            ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                            : <Save size={24} />
                        }
                        <span className="text-base uppercase tracking-tighter">Sync All Secrets</span>
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </footer>
        </div >
    );
}
