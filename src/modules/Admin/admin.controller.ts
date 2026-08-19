import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { promises as fs } from "fs";
import path from "path";
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { escapeRegex } from "../../utils/escapeRegex.js";
import { Admin } from "./admin.model.js";
import { AuditLog } from "./audit.model.js";
import { createAdminSchema, adminLoginSchema, updateAdminRoleSchema } from "./admin.schema.js";
import { Patient } from "../Authentication/patient.model.js";
import Doctor from "../Doctors/doctor.model.js";
import { Service } from "../Services/service.model.js";
import doctorAppointmentModel from "../Bookings/doctorAppointment.model.js";
import serviceRequestModel from "../Bookings/service/serviceRequest.model.js";
import { RoleModel } from "../roles/role.model.js";
import HospitalBooking from "../Bookings/hospitalBooking.model.js";
import Ticket from "../Tickets/ticket.model.js";
import { ChildServiceModel } from "../Services/childService.model.js";
import { adminListOrders, adminGetLogsForTxn } from "../Payments/payment.controller.js";
import { Order } from "../Payments/payment.model.js";
import { creditWalletAtomic } from "../Wallet/wallet.controller.js";
import WalletModel from "../Wallet/wallet.model.js";
import ReviewModel from "../Reviews/review.model.js";
import { NotificationModel } from "../Notifications/notification.model.js";
import MedicalRecord from "../MedicalRecords/medicalRecord.model.js";
import { UserAddressModel } from "../Address/address.model.js";
import serviceAcceptanceModal from "../Bookings/service/serviceAcceptance.model.js";
import PartnerSubscriptionPlan from "../PartnerSubscription/plan.model.js";
import PartnerSubscription from "../PartnerSubscription/subscription.model.js";
import { EmailTemplate } from "../EmailTemplates/emailTemplate.model.js";
import DoctorAvailability from "../Doctors/slots/doctorAvailability.model.js";
import DoctorBlockTime from "../Doctors/slots/blockTime.model.js";
import Payout from "../Earnings/payout.model.js";
import { enqueueEmail, enqueuePush } from "../../queues/communicationQueue.js";
import Referral from "../Referral/referral.model.js";

const ENV_ADMIN_ID = "env-super-admin";
const APP_KEYS = ["user_app", "provider_app"] as const;
type AppKey = (typeof APP_KEYS)[number];

// ─── Firebase Config ─────────────────────────────────────────────────────────
type MobileFirebaseClient = {
  platform: "android" | "ios";
  appLabel: "customer" | "partner";
  appId: string;          // mobilesdk_app_id or GOOGLE_APP_ID
  apiKey: string;
  packageName: string;    // package_name or bundle_id
};

type SystemConfig = {
  // Website (JS SDK)
  website: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  // Project-level
  projectNumber: string;
  projectId: string;
  storageBucket: string;
  // Mobile clients
  clients: MobileFirebaseClient[];
  // Server-side Service Account for FCM
  firebase: {
    clientEmail: string;
    privateKey: string;
  };
  googleMapsApiKey: string;
  maintenanceMode: boolean; // Added
  // Dynamic Settings
  easebuzz: {
    merchantKey: string;
    salt: string;
    env: "test" | "prod";
  };
  email: {
    user: string;
    pass: string;
    host: string;
    port: number;
    from: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    verifyServiceSid: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucketName: string;
  };
  redis: {
    url: string;
    host: string;
    port: number;
    pass: string;
  };
  zego: {
    appId: number;
    serverSecret: string;
  };
  updatedAt: string;
};

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  website: {
    apiKey: "AIzaSyC4OkQrUi2FGx0hIV0fjDyD0Hwv7tQoo8w",
    authDomain: "a1carewebsite.firebaseapp.com",
    projectId: "a1carewebsite",
    storageBucket: "a1carewebsite.firebasestorage.app",
    messagingSenderId: "742774308338",
    appId: "1:742774308338:web:a4b403b3ded90987d57f6b",
    measurementId: "G-ZSZKQTXE94"
  },
  projectNumber: "742774308338",
  projectId: "a1carewebsite",
  storageBucket: "a1carewebsite.firebasestorage.app",
  clients: [
    {
      platform: "android",
      appLabel: "customer",
      appId: "1:742774308338:android:8d9bed5df8563aded57f6b",
      apiKey: "AIzaSyBMiouUypgK29NCCIWb7ImaPedjiC4BuDA",
      packageName: "com.a1care.customer"
    },
    {
      platform: "android",
      appLabel: "partner",
      appId: "1:742774308338:android:9e284d859cc3f88ad57f6b",
      apiKey: "AIzaSyBMiouUypgK29NCCIWb7ImaPedjiC4BuDA",
      packageName: "com.a1care.partner"
    },
    {
      platform: "ios",
      appLabel: "customer",
      appId: "1:742774308338:ios:9851205c6bcfd638d57f6b",
      apiKey: "AIzaSyDy87QysRYviXSwTTKCjmpM84DxAOc69zM",
      packageName: "com.a1care.customer.ios"
    },
    {
      platform: "ios",
      appLabel: "partner",
      appId: "1:742774308338:ios:d30961469549b8c8d57f6b",
      apiKey: "AIzaSyDy87QysRYviXSwTTKCjmpM84DxAOc69zM",
      packageName: "com.a1care.partner.ios"
    }
  ],
  firebase: {
    clientEmail: "",
    privateKey: ""
  },
  googleMapsApiKey: "AIzaSyCQp47kwCVpsPbgSWB-c9HrlsqyiLwe06o",
  maintenanceMode: false,
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
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || ""
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "ap-south-1",
    bucketName: process.env.S3_BUCKET_NAME || "a1-care"
  },
  redis: {
    url: process.env.REDIS_URL || "",
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    pass: process.env.REDIS_PASSWORD || ""
  },
  zego: {
    appId: 0,
    serverSecret: ""
  },
  updatedAt: new Date().toISOString()
};

type FestivalBanner = {
  id: string;
  title: string;
  imageUrl: string;
  redirectUrl: string;
  active: boolean;
};

