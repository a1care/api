export type AdminRole = "admin" | "super_admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface DashboardSummary {
  patients: number;
  staff: number;
  services: number;
  appointments: number;
  serviceBookings: number;
  pendingVerifications: number;
  totalRevenue: number;
  onboardingTrend: string;
  systemStatus: {
    uptime: string;
    latency: string;
    liveSessions: number;
    loadBalancer: string;
  };
  health: {
    successRate: string;
    retention: string;
  };
}

export type ManagedAppKey = "user_app" | "provider_app";

export interface FestivalBanner {
  id: string;
  title: string;
  imageUrl: string;
  redirectUrl: string;
  active: boolean;
}

export interface ManagedAppConfig {
  appKey: ManagedAppKey;
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
  };
  updatedAt: string;
}

export interface MobileFirebaseClient {
  platform: "android" | "ios";
  appLabel: "customer" | "partner";
  appId: string;
  apiKey: string;
  packageName: string;
}

export interface SystemConfig {
  website: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  projectNumber: string;
  projectId: string;
  storageBucket: string;
  clients: MobileFirebaseClient[];
  googleMapsApiKey: string;
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
}


export interface DashboardOverview {
  kpis: {
    patients: number;
    staff: number;
    activeStaff: number;
    pendingVerifications: number;
    totalBookings: number;
    todayBookings: number;
    revenue: {
      total: number;
      month: number;
      today: number;
    }
  };
  bookings: {
    appointments: { _id: string; count: number }[];
    services: { _id: string; count: number }[];
  };
  alerts: {
    pendingVerifications: number;
    openTickets: number;
    failedPayments: number;
  };
}

export interface DoctorPerformance {
  id: string;
  name: string;
  mobile: string;
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
}

export interface RecentActivity {
  id: string;
  type: string;
  patient: string;
  provider: string;
  status: string;
  amount: number;
  createdAt: string;
}
