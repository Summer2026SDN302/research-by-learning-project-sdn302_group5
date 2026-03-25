import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiFeather, FiCalendar, FiDollarSign, FiCamera, FiCheck, FiCheckCircle,
  FiPackage, FiAlertTriangle, FiFileText, FiEye, FiMapPin, FiInfo,
  FiCloud, FiMap, FiBell, FiZap, FiShield, FiDroplet, FiWind,
  FiCloudRain, FiClock, FiRefreshCw, FiTruck, FiTrash2
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  ROUTES,
  COMPANY,
  CONTRACT_STATUS,
  FILE_SIZE_LIMIT,
  FARMER_DASHBOARD_NAV_ITEMS,
  SEARCH_PLACEHOLDERS,
} from "../../constants";
import farmerService from "../../services/farmer.service";
import contractService from "../../services/contract.service";
import escrowService from "../../services/escrow.service";
import productService from "../../services/product.service";
import weatherService from "../../services/weather.service";
import { formatMoney, formatDate } from "../../hooks/useApiData";
import NotificationBell from "../NotificationBell/NotificationBell";
import WalletPayment from "../WalletPayment/WalletPayment";
import BilateralRating from "../BilateralRating/BilateralRating";
import { matchProvince, getDistricts } from "../../data/vn-locations";
import "./FarmerDashboard.css";