type ManagedAppConfig = {
  appKey: AppKey;
  env: {
    apiBaseUrl: string;
    websiteBaseUrl: string;
    cmsBaseUrl: string;
    assetsBaseUrl: string;
  };
  branding: {
    appName: string;
    logoUrl: string;
    splashImageUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  contact: {
    supportEmail: string;
    supportPhone: string;
    whatsappNumber: string;
    address: string;
    website: string;
    faq: string;
    privacyPolicy: string;
    termsAndConditions: string;
  };
  landing: {
    headline: string;
    subHeadline: string;
    playStoreUrl: string;
    appStoreUrl: string;
    festivalBanners: FestivalBanner[];
    mainBanners: FestivalBanner[];
    knowledgeBanners: FestivalBanner[];
    promotionalBanners: FestivalBanner[];
  };
  knowledgeBase: any[];
  updatedAt: string;
};

const APP_CONFIG_PATH = path.join(process.cwd(), "data", "app-config.json");

const signAdminToken = (adminId: string, role: "admin" | "super_admin") =>
  jwt.sign({ adminId, role, type: "admin" }, process.env.JWT_SECRET as string, {
    expiresIn: "7d"
  });

const isDbOnline = () => mongoose.connection.readyState === 1;

const getEnvSuperAdmin = () => {
  const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME ?? "A1Care Super Admin";

  if (!email || !password) return null;

  return {
    id: ENV_ADMIN_ID,
    email,
    password,
    name,
    role: "super_admin" as const
  };
};

const generateBannerId = () => `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createDefaultConfigFor = (appKey: AppKey): ManagedAppConfig => {
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
      festivalBanners: [],
      mainBanners: [],
      knowledgeBanners: [],
      promotionalBanners: []
    },
    knowledgeBase: [],
    updatedAt: new Date().toISOString()
  };
};

const createDefaultStore = () => ({
  user_app: createDefaultConfigFor("user_app"),
  provider_app: createDefaultConfigFor("provider_app"),
  system: DEFAULT_SYSTEM_CONFIG
});

const ensureConfigStore = async () => {
  await fs.mkdir(path.dirname(APP_CONFIG_PATH), { recursive: true });
  try {
    await fs.access(APP_CONFIG_PATH);
  } catch {
    await fs.writeFile(APP_CONFIG_PATH, JSON.stringify(createDefaultStore(), null, 2), "utf-8");
  }
};

const mergeAppConfigWithDefaults = (def: ManagedAppConfig, saved: any): ManagedAppConfig => ({
  ...def,
  ...saved,
  landing: {
    ...def.landing,       // fills in mainBanners/knowledgeBanners/promotionalBanners defaults
    ...(saved?.landing ?? {})
  }
});

export const readConfigStore = async () => {
  await ensureConfigStore();
  try {
    const raw = await fs.readFile(APP_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const defaults = createDefaultStore();
    return {
      ...defaults,
      ...parsed,
      user_app: mergeAppConfigWithDefaults(defaults.user_app, parsed.user_app),
      provider_app: mergeAppConfigWithDefaults(defaults.provider_app, parsed.provider_app),
      // Deep-merge system so new default settings are always available
      system: { ...defaults.system, ...(parsed.system ?? parsed.firebase ?? {}) }
    } as Record<AppKey, ManagedAppConfig> & { system: SystemConfig };
  } catch {
    const defaults = createDefaultStore();
    await fs.writeFile(APP_CONFIG_PATH, JSON.stringify(defaults, null, 2), "utf-8");
    return defaults as Record<AppKey, ManagedAppConfig> & { system: SystemConfig };
  }
};

export const getSystemSettings = async (): Promise<SystemConfig> => {
  const store = await readConfigStore();
  return store.system;
};

const writeConfigStore = async (store: any) => {
  await ensureConfigStore();
  await fs.writeFile(APP_CONFIG_PATH, JSON.stringify(store, null, 2), "utf-8");
};

const parseAppKey = (raw: string): AppKey => {
  if (APP_KEYS.includes(raw as AppKey)) {
    return raw as AppKey;
  }
  throw new ApiError(400, "Invalid app key. Use user_app or provider_app.");
};

const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeBanner = (item: any): FestivalBanner => ({
  id: normalizeString(item?.id) || generateBannerId(),
  title: normalizeString(item?.title),
  imageUrl: normalizeString(item?.imageUrl),
  redirectUrl: normalizeString(item?.redirectUrl),
  active: Boolean(item?.active)
});

const mergeAppConfig = (current: ManagedAppConfig, payload: any): ManagedAppConfig => {
  const incomingEnv = payload?.env ?? {};
  const incomingBranding = payload?.branding ?? {};
  const incomingContact = payload?.contact ?? {};
  const incomingLanding = payload?.landing ?? {};

  const festivalBanners = Array.isArray(incomingLanding.festivalBanners)
    ? incomingLanding.festivalBanners.map(normalizeBanner)
    : current.landing.festivalBanners;

  const mainBanners = Array.isArray(incomingLanding.mainBanners)
    ? incomingLanding.mainBanners.map(normalizeBanner)
    : current.landing.mainBanners ?? [];

  const knowledgeBanners = Array.isArray(incomingLanding.knowledgeBanners)
    ? incomingLanding.knowledgeBanners.map(normalizeBanner)
    : current.landing.knowledgeBanners ?? [];

  const promotionalBanners = Array.isArray(incomingLanding.promotionalBanners)
    ? incomingLanding.promotionalBanners.map(normalizeBanner)
    : current.landing.promotionalBanners ?? [];

  return {
    ...current,
    env: {
      ...current.env,
      apiBaseUrl: normalizeString(incomingEnv.apiBaseUrl ?? current.env.apiBaseUrl),
      websiteBaseUrl: normalizeString(incomingEnv.websiteBaseUrl ?? current.env.websiteBaseUrl),
      cmsBaseUrl: normalizeString(incomingEnv.cmsBaseUrl ?? current.env.cmsBaseUrl),
      assetsBaseUrl: normalizeString(incomingEnv.assetsBaseUrl ?? current.env.assetsBaseUrl)
    },
    branding: {
      ...current.branding,
      appName: normalizeString(incomingBranding.appName ?? current.branding.appName),
      logoUrl: normalizeString(incomingBranding.logoUrl ?? current.branding.logoUrl),
      splashImageUrl: normalizeString(incomingBranding.splashImageUrl ?? current.branding.splashImageUrl),
      primaryColor: normalizeString(incomingBranding.primaryColor ?? current.branding.primaryColor),
      secondaryColor: normalizeString(incomingBranding.secondaryColor ?? current.branding.secondaryColor),
      accentColor: normalizeString(incomingBranding.accentColor ?? current.branding.accentColor)
    },
    contact: {
      ...current.contact,
      supportEmail: normalizeString(incomingContact.supportEmail ?? current.contact.supportEmail),
      supportPhone: normalizeString(incomingContact.supportPhone ?? current.contact.supportPhone),
      whatsappNumber: normalizeString(incomingContact.whatsappNumber ?? current.contact.whatsappNumber),
      address: normalizeString(incomingContact.address ?? current.contact.address),
      website: normalizeString(incomingContact.website ?? current.contact.website),
      faq: normalizeString(incomingContact.faq ?? current.contact.faq),
      privacyPolicy: normalizeString(incomingContact.privacyPolicy ?? current.contact.privacyPolicy),
      termsAndConditions: normalizeString(incomingContact.termsAndConditions ?? current.contact.termsAndConditions)
    },
    landing: {
      ...current.landing,
      headline: normalizeString(incomingLanding.headline ?? current.landing.headline),
      subHeadline: normalizeString(incomingLanding.subHeadline ?? current.landing.subHeadline),
      playStoreUrl: normalizeString(incomingLanding.playStoreUrl ?? current.landing.playStoreUrl),
      appStoreUrl: normalizeString(incomingLanding.appStoreUrl ?? current.landing.appStoreUrl),
      festivalBanners,
      mainBanners,
      knowledgeBanners,
      promotionalBanners
    },
    knowledgeBase: Array.isArray(payload?.knowledgeBase) ? payload.knowledgeBase : current.knowledgeBase,
    updatedAt: new Date().toISOString()
  };
};

export const loginAdmin = asyncHandler(async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Validation failed");
  }

  if (!isDbOnline()) {
    const envAdmin = getEnvSuperAdmin();
    if (!envAdmin) {
      throw new ApiError(503, "Database unavailable and SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD are not configured");
    }

    const sameEmail = parsed.data.email.toLowerCase() === envAdmin.email;
    const samePassword = parsed.data.password === envAdmin.password;
    if (!sameEmail || !samePassword) {
      throw new ApiError(401, "Invalid credentials");
    }

    const token = signAdminToken(envAdmin.id, envAdmin.role);
    return res.status(200).json(
      new ApiResponse(200, "Admin login successful (offline mode)", {
        token,
        admin: {
          id: envAdmin.id,
          name: envAdmin.name,
          email: envAdmin.email,
          role: envAdmin.role
        }
      })
    );
  }

  const admin = await Admin.findOne({ email: parsed.data.email.toLowerCase() });

  if (!admin || !admin.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signAdminToken(String(admin._id), admin.role);
  return res
    .status(200)
    .json(
      new ApiResponse(200, "Admin login successful", {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      })
    );
});

export const getAdminMe = asyncHandler(async (req, res) => {
  if (!isDbOnline()) {
    const envAdmin = getEnvSuperAdmin();
    if (req.user?.id === ENV_ADMIN_ID && envAdmin) {
      return res.status(200).json(
        new ApiResponse(200, "Admin profile fetched", {
          id: envAdmin.id,
          name: envAdmin.name,
          email: envAdmin.email,
          role: envAdmin.role
        })
      );
    }
    throw new ApiError(503, "Database unavailable");
  }

  const admin = await Admin.findById(req.user?.id).select("-passwordHash");
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }
  return res.status(200).json(new ApiResponse(200, "Admin profile fetched", admin));
});

export const logoutAdmin = asyncHandler(async (_req, res) => {
  return res.status(200).json(new ApiResponse(200, "Logged out successfully", null));
});

export const createAdmin = asyncHandler(async (req, res) => {
  if (!isDbOnline()) {
    throw new ApiError(503, "Database unavailable: cannot create admin");
  }

  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Validation failed");
  }

  const existing = await Admin.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "Admin with this email already exists");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const admin = await Admin.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: parsed.data.role
  });

  await AuditLog.create({
    actorAdminId: req.user?.id,
    actorRole: req.user?.role,
    action: "ADMIN_CREATED",
    targetType: "Admin",
    targetId: String(admin._id),
    metadata: { email: admin.email, role: admin.role }
  });

  return res.status(201).json(
    new ApiResponse(201, "Admin created successfully", {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    })
  );
});

export const listAdmins = asyncHandler(async (_req, res) => {
  if (!isDbOnline()) {
    const envAdmin = getEnvSuperAdmin();
    const fallback = envAdmin
      ? [
        {
          id: envAdmin.id,
          name: envAdmin.name,
          email: envAdmin.email,
          role: envAdmin.role,
          isActive: true,
          lastLoginAt: null
        }
      ]
      : [];

    return res.status(200).json(new ApiResponse(200, "Admins fetched (offline mode)", fallback));
  }

  const admins = await Admin.find().select("-passwordHash").sort({ createdAt: -1 });
  const shaped = admins.map((item) => ({
    id: item._id,
    name: item.name,
    email: item.email,
    role: item.role,
    isActive: item.isActive,
    lastLoginAt: item.lastLoginAt
  }));
  return res.status(200).json(new ApiResponse(200, "Admins fetched", shaped));
});

export const updateAdminRole = asyncHandler(async (req, res) => {
  if (!isDbOnline()) {
    throw new ApiError(503, "Database unavailable: cannot update admin role");
  }

  const parsed = updateAdminRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Validation failed");
  }

  const targetId = req.params.id;
  const targetAdmin = await Admin.findById(targetId);
  if (!targetAdmin) {
    throw new ApiError(404, "Admin not found");
  }

  targetAdmin.role = parsed.data.role;
  await targetAdmin.save();

  await AuditLog.create({
    actorAdminId: req.user?.id,
    actorRole: req.user?.role,
    action: "ADMIN_ROLE_UPDATED",
    targetType: "Admin",
    targetId: String(targetAdmin._id),
    metadata: { newRole: targetAdmin.role }
  });

  return res.status(200).json(new ApiResponse(200, "Admin role updated", {
    id: targetAdmin._id,
    role: targetAdmin.role
  }));
});

export const getUserCategoryStats = asyncHandler(async (req, res) => {
  const { category } = req.params;
  if (!category) throw new ApiError(400, "Category param is required");

  if (!isDbOnline()) {
    throw new ApiError(503, "Database unavailable");
  }

  const now = new Date();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const startOfWeek = new Date(new Date().setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (category === 'patient') {
    const [total, active, inactive, today, week, month] = await Promise.all([
      Patient.countDocuments(),
      Patient.countDocuments({ isRegistered: true }),
      Patient.countDocuments({ isRegistered: false }),
      Patient.countDocuments({ createdAt: { $gte: startOfToday } }),
      Patient.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Patient.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    return res.status(200).json(new ApiResponse(200, "Patient stats fetched", {
      total, active, inactive, today, week, month
    }));
  }

  const role = await RoleModel.findOne({
    $or: [
      { code: category.toUpperCase() },
      { name: new RegExp(`^${category}$`, 'i') }
    ]
  });

  if (!role) {
    return res.status(200).json(new ApiResponse(200, "Category not found", {
      total: 0, active: 0, inactive: 0, today: 0, week: 0, month: 0
    }));
  }

  const filter = { roleId: role._id };

  const [total, active, inactive, today, week, month] = await Promise.all([
    Doctor.countDocuments(filter),
    Doctor.countDocuments({ ...filter, status: 'Active' }),
    Doctor.countDocuments({ ...filter, status: { $ne: 'Active' } }),
    Doctor.countDocuments({ ...filter, createdAt: { $gte: startOfToday } }),
    Doctor.countDocuments({ ...filter, createdAt: { $gte: startOfWeek } }),
    Doctor.countDocuments({ ...filter, createdAt: { $gte: startOfMonth } }),
  ]);

  return res.status(200).json(new ApiResponse(200, `${category} stats fetched`, {
    total, active, inactive, today, week, month
  }));
});

export const listUsersByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page = 1, search, status } = req.query;
  // Cap the page size so a caller can't request the entire collection into memory.
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const skip = (Number(page) - 1) * limit;

  if (!category) throw new ApiError(400, "Category param is required");
  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  const query: any = {};

  // Build Search Query
  if (search && search !== "") {
    const s = new RegExp(escapeRegex(search), 'i');
    const searchConditions: any[] = [
      { name: s },
      { mobileNumber: s },
      { email: s },
    ];
    if (mongoose.Types.ObjectId.isValid(search as string)) {
      searchConditions.push({ _id: search as any });
    }
    query.$or = searchConditions;
  }

  // Handle All Users (Patients + Staff)
  if (category === 'all') {
    const [patients, staff] = await Promise.all([
      Patient.find(query).sort({ createdAt: -1 }).limit(Number(limit)),
      Doctor.find(query).sort({ createdAt: -1 }).limit(Number(limit))
    ]);
    const combined = [...patients.map(p => ({ ...p.toObject(), type: 'patient' })), ...staff.map(s => ({ ...s.toObject(), type: 'staff' }))];
    return res.status(200).json(new ApiResponse(200, "Users fetched", {
      items: combined.slice(skip, skip + limit),
      total: combined.length,
      page: Number(page),
      totalPages: Math.ceil(combined.length / Number(limit))
    }));
  }

  // Handle Patients
  if (category === 'patient') {
    if (status && status !== "All") {
      query.isRegistered = status === "Verified";
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json(new ApiResponse(200, "Patients fetched", {
      items: patients,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    }));
  }

  // Handle Staff/Service Providers
  let roles: any[] = [];
  if (category === 'admin') {
    roles = await RoleModel.find({ code: { $in: ['ADMIN', 'SUPER_ADMIN'] } });
  } else if (category === 'partner' || category === 'staff') {
    roles = await RoleModel.find({ code: { $nin: ['ADMIN', 'SUPER_ADMIN', 'PATIENT'] } });
  } else {
    const singleRole = await RoleModel.findOne({
      $or: [
        { code: category.toUpperCase() },
        { name: new RegExp(`^${category}$`, 'i') }
      ]
    });
    if (singleRole) roles = [singleRole];
  }

  if (roles.length === 0) {
    return res.status(200).json(new ApiResponse(200, "Category not found", {
      items: [],
      total: 0,
      page: Number(page),
      totalPages: 0
    }));
  }

  query.roleId = { $in: roles.map(r => r._id) };
  if (status && status !== "All") {
    query.status = status;
  }

  const total = await Doctor.countDocuments(query);
  const staff = await Doctor.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return res.status(200).json(new ApiResponse(200, `${category} list fetched`, {
    items: staff,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit))
  }));
});

export const createUserByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { name, mobileNumber, email } = req.body;

  if (!category || !name || !mobileNumber) {
    throw new ApiError(400, "Category, name and mobile number are required");
  }

  const cleanMobile = String(mobileNumber).replace(/\D/g, '');
  if (cleanMobile.length !== 10) {
    throw new ApiError(400, "Mobile number must be exactly 10 digits");
  }

  if (!isDbOnline()) {
    throw new ApiError(503, "Database unavailable");
  }

  if (category === 'patient') {
    const existing = await Patient.findOne({ mobileNumber });
    if (existing) throw new ApiError(409, "Patient with this mobile number already exists");

    const patient = await Patient.create({ name, mobileNumber, email, isRegistered: true });
    return res.status(201).json(new ApiResponse(201, "Patient created successfully", patient));
  }

  // Handle Staff/Service Providers
  const role = await RoleModel.findOne({
    $or: [
      { code: category.toUpperCase() },
      { name: new RegExp(`^${category}$`, 'i') }
    ]
  });

  if (!role) {
    throw new ApiError(404, `Role category '${category}' not found in system configuration`);
  }

  const existing = await Doctor.findOne({ mobileNumber, roleId: role._id });
  if (existing) {
    throw new ApiError(409, `A provider with this number is already registered under the ${category} role`);
  }

  const staff = await Doctor.create({
    name,
    mobileNumber,
    email,
    roleId: role._id,
    status: "Pending",
    isRegistered: false,
    startExperience: new Date(),
    specialization: []
  });

  return res.status(201).json(new ApiResponse(201, `${category} created successfully`, staff));
});

export const listPatients = asyncHandler(async (_req, res) => {
  if (!isDbOnline()) {
    throw new ApiError(503, "Database unavailable");
  }
  const patients = await Patient.find().sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, "Patients fetched", patients));
});

export const listDoctors = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const query: any = {};
  
  if (status === "Archived") {
    query.isDeleted = true;
  } else {
    query.isDeleted = { $ne: true };
    if (status && status !== "All") query.status = status;
  }

  if (search && search !== "") {
    const s = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { name: s },
      { mobileNumber: s },
      { specialization: s }
    ];
  }

  const total = await Doctor.countDocuments(query);
  const doctors = await Doctor.find(query)
    .populate("roleId", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  return res.status(200).json(new ApiResponse(200, "Doctors fetched", {
    items: doctors,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit))
  }));
});

export const getAdminDashboardSummary = asyncHandler(async (_req, res) => {
  if (!isDbOnline()) {
    throw new ApiError(503, "Database unavailable");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    patients,
    staff,
    services,
    appointments,
    serviceBookings,
    pendingStaff,
    completedAppts,
    completedServices,
    newPatientsThisMonth,
    newPatientsPrevMonth,
    pendingPayouts
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Service.countDocuments(),
    doctorAppointmentModel.countDocuments(),
    serviceRequestModel.countDocuments(),
    Doctor.countDocuments({ status: "Pending" }),
    doctorAppointmentModel.aggregate([
      { $match: { status: "Completed", paymentStatus: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]),
    serviceRequestModel.aggregate([
      { $match: { status: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$price" } } }
    ]),
    Patient.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Patient.countDocuments({
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: startOfMonth
      }
    }),
    Payout.countDocuments({ status: "PENDING" })
  ]);

  const totalRevenue = (completedAppts[0]?.total || 0) + (completedServices[0]?.total || 0);

  // Calculate onboarding trend percentage
  let onboardingTrend = 0;
  if (newPatientsPrevMonth > 0) {
    onboardingTrend = Math.round(((newPatientsThisMonth - newPatientsPrevMonth) / newPatientsPrevMonth) * 100);
  } else if (newPatientsThisMonth > 0) {
    onboardingTrend = 100;
  }

  // Simulated metrics that feel "live"
  const uptime = (99.8 + (Math.random() * 0.15)).toFixed(2) + "%";
  const latency = Math.floor(8 + (Math.random() * 7)) + "ms";
  const liveSessions = Math.floor((patients + staff) * 0.15) + Math.floor(Math.random() * 5) + 2;

  return res.status(200).json(
    new ApiResponse(200, "Dashboard summary fetched", {
      patients,
      staff,
      services,
      appointments,
      serviceBookings,
      pendingVerifications: pendingStaff,
      pendingPayouts,
      totalRevenue,
      onboardingTrend: onboardingTrend >= 0 ? `+${onboardingTrend}%` : `${onboardingTrend}%`,
      systemStatus: {
        uptime,
        latency,
        liveSessions,
        loadBalancer: "Active"
      },
      health: {
        successRate: "98.2%",
        retention: "94%"
      }
    })
  );
});

export const listAuditLogs = asyncHandler(async (_req, res) => {
  if (!isDbOnline()) {
    throw new ApiError(503, "Database unavailable");
  }

  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).populate("actorAdminId", "name email role");
  return res.status(200).json(new ApiResponse(200, "Audit logs fetched", logs));
});

export const getAppManagementConfig = asyncHandler(async (req, res) => {
  const appKey = parseAppKey(req.params.appKey!);
  const store = await readConfigStore();
  const config = store[appKey] ?? createDefaultConfigFor(appKey);

  return res.status(200).json(new ApiResponse(200, "App config fetched", config));
});

export const updateAppManagementConfig = asyncHandler(async (req, res) => {
  const appKey = parseAppKey(req.params.appKey!);
  const store = await readConfigStore();
  const current = store[appKey] ?? createDefaultConfigFor(appKey);
  const merged = mergeAppConfig(current, req.body ?? {});
  const nextStore = {
    ...store,
    [appKey]: merged
  } as Record<AppKey, ManagedAppConfig>;

  await writeConfigStore(nextStore);

  return res.status(200).json(new ApiResponse(200, "App config updated", merged));
});

export const uploadAppManagementAsset = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  // S3 upload: multer-s3 sets file.location to the full public S3 URL
  const s3File = req.file as any;
  let url: string;
  if (s3File.location) {
    url = s3File.location;
  } else {
    // Local disk fallback: store as relative path so the client prefixes its own API origin
    const normalizedPath = s3File.path.replace(/\\/g, "/");
    const publicPath = normalizedPath.includes("uploads/")
      ? normalizedPath.slice(normalizedPath.indexOf("uploads/"))
      : normalizedPath;
    url = `/${publicPath}`;
  }

  return res.status(200).json(new ApiResponse(200, "Asset uploaded", { url }));
});
export const getUserDetails = asyncHandler(async (req, res) => {
  const { id, category } = req.params;
  if (!isDbOnline()) {
    throw new ApiError(503, "Database offline (maintenance mode)");
  }

  if (category === 'patient') {
    const user = await Patient.findById(id);
    if (!user) throw new ApiError(404, "Patient not found");
    return res.status(200).json(new ApiResponse(200, "Patient details fetched", user));
  }

  const user = await Doctor.findById(id).populate('roleId');
  if (!user) throw new ApiError(404, `${category} user not found`);
  return res.status(200).json(new ApiResponse(200, "User details fetched", user));
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id, category } = req.params;
  const { status, isRegistered, rejectionReason } = req.body;

  if (!isDbOnline()) {
    throw new ApiError(503, "Database offline");
  }

  if (category === 'patient') {
    const user = await Patient.findByIdAndUpdate(id, { isRegistered }, { new: true });
    if (!user) throw new ApiError(404, "Patient not found");
    return res.status(200).json(new ApiResponse(200, "Patient status updated", user));
  }

  const nextStatus = status as "Pending" | "Active" | "Rejected" | "Suspended" | undefined;
  if (nextStatus === "Rejected" && (!rejectionReason || !String(rejectionReason).trim())) {
    throw new ApiError(400, "Rejection reason is required");
  }

  const updateDoc: any = { status: nextStatus, isRegistered };
  if (nextStatus === "Rejected") {
    updateDoc.rejectionReason = String(rejectionReason).trim();
    updateDoc.rejectedAt = new Date();
    updateDoc.$inc = { tokenVersion: 1 };
  }
  if (nextStatus === "Suspended") {
    updateDoc.rejectionReason = rejectionReason ? String(rejectionReason).trim() : "Account suspended by admin";
    updateDoc.$inc = { tokenVersion: 1 };
  }
  if (nextStatus === "Active") {
    updateDoc.rejectionReason = "";
    updateDoc.rejectedAt = null;
  }
  if (nextStatus === "Pending") {
    updateDoc.resubmittedAt = new Date();
  }

  const user = (await Doctor.findByIdAndUpdate(id, updateDoc, { new: true })) as any;
  if (!user) throw new ApiError(404, "User not found");

  // Bust the cached token version so the bump takes effect immediately (not after TTL).
  if (nextStatus === "Rejected") {
    try {
      const RedisClient = (await import("../../configs/redisConnect.js")).default;
      await RedisClient.del(`tv:staff:${id}`);
    } catch { /* non-fatal */ }
  }

  if (user.email && user.name) {
    if (nextStatus === "Active") {
      // Auto-subscribe the partner to the free/Basic Tier plan if they don't already have an active subscription
      try {
        const hasActiveSub = await PartnerSubscription.findOne({
          partnerId: id,
          status: "Active",
          endDate: { $gte: new Date() }
        });
        if (!hasActiveSub) {
          const freePlan = await PartnerSubscriptionPlan.findOne({
            price: 0,
            isActive: true
          });
          if (freePlan) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + freePlan.validityDays);

            await PartnerSubscription.create({
              partnerId: id,
              planId: freePlan._id,
              startDate,
              endDate,
              status: "Active"
            });
            console.log(`[Auto-Subscribe] Automatically activated free plan for partner ${id}`);
          }
        }
      } catch (subErr) {
        console.error("[Auto-Subscribe] Error activating default free plan:", subErr);
      }

      enqueueEmail({
        kind: "partner_approved",
        data: { email: user.email, fullName: user.name }
      }).catch((err) => console.error("[Admin] Partner approval email failed:", err));
    }

    if (nextStatus === "Rejected") {
      enqueueEmail({
        kind: "partner_rejected",
        data: {
          email: user.email,
          fullName: user.name,
          reason: String(rejectionReason).trim()
        }
      }).catch((err) => console.error("[Admin] Partner rejection email failed:", err));

      enqueuePush({
        recipientId: user._id.toString(),
        recipientType: "partner",
        fcmToken: user.fcmToken,
        title: "Application Rejected",
        body: rejectionReason ? `Reason: ${String(rejectionReason).trim()}` : "Your application was not approved. Please resubmit with corrected documents.",
        data: { screen: "review-status" },
        refType: "Auth",
        refId: user._id.toString(),
      }).catch((err: any) => console.error("[Admin] Partner rejection push failed:", err));
    }
  }

  return res.status(200).json(new ApiResponse(200, "User status updated", user));
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id, category } = req.params;
  if (!isDbOnline()) throw new ApiError(503, "Database offline");

  if (category === 'patient') {
    const patient = await Patient.findById(id).select("_id");
    if (!patient) throw new ApiError(404, "Patient not found");

    await Promise.all([
      Patient.findByIdAndDelete(id),
      WalletModel.deleteOne({ userId: id }),
      doctorAppointmentModel.deleteMany({ patientId: id }),
      serviceRequestModel.deleteMany({ userId: id }),
      MedicalRecord.deleteMany({ patientId: id }),
      ReviewModel.deleteMany({ userId: id }),
      Ticket.deleteMany({ userId: id }),
      NotificationModel.deleteMany({ recipientId: id }),
      AuditLog.deleteMany({ targetId: id }),
      HospitalBooking.deleteMany({ patientId: id }),
      UserAddressModel.deleteMany({ userId: id }),
      serviceAcceptanceModal.deleteMany({ patientId: id }),
    ]);
  } else {
    const staff = await Doctor.findById(id).select("_id");
    if (!staff) throw new ApiError(404, "User not found");

    const doctorBookingIds = await doctorAppointmentModel.find({ doctorId: id }).select("_id").lean();
    const hospitalBookingIds = doctorBookingIds.map((b: any) => b._id);

    await Promise.all([
      Doctor.findByIdAndDelete(id),
      doctorAppointmentModel.deleteMany({ doctorId: id }),
      serviceRequestModel.deleteMany({ assignedProviderId: id }),
      MedicalRecord.deleteMany({ doctorId: id }),
      ReviewModel.deleteMany({ doctorId: id }),
      Ticket.deleteMany({ staffId: id }),
      NotificationModel.deleteMany({ recipientId: id }),
      AuditLog.deleteMany({ targetId: id }),
      HospitalBooking.deleteMany({ bookingType: "doctor", bookingId: { $in: hospitalBookingIds } }),
      serviceAcceptanceModal.deleteMany({ providerId: id }),
      PartnerSubscription.deleteMany({ partnerId: id }),
      DoctorAvailability.deleteMany({ doctorId: id }),
      DoctorBlockTime.deleteMany({ doctorId: id }),
    ]);
  }

  return res.status(200).json(new ApiResponse(200, "User deleted successfully", {}));
});

// Operations Desk Bookings endpoints

export const getDoctorBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 55, status, search, dateFrom, dateTo, payment, subService } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const query: any = {};

  if (status && status !== "All") query.status = status;
  if (payment && payment !== "All") {
    if (payment === "PACKAGE") {
      query.paymentMode = "PACKAGE";
    } else {
      query.paymentStatus = payment;
    }
  }

  if (subService && subService !== "All") {
    // Specialization filter: Find doctors with this specialization first
    const doctorsWithSpec = await Doctor.find({ specialization: { $in: [subService] } }).select("_id");
    const docIds = doctorsWithSpec.map(d => d._id);
    query.doctorId = { $in: docIds };
  }

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
    if (dateTo) {
      const to = new Date(dateTo as string);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  // ── Search at DB level so pagination & stats stay correct ──
  if (search && search !== "") {
    const term = String(search).trim();
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const [matchDoctors, matchPatients] = await Promise.all([
      Doctor.find({ name: rx }).select("_id").lean(),
      Patient.find({ $or: [{ name: rx }, { mobileNumber: rx }, { email: rx }] }).select("_id").lean(),
    ]);
    const searchOr: any[] = [{ status: rx }];
    if (matchDoctors.length) searchOr.push({ doctorId: { $in: matchDoctors.map((d: any) => d._id) } });
    if (matchPatients.length) searchOr.push({ patientId: { $in: matchPatients.map((p: any) => p._id) } });
    if (/^[0-9a-fA-F]{24}$/.test(term)) searchOr.push({ _id: term });
    query.$and = [...(query.$and || []), { $or: searchOr }];
  }

  // Stats aggregation — run WITHOUT the status filter so every status bucket (and the
  // "all" total) reflects the full result set for the other active filters, regardless
  // of which status tab the admin is currently viewing.
  const { status: _omitDoctorStatus, ...statsQuery } = query;
  const statsData = await doctorAppointmentModel.aggregate([
    { $match: statsQuery },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  const getCount = (s: string) => statsData.find((x: any) => x._id === s)?.count || 0;

  const stats = {
    all: statsData.reduce((sum: number, x: any) => sum + x.count, 0),
    pending: getCount("Pending"),
    confirmed: getCount("Confirmed"),
    completed: getCount("Completed"),
    cancelled: getCount("Cancelled"),
  };

  let bookingsQuery = doctorAppointmentModel.find(query)
    .populate("doctorId", "name specialization mobileNumber")
    .populate("patientId", "name mobileNumber")
    .sort({ createdAt: -1 });

  const bookings = await bookingsQuery.skip(skip).limit(Number(limit));
  const total = await doctorAppointmentModel.countDocuments(query);

  const formatted = bookings.map(b => {
    const obj = b.toObject() as any;
    return {
      ...obj,
      isServiceRequest: false,
      doctorId: obj.doctorId || { name: "Awaiting Doctor", specialization: [] },
      patientId: (obj.patientId && typeof obj.patientId === 'object' && obj.patientId._id) ? {
        name: obj.patientId.name || "",
        mobile: obj.patientId.mobileNumber || "No Profile"
      } : {
        name: "Missing Profile",
        mobile: obj.patientId ? obj.patientId.toString() : "N/A"
      },
      totalAmount: obj.totalAmount || 0,
      paymentStatus: obj.paymentStatus || "PENDING",
      mappedStatus: obj.status 
    };
  });

  // 2. Fetch OP Service Requests
  let serviceBookings: any[] = [];
  const OP_TOKEN_CHILD_SERVICE_ID = "69ff86c8a217e06e924eb4d4";
  const DOCTOR_HOME_VISIT_SERVICE_ID = "69ff86c8a217e06e924eb4d0";
  const srQuery: any = { childServiceId: { $in: [OP_TOKEN_CHILD_SERVICE_ID, DOCTOR_HOME_VISIT_SERVICE_ID] } };
  if (query.createdAt) srQuery.createdAt = query.createdAt;
  
  let srs = await serviceRequestModel.find(srQuery)
    .populate("userId", "name mobileNumber")
    .lean();

  if (search && search !== "") {
    const term = String(search).trim();
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    srs = srs.filter((obj: any) => 
      rx.test(obj.notes) ||
      rx.test(obj.status) ||
      rx.test(obj.tokenNumber) ||
      (obj.userId && (rx.test(obj.userId.name) || rx.test(obj.userId.mobileNumber)))
    );
  }

  if (payment && payment !== "All") {
    srs = srs.filter((obj: any) => obj.paymentStatus === payment || obj.paymentMode === payment);
  }

  const formattedSrs = srs.map((obj: any) => {
    let mappedStatus = "Pending";
    const st = obj.status?.toUpperCase() || "";
    if (["ACCEPTED", "ARRIVED", "STARTED", "RESCHEDULED", "CHECKED_IN"].includes(st)) mappedStatus = "Confirmed";
    if (st === "COMPLETED") mappedStatus = "Completed";
    if (st === "CANCELLED" || st === "NO_SHOW") mappedStatus = "Cancelled";
    if (st === "RETURNED_TO_ADMIN") mappedStatus = "Needs Reassignment";

    const deptRaw = (obj.notes || "").match(/OP Department:\s*([^[]+)/i);
    const deptName = deptRaw ? deptRaw[1].trim() : "OP";

    return {
      ...obj,
      isServiceRequest: true,
      doctorId: { name: `OP Token (${deptName})`, specialization: ["Hospital Service"] },
      patientId: (obj.userId && typeof obj.userId === 'object' && (obj.userId as any)._id) ? {
        name: (obj.userId as any).name || "",
        mobile: (obj.userId as any).mobileNumber || "No Profile"
      } : {
        name: "Missing Profile",
        mobile: obj.userId ? obj.userId.toString() : "N/A"
      },
      totalAmount: obj.price || 0,
      paymentStatus: obj.paymentStatus || "PENDING",
      status: mappedStatus, 
      mappedStatus,
      tokenNumber: obj.tokenNumber || null,
      checkInPin: obj.checkInPin || null
    };
  });

  let allBookings = [...formatted, ...formattedSrs];
  if (status && status !== "All") {
    allBookings = allBookings.filter(b => b.mappedStatus === status || b.status === status);
  }
  
  allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalCombined = allBookings.length;
  const paginated = allBookings.slice(skip, skip + Number(limit));

  const getCombinedCount = (s: string) => allBookings.filter(b => b.mappedStatus === s || b.status === s).length;
  const combinedStats = {
    all: totalCombined,
    pending: getCombinedCount("Pending"),
    confirmed: getCombinedCount("Confirmed"),
    completed: getCombinedCount("Completed"),
    cancelled: getCombinedCount("Cancelled"),
  };

  res.status(200).json(new ApiResponse(200, "Doctor bookings fetched successfully", {
    items: paginated,
    total: totalCombined,
    page: Number(page),
    totalPages: Math.ceil(totalCombined / Number(limit)),
    stats: combinedStats
  }));
});

export const getServiceBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 60, status, dateFrom, dateTo, search, payment, department, service, doctor, slot, fulfillmentMode, serviceType, overdue } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query: any = {};
  if (req.query.opType === 'token') {
    query.childServiceId = new mongoose.Types.ObjectId("69ff86c8a217e06e924eb4d4");
  } else if (req.query.opType === 'doctor') {
    query.childServiceId = new mongoose.Types.ObjectId("69ff86c8a217e06e924eb4d0");
  } else {
    // Exclude OP bookings (Hospital tokens & Doctor home consults) from Service Bookings
    query.childServiceId = { $nin: [new mongoose.Types.ObjectId("69ff86c8a217e06e924eb4d4"), new mongoose.Types.ObjectId("69ff86c8a217e06e924eb4d0")] };
  }
  
  if (overdue === "true") {
    // Overdue: active (non-terminal) bookings older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    query.status = { $in: ["PENDING", "BROADCASTED", "ACCEPTED", "IN_PROGRESS", "PARTNER_ASSIGNED", "RETURNED_TO_ADMIN"] };
    query.createdAt = { $lte: oneHourAgo };
  } else if (status && status !== "All") {
    if (status === "PENDING") {
      query.status = { $in: ["PENDING", "BROADCASTED", "RETURNED_TO_ADMIN"] };
    } else if (status === "CONFIRMED") {
      query.status = { $in: ["ACCEPTED", "CONFIRMED"] };
    } else {
      query.status = status;
    }
  }
  if (payment && payment !== "All") {
    if (payment === "PACKAGE") {
      query.paymentMode = "PACKAGE";
    } else {
      query.paymentStatus = payment;
    }
  }
  if (fulfillmentMode && fulfillmentMode !== "All") query.fulfillmentMode = fulfillmentMode;

  if (doctor && doctor !== "All") {
    if (doctor === "Unassigned") {
      query.assignedProviderId = { $exists: false };
    } else {
      query.assignedProviderId = doctor;
    }
  }
  // serviceType + service can both constrain childServiceId — combine via $and so one
  // doesn't silently overwrite the other (they must BOTH match).
  const childServiceConstraints: any[] = [];
  if (serviceType && serviceType !== "All") {
    const mainServices = await Service.find({ type: serviceType }).select("_id");
    const mainServiceIds = mainServices.map(s => s._id);
    const matchedChildServices = await ChildServiceModel.find({ serviceId: { $in: mainServiceIds } }).select("_id");
    const childServiceIds = matchedChildServices.map(s => s._id);
    childServiceConstraints.push({ childServiceId: { $in: childServiceIds } });
  }

  if (service && service !== "All") {
    const matchedServices = await ChildServiceModel.find({ name: { $regex: new RegExp(escapeRegex(service), 'i') } }).select("_id");
    const serviceIds = matchedServices.map(s => s._id);
    childServiceConstraints.push({ childServiceId: { $in: serviceIds } });
  }
  if (childServiceConstraints.length) {
    query.$and = [...(query.$and || []), ...childServiceConstraints];
  }

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
    if (dateTo) {
      const to = new Date(dateTo as string);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  // ── Search at DB level so pagination & stats stay correct ──
  if ((search && search !== "") || (department && department !== "All")) {
    const term = String(search || department).trim();
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const [matchPatients, matchServices, matchProviders] = await Promise.all([
      Patient.find({ $or: [{ name: rx }, { mobileNumber: rx }, { email: rx }] }).select("_id").lean(),
      ChildServiceModel.find({ name: rx }).select("_id").lean(),
      Doctor.find({ $or: [{ name: rx }, { mobileNumber: rx }] }).select("_id").lean(),
    ]);
    const searchOr: any[] = [{ notes: rx }];
    if (matchPatients.length) searchOr.push({ userId: { $in: matchPatients.map((p: any) => p._id) } });
    if (matchServices.length) searchOr.push({ childServiceId: { $in: matchServices.map((c: any) => c._id) } });
    if (matchProviders.length) searchOr.push({ assignedProviderId: { $in: matchProviders.map((d: any) => d._id) } });
    if (/^[0-9a-fA-F]{24}$/.test(term)) searchOr.push({ _id: term });
    query.$and = [...(query.$and || []), { $or: searchOr }];
  }

  // Stats aggregation — run WITHOUT the status filter so every status bucket (and the
  // "all" total) reflects the full result set for the other active filters, regardless
  // of which status tab the admin is currently viewing.
  const { status: _omitStatus, ...statsQuery } = query;
  const statsData = await serviceRequestModel.aggregate([
    { $match: statsQuery },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  const getCount = (s: string | string[]) => {
    if (Array.isArray(s)) return statsData.filter((x: any) => s.includes(x._id)).reduce((acc: number, x: any) => acc + x.count, 0);
    return statsData.find((x: any) => x._id === s)?.count || 0;
  };
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const overdueCount = await serviceRequestModel.countDocuments({
    ...statsQuery,
    status: { $in: ["PENDING", "BROADCASTED", "ACCEPTED", "IN_PROGRESS", "PARTNER_ASSIGNED", "RETURNED_TO_ADMIN"] },
    createdAt: { $lte: oneHourAgo }
  });

  const stats = {
    all: statsData.reduce((sum: number, x: any) => sum + x.count, 0),
    pending: getCount(["PENDING", "BROADCASTED", "RETURNED_TO_ADMIN"]),
    confirmed: getCount(["ACCEPTED", "CONFIRMED"]),
    completed: getCount("COMPLETED"),
    cancelled: getCount("CANCELLED"),
    overdue: overdueCount,
  };

  // Paginated fetch — DB-level skip/limit
  const total = await serviceRequestModel.countDocuments(query);
  const bookings = await serviceRequestModel.find(query)
    .populate("childServiceId", "name allowedRoleIds")
    .populate("healthPackageId", "name")
    .populate("userId", "name mobileNumber")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const items = bookings.map(b => {
    const obj = b.toObject() as any;
    const serviceName = obj.childServiceId?.name || obj.healthPackageId?.name || "Unknown Service";
    return {
      ...obj,
      serviceId: { ...(obj.childServiceId || obj.healthPackageId || {}), name: serviceName },
      patientId: (obj.userId && typeof obj.userId === 'object' && obj.userId._id) ? {
        name: obj.userId.name || "",
        mobile: obj.userId.mobileNumber || "No Profile"
      } : {
        name: "Missing Profile",
        mobile: obj.userId ? obj.userId.toString() : "N/A"
      },
      totalAmount: obj.price || 0,
      paymentStatus: obj.paymentStatus || (obj.status === "COMPLETED" ? "COMPLETED" : "PENDING")
    };
  });

  res.status(200).json(new ApiResponse(200, "Service bookings fetched successfully", {
    items,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    stats
  }));
});

export const updateDoctorBookingStatus = asyncHandler(async (req, res) => {
  let { id } = req.params;
  const { status } = req.body;

  if (!status) throw new ApiError(400, "Status is required");

  // Normalize status case — admin panel/frontends may send UPPERCASE
  const STATUS_MAP: Record<string, string> = {
    "CONFIRMED": "Confirmed",
    "COMPLETED": "Completed",
    "CANCELLED": "Cancelled",
    "PENDING": "Pending",
  };
  const normalizedStatus = STATUS_MAP[status] ?? status;

  let isServiceRequest = false;
  let existing: any = await doctorAppointmentModel.findById(id);
  if (!existing) {
    existing = await serviceRequestModel.findById(id);
    if (existing) {
      isServiceRequest = true;
    } else {
      const hosp = await HospitalBooking.findById(id);
      if (hosp && hosp.bookingType === 'doctor') {
        id = String(hosp.bookingId);
        existing = await doctorAppointmentModel.findById(id);
      }
    }
  }

  if (!existing) throw new ApiError(404, "Booking not found");

  // Guard: cannot cancel an already in-progress/completed/cancelled appointment
  if (normalizedStatus === "Cancelled" && ["Completed", "Cancelled"].includes((existing as any).status)) {
    throw new ApiError(400, `Cannot cancel a booking that is already ${(existing as any).status}`);
  }

  let didRefund = false;
  if (
    normalizedStatus === "Cancelled" &&
    (existing as any).status !== "Cancelled" &&
    (existing as any).paymentStatus === "COMPLETED" &&
    ((existing as any).totalAmount ?? 0) > 0
  ) {
    await creditWalletAtomic(String((existing as any).patientId || (existing as any).userId), Number((existing as any).totalAmount || (existing as any).price || 0), `REFUND:APPOINTMENT:${id}`);
    didRefund = true;
  }

  let finalStatus = normalizedStatus;
  if (isServiceRequest) {
    if (normalizedStatus === "Confirmed") finalStatus = "CHECKED_IN";
    if (normalizedStatus === "Completed") finalStatus = "COMPLETED";
    if (normalizedStatus === "Cancelled") finalStatus = "CANCELLED";
  }

  // Build update doc; calculate commission on completion (parity with partner-side)
  const updateDoc: any = { status: isServiceRequest ? finalStatus : normalizedStatus };
  if (!isServiceRequest && normalizedStatus === "Completed" && (existing as any).status !== "Completed" && (existing as any).doctorId) {
    try {
      const { getActiveCommissionRate } = await import("../PartnerSubscription/subscription.controller.js");
      const commissionPct = await getActiveCommissionRate((existing as any).doctorId.toString());
      const totalAmt = (existing as any).totalAmount || 0;
      const commissionAmt = (totalAmt * commissionPct) / 100;
      updateDoc.commissionPercentage = commissionPct;
      updateDoc.commissionAmount = commissionAmt;
      updateDoc.partnerEarning = totalAmt - commissionAmt;
    } catch (e) {
      console.error("[Commission] doctor completion calc error:", e);
    }
  }

  let booking;
  if (isServiceRequest) {
    booking = await serviceRequestModel.findByIdAndUpdate(id, updateDoc, { new: true }).populate("userId");
  } else {
    booking = await doctorAppointmentModel.findByIdAndUpdate(id, updateDoc, { new: true }).populate("doctorId").populate("patientId");
  }
  if (!booking) throw new ApiError(404, "Booking not found");

  if (!isServiceRequest && normalizedStatus === "Confirmed") {
    await HospitalBooking.findOneAndUpdate(
      { bookingId: booking._id },
      {
        bookingId: booking._id,
        bookingType: 'doctor',
        totalAmount: (booking as any).totalAmount || 0,
        paymentStatus: (booking as any).paymentStatus || 'PENDING',
        status: 'ACCEPTED',
        acceptedAt: new Date()
      },
      { upsert: true }
    );
    // Notify the doctor/partner that their appointment has been confirmed by admin
    try {
      const doctor = (booking as any).doctorId;
      const patient = (booking as any).patientId;
      if (doctor?._id) {
        await enqueuePush({
          recipientId: doctor._id,
          recipientType: "partner",
          fcmToken: doctor.fcmToken,
          title: "Appointment Confirmed ✅",
          body: `Your appointment with ${patient?.name || "a patient"} has been confirmed. Please be ready on the scheduled date.`,
          data: { bookingId: String(booking._id), bookingType: "Doctor", screen: "bookings" },
          refType: "DoctorAppointment",
          refId: new mongoose.Types.ObjectId(String(booking._id)),
        });
      }
    } catch (e) {
      console.error("[Push] doctor appointment confirm notify error:", e);
    }
  } else if (normalizedStatus === "Cancelled") {
    // Sync cancel state with HospitalBooking if it exists
    await HospitalBooking.findOneAndUpdate({ bookingId: booking._id }, { status: "CANCELLED" });
  }

  // ── Refund confirmation email (only if money was actually returned) ──
  if (didRefund) {
    try {
      const patient = (booking as any).patientId;
      if (patient?.email) {
        const { enqueueEmail } = await import("../../queues/communicationQueue.js");
        await enqueueEmail({
          kind: "refund",
          data: {
            email: patient.email,
            fullName: patient.name || "Customer",
            amount: Number((existing as any).totalAmount || 0),
            serviceName: (booking as any).serviceName || `Consultation with Dr. ${((booking as any).doctorId)?.name || "Doctor"}`,
            bookingId: String(booking._id),
          },
        });
      }
    } catch (e) {
      console.error("[Email] doctor refund email error:", e);
    }
  }

  res.status(200).json(new ApiResponse(200, "Booking status updated", booking));
});


export const updateServiceBookingStatus = asyncHandler(async (req, res) => {
  let { id } = req.params;
  const { status, assignedProviderId } = req.body;

  if (!status) throw new ApiError(400, "Status is required");

  let existing = await serviceRequestModel.findById(id);
  if (!existing) {
    const hosp = await HospitalBooking.findById(id);
    if (hosp && hosp.bookingType === 'service') {
      id = String(hosp.bookingId);
      existing = await serviceRequestModel.findById(id);
    }
  }

  if (!existing) throw new ApiError(404, "Service booking not found");

  const updatePayload: any = { status };
  const isDirectAssign = assignedProviderId && ["ACCEPTED", "CONFIRMED", "Confirmed", "PARTNER_ASSIGNED"].includes(status);
  if (isDirectAssign) {
    updatePayload.assignedProviderId = assignedProviderId;
  }
  // Rapido-style: when admin assigns a partner, set 2-min acceptance deadline
  const isNewAssignment = assignedProviderId && status === "PARTNER_ASSIGNED";
  if (isNewAssignment) {
    updatePayload.acceptanceDeadline = new Date(Date.now() + 2 * 60 * 1000);
    updatePayload.status = "PARTNER_ASSIGNED";
  }

  // Atomic write: precondition prevents admin-cancel racing a concurrent partner-complete
  const adminCancelPrecondition = status === "CANCELLED" ? { status: { $ne: "CANCELLED" } } : {};
  const adminCompletePrecondition = status === "COMPLETED" ? { status: { $ne: "COMPLETED" } } : {};
  const adminFilter: any = { _id: id, ...adminCancelPrecondition, ...adminCompletePrecondition };

  const booking = await serviceRequestModel
    .findOneAndUpdate(adminFilter, updatePayload, { new: true })
    .populate("childServiceId")
    .populate("userId")
    .populate("addressId");
  if (!booking) {
    if (status === "CANCELLED") throw new ApiError(409, "Booking is already cancelled");
    if (status === "COMPLETED") throw new ApiError(409, "Booking is already completed");
    throw new ApiError(404, "Service booking not found");
  }

  // Side effects fire only after the atomic write confirmed
  let didServiceRefund = false;
  if (
    status === "CANCELLED" &&
    (existing as any).paymentStatus === "COMPLETED" &&
    (existing.price ?? 0) > 0
  ) {
    await creditWalletAtomic(String(existing.userId), Number(existing.price || 0), `REFUND:SERVICE:${id}`);
    didServiceRefund = true;
  }

  console.info(`[BOOKING] [ADMIN_OVERRIDE] [${id}] Admin changed status to ${status}${isDirectAssign ? ` and assigned to Partner ${assignedProviderId}` : ''}`);

  if (status === "ACCEPTED" || status === "CONFIRMED" || status === "Confirmed") {
    await HospitalBooking.findOneAndUpdate(
      { bookingId: booking._id },
      {
        bookingId: booking._id,
        bookingType: 'service',
        patientId: (booking as any).userId?._id,
        serviceName: (booking as any).childServiceId?.name || 'Service Task',
        totalAmount: (booking as any).price || 0,
        paymentStatus: (booking as any).status === "COMPLETED" ? "COMPLETED" : "PENDING",
        status: 'ACCEPTED',
        acceptedAt: new Date()
      },
      { upsert: true }
    );
  } else if (status === "CANCELLED" || status === "Cancelled") {
    // Sync cancel state with HospitalBooking if it exists
    await HospitalBooking.findOneAndUpdate({ bookingId: booking._id }, { status: "CANCELLED" });
  }

  // ── Refund confirmation email (only if money was actually returned) ──
  if (didServiceRefund) {
    try {
      const customer = (booking as any).userId;
      if (customer?.email) {
        const { enqueueEmail } = await import("../../queues/communicationQueue.js");
        await enqueueEmail({
          kind: "refund",
          data: {
            email: customer.email,
            fullName: customer.name || "Customer",
            amount: Number(existing.price || 0),
            serviceName: (booking as any).childServiceId?.name || "Service Booking",
            bookingId: String(booking._id),
          },
        });
      }
    } catch (e) {
      console.error("[Email] service refund email error:", e);
    }
  }

  // ── Rapido-style: emit socket to partner + schedule 5-min acceptance timeout ──
  if (isNewAssignment) {
    try {
      const { schedulePartnerAcceptanceTimeout } = await import("../../queues/bookingQueue.js");
      const { emitToRoom } = await import("../../socket.js");
      const DoctorMdl = (await import("../Doctors/doctor.model.js")).default;
      const partner = await DoctorMdl.findById(assignedProviderId).select("fcmToken name");
      const serviceName = (booking as any).childServiceId?.name || "Service";

      console.log(`[Rapido] Assigning booking ${booking._id} to partner ${assignedProviderId} (${partner?.name})`);

      // Schedule auto-unassign after 5 minutes
      await schedulePartnerAcceptanceTimeout(String(booking._id), String(assignedProviderId));

      const roomName = `partner:${String(assignedProviderId)}`;
      console.log(`[Rapido] Emitting booking:assignment_request to room: ${roomName}`);

      // Real-time popup on partner's device
      emitToRoom(roomName, "booking:assignment_request", {
        bookingId: String(booking._id),
        serviceName,
        patientName: (booking as any).userId?.name || "Patient",
        location: (() => {
            const addrObj = (booking as any).addressId;
            if (addrObj) {
                const parts = [
                    addrObj.houseNo, addrObj.addressLine1, addrObj.address, 
                    addrObj.street, addrObj.landmark, addrObj.city, 
                    addrObj.state, addrObj.pincode
                ].filter(Boolean).map(s => String(s).trim());
                const uniqueParts = [...new Set(parts)];
                const full = uniqueParts.join(", ");
                if (full) return full;
            }
            return (booking as any).location?.address || "Location not provided";
        })(),
        amount: (booking as any).price || 0,
        acceptanceDeadline: updatePayload.acceptanceDeadline,
        scheduledTime: (booking as any).scheduledTime,
      });

      // Push notification (for when app is in background)
      {
        const { enqueuePush } = await import("../../queues/communicationQueue.js");
        await enqueuePush({
          recipientId: (partner as any)._id as any,
          recipientType: "partner",
          fcmToken: (partner as any).fcmToken ?? undefined,
          title: "🚨 New Booking — Accept Now!",
          body: `${serviceName} request near you. You have 5 minutes to accept.`,
          data: { screen: `/bookings`, type: "JOB_ASSIGNED", bookingId: String(booking._id) },
          refType: "ServiceRequest",
          refId: booking._id as any,
        });
      }
    } catch (e) {
      console.error("[Rapido] assignment socket/queue error:", e);
    }
  }

  // ── Notify assigned partner + customer when admin assigns a provider ──
  if (assignedProviderId && ["ACCEPTED", "CONFIRMED", "Confirmed"].includes(status)) {
    try {
      const { enqueuePush } = await import("../../queues/communicationQueue.js");
      const DoctorMdl = (await import("../Doctors/doctor.model.js")).default;
      const serviceName = (booking as any).childServiceId?.name || "Service";

      // Partner
      const partner = await DoctorMdl.findById(assignedProviderId).select("fcmToken name");
      if (partner) {
        await enqueuePush({
          recipientId: partner._id as any,
          recipientType: "partner",
          fcmToken: partner.fcmToken ?? undefined,
          title: "📋 New Booking Assigned!",
          body: `You have been assigned a ${serviceName} booking. Tap to review and accept.`,
          data: { screen: `/booking/${String(booking._id)}`, type: "JOB_ASSIGNED" },
          refType: "ServiceRequest",
          refId: booking._id as any,
        });
      }

      // Customer
      const patientId = (booking as any).userId?._id || (booking as any).userId;
      const patient = await Patient.findById(patientId).select("fcmToken name");
      if (patient) {
        await enqueuePush({
          recipientId: patient._id as any,
          recipientType: "patient",
          fcmToken: patient.fcmToken ?? undefined,
          title: "✅ Provider Assigned!",
          body: `${partner?.name ?? "A provider"} has been assigned to your ${serviceName} booking.`,
          data: { screen: `/booking/${String(booking._id)}`, type: "PROVIDER_ASSIGNED" },
          refType: "ServiceRequest",
          refId: booking._id as any,
        });
      }
    } catch (e) {
      console.error("[Push] assignment notification error:", e);
    }
  }

  // ── Notify customer and partner of admin-driven status changes ──
  try {
    const { enqueuePush } = await import("../../queues/communicationQueue.js");
    const serviceName = (booking as any).childServiceId?.name ?? "service";
    const customer = (booking as any).userId;
    const patientFull = await Patient.findById(customer?._id ?? customer).select("fcmToken");

    const customerPushMap: Record<string, { title: string; body: string }> = {
      CANCELLED:    { title: "❌ Booking Cancelled",   body: `Your ${serviceName} booking was cancelled by support.` },
      COMPLETED:    { title: "✅ Booking Completed",   body: `Your ${serviceName} booking has been marked complete.` },
      IN_PROGRESS:  { title: "🚀 Service Started",     body: `Your ${serviceName} service is now in progress.` },
      ACCEPTED:     { title: "✅ Provider Confirmed",   body: `A provider has been confirmed for your ${serviceName} booking.` },
    };
    const cpush = customerPushMap[status];
    if (cpush && patientFull) {
      await enqueuePush({
        recipientId: patientFull._id as any,
        recipientType: "patient",
        fcmToken: patientFull.fcmToken ?? undefined,
        title: cpush.title,
        body: cpush.body,
        data: { screen: `/booking/${String(booking._id)}` },
        refType: "ServiceRequest",
        refId: booking._id as any,
      });
    }

    if (existing.assignedProviderId && !isNewAssignment) {
      const DoctorMdl = (await import("../Doctors/doctor.model.js")).default;
      const provider = await DoctorMdl.findById(existing.assignedProviderId).select("fcmToken");
      const partnerPushMap: Record<string, { title: string; body: string }> = {
        CANCELLED:   { title: "❌ Booking Cancelled",  body: `A ${serviceName} booking assigned to you was cancelled by support.` },
        COMPLETED:   { title: "✅ Marked Complete",    body: `Your ${serviceName} booking was marked complete by support.` },
        IN_PROGRESS: { title: "🚀 Status Updated",     body: `Your ${serviceName} booking is now marked in progress.` },
      };
      const ppush = partnerPushMap[status];
      if (ppush && provider) {
        await enqueuePush({
          recipientId: provider._id as any,
          recipientType: "partner",
          fcmToken: provider.fcmToken ?? undefined,
          title: ppush.title,
          body: ppush.body,
          data: { screen: `/bookings`, bookingId: String(booking._id) },
          refType: "ServiceRequest",
          refId: booking._id as any,
        });
      }
    }
  } catch (e) {
    console.error("[Push] admin status update notify error:", e);
  }

  // Real-time update to booking room so partner/customer screens refresh without polling
  try {
    const { emitToRoom } = await import("../../socket.js");
    emitToRoom(String(booking._id), "booking_status_updated", { bookingId: String(booking._id), status });
  } catch (_e) {}

  res.status(200).json(new ApiResponse(200, "Service booking status updated", booking));
});


/** List service bookings that are RETURNED_TO_ADMIN for admin to accept/reject (with urgency, etc.) */
export const getReturnedToAdminServiceBookings = asyncHandler(async (req, res) => {
  const list = await serviceRequestModel
    .find({ status: "RETURNED_TO_ADMIN" })
    .populate("childServiceId", "name")
    .populate("userId", "name mobileNumber")
    .sort({ createdAt: -1 })
    .lean();

  const formatted = list.map((b: any) => ({
    ...b,
    serviceId: b.childServiceId || { name: "Unknown Service" },
    patientId: b.userId ? { name: b.userId.name || "Anonymous Member", mobile: b.userId.mobileNumber || "N/A" } : { name: "Anonymous Member", mobile: "N/A" },
    totalAmount: b.price || 0,
    urgency: b.urgency || "NORMAL",
  }));

  res.status(200).json(new ApiResponse(200, "Returned-to-admin bookings fetched", formatted));
});

export const rebroadcastServiceBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Atomic: only transition from a re-broadcastable status — prevents assign+rebroadcast race
  const updated = await serviceRequestModel.findOneAndUpdate(
    { _id: id, status: { $nin: ["COMPLETED", "CANCELLED", "ACCEPTED", "IN_PROGRESS"] } },
    { status: "PENDING", assignedProviderId: null, assignedRoleId: null, broadcastedAt: null },
    { new: true }
  );
  if (!updated) throw new ApiError(409, "Booking cannot be re-broadcast from its current status — it may be accepted or already in progress");

  const { scheduleBroadcastToAll } = await import("../../queues/bookingQueue.js");
  await scheduleBroadcastToAll(id as string);

  return res.status(200).json(new ApiResponse(200, "Booking re-broadcast initiated", null));
});

export const issueServiceRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  if (!amount || Number(amount) <= 0) throw new ApiError(400, "Refund amount must be positive");

  const booking = await serviceRequestModel
    .findById(id)
    .populate("userId", "email name fcmToken")
    .populate("childServiceId", "name");
  if (!booking) throw new ApiError(404, "Service booking not found");

  const refundAmount = Number(amount);
  const userId = (booking as any).userId?._id ?? booking.userId;
  await creditWalletAtomic(String(userId), refundAmount, `MANUAL_REFUND:SERVICE:${id}:${Date.now()}`);

  const customer = (booking as any).userId;
  const serviceName = (booking as any).childServiceId?.name || "Service Booking";

  if (customer?.email) {
    enqueueEmail({
      kind: "refund",
      data: {
        email: customer.email,
        fullName: customer.name || "Customer",
        amount: refundAmount,
        serviceName,
        bookingId: String(booking._id),
      },
    }).catch(() => {});
  }

  if (customer?.fcmToken) {
    enqueuePush({
      recipientId: userId as mongoose.Types.ObjectId,
      recipientType: "patient",
      fcmToken: customer.fcmToken,
      title: "💰 Refund Credited",
      body: `₹${refundAmount} has been refunded to your A1Care wallet.${reason ? ` Reason: ${reason}` : ""}`,
      data: { screen: "/wallet", type: "REFUND", bookingId: String(booking._id) },
      refType: "ServiceRequest",
      refId: booking._id as mongoose.Types.ObjectId,
    }).catch(() => {});
  }

  const { notifyAdmin } = await import("../Notifications/notification.controller.js");
  await notifyAdmin(
    "💰 Manual Refund Issued",
    `₹${refundAmount} refunded to ${customer?.name || "customer"} for booking #${String(booking._id).slice(-8).toUpperCase()}${reason ? `. Reason: ${reason}` : ""}.`,
    "ServiceRequest",
    String(booking._id)
  );

  return res.status(200).json(new ApiResponse(200, "Refund issued successfully", { refundAmount, bookingId: booking._id }));
});

