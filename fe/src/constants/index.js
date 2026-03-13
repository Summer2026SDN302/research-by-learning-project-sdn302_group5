/**
 * Application-wide constants
 * Single source of truth for shared values
 */

// ===== ROUTES =====
export const ROUTES = {
  HOME: '/',
  SOLUTIONS: '/solutions',
  CONTACT: '/contact',
  AUTH: '/auth',
  REGISTER: '/register',
  ENTERPRISE: '/enterprise',
  FARMER: '/farmer',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:id',
  FARMER_HOME: '/farmer-home',
  ENTERPRISE_HOME: '/enterprise-home',
  MESSAGING: '/messaging',
  CONTRACT_FLOW: '/contract-flow',
  PROFILE: '/profile',
  CROP_HEALTH: '/crop-health',
  GUIDE_AI: '/guide-ai',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
};

// ===== NAV ITEMS =====
export const NAV_ITEMS = [
  { path: ROUTES.HOME, label: 'Trang chủ' },
  { path: ROUTES.PRODUCTS, label: 'Sản phẩm' },
  { path: ROUTES.SOLUTIONS, label: 'Giải pháp' },
  { path: ROUTES.CONTACT, label: 'Liên hệ' },
];

// ===== BRAND =====
export const BRAND_NAME = 'PreOnic';

// ===== TOAST DURATIONS (ms) =====
export const TOAST_DURATION = {
  SHORT: 3000,
  DEFAULT: 4000,
  LONG: 5000,
};

// ===== LOCAL STORAGE KEYS =====
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  USER: 'user',
};

// ===== COMPANY INFO =====
export const COMPANY = {
  NAME: 'PreOnic',
  FULL_NAME: 'Công ty TNHH PreOnic Việt Nam',
  DESCRIPTION: 'Nền tảng kết nối nông nghiệp bền vững hàng đầu Việt Nam',
  EMAIL: 'contact@preonic.vn',
  SUPPORT_EMAIL: 'support@preonic.vn',
  HOTLINE: '1900 xxxx',
  ADDRESS: 'Hà Nội, Việt Nam',
  COPYRIGHT_YEAR: 2026,
  COMMISSION_RATE: 3, // % hoa hồng trung gian
};

// ===== REGIONS =====
export const REGIONS = {
  NORTH: { key: 'north', label: 'Miền Bắc', icon: null, color: '#3b82f6', 
    highlight: 'Đất đai màu mỡ, khí hậu 4 mùa — lý tưởng cho rau củ, chè, và lúa gạo chất lượng cao' },
  CENTRAL: { key: 'central', label: 'Miền Trung', icon: null, color: '#f59e0b',
    highlight: 'Nắng gió đặc trưng tạo nên hương vị riêng cho ớt, tiêu, quế, và hải sản khô' },
  SOUTH: { key: 'south', label: 'Miền Nam', icon: null, color: '#10b981',
    highlight: 'Đồng bằng phì nhiêu, trái cây nhiệt đới quanh năm — xoài, thanh long, bưởi, cà phê' },
};

// ===== CONTRACT STATUS =====
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// ===== FILE UPLOAD =====
export const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