// Tệp này điều phối toàn bộ dashboard nông dân: điều hướng tab, dữ liệu tổng quan và các thao tác nghiệp vụ chính.
export default function FarmerDashboard() {
  const [activeTab, setActiveTab] = useState("muavu");
  const [headerSearch, setHeaderSearch] = useState("");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <div className="fd-wrapper">
      {/* SIDEBAR */}
      <aside className="fd-sidebar">
        <div className="fd-logo" onClick={() => navigate(ROUTES.HOME)} style={{ cursor: "pointer" }}>
          <div className="logo-icon"><span className="logo-leaf" /></div>
          <div className="logo-text"><h1>PreOnic</h1><p>Nông dân</p></div>
        </div>

        <nav className="fd-nav">
          {FARMER_DASHBOARD_NAV_ITEMS.map(item => (
            <button key={item.key} className={`${item.cls} ${activeTab === item.key ? "active" : ""}`} onClick={() => setActiveTab(item.key)}>
              <span className={`nav-icon ${item.cls}-icon`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="fd-create" onClick={() => setActiveTab("dangban")}>+ Đăng bán nông sản mới</button>

        <div className="fd-sidebar-footer">
          <button className="messaging-btn" onClick={() => navigate(ROUTES.MESSAGING)}>
            <span className="nav-icon msg-sidebar-icon" /> Nhắn tin
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon logout-sidebar-icon" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="fd-main">
        {activeTab === "muavu" && <MuaVuContent user={user} headerSearch={headerSearch} setHeaderSearch={setHeaderSearch} />}
        {activeTab === "hopdong" && <HopDongContent searchQuery={headerSearch} />}
        {activeTab === "donhang" && <DonHangContent searchQuery={headerSearch} />}
        {activeTab === "escrow" && <FarmerEscrowContent />}
        {activeTab === "vi" && <WalletPayment role="farmer" />}
        {activeTab === "danhgia" && <BilateralRating currentRole="farmer" />}
        {activeTab === "thoitiet" && <FarmerWeatherContent />}
        {activeTab === "dangban" && <DangBanContent />}
      </main>
    </div>
  );
}

/* =========================================
  KHỐI MÙA VỤ
  Dùng để hiển thị số liệu tổng quan, sản phẩm đang bán và các hợp đồng gần nhất.
  ========================================= */
function MuaVuContent({ user, headerSearch = "", setHeaderSearch }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [crops, setCrops] = useState([]);
  const [recentContracts, setRecentContracts] = useState([]);
  // My products + remove modal
  const [myProducts, setMyProducts] = useState(null); // null = loading
  const [removeModal, setRemoveModal] = useState(null); // { product } | null
  const [removing, setRemoving] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [dashRes, cropsRes] = await Promise.all([
        farmerService.getDashboard().catch(() => null),
        farmerService.getCrops().catch(() => null),
      ]);
      if (dashRes?.data) {
        setDashboardStats(dashRes.data.stats);
        setRecentContracts(dashRes.data.recentContracts || []);
      }
      if (cropsRes?.data?.crops) setCrops(cropsRes.data.crops);
    } catch { /* silent */ }
  }, []);

  const loadMyProducts = useCallback(async () => {
    try {
      const res = await productService.getMyProducts().catch(() => null);
      setMyProducts(res?.data?.products || res?.data || []);
    } catch { setMyProducts([]); }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadMyProducts();
  }, [loadDashboard, loadMyProducts]);

  const handleRemoveProduct = async () => {
    if (!removeModal || removing) return;
    setRemoving(true);
    try {
      await productService.delete(removeModal._id);
      showToast(`Đã gỡ sản phẩm "${removeModal.name}" thành công.`, "success");
      setRemoveModal(null);
      await loadMyProducts();
      await loadDashboard(); // refresh crop progress
    } catch (err) {
      showToast(err?.message || "Gỡ sản phẩm thất bại.", "error");
    } finally {
      setRemoving(false);
    }
  };

  const displayCrops = crops.map(c => ({ title: `${c.name} - ${c.location}`, target: c.expectedDate ? `Thu hoạch: ${formatDate(c.expectedDate)}` : "Quanh năm", pct: c.progress || 0, cls: "corn" }));

  const contractValue = dashboardStats?.totalContractValue || 0;
  const totalContracts = dashboardStats?.totalContracts || 0;
  const balance = dashboardStats?.balance || 0;

  return (
    <>
      <header className="fd-header">
        <div className="header-left">
          <h1>Chào mừng trở lại, {user?.fullName || "Nông dân"}!</h1>
          <p>Dưới đây là tổng kết các cánh đồng và cam kết hôm nay.</p>
        </div>
        <div className="header-actions">
          <div className="fd-search"><span className="search-input-icon" /><input placeholder={SEARCH_PLACEHOLDERS.FARMER_DASHBOARD} value={headerSearch} onChange={e => setHeaderSearch(e.target.value)} /></div>
          <NotificationBell />
          <div className="user-profile" onClick={() => navigate(ROUTES.PROFILE)} style={{ cursor: "pointer" }}>
            <div className="user-avatar">{(user?.fullName || "ND").slice(0, 2).toUpperCase()}</div>
            <span>{user?.fullName || "Nông dân"}</span>
          </div>
        </div>
      </header>

      <div className="fd-stat-row">
        <div className="fd-stat-box">
          <div className="fd-stat-ico green">
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div className="fd-stat-txt">
            <span>Giá trị hợp đồng</span>
            <strong>{contractValue > 0 ? formatMoney(contractValue) : "0 VNĐ"}</strong>
            <small className="ok">{totalContracts} hợp đồng</small>
          </div>
        </div>
        <div className="fd-stat-box">
          <div className="fd-stat-ico blue">
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div className="fd-stat-txt">
            <span>Số dư ví</span>
            <strong>{formatMoney(balance)}</strong>
            <small>Ví PreOnic</small>
          </div>
        </div>
        <div className="fd-stat-box">
          <div className="fd-stat-ico amber">
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div className="fd-stat-txt">
            <span>Điểm uy tín</span>
            <strong>{dashboardStats?.reputationScore ?? 5}/5</strong>
            <small className="ok">Điều kiện tốt</small>
          </div>
        </div>
      </div>

      <div className="fd-pg-content">
        <div className="fd-sec-card">
          <div className="fd-sec-head">
            <h3>Tổng quan mùa vụ</h3>
            <span style={{ fontSize: 13, color: '#13ec37', cursor: 'pointer', fontWeight: 600 }}>Xem tất cả</span>
          </div>
          <div className="fd-sec-body">
            {displayCrops.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>Chưa có dữ liệu mùa vụ nào</p>
            ) : (
              <div className="fd-season">
                {displayCrops.map((s, i) => (
                  <div key={i} className="season-item">
                    <div className="season-header">
                      <div className={`crop-badge ${s.cls}`}></div>
                      <div><strong className="season-title">{s.title}</strong><p className="season-target">Mục tiêu {s.target}</p></div>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${s.pct}%` }}><span className="progress-label">{s.pct}%</span></div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fd-sec-card">
          <div className="fd-sec-head"><h3>Cam kết đang hoạt động</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fd-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  {["Đối tác","Nông sản","Giá trị","Ngày giao","Trạng thái"].map(h => (
                    <th key={h} style={{ padding: '11px 18px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f9fbf9', borderBottom: '1px solid #f0f4f1' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentContracts.length > 0 ? recentContracts.map(c => (
                  <tr key={c._id} onMouseEnter={e => e.currentTarget.style.background='#f9fbf9'} onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={{ padding: '12px 18px', fontSize: 13 }}>{c.enterpriseId?.fullName || c.enterpriseId?.companyName || "Doanh nghiệp"}</td>
                    <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600 }}>{c.productName}</td>
                    <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#111812' }}>{formatMoney(c.totalValue)}</td>
                    <td style={{ padding: '12px 18px', fontSize: 13, color: '#6b7280' }}>{formatDate(c.deliveryDate)}</td>
                    <td style={{ padding: '12px 18px' }}><span className={`fds ${c.status === "active" ? "fds-green" : "fds-amber"}`}>{c.status === "active" ? "Đang hoạt động" : c.status}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" style={{ textAlign: "center", color: "#9ca3af", padding: "28px", fontSize: 13 }}>Chưa có hợp đồng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ====== MY PRODUCTS ====== */}
        <div className="fd-sec-card" style={{ marginTop: 0 }}>
          <div className="fd-sec-head">
            <h3>Sản phẩm đang bán ({myProducts === null ? "…" : myProducts.length})</h3>
          </div>
          <div className="fd-sec-body" style={{ padding: 0 }}>
            {myProducts === null ? (
              <p style={{ color: '#9ca3af', fontSize: 13, padding: '20px', textAlign: 'center' }}>Đang tải...</p>
            ) : myProducts.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13, padding: '20px', textAlign: 'center' }}>Chưa có sản phẩm nào đang bán</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {myProducts.map((p, i) => (
                  <div key={p._id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 18px',
                    borderBottom: i < myProducts.length - 1 ? '1px solid #f0f4f1' : 'none',
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, background: '#f0fdf4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, overflow: 'hidden',
                    }}>
                      {p.image
                        ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <FiPackage size={20} color="#16a34a" />
                      }
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111812', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                        {p.location} · {p.priceMin?.toLocaleString('vi-VN')}đ–{p.priceMax?.toLocaleString('vi-VN')}đ/{p.unit}
                        {p.expectedDate && p.expectedDate !== 'Quanh năm' ? ` · Thu hoạch: ${p.expectedDate}` : ''}
                      </p>
                    </div>
                    {/* Progress */}
                    <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: `conic-gradient(#16a34a ${(p.progress || 0) * 3.6}deg, #e5e7eb 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a' }}>{p.progress || 0}%</span>
                        </div>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9ca3af' }}>cam kết</p>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => setRemoveModal(p)}
                      style={{
                        flexShrink: 0, padding: '6px 14px', borderRadius: 8,
                        border: '1.5px solid #fecaca', background: '#fff5f5',
                        color: '#dc2626', fontWeight: 600, fontSize: 12,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; }}
                    >
                      <FiTrash2 size={12} /> Gỡ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====== REMOVE PRODUCT CONFIRM MODAL ====== */}
      {removeModal && (
        <div
          onClick={() => !removing && setRemoveModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420,
              background: '#fff', borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              padding: '16px 22px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
              }}><FiTrash2 size={17} color="#fff" /></div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700 }}>Gỡ sản phẩm</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem' }}>Hành động này không thể hoàn tác</p>
              </div>
              <button
                onClick={() => !removing && setRemoveModal(null)}
                style={{
                  marginLeft: 'auto', background: 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', width: 30, height: 30,
                  borderRadius: '50%', color: '#fff', fontSize: '0.95rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 22px' }}>
              <div style={{
                background: '#fef3c7', border: '1px solid #fde68a',
                borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <FiAlertTriangle size={15} color="#92400e" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '0.83rem', color: '#92400e', lineHeight: 1.6 }}>
                  Sản phẩm sẽ bị ẩn khỏi danh sách và doanh nghiệp sẽ không thể xem hoặc đặt hợp đồng mới. Các hợp đồng hiện có <strong>không bị ảnh hưởng</strong>.
                </p>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
                  background: '#f0fdf4', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {removeModal.image
                    ? <img src={removeModal.image} alt={removeModal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <FiPackage size={20} color="#16a34a" />
                  }
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111812' }}>{removeModal.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{removeModal.location}</p>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{
              padding: '14px 22px', borderTop: '1px solid #f3f4f6',
              background: '#fafafa', display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => !removing && setRemoveModal(null)}
                disabled={removing}
                style={{
                  padding: '9px 20px', borderRadius: 9,
                  border: '1.5px solid #d1d5db', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                }}
              >Hủy</button>
              <button
                onClick={handleRemoveProduct}
                disabled={removing}
                style={{
                  padding: '9px 22px', borderRadius: 9, border: 'none',
                  background: removing ? '#d1d5db' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                  color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                  cursor: removing ? 'not-allowed' : 'pointer',
                  boxShadow: removing ? 'none' : '0 4px 12px rgba(220,38,38,0.35)',
                }}
              >
                {removing ? 'Đang xử lý...' : 'Xác nhận gỡ sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================
   HỢP ĐỒNG — Contract management
   ========================================= */
const PAYMENT_LABELS = {
  '50_50':        '50% trả trước – 50% khi nhận hàng',
  '30_70':        '30% trả trước – 70% khi nhận hàng',
  '100_delivery': '100% sau khi giao hàng',
  '100_upfront':  '100% trả trước',
};

const CONTRACT_STATUS_VI = {
  pending:   'Chờ ký',
  approved:  'Chờ ký quỹ',
  active:    'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed:  'Đang tranh chấp',
};

const PENDING_CONTRACT_STATUSES = new Set(["pending", "approved"]);

const CONTRACT_LIST_CLASS_BY_STATUS = {
  pending: "lc-pending",
  approved: "lc-active",
  active: "lc-active",
  completed: "lc-completed",
  cancelled: "lc-cancelled",
};

const CONTRACT_BADGE_CLASS_BY_STATUS = {
  pending: "fds-amber",
  approved: "fds-blue",
  active: "fds-green",
  completed: "fds-gray",
  cancelled: "fds-red",
};

const isPendingContractStatus = (status) => PENDING_CONTRACT_STATUSES.has(status);
const isActiveContractStatus = (status) => status === CONTRACT_STATUS.ACTIVE;
const isCompletedContractStatus = (status) => status === CONTRACT_STATUS.COMPLETED;
const isContractSignable = (contract) => isPendingContractStatus(contract.status) && !contract.signedByFarmer;
const getContractListClass = (status) => CONTRACT_LIST_CLASS_BY_STATUS[status] || "lc-disputed";
const getContractBadgeClass = (status) => CONTRACT_BADGE_CLASS_BY_STATUS[status] || "fds-purple";

const matchesContractTab = (status, tab) => {
  if (tab === "pending") return isPendingContractStatus(status);
  if (tab === "active") return isActiveContractStatus(status);
  if (tab === "completed") return isCompletedContractStatus(status);
  return false;
};

function HopDongContent({ searchQuery = "" }) {
  const toast = useToast();
  const [signatureMode, setSignatureMode] = useState("draw");
  const [agreed, setAgreed] = useState(false);
  const [showSignTerms, setShowSignTerms] = useState(false);
  const [activeContractTab, setActiveContractTab] = useState("pending");
  const [apiContracts, setApiContracts] = useState(null);
  // Detail / sign view state
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadContracts = useCallback(async () => {
    try {
      const res = await farmerService.getContracts();
      setApiContracts(res?.data?.contracts || []);
    } catch { setApiContracts([]); }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const mapContract = (c) => ({
    ...c,
    id: c.contractCode || c._id,
    buyer: c.enterpriseName || c.enterpriseId?.companyName || c.enterpriseId?.fullName || "Doanh nghiệp",
    product: c.productName,
    quantityLabel: `${c.quantity} ${c.unit}`,
    valueLabel: formatMoney(c.totalValue),
    dateLabel: formatDate(c.createdAt),
    deliveryDateLabel: formatDate(c.deliveryDate),
  });

  const contracts = apiContracts !== null ? apiContracts.map(mapContract) : [];

  const tabs = [
    { key: "pending", label: "Chờ ký", count: contracts.filter(c => matchesContractTab(c.status, "pending")).length },
    { key: "active", label: "Đang hoạt động", count: contracts.filter(c => matchesContractTab(c.status, "active")).length },
    { key: "completed", label: "Hoàn thành", count: contracts.filter(c => matchesContractTab(c.status, "completed")).length },
  ];

  const filteredContracts = contracts.filter(c => {
    const q = searchQuery?.toLowerCase() || "";
    const matchSearch = !q || c.product?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q) || c.buyer?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    return matchesContractTab(c.status, activeContractTab);
  });

  // Open contract detail + fetch full data from API
  const openContract = async (contract) => {
    setSignSuccess(false);
    setAgreed(false);
    setSignatureMode("draw");
    setSelectedContract(contract);
    setDetailLoading(true);
    try {
      const res = await contractService.getById(contract._id);
      if (res?.data?.contract) setSelectedContract(mapContract(res.data.contract));
    } catch { /* keep initial list data */ }
    finally { setDetailLoading(false); }
  };

  const goBackToList = () => { setSelectedContract(null); setSignSuccess(false); };

  const handleSign = async () => {
    if (!agreed || !selectedContract || signingLoading) return;
    setSigningLoading(true);
    try {
      await contractService.sign(selectedContract._id);
      setSignSuccess(true);
      await loadContracts();
    } catch (err) {
      toast.error(err?.message || "Ký hợp đồng thất bại. Vui lòng thử lại.");
    } finally { setSigningLoading(false); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim() || cancelLoading) return;
    setCancelLoading(true);
    try {
      // If farmer hasn't signed yet → reject (distinct from cancel after signing)
      if (!selectedContract.signedByFarmer && isPendingContractStatus(selectedContract.status)) {
        await contractService.reject(selectedContract._id, cancelReason);
        toast.success("Đã từ chối hợp đồng. Doanh nghiệp sẽ được thông báo.");
      } else {
        await contractService.cancel(selectedContract._id, cancelReason);
        toast.success("Đã gửi yêu cầu hủy hợp đồng!");
      }
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedContract(null);
      await loadContracts();
    } catch (err) {
      toast.error(err?.message || "Thao tác thất bại.");
    } finally { setCancelLoading(false); }
  };

  const sc = selectedContract;

  return (
    <>
      <div className="fd-pg-header">
        <div>
          <h2>Hợp đồng của tôi</h2>
          <p className="fd-pg-subtitle">Phí dịch vụ trung gian {COMPANY.NAME}: <strong>{COMPANY.COMMISSION_RATE}%</strong></p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DETAIL / SIGN VIEW
      ══════════════════════════════════════ */}
      {sc && (
        detailLoading ? (
          <div className="cd-loading">
            <div className="cd-spinner" />
            <p>Đang tải chi tiết hợp đồng...</p>
          </div>
        ) : signSuccess ? (
          /* ─── SUCCESS SCREEN ─── */
          <div className="sign-success-card">
            <div className="ssc-icon">✓</div>
            <h2>Ký hợp đồng thành công!</h2>
            <p>Hợp đồng <strong>{sc.contractCode || sc.id}</strong> đã được ký điện tử và có hiệu lực pháp lý.</p>
            <div className="ssc-info-grid">
              <div className="ssc-info-item"><span>Sản phẩm</span><strong>{sc.product}</strong></div>
              <div className="ssc-info-item"><span>Đối tác</span><strong>{sc.buyer}</strong></div>
              <div className="ssc-info-item"><span>Giá trị</span><strong>{sc.valueLabel}</strong></div>
              <div className="ssc-info-item"><span>Ngày giao</span><strong>{sc.deliveryDateLabel}</strong></div>
            </div>
            <p className="ssc-note">Doanh nghiệp sẽ nạp ký quỹ vào hệ thống Escrow trong vòng 24 giờ. Bạn sẽ nhận thông báo khi tiền được ký quỹ và hợp đồng bắt đầu thực hiện.</p>
            <div className="ssc-actions">
              <button className="ssc-btn-primary" onClick={goBackToList}>← Về danh sách hợp đồng</button>
              <button className="ssc-btn-outline" onClick={() => { setActiveContractTab("active"); goBackToList(); }}>Xem trong Đang hoạt động</button>
            </div>
          </div>
        ) : (
          /* ─── CONTRACT DETAIL VIEW ─── */
          <div className="contract-detail-view">
            {/* Top navigation */}
            <div className="cd-topnav">
              <button className="cd-back-btn" onClick={goBackToList}>
                <FiFileText size={14} />← Danh sách hợp đồng
              </button>
              <div className="cd-topnav-right">
                <span className="cd-code-badge">{sc.contractCode || sc.id || "—"}</span>
                <span className={`status-badge ${sc.status}`}>{CONTRACT_STATUS_VI[sc.status] || sc.status}</span>
              </div>
            </div>

            <div className="contract-grid">
              {/* ── LEFT: Full document ── */}
              <div className="contract-preview">
                <div className="preview-header">
                  <div className="preview-title">
                    <span className="doc-icon" />
                    <span>Nội dung hợp đồng</span>
                  </div>
                  <div className="preview-header-status">
                    <span className={`preview-status-dot ${sc.signedByEnterprise ? 'signed' : 'waiting'}`} />
                    <span className="preview-status-text">{sc.signedByEnterprise ? 'Doanh nghiệp đã ký' : 'DN chờ ký'}</span>
                    <span className="preview-divider">|</span>
                    <span className={`preview-status-dot ${sc.signedByFarmer ? 'signed' : 'waiting'}`} />
                    <span className="preview-status-text">{sc.signedByFarmer ? 'Bạn đã ký' : 'Chờ chữ ký của bạn'}</span>
                  </div>
                </div>
                <div className="preview-body">
                  <div className="contract-document">
                    {/* Document header */}
                    <div className="doc-header">
                      <div className="doc-logo-row"><span className="doc-logo-text">{COMPANY.NAME}</span></div>
                      <h3>THỎA THUẬN MUA BÁN NÔNG SẢN</h3>
                      <p>Mã hợp đồng: <strong>{sc.contractCode || sc.id || "—"}</strong></p>
                      <p className="doc-date">Ngày lập: {sc.dateLabel || "—"}</p>
                    </div>

                    <div className="doc-content">
                      {/* 1. Parties */}
                      <section className="doc-section">
                        <h4>1. CÁC BÊN THAM GIA</h4>
                        <div className="doc-parties">
                          <div className="doc-party">
                            <span className="party-role">Bên bán (Nông dân / HTX)</span>
                            <span className="party-name">{sc.farmerName || "—"}</span>
                          </div>
                          <div className="doc-party-divider">—</div>
                          <div className="doc-party">
                            <span className="party-role">Bên mua (Doanh nghiệp)</span>
                            <span className="party-name">{sc.enterpriseName || sc.buyer || "—"}</span>
                          </div>
                        </div>
                        <p style={{ marginTop: 8, color: '#6b7280', fontSize: '12px' }}>
                          Thông qua nền tảng trung gian <strong>{COMPANY.NAME}</strong>
                        </p>
                      </section>

                      {/* 2. Product */}
                      <section className="doc-section">
                        <h4>2. ĐỐI TƯỢNG HỢP ĐỒNG</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row"><span>Sản phẩm</span><strong>{sc.productName || sc.product || "—"}</strong></div>
                          <div className="ddt-row"><span>Số lượng</span><strong>{sc.quantityLabel || `${sc.quantity} ${sc.unit}`}</strong></div>
                          <div className="ddt-row"><span>Đơn giá</span><strong>{formatMoney(sc.pricePerUnit)} / {sc.unit || 'kg'}</strong></div>
                          {sc.notes && <div className="ddt-row"><span>Yêu cầu chất lượng</span><strong>{sc.notes}</strong></div>}
                        </div>
                      </section>

                      {/* 3. Payment */}
                      <section className="doc-section">
                        <h4>3. GIÁ TRỊ & THANH TOÁN</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row highlight">
                            <span>Tổng giá trị hợp đồng</span>
                            <strong>{sc.valueLabel || formatMoney(sc.totalValue)}</strong>
                          </div>
                          <div className="ddt-row"><span>Hình thức thanh toán</span><strong>{PAYMENT_LABELS[sc.paymentTerms] || sc.paymentTerms || "—"}</strong></div>
                          <div className="ddt-row"><span>Đặt cọc ({sc.depositPercentage || 50}%)</span><strong>{formatMoney(sc.depositAmount)}</strong></div>
                          <div className="ddt-row muted">
                            <span>Phí dịch vụ {COMPANY.NAME} ({sc.commissionRate || COMPANY.COMMISSION_RATE}%)</span>
                            <strong>{formatMoney(sc.commission)}</strong>
                          </div>
                        </div>
                      </section>

                      {/* 4. Delivery */}
                      <section className="doc-section">
                        <h4>4. THỜI GIAN & ĐỊA ĐIỂM</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row"><span>Ngày giao hàng</span><strong>{sc.deliveryDateLabel || formatDate(sc.deliveryDate) || "—"}</strong></div>
                          {sc.farmLocation?.province && (
                            <div className="ddt-row">
                              <span>Địa điểm giao hàng</span>
                              <strong>{sc.farmLocation.province}{sc.farmLocation.district ? `, ${sc.farmLocation.district}` : ""}</strong>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* 5. Escrow */}
                      <section className="doc-section">
                        <h4>5. BẢO VỆ GIAO DỊCH — ESCROW</h4>
                        <p>Toàn bộ giá trị hợp đồng được bảo đảm qua hệ thống Ký quỹ <strong>{COMPANY.NAME} Escrow</strong>. Doanh nghiệp nạp tiền vào tài khoản Escrow trước khi hợp đồng có hiệu lực. Tiền chỉ được giải ngân cho Bên bán sau khi Bên mua xác nhận nhận hàng đạt yêu cầu.</p>
                      </section>

                      {/* 6. Obligations */}
                      <section className="doc-section">
                        <h4>6. CAM KẾT & TRÁCH NHIỆM</h4>
                        <p>Bên bán cam kết giao đúng chủng loại, số lượng, chất lượng đã thỏa thuận; giao hàng đúng hạn; sản phẩm đảm bảo ATVSTP. Bên mua cam kết thanh toán qua hệ thống Escrow; không từ chối nhận hàng hợp lệ. Vi phạm nghiêm trọng bị bồi thường tối đa <strong>20%</strong> giá trị hợp đồng.</p>
                      </section>

                      {/* 7. Risk sharing (optional) */}
                      {sc.riskSharingTerms && (
                        <section className="doc-section">
                          <h4>7. ĐIỀU KHOẢN RỦI RO ĐẶC BIỆT</h4>
                          <p>{sc.riskSharingTerms}</p>
                        </section>
                      )}

                      {/* Signature boxes */}
                      <div className="doc-signatures">
                        <div className={`signature-box ${sc.signedByEnterprise ? 'buyer-signed' : 'buyer-pending-box'}`}>
                          <p className="sig-label">{sc.enterpriseName || sc.buyer || 'Bên mua'}</p>
                          {sc.signedByEnterprise
                            ? <p className="sig-status sig-signed">✓ Đã ký điện tử</p>
                            : <p className="sig-status sig-waiting">Chờ ký</p>
                          }
                          <span className="sig-role">BÊN MUA</span>
                        </div>
                        <div className={`signature-box ${sc.signedByFarmer ? 'seller-signed-done' : 'seller-pending'}`}>
                          <p className="sig-label">{sc.farmerName || 'Bên bán'}</p>
                          {sc.signedByFarmer
                            ? <p className="sig-status sig-signed">✓ Đã ký điện tử</p>
                            : <p className="sig-status sig-waiting">Chờ chữ ký của bạn ▼</p>
                          }
                          <span className="sig-role">BÊN BÁN</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Sidebar ── */}
              <div className="contract-sidebar">
                {/* Summary info card */}
                <div className="cd-info-panel">
                  <div className="cd-info-header">
                    <FiFileText size={15} /><span>Tóm tắt hợp đồng</span>
                  </div>
                  <div className="cd-info-body">
                    <div className="cd-info-row"><FiPackage size={13} /><span>Sản phẩm</span><strong>{sc.product}</strong></div>
                    <div className="cd-info-row"><FiDollarSign size={13} /><span>Giá trị</span><strong className="cd-value-hl">{sc.valueLabel}</strong></div>
                    <div className="cd-info-row"><FiCalendar size={13} /><span>Ngày giao</span><strong>{sc.deliveryDateLabel}</strong></div>
                    <div className="cd-info-row"><FiShield size={13} /><span>Đặt cọc</span><strong>{formatMoney(sc.depositAmount)}</strong></div>
                  </div>
                </div>

                {/* Sign panel — only for unsigned pending contracts */}
                {isContractSignable(sc) && (
                  <div className="signature-panel">
                    <div className="panel-header">
                      <h4>Ký điện tử bảo mật</h4>
                      <p>Chọn phương thức xác nhận chữ ký</p>
                    </div>
                    <div className="panel-body">
                      <div className="signature-modes">
                        {["draw", "upload", "otp"].map(m => (
                          <button key={m} className={signatureMode === m ? "active" : ""} onClick={() => setSignatureMode(m)}>
                            <span className={`mode-icon ${m}-icon`} />
                            <span>{m === "draw" ? "Vẽ" : m === "upload" ? "Tải lên" : "OTP"}</span>
                          </button>
                        ))}
                      </div>

                      {signatureMode === "draw" && (
                        <div className="signature-canvas">
                          <p className="canvas-hint">Ký tại đây bằng chuột hoặc cảm ứng</p>
                          <svg className="signature-svg" viewBox="0 0 400 300">
                            <path d="M50,150 C70,140 120,130 150,150 S200,180 250,160 S300,120 350,140" fill="none" stroke="#111812" strokeLinecap="round" strokeWidth="3" />
                          </svg>
                          <button className="clear-btn">Xóa</button>
                        </div>
                      )}
                      {signatureMode === "upload" && (
                        <div className="sig-alt-area">
                          <FiCamera size={28} color="#9ca3af" />
                          <p>Tải lên ảnh chữ ký</p>
                          <span>PNG, JPG — tối đa 5MB</span>
                        </div>
                      )}
                      {signatureMode === "otp" && (
                        <div className="sig-alt-area">
                          <FiShield size={28} color="#13ec37" />
                          <p>Xác nhận qua mã OTP</p>
                          <span>Mã OTP gửi đến số điện thoại đã đăng ký</span>
                          <button className="otp-send-btn">Gửi mã OTP</button>
                        </div>
                      )}

                      <div className="agreement-box">
                        <label>
                          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                          <span>
                            Tôi xác nhận đã đọc đầy đủ nội dung hợp đồng,&nbsp;
                            <button type="button" className="cf-link-btn" onClick={() => setShowSignTerms(true)}>các điều khoản ký kết</button>
                            &nbsp;và đồng ý thực hiện. Phí trung gian {COMPANY.NAME}: <strong>{COMPANY.COMMISSION_RATE}%</strong>.
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="panel-footer">
                      <button
                        className="sign-btn"
                        disabled={!agreed || signingLoading}
                        onClick={handleSign}
                      >
                        {signingLoading ? "Đang xử lý..." : "Ký hợp đồng ngay"}
                      </button>
                      <p className="security-note"><FiShield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Mã hóa SSL 256-bit · Hiệu lực pháp lý</p>
                    </div>
                  </div>
                )}

                {/* Already-signed badge */}
                {sc.signedByFarmer && (
                  <div className="cd-signed-badge">
                    <FiCheckCircle size={24} color="#13ec37" />
                    <div>
                      <p>Bạn đã ký hợp đồng này</p>
                      {sc.signedAt && <span>{formatDate(sc.signedAt)}</span>}
                    </div>
                  </div>
                )}

                {/* Cancel button */}
                {isContractSignable(sc) && (
                  <button className="cd-cancel-btn" onClick={() => setShowCancelModal(true)}>
                    Từ chối / Hủy hợp đồng này
                  </button>
                )}

                {/* Support */}
                <div className="support-panel">
                  <h5>HỖ TRỢ KÝ KẾT</h5>
                  <p>Cần tư vấn? Kết nối với chuyên viên pháp lý {COMPANY.NAME} để được giải đáp miễn phí.</p>
                  <button>Yêu cầu gọi lại</button>
                </div>
              </div>
            </div>

            {/* ── Cancel modal ── */}
            {showCancelModal && (
              <div className="terms-modal-overlay" onClick={() => !cancelLoading && setShowCancelModal(false)}>
                <div className="terms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                  <div className="terms-modal-header">
                    <h3>Từ chối / Hủy hợp đồng</h3>
                    <button className="terms-modal-close" onClick={() => setShowCancelModal(false)} disabled={cancelLoading}>✕</button>
                  </div>
                  <div className="terms-modal-body">
                    <p style={{ marginBottom: 12, color: '#374151' }}>
                      Vui lòng cho biết lý do từ chối hợp đồng <strong>{sc.contractCode || sc.id}</strong>:
                    </p>
                    <textarea
                      className="cd-cancel-reason"
                      placeholder="Ví dụ: Giá không phù hợp, điều khoản cần điều chỉnh..."
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      rows={4}
                    />
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                      Lý do sẽ được gửi đến doanh nghiệp. Hành động này không thể hoàn tác.
                    </p>
                  </div>
                  <div className="terms-modal-footer">
                    <button className="cf-btn primary" style={{ background: '#ef4444' }} onClick={handleCancel} disabled={!cancelReason.trim() || cancelLoading}>
                      {cancelLoading ? "Đang xử lý..." : "Xác nhận hủy"}
                    </button>
                    <button className="cf-btn outline" onClick={() => setShowCancelModal(false)} disabled={cancelLoading}>Không hủy</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Terms modal ── */}
            {showSignTerms && (
              <div className="terms-modal-overlay" onClick={() => setShowSignTerms(false)}>
                <div className="terms-modal" onClick={e => e.stopPropagation()}>
                  <div className="terms-modal-header">
                    <h3>Điều khoản Ký kết Hợp đồng</h3>
                    <button className="terms-modal-close" onClick={() => setShowSignTerms(false)}>✕</button>
                  </div>
                  <div className="terms-modal-body">
                    <h4>1. Hiệu lực của chữ ký điện tử</h4>
                    <p>Chữ ký điện tử của bạn có giá trị pháp lý tương đương chữ ký tay theo Luật Giao dịch Điện tử Việt Nam. Hành động ký được ghi nhận kèm thời gian và thiết bị thực hiện.</p>
                    <h4>2. Trách nhiệm của Nông dân khi ký</h4>
                    <p>Bằng việc ký hợp đồng, bạn cam kết: (i) cung cấp nông sản đúng chủng loại, số lượng và chất lượng đã thỏa thuận; (ii) giao hàng đúng thời hạn; (iii) sản phẩm đảm bảo an toàn vệ sinh thực phẩm và có nguồn gốc xuất xứ rõ ràng.</p>
                    <h4>3. Quyền lợi của bạn</h4>
                    <p>Sau khi ký, bạn được bảo vệ bởi hệ thống Escrow: tiền thanh toán từ Doanh nghiệp được giữ an toàn và giải ngân cho bạn ngay sau khi nghiệm thu hoàn tất. {COMPANY.NAME} đảm bảo bạn không bị chiếm dụng vốn.</p>
                    <h4>4. Phí dịch vụ {COMPANY.NAME}</h4>
                    <p>Phí <strong>{COMPANY.COMMISSION_RATE}%</strong> được khấu trừ tự động khi giải ngân. Đổi lại bạn nhận được: bảo vệ giao dịch, xác minh doanh nghiệp đối tác, hỗ trợ giải quyết tranh chấp miễn phí và lưu trữ hợp đồng hợp pháp.</p>
                    <h4>5. Xử lý vi phạm</h4>
                    <p>Nếu bạn không thực hiện đúng cam kết (giao trễ, thiếu số lượng, không đạt chất lượng), Doanh nghiệp có quyền yêu cầu bồi thường tối đa 20% giá trị hợp đồng. Ngược lại, nếu Doanh nghiệp vi phạm, bạn được bảo vệ quyền lợi toàn diện qua hệ thống Escrow.</p>
                    <h4>6. Hủy và chấm dứt</h4>
                    <p>Bạn có quyền đề nghị hủy hợp đồng trong vòng 24 giờ sau khi ký nếu phát hiện thông tin không chính xác. Sau 24 giờ, việc hủy cần có sự đồng ý của Doanh nghiệp và phê duyệt của {COMPANY.NAME}.</p>
                  </div>
                  <div className="terms-modal-footer">
                    <button className="cf-btn primary" onClick={() => { setAgreed(true); setShowSignTerms(false); }}>Tôi đã đọc và đồng ý</button>
                    <button className="cf-btn outline" onClick={() => setShowSignTerms(false)}>Đóng</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ══════════════════════════════════════
          LIST VIEW
      ══════════════════════════════════════ */}
      {!sc && (
        <>
          <div className="fd-pg-tabs">
            {tabs.map(t => (
              <button key={t.key} className={`fd-pg-tab ${activeContractTab === t.key ? "active" : ""}`} onClick={() => setActiveContractTab(t.key)}>
                {t.label} {t.count > 0 && <span className="fd-pg-tab-badge">{t.count}</span>}
              </button>
            ))}
          </div>

          <div className="fd-list-area">
            {apiContracts === null && (
              <div className="fd-pg-loading">
                <div className="fd-pg-spinner" /><p>Đang tải hợp đồng...</p>
              </div>
            )}
            {apiContracts !== null && filteredContracts.length === 0 && (
              <div className="fd-empty">
                <FiFileText size={40} color="#d1d5db" />
                <h4>Không có hợp đồng nào</h4>
                <p>{activeContractTab === "pending" ? "Hợp đồng từ doanh nghiệp sẽ xuất hiện ở đây để bạn xem xét và ký kết." : "Không có hợp đồng nào trong mục này."}</p>
              </div>
            )}
            {filteredContracts.map(contract => {
              const lcCls = getContractListClass(contract.status);
              const bdgCls = getContractBadgeClass(contract.status);
              return (
                <div key={contract.id} className={`fd-list-card ${lcCls}`}>
                  <div className="fd-list-card-top">
                    <div>
                      <div className="fd-list-title">{contract.buyer}</div>
                      <div className="fd-list-code">{contract.id}</div>
                    </div>
                    <span className={`fds ${bdgCls}`}>{CONTRACT_STATUS_VI[contract.status] || contract.status}</span>
                  </div>
                  <div className="fd-list-fields">
                    <div className="fd-list-field"><span className="fd-list-field-label">Sản phẩm</span><strong className="fd-list-field-value">{contract.product}</strong></div>
                    <div className="fd-list-field"><span className="fd-list-field-label">Số lượng</span><strong className="fd-list-field-value">{contract.quantityLabel}</strong></div>
                    <div className="fd-list-field"><span className="fd-list-field-label">Giá trị</span><strong className="fd-list-field-value hl">{contract.valueLabel}</strong></div>
                    <div className="fd-list-field"><span className="fd-list-field-label">Ngày giao</span><strong className="fd-list-field-value">{contract.deliveryDateLabel || "—"}</strong></div>
                  </div>
                  <div className="fd-list-card-footer">
                    <span className="fd-list-date">{contract.dateLabel && `Tạo: ${contract.dateLabel}`}</span>
                    {isContractSignable(contract) && (
                      <>
                        <button className="fd-btn fd-btn-green fd-btn-sm" onClick={() => openContract(contract)}>
                          <FiCheck size={12} />Ký hợp đồng
                        </button>
                        <button className="fd-btn fd-btn-white fd-btn-sm" onClick={() => openContract(contract)}>
                          <FiEye size={12} />Xem chi tiết
                        </button>
                      </>
                    )}
                    {(isActiveContractStatus(contract.status) || contract.signedByFarmer) && (
                      <button className="fd-btn fd-btn-white fd-btn-sm" onClick={() => openContract(contract)}>
                        <FiEye size={12} />Xem hợp đồng
                      </button>
                    )}
                    {isCompletedContractStatus(contract.status) && (
                      <button className="fd-btn fd-btn-white fd-btn-sm" onClick={() => openContract(contract)}>
                        <FiFileText size={12} />Xem báo cáo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '0 28px 32px' }}>
            <div className="fd-sec-card">
              <div className="fd-sec-head"><h3>Hoạt động gần đây</h3></div>
              <div className="fd-sec-body" style={{ padding: 0 }}>
                {contracts.length === 0
                  ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontSize: 13 }}>Chưa có hoạt động nào</p>
                  : contracts.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < 2 ? '1px solid #f0f4f1' : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActiveContractStatus(c.status) ? '#13ec37' : '#f59e0b', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111812', margin: '0 0 2px' }}>{CONTRACT_STATUS_VI[c.status] || 'Chờ xử lý'}: {c.buyer}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{c.product} · {c.quantityLabel}</p>
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{c.dateLabel}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* =========================================
   ĐƠN HÀNG — Order management
   ========================================= */
function DonHangContent({ searchQuery = "" }) {
  const { showToast } = useToast();
  const [orderStatus, setOrderStatus] = useState("tatca");
  const [apiOrders, setApiOrders] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // orderId being acted on
  // Shipping modal state
  const [shippingModal, setShippingModal] = useState(null); // { order } | null
  const [shippingCarrier, setShippingCarrier] = useState("");
  const [shippingNote, setShippingNote] = useState("");

  const CARRIERS = [
    "Giao hàng nhanh (GHN)",
    "Giao hàng tiết kiệm (GHTK)",
    "Viettel Post",
    "Vietnam Post",
    "J&T Express",
    "Shopee Express",
    "Tự vận chuyển",
  ];

  const ORDER_STEPS = ["Xác nhận", "Chuẩn bị", "Giao hàng", "Kiểm tra", "Hoàn thành"];
  const ORDER_STEP_IDX = { confirmed: 0, processing: 1, shipping: 2, quality_check: 3, delivered: 4, completed: 4 };

  const loadOrders = useCallback(async () => {
    try {
      const res = await farmerService.getOrders();
      setApiOrders(res?.data?.orders || []);
    } catch { setApiOrders([]); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Map raw API orders to display objects
  const orders = (apiOrders || []).map(o => ({
    id: o.id || o._id,
    contractCode: o.contractCode,
    shop: o.enterpriseName || "Doanh nghiệp",
    product: o.productName,
    quantity: o.quantity,          // already formatted: "100 kg"
    value: o.value || 0,
    status: o.status || "confirmed",
    deliveryDate: o.deliveryDate ? formatDate(o.deliveryDate) : "Chờ xác nhận",
    escrowStatus: o.escrowStatus || "none",
    currentMilestone: o.currentMilestone || null,
    expectedHarvestDate: o.expectedHarvestDate || null,
    shippingAllowed: o.shippingAllowed !== false,
    shippingRestrictionReason: o.shippingRestrictionReason || "",
    completedSteps: o.completedSteps || 0,
    totalSteps: o.totalSteps || 5,
    // escrow id stored separately in raw object
    escrowId: o.escrowId || null,
    _raw: o,
  }));

  const STATUS_LABEL = {
    confirmed: "Đã xác nhận",
    processing: "Chuẩn bị hàng",
    shipping: "Đang giao hàng",
    quality_check: "Kiểm tra chất lượng",
    delivered: "Đã giao",
    completed: "Hoàn thành",
  };

  // Duyệt một lần để tính số lượng theo trạng thái, tránh filter lặp nhiều lần khi render tab.
  const statusCounts = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const tabs = [
    { key: "tatca", label: "Tất cả", count: orders.length },
    { key: "confirmed", label: "Đã xác nhận", count: statusCounts.confirmed || 0 },
    { key: "processing", label: "Chuẩn bị", count: statusCounts.processing || 0 },
    { key: "shipping", label: "Đang giao", count: statusCounts.shipping || 0 },
    { key: "quality_check", label: "Kiểm tra", count: statusCounts.quality_check || 0 },
    { key: "delivered", label: "Đã giao", count: statusCounts.delivered || 0 },
  ];

  const getStatusBadge = (s) => {
    const cls = { confirmed: 'fds-blue', processing: 'fds-green', shipping: 'fds-amber', quality_check: 'fds-purple', delivered: 'fds-green', completed: 'fds-gray' }[s] || 'fds-gray';
    return <span className={`fds ${cls}`}>{STATUS_LABEL[s] || s}</span>;
  };

  const normalizedSearch = (searchQuery || "").trim().toLowerCase();

  const filtered = orders
    .filter(o => orderStatus === "tatca" || o.status === orderStatus)
    .filter(o => !normalizedSearch || o.product?.toLowerCase().includes(normalizedSearch) || o.contractCode?.toLowerCase().includes(normalizedSearch));

  // Farmer confirms step 2 (prepared goods)
  const handleConfirmPrepared = async (order) => {
    if (!order.escrowId) {
      showToast("Không tìm thấy thông tin ký quỹ.", "error");
      return;
    }
    setActionLoading(order.id);
    try {
      await escrowService.farmerConfirm(order.escrowId, 2);
      showToast("Đã xác nhận chuẩn bị hàng hóa!", "success");
      await loadOrders();
    } catch (err) {
      showToast(err?.message || "Xác nhận thất bại", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Open shipping modal (step 3)
  const openShippingModal = (order) => {
    if (!order.shippingAllowed) {
      showToast(order.shippingRestrictionReason || "Chưa đến ngày thu hoạch nên chưa thể lên đơn vận chuyển.", "warning");
      return;
    }
    setShippingModal(order);
    setShippingCarrier("");
    setShippingNote("");
  };

  // Farmer confirms step 3 (shipped) + carrier info
  const handleConfirmShipped = async () => {
    if (!shippingModal?.escrowId) {
      showToast("Không tìm thấy thông tin ký quỹ.", "error");
      return;
    }
    if (!shippingCarrier) {
      showToast("Vui lòng chọn đơn vị vận chuyển.", "warning");
      return;
    }
    setActionLoading(shippingModal.id);
    const evidence = `Đơn vị vận chuyển: ${shippingCarrier}${shippingNote ? ` | Ghi chú: ${shippingNote}` : ""}`;
    try {
      await escrowService.farmerConfirm(shippingModal.escrowId, 3, evidence);
      showToast("Đã xác nhận gửi hàng! Hệ thống sẽ thông báo doanh nghiệp khi hàng đến.", "success");
      setShippingModal(null);
      await loadOrders();
    } catch (err) {
      showToast(err?.message || "Xác nhận thất bại", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="fd-pg-header">
        <div>
          <h2>Đơn hàng của tôi</h2>
          <p className="fd-pg-subtitle">Quản lý và theo dõi tiến độ các đơn hàng bao tiêu</p>
        </div>
      </div>
      <div className="fd-pg-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`fd-pg-tab ${orderStatus === t.key ? "active" : ""}`} onClick={() => setOrderStatus(t.key)}>
            {t.label} {t.count > 0 && <span className="fd-pg-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="fd-list-area">
        {apiOrders === null && (
          <div className="fd-pg-loading">
            <div className="fd-pg-spinner" /><p>Đang tải đơn hàng...</p>
          </div>
        )}
        {apiOrders !== null && filtered.length === 0 && (
          <div className="fd-empty">
            <FiPackage size={40} color="#d1d5db" />
            <h4>Chưa có đơn hàng nào</h4>
            <p>Các đơn hàng từ hợp đồng bao tiêu sẽ xuất hiện ở đây.</p>
          </div>
        )}
        {filtered.map(order => {
          const curIdx = ORDER_STEP_IDX[order.status] ?? -1;
          return (
            <div key={order.id} className="fd-order-card">
              <div className="fd-order-card-head">
                <div>
                  <div className="fd-order-partner">{order.shop}</div>
                  <div className="fd-order-code">Mã HĐ: {order.contractCode}</div>
                </div>
                {getStatusBadge(order.status)}
              </div>
              <div className="fd-order-card-body">
                <div className="fd-order-info">
                  <h4>{order.product}</h4>
                  <p>Số lượng: <strong>{order.quantity}</strong></p>
                  {order.currentMilestone && <p style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><FiMapPin size={13} /> {order.currentMilestone}</p>}
                </div>
                <div className="fd-order-price">
                  <div className="fd-order-amount">{order.value.toLocaleString('vi-VN')}</div>
                  <div className="fd-order-amount-label">VNĐ</div>
                </div>
              </div>
              <div className="fd-order-tracker">
                {ORDER_STEPS.map((step, i) => {
                  const state = i < curIdx ? 'done' : i === curIdx ? 'current' : 'idle';
                  return (
                    <div key={step} className={`fd-ot-step ${state}`}>
                      <div className="fd-ot-dot">{state === 'done' ? '✓' : i + 1}</div>
                      <div className="fd-ot-label">{step}</div>
                    </div>
                  );
                })}
              </div>
              <div className="fd-order-card-foot">
                <span className="fd-order-delivery" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiCalendar size={12} /> Giao: {order.deliveryDate}</span>
                <div className="fd-order-actions">
                  {order.status === "confirmed" && (
                    <button className="fd-btn fd-btn-green fd-btn-sm" disabled={actionLoading === order.id} onClick={() => handleConfirmPrepared(order)}>
                      {actionLoading === order.id ? "Đang xử lý..." : "Xác nhận chuẩn bị hàng"}
                    </button>
                  )}
                  {order.status === "processing" && (
                    <button
                      className="fd-btn fd-btn-green fd-btn-sm"
                      disabled={actionLoading === order.id || !order.shippingAllowed}
                      onClick={() => openShippingModal(order)}
                      title={!order.shippingAllowed ? (order.shippingRestrictionReason || "Chưa đến ngày thu hoạch") : ""}
                    >
                      {actionLoading === order.id ? "Đang xử lý..." : "Xác nhận giao hàng"}
                    </button>
                  )}
                  {order.status === "processing" && !order.shippingAllowed && (
                    <span style={{ color: '#b45309', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiClock size={13} /> {order.shippingRestrictionReason || "Chưa đến ngày thu hoạch"}
                    </span>
                  )}
                  {(order.status === "shipping" || order.status === "quality_check") && (
                    <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>Chờ doanh nghiệp xác nhận nhận hàng</span>
                  )}
                  {order.status === "delivered" && (
                    <span style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><FiCheck size={14} /> Đã giao hàng thành công</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== SHIPPING CONFIRMATION MODAL ===== */}
      {shippingModal && (
        <div
          onClick={() => setShippingModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 500,
              background: "#ffffff",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              padding: "18px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.1rem",
                }}><FiTruck size={18} color="#fff" /></div>
                <div>
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>Xác nhận giao hàng</h3>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.78rem" }}>Bước 3 — Chuẩn bị hàng</p>
                </div>
              </div>
              <button
                onClick={() => setShippingModal(null)}
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
                  width: 32, height: 32, borderRadius: "50%",
                  color: "#fff", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s",
                }}
              >✕</button>
            </div>

            {/* Order info strip */}
            <div style={{
              background: "#f0fdf4", borderBottom: "1px solid #bbf7d0",
              padding: "12px 24px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: '#dcfce7', borderRadius: 8, flexShrink: 0 }}><FiFeather size={18} color="#15803d" /></span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: "0.95rem" }}>{shippingModal.product}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.82rem" }}>Số lượng: {shippingModal.quantity}</p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>
                  Đơn vị vận chuyển <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={shippingCarrier}
                  onChange={e => setShippingCarrier(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: `2px solid ${shippingCarrier ? "#16a34a" : "#e5e7eb"}`,
                    fontSize: "0.9rem", color: "#111827", background: "#fff",
                    outline: "none", transition: "border-color 0.2s", cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">-- Chọn đơn vị vận chuyển --</option>
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#374151", fontSize: "0.9rem" }}>
                  Ghi chú <span style={{ color: "#9ca3af", fontWeight: 400 }}>(tuỳ chọn)</span>
                </label>
                <textarea
                  value={shippingNote}
                  onChange={e => setShippingNote(e.target.value)}
                  placeholder="Mã vận đơn, thông tin bổ sung..."
                  rows={3}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "2px solid #e5e7eb", fontSize: "0.9rem", color: "#111827",
                    resize: "vertical", outline: "none", fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: 10, padding: "12px 16px",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <FiAlertTriangle size={16} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#92400e", lineHeight: 1.6 }}>
                  Sau khi xác nhận, hệ thống sẽ tự động thông báo doanh nghiệp sau 2 ngày để xác nhận nhận hàng.
                  <strong> 40% giá trị hợp đồng</strong> sẽ được giải ngân khi doanh nghiệp xác nhận.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid #f3f4f6",
              display: "flex", gap: 10, justifyContent: "flex-end",
              background: "#fafafa",
            }}>
              <button
                onClick={() => setShippingModal(null)}
                style={{
                  padding: "10px 22px", borderRadius: 10,
                  border: "1.5px solid #d1d5db", background: "#fff",
                  color: "#374151", fontWeight: 600, fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >Hủy</button>
              <button
                disabled={!shippingCarrier || actionLoading === shippingModal.id}
                onClick={handleConfirmShipped}
                style={{
                  padding: "10px 24px", borderRadius: 10,
                  border: "none",
                  background: !shippingCarrier || actionLoading === shippingModal.id
                    ? "#d1d5db" : "linear-gradient(135deg, #16a34a, #15803d)",
                  color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                  cursor: !shippingCarrier || actionLoading === shippingModal.id ? "not-allowed" : "pointer",
                  boxShadow: !shippingCarrier || actionLoading === shippingModal.id ? "none" : "0 4px 12px rgba(22,163,74,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {actionLoading === shippingModal.id ? "Đang xử lý..." : "✓ Xác nhận đã giao hàng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================
   ĐĂNG BÁN — Post new product
   ========================================= */
function DangBanContent() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ cropType: "", variety: "", area: "", plantDate: "", harvestDate: "", estimatedYield: "", desiredPrice: "", minBuyoutPercent: "" });
  const [certFile, setCertFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const certInputRef = useRef(null);
  const photoInputRef = useRef(null);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleCertChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > FILE_SIZE_LIMIT) {
      toast.warning(`File "${file.name}" quá lớn (tối đa 5MB). Vui lòng chọn file nhỏ hơn.`);
      return;
    }
    setCertFile(file);
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files).filter(f => {
      if (f.size > FILE_SIZE_LIMIT) {
        toast.warning(`Ảnh "${f.name}" quá lớn (tối đa 5MB). Đã bỏ qua.`);
        return false;
      }
      return true;
    });
    if (!files.length) return;
    const merged = [...photoFiles, ...files].slice(0, 10);
    setPhotoFiles(merged);
    const previews = merged.map(f => URL.createObjectURL(f));
    setPhotoPreviews(previews);
  };

  const removePhoto = (idx) => {
    const updated = photoFiles.filter((_, i) => i !== idx);
    setPhotoFiles(updated);
    setPhotoPreviews(updated.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Upload first photo to server; get back a real URL (not base64)
      let imageUrl = undefined;
      if (photoFiles.length > 0) {
        try {
          imageUrl = await productService.uploadImage(photoFiles[0]);
        } catch {
          toast.warning("Không thể tải ảnh lên. Sản phẩm sẽ được đăng mà không có ảnh.");
        }
      }

      const detectCategory = (name) => {
        const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (/xoai|thanh long|buoi|cam|quit|dua hau|chuoi|mit|sau rieng|vai|nhan|chom chom|man|dao|le|tao|khe|oi|na/.test(n)) return "fruit";
        if (/lua|gao|nep/.test(n)) return "rice";
        if (/ca phe|cafe|coffee/.test(n)) return "coffee";
        if (/che|tra xanh|tra/.test(n)) return "tea";
        if (/ot|tieu|gung|nghe|que|hoi|xa|rieng/.test(n)) return "spice";
        if (/rau|cai|cu cai|bong cai|ca rot|hanh|toi|bap cai|mung|dau/.test(n)) return "vegetable";
        if (/ngo|bap|lua mi|dau tuong|dau phong|khoai mi|san/.test(n)) return "grain";
        return "other";
      };
      const priceNum = parseInt(String(formData.desiredPrice).replace(/[^0-9]/g, ""), 10) || 0;
      const totalQty = parseFloat(formData.estimatedYield) * 1000 || 1000;
      const productData = {
        name: formData.variety
          ? `${formData.cropType} ${formData.variety}`.trim()
          : formData.cropType,
        location: user?.province || user?.location || "Việt Nam",
        farm: formData.variety || `Nông trại ${user?.fullName || ""}`.trim() || "Nông trại",
        category: detectCategory(formData.cropType),
        region: formData.region || "south",
        priceMin: priceNum,
        priceMax: Math.round(priceNum * 1.15) || priceNum + 5000,
        unit: "kg",
        totalQuantity: totalQty,
        remaining: totalQty,
        progress: 0,
        expectedDate: formData.harvestDate || undefined,
        certifications: certFile ? [certFile.name] : [],
        ...(imageUrl && { image: imageUrl }),
      };
      await productService.create(productData);
      toast.success("Đăng bán sản phẩm thành công!");
      setCurrentStep(1);
      setFormData({ cropType: "", variety: "", area: "", plantDate: "", harvestDate: "", estimatedYield: "", desiredPrice: "", minBuyoutPercent: "", region: "" });
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setCertFile(null);
    } catch (err) {
      toast.error(err?.message || "Đăng bán thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["Sản phẩm", "Mùa vụ", "Giá & Bao tiêu", "Chứng chỉ & Ảnh"];
  const stepIcons = [<FiFeather size={18} />, <FiCalendar size={18} />, <FiDollarSign size={18} />, <FiCamera size={18} />];
  const stepDescs = ["Tên và loại cây trồng", "Thời vụ và sản lượng", "Mức giá và điều kiện", "Giấy tờ và hình ảnh"];
  const regionLabels = { north: "Miền Bắc", central: "Miền Trung", south: "Miền Nam" };

  const pricePreview = parseInt(String(formData.desiredPrice).replace(/[^0-9]/g, ""), 10) || 0;
  const qtyPreview = parseFloat(formData.estimatedYield) * 1000 || 0;
  const totalValuePreview = pricePreview * qtyPreview;

  const canNext = () => {
    if (currentStep === 1) return formData.cropType.trim().length > 0;
    if (currentStep === 2) return !!formData.estimatedYield && parseFloat(formData.estimatedYield) > 0;
    if (currentStep === 3) return !!formData.desiredPrice && pricePreview > 0;
    return true;
  };

  const productDisplayName = [formData.cropType, formData.variety].filter(Boolean).join(" ") || "Tên sản phẩm";

  return (
    <>
      <div className="fd-pg-header">
        <div>
          <h2>Đăng ký Bán Nông sản Mới</h2>
          <p className="fd-pg-subtitle">Điền thông tin để kết nối với nhà bao tiêu uy tín trên toàn quốc.</p>
        </div>
      </div>

      <div className="db2-wrap">
        {/* LEFT: Wizard */}
        <div className="db2-main">
          {/* Step indicator */}
          <div className="db2-steps">
            {stepLabels.map((label, i) => {
              const num = i + 1;
              const state = num < currentStep ? "done" : num === currentStep ? "active" : "idle";
              return (
                <div key={num} className={`db2-step ${state}`}>
                  <div className="db2-step-circle">
                    {state === "done" ? <FiCheck size={16} /> : stepIcons[i]}
                  </div>
                  <div className="db2-step-info">
                    <span className="db2-step-label">{label}</span>
                    <span className="db2-step-desc">{stepDescs[i]}</span>
                  </div>
                  {num < stepLabels.length && <div className="db2-step-connector" />}
                </div>
              );
            })}
          </div>

          {/* Form card */}
          <div className="db2-card">
            {/* Step 1: Nông sản */}
            {currentStep === 1 && (
              <div className="db2-step-body">
                <div className="db2-card-header">
                  <span className="db2-card-icon"><FiFeather size={30} /></span>
                  <div>
                    <h3>Thông tin nông sản</h3>
                    <p>Nhập tên sản phẩm và thông tin cơ bản</p>
                  </div>
                </div>
                <div className="db2-grid">
                  <div className="db2-field span-2">
                    <label>Tên / Loại nông sản <span className="db2-req">*</span></label>
                    <input className="db2-input" type="text" value={formData.cropType}
                      onChange={e => handleInputChange("cropType", e.target.value)}
                      placeholder="VD: Xoài, Lúa ST25, Cà phê Arabica, Thanh long ruột đỏ..." />
                    <span className="db2-hint">Nhập tên đầy đủ để doanh nghiệp dễ tìm kiếm</span>
                  </div>
                  <div className="db2-field">
                    <label>Giống / Phân loại</label>
                    <input className="db2-input" type="text" value={formData.variety}
                      onChange={e => handleInputChange("variety", e.target.value)}
                      placeholder="VD: Cát Hòa Lộc, ST25..." />
                  </div>
                  <div className="db2-field">
                    <label>Diện tích canh tác (ha)</label>
                    <div className="db2-input-suffix">
                      <input className="db2-input" type="number" min="0" step="0.1" value={formData.area}
                        onChange={e => handleInputChange("area", e.target.value)} placeholder="0.0" />
                      <span>ha</span>
                    </div>
                  </div>
                  <div className="db2-field span-2">
                    <label>Khu vực sản xuất</label>
                    <div className="db2-region-group">
                      {Object.entries(regionLabels).map(([key, label]) => (
                        <button key={key} type="button"
                          className={`db2-region-btn ${(formData.region || "south") === key ? "active" : ""}`}
                          onClick={() => handleInputChange("region", key)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Mùa vụ */}
            {currentStep === 2 && (
              <div className="db2-step-body">
                <div className="db2-card-header">
                  <span className="db2-card-icon"><FiCalendar size={30} /></span>
                  <div>
                    <h3>Thông tin mùa vụ</h3>
                    <p>Thời gian canh tác và sản lượng dự kiến</p>
                  </div>
                </div>
                <div className="db2-grid">
                  <div className="db2-field">
                    <label>Ngày bắt đầu gieo / trồng</label>
                    <input className="db2-input" type="date" value={formData.plantDate}
                      onChange={e => handleInputChange("plantDate", e.target.value)} />
                  </div>
                  <div className="db2-field">
                    <label>Ngày thu hoạch dự kiến <span className="db2-req">*</span></label>
                    <input className="db2-input" type="date" value={formData.harvestDate}
                      onChange={e => handleInputChange("harvestDate", e.target.value)} />
                  </div>
                  <div className="db2-field span-2">
                    <label>Sản lượng ước tính <span className="db2-req">*</span></label>
                    <div className="db2-input-suffix">
                      <input className="db2-input" type="number" min="0" step="0.1" value={formData.estimatedYield}
                        onChange={e => handleInputChange("estimatedYield", e.target.value)} placeholder="0.0" />
                      <span>tấn</span>
                    </div>
                    {qtyPreview > 0 && (
                      <div className="db2-computed-box">
                        <FiPackage size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Tương đương <strong>{qtyPreview.toLocaleString("vi-VN")} kg</strong>
                      </div>
                    )}
                    <span className="db2-hint">Nhập sản lượng dự kiến, đơn vị tính bằng tấn</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Giá & Bao tiêu */}
            {currentStep === 3 && (
              <div className="db2-step-body">
                <div className="db2-card-header">
                  <span className="db2-card-icon"><FiDollarSign size={30} /></span>
                  <div>
                    <h3>Giá và điều kiện bao tiêu</h3>
                    <p>Thiết lập mức giá và tỉ lệ bao tiêu mong muốn</p>
                  </div>
                </div>
                <div className="db2-grid">
                  <div className="db2-field span-2">
                    <label>Giá mong muốn <span className="db2-req">*</span></label>
                    <div className="db2-input-suffix">
                      <input className="db2-input" type="text" value={formData.desiredPrice}
                        onChange={e => handleInputChange("desiredPrice", e.target.value)} placeholder="50,000" />
                      <span>VNĐ/kg</span>
                    </div>
                    {pricePreview > 0 && qtyPreview > 0 && (
                      <div className="db2-computed-box">
                        <FiDollarSign size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Ước tính tổng giá trị: <strong>{totalValuePreview.toLocaleString("vi-VN")} VNĐ</strong>
                        {" "}· Giá niêm yết: <strong>{pricePreview.toLocaleString("vi-VN")}đ – {Math.round(pricePreview * 1.15).toLocaleString("vi-VN")}đ/kg</strong>
                      </div>
                    )}
                  </div>
                  <div className="db2-field span-2">
                    <label>Tỉ lệ bao tiêu tối thiểu chấp nhận (%)</label>
                    <div className="db2-buyout-slider">
                      <input className="db2-input" type="number" min="0" max="100"
                        value={formData.minBuyoutPercent}
                        onChange={e => handleInputChange("minBuyoutPercent", e.target.value)} placeholder="50" />
                      <div className="db2-buyout-presets">
                        {[25, 50, 75, 100].map(v => (
                          <button key={v} type="button"
                            className={`db2-preset-btn ${formData.minBuyoutPercent === String(v) ? "active" : ""}`}
                            onClick={() => handleInputChange("minBuyoutPercent", String(v))}>
                            {v}%
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="db2-hint">Tỉ lệ tối thiểu sản lượng bạn muốn được bao tiêu</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Chứng chỉ & Ảnh */}
            {currentStep === 4 && (
              <div className="db2-step-body">
                <div className="db2-card-header">
                  <span className="db2-card-icon"><FiCamera size={30} /></span>
                  <div>
                    <h3>Chứng chỉ và hình ảnh</h3>
                    <p>Tải lên ảnh thực tế và giấy tờ chứng nhận</p>
                  </div>
                </div>
                <div className="db2-upload-grid">
                  {/* Photos */}
                  <div className="db2-field span-2">
                    <label>Ảnh thực tế <span className="db2-req">*</span>
                      <span className="db2-hint-inline"> · tối thiểu 3 ảnh, tối đa 10</span>
                    </label>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoChange} />
                    {photoPreviews.length < 10 && (
                      <div className="db2-upload-box" onClick={() => photoInputRef.current.click()}>
                        <span className="db2-upload-icon"><FiCamera size={36} /></span>
                        <p className="db2-upload-title">
                          {photoFiles.length > 0 ? `Đã chọn ${photoFiles.length} ảnh — nhấn để thêm` : "Nhấn để tải ảnh lên"}
                        </p>
                        <p className="db2-upload-sub">JPG, PNG · tối đa 5MB mỗi ảnh</p>
                      </div>
                    )}
                    {photoPreviews.length > 0 && (
                      <div className="db2-photo-grid">
                        {photoPreviews.map((src, i) => (
                          <div key={i} className="db2-photo-item">
                            <img src={src} alt={`preview-${i}`} />
                            {i === 0 && <span className="db2-photo-main-tag">Ảnh chính</span>}
                            <button className="db2-photo-remove" onClick={e => { e.stopPropagation(); removePhoto(i); }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {photoFiles.length < 3 && (
                      <div className="db2-upload-warn"><FiAlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Cần ít nhất 3 ảnh để tăng độ tin cậy</div>
                    )}
                  </div>

                  {/* Certificate */}
                  <div className="db2-field span-2">
                    <label>Chứng nhận VietGAP / GlobalGAP / Hữu cơ
                      <span className="db2-hint-inline"> · không bắt buộc</span>
                    </label>
                    <input ref={certInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleCertChange} />
                    <div className={`db2-cert-box ${certFile ? "has-file" : ""}`} onClick={() => certInputRef.current.click()}>
                      {certFile ? (
                        <>
                          <span className="db2-cert-icon"><FiCheckCircle size={28} /></span>
                          <div>
                            <p className="db2-cert-name">{certFile.name}</p>
                            <p className="db2-cert-hint">Nhấn để đổi file</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="db2-cert-icon"><FiFileText size={28} /></span>
                          <div>
                            <p className="db2-cert-name">Tải lên chứng nhận</p>
                            <p className="db2-cert-hint">PDF, JPG, PNG · tối đa 5MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="db2-nav">
              <button className="db2-btn-back" type="button"
                onClick={() => currentStep > 1 && setCurrentStep(s => s - 1)}
                disabled={currentStep === 1}>
                ← Quay lại
              </button>
              <div className="db2-step-dots">
                {stepLabels.map((_, i) => (
                  <span key={i} className={`db2-dot ${currentStep === i + 1 ? "active" : currentStep > i + 1 ? "done" : ""}`} />
                ))}
              </div>
              <button className="db2-btn-next" type="button" disabled={submitting || (!canNext() && currentStep < 4)}
                onClick={() => {
                  if (currentStep < 4) setCurrentStep(s => s + 1);
                  else handleSubmit();
                }}>
                {submitting ? "Đang gửi..." : currentStep === 4 ? "Đăng bán ngay" : "Tiếp theo →"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Live preview */}
        <div className="db2-sidebar">
          <div className="db2-preview-card">
            <p className="db2-preview-label"><FiEye size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />Xem trước sản phẩm</p>
            <div className="db2-preview-img">
              {photoPreviews[0]
                ? <img src={photoPreviews[0]} alt="preview" />
                : <div className="db2-preview-placeholder"><FiFeather size={24} color="#16a34a" /><p>Ảnh sẽ hiển thị ở đây</p></div>
              }
            </div>
            <div className="db2-preview-body">
              <h4 className="db2-preview-name">{productDisplayName}</h4>
              <p className="db2-preview-loc"><FiMapPin size={12} style={{ marginRight: 3, verticalAlign: 'middle' }} />{user?.province || "Địa điểm của bạn"}</p>
              {pricePreview > 0 && (
                <p className="db2-preview-price">
                  {pricePreview.toLocaleString("vi-VN")}đ – {Math.round(pricePreview * 1.15).toLocaleString("vi-VN")}đ
                  <span>/kg</span>
                </p>
              )}
              <div className="db2-preview-tags">
                {formData.region && <span className="db2-tag">{regionLabels[formData.region]}</span>}
                {certFile && <span className="db2-tag db2-tag-green"><FiCheckCircle size={10} style={{ marginRight: 3 }} />VietGAP</span>}
                {qtyPreview > 0 && <span className="db2-tag"><FiPackage size={10} style={{ marginRight: 3 }} />{qtyPreview.toLocaleString("vi-VN")} kg</span>}
              </div>
              {totalValuePreview > 0 && (
                <div className="db2-preview-value">
                  <FiDollarSign size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />Tổng giá trị ước tính<br />
                  <strong>{(totalValuePreview / 1_000_000).toFixed(1)} triệu VNĐ</strong>
                </div>
              )}
            </div>
          </div>

          <div className="db2-tips-card">
            <p className="db2-tips-title"><FiInfo size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Mẹo tăng tỉ lệ bao tiêu</p>
            <ul className="db2-tips-list">
              <li><FiCamera size={12} style={{ marginRight: 5 }} />Ảnh rõ nét, chụp thực tế tăng <strong>3×</strong> tỉ lệ quan tâm</li>
              <li><FiCheckCircle size={12} style={{ marginRight: 5 }} />Chứng nhận VietGAP thu hút DN lớn</li>
              <li><FiDollarSign size={12} style={{ marginRight: 5 }} />Giá hợp lý so thị trường → nhiều đề xuất hơn</li>
              <li><FiCalendar size={12} style={{ marginRight: 5 }} />Ghi đúng ngày thu hoạch để DN chủ động kế hoạch</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

/* =========================================
   FARMER ESCROW — Thanh toán trung gian
   ========================================= */
function FarmerEscrowContent() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [apiEscrows, setApiEscrows] = useState(null);
  const [apiBalance, setApiBalance] = useState(null);
  const toast = useToast();

  // Normalise populated Mongoose fields from the API response
  const mapEscrow = (e) => ({
    ...e,
    id: e._id || e.id,
    productName:    e.contractId?.productName    || e.productName    || 'Nông sản',
    contractCode:   e.contractId?.contractCode   || e.contractCode   || '—',
    enterpriseName: e.enterpriseId?.fullName     || e.enterpriseName || 'Doanh nghiệp',
    farmerName:     e.farmerId?.fullName          || e.farmerName     || 'Nông dân',
    createdAt:      formatDate(e.createdAt),
  });

  const loadEscrowList = useCallback(async () => {
    const escRes = await escrowService.list().catch(() => null);
    if (escRes?.data?.escrows) {
      setApiEscrows(escRes.data.escrows.map(mapEscrow));
      return;
    }
    setApiEscrows([]);
  }, []);

  const loadEscrowData = useCallback(async () => {
    try {
      const [balRes] = await Promise.all([
        escrowService.getBalance().catch(() => null),
        loadEscrowList(),
      ]);
      if (balRes?.data?.balance != null) {
        setApiBalance(balRes.data.balance);
      }
    } catch {
      setApiEscrows([]);
    }
  }, [loadEscrowList]);

  useEffect(() => {
    loadEscrowData();
  }, [loadEscrowData]);

  const balance = apiBalance ?? 0;

  const escrows = apiEscrows || [];

  const fmtMoney = (v) => formatMoney(v || 0);

  const statusLabels = {
    awaiting_deposit: "Chờ ký quỹ",
    funded: "Đã ký quỹ",
    partially_released: "Đang giải ngân",
    fully_released: "Hoàn tất",
    refunded: "Đã hoàn trả",
    disputed: "Tranh chấp",
  };

  const milestoneStatusLabels = {
    pending: "Chờ xử lý",
    in_progress: "Đang thực hiện",
    completed: "Hoàn thành",
    disputed: "Tranh chấp",
  };

  const totalReceived = escrows.reduce((s, e) => s + e.releasedAmount, 0);
  const totalPending = escrows.reduce((s, e) => s + (e.depositedAmount - e.releasedAmount), 0);
  const activeCount = escrows.filter(e => !["fully_released", "refunded"].includes(e.status)).length;

  const tabs = [
    { key: "overview", label: "Tổng quan" },
    { key: "active", label: "Đang hoạt động", count: activeCount },
    { key: "completed", label: "Hoàn tất", count: escrows.filter(e => e.status === "fully_released").length },
    { key: "all", label: "Tất cả", count: escrows.length },
  ];

  const filteredEscrows = activeTab === "active"
    ? escrows.filter(e => !["fully_released", "refunded"].includes(e.status))
    : activeTab === "completed"
    ? escrows.filter(e => e.status === "fully_released")
    : activeTab === "all"
    ? escrows
    : [];

  return (
    <>
      <div className="fd-pg-header">
        <div>
          <h2>Thanh toán trung gian</h2>
          <p className="fd-pg-subtitle">Theo dõi toàn bộ giao dịch ký quỹ và các mốc giải ngân</p>
        </div>
      </div>

      {/* Balance */}
      <div className="fd-escrow-bal">
        <div className="fd-escrow-bal-left">
          <span className="bal-label">Số dư nhận được từ Escrow</span>
          <span className="bal-amount">{fmtMoney(balance)}</span>
          <span className="bal-note">Tiền giải ngân tự động khi doanh nghiệp xác nhận đạt chuẩn</span>
        </div>
        <div className="fd-escrow-bal-ico">
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
      </div>

      {/* Stats */}
      <div className="fd-stat-row">
        <div className="fd-stat-box">
          <div className="fd-stat-ico green">
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div className="fd-stat-txt">
            <span>Đã nhận</span>
            <strong>{fmtMoney(totalReceived)}</strong>
            <small className="ok">Tổng giải ngân</small>
          </div>
        </div>
        <div className="fd-stat-box">
          <div className="fd-stat-ico amber">
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="fd-stat-txt">
            <span>Chờ giải ngân</span>
            <strong>{fmtMoney(totalPending)}</strong>
            <small>Đang giữ trong escrow</small>
          </div>
        </div>
        <div className="fd-stat-box">
          <div className="fd-stat-ico blue">
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="fd-stat-txt">
            <span>Escrow hoạt động</span>
            <strong>{activeCount}</strong>
            <small>giao dịch</small>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fd-pg-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`fd-pg-tab ${activeTab === t.key ? "active" : ""}`} onClick={() => { setActiveTab(t.key); setSelectedEscrow(null); }}>
            {t.label}{t.count !== undefined && t.count > 0 && <span className="fd-pg-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="escrow-overview">
          <div className="escrow-flow-diagram">
            <h3>Quy trình nhận thanh toán</h3>
            <div className="flow-steps">
              <div className="flow-step"><div className="flow-step-num done">1</div><span>Ký hợp đồng</span><p>Xác nhận điều khoản bao tiêu với doanh nghiệp</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num done">2</div><span>DN ký quỹ</span><p>Doanh nghiệp nạp tiền ký quỹ vào PreOnic</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num">3</div><span>Giao hàng</span><p>Bạn xác nhận đã giao hàng theo đúng thỏa thuận</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num">4</div><span>DN kiểm tra</span><p>Doanh nghiệp kiểm tra chất lượng, xác nhận đạt</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num">5</div><span>Nhận tiền</span><p>Tiền tự động chuyển vào tài khoản của bạn</p></div>
            </div>
          </div>

          <div className="escrow-safety">
            <div className="safety-icon"><span className="shield-escrow-icon" /></div>
            <div className="safety-info">
              <h3>Bảo vệ quyền lợi nông dân</h3>
              <ul>
                <li>Tiền đã được doanh nghiệp ký quỹ trước — đảm bảo thanh toán</li>
                <li>Giao hàng đúng cam kết = tự động nhận tiền theo mốc</li>
                <li>Doanh nghiệp không thể tự rút tiền đã ký quỹ</li>
                <li>Có tranh chấp? Admin PreOnic phân xử công bằng</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Escrow List */}
      {activeTab !== "overview" && (
        <div className="fd-list-area">
          {filteredEscrows.length === 0 ? (
            <div className="fd-empty"><FiShield size={40} color="#d1d5db" /><h4>Không có escrow nào</h4><p>Chưa có giao dịch nào trong mục này.</p></div>
          ) : selectedEscrow ? (
            <div className="escrow-detail">
              <button className="escrow-back-btn" onClick={() => setSelectedEscrow(null)}>Quay lại danh sách</button>
              
              <div className="escrow-detail-header">
                <div>
                  <h3>{selectedEscrow.productName}</h3>
                  <p className="escrow-contract-code">Hợp đồng: {selectedEscrow.contractCode} — {selectedEscrow.enterpriseName}</p>
                </div>
                <span className={`escrow-status-badge ${selectedEscrow.status}`}>{statusLabels[selectedEscrow.status]}</span>
              </div>

              <div className="escrow-detail-stats">
                <div className="eds-item"><span>Tổng giá trị</span><strong>{fmtMoney(selectedEscrow.totalAmount)}</strong></div>
                <div className="eds-item released"><span>Đã nhận</span><strong>{fmtMoney(selectedEscrow.releasedAmount)}</strong></div>
                <div className="eds-item held"><span>Chờ giải ngân</span><strong>{fmtMoney(selectedEscrow.depositedAmount - selectedEscrow.releasedAmount)}</strong></div>
              </div>

              {/* Progress */}
              <div className="escrow-progress-section">
                <h4>Tiến độ nhận thanh toán</h4>
                <div className="escrow-progress-bar">
                  <div className="epb-fill" style={{ width: selectedEscrow.depositedAmount > 0 ? `${(selectedEscrow.releasedAmount / selectedEscrow.depositedAmount) * 100}%` : "0%" }} />
                </div>
                <div className="epb-labels">
                  <span>0%</span>
                  <span>{selectedEscrow.depositedAmount > 0 ? Math.round((selectedEscrow.releasedAmount / selectedEscrow.depositedAmount) * 100) : 0}% đã nhận</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Milestones */}
              <div className="escrow-milestones">
                <h4>Các mốc thanh toán</h4>
                {selectedEscrow.milestones.map(m => (
                  <div key={m.step} className={`escrow-milestone ${m.status}`}>
                    <div className="em-step-marker">
                      {m.status === "completed" ? <span className="em-check" /> : m.step}
                    </div>
                    <div className="em-info">
                      <div className="em-header">
                        <strong>{m.name}</strong>
                        <span className={`em-status ${m.status}`}>{milestoneStatusLabels[m.status]}</span>
                      </div>
                      {m.releaseAmount > 0 && <p className="em-amount">Giải ngân: {fmtMoney(m.releaseAmount)} ({m.releasePercentage}%)</p>}
                      <div className="em-confirmations">
                        <span className={m.farmerConfirmed ? "confirmed" : "pending"}>
                          {m.farmerConfirmed ? "Bạn đã xác nhận" : "Chờ bạn xác nhận"}
                        </span>
                        <span className={m.enterpriseConfirmed ? "confirmed" : "pending"}>
                          {m.enterpriseConfirmed ? "DN đã xác nhận" : "Chờ DN xác nhận"}
                        </span>
                      </div>
                      {/* Farmer action: confirm shipment / preparation */}
                      {m.status === "in_progress" && !m.farmerConfirmed && (
                        <div className="em-actions">
                          <button className="em-btn-confirm" onClick={() => setConfirmModal({ escrow: selectedEscrow, milestone: m })}>
                            {m.step === 2 ? "Xác nhận đã chuẩn bị xong" : m.step === 3 ? "Xác nhận đã giao hàng" : "Xác nhận hoàn tất"}
                          </button>
                          <button className="em-btn-dispute" onClick={() => setDisputeModal({ escrow: selectedEscrow, milestone: m })}>
                            Báo cáo vấn đề
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            filteredEscrows.length === 0
            ? <div className="fd-list-area"><div className="fd-empty"><FiShield size={40} color="#d1d5db" /><h4>Không có giao dịch escrow nào</h4><p>Tạo hợp đồng để bắt đầu gói ký quỹ!</p></div></div>
            : filteredEscrows.map(e => {
              const statusCls = { awaiting_deposit: 'ec-awaiting', disputed: 'ec-disputed', fully_released: 'ec-complete', refunded: 'ec-complete' }[e.status] || '';
              const statusBdgCls = { awaiting_deposit: 'fds-amber', funded: 'fds-blue', partially_released: 'fds-green', fully_released: 'fds-gray', refunded: 'fds-gray', disputed: 'fds-red' }[e.status] || 'fds-gray';
              const pct = e.depositedAmount > 0 ? Math.round((e.releasedAmount / e.depositedAmount) * 100) : 0;
              return (
                <div key={e.id} className={`fd-escrow-card ${statusCls}`} onClick={() => setSelectedEscrow(e)}>
                  <div className="fd-escrow-card-top">
                    <div>
                      <div className="fd-escrow-card-title">{e.productName}</div>
                      <div className="fd-escrow-card-meta">{e.contractCode} • {e.enterpriseName}</div>
                    </div>
                    <span className={`fds ${statusBdgCls}`}>{statusLabels[e.status]}</span>
                  </div>
                  <div className="fd-escrow-amounts">
                    <div className="fd-ea"><span>Tổng giá trị</span><strong>{fmtMoney(e.totalAmount)}</strong></div>
                    <div className="fd-ea ea-received"><span>Đã nhận</span><strong>{fmtMoney(e.releasedAmount)}</strong></div>
                    <div className="fd-ea ea-pending"><span>Chờ giải ngân</span><strong>{fmtMoney(e.depositedAmount - e.releasedAmount)}</strong></div>
                  </div>
                  <div className="fd-escrow-ms-row">
                    {e.milestones.map((m, idx) => (
                      <Fragment key={`${e.id || e._id}-ms-${m.step}`}>
                        {idx > 0 && <div className={`fd-ms-pip-line ${m.status === 'completed' || (idx > 0 && e.milestones[idx - 1].status === 'completed') ? 'done' : ''}`} />}
                        <div className={`fd-ms-pip ${m.status === 'completed' ? 'done' : m.status === 'in_progress' ? 'active' : ''}`}>{m.status === 'completed' ? '✓' : m.step}</div>
                      </Fragment>
                    ))}
                  </div>
                  <div className="fd-escrow-prog">
                    <div className="fd-escrow-prog-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="fd-escrow-card-foot">
                    <span className="fd-escrow-date">Tạo: {e.createdAt} • {pct}% đã giải ngân</span>
                    <button className="fd-btn fd-btn-white fd-btn-sm" onClick={ev => { ev.stopPropagation(); setSelectedEscrow(e); }}>Xem chi tiết</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="escrow-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="escrow-modal" onClick={e => e.stopPropagation()}>
            <div className="escrow-modal-header">
              <h3>Xác nhận mốc thanh toán</h3>
              <button className="modal-close" onClick={() => setConfirmModal(null)}>X</button>
            </div>
            <div className="escrow-modal-body">
              <p><strong>Hợp đồng:</strong> {confirmModal.escrow.contractCode}</p>
              <p><strong>Sản phẩm:</strong> {confirmModal.escrow.productName}</p>
              <p><strong>Mốc:</strong> {confirmModal.milestone.name}</p>
              {confirmModal.milestone.releaseAmount > 0 && (
                <p><strong>Số tiền sẽ nhận khi DN xác nhận:</strong> {fmtMoney(confirmModal.milestone.releaseAmount)}</p>
              )}
              <p className="escrow-modal-warning">Hành động này xác nhận bạn đã hoàn thành nghĩa vụ cho mốc này. Tiếp tục?</p>
            </div>
            <div className="escrow-modal-footer">
              <button className="em-btn-cancel" onClick={() => setConfirmModal(null)}>Hủy</button>
              <button className="em-btn-confirm" onClick={async () => {
                try {
                  const escrowId = confirmModal.escrow._id || confirmModal.escrow.id;
                  await escrowService.farmerConfirm(escrowId, confirmModal.milestone.step);
                  toast.success("Xác nhận mốc thanh toán thành công!");
                  await loadEscrowList();
                } catch {
                  toast.error("Xác nhận thất bại. Vui lòng thử lại.");
                }
                setConfirmModal(null);
              }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="escrow-modal-overlay" onClick={() => { setDisputeModal(null); setDisputeReason(""); }}>
          <div className="escrow-modal" onClick={e => e.stopPropagation()}>
            <div className="escrow-modal-header">
              <h3>Báo cáo vấn đề</h3>
              <button className="modal-close" onClick={() => { setDisputeModal(null); setDisputeReason(""); }}>X</button>
            </div>
            <div className="escrow-modal-body">
              <p><strong>Hợp đồng:</strong> {disputeModal.escrow.contractCode}</p>
              <p><strong>Sản phẩm:</strong> {disputeModal.escrow.productName}</p>
              <p><strong>Mốc:</strong> {disputeModal.milestone.name}</p>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Lý do tranh chấp:</label>
                <textarea
                  className="dispute-textarea"
                  rows={4}
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                />
              </div>
            </div>
            <div className="escrow-modal-footer">
              <button className="em-btn-cancel" onClick={() => { setDisputeModal(null); setDisputeReason(""); }}>Hủy</button>
              <button className="em-btn-dispute" disabled={!disputeReason.trim()} onClick={async () => {
                try {
                  const escrowId = disputeModal.escrow._id || disputeModal.escrow.id;
                  await escrowService.raiseDispute(escrowId, disputeModal.milestone.step, disputeReason.trim());
                  toast.success("Đã gửi báo cáo tranh chấp!");
                  await loadEscrowList();
                } catch {
                  toast.error("Gửi tranh chấp thất bại. Vui lòng thử lại.");
                }
                setDisputeModal(null);
                setDisputeReason("");
              }}>Gửi báo cáo</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================
   THỜI TIẾT & BẢO HIỂM — Weather & Insurance (Farmer)
   ========================================= */
const VIETNAM_PROVINCES = [
  { value: "Ha Noi", label: "Hà Nội" }, { value: "Ho Chi Minh", label: "TP. Hồ Chí Minh" },
  { value: "Da Nang", label: "Đà Nẵng" }, { value: "Hai Phong", label: "Hải Phòng" },
  { value: "Can Tho", label: "Cần Thơ" }, { value: "Binh Duong", label: "Bình Dương" },
  { value: "Dong Nai", label: "Đồng Nai" }, { value: "Lam Dong", label: "Lâm Đồng" },
  { value: "Dak Lak", label: "Đắk Lắk" }, { value: "Gia Lai", label: "Gia Lai" },
  { value: "Long An", label: "Long An" }, { value: "Tien Giang", label: "Tiền Giang" },
  { value: "Ben Tre", label: "Bến Tre" }, { value: "An Giang", label: "An Giang" },
  { value: "Binh Thuan", label: "Bình Thuận" }, { value: "Khanh Hoa", label: "Khánh Hòa" },
  { value: "Tay Ninh", label: "Tây Ninh" }, { value: "Thai Nguyen", label: "Thái Nguyên" },
  { value: "Bac Giang", label: "Bắc Giang" }, { value: "Thanh Hoa", label: "Thanh Hóa" },
  { value: "Nghe An", label: "Nghệ An" }, { value: "Ha Tinh", label: "Hà Tĩnh" },
  { value: "Quang Binh", label: "Quảng Bình" }, { value: "Hue", label: "Thừa Thiên Huế" },
  { value: "Quang Nam", label: "Quảng Nam" }, { value: "Quang Ngai", label: "Quảng Ngãi" },
  { value: "Binh Dinh", label: "Bình Định" }, { value: "Phu Yen", label: "Phú Yên" },
];
const PROVINCE_COORDS_FE = {
  "Ha Noi": { lat: 21.0285, lng: 105.8542 }, "Ho Chi Minh": { lat: 10.8231, lng: 106.6297 },
  "Da Nang": { lat: 16.0544, lng: 108.2022 }, "Hai Phong": { lat: 20.8449, lng: 106.6881 },
  "Can Tho": { lat: 10.0452, lng: 105.7469 }, "Binh Duong": { lat: 11.3254, lng: 106.477 },
  "Dong Nai": { lat: 10.9453, lng: 106.8243 }, "Lam Dong": { lat: 11.9404, lng: 108.4583 },
  "Dak Lak": { lat: 12.71, lng: 108.2378 }, "Gia Lai": { lat: 13.9833, lng: 108.0 },
  "Long An": { lat: 10.5364, lng: 106.4134 }, "Tien Giang": { lat: 10.3599, lng: 106.3631 },
  "Ben Tre": { lat: 10.2434, lng: 106.3756 }, "An Giang": { lat: 10.5216, lng: 105.1259 },
  "Binh Thuan": { lat: 10.9333, lng: 108.1 }, "Khanh Hoa": { lat: 12.2585, lng: 109.0526 },
  "Tay Ninh": { lat: 11.3635, lng: 106.1016 }, "Thai Nguyen": { lat: 21.5671, lng: 105.825 },
  "Bac Giang": { lat: 21.2731, lng: 106.1946 }, "Thanh Hoa": { lat: 19.8, lng: 105.7667 },
  "Nghe An": { lat: 18.6733, lng: 105.6922 }, "Ha Tinh": { lat: 18.3559, lng: 105.8877 },
  "Quang Binh": { lat: 17.4688, lng: 106.6224 }, "Hue": { lat: 16.4637, lng: 107.5909 },
  "Quang Nam": { lat: 15.5394, lng: 108.019 }, "Quang Ngai": { lat: 15.1214, lng: 108.8044 },
  "Binh Dinh": { lat: 13.782, lng: 109.2197 }, "Phu Yen": { lat: 13.0882, lng: 109.0929 },
};

function FarmerWeatherContent() {
  const { user } = useAuth();
  const defaultProvince = matchProvince(user?.province) || "Ha Noi";
  const [selectedProvince, setSelectedProvince] = useState(defaultProvince);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("weather");

  const districtOptions = useMemo(() => getDistricts(selectedProvince), [selectedProvince]);

  const handleProvinceChange = (e) => {
    setSelectedProvince(e.target.value);
    setSelectedDistrict("");
  };

  useEffect(() => { loadData(selectedProvince); }, [selectedProvince]);

  const loadData = async (province) => {
    setLoading(true);
    try {
      const [weatherRes, forecastRes, alertsRes, thresholdsRes] = await Promise.all([
        weatherService.getCurrentWeather(province).catch(() => null),
        weatherService.getForecast(province).catch(() => null),
        weatherService.getAlerts(1, 10).catch(() => ({ data: [] })),
        weatherService.getThresholds().catch(() => null),
      ]);
      setWeather(weatherRes?.data || null);
      setForecast(Array.isArray(forecastRes?.data) ? forecastRes.data : []);
      setAlerts(alertsRes?.data || []);
      setThresholds(thresholdsRes?.data || null);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await weatherService.markAlertAsRead(id);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
    } catch { /* silent */ }
  };
  const markAllRead = async () => {
    try {
      await weatherService.markAllAlertsAsRead();
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch { /* silent */ }
  };

  const getSeverityClass = (s) => s === "critical" ? "weather-critical" : "weather-warning";
  const getAlertIcon = (t) => ({ extreme_heat: "heat", extreme_cold: "cold", heavy_rain: "rain", strong_wind: "wind", drought: "drought" })[t] || "weather";
  const getAlertLabel = (t) => ({ extreme_heat: "Nắng nóng", extreme_cold: "Rét đậm", heavy_rain: "Mưa lớn", strong_wind: "Gió mạnh", drought: "Hạn hán" })[t] || t;
  const formatDateStr = (d) => new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatForecastDate = (ds) => { const d = new Date(ds); const days = ["CN","T2","T3","T4","T5","T6","T7"]; return { day: days[d.getDay()], date: `${d.getDate()}/${d.getMonth()+1}` }; };

  const provinceLabel = VIETNAM_PROVINCES.find(p => p.value === selectedProvince)?.label || selectedProvince;
  const displayLocation = selectedDistrict ? `${selectedDistrict}, ${provinceLabel}` : provinceLabel;
  const coords = PROVINCE_COORDS_FE[selectedProvince] || { lat: 16.0, lng: 107.0 };
  const windyZoom = selectedDistrict ? 10 : 8;
  const windyUrl = `https://embed.windy.com/embed2.html?lat=${coords.lat}&lon=${coords.lng}&detailLat=${coords.lat}&detailLon=${coords.lng}&zoom=${windyZoom}&level=surface&overlay=temp&menu=&message=&marker=true&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  const getHeroGradient = (icon) => {
    if (!icon) return "linear-gradient(145deg, #2d6a4f 0%, #40916c 60%, #52b788 100%)";
    const code = icon.slice(0, 2);
    const isDay = icon.endsWith("d");
    if (code === "01") return isDay
      ? "linear-gradient(145deg, #0369a1 0%, #0ea5e9 55%, #38bdf8 100%)"
      : "linear-gradient(145deg, #0f172a 0%, #1e3a5f 55%, #1e40af 100%)";
    if (code === "02") return isDay
      ? "linear-gradient(145deg, #0284c7 0%, #38bdf8 55%, #7dd3fc 100%)"
      : "linear-gradient(145deg, #1e293b 0%, #334155 55%, #475569 100%)";
    if (["03","04"].includes(code)) return "linear-gradient(145deg, #475569 0%, #64748b 55%, #94a3b8 100%)";
    if (["09","10"].includes(code)) return "linear-gradient(145deg, #1e3a5f 0%, #374151 55%, #4b5563 100%)";
    if (code === "11") return "linear-gradient(145deg, #111827 0%, #1f2937 55%, #374151 100%)";
    return "linear-gradient(145deg, #2d6a4f 0%, #40916c 60%, #52b788 100%)";
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const sectionTabs = [
    { key: "weather", label: "Thời tiết", Icon: FiCloud },
    { key: "map", label: "Bản đồ", Icon: FiMap },
    { key: "alerts", label: "Cảnh báo", Icon: FiBell, badgeCount: unreadCount },
    { key: "thresholds", label: "Ngưỡng", Icon: FiZap },
    { key: "insurance", label: "Bảo hiểm", Icon: FiShield },
  ];

  return (
    <>
      <div className="fd-pg-header">
        <div>
          <h2>Thời tiết &amp; Bảo hiểm</h2>
          <p className="fd-pg-subtitle">Theo dõi thời tiết và quản lý thông tin bảo hiểm cho vùng canh tác.</p>
        </div>
      </div>

      {/* ── Hero Weather Card ── */}
      <div className="wthr-hero" style={{ background: getHeroGradient(weather?.icon) }}>
        {/* Decorative circles */}
        <div className="wthr-deco wthr-deco-1" />
        <div className="wthr-deco wthr-deco-2" />

        {/* Location selectors */}
        <div className="wthr-loc-row">
          <div className="wthr-loc-selects">
            <select className="wthr-loc-select" value={selectedProvince} onChange={handleProvinceChange}>
              {VIETNAM_PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select
              className="wthr-loc-select"
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              disabled={districtOptions.length === 0}
            >
              <option value="">{districtOptions.length > 0 ? "Tất cả Quận/Huyện" : "— Không có dữ liệu —"}</option>
              {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="wthr-refresh-btn" onClick={() => loadData(selectedProvince)} disabled={loading}>
            {loading ? <FiClock size={14} /> : <FiRefreshCw size={14} />} Làm mới
          </button>
        </div>

        {/* Current conditions */}
        {loading ? (
          <div className="wthr-hero-loading">
            <div className="wthr-spinner" />
            <span>Đang tải dữ liệu thời tiết...</span>
          </div>
        ) : weather ? (
          <div className="wthr-current">
            <div className="wthr-location-label"><FiMapPin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{displayLocation}</div>
            <div className="wthr-main-row">
              <div className="wthr-icon-temp">
                <img src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`} alt={weather.description} className="wthr-big-icon" />
                <div>
                  <div className="wthr-temp">{weather.temp?.toFixed(1)}°C</div>
                  <div className="wthr-desc-text">{weather.description}</div>
                </div>
              </div>
              <div className="wthr-stats-grid">
                <div className="wthr-stat-badge">
                  <span className="stat-emoji"><FiDroplet size={18} /></span>
                  <div><div className="stat-lbl">Độ ẩm</div><div className="stat-val">{weather.humidity}%</div></div>
                </div>
                <div className="wthr-stat-badge">
                  <span className="stat-emoji"><FiWind size={18} /></span>
                  <div><div className="stat-lbl">Gió</div><div className="stat-val">{weather.windSpeed?.toFixed(1)} km/h</div></div>
                </div>
                <div className="wthr-stat-badge">
                  <span className="stat-emoji"><FiCloudRain size={18} /></span>
                  <div><div className="stat-lbl">Mưa 1h</div><div className="stat-val">{(weather.rain1h || 0).toFixed(1)} mm</div></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="wthr-no-data">
            <p style={{ fontSize: 28 }}><FiAlertTriangle size={28} /></p>
            <p>Không thể lấy dữ liệu thời tiết</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>Nhấn Làm mới hoặc chọn tỉnh/thành khác</p>
          </div>
        )}
      </div>

      {/* ── Section Tabs ── */}
      <div className="fd-pg-tabs">
        {sectionTabs.map(({ key, label, Icon, badgeCount }) => (
          <button key={key} className={`fd-pg-tab ${activeSection === key ? "active" : ""}`} onClick={() => setActiveSection(key)}>
            <Icon size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />{label}
            {badgeCount > 0 && <span className="fd-pg-tab-badge">{badgeCount}</span>}
          </button>
        ))}
      </div>

      {/* ── Forecast (weather tab) ── */}
      {activeSection === "weather" && !loading && forecast.length > 0 && (
        <div className="wthr-forecast-section">
          <div className="wthr-forecast-title"><FiCalendar size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />Dự báo 5 ngày tới</div>
          <div className="wthr-forecast-strip">
            {forecast.map((day, i) => {
              const { day: dn, date } = formatForecastDate(day.date);
              return (
                <div key={i} className={`wthr-day-card ${i === 0 ? "today" : ""}`}>
                  <div className="wthr-day-label">{i === 0 ? "Hôm nay" : dn}</div>
                  <div className="wthr-day-date">{date}</div>
                  <img src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} alt="" className="wthr-day-icon" />
                  <div className="wthr-day-temp-max">{Math.round(day.tempMax || day.temp)}°</div>
                  <div className="wthr-day-temp-min">{Math.round(day.tempMin ?? (day.temp - 2))}°</div>
                  <div className="wthr-day-desc">{day.description}</div>
                  {day.rain > 0 && <div className="wthr-day-rain"><FiCloudRain size={12} style={{ marginRight: 3 }} />{day.rain.toFixed(1)}mm</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Map ── */}
      {activeSection === "map" && (
        <div className="wthr-map-section">
          <div className="wthr-map-header">
            <span className="wthr-map-title"><FiMap size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Bản đồ thời tiết</span>
            <span className="wthr-map-loc"><FiMapPin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{displayLocation}</span>
            <span className="wthr-map-sub">Nhiệt độ · Gió · Mây theo thời gian thực · Windy.com</span>
          </div>
          <iframe key={windyUrl} src={windyUrl} title="Bản đồ thời tiết" className="wthr-map-frame" allow="geolocation" />
        </div>
      )}

      {/* ── Alerts ── */}
      {activeSection === "alerts" && (
        loading ? <div className="weather-loading"><div className="weather-spinner" /><p>Đang tải...</p></div> :
        <div className="weather-alerts-section">
          {alerts.length > 0 && (
            <div className="wa-header">
              <span>{unreadCount} cảnh báo chưa đọc</span>
              <button className="wa-mark-all" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button>
            </div>
          )}
          {alerts.length === 0 ? (
            <div className="wa-empty"><span className="wa-empty-icon" /><p>Không có cảnh báo. Vùng canh tác của bạn an toàn!</p></div>
          ) : (
            <div className="wa-list">
              {alerts.map(alert => (
                <div key={alert._id} className={`wa-item ${getSeverityClass(alert.severity)} ${alert.isRead ? "read" : "unread"}`} onClick={() => !alert.isRead && markRead(alert._id)}>
                  <div className="wa-item-icon"><span className={`alert-type-icon ${getAlertIcon(alert.alertType)}-icon`} /></div>
                  <div className="wa-item-body">
                    <div className="wa-item-header">
                      <span className={`wa-badge ${alert.severity}`}>{alert.severity === "critical" ? "Khẩn cấp" : "Cảnh báo"}</span>
                      <span className="wa-type">{getAlertLabel(alert.alertType)}</span>
                      <span className="wa-date">{formatDateStr(alert.createdAt)}</span>
                    </div>
                    <p className="wa-message">{alert.message}</p>
                    <p className="wa-detail">{alert.thresholdExceeded}</p>
                    <p className="wa-location">{alert.location?.province}{alert.location?.district ? ` - ${alert.location.district}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Thresholds ── */}
      {activeSection === "thresholds" && (
        loading ? <div className="weather-loading"><div className="weather-spinner" /><p>Đang tải...</p></div> :
        <div className="weather-thresholds-card">
          <h3>Ngưỡng cảnh báo thời tiết</h3>
          <p className="wt-desc">Hệ thống tự động kiểm tra mỗi 6 giờ và gửi cảnh báo khi vượt ngưỡng.</p>
          <div className="wt-grid">
            <div className="wt-item heat"><span className="wt-icon heat-icon" /><div><h4>Nắng nóng</h4><p>&gt; {thresholds?.extremeHeatTemp || 38}°C</p></div></div>
            <div className="wt-item cold"><span className="wt-icon cold-icon" /><div><h4>Rét đậm</h4><p>&lt; {thresholds?.extremeColdTemp || 5}°C</p></div></div>
            <div className="wt-item rain"><span className="wt-icon rain-icon" /><div><h4>Mưa lớn</h4><p>&gt; {thresholds?.heavyRainMm || 100}mm/ngày</p></div></div>
            <div className="wt-item wind"><span className="wt-icon wind-icon" /><div><h4>Gió mạnh</h4><p>&gt; {thresholds?.strongWindKmh || 60}km/h</p></div></div>
            <div className="wt-item drought"><span className="wt-icon drought-icon" /><div><h4>Hạn hán</h4><p>&lt; {thresholds?.droughtMm || 5}mm / {thresholds?.droughtDays || 14} ngày</p></div></div>
          </div>
        </div>
      )}

      {/* ── Insurance ── */}
      {activeSection === "insurance" && (
        <div className="insurance-info-card">
          <h3>Bảo hiểm nông nghiệp</h3>
          <p className="ins-desc">Thông tin bảo hiểm được lưu trong hợp đồng để tham khảo. Hệ thống không bán bảo hiểm.</p>
          <div className="ins-how">
            <h4>Hướng dẫn sử dụng</h4>
            <div className="ins-steps">
              <div className="ins-step"><div className="ins-step-num">1</div><div><h5>Mua bảo hiểm</h5><p>Liên hệ công ty bảo hiểm nông nghiệp để mua gói phù hợp.</p></div></div>
              <div className="ins-step"><div className="ins-step-num">2</div><div><h5>Nhập thông tin</h5><p>Khi tạo hợp đồng bao tiêu, nhập thông tin bảo hiểm (tùy chọn).</p></div></div>
              <div className="ins-step"><div className="ins-step-num">3</div><div><h5>Theo dõi thời tiết</h5><p>Dùng cảnh báo thời tiết để phòng ngừa rủi ro canh tác.</p></div></div>
              <div className="ins-step"><div className="ins-step-num">4</div><div><h5>Xử lý bồi thường</h5><p>Khi gặp sự cố, liên hệ công ty bảo hiểm với thông tin hợp đồng.</p></div></div>
            </div>
          </div>
          <div className="ins-fields">
            <h4>Thông tin bảo hiểm cần cung cấp</h4>
            <ul>
              <li>Tên công ty bảo hiểm</li>
              <li>Số hợp đồng bảo hiểm</li>
              <li>Giá trị được bảo hiểm (VND)</li>
              <li>Sự kiện được bảo hiểm</li>
              <li>Thời gian hiệu lực</li>
              <li>File đính kèm</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