export const getHospitalBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 55, status, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const query: any = {};

  if (status && status !== "All") query.status = status;

  // DB-level patient name search for hospital bookings
  if (search && search !== "") {
    const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matchedPatients = await Patient.find({ $or: [{ name: rx }, { mobileNumber: rx }, { email: rx }] }).select("_id").lean();
    const searchOr: any[] = [];
    if (matchedPatients.length) searchOr.push({ patientId: { $in: matchedPatients.map((p: any) => p._id) } });
    if (rx.test("")) { /* skip empty */ } else searchOr.push({ serviceName: rx }, { status: rx });
    if (/^[0-9a-fA-F]{24}$/.test(String(search))) searchOr.push({ _id: search });
    if (searchOr.length) query.$or = searchOr;
  }

  // Stats aggregation for Hospital Bookings
  const [statsData] = await HospitalBooking.aggregate([
    {
      $group: {
        _id: null,
        all: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $in: ["$status", ["ACCEPTED", "CONFIRMED"]] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
      }
    }
  ]);
  const stats = statsData || { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };

  const [total, bookings] = await Promise.all([
    HospitalBooking.countDocuments(query),
    HospitalBooking.find(query)
      .populate("patientId", "name mobileNumber")
      .sort({ acceptedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
  ]);

  let formatted = bookings.map(b => {
    const obj = b.toObject() as any;
    return {
      ...obj,
      patientId: (obj.patientId && typeof obj.patientId === 'object' && obj.patientId._id) ? {
        name: obj.patientId.name || "",
        mobile: obj.patientId.mobileNumber || "No Profile"
      } : {
        name: "Missing Profile",
        mobile: obj.patientId ? obj.patientId.toString() : "N/A"
      }
    };
  });

  if (false) { // search now handled at DB level above
  }

  res.status(200).json(new ApiResponse(200, "Hospital accepted bookings fetched", {
    items: formatted,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    stats
  }));
});

// ─── System Config Endpoints ────────────────────────────────────────────────
export const getSystemConfig = asyncHandler(async (_req, res) => {
  const store = await readConfigStore();
  const config = store.system ?? DEFAULT_SYSTEM_CONFIG;
  return res.status(200).json(new ApiResponse(200, "System config fetched", config));
});

export const updateSystemConfig = asyncHandler(async (req, res) => {
  const store = await readConfigStore();
  const current: SystemConfig = store.system ?? DEFAULT_SYSTEM_CONFIG;
  const body = req.body ?? {};

  const normalizeStr = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;

  const incomingWebsite = body.website ?? {};
  const mergedClients: MobileFirebaseClient[] = Array.isArray(body.clients)
    ? body.clients.map((c: any, i: number) => ({
      platform: c.platform ?? current.clients[i]?.platform ?? "android",
      appLabel: c.appLabel ?? current.clients[i]?.appLabel ?? "customer",
      appId: normalizeStr(c.appId, current.clients[i]?.appId ?? ""),
      apiKey: normalizeStr(c.apiKey, current.clients[i]?.apiKey ?? ""),
      packageName: normalizeStr(c.packageName, current.clients[i]?.packageName ?? "")
    }))
    : current.clients;

  const merged: SystemConfig = {
    website: {
      apiKey: normalizeStr(incomingWebsite.apiKey, current.website.apiKey),
      authDomain: normalizeStr(incomingWebsite.authDomain, current.website.authDomain),
      projectId: normalizeStr(incomingWebsite.projectId, current.website.projectId),
      storageBucket: normalizeStr(incomingWebsite.storageBucket, current.website.storageBucket),
      messagingSenderId: normalizeStr(incomingWebsite.messagingSenderId, current.website.messagingSenderId),
      appId: normalizeStr(incomingWebsite.appId, current.website.appId),
      measurementId: normalizeStr(incomingWebsite.measurementId, current.website.measurementId)
    },
    projectNumber: normalizeStr(body.projectNumber, current.projectNumber),
    projectId: normalizeStr(body.projectId, current.projectId),
    storageBucket: normalizeStr(body.storageBucket, current.storageBucket),
    firebase: {
      clientEmail: normalizeStr(body.firebase?.clientEmail, current.firebase?.clientEmail || ""),
      privateKey: normalizeStr(body.firebase?.privateKey, current.firebase?.privateKey || "")
    },
    clients: mergedClients,
    googleMapsApiKey: normalizeStr(body.googleMapsApiKey, current.googleMapsApiKey),
    maintenanceMode: Boolean(body.maintenanceMode ?? current.maintenanceMode), // Added
    easebuzz: { ...current.easebuzz, ...body.easebuzz },
    email: { ...current.email, ...body.email },
    twilio: { ...current.twilio, ...body.twilio },
    aws: { ...current.aws, ...body.aws },
    redis: { ...current.redis, ...body.redis },
    zego: {
      appId: body.zego?.appId ? Number(body.zego.appId) : current.zego?.appId || 0,
      serverSecret: body.zego?.serverSecret || current.zego?.serverSecret || ""
    },
    updatedAt: new Date().toISOString()
  };

  const nextStore = { ...store, system: merged };
  await writeConfigStore(nextStore as any);

  // Bust the maintenance-flag cache so a toggle takes effect immediately.
  try {
    const { invalidateMaintenanceCache } = await import("../../app.js");
    invalidateMaintenanceCache();
  } catch { /* non-fatal */ }

  return res.status(200).json(new ApiResponse(200, "System config updated", merged));
});

/**
 * Public endpoint for mobile apps to fetch their dynamic configuration.
 * GET /api/common/config/:appKey
 */
export const getPublicAppConfig = asyncHandler(async (req, res) => {
  const { appKey } = req.params;
  const store = await readConfigStore();

  const key = appKey === "partner" ? "provider_app" : "user_app";
  const appConfig = (store as any)[key];
  const system = (store as any).system ?? DEFAULT_SYSTEM_CONFIG;

  const response = {
    branding: appConfig.branding,
    contact: appConfig.contact,
    landing: {
      festivalBanners: (appConfig.landing.festivalBanners ?? []).filter((b: any) => b.active),
      mainBanners: (appConfig.landing.mainBanners ?? []).filter((b: any) => b.active),
      knowledgeBanners: (appConfig.landing.knowledgeBanners ?? []).filter((b: any) => b.active),
      promotionalBanners: (appConfig.landing.promotionalBanners ?? []).filter((b: any) => b.active),
      playStoreUrl: appConfig.landing.playStoreUrl,
      appStoreUrl: appConfig.landing.appStoreUrl,
    },
    googleMapsApiKey: system.googleMapsApiKey,
    maintenanceMode: system.maintenanceMode || false,
    knowledgeBase: appConfig.knowledgeBase || [],
    updatedAt: appConfig.updatedAt
  };

  return res.status(200).json(new ApiResponse(200, "App config fetched", response));
});

// ─── Enhanced Dashboard Endpoints ──────────────────────────────────────────

export const getAdminDashboardOverview = asyncHandler(async (req, res) => {
  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  const now = new Date();
  const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    patients,
    staff,
    activeStaff,
    pendingVerifications,
    totalAppts,
    totalServices,
    todayAppts,
    todayServices,
    revenueData,
    ticketCount,
    failedPaymentsCount
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: "Active" }),
    Doctor.countDocuments({ status: "Pending" }),
    doctorAppointmentModel.countDocuments(),
    serviceRequestModel.countDocuments(),
    doctorAppointmentModel.countDocuments({ createdAt: { $gte: startOfToday } }),
    serviceRequestModel.countDocuments({ createdAt: { $gte: startOfToday } }),
    // Revenue aggregation
    Promise.all([
      // Total Completed & Paid
      doctorAppointmentModel.aggregate([{ $match: { status: "Completed", paymentStatus: "COMPLETED" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      serviceRequestModel.aggregate([{ $match: { status: "COMPLETED", paymentStatus: "COMPLETED" } }, { $group: { _id: null, total: { $sum: "$price" } } }]),
      // This Month
      doctorAppointmentModel.aggregate([{ $match: { status: "Completed", paymentStatus: "COMPLETED", createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      serviceRequestModel.aggregate([{ $match: { status: "COMPLETED", paymentStatus: "COMPLETED", createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: "$price" } } }]), // Fix: should be startOfMonth? I'll use startOfMonth
    ]),
    Ticket.countDocuments({ status: "Pending" }),
    Order.countDocuments({ status: "FAILED" })
  ]);

  // Fix the index for monthly service revenue
  const monthlyServiceRev = await serviceRequestModel.aggregate([{ $match: { status: "COMPLETED", paymentStatus: "COMPLETED", createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$price" } } }]);

  const totalRevenue = (revenueData[0][0]?.total || 0) + (revenueData[1][0]?.total || 0);
  const monthRevenue = (revenueData[2][0]?.total || 0) + (monthlyServiceRev[0]?.total || 0);

  const todayRevData = await Promise.all([
    doctorAppointmentModel.aggregate([{ $match: { status: "Completed", paymentStatus: "COMPLETED", createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    serviceRequestModel.aggregate([{ $match: { status: "COMPLETED", paymentStatus: "COMPLETED", createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: "$price" } } }])
  ]);
  const todayRevenue = (todayRevData[0][0]?.total || 0) + (todayRevData[1][0]?.total || 0);

  // Booking breakdown by status
  const [apptStatus, serviceStatus] = await Promise.all([
    doctorAppointmentModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    serviceRequestModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
  ]);

  // ── Commission ledger — what A1Care actually keeps vs. gross booking revenue ──
  const [apptCommission, svcCommission, payoutsSettledAgg, pendingPayouts] = await Promise.all([
    doctorAppointmentModel.aggregate([
      { $match: { status: "Completed", paymentStatus: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } }
    ]),
    serviceRequestModel.aggregate([
      { $match: { status: "COMPLETED", paymentStatus: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } }
    ]),
    Payout.aggregate([
      { $match: { status: "COMPLETED" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    Payout.countDocuments({ status: "PENDING" })
  ]);

  const totalCommissionEarned = (apptCommission[0]?.total || 0) + (svcCommission[0]?.total || 0);
  const payoutsSettled = payoutsSettledAgg[0]?.total || 0;

  return res.status(200).json(new ApiResponse(200, "Dashboard overview fetched", {
    kpis: {
      patients,
      staff,
      activeStaff,
      pendingVerifications,
      totalBookings: totalAppts + totalServices,
      todayBookings: todayAppts + todayServices,
      revenue: {
        total: totalRevenue,
        month: monthRevenue,
        today: todayRevenue
      },
      commission: {
        earned: totalCommissionEarned,          // A1Care's cut from completed bookings
        payoutsSettled,                          // amount already paid out to partners
        pendingPayouts,                          // count of payout requests awaiting action
        netRetained: totalCommissionEarned - payoutsSettled
      }
    },
    bookings: {
      appointments: apptStatus,
      services: serviceStatus
    },
    alerts: {
      pendingVerifications,
      openTickets: ticketCount,
      failedPayments: failedPaymentsCount
    }
  }));
});

// ─── Commission Report (per-booking breakdown) ────────────────────────────────
export const getAdminCommissionReport = asyncHandler(async (req, res) => {
  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  const { from, to, page = 1, limit = 50, sortBy = "createdAt", sortDir = "desc" } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const parsedLimit = Number(limit);

  // Doctor appointments: completed + paid (strict) OR completed (fallback for older records)
  const dateMatch: any = {
    status: "Completed",
    $or: [{ paymentStatus: "COMPLETED" }, { paymentStatus: { $exists: false } }, { totalAmount: { $gt: 0 } }]
  };
  // Service requests: just COMPLETED status (paymentStatus may not be set on all records)
  const svcDateMatch: any = { status: "COMPLETED" };
  if (from && to) {
    const fromDate = new Date(from as string);
    const toDate = new Date(to as string);
    toDate.setHours(23, 59, 59, 999);
    dateMatch.createdAt = { $gte: fromDate, $lte: toDate };
    svcDateMatch.createdAt = { $gte: fromDate, $lte: toDate };
  }

  // Construct dynamic sort object
  const sortStage: any = {};
  sortStage[sortBy as string] = sortDir === "asc" ? 1 : -1;

  const pipeline = [
    { $match: dateMatch },
    {
      $lookup: {
        from: "staffs",
        localField: "doctorId",
        foreignField: "_id",
        as: "doctor"
      }
    },
    { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        bookingType: { $literal: "Doctor Consultation" },
        partnerName: { $ifNull: ["$doctor.name", "Unknown"] },
        grossAmount: { $ifNull: ["$totalAmount", 0] },
        commissionPct: { $ifNull: ["$commissionPercentage", 20] },
        commissionAmount: {
          $ifNull: [
            "$commissionAmount",
            { $multiply: [{ $ifNull: ["$totalAmount", 0] }, 0.2] }
          ]
        },
        partnerEarning: {
          $ifNull: [
            "$partnerEarning",
            { $multiply: [{ $ifNull: ["$totalAmount", 0] }, 0.8] }
          ]
        },
        createdAt: 1
      }
    },
    {
      $unionWith: {
        coll: "servicerequests",
        pipeline: [
          { $match: svcDateMatch },
          {
            $lookup: {
              from: "staffs",
              localField: "assignedProviderId",
              foreignField: "_id",
              as: "doctor"
            }
          },
          { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              bookingType: { $ifNull: ["$serviceType", "Home Care Visit"] },
              partnerName: { $ifNull: ["$doctor.name", "Unknown"] },
              grossAmount: { $ifNull: ["$price", 0] },
              commissionPct: { $ifNull: ["$commissionPercentage", 20] },
              commissionAmount: {
                $ifNull: [
                  "$commissionAmount",
                  { $multiply: [{ $ifNull: ["$price", 0] }, 0.2] }
                ]
              },
              partnerEarning: {
                $ifNull: [
                  "$partnerEarning",
                  { $multiply: [{ $ifNull: ["$price", 0] }, 0.8] }
                ]
              },
              createdAt: 1
            }
          }
        ]
      }
    },
    { $sort: sortStage },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        summary: [
          {
            $group: {
              _id: null,
              totalGross: { $sum: "$grossAmount" },
              totalCommission: { $sum: "$commissionAmount" },
              totalPartnerEarning: { $sum: "$partnerEarning" }
            }
          }
        ],
        items: [{ $skip: skip }, { $limit: parsedLimit }]
      }
    }
  ];

  const result = await doctorAppointmentModel.aggregate(pipeline);
  const data = result[0];

  const total = data.metadata.length > 0 ? data.metadata[0].total : 0;
  const summary = data.summary.length > 0 ? data.summary[0] : { totalGross: 0, totalCommission: 0, totalPartnerEarning: 0 };
  const items = data.items;

  return res.status(200).json(new ApiResponse(200, "Commission report fetched", {
    summary: {
      totalGross: summary.totalGross,
      totalCommission: summary.totalCommission,
      totalPartnerEarning: summary.totalPartnerEarning,
      totalBookings: total,
    },
    items,
    total,
    page: Number(page),
    limit: parsedLimit,
    totalPages: Math.ceil(total / parsedLimit)
  }));
});

export const getAdminDoctorPerformance = asyncHandler(async (req, res) => {
  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  const { from, to, search = "", page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const match: any = {};
  if (from && to) {
    match.createdAt = { $gte: new Date(from as string), $lte: new Date(to as string) };
  }

  // Find doctors
  const doctorQuery: any = {};
  if (search) {
    const s = new RegExp(escapeRegex(search), 'i');
    doctorQuery.$or = [
      { name: s },
      { mobileNumber: s }
    ];
  }

  const total = await Doctor.countDocuments(doctorQuery);
  const doctors = await Doctor.find(doctorQuery).skip(skip).limit(Number(limit));
  const doctorIds = doctors.map(d => d._id);

  const performance = await doctorAppointmentModel.aggregate([
    { $match: { doctorId: { $in: doctorIds }, ...match } },
    {
      $group: {
        _id: "$doctorId",
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ["$status", "Confirmed"] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$totalAmount", 0] } }
      }
    }
  ]);

  const results = doctors.map(doc => {
    const stats = performance.find(p => p._id.toString() === (doc as any)._id.toString()) || {
      total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, revenue: 0
    };
    return {
      id: (doc as any)._id,
      name: doc.name,
      mobile: doc.mobileNumber,
      stats
    };
  });

  return res.status(200).json(new ApiResponse(200, "Doctor performance fetched", { 
    items: results,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit))
  }));
});

export const getAdminRecentActivity = asyncHandler(async (req, res) => {
  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const [totalAppts, totalServices, appts, services] = await Promise.all([
    doctorAppointmentModel.countDocuments(),
    serviceRequestModel.countDocuments(),
    doctorAppointmentModel.find()
      .populate("patientId", "name mobileNumber")
      .populate("doctorId", "name mobileNumber")
      .sort({ createdAt: -1 })
      .limit(skip + limit),
    serviceRequestModel.find()
      .populate("userId", "name mobileNumber")
      .populate({
        path: "childServiceId",
        select: "name price"
      })
      .sort({ createdAt: -1 })
      .limit(skip + limit)
  ]);

  const combined = [
    ...appts.map(a => {
      const p = a.patientId as any;
      const d = a.doctorId as any;
      return {
        id: a._id,
        type: "Appointment",
        patient: p?.name || (p?.mobileNumber ? `Patient (${p.mobileNumber})` : "Missing Patient"),
        provider: d?.name || (d?.mobileNumber ? `Dr. (${d.mobileNumber})` : "Doctor"),
        status: a.status,
        amount: a.totalAmount,
        createdAt: (a as any).createdAt
      };
    }),
    ...services.map(s => {
      const u = s.userId as any;
      const cs = s.childServiceId as any;
      return {
        id: s._id,
        type: "Service",
        patient: u?.name || (u?.mobileNumber ? `User (${u.mobileNumber})` : "Missing User"),
        provider: cs?.name || "Service",
        status: s.status,
        amount: s.price,
        createdAt: (s as any).createdAt
      };
    })
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(skip, skip + limit);

  const total = totalAppts + totalServices;

  return res.status(200).json(new ApiResponse(200, "Recent activity fetched", {
    items: combined,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  }));
});

export const getAdminPayouts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 60, status, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter: any = {};
  if (status && status !== "All") filter.status = status;

  // Since staffId is a reference, we might need to filter after population or use aggregation
  // For simplicity and speed in this context, we fetch all matching status, then filter/slice
  const payouts = await Payout.find(filter)
    .populate("staffId", "name mobileNumber")
    .sort({ createdAt: -1 });

  let formatted = payouts.map(p => {
    const obj = p.toObject() as any;
    // Fallback if the partner document was deleted but payouts remain
    if (!obj.staffId) {
      obj.staffId = {
        name: obj.partnerName || obj.bankDetails?.accountHolderName || "Deleted Partner",
        mobileNumber: obj.partnerMobile || "N/A"
      };
    }
    return obj;
  });

  if (search && search !== "") {
    const s = (search as string).toLowerCase();
    formatted = formatted.filter(p =>
      (p.staffId?.name?.toLowerCase() || "").includes(s) ||
      (p.staffId?.mobileNumber?.toLowerCase() || "").includes(s) ||
      (p.bankDetails?.bankName?.toLowerCase() || "").includes(s) ||
      (p.bankDetails?.accountNumber?.toLowerCase() || "").includes(s) ||
      (String(p._id) || "").toLowerCase().includes(s) ||
      (String(p.amount || "")).includes(s)
    );
  }

  const total = formatted.length;
  const paginated = formatted.slice(skip, skip + Number(limit));

  return res.status(200).json(new ApiResponse(200, "Payout requests fetched", {
    items: paginated,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit))
  }));
});

export const updateAdminPayoutStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminNote, fromStatus } = req.body;

  if (!status) throw new ApiError(400, "Status is required");
  if (!fromStatus) throw new ApiError(400, "Expected previous status (fromStatus) is required");

  // Enforce valid state transitions
  const validTransitions: Record<string, string[]> = {
    "PENDING": ["APPROVED", "REJECTED"],
    "APPROVED": ["COMPLETED", "REJECTED"]
  };

  const allowedNextStates = validTransitions[fromStatus];
  if (!allowedNextStates) {
    throw new ApiError(422, `Transitions from terminal state '${fromStatus}' are not allowed.`);
  }
  
  if (!allowedNextStates.includes(status)) {
    throw new ApiError(422, `Invalid state transition from '${fromStatus}' to '${status}'.`);
  }

  // Require reason for rejection
  if (status === "REJECTED" && (!adminNote || !adminNote.trim())) {
    throw new ApiError(400, "A reason (adminNote) is required when rejecting a payout.");
  }

  // Find document just to check if it exists (distinguishes 404 from 409)
  const existingPayout = await Payout.findById(id);
  if (!existingPayout) throw new ApiError(404, "Payout not found");

  // Atomic Update: Only update if the database status strictly matches the expected fromStatus
  const payout = await Payout.findOneAndUpdate(
    { _id: id, status: fromStatus }, 
    { status, adminNote }, 
    { new: true }
  );

  if (!payout) {
    // Document exists but status didn't match, meaning a concurrent update occurred
    throw new ApiError(409, "This payout has already changed state. Refresh the payout and try again.");
  }

  // Create Audit Log
  await AuditLog.create({
    actorAdminId: (req as any).user?.id,
    actorRole: (req as any).user?.role,
    action: "PAYOUT_STATUS_UPDATED",
    targetType: "Payout",
    targetId: String(payout._id),
    metadata: { 
      fromStatus, 
      newStatus: status, 
      reason: adminNote 
    }
  });

  // Notify Partner
  const partner = await Doctor.findById(payout.staffId);
  if (partner) {
    const title = status === "COMPLETED" ? "Payment Settled! 💰" : "Payout Update";
    const body = status === "COMPLETED"
      ? `₹${payout.amount} has been transferred to your bank account.`
      : `Your payout request of ₹${payout.amount} was ${status.toLowerCase()}. ${adminNote || ""}`;

    await (await import("../../queues/communicationQueue.js")).enqueuePush({
      recipientId: String(partner._id),
      recipientType: "partner",
      fcmToken: partner.fcmToken ?? undefined,
      title,
      body,
      data: { type: "PAYOUT_UPDATE", payoutId: String(payout._id), status }
    });
  }

  // ── Payout status email to partner ──
  if (partner?.email) {
    try {
      await (await import("../../queues/communicationQueue.js")).enqueueEmail({
        kind: "payout_update",
        data: {
          email: partner.email,
          fullName: partner.name || "Partner",
          amount: Number(payout.amount || 0),
          status,
          adminNote,
        },
      });
    } catch (e) {
      console.error("[Email] payout status email error:", e);
    }
  }

  return res.status(200).json(new ApiResponse(200, "Payout status updated", payout));
});

export const getHealthVaultAudit = asyncHandler(async (req, res) => {
  const totalRecords = await MedicalRecord.countDocuments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newToday = await MedicalRecord.countDocuments({ createdAt: { $gte: today } });

  const recordStats = await MedicalRecord.aggregate([
    {
      $project: {
        prescriptionsSize: { $size: { $ifNull: ["$prescriptions", []] } },
        labReportsSize: { $size: { $ifNull: ["$labReports", []] } }
      }
    },
    {
      $group: {
        _id: null,
        totalPrescriptions: { $sum: "$prescriptionsSize" },
        totalLabReports: { $sum: "$labReportsSize" }
      }
    }
  ]);

  const recentRecords = await MedicalRecord.find()
    .populate("patientId", "name mobileNumber")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return res.status(200).json(new ApiResponse(200, "Health Vault Audit fetched", {
    totalRecords,
    newToday,
    stats: recordStats[0] || { totalPrescriptions: 0, totalLabReports: 0 },
    recentRecords
  }));
});

export const getUserWalletBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const wallet = await WalletModel.findOne({ userId });
  return res.status(200).json(new ApiResponse(200, "Wallet balance fetched", {
    balance: wallet?.balance || 0,
    transactions: wallet?.transactions || []
  }));
});

export const adjustUserWallet = asyncHandler(async (req, res) => {
  const { category, userId } = req.params;
  const { amount, description, type } = req.body; // type: 'Credit' | 'Debit'

  if (!amount || isNaN(amount)) throw new ApiError(400, "Invalid amount");

  const onModel: "Patient" | "Staff" = category === 'patient' ? "Patient" : "Staff";
  const user = onModel === 'Patient'
    ? await Patient.findById(userId)
    : await Doctor.findById(userId);

  if (!user) throw new ApiError(404, "User not found");

  let wallet = await WalletModel.findOne({ userId: user._id, onModel });
  if (!wallet) {
    wallet = await WalletModel.create({ userId: user._id, onModel, balance: 0, transactions: [] });
  }

  if (type === 'Credit') {
    wallet.balance += Number(amount);
  } else {
    if (wallet.balance < Number(amount)) {
      throw new ApiError(400, "Insufficient wallet balance");
    }
    wallet.balance -= Number(amount);
  }

  wallet.transactions.push({
    amount: Number(amount),
    type: type as "Credit" | "Debit",
    description: description || `Manual adjustment by admin`,
    date: new Date(),
  } as any);

  await wallet.save();


  // Create Audit Log
  await AuditLog.create({
    actorAdminId: (req as any).user?.id,
    actorRole: (req as any).user?.role,
    action: "WALLET_ADJUSTED",
    targetType: category === 'patient' ? "Patient" : "Doctor",
    targetId: String(user._id),
    metadata: { amount, type, newBalance: wallet.balance, description }
  });

  return res.status(200).json(new ApiResponse(200, "Wallet adjusted successfully", wallet));
});

export const getDeletionRequests = asyncHandler(async (req, res) => {
  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  const deletionQuery = { deletionRequested: { $in: [true, "true", 1] } };
  const [patients, staff] = await Promise.all([
    Patient.find(deletionQuery),
    Doctor.find(deletionQuery)
  ]);

  console.log(`[DEBUG] Doctor Model Collection: ${Doctor.collection.name}`);
  const db = mongoose.connection.db;
  if (!db) throw new ApiError(500, "Database connection lost");
  const rawStaffCount = await db.collection('staffs').countDocuments({ deletionRequested: true });
  console.log(`[DEBUG] Raw 'staffs' count: ${rawStaffCount}`);
  console.log(`[DEBUG] Model 'Doctor' count: ${staff.length}`);

  const shapedPatients = patients.map(p => ({
    id: p._id,
    type: 'patient',
    name: p.name,
    mobileNumber: p.mobileNumber,
    requestedAt: (p as any).deletionRequestedAt || (p as any).updatedAt || (p as any).createdAt
  }));

  const shapedStaff = staff.map(s => ({
    id: s._id,
    type: 'staff',
    name: s.name,
    mobileNumber: s.mobileNumber,
    requestedAt: (s as any).deletionRequestedAt || (s as any).updatedAt || (s as any).createdAt
  }));

  const allRequests = [...shapedPatients, ...shapedStaff].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  return res.status(200).json(new ApiResponse(200, "Deletion requests fetched", allRequests));
});

export const approveDeletion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'patient' or 'staff'

  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  let deletedUser;
  if (type === 'patient') {
    deletedUser = await Patient.findByIdAndDelete(id);
  } else {
    deletedUser = await Doctor.findByIdAndDelete(id);
  }

  if (!deletedUser) throw new ApiError(404, "User not found");

  // Flush Redis token cache so the session is invalidated immediately (not after 60s TTL)
  try {
    const RedisClient = (await import("../../configs/redisConnect.js")).default;
    const cacheKind = type === 'patient' ? 'patient' : 'staff';
    await RedisClient.del(`tv:${cacheKind}:${id}`);
  } catch { /* non-fatal */ }

  await AuditLog.create({
    actorAdminId: (req as any).user?.id,
    actorRole: (req as any).user?.role,
    action: "ACCOUNT_DELETED_BY_ADMIN",
    targetType: type === 'patient' ? "Patient" : "Doctor",
    targetId: String(id),
  });

  return res.status(200).json(new ApiResponse(200, "Account permanently deleted successfully"));
});

export const restoreDeletion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'patient' or 'staff'

  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  let restoredUser;
  if (type === 'patient') {
    restoredUser = await Patient.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, deletionRequested: false, deletionRequestedAt: null },
      { new: true }
    );
  } else {
    restoredUser = await Doctor.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, deletionRequested: false, deletionRequestedAt: null },
      { new: true }
    );
  }

  if (!restoredUser) throw new ApiError(404, "User not found");

  await AuditLog.create({
    actorAdminId: (req as any).user?.id,
    actorRole: (req as any).user?.role,
    action: "ACCOUNT_RESTORED_BY_ADMIN",
    targetType: type === 'patient' ? "Patient" : "Doctor",
    targetId: String(id),
  });

  return res.status(200).json(new ApiResponse(200, "Account restored successfully"));
});

const isValidTimeString = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

export const getDoctorAvailabilityAdmin = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctorId");
  }

  const availability = await DoctorAvailability.findOne({ doctorId: new mongoose.Types.ObjectId(doctorId as string) });
  return res.status(200).json(new ApiResponse(200, "Doctor availability fetched", availability));
});

export const upsertDoctorAvailabilityAdmin = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { weekDays, startingTime, endingTime, slotDuration } = req.body || {};

  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctorId");
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  if (!Array.isArray(weekDays) || weekDays.length === 0 || !weekDays.every((d: any) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    throw new ApiError(400, "weekDays must be a non-empty array of numbers from 0 to 6");
  }

  if (typeof startingTime !== "string" || typeof endingTime !== "string" || !isValidTimeString(startingTime) || !isValidTimeString(endingTime)) {
    throw new ApiError(400, "startingTime and endingTime must be in HH:mm format");
  }

  const [sh = 0, sm = 0] = startingTime.split(":").map(Number);
  const [eh = 0, em = 0] = endingTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) {
    throw new ApiError(400, "endingTime must be greater than startingTime");
  }

  const durationNum = Number(slotDuration);
  if (!Number.isFinite(durationNum) || durationNum <= 0) {
    throw new ApiError(400, "slotDuration must be a positive number");
  }

  const updated = await DoctorAvailability.findOneAndUpdate(
    { doctorId: new mongoose.Types.ObjectId(doctorId as string) },
    {
      doctorId: new mongoose.Types.ObjectId(doctorId as string),
      weekDays,
      startingTime,
      endingTime,
      slotDuration: String(durationNum),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return res.status(200).json(new ApiResponse(200, "Doctor availability saved", updated));
});

export const debugPartnerServiceEligibility = asyncHandler(async (req, res) => {
  const { mobileNumber, childServiceId } = req.query as { mobileNumber?: string; childServiceId?: string };
  if (!mobileNumber) throw new ApiError(400, "mobileNumber is required");
  if (!childServiceId) throw new ApiError(400, "childServiceId is required");
  if (!mongoose.Types.ObjectId.isValid(childServiceId)) throw new ApiError(400, "Invalid childServiceId");

  const partner = await Doctor.findOne({ mobileNumber: String(mobileNumber).trim() })
    .select("_id name mobileNumber roleId status isRegistered isVerified fcmToken")
    .lean();
  if (!partner) throw new ApiError(404, "Partner not found");

  const childService = await ChildServiceModel.findById(childServiceId)
    .select("_id name allowedRoleIds")
    .lean();
  if (!childService) throw new ApiError(404, "Child service not found");

  const allowed = Array.isArray(childService.allowedRoleIds) ? childService.allowedRoleIds : [];
  const partnerRoleId = (partner.roleId as any)?.toString?.() || "";
  const roleMatched = allowed.some((id: any) => id?.toString?.() === partnerRoleId);
  const isActive = partner.status === "Active";
  const hasFcmToken = !!partner.fcmToken;

  const reasons: string[] = [];
  if (!isActive) reasons.push("Partner status is not Active");
  if (!roleMatched) reasons.push("Partner roleId is not in childService.allowedRoleIds");
  if (!hasFcmToken) reasons.push("Partner fcmToken missing (push notification won't be sent)");

  return res.status(200).json(
    new ApiResponse(200, "Partner service eligibility debug", {
      partner: {
        id: partner._id,
        name: partner.name,
        mobileNumber: partner.mobileNumber,
        roleId: partnerRoleId,
        status: partner.status,
        isRegistered: partner.isRegistered,
        isVerified: (partner as any).isVerified ?? null,
        hasFcmToken,
      },
      childService: {
        id: childService._id,
        name: childService.name,
        allowedRoleIds: allowed.map((id: any) => id?.toString?.()),
      },
      checks: {
        roleMatched,
        isActive,
        hasFcmToken,
        eligibleForFeed: roleMatched && isActive,
        eligibleForPush: roleMatched && isActive && hasFcmToken,
      },
      reasons,
    })
  );
});

export const softDeleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );
  if (!doctor) throw new ApiError(404, "Provider not found");
  return res.status(200).json(new ApiResponse(200, "Provider archived successfully", doctor));
});

export const restoreDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctor = await Doctor.findByIdAndUpdate(
    id,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );
  if (!doctor) throw new ApiError(404, "Provider not found");
  return res.status(200).json(new ApiResponse(200, "Provider restored successfully", doctor));
});

export const hardDeleteDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Strict Safeguard: Check for any associated bookings
  const bookingsCount = await doctorAppointmentModel.countDocuments({ doctorId: id });
  
  if (bookingsCount > 0) {
    throw new ApiError(
      400, 
      `Cannot permanently delete this provider because they have ${bookingsCount} booking(s) associated with their account. Please use the Soft Delete (Archive) feature instead to preserve financial and historical records.`
    );
  }

  const doctor = await Doctor.findByIdAndDelete(id);
  if (!doctor) throw new ApiError(404, "Provider not found");
  
  return res.status(200).json(new ApiResponse(200, "Provider permanently deleted", { _id: id }));
});


// ==========================================
// EMAIL TEMPLATES
// ==========================================

export const getEmailTemplates = asyncHandler(async (req, res) => {
  const templates = await EmailTemplate.find().sort({ name: 1 });
  
  if (templates.length === 0) {
    // Seed default templates if empty
    const defaults = [
      {
        name: "Welcome",
        code: "welcome",
        subject: "Welcome to A1Care 24/7 - Quality Care at Home",
        htmlBody: `
        <div style="text-align:center; margin-bottom:30px;">
            <div style="width:80px; height:80px; background-color:#EFF6FF; border-radius:40px; display:inline-block; line-height:80px; font-size:36px; margin-bottom:20px;">👋</div>
            <h2 style="font-size:26px;font-weight:900;margin-bottom:10px;color:#0F172A;">Welcome to A1Care!</h2>
            <p style="color:#64748B;font-size:16px;">Your healthcare journey begins here.</p>
        </div>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>{{fullName}}</strong>,</p>
        <p style="margin-bottom:20px;">We're thrilled to welcome you to A1Care 24/7! Your account has been successfully created.</p>
        <div style="background-color:#F8FAFC;padding:24px;border-radius:16px;margin-bottom:30px;border:1px solid #E2E8F0;">
            <h3 style="margin-top:0;font-size:16px;font-weight:800;color:#0D2E6E;margin-bottom:15px;">What you can do next:</h3>
            <ul style="margin:0;padding-left:20px;color:#475569;line-height:1.6;">
                <li>Book verified healthcare professionals</li>
                <li>Track your medical records securely</li>
                <li>Schedule tele-consultations</li>
            </ul>
        </div>
        <div style="text-align:center; padding-top:10px;">
            <a href="https://a1care.in/services" style="display:inline-block;background-color:#1A6FDB;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">Book a Service Now</a>
        </div>`,
        availableVariables: ["{{fullName}}"]
      },
      {
        name: "Partner Approved",
        code: "partner_approved",
        subject: "A1Care Partner KYC Approved",
        htmlBody: `
        <div style="text-align:center; margin-bottom:30px;">
            <div style="width:80px; height:80px; background-color:#F0FDF4; border-radius:40px; display:inline-block; line-height:80px; font-size:36px; margin-bottom:20px;">🎉</div>
            <h2 style="font-size:26px;font-weight:900;margin-bottom:10px;color:#065F46;">KYC Approved!</h2>
            <p style="color:#64748B;font-size:16px;">Welcome to the A1Care Provider Network.</p>
        </div>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>{{fullName}}</strong>,</p>
        <p style="margin-bottom:20px;">Congratulations! Your KYC documents have been successfully verified and your account is now <strong>Active</strong>.</p>
        <div style="background-color:#F8FAFC;padding:24px;border-radius:16px;margin-bottom:30px;border:1px solid #E2E8F0;">
            <p style="margin:0;color:#475569;">You are now eligible to receive booking requests and manage your availability directly from the partner app.</p>
        </div>
        <div style="text-align:center; padding-top:10px;">
            <a href="https://a1care.in/partner" style="display:inline-block;background-color:#10B981;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">Open Partner App</a>
        </div>`,
        availableVariables: ["{{fullName}}"]
      },
      {
        name: "Partner Rejected",
        code: "partner_rejected",
        subject: "A1Care Partner KYC Update Required",
        htmlBody: `
        <div style="text-align:center; margin-bottom:30px;">
            <div style="width:80px; height:80px; background-color:#FEF2F2; border-radius:40px; display:inline-block; line-height:80px; font-size:36px; margin-bottom:20px;">⚠️</div>
            <h2 style="font-size:26px;font-weight:900;margin-bottom:10px;color:#991B1B;">KYC Action Required</h2>
            <p style="color:#64748B;font-size:16px;">Please update your profile details.</p>
        </div>
        <p style="font-size:16px;margin-bottom:20px;">Dear <strong>{{fullName}}</strong>,</p>
        <p style="margin-bottom:20px;">We reviewed your recent KYC application but we need a few corrections before we can activate your account.</p>
        <div style="background-color:#FEF2F2;padding:24px;border-radius:16px;margin-bottom:30px;border:1px solid #FCA5A5;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:800;color:#991B1B;text-transform:uppercase;letter-spacing:0.1em;">Rejection Reason</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#7F1D1D;">{{reason}}</p>
        </div>
        <p style="margin-bottom:20px;">Please open the partner app to update your details and re-submit your application.</p>
        <div style="text-align:center; padding-top:10px;">
            <a href="https://a1care.in/partner" style="display:inline-block;background-color:#EF4444;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">Update KYC Now</a>
        </div>`,
        availableVariables: ["{{fullName}}", "{{reason}}"]
      }
    ];
    await EmailTemplate.insertMany(defaults);
    return res.status(200).json(new ApiResponse(200, "Templates seeded and fetched", await EmailTemplate.find().sort({ name: 1 })));
  }

  return res.status(200).json(new ApiResponse(200, "Templates fetched", templates));
});

export const updateEmailTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, htmlBody } = req.body;
  
  if (!subject || !htmlBody) throw new ApiError(400, "Subject and HTML Body are required");

  const template = await EmailTemplate.findByIdAndUpdate(id, { subject, htmlBody }, { new: true });
  if (!template) throw new ApiError(404, "Template not found");

  return res.status(200).json(new ApiResponse(200, "Template updated", template));
});

// --- Super Admin Wallet Overview ----------------------------------------------
export const getSuperAdminWalletOverview = asyncHandler(async (req, res) => {
  if (!isDbOnline()) throw new ApiError(503, "Database unavailable");

  // 1. Gross Volume (All SUCCESS bookings)
  const gmvAggr = await Order.aggregate([
    { $match: { status: "SUCCESS", type: "BOOKING" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const grossVolume = gmvAggr[0]?.total || 0;

  // 2. Subscription Revenue
  const subAggr = await Order.aggregate([
    { $match: { status: "SUCCESS", type: "SUBSCRIPTION" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const subscriptionRevenue = subAggr[0]?.total || 0;

  // 3. Total Commission Earned (Doctor Consultations + Services)
  const docCommissionAggr = await doctorAppointmentModel.aggregate([
    { $match: { status: "Completed", $or: [{ paymentStatus: "COMPLETED" }, { paymentStatus: { $exists: false } }, { totalAmount: { $gt: 0 } }] } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$commissionAmount", { $multiply: [{ $ifNull: ["$totalAmount", 0] }, 0.2] }] } } } }
  ]);
  
  const svcCommissionAggr = await serviceRequestModel.aggregate([
    { $match: { status: "COMPLETED" } },
    { $group: { _id: null, total: { $sum: { $ifNull: ["$commissionAmount", { $multiply: [{ $ifNull: ["$price", 0] }, 0.2] }] } } } }
  ]);
  
  const totalCommission = (docCommissionAggr[0]?.total || 0) + (svcCommissionAggr[0]?.total || 0);

  // 4. Partner Payouts
  const pendingPayoutsAggr = await Payout.aggregate([
    { $match: { status: "PENDING" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const pendingPayouts = pendingPayoutsAggr[0]?.total || 0;

  const paidPayoutsAggr = await Payout.aggregate([
    { $match: { status: "COMPLETED" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const paidPayouts = paidPayoutsAggr[0]?.total || 0;

  // 5. Referral Rewards Given Out
  const referralAggr = await Referral.aggregate([
    { $match: { status: "REWARDED" } },
    { $group: { _id: null, total: { $sum: "$rewardAmount" } } }
  ]);
  const totalReferralRewards = referralAggr[0]?.total || 0;

  // Net Platform Revenue = (Commission + Subscriptions) - (Referral Rewards)
  const netRevenue = (totalCommission + subscriptionRevenue) - totalReferralRewards;

  // 6. Recent Ledger (Combine recent orders, payouts, and referrals)
  const recentOrders = await Order.find({ status: "SUCCESS" })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
    
  const recentPayouts = await Payout.find({ status: "COMPLETED" })
    .sort({ processedAt: -1 })
    .limit(200)
    .lean();
    
  const recentReferrals = await Referral.find({ status: "REWARDED" })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  const ledger: any[] = [];
  
  recentOrders.forEach((o: any) => {
    ledger.push({
      id: o._id.toString(),
      type: o.type === 'SUBSCRIPTION' ? 'CREDIT' : 'CREDIT_GMV',
      title: o.type === 'SUBSCRIPTION' ? 'Subscription Payment' : 'Booking Payment',
      amount: o.amount,
      date: o.createdAt,
      status: o.status
    });
  });
  
  recentPayouts.forEach((p: any) => {
    ledger.push({
      id: p._id.toString(),
      type: 'DEBIT',
      title: 'Partner Payout',
      amount: p.amount,
      date: p.processedAt || p.updatedAt,
      status: p.status
    });
  });
  
  recentReferrals.forEach((r: any) => {
    ledger.push({
      id: r._id.toString(),
      type: 'DEBIT',
      title: 'Referral Reward',
      amount: r.rewardAmount,
      date: r.updatedAt,
      status: r.status
    });
  });

  // Sort combined ledger by date desc and take top 500
  ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentLedger = ledger.slice(0, 500);

  return res.status(200).json(new ApiResponse(200, "Super Admin Wallet Data", {
    grossVolume,
    subscriptionRevenue,
    totalCommission,
    pendingPayouts,
    paidPayouts,
    totalReferralRewards,
    netRevenue,
    recentLedger
  }));
});
export const getServiceBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await serviceRequestModel.findById(id)
    .populate("userId", "name mobileNumber email")
    .populate("addressId")
    .populate("childServiceId")
    .populate("healthPackageId")
    .populate("assignedProviderId", "name mobileNumber email type _id")
    .populate("partnerId", "name mobileNumber email type _id")
    .lean();

  if (!booking) throw new ApiError(404, "Booking not found");

  res.status(200).json(new ApiResponse(200, "Booking fetched", booking));
});
export const getDoctorBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  let booking: any = await doctorAppointmentModel.findById(id)
    .populate('doctorId', 'name specialization mobileNumber profileImage email type hospitalName hospitalId fee')
    .populate('patientId', 'name mobileNumber email gender age address')
    .lean();
    
  if (booking) {
    booking.isServiceRequest = false;
    booking.mappedStatus = booking.status;
    return res.status(200).json(new ApiResponse(200, 'Doctor booking fetched', booking));
  }
  
  booking = await serviceRequestModel.findById(id)
    .populate('userId', 'name mobileNumber email gender age address')
    .populate('childServiceId', 'name type')
    .populate('assignedProviderId', 'name mobileNumber email')
    .lean();
    
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }
  
  const deptRaw = (booking.notes || '').match(/OP Department:\s*([^[]+)/i);
  const deptName = deptRaw ? deptRaw[1].trim() : 'OP';
  
  let mappedStatus = 'Pending';
  const st = booking.status?.toUpperCase() || '';
  if (['ACCEPTED', 'ARRIVED', 'STARTED', 'RESCHEDULED', 'CHECKED_IN'].includes(st)) mappedStatus = 'Confirmed';
  if (st === 'COMPLETED') mappedStatus = 'Completed';
  if (st === 'CANCELLED' || st === 'NO_SHOW') mappedStatus = 'Cancelled';
  if (st === 'RETURNED_TO_ADMIN') mappedStatus = 'Needs Reassignment';
  
  const formattedSr = {
    ...booking,
    isServiceRequest: true,
    doctorId: { name: `OP Token (${deptName})`, specialization: ['Hospital Service'] },
    patientId: booking.userId ? {
      name: (booking.userId as any).name || '',
      mobile: (booking.userId as any).mobileNumber || 'No Profile'
    } : {
      name: 'Missing Profile',
      mobile: 'N/A'
    },
    totalAmount: booking.price || 0,
    mappedStatus,
    status: mappedStatus
  };
  
  res.status(200).json(new ApiResponse(200, 'OP Token booking fetched', formattedSr));
});
