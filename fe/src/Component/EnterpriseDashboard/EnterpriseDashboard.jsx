import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { FiSearch, FiMapPin, FiStar, FiFeather } from "react-icons/fi";
import {
  ROUTES,
  COMPANY,
  ENTERPRISE_DASHBOARD_NAV_ITEMS,
  SEARCH_PLACEHOLDERS,
  DATE_FORMATS,
  getContractStatusMeta,
} from "../../constants";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatPriceRange } from "../../data/products";
import productService, { resolveImageUrl } from "../../services/product.service";
import enterpriseService from "../../services/enterprise.service";
import contractService from "../../services/contract.service";
import paymentService from "../../services/payment.service";
import escrowService from "../../services/escrow.service";
import weatherService from "../../services/weather.service";
import { formatMoney, formatDate } from "../../hooks/useApiData";
import NotificationBell from "../NotificationBell/NotificationBell";
import WalletPayment from "../WalletPayment/WalletPayment";
import BilateralRating from "../BilateralRating/BilateralRating";
import "./EnterpriseDashboard.css";

// Tệp này điều phối toàn bộ dashboard doanh nghiệp: điều hướng tab, thống kê, đơn hàng và các thao tác tài chính.
export default function EnterpriseDashboard() {
  const location = useLocation();
  const [activeNav, setActiveNav] = useState(location.state?.activeNav || "tongguan");
  const [headerSearch, setHeaderSearch] = useState("");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <div className="ed-layout">
      {/* SIDEBAR */}
      <aside className="ed-sidebar">
        <div className="ed-logo" onClick={() => navigate(ROUTES.HOME)} style={{ cursor: "pointer" }}>
          <div className="logo-icon"><span className="logo-leaf" /></div>
          <div className="logo-text"><h1>PreOnic</h1><p>Cổng Doanh nghiệp</p></div>
        </div>

        <nav className="ed-nav">
          {ENTERPRISE_DASHBOARD_NAV_ITEMS.map(item => (
            <button key={item.key} className={`${item.cls} ${activeNav === item.key ? "active" : ""}`} onClick={() => setActiveNav(item.key)}>
              <span className={`nav-icon ${item.cls}-icon`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ed-sidebar-footer">
          <button className="messaging-btn" onClick={() => navigate(ROUTES.MESSAGING)}>
            <span className="nav-icon msg-sidebar-icon" /> Nhắn tin
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon logout-sidebar-icon" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ed-main">
        <header className="ed-header">
          <div className="header-search">
            <span className="search-input-icon" />
            <input type="text" placeholder={SEARCH_PLACEHOLDERS.ENTERPRISE_DASHBOARD} value={headerSearch} onChange={e => setHeaderSearch(e.target.value)} />
          </div>
          <div className="header-actions">
            <NotificationBell />
            <div className="divider"></div>
            <div className="user-profile" onClick={() => navigate(ROUTES.PROFILE)} style={{ cursor: "pointer" }}>
              <div className="user-info">
                <p className="user-name">{user?.fullName || "Doanh nghiệp"}</p>
                <p className="user-role">Quản lý thu mua</p>
              </div>
              <div className="user-avatar">{(user?.fullName || "DN").slice(0, 2).toUpperCase()}</div>
            </div>
          </div>
        </header>

        <div className="ed-content">
          {activeNav === "tongguan" && <TongQuanContent onNavigate={setActiveNav} />}
          {activeNav === "hopdong" && <HopDongContent searchQuery={headerSearch} onNavigate={setActiveNav} />}
          {activeNav === "sanpham" && <SanPhamContent navigate={navigate} />}
          {activeNav === "donhang" && <DonHangContent searchQuery={headerSearch} />}
          {activeNav === "escrow" && <EscrowContent />}
          {activeNav === "vi" && <WalletPayment role="enterprise" />}
          {activeNav === "lichsu" && <LichSuGiaoDichContent />}
          {activeNav === "danhgia" && <BilateralRating currentRole="enterprise" />}
          {activeNav === "thoitiet" && <WeatherInsuranceContent />}
        </div>
      </main>
    </div>
  );
}

/* =========================================
  KHỐI TỔNG QUAN
  Dùng để hiển thị KPI, biểu đồ và trạng thái hợp đồng ở mức điều hành.
  ========================================= */
function TongQuanContent({ onNavigate }) {
  const [apiStats, setApiStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentContracts, setRecentContracts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, anaRes, ctrRes] = await Promise.all([
          enterpriseService.getDashboard().catch(() => null),
          enterpriseService.getAnalytics().catch(() => null),
          enterpriseService.getContracts().catch(() => null),
        ]);
        if (dashRes?.data) setApiStats(dashRes.data);
        if (anaRes?.data) setAnalytics(anaRes.data);
        if (ctrRes?.data?.contracts) setRecentContracts(ctrRes.data.contracts.slice(0, 5));
      } catch { /* silent */ }
    };
    load();
  }, []);

  const stats             = apiStats?.stats || {};
  const totalContracts    = stats.totalContracts    || 0;
  const activeContracts   = stats.activeContracts   || 0;
  const pendingContracts  = stats.pendingContracts  || 0;
  const completedContracts= stats.completedContracts|| 0;
  const totalValue        = stats.totalContractValue|| 0;
  const reputationPct     = stats.reputationScore ? Math.round(stats.reputationScore * 20) : 0;

  const monthlyData = (analytics?.monthlyData || []).map(m => ({ name: m.month, value: m.value }));

  // Donut ring  r=54  C≈339.3
  const C              = 2 * Math.PI * 54;
  const total          = totalContracts || 1;
  const pendingDash    = C * (pendingContracts    / total);
  const activeDash     = C * (activeContracts     / total);
  const completedDash  = C * (completedContracts  / total);
  const pendingAngle   = -90;
  const activeAngle    = pendingAngle  + (pendingContracts  / total) * 360;
  const completedAngle = activeAngle   + (activeContracts   / total) * 360;

  // Reputation ring
  const repOffset = C - (C * reputationPct / 100);
  const repColor  = reputationPct >= 80 ? "#16a34a" : reputationPct >= 50 ? "#f59e0b" : "#ef4444";

  const statusLabel = (status) => getContractStatusMeta(status).label;
  const statusColor = (status) => getContractStatusMeta(status).color;

  return (
    <>
      {/* PAGE HEADER */}
      <div className="tq-page-header">
        <div>
          <h1 className="tq-title">Tổng quan Doanh nghiệp</h1>
          <p className="tq-subtitle">Theo dõi hoạt động thu mua và quản lý hợp đồng</p>
        </div>
        <span className="tq-date-badge">
          {new Date().toLocaleDateString("vi-VN", DATE_FORMATS.FULL_DATE)}
        </span>
      </div>

      {/* KPI CARDS */}
      <div className="tq-kpis">
        <div className="tq-kpi" style={{ "--kpi-color": "#1d4ed8" }}>
          <div className="tq-kpi-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div className="tq-kpi-body">
            <span className="tq-kpi-val">{totalContracts}</span>
            <span className="tq-kpi-label">Tổng hợp đồng</span>
            <span className="tq-kpi-sub">{completedContracts} đã hoàn thành</span>
          </div>
        </div>

        <div className="tq-kpi" style={{ "--kpi-color": "#16a34a" }}>
          <div className="tq-kpi-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="tq-kpi-body">
            <span className="tq-kpi-val">{activeContracts}</span>
            <span className="tq-kpi-label">Đang hoạt động</span>
            <span className="tq-kpi-sub tq-kpi-sub-green">Đang thực hiện</span>
          </div>
        </div>

        <div className="tq-kpi" style={{ "--kpi-color": "#d97706" }}>
          <div className="tq-kpi-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="tq-kpi-body">
            <span className="tq-kpi-val">{pendingContracts}</span>
            <span className="tq-kpi-label">Chờ phê duyệt</span>
            {pendingContracts > 0
              ? <span className="tq-kpi-sub tq-kpi-sub-warn">Cần xem xét</span>
              : <span className="tq-kpi-sub">Không có</span>}
          </div>
        </div>

        <div className="tq-kpi" style={{ "--kpi-color": "#7c3aed" }}>
          <div className="tq-kpi-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="tq-kpi-body">
            <span className="tq-kpi-val tq-kpi-money">{formatMoney(totalValue)}</span>
            <span className="tq-kpi-label">Tổng giá trị hợp đồng</span>
            <span className="tq-kpi-sub">Tích lũy toàn bộ</span>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: Line chart + Contract donut */}
      <div className="tq-mid-grid">
        <div className="tq-card">
          <div className="tq-card-hd">
            <h3>Chi tiêu theo tháng</h3>
            <span className="tq-chip">{monthlyData.length > 0 ? `${monthlyData.length} tháng gần nhất` : "Chưa có dữ liệu"}</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f1" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v)}
                  tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48}
                />
                <Tooltip formatter={v => [formatMoney(v), "Chi tiêu"]} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#1d4ed8" strokeWidth={2.5} dot={{ fill: "#1d4ed8", r: 3.5, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="tq-empty-chart">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <p>Dữ liệu sẽ xuất hiện khi có hợp đồng</p>
            </div>
          )}
        </div>

        <div className="tq-card tq-donut-card">
          <div className="tq-card-hd"><h3>Phân bổ hợp đồng</h3></div>
          <div className="tq-donut-wrap">
            <svg viewBox="0 0 128 128" width="148" height="148">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#f3f4f6" strokeWidth="14" />
              {totalContracts > 0 && <>
                <circle cx="64" cy="64" r="54" fill="none" stroke="#f59e0b" strokeWidth="14"
                  strokeDasharray={`${pendingDash} ${C}`} strokeLinecap="butt"
                  transform={`rotate(${pendingAngle} 64 64)`} />
                <circle cx="64" cy="64" r="54" fill="none" stroke="#1d4ed8" strokeWidth="14"
                  strokeDasharray={`${activeDash} ${C}`} strokeLinecap="butt"
                  transform={`rotate(${activeAngle} 64 64)`} />
                <circle cx="64" cy="64" r="54" fill="none" stroke="#16a34a" strokeWidth="14"
                  strokeDasharray={`${completedDash} ${C}`} strokeLinecap="butt"
                  transform={`rotate(${completedAngle} 64 64)`} />
              </>}
            </svg>
            <div className="tq-donut-center">
              <span className="tq-donut-num">{totalContracts}</span>
              <span className="tq-donut-lbl">Hợp đồng</span>
            </div>
          </div>
          <div className="tq-legend">
            {[
              { color: "#f59e0b", label: "Chờ duyệt",  val: pendingContracts },
              { color: "#1d4ed8", label: "Đang chạy",  val: activeContracts },
              { color: "#16a34a", label: "Hoàn thành", val: completedContracts },
            ].map(item => (
              <div className="tq-legend-row" key={item.label}>
                <span className="tq-dot" style={{ background: item.color }} />
                <span className="tq-legend-label">{item.label}</span>
                <span className="tq-legend-val">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Recent contracts + Reputation */}
      <div className="tq-bot-grid">
        <div className="tq-card">
          <div className="tq-card-hd">
            <h3>Hợp đồng gần đây</h3>
            {onNavigate && <button className="tq-link-btn" onClick={() => onNavigate("hopdong")}>Xem tất cả →</button>}
          </div>
          {recentContracts.length === 0 ? (
            <div className="tq-empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <p>Chưa có hợp đồng nào</p>
            </div>
          ) : (
            <div className="tq-ctr-list">
              {recentContracts.map((c, i) => (
                <div className="tq-ctr-row" key={i}>
                  <div className="tq-ctr-avatar">{(c.farmer?.fullName || c.farmerName || "ND").slice(0, 2).toUpperCase()}</div>
                  <div className="tq-ctr-info">
                    <span className="tq-ctr-name">{c.farmer?.fullName || c.farmerName || "Nông dân"}</span>
                    <span className="tq-ctr-product">{c.product?.name || c.productName || "Nông sản"}</span>
                  </div>
                  <div className="tq-ctr-right">
                    <span className="tq-ctr-val">{formatMoney(c.totalValue || c.value || 0)}</span>
                    <span className="tq-s-badge" style={{ background: statusColor(c.status) + "22", color: statusColor(c.status) }}>
                      {statusLabel(c.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tq-card tq-rep-card">
          <div className="tq-card-hd"><h3>Điểm uy tín</h3></div>
          <div className="tq-rep-wrap">
            <svg viewBox="0 0 128 128" width="148" height="148">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle cx="64" cy="64" r="54" fill="none" stroke={repColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${C}`} strokeDashoffset={`${repOffset}`}
                transform="rotate(-90 64 64)" />
            </svg>
            <div className="tq-rep-center">
              <span className="tq-rep-pct" style={{ color: repColor }}>{reputationPct > 0 ? `${reputationPct}%` : "--"}</span>
              <span className="tq-rep-lbl">{reputationPct >= 80 ? "Xuất sắc" : reputationPct >= 50 ? "Khá tốt" : "Cần cải thiện"}</span>
            </div>
          </div>
          <div className="tq-rep-bars">
            <div className="tq-bar-row">
              <div className="tq-bar-labels">
                <span>Hoàn thành hợp đồng</span>
                <span>{totalContracts > 0 ? Math.round((completedContracts / totalContracts) * 100) : 0}%</span>
              </div>
              <div className="tq-bar-bg"><div className="tq-bar-fill" style={{ width: `${totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0}%`, background: "#16a34a" }} /></div>
            </div>
            <div className="tq-bar-row">
              <div className="tq-bar-labels">
                <span>Hợp đồng đang chạy</span>
                <span>{totalContracts > 0 ? Math.round((activeContracts / totalContracts) * 100) : 0}%</span>
              </div>
              <div className="tq-bar-bg"><div className="tq-bar-fill" style={{ width: `${totalContracts > 0 ? (activeContracts / totalContracts) * 100 : 0}%`, background: "#1d4ed8" }} /></div>
            </div>
          </div>
          <p className="tq-rep-note">Dựa trên lịch sử hợp đồng và đánh giá từ đối tác nông dân.</p>
        </div>
      </div>
    </>
  );
}

/* =========================================
   HỢP ĐỒNG — Contracts
   ========================================= */
const CONTRACT_STATUS_VI_ENT = {
  pending:   'Chờ ký',
  approved:  'Chờ ký quỹ',
  active:    'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed:  'Đang tranh chấp',
};
const ENT_PAYMENT_LABELS = {
  '50_50':        '50% trả trước – 50% khi nhận hàng',
  '30_70':        '30% trả trước – 70% khi nhận hàng',
  '100_delivery': '100% sau khi giao hàng',
  '100_upfront':  '100% trả trước',
};

function HopDongContent({ searchQuery = "", onNavigate }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [activeContractTab, setActiveContractTab] = useState("pending");
  const [apiContracts, setApiContracts] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signatureMode, setSignatureMode] = useState("draw");
  const [showSignTerms, setShowSignTerms] = useState(false);

  const loadContracts = useCallback(async () => {
    try {
      const res = await enterpriseService.getContracts();
      setApiContracts(res?.data?.contracts || []);
    } catch { setApiContracts([]); }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const mapContract = (c) => ({
    ...c,
    id: c.contractCode || c._id,
    supplier: c.farmerName || "Nông dân",
    product: c.productName || "Nông sản",
    quantityLabel: `${c.quantity} ${c.unit || ""}`.trim(),
    valueLabel: formatMoney(c.totalValue || 0),
    dateLabel: formatDate(c.createdAt),
    deliveryDateLabel: formatDate(c.deliveryDate),
  });

  const contracts = (apiContracts || []).map(mapContract);

  const tabs = [
    { key: "pending",   label: "Chờ phê duyệt",   count: contracts.filter(c => c.status === 'pending' || c.status === 'approved').length },
    { key: "active",    label: "Đang hoạt động",   count: contracts.filter(c => c.status === 'active').length },
    { key: "completed", label: "Hoàn thành",        count: contracts.filter(c => c.status === 'completed').length },
    { key: "cancelled", label: "Đã hủy",            count: contracts.filter(c => c.status === 'cancelled').length },
  ];

  const filteredContracts = contracts.filter(c => {
    const q = (searchQuery || "").toLowerCase();
    const matchSearch = !q || c.product?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q) || c.supplier?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeContractTab === "pending")   return c.status === 'pending' || c.status === 'approved';
    if (activeContractTab === "active")    return c.status === 'active';
    if (activeContractTab === "completed") return c.status === 'completed';
    if (activeContractTab === "cancelled") return c.status === 'cancelled';
    return false;
  });

  const openContract = async (contract) => {
    setSignSuccess(false); setAgreed(false); setSignatureMode("draw");
    setSelectedContract(contract);
    setDetailLoading(true);
    try {
      const res = await contractService.getById(contract._id);
      if (res?.data?.contract) setSelectedContract(mapContract(res.data.contract));
    } catch { /* use list data */ }
    finally { setDetailLoading(false); }
  };

  const goBack = () => { setSelectedContract(null); setSignSuccess(false); setShowCancelModal(false); };

  const handleSign = async () => {
    if (!agreed || !selectedContract || signingLoading) return;
    setSigningLoading(true);
    try {
      await contractService.sign(selectedContract._id);
      setSignSuccess(true);
      await loadContracts();
    } catch (err) {
      toast.error(err?.message || "Ký hợp đồng thất bại.");
    } finally { setSigningLoading(false); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim() || cancelLoading || !selectedContract) return;
    setCancelLoading(true);
    try {
      await contractService.cancel(selectedContract._id, cancelReason);
      toast.success("Đã hủy hợp đồng.");
      setShowCancelModal(false); setCancelReason("");
      setSelectedContract(null);
      await loadContracts();
    } catch (err) {
      toast.error(err?.message || "Hủy hợp đồng thất bại.");
    } finally { setCancelLoading(false); }
  };

  const sc = selectedContract;

  return (
    <>
      <div className="breadcrumb">
        <span onClick={goBack} style={{ cursor: sc ? 'pointer' : 'default' }}>Trang chủ</span>
        <span className="arrow">›</span>
        <span onClick={sc ? goBack : undefined} style={{ cursor: sc ? 'pointer' : 'default', color: sc ? '#618968' : undefined }}>Hợp đồng</span>
        {sc && <><span className="arrow">›</span><span className="active">{sc.contractCode || sc.id}</span></>}
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Hợp đồng Thu mua</h1>
          <p className="page-subtitle">Tổng: <strong>{contracts.length} hợp đồng</strong> — Phí dịch vụ {COMPANY.NAME}: <strong>{COMPANY.COMMISSION_RATE}%</strong></p>
        </div>
        {!sc && (
          <button className="cf-btn primary" onClick={() => navigate(ROUTES.CONTRACT_FLOW)}>
            + Tạo hợp đồng mới
          </button>
        )}
      </div>

      {/* ═══ DETAIL VIEW ═══ */}
      {sc && (
        detailLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, margin: '0 auto 12px', display: 'block', color: '#d1d5db' }}><path d="M5 3h10M5 17h10M7 3v5l-2 4 2 4M13 3v5l2 4-2 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p>Đang tải hợp đồng...</p>
          </div>
        ) : signSuccess ? (
          <div className="sign-success-card">
            <div className="ssc-icon">✓</div>
            <h2>Ký hợp đồng thành công!</h2>
            <p>Hợp đồng <strong>{sc.contractCode || sc.id}</strong> đã được ký điện tử.</p>
            <div className="ssc-info-grid">
              <div className="ssc-info-item"><span>Nông dân</span><strong>{sc.supplier}</strong></div>
              <div className="ssc-info-item"><span>Sản phẩm</span><strong>{sc.product}</strong></div>
              <div className="ssc-info-item"><span>Giá trị</span><strong>{sc.valueLabel}</strong></div>
              <div className="ssc-info-item"><span>Ngày giao</span><strong>{sc.deliveryDateLabel}</strong></div>
            </div>
            <p className="ssc-note">{sc.signedByFarmer ? "Cả hai bên đã ký. Hệ thống Escrow đã được kích hoạt tự động." : "Đang chờ nông dân ký. Khi cả hai bên ký xong, hệ thống Escrow sẽ được kích hoạt."}</p>
            <div className="ssc-actions">
              <button className="ssc-btn-primary" onClick={goBack}>← Về danh sách</button>
            </div>
          </div>
        ) : (
          <div className="contract-detail-view">
            <div className="cd-topnav">
              <button className="cd-back-btn" onClick={goBack}>← Danh sách hợp đồng</button>
              <div className="cd-topnav-right">
                <span className="cd-code-badge">{sc.contractCode || sc.id || "—"}</span>
                <span className={`status-badge ${sc.status}`}>{CONTRACT_STATUS_VI_ENT[sc.status] || sc.status}</span>
              </div>
            </div>

            <div className="contract-grid">
              {/* Left: document */}
              <div className="contract-preview">
                <div className="preview-header">
                  <div className="preview-title">
                    <span className="doc-icon" />
                    <span>Nội dung hợp đồng</span>
                  </div>
                  <div className="preview-header-status">
                    <span className={`preview-status-dot ${sc.signedByEnterprise ? 'signed' : 'waiting'}`} />
                    <span className="preview-status-text">{sc.signedByEnterprise ? 'Bạn đã ký' : 'Chờ chữ ký của bạn'}</span>
                    <span className="preview-divider">|</span>
                    <span className={`preview-status-dot ${sc.signedByFarmer ? 'signed' : 'waiting'}`} />
                    <span className="preview-status-text">{sc.signedByFarmer ? 'Nông dân đã ký' : 'Chờ nông dân ký'}</span>
                  </div>
                </div>
                <div className="preview-body">
                  <div className="contract-document">
                    <div className="doc-header">
                      <div className="doc-logo-row"><span className="doc-logo-text">{COMPANY.NAME}</span></div>
                      <h3>THỎA THUẬN MUA BÁN NÔNG SẢN</h3>
                      <p>Mã: <strong>{sc.contractCode || sc.id}</strong></p>
                      <p className="doc-date">Ngày lập: {sc.dateLabel || "—"}</p>
                    </div>
                    <div className="doc-content">
                      <section className="doc-section">
                        <h4>1. CÁC BÊN THAM GIA</h4>
                        <div className="doc-parties">
                          <div className="doc-party">
                            <span className="party-role">Bên bán (Nông dân)</span>
                            <span className="party-name">{sc.farmerName || sc.supplier}</span>
                          </div>
                          <div className="doc-party-divider">—</div>
                          <div className="doc-party">
                            <span className="party-role">Bên mua (Doanh nghiệp)</span>
                            <span className="party-name">{sc.enterpriseName || "—"}</span>
                          </div>
                        </div>
                      </section>
                      <section className="doc-section">
                        <h4>2. ĐỐI TƯỢNG HỢP ĐỒNG</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row"><span>Sản phẩm</span><strong>{sc.productName || sc.product}</strong></div>
                          <div className="ddt-row"><span>Số lượng</span><strong>{sc.quantityLabel}</strong></div>
                          <div className="ddt-row"><span>Đơn giá</span><strong>{formatMoney(sc.pricePerUnit)} / {sc.unit}</strong></div>
                          {sc.notes && <div className="ddt-row"><span>Ghi chú</span><strong>{sc.notes}</strong></div>}
                        </div>
                      </section>
                      <section className="doc-section">
                        <h4>3. GIÁ TRỊ &amp; THANH TOÁN</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row highlight"><span>Tổng giá trị</span><strong>{sc.valueLabel}</strong></div>
                          <div className="ddt-row"><span>Hình thức</span><strong>{ENT_PAYMENT_LABELS[sc.paymentTerms] || sc.paymentTerms || "—"}</strong></div>
                          <div className="ddt-row"><span>Đặt cọc ({sc.depositPercentage}%)</span><strong>{formatMoney(sc.depositAmount)}</strong></div>
                          <div className="ddt-row muted"><span>Phí {COMPANY.NAME} ({sc.commissionRate || COMPANY.COMMISSION_RATE}%)</span><strong>{formatMoney(sc.commission)}</strong></div>
                        </div>
                      </section>
                      <section className="doc-section">
                        <h4>4. THỜI GIAN GIAO HÀNG</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row"><span>Ngày giao</span><strong>{sc.deliveryDateLabel || "—"}</strong></div>
                        </div>
                      </section>
                      <div className="doc-signatures">
                        <div className={`signature-box ${sc.signedByEnterprise ? 'buyer-signed' : 'buyer-pending-box'}`}>
                          <p className="sig-label">{sc.enterpriseName || 'Bên mua'}</p>
                          {sc.signedByEnterprise ? <p className="sig-status sig-signed">✓ Đã ký</p> : <p className="sig-status sig-waiting">Chờ ký ▼</p>}
                          <span className="sig-role">BÊN MUA</span>
                        </div>
                        <div className={`signature-box ${sc.signedByFarmer ? 'seller-signed-done' : 'seller-pending'}`}>
                          <p className="sig-label">{sc.farmerName || sc.supplier || 'Bên bán'}</p>
                          {sc.signedByFarmer ? <p className="sig-status sig-signed">✓ Đã ký</p> : <p className="sig-status sig-waiting">Chưa ký</p>}
                          <span className="sig-role">BÊN BÁN</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: sidebar */}
              <div className="contract-sidebar">
                <div className="cd-info-panel">
                  <div className="cd-info-header">Tóm tắt hợp đồng</div>
                  <div className="cd-info-body">
                    <div className="cd-info-row"><span>Nông dân</span><strong>{sc.supplier}</strong></div>
                    <div className="cd-info-row"><span>Sản phẩm</span><strong>{sc.product}</strong></div>
                    <div className="cd-info-row"><span>Giá trị</span><strong className="cd-value-hl">{sc.valueLabel}</strong></div>
                    <div className="cd-info-row"><span>Ngày giao</span><strong>{sc.deliveryDateLabel}</strong></div>
                    <div className="cd-info-row"><span>Đặt cọc</span><strong>{formatMoney(sc.depositAmount)}</strong></div>
                  </div>
                </div>

                {/* Sign panel — enterprise hasn't signed yet */}
                {sc.status === 'pending' && !sc.signedByEnterprise && (
                  <div className="signature-panel">
                    <div className="panel-header">
                      <h4>Ký điện tử phê duyệt</h4>
                      <p>Xác nhận và ký kết hợp đồng</p>
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
                          <p className="canvas-hint">Ký tại đây</p>
                          <svg className="signature-svg" viewBox="0 0 400 300">
                            <path d="M50,150 C70,140 120,130 150,150 S200,180 250,160 S300,120 350,140" fill="none" stroke="#111812" strokeLinecap="round" strokeWidth="3" />
                          </svg>
                          <button className="clear-btn">Xóa</button>
                        </div>
                      )}
                      {signatureMode !== "draw" && (
                        <div className="sig-alt-area">
                          <p>{signatureMode === "upload" ? "Tải lên ảnh chữ ký" : "Xác nhận qua mã OTP"}</p>
                          <span>{signatureMode === "upload" ? "PNG, JPG — tối đa 5MB" : "Gửi mã đến SĐT đã đăng ký"}</span>
                          {signatureMode === "otp" && <button className="otp-send-btn">Gửi mã OTP</button>}
                        </div>
                      )}
                      <div className="agreement-box">
                        <label>
                          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                          <span>
                            Tôi xác nhận đã đọc đầy đủ hợp đồng,&nbsp;
                            <button type="button" className="cf-link-btn" onClick={() => setShowSignTerms(true)}>điều khoản ký kết</button>
                            &nbsp;và đồng ý. Phí trung gian: <strong>{COMPANY.COMMISSION_RATE}%</strong>.
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="panel-footer">
                      <button className="sign-btn" disabled={!agreed || signingLoading} onClick={handleSign}>
                        {signingLoading ? "Đang xử lý..." : "Ký hợp đồng ngay"}
                      </button>
                      <p className="security-note"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 12, height: 12, marginRight: 4, verticalAlign: 'middle' }}><path d="M8 1l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V3l5-2z" strokeLinejoin="round"/></svg>Mã hóa SSL 256-bit · Hiệu lực pháp lý</p>
                    </div>
                  </div>
                )}

                {/* Enterprise signed, waiting for farmer */}
                {sc.signedByEnterprise && !sc.signedByFarmer && (
                  <div className="cd-signed-badge" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <p>✓ Bạn đã ký hợp đồng này</p>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>Đang chờ nông dân ký kết...</span>
                  </div>
                )}

                {/* Both signed */}
                {sc.signedByEnterprise && sc.signedByFarmer && (
                  <div className="cd-signed-badge" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 22 }}>✓</span>
                      <div>
                        <p>Cả hai bên đã ký kết</p>
                        <span style={{ color: '#4ade80', fontSize: 12 }}>Hệ thống Escrow đã được kích hoạt</span>
                      </div>
                    </div>
                    {sc.status === 'approved' && onNavigate && (
                      <button
                        className="approve-btn"
                        style={{ width: '100%', marginTop: 2, padding: '10px 16px', fontWeight: 700 }}
                        onClick={() => { goBack(); onNavigate("escrow"); }}
                      >
                        Nạp ký quỹ ngay →
                      </button>
                    )}
                  </div>
                )}

                {/* Cancel button */}
                {(sc.status === 'pending' || sc.status === 'approved') && (
                  <button className="cd-cancel-btn" onClick={() => setShowCancelModal(true)}>
                    Hủy hợp đồng này
                  </button>
                )}

                <div className="support-panel">
                  <h5>HỖ TRỢ KÝ KẾT</h5>
                  <p>Cần tư vấn? Kết nối với chuyên viên pháp lý {COMPANY.NAME}.</p>
                  <button>Yêu cầu gọi lại</button>
                </div>
              </div>
            </div>

            {/* Cancel modal */}
            {showCancelModal && (
              <div className="terms-modal-overlay" onClick={() => !cancelLoading && setShowCancelModal(false)}>
                <div className="terms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                  <div className="terms-modal-header">
                    <h3>Hủy hợp đồng</h3>
                    <button className="terms-modal-close" onClick={() => setShowCancelModal(false)} disabled={cancelLoading}>✕</button>
                  </div>
                  <div className="terms-modal-body">
                    <p style={{ marginBottom: 12 }}>Lý do hủy hợp đồng <strong>{sc.contractCode || sc.id}</strong>:</p>
                    <textarea className="cd-cancel-reason" placeholder="Nhập lý do hủy..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={4} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', resize: 'vertical' }} />
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Hành động này không thể hoàn tác.</p>
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

            {/* Terms modal */}
            {showSignTerms && (
              <div className="terms-modal-overlay" onClick={() => setShowSignTerms(false)}>
                <div className="terms-modal" onClick={e => e.stopPropagation()}>
                  <div className="terms-modal-header">
                    <h3>Điều khoản Ký kết Hợp đồng</h3>
                    <button className="terms-modal-close" onClick={() => setShowSignTerms(false)}>✕</button>
                  </div>
                  <div className="terms-modal-body">
                    <h4>1. Hiệu lực của chữ ký điện tử</h4>
                    <p>Chữ ký điện tử của bạn trên nền tảng {COMPANY.NAME} có giá trị pháp lý tương đương chữ ký tay theo Luật Giao dịch Điện tử Việt Nam. Hành động ký được ghi nhận kèm thời gian và thiết bị thực hiện.</p>
                    <h4>2. Trách nhiệm của Doanh nghiệp khi ký</h4>
                    <p>Bằng việc ký hợp đồng, Doanh nghiệp cam kết: (i) đã đọc và hiểu toàn bộ nội dung; (ii) có đủ thẩm quyền đại diện pháp lý; (iii) thực hiện đầy đủ các nghĩa vụ trong hợp đồng.</p>
                    <h4>3. Hệ thống Escrow</h4>
                    <p>Khi cả hai bên ký, hệ thống Escrow được kích hoạt. Doanh nghiệp cần nạp tiền vào Escrow trước khi giao hàng bắt đầu. Phí dịch vụ <strong>{COMPANY.COMMISSION_RATE}%</strong> được khấu trừ tự động khi giải ngân.</p>
                    <h4>4. Hủy hợp đồng</h4>
                    <p>Sau khi ký, hợp đồng chỉ có thể hủy khi cả hai bên đồng ý hoặc có vi phạm nghiêm trọng được {COMPANY.NAME} xác nhận.</p>
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

      {/* ═══ LIST VIEW ═══ */}
      {!sc && (
        <>
          <div className="contract-tabs">
            {tabs.map(tab => (
              <button key={tab.key} className={`contract-tab ${activeContractTab === tab.key ? "active" : ""}`} onClick={() => setActiveContractTab(tab.key)}>
                {tab.label} {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="contracts-list">
            {apiContracts === null && <p style={{ textAlign: "center", color: "#888", padding: "40px" }}>Đang tải hợp đồng...</p>}
            {apiContracts !== null && filteredContracts.length === 0 && (
              <p style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                {activeContractTab === "pending" ? "Chưa có hợp đồng nào đang chờ phê duyệt." : "Không có hợp đồng nào trong mục này."}
              </p>
            )}
            {filteredContracts.map(contract => {
              const cci = contract.status === 'active' ? 'cci-active' : contract.status === 'completed' ? 'cci-completed' : contract.status === 'cancelled' ? 'cci-cancelled' : 'cci-pending';
              return (
                <div key={contract.id} className={`contract-card-item ${cci}`}>
                  <div className="contract-main">
                    <div className="contract-left">
                      <h4>{contract.supplier}</h4>
                      <p className="contract-meta">{contract.product} · {contract.quantityLabel}</p>
                      <p className="cci-code" style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{contract.id}</p>
                    </div>
                    <div className="contract-right">
                      <span className="contract-value">{contract.valueLabel}</span>
                      <span className={`status-badge ${contract.status}`}>{CONTRACT_STATUS_VI_ENT[contract.status] || contract.status}</span>
                    </div>
                  </div>
                  <div className="contract-actions-row">
                    <span className="contract-date cci-date">Tạo: {contract.dateLabel}</span>
                    {contract.status === 'pending' && !contract.signedByEnterprise && (
                      <>
                        <button className="approve-btn" onClick={() => openContract(contract)}>Ký hợp đồng</button>
                        <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                        <button className="reject-btn" onClick={() => { setSelectedContract(contract); setShowCancelModal(true); }}>Hủy</button>
                      </>
                    )}
                    {contract.status === 'pending' && contract.signedByEnterprise && !contract.signedByFarmer && (
                      <>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Chờ nông dân ký</span>
                        <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                      </>
                    )}
                    {contract.status === 'approved' && (
                      <>
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Cả hai đã ký — Chờ ký quỹ</span>
                        {onNavigate && (
                          <button className="approve-btn" onClick={() => onNavigate("escrow")}>
                            Nạp ký quỹ ngay →
                          </button>
                        )}
                        <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                      </>
                    )}
                    {contract.status === 'active' && (
                      <button className="review-btn" onClick={() => openContract(contract)}>Xem tiến độ</button>
                    )}
                    {contract.status === 'completed' && (
                      <button className="review-btn" onClick={() => openContract(contract)}>Xem báo cáo</button>
                    )}
                    {contract.status === 'cancelled' && (
                      <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Activity log — derived from real data */}
      {!sc && (
        <div className="activity-log">
          <div className="activity-header">
            <h4>Lịch sử giao dịch</h4>
            <span className="update-time">Cập nhật mới nhất</span>
          </div>
          <div className="activity-list">
            {contracts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>Chưa có hoạt động nào</div>
            ) : contracts.slice(0, 5).map((c, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-icon ${c.status === 'active' || c.status === 'completed' ? 'success' : 'pending'}`}>
                  <span className={`ai-dot ${c.status === 'active' || c.status === 'completed' ? 'success' : 'pending'}`} />
                </div>
                <div className="activity-details">
                  <p className="activity-title">{CONTRACT_STATUS_VI_ENT[c.status] || c.status}: {c.supplier}</p>
                  <p className="activity-desc">{c.product} · {c.quantityLabel}</p>
                </div>
                <span className="activity-time">{c.dateLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================
   SẢN PHẨM — Product catalog
   ========================================= */
const REGION_MAP = { north: "north", central: "central", south: "south", "Miền Bắc": "north", "Miền Trung": "central", "Miền Nam": "south" };

function SanPhamContent({ navigate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRegion, setFilterRegion] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [apiProducts, setApiProducts] = useState(null);

  useEffect(() => {
    productService.getAll({ limit: 100 }).then(res => {
      // Fix: API returns res.data.products (array), not res.data (object)
      const items = (res?.data?.products || []).map(p => ({
        id: p._id || p.id,
        name: p.name || p.productName || "Nông sản",
        location: p.location || p.origin || "Việt Nam",
        farm: p.farm || p.seller?.name || "",
        image: resolveImageUrl(p.image || p.images?.[0]) || "/images/products/default.jpg",
        badge: p.certifications?.[0] || p.badge || "",
        region: REGION_MAP[p.region] || "south",
        priceMin: p.priceMin || p.price || 0,
        priceMax: p.priceMax || p.price || 0,
        unit: p.unit || "kg",
        rating: p.rating || 0,
        reviewCount: p.reviewCount || p.reviews || 0,
        remaining: p.remaining || p.quantity || 0,
        progress: p.progress || 0,
      }));
      setApiProducts(items);
    }).catch(() => setApiProducts([]));
  }, []);

  const source = apiProducts !== null ? apiProducts : [];
  const filtered = source.filter(p => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.location || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchRegion = filterRegion === "all" || p.region === filterRegion;
    return matchSearch && matchRegion;
  });

  const handleViewDetail = (productId) => {
    navigate(`/products/${productId}`);
  };

  const handleCreateContract = (productId) => {
    navigate(`${ROUTES.CONTRACT_FLOW}?product=${productId}`);
  };

  const regionOptions = [
    { key: "all", label: "Tất cả miền" },
    { key: "north", label: "Miền Bắc" },
    { key: "central", label: "Miền Trung" },
    { key: "south", label: "Miền Nam" },
  ];

  return (
    <>
      {/* HEADER */}
      <div className="sp-header">
        <div className="sp-header-content">
          <h1 className="sp-title">Danh Sách Sản Phẩm Bao Tiêu</h1>
          <p className="sp-subtitle">Khám phá nông sản chất lượng cao từ khắp nơi. Cơ hội tốt nhất để tìm kiếm nguồn cung uy tín</p>
        </div>
      </div>

      {/* REGION TABS */}
      <div className="sp-regions">
        {regionOptions.map(r => (
          <button
            key={r.key}
            className={`sp-region-btn ${filterRegion === r.key ? "active" : ""}`}
            onClick={() => setFilterRegion(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* FILTERS & SEARCH */}
      <div className="sp-controls">
        <div className="sp-search-wrapper">
          <FiSearch size={16} className="sp-search-icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm sản phẩm, vị trí..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="sp-search-input"
          />
        </div>
        <select className="sp-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="popular">Phổ biến nhất</option>
          <option value="rating">Đánh giá cao</option>
          <option value="price-asc">Giá thấp → cao</option>
          <option value="price-desc">Giá cao → thấp</option>
        </select>
      </div>

      {/* RESULT COUNT */}
      {apiProducts !== null && (
        <div className="sp-result-info">
          <span className="sp-count">Tìm thấy <strong>{filtered.length}</strong> sản phẩm</span>
        </div>
      )}

      {/* PRODUCT GRID */}
      <div className="sp-grid">
        {apiProducts === null ? (
          <div className="sp-loading-state">
            <div className="sp-spinner" />
            <p>Đang tải sản phẩm...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sp-empty-state">
            <FiFeather size={48} />
            <p>Không tìm thấy sản phẩm phù hợp</p>
            <span className="sp-empty-hint">Hãy thử thay đổi bộ lọc hoặc tìm kiếm khác</span>
          </div>
        ) : (
          filtered.map(product => (
            <div key={product.id} className="sp-card">
              <div className="sp-card-img">
                <img src={product.image} alt={product.name} />
                {product.badge && <span className="sp-badge">{product.badge}</span>}
                <div className="sp-progress-tag" style={{ width: `${product.progress}%` }}>
                  <span>{product.progress}%</span>
                </div>
              </div>
              <div className="sp-card-body">
                <div className="sp-location">
                  <FiMapPin size={12} />
                  {product.location}{product.farm && ` – ${product.farm}`}
                </div>
                <h3 className="sp-product-name">{product.name}</h3>
                <div className="sp-pricing-row">
                  <div className="sp-price">
                    {formatPriceRange(product.priceMin, product.priceMax)}
                    <span className="sp-unit">/{product.unit}</span>
                  </div>
                  <div className="sp-rating">
                    <FiStar size={13} fill="#fbbf24" />
                    <span>{product.rating}</span>
                  </div>
                </div>
                <div className="sp-stock-bar">
                  <div className="sp-stock-fill" style={{ width: Math.min(100, (product.remaining / 1000) * 100) }}></div>
                </div>
                <div className="sp-stock-info">Còn {product.remaining.toLocaleString()} {product.unit}</div>
                <div className="sp-actions">
                  <button className="sp-btn-secondary" onClick={() => handleViewDetail(product.id)}>Xem chi tiết</button>
                  <button className="sp-btn-primary" onClick={() => handleCreateContract(product.id)}>Tạo hợp đồng</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* =========================================
   ĐƠN HÀNG — Order tracking
   ========================================= */
function DonHangContent({ searchQuery = "" }) {
  const [orderTab, setOrderTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [apiOrders, setApiOrders] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Return goods dispute modal
  const [returnModal, setReturnModal] = useState(null); // { order }
  const [returnReason, setReturnReason] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  // QC checklist
  const [qcChecked, setQcChecked] = useState([false, false, false, false]);
  const [qcVerifiedByOrder, setQcVerifiedByOrder] = useState({});
  const toast = useToast();

  const loadOrders = useCallback(async () => {
    try {
      const res = await enterpriseService.getOrders();
      const mapped = (res?.data?.orders || []).map(o => ({
        contractId: o.id,
        contractCode: o.contractCode || String(o.id),
        supplier: o.farmerName || "Nông dân",
        product: o.productName || "Nông sản",
        quantity: o.quantity || "N/A",
        value: formatMoney(o.value || 0),
        rawValue: o.value || 0,
        status: o.status,
        eta: formatDate(o.deliveryDate),
        orderDate: formatDate(o.createdAt),
        escrowStatus: o.escrowStatus || "none",
        currentMilestone: o.currentMilestone || null,
        currentMilestoneStep: o.currentMilestoneStep || null,
        currentMilestoneRequiredBy: o.currentMilestoneRequiredBy || null,
        completedSteps: o.completedSteps || 0,
        totalSteps: o.totalSteps || 5,
        enterpriseCanConfirm: Boolean(o.enterpriseCanConfirm),
        enterpriseConfirmStep: o.enterpriseConfirmStep || null,
        disputeStep: o.disputeStep || null,
        waitingFor: o.waitingFor || null,
      }));
      setApiOrders(mapped);
    } catch { setApiOrders([]); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    if (!selectedOrder || selectedOrder.status !== "quality_check") {
      setQcChecked([false, false, false, false]);
      return;
    }
    if (qcVerifiedByOrder[selectedOrder.contractId]) {
      setQcChecked([true, true, true, true]);
    } else {
      setQcChecked([false, false, false, false]);
    }
  }, [selectedOrder, qcVerifiedByOrder]);

  const orders = apiOrders || [];
  const noEscrowCount = orders.filter(o => o.escrowStatus === "none").length;
  const awaitingDepositCount = orders.filter(o => o.escrowStatus === "awaiting_deposit").length;

  const statusLabels = {
    confirmed: { label: "Đã xác nhận", cls: "confirmed" },
    processing: { label: "Đang xử lý", cls: "processing" },
    shipping: { label: "Đang vận chuyển", cls: "shipping" },
    quality_check: { label: "Kiểm tra chất lượng", cls: "quality" },
    delivered: { label: "Đã giao hàng", cls: "delivered" },
  };

  const escrowStatusLabels = {
    none: { label: "Chưa có ký quỹ", cls: "esc-none" },
    awaiting_deposit: { label: "Chờ nạp ký quỹ", cls: "esc-awaiting" },
    funded: { label: "Đã ký quỹ", cls: "esc-funded" },
    partially_released: { label: "Đang giải ngân", cls: "esc-partial" },
    fully_released: { label: "Ký quỹ hoàn tất", cls: "esc-done" },
    refunded: { label: "Đã hoàn trả", cls: "esc-refund" },
    disputed: { label: "Tranh chấp", cls: "esc-dispute" },
  };

  const orderTabs = [
    { key: "all", label: "Tất cả", count: orders.length },
    { key: "confirmed", label: "Đã xác nhận", count: orders.filter(o => o.status === "confirmed").length },
    { key: "processing", label: "Đang xử lý", count: orders.filter(o => o.status === "processing").length },
    { key: "shipping", label: "Đang vận chuyển", count: orders.filter(o => o.status === "shipping").length },
    { key: "quality_check", label: "Kiểm tra CL", count: orders.filter(o => o.status === "quality_check").length },
    { key: "delivered", label: "Đã giao", count: orders.filter(o => o.status === "delivered").length },
  ];

  const filtered = orders
    .filter(o => orderTab === "all" || o.status === orderTab)
    .filter(o => !searchQuery || o.product?.toLowerCase().includes(searchQuery.toLowerCase()) || o.supplier?.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalValue = orders.reduce((sum, o) => sum + o.rawValue, 0);
  const shippingCount = orders.filter(o => o.status === "shipping").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;
  const pendingCount = orders.filter(o => ["confirmed", "processing"].includes(o.status)).length;

  const handleCreateEscrow = async (order) => {
    setActionLoading(true);
    try {
      await escrowService.create(order.contractId);
      toast.success('Tạo ký quỹ thành công! Vào "Thanh toán trung gian" để nạp tiền.');
      await loadOrders();
    } catch (err) {
      toast.error(err?.message || "Tạo ký quỹ thất bại. Vui lòng thử lại.");
    } finally {
      setActionLoading(false);
      setActionModal(null);
    }
  };

  const handleMilestoneConfirm = async (order) => {
    if (!order.enterpriseCanConfirm || !order.enterpriseConfirmStep) {
      const waitingMessages = {
        farmer: "Đơn hàng đang chờ nông dân xác nhận ở mốc hiện tại.",
        system: "Đơn hàng đang được hệ thống xử lý tự động.",
        enterprise: "Đơn hàng chưa đủ điều kiện xác nhận. Vui lòng thử lại sau.",
      };

      toast.warning(waitingMessages[order.waitingFor] || "Đơn hàng chưa sẵn sàng để xác nhận.");
      setActionModal(null);
      return;
    }

    if (order.status === "quality_check" && !qcVerifiedByOrder[order.contractId]) {
      toast.warning("Vui lòng hoàn tất checklist kiểm tra chất lượng trước khi xác nhận.");
      setSelectedOrder(order);
      setActionModal(null);
      return;
    }
    setActionLoading(true);
    try {
      const escrowRes = await escrowService.getByContract(order.contractId);
      const escrow = escrowRes?.data?.escrow;
      if (!escrow) throw new Error("Không tìm thấy escrow cho hợp đồng này");
      await escrowService.enterpriseConfirm(escrow._id || escrow.id, order.enterpriseConfirmStep);
      toast.success("Xác nhận thành công! Tiền sẽ được giải ngân cho nông dân.");
      await loadOrders();
    } catch (err) {
      toast.error(err?.message || "Xác nhận thất bại. Vui lòng thử lại.");
    } finally {
      setActionLoading(false);
      setActionModal(null);
    }
  };

  const handleReturnGoods = async () => {
    if (!returnReason.trim()) {
      toast.warning("Vui lòng cung cấp lý do trả hàng.");
      return;
    }
    setReturnLoading(true);
    try {
      const escrowRes = await escrowService.getByContract(returnModal.contractId);
      const escrow = escrowRes?.data?.escrow;
      if (!escrow) throw new Error("Không tìm thấy escrow cho hợp đồng này");
      const disputeStep = returnModal.disputeStep || returnModal.currentMilestoneStep || 4;
      await escrowService.raiseDispute(escrow._id || escrow.id, disputeStep, returnReason.trim(), []);
      toast.success("Đã gửi khiếu nại trả hàng. Đội ngũ PreOnic sẽ xem xét và phân giải.");
      setReturnModal(null);
      setReturnReason("");
      await loadOrders();
    } catch (err) {
      toast.error(err?.message || "Gửi khiếu nại thất bại.");
    } finally {
      setReturnLoading(false);
    }
  };

  return (
    <>
      <div className="breadcrumb"><span>Trang chủ</span><span className="arrow">&gt;</span><span>Theo dõi đơn hàng</span></div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Theo Dõi Đơn Hàng</h1>
          <p className="page-subtitle">Giám sát tiến độ các hợp đồng thu mua nông sản từ giao hàng đến hoàn tất</p>
        </div>
      </div>

      <section className="order-mechanism-guide">
        <article className="omg-card">
          <h4>Xem chi tiết</h4>
          <p>Mở đầy đủ hợp đồng, tiến trình, trạng thái ký quỹ và checklist kiểm tra theo từng đơn.</p>
        </article>
        <article className="omg-card">
          <h4>Xác nhận đơn hàng</h4>
          <p>Chỉ khả dụng khi đến mốc doanh nghiệp cần xác nhận. Ở bước chất lượng, cần tick đủ checklist trước khi duyệt.</p>
        </article>
        <article className="omg-card">
          <h4>Trả hàng / Khiếu nại</h4>
          <p>Tạo tranh chấp tại mốc đang xử lý để tạm dừng ký quỹ và chuyển hồ sơ cho PreOnic phân giải.</p>
        </article>
      </section>

      {/* Alert banner for orders needing escrow */}
      {(noEscrowCount > 0 || awaitingDepositCount > 0) && (
        <div className="order-escrow-alert">
          <span className="oea-icon" />
          <div className="oea-text">
            {noEscrowCount > 0 && (
              <span><strong>{noEscrowCount} hợp đồng</strong> đang hoạt động chưa có ký quỹ — nhấn "Tạo ký quỹ" trên từng đơn để bảo vệ giao dịch.</span>
            )}
            {noEscrowCount > 0 && awaitingDepositCount > 0 && <br />}
            {awaitingDepositCount > 0 && (
              <span><strong>{awaitingDepositCount} ký quỹ</strong> đang chờ nạp tiền — vào tab <em>Thanh toán trung gian</em> để nạp ngay.</span>
            )}
          </div>
        </div>
      )}

      {/* Order Summary Stats */}
      <section className="order-summary-stats">
        <div className="order-stat-card">
          <div className="order-stat-icon total-icon"></div>
          <div className="order-stat-content">
            <span className="order-stat-label">Tổng đơn hàng</span>
            <h3 className="order-stat-value">{orders.length}</h3>
          </div>
        </div>
        <div className="order-stat-card">
          <div className="order-stat-icon pending-icon"></div>
          <div className="order-stat-content">
            <span className="order-stat-label">Chờ xử lý</span>
            <h3 className="order-stat-value">{pendingCount}</h3>
          </div>
        </div>
        <div className="order-stat-card">
          <div className="order-stat-icon shipping-stat-icon"></div>
          <div className="order-stat-content">
            <span className="order-stat-label">Đang vận chuyển</span>
            <h3 className="order-stat-value">{shippingCount}</h3>
          </div>
        </div>
        <div className="order-stat-card">
          <div className="order-stat-icon delivered-icon"></div>
          <div className="order-stat-content">
            <span className="order-stat-label">Đã giao hàng</span>
            <h3 className="order-stat-value">{deliveredCount}</h3>
          </div>
        </div>
        <div className="order-stat-card wide">
          <div className="order-stat-icon value-icon"></div>
          <div className="order-stat-content">
            <span className="order-stat-label">Tổng giá trị đơn hàng</span>
            <h3 className="order-stat-value">{totalValue.toLocaleString("vi-VN")} VND</h3>
          </div>
        </div>
      </section>

      {/* Order Tabs */}
      <div className="order-tabs">
        {orderTabs.map(t => (
          <button key={t.key} className={`order-tab ${orderTab === t.key ? "active" : ""}`} onClick={() => setOrderTab(t.key)}>
            {t.label} {t.count > 0 && <span className="tab-count">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="order-detail-overlay" onClick={() => !actionLoading && setActionModal(null)}>
          <div className="order-detail-modal" style={{ maxWidth: "480px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{actionModal.type === "create_escrow" ? "Tạo ký quỹ cho hợp đồng" : "Xác nhận mốc thanh toán"}</h3>
              <button className="modal-close" onClick={() => !actionLoading && setActionModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Hợp đồng:</strong> {actionModal.order.contractCode}</p>
              <p><strong>Sản phẩm:</strong> {actionModal.order.product}</p>
              <p><strong>Nhà cung cấp:</strong> {actionModal.order.supplier}</p>
              <p><strong>Giá trị:</strong> {actionModal.order.value}</p>
              {actionModal.type === "create_escrow" ? (
                <div className="order-action-info">
                  <p>Hệ thống sẽ tạo tài khoản ký quỹ cho hợp đồng này. Sau đó vào <strong>Thanh toán trung gian</strong> để nạp số tiền ký quỹ theo hợp đồng.</p>
                </div>
              ) : (
                <div className="order-action-info">
                  {actionModal.order.status === "quality_check" && !qcVerifiedByOrder[actionModal.order.contractId] ? (
                    <p>Đơn hàng đang ở bước <strong>Kiểm tra chất lượng</strong>. Vui lòng mở chi tiết đơn hàng và tick đủ checklist trước khi xác nhận giải ngân.</p>
                  ) : (
                    <p>Xác nhận rằng bạn đã kiểm tra hàng hóa đạt tiêu chuẩn. Mốc thanh toán hiện tại sẽ được hoàn tất và tiền sẽ được giải ngân cho nông dân.</p>
                  )}
                </div>
              )}
              <p className="escrow-modal-warning">Hành động này không thể hoàn tác. Bạn có chắc chắn không?</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-primary"
                  disabled={actionLoading || (actionModal.type === "confirm_milestone" && !actionModal.order.enterpriseCanConfirm)}
                onClick={() => {
                  if (actionModal.type === "create_escrow") {
                    handleCreateEscrow(actionModal.order);
                    return;
                  }
                  if (actionModal.order.status === "quality_check" && !qcVerifiedByOrder[actionModal.order.contractId]) {
                    setActionModal(null);
                    setSelectedOrder(actionModal.order);
                    return;
                  }
                  handleMilestoneConfirm(actionModal.order);
                }}
              >
                {actionLoading
                  ? "Đang xử lý..."
                  : actionModal.type === "create_escrow"
                    ? "Tạo ký quỹ"
                    : !actionModal.order.enterpriseCanConfirm
                      ? "Chưa thể xác nhận"
                      : actionModal.order.status === "quality_check" && !qcVerifiedByOrder[actionModal.order.contractId]
                      ? "Mở checklist CL"
                      : "Xác nhận"}
              </button>
              <button className="btn-outline" onClick={() => !actionLoading && setActionModal(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (() => {
        const stepMap = { confirmed: 1, processing: 2, shipping: 3, quality_check: 4, delivered: 5 };
        const currentStep = stepMap[selectedOrder.status] || 0;
        const QC_ITEMS = [
          { id: 0, label: "Số lượng khớp với hợp đồng", extra: selectedOrder.quantity },
          { id: 1, label: "Chất lượng sản phẩm đạt tiêu chuẩn cam kết" },
          { id: 2, label: "Bao bì, tem nhãn đầy đủ và không hư hại" },
          { id: 3, label: "Giấy tờ giao hàng hợp lệ" },
        ];
        const allChecked = qcChecked.every(Boolean);
        const checkedCount = qcChecked.filter(Boolean).length;
        const steps = [
          { label: "Xác nhận đơn", desc: "Hợp đồng đã ký, đơn hàng được xác nhận" },
          { label: "Đang xử lý", desc: "Nông dân đang chuẩn bị và thu hoạch hàng" },
          { label: "Vận chuyển", desc: "Hàng đang trên đường vận chuyển đến kho" },
          { label: "Kiểm tra CL", desc: "Kiểm tra chất lượng tại điểm nhận hàng" },
          { label: "Hoàn thành", desc: "Đã giao hàng thành công, tiền đã giải ngân" },
        ];
        return (
          <div className="order-detail-overlay" onClick={() => setSelectedOrder(null)}>
            <div className={`order-detail-modal odm-${selectedOrder.status}`} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="modal-header odm-header">
                <div className="odm-header-left">
                  <span className="odm-contract-code">{selectedOrder.contractCode}</span>
                  <h3>Chi tiết đơn hàng</h3>
                </div>
                <div className="odm-header-right">
                  <span className={`odm-stage-chip odm-stage-${selectedOrder.status}`}>
                    {(statusLabels[selectedOrder.status] || {}).label || selectedOrder.status}
                  </span>
                  <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
                </div>
              </div>

              <div className="modal-body">
                {/* Info cards */}
                <div className="detail-grid">
                  <div className="detail-card">
                    <div className="detail-card-hd">
                      <svg className="detail-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                      <h4>Thông tin hợp đồng</h4>
                    </div>
                    <div className="detail-row"><span className="detail-label">Sản phẩm</span><span>{selectedOrder.product}</span></div>
                    <div className="detail-row"><span className="detail-label">Nhà cung cấp</span><span>{selectedOrder.supplier}</span></div>
                    <div className="detail-row"><span className="detail-label">Số lượng</span><span>{selectedOrder.quantity}</span></div>
                    <div className="detail-row"><span className="detail-label">Giá trị HĐ</span><span className="detail-value-highlight">{selectedOrder.value}</span></div>
                    <div className="detail-row"><span className="detail-label">Dự kiến giao</span><span>{selectedOrder.eta}</span></div>
                    <div className="detail-row no-border"><span className="detail-label">Ngày tạo HĐ</span><span>{selectedOrder.orderDate}</span></div>
                  </div>
                  <div className="detail-card">
                    <div className="detail-card-hd">
                      <svg className="detail-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <h4>Trạng thái ký quỹ</h4>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Trạng thái</span>
                      <span className={`escrow-mini-badge ${(escrowStatusLabels[selectedOrder.escrowStatus] || {}).cls}`}>
                        {(escrowStatusLabels[selectedOrder.escrowStatus] || { label: selectedOrder.escrowStatus }).label}
                      </span>
                    </div>
                    {selectedOrder.currentMilestone && (
                      <div className="detail-row"><span className="detail-label">Mốc hiện tại</span><span>{selectedOrder.currentMilestone}</span></div>
                    )}
                    <div className="detail-row no-border">
                      <span className="detail-label">Tiến độ thanh toán</span>
                      <span style={{ fontWeight: 600 }}>{selectedOrder.completedSteps}/{selectedOrder.totalSteps} mốc</span>
                    </div>
                    <div className="escrow-prog-wrap">
                      <div className="escrow-prog-bar" style={{ width: `${(selectedOrder.completedSteps / (selectedOrder.totalSteps || 1)) * 100}%` }} />
                    </div>
                    {selectedOrder.escrowStatus === "none" && (
                      <button className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={() => { setSelectedOrder(null); setActionModal({ order: selectedOrder, type: "create_escrow" }); }}>
                        + Tạo ký quỹ ngay
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress steps */}
                <div className="detail-progress">
                  <div className="detail-progress-hd">
                    <h4>Tiến trình đơn hàng</h4>
                    <span className="detail-progress-count">{currentStep} / {steps.length} bước</span>
                  </div>
                  <div className="detail-steps">
                    {steps.map((step, i) => (
                      <div key={i} className={`detail-step ${i < currentStep ? "done" : ""} ${i === currentStep - 1 ? "current" : ""}`}>
                        <div className="detail-step-marker">{i < currentStep ? "✓" : i + 1}</div>
                        <div className="detail-step-info">
                          <span className="detail-step-label">{step.label}</span>
                          <span className="detail-step-desc">{step.desc}</span>
                        </div>
                        {i === currentStep - 1 && <span className="step-now-tag">Hiện tại</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* QC Action Panel */}
                {selectedOrder.status === "quality_check" && selectedOrder.escrowStatus !== "none" && (
                  <div className="qc-panel">
                    <div className="qc-panel-header">
                      <svg className="qc-panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 12 11 14 15 10"/></svg>
                      <div>
                        <span className="qc-panel-title">Yêu cầu kiểm tra chất lượng</span>
                        <span className="qc-panel-sub">Hàng đã đến — xác nhận trước khi duyệt giải ngân</span>
                      </div>
                      <span className="qc-panel-badge">Chờ duyệt</span>
                    </div>
                    <ul className="qc-checklist">
                      {QC_ITEMS.map(item => (
                        <li key={item.id} className={qcChecked[item.id] ? "checked" : ""} onClick={() => setQcChecked(prev => { const n = [...prev]; n[item.id] = !n[item.id]; return n; })}>
                          <span className="qc-checkbox">{qcChecked[item.id] && <svg viewBox="0 0 12 10" fill="none"><polyline points="1,5 4.5,9 11,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
                          <span>{item.label}{item.extra && <strong> ({item.extra})</strong>}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="qc-checklist-progress">
                      <div className="qc-checklist-bar" style={{ width: `${(checkedCount / QC_ITEMS.length) * 100}%` }} />
                    </div>
                    <div className="qc-panel-actions">
                      <button className={`qc-btn-approve${allChecked ? "" : " disabled"}`} disabled={!allChecked} onClick={() => { if (!allChecked) return; setQcVerifiedByOrder(prev => ({ ...prev, [selectedOrder.contractId]: true })); setSelectedOrder(null); setQcChecked([false,false,false,false]); setActionModal({ order: selectedOrder, type: "confirm_milestone" }); }}>
                        ✓ Duyệt chất lượng &amp; Giải ngân{!allChecked && <span className="qc-btn-hint">({checkedCount}/{QC_ITEMS.length})</span>}
                      </button>
                      <button className="qc-btn-return" onClick={() => { setSelectedOrder(null); setQcChecked([false,false,false,false]); setReturnReason(""); setReturnModal(selectedOrder); }}>
                        ✕ Trả hàng / Khiếu nại
                      </button>
                    </div>
                    <p className="qc-panel-warning"><svg className="qc-warn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Sau khi duyệt, tiền ký quỹ sẽ được giải ngân cho nông dân và không thể hoàn tác.</p>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {selectedOrder.status === "shipping" && selectedOrder.escrowStatus !== "none" && (
                  <button
                    className={`btn-primary ${!selectedOrder.enterpriseCanConfirm ? "btn-disabled-soft" : ""}`}
                    disabled={!selectedOrder.enterpriseCanConfirm}
                    onClick={() => {
                      if (!selectedOrder.enterpriseCanConfirm) {
                        toast.warning("Đơn hàng đang chờ nông dân xác nhận giao hàng trước khi doanh nghiệp xác nhận.");
                        return;
                      }
                      setSelectedOrder(null);
                      setActionModal({ order: selectedOrder, type: "confirm_milestone" });
                    }}
                  >
                    {selectedOrder.enterpriseCanConfirm ? "Xác nhận đã nhận hàng" : "Đang chờ nông dân giao hàng"}
                  </button>
                )}
                {selectedOrder.status === "shipping" && selectedOrder.escrowStatus !== "none" && (
                  <button className="btn-outline" style={{ color: "#dc2626", borderColor: "#fca5a5" }} onClick={() => { setSelectedOrder(null); setReturnReason(""); setReturnModal(selectedOrder); }}>
                    Trả hàng / Khiếu nại
                  </button>
                )}
                <button className="btn-outline" onClick={() => setSelectedOrder(null)}>Đóng</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== RETURN GOODS MODAL ===== */}
      {returnModal && (
        <div className="order-detail-overlay" onClick={() => !returnLoading && setReturnModal(null)}>
          <div className="order-detail-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Trả hàng / Khiếu nại</h3>
              <button className="modal-close" onClick={() => !returnLoading && setReturnModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>
                Hợp đồng: <strong>{returnModal.contractCode}</strong> — {returnModal.product}
              </p>
              <div style={{ background: "#fef3c7", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "#92400e", marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}><path d="M10 2L2 16h16L10 2z" strokeLinejoin="round"/><path d="M10 8v4M10 14h.01" strokeLinecap="round"/></svg>
                <span>Khiếu nại sẽ tạm dừng toàn bộ giao dịch ký quỹ. Đội ngũ PreOnic sẽ xem xét bằng chứng và phân giải trong 3–5 ngày làm việc.</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Lý do trả hàng / khiếu nại <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="Mô tả vấn đề: hàng không đến, hàng không đúng chất lượng, sai số lượng..."
                  rows={4}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.9rem", resize: "vertical" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => !returnLoading && setReturnModal(null)}>Hủy</button>
              <button
                className="btn-primary"
                style={{ background: "#ef4444" }}
                disabled={!returnReason.trim() || returnLoading}
                onClick={handleReturnGoods}
              >
                {returnLoading ? "Đang gửi..." : "Gửi khiếu nại"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="orders-timeline">
        {apiOrders === null && (
          <div className="empty-orders"><div className="empty-icon" /><p>Đang tải đơn hàng...</p></div>
        )}
        {apiOrders !== null && filtered.length === 0 && (
          <div className="empty-orders">
            <div className="empty-icon"></div>
            <h3>Không có đơn hàng nào</h3>
            <p>Chưa có đơn hàng nào trong mục này</p>
          </div>
        )}
        {filtered.map(order => {
          const st = statusLabels[order.status] || { label: order.status, cls: "confirmed" };
          const esc = escrowStatusLabels[order.escrowStatus] || { label: order.escrowStatus, cls: "esc-none" };
          return (
            <div key={order.contractId} className="order-timeline-card">
              <div className="otc-header">
                <div className="otc-header-left">
                  <h4>{order.product}</h4>
                  <span className="otc-supplier">{order.supplier}</span>
                </div>
                <div className="otc-badges">
                  <span className={`status-badge ${st.cls}`}>{st.label}</span>
                  <span className={`escrow-mini-badge ${esc.cls}`}>{esc.label}</span>
                </div>
              </div>
              <div className="otc-details">
                <div className="otc-detail"><span className="otc-label">Mã HĐ</span><span className="otc-code">{order.contractCode}</span></div>
                <div className="otc-detail"><span className="otc-label">Số lượng</span><span>{order.quantity}</span></div>
                <div className="otc-detail"><span className="otc-label">Giá trị</span><span className="otc-value">{order.value}</span></div>
                <div className="otc-detail"><span className="otc-label">Dự kiến giao</span><span>{order.eta}</span></div>
              </div>
              {order.currentMilestone && (
                <div className="otc-milestone">
                  <span className="milestone-dot" />
                  <span>Mốc hiện tại: <strong>{order.currentMilestone}</strong></span>
                </div>
              )}
              <div className="otc-steps">
                {["Xác nhận", "Xử lý", "Vận chuyển", "Kiểm tra CL", "Hoàn thành"].map((step, i) => {
                  const stepMap = { confirmed: 1, processing: 2, shipping: 3, quality_check: 4, delivered: 5 };
                  const currentStep = stepMap[order.status] || 0;
                  return (
                    <div key={i} className={`otc-step ${i < currentStep ? "done" : ""} ${i === currentStep - 1 ? "current" : ""}`}>
                      <div className="step-dot">{i < currentStep ? <span className="check-inline" /> : i + 1}</div>
                      <span>{step}</span>
                    </div>
                  );
                })}
              </div>
              <div className="otc-footer">
                <span className="otc-date">Ngày tạo HĐ: {order.orderDate}</span>
                <div className="otc-actions">
                  <button className="btn-detail" onClick={() => setSelectedOrder(order)}>Xem chi tiết</button>
                  {order.escrowStatus === "none" && (
                    <button className="btn-escrow-create" onClick={() => setActionModal({ order, type: "create_escrow" })}>Tạo ký quỹ</button>
                  )}
                  {order.status === "quality_check" && order.escrowStatus !== "none" && (
                    <button className="btn-check" onClick={() => setSelectedOrder(order)}>Mở checklist CL</button>
                  )}
                  {order.status === "shipping" && order.escrowStatus !== "none" && (
                    <button
                      className={`btn-track ${!order.enterpriseCanConfirm ? "btn-track-disabled" : ""}`}
                      disabled={!order.enterpriseCanConfirm}
                      onClick={() => {
                        if (!order.enterpriseCanConfirm) {
                          toast.warning("Đơn hàng đang chờ nông dân xác nhận giao hàng.");
                          return;
                        }
                        setActionModal({ order, type: "confirm_milestone" });
                      }}
                    >
                      {order.enterpriseCanConfirm ? "Xác nhận nhận hàng" : "Đang chờ nông dân"}
                    </button>
                  )}
                  {(order.status === "shipping" || order.status === "quality_check") && order.escrowStatus !== "none" && (
                    <button className="btn-dispute" style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 14px", fontSize: "0.82rem", cursor: "pointer" }} onClick={() => { setReturnReason(""); setReturnModal(order); }}>
                      Trả hàng / Khiếu nại
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* =========================================
   LỊCH SỬ GIAO DỊCH — Activity History
   ========================================= */
function LichSuGiaoDichContent() {
  const [activeTab, setActiveTab] = useState("wallet");
  const [walletTx, setWalletTx] = useState([]);
  const [walletPagination, setWalletPagination] = useState(null);
  const [walletFilter, setWalletFilter] = useState("");
  const [walletPage, setWalletPage] = useState(1);
  const [contracts, setContracts] = useState([]);
  const [contractFilter, setContractFilter] = useState("all");
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [txRes, ctrRes, escRes] = await Promise.all([
          paymentService.getTransactions(1, 20, "").catch(() => null),
          enterpriseService.getContracts().catch(() => null),
          escrowService.list().catch(() => null),
        ]);
        if (txRes?.data?.data) {
          setWalletTx(txRes.data.data.transactions || []);
          setWalletPagination(txRes.data.data.pagination || null);
        }
        if (ctrRes?.data?.contracts) setContracts(ctrRes.data.contracts);
        if (escRes?.escrows) setEscrows(escRes.escrows);
      } catch { /* silent */ }
      setLoading(false);
    };
    loadAll();
  }, []);

  const loadWalletPage = useCallback(async (page, type) => {
    try {
      const res = await paymentService.getTransactions(page, 20, type);
      if (res?.data?.data) {
        setWalletTx(res.data.data.transactions || []);
        setWalletPagination(res.data.data.pagination || null);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!loading && activeTab === "wallet") loadWalletPage(walletPage, walletFilter);
  }, [walletPage, walletFilter]); // eslint-disable-line

  const fmtMoney = v => (v || 0).toLocaleString("vi-VN") + " đ";
  const fmtDate  = d => d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const fmtDT    = d => d ? new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const TX_LABELS = { topup: "Nạp tiền", escrow_deposit: "Ký quỹ", escrow_release: "Giải ngân", refund: "Hoàn tiền", commission: "Phí dịch vụ" };
  const TX_STATUS = { pending: "Đang chờ", completed: "Hoàn thành", failed: "Thất bại", cancelled: "Đã hủy" };
  const TX_CREDIT = ["topup", "escrow_release", "refund"];

  const CTR_STATUS = {
    pending:   { label: "Chờ duyệt",   c: "#f59e0b" },
    active:    { label: "Đang chạy",   c: "#1d4ed8" },
    completed: { label: "Hoàn thành",  c: "#16a34a" },
    cancelled: { label: "Đã hủy",      c: "#ef4444" },
    rejected:  { label: "Từ chối",     c: "#9ca3af" },
  };
  const ESC_STATUS = {
    awaiting_deposit:   { label: "Chờ ký quỹ",      c: "#f59e0b" },
    funded:             { label: "Đã ký quỹ",        c: "#1d4ed8" },
    partially_released: { label: "Đang giải ngân",   c: "#8b5cf6" },
    fully_released:     { label: "Hoàn tất",          c: "#16a34a" },
    refunded:           { label: "Đã hoàn trả",      c: "#6b7280" },
    disputed:           { label: "Tranh chấp",        c: "#ef4444" },
  };

  const filteredContracts = contractFilter === "all" ? contracts : contracts.filter(c => c.status === contractFilter);
  const totalTx  = walletPagination?.total ?? walletTx.length;
  const totalPgs = walletPagination?.pages ?? 1;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, gap: 12, color: "#6b7280", fontSize: 15 }}>
      <div style={{ width: 24, height: 24, border: "3px solid #e5e7eb", borderTopColor: "#1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      Đang tải dữ liệu...
    </div>
  );

  return (
    <>
      <div className="breadcrumb"><span>Trang chủ</span><span className="arrow">&gt;</span><span>Lịch sử giao dịch</span></div>
      <h1 className="page-title">Lịch sử hoạt động tài khoản</h1>

      {/* Summary strip */}
      <div className="lsgd-summary">
        <div className="lsgd-sum-item">
          <span className="lsgd-sum-num">{totalTx}</span>
          <span className="lsgd-sum-label">Giao dịch ví</span>
        </div>
        <div className="lsgd-sum-divider" />
        <div className="lsgd-sum-item">
          <span className="lsgd-sum-num">{contracts.length}</span>
          <span className="lsgd-sum-label">Hợp đồng</span>
        </div>
        <div className="lsgd-sum-divider" />
        <div className="lsgd-sum-item">
          <span className="lsgd-sum-num">{escrows.length}</span>
          <span className="lsgd-sum-label">Ký quỹ Escrow</span>
        </div>
        <div className="lsgd-sum-divider" />
        <div className="lsgd-sum-item">
          <span className="lsgd-sum-num">{contracts.filter(c => c.status === "active").length}</span>
          <span className="lsgd-sum-label">HĐ đang chạy</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="lsgd-tabs">
        {[["wallet", "Giao dịch Ví"], ["contracts", "Hợp đồng"], ["escrow", "Thanh toán Escrow"]].map(([k, l]) => (
          <button key={k} className={`lsgd-tab ${activeTab === k ? "active" : ""}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {/* ====== Tab: Wallet Transactions ====== */}
      {activeTab === "wallet" && (
        <div className="lsgd-pane">
          <div className="lsgd-filters">
            {[["", "Tất cả"], ["topup", "Nạp tiền"], ["escrow_deposit", "Ký quỹ"], ["escrow_release", "Giải ngân"], ["refund", "Hoàn tiền"], ["commission", "Phí DV"]].map(([v, lb]) => (
              <button key={v} className={`lsgd-filter ${walletFilter === v ? "active" : ""}`}
                onClick={() => { setWalletFilter(v); setWalletPage(1); }}>{lb}</button>
            ))}
          </div>
          {walletTx.length === 0 ? (
            <div className="lsgd-empty">Chưa có giao dịch nào</div>
          ) : (
            <div className="lsgd-table-wrap">
              <table className="lsgd-table">
                <thead><tr><th>Loại</th><th>Mô tả</th><th>Số tiền</th><th>Số dư sau</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
                <tbody>
                  {walletTx.map(tx => (
                    <tr key={tx._id}>
                      <td><span className={`lsgd-type-badge ${tx.type}`}>{TX_LABELS[tx.type] || tx.type}</span></td>
                      <td className="lsgd-desc">{tx.description}</td>
                      <td className={`lsgd-amount ${TX_CREDIT.includes(tx.type) ? "credit" : "debit"}`}>
                        {TX_CREDIT.includes(tx.type) ? "+" : "-"}{(tx.amount || 0).toLocaleString("vi-VN")}
                      </td>
                      <td className="lsgd-balance">{tx.balanceAfter != null ? fmtMoney(tx.balanceAfter) : "—"}</td>
                      <td><span className={`lsgd-status ${tx.status}`}>{TX_STATUS[tx.status] || tx.status}</span></td>
                      <td className="lsgd-date">{fmtDT(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPgs > 1 && (
            <div className="lsgd-pagination">
              <button disabled={walletPage <= 1} onClick={() => { const p = walletPage - 1; setWalletPage(p); loadWalletPage(p, walletFilter); }}>‹ Trước</button>
              <span>Trang {walletPage} / {totalPgs}</span>
              <button disabled={walletPage >= totalPgs} onClick={() => { const p = walletPage + 1; setWalletPage(p); loadWalletPage(p, walletFilter); }}>Sau ›</button>
            </div>
          )}
        </div>
      )}

      {/* ====== Tab: Contracts ====== */}
      {activeTab === "contracts" && (
        <div className="lsgd-pane">
          <div className="lsgd-filters">
            {[["all", "Tất cả"], ["pending", "Chờ duyệt"], ["active", "Đang chạy"], ["completed", "Hoàn thành"], ["cancelled", "Đã hủy"]].map(([v, lb]) => (
              <button key={v} className={`lsgd-filter ${contractFilter === v ? "active" : ""}`}
                onClick={() => setContractFilter(v)}>
                {lb}
                {v !== "all" && <span className="lsgd-filter-count">{contracts.filter(c => c.status === v).length}</span>}
              </button>
            ))}
          </div>
          {filteredContracts.length === 0 ? (
            <div className="lsgd-empty">Chưa có hợp đồng nào</div>
          ) : (
            <div className="lsgd-table-wrap">
              <table className="lsgd-table">
                <thead><tr><th>Mã HĐ</th><th>Nông dân</th><th>Sản phẩm</th><th>Giá trị</th><th>Trạng thái</th><th>Ngày tạo</th><th>Ngày giao</th></tr></thead>
                <tbody>
                  {filteredContracts.map((c, i) => {
                    const sm = CTR_STATUS[c.status] || { label: c.status, c: "#9ca3af" };
                    return (
                      <tr key={c._id || i}>
                        <td className="lsgd-code">{c.contractCode || `#${String(c._id || "").slice(-6).toUpperCase()}`}</td>
                        <td>{c.farmerName || "—"}</td>
                        <td>{c.productName || "—"}</td>
                        <td className="lsgd-amount credit">{fmtMoney(c.totalValue || 0)}</td>
                        <td><span className="lsgd-status-badge" style={{ background: sm.c + "22", color: sm.c }}>{sm.label}</span></td>
                        <td className="lsgd-date">{fmtDate(c.createdAt)}</td>
                        <td className="lsgd-date">{fmtDate(c.deliveryDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====== Tab: Escrow ====== */}
      {activeTab === "escrow" && (
        <div className="lsgd-pane">
          {escrows.length === 0 ? (
            <div className="lsgd-empty">Chưa có giao dịch ký quỹ nào</div>
          ) : (
            <div className="lsgd-table-wrap">
              <table className="lsgd-table">
                <thead><tr><th>Hợp đồng</th><th>Đã ký quỹ</th><th>Đã giải ngân</th><th>Còn lại</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead>
                <tbody>
                  {escrows.map((e, i) => {
                    const sm = ESC_STATUS[e.status] || { label: e.status, c: "#9ca3af" };
                    const held = (e.depositedAmount || 0) - (e.releasedAmount || 0);
                    return (
                      <tr key={e._id || i}>
                        <td className="lsgd-code">{e.contractCode || (e.contractId ? `#${String(e.contractId).slice(-6).toUpperCase()}` : "—")}</td>
                        <td className="lsgd-amount debit">{fmtMoney(e.depositedAmount || 0)}</td>
                        <td className="lsgd-amount credit">{fmtMoney(e.releasedAmount || 0)}</td>
                        <td className="lsgd-balance">{fmtMoney(held)}</td>
                        <td><span className="lsgd-status-badge" style={{ background: sm.c + "22", color: sm.c }}>{sm.label}</span></td>
                        <td className="lsgd-date">{fmtDate(e.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* =========================================
   ESCROW — Thanh toán trung gian
   ========================================= */
function EscrowContent() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [apiEscrows, setApiEscrows] = useState(null);
  const [apiBalance, setApiBalance] = useState(null);
  const [pendingContracts, setPendingContracts] = useState([]);
  const [fundingLoading, setFundingLoading] = useState(false);
  const toast = useToast();

  // Normalise populated Mongoose fields from the API response
  const mapEscrow = (e) => ({
    ...e,
    id: e._id || e.id,
    productName:    e.contractId?.productName    || e.productName    || 'Nông sản',
    contractCode:   e.contractId?.contractCode   || e.contractCode   || '—',
    farmerName:     e.farmerId?.fullName          || e.farmerName     || 'Nông dân',
    enterpriseName: e.enterpriseId?.fullName     || e.enterpriseName || 'Doanh nghiệp',
    createdAt:      formatDate(e.createdAt),
  });

  const loadAll = useCallback(async () => {
    try {
      const [balRes, escRes, contractsRes] = await Promise.all([
        escrowService.getBalance().catch(() => null),
        escrowService.list().catch(() => null),
        enterpriseService.getContracts().catch(() => null),
      ]);
      if (balRes?.data?.balance != null) setApiBalance(balRes.data.balance);
      const rawEscrows = escRes?.data?.escrows || [];
      const mappedEscrows = rawEscrows.map(mapEscrow);
      setApiEscrows(mappedEscrows);
      // Find approved contracts that don't yet have an escrow record
      const escrowedContractIds = new Set(
        rawEscrows.map(e => {
          const cid = e.contractId?._id || e.contractId;
          return cid?.toString() || '';
        }).filter(Boolean)
      );
      const approved = (contractsRes?.data?.contracts || [])
        .filter(c => c.status === 'approved' && !escrowedContractIds.has(c._id?.toString()));
      setPendingContracts(approved);
    } catch { /* fallback */ }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const balance = apiBalance ?? 0;

  const escrows = apiEscrows || [];

  const fmtMoney = (v) => v.toLocaleString("vi-VN") + " VND";

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

  const totalDeposited = escrows.reduce((s, e) => s + e.depositedAmount, 0);
  const totalReleased = escrows.reduce((s, e) => s + e.releasedAmount, 0);
  const totalHeld = totalDeposited - totalReleased;
  const activeCount = escrows.filter(e => !["fully_released", "refunded"].includes(e.status)).length;
  const awaitingDepositCount = escrows.filter(e => e.status === "awaiting_deposit").length;

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

  const handleConfirmMilestone = (escrow, milestone) => {
    setConfirmModal({ escrow, milestone });
  };

  const handleRaiseDispute = (escrow, milestone) => {
    setDisputeModal({ escrow, milestone });
    setDisputeReason("");
  };

  const handleFundContract = async (contract) => {
    setFundingLoading(true);
    try {
      let escrow;
      try {
        const res = await escrowService.getByContract(contract._id);
        escrow = res?.data?.escrow;
      } catch {
        // Escrow doesn't exist yet — create it
        const createRes = await escrowService.create(contract._id);
        escrow = createRes?.data?.escrow;
      }
      if (!escrow) { toast.error('Không tìm thấy dữ liệu ký quỹ.'); return; }
      const milestone1 = escrow.milestones?.find(m => m.step === 1);
      if (!milestone1) { toast.error('Không tìm thấy mốc ký quỹ.'); return; }
      setConfirmModal({
        escrow: {
          ...mapEscrow(escrow),
          totalAmount: escrow.totalAmount,
          contractCode: escrow.contractId?.contractCode || contract.contractCode || '—',
          productName:  escrow.contractId?.productName  || contract.productName  || 'Nông sản',
        },
        milestone: milestone1,
      });
    } catch (err) {
      toast.error(err?.message || 'Không thể tạo ký quỹ. Vui lòng thử lại.');
    } finally {
      setFundingLoading(false);
    }
  };

  return (
    <>
      <div className="breadcrumb"><span>Trang chủ</span><span className="arrow">&gt;</span><span>Thanh toán trung gian</span></div>
      <h1 className="page-title">Thanh toán trung gian (Escrow)</h1>

      {/* Balance Card */}
      <div className="escrow-balance-card">
        <div className="ebc-info">
          <span className="ebc-label">Số dư tài khoản ảo</span>
          <h2 className="ebc-amount">{fmtMoney(balance)}</h2>
          <span className="ebc-note">Số dư dùng cho ký quỹ các hợp đồng bao tiêu</span>
        </div>
        <div className="ebc-icon"><span className="wallet-icon" /></div>
      </div>

      {/* Stats */}
      <div className="escrow-stats">
        <div className="es-card">
          <div className="es-icon total-escrow-icon" />
          <div className="es-content"><span className="es-label">Tổng ký quỹ</span><p className="es-value">{fmtMoney(totalDeposited)}</p></div>
        </div>
        <div className="es-card">
          <div className="es-icon released-icon" />
          <div className="es-content"><span className="es-label">Đã giải ngân</span><p className="es-value">{fmtMoney(totalReleased)}</p></div>
        </div>
        <div className="es-card">
          <div className="es-icon held-icon" />
          <div className="es-content"><span className="es-label">Đang giữ</span><p className="es-value">{fmtMoney(totalHeld)}</p></div>
        </div>
        <div className="es-card">
          <div className="es-icon active-escrow-icon" />
          <div className="es-content"><span className="es-label">Escrow hoạt động</span><p className="es-value">{activeCount}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="escrow-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`escrow-tab ${activeTab === t.key ? "active" : ""}`} onClick={() => { setActiveTab(t.key); setSelectedEscrow(null); }}>
            {t.label}{t.count !== undefined && <span className="tab-count">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Alert: approved contracts awaiting escrow deposit */}
      {pendingContracts.length > 0 && (
        <div className="escrow-alert-banner" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', borderLeft: '4px solid #f59e0b' }}>
          <span className="eab-icon" style={{ background: '#fef9c3' }} />
          <div className="eab-text" style={{ flex: 1 }}>
            <strong>{pendingContracts.length} hợp đồng đã ký — chưa nạp ký quỹ</strong>
            <p>Cả hai bên đã ký. Hợp đồng bắt đầu thực hiện sau khi tiền ký quỹ được nạp. Nạp ngay bên dưới!</p>
          </div>
        </div>
      )}

      {/* Alert for existing escrows awaiting deposits */}
      {awaitingDepositCount > 0 && activeTab !== "overview" && (
        <div className="escrow-alert-banner">
          <span className="eab-icon" />
          <div className="eab-text">
            <strong>{awaitingDepositCount} escrow chưa được nạp tiền ký quỹ</strong>
            <p>Hợp đồng chỉ bắt đầu thực hiện sau khi tiền ký quỹ đã được nạp đầy đủ. Nhấn "Nạp ký quỹ ngay" trên từng mục.</p>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="escrow-overview">

          {/* Pending contracts — need escrow creation + deposit */}
          {pendingContracts.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ color: '#d97706', marginBottom: 14, fontSize: 16, fontWeight: 700 }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 16, height: 16, marginRight: 6, verticalAlign: 'middle' }}><path d="M10 2L2 16h16L10 2z" strokeLinejoin="round"/><path d="M10 8v4M10 14h.01" strokeLinecap="round"/></svg>
                Cần nạp ký quỹ ({pendingContracts.length})
              </h3>
              {pendingContracts.map(c => (
                <div key={c._id} className="escrow-card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: 12 }}>
                  <div className="ec-header">
                    <div className="ec-header-left">
                      <h4>{c.farmerName}</h4>
                      <span className="ec-contract">{c.contractCode} — {c.productName}</span>
                    </div>
                    <span className="escrow-status-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }}>Chờ ký quỹ</span>
                  </div>
                  <div className="ec-body">
                    <div className="ec-stat"><span>Giá trị hợp đồng</span><strong>{fmtMoney(c.totalValue || 0)}</strong></div>
                    <div className="ec-stat"><span>Cần ký quỹ</span><strong className="released">{fmtMoney(c.depositAmount || 0)}</strong></div>
                    <div className="ec-stat"><span>Số dư hiện tại</span><strong style={{ color: balance >= (c.depositAmount || 0) ? '#16a34a' : '#ef4444' }}>{fmtMoney(balance)}</strong></div>
                  </div>
                  <div className="ec-footer">
                    <span className="ec-date">{formatDate(c.createdAt)}</span>
                    <button
                      className="ec-deposit-btn"
                      disabled={fundingLoading}
                      onClick={() => handleFundContract(c)}
                    >
                      {fundingLoading ? 'Đang xử lý...' : `Nạp ký quỹ — ${fmtMoney(c.depositAmount || 0)}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="escrow-flow-diagram">
            <h3>Quy trình Escrow trên PreOnic</h3>
            <div className="flow-steps">
              <div className="flow-step"><div className="flow-step-num done">1</div><span>Tạo hợp đồng</span><p>Hai bên thỏa thuận điều khoản, xác định giá trị ký quỹ</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num done">2</div><span>Ký quỹ</span><p>Doanh nghiệp nạp tiền ký quỹ vào hệ thống PreOnic</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num">3</div><span>Giao hàng</span><p>Nông dân giao hàng, xác nhận vận chuyển thành công</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num">4</div><span>Kiểm tra</span><p>Doanh nghiệp kiểm tra chất lượng và xác nhận đạt chuẩn</p></div>
              <div className="flow-connector" />
              <div className="flow-step"><div className="flow-step-num">5</div><span>Giải ngân</span><p>Tiền tự động giải ngân cho nông dân theo từng mốc</p></div>
            </div>
          </div>

          <div className="escrow-safety">
            <div className="safety-icon"><span className="shield-escrow-icon" /></div>
            <div className="safety-info">
              <h3>Bảo vệ giao dịch an toàn</h3>
              <ul>
                <li>Tiền ký quỹ được PreOnic giữ — không bên nào tự rút được</li>
                <li>Giải ngân theo mốc: chỉ giải ngân khi cả hai bên xác nhận</li>
                <li>Nông dân giao hàng + doanh nghiệp kiểm tra = tự động giải ngân</li>
                <li>Tranh chấp? Admin PreOnic phân xử dựa trên bằng chứng</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Escrow List */}
      {activeTab !== "overview" && (
        <div className="escrow-list">
          {filteredEscrows.length === 0 ? (
            <div className="empty-orders"><div className="empty-icon" /><h3>Không có escrow nào</h3><p>Tạo hợp đồng mới để bắt đầu sử dụng escrow</p></div>
          ) : selectedEscrow ? (
            /* DETAIL VIEW */
            <div className="escrow-detail">
              <button className="escrow-back-btn" onClick={() => setSelectedEscrow(null)}>Quay lại danh sách</button>
              
              <div className="escrow-detail-header">
                <div>
                  <h3>{selectedEscrow.productName}</h3>
                  <p className="escrow-contract-code">Hợp đồng: {selectedEscrow.contractCode} — {selectedEscrow.farmerName}</p>
                </div>
                <span className={`escrow-status-badge ${selectedEscrow.status}`}>{statusLabels[selectedEscrow.status]}</span>
              </div>

              <div className="escrow-detail-stats">
                <div className="eds-item"><span>Tổng ký quỹ</span><strong>{fmtMoney(selectedEscrow.totalAmount)}</strong></div>
                <div className="eds-item"><span>Đã nạp</span><strong>{fmtMoney(selectedEscrow.depositedAmount)}</strong></div>
                <div className="eds-item released"><span>Đã giải ngân</span><strong>{fmtMoney(selectedEscrow.releasedAmount)}</strong></div>
                <div className="eds-item held"><span>Còn giữ</span><strong>{fmtMoney(selectedEscrow.depositedAmount - selectedEscrow.releasedAmount)}</strong></div>
              </div>

              {/* Progress Bar */}
              <div className="escrow-progress-section">
                <h4>Tiến độ giải ngân</h4>
                <div className="escrow-progress-bar">
                  <div className="epb-fill" style={{ width: selectedEscrow.depositedAmount > 0 ? `${(selectedEscrow.releasedAmount / selectedEscrow.depositedAmount) * 100}%` : "0%" }}/>
                </div>
                <div className="epb-labels">
                  <span>0%</span>
                  <span>{selectedEscrow.depositedAmount > 0 ? Math.round((selectedEscrow.releasedAmount / selectedEscrow.depositedAmount) * 100) : 0}% đã giải ngân</span>
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
                          {m.farmerConfirmed ? "Nông dân đã xác nhận" : "Chờ nông dân xác nhận"}
                        </span>
                        <span className={m.enterpriseConfirmed ? "confirmed" : "pending"}>
                          {m.enterpriseConfirmed ? "Doanh nghiệp đã xác nhận" : "Chờ doanh nghiệp xác nhận"}
                        </span>
                      </div>
                      {/* Actions for enterprise */}
                      {m.status === "in_progress" && !m.enterpriseConfirmed && m.farmerConfirmed && (
                        <div className="em-actions">
                          <button className="em-btn-confirm" onClick={() => handleConfirmMilestone(selectedEscrow, m)}>
                            Xác nhận đạt chuẩn
                          </button>
                          <button className="em-btn-dispute" onClick={() => handleRaiseDispute(selectedEscrow, m)}>
                            Báo cáo vấn đề
                          </button>
                        </div>
                      )}
                      {selectedEscrow.status === "awaiting_deposit" && m.step === 1 && (
                        <div className="em-actions">
                          <button className="em-btn-deposit" onClick={() => handleConfirmMilestone(selectedEscrow, m)}>
                            Đặt cọc ký quỹ — {fmtMoney(selectedEscrow.totalAmount)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            filteredEscrows.map(e => (
              <div key={e.id} className="escrow-card" onClick={() => setSelectedEscrow(e)}>
                <div className="ec-header">
                  <div className="ec-header-left">
                    <h4>{e.productName}</h4>
                    <span className="ec-contract">{e.contractCode} — {e.farmerName}</span>
                  </div>
                  <span className={`escrow-status-badge ${e.status}`}>{statusLabels[e.status]}</span>
                </div>
                <div className="ec-body">
                  <div className="ec-stat"><span>Ký quỹ</span><strong>{fmtMoney(e.totalAmount)}</strong></div>
                  <div className="ec-stat"><span>Đã giải ngân</span><strong className="released">{fmtMoney(e.releasedAmount)}</strong></div>
                  <div className="ec-stat"><span>Còn giữ</span><strong>{fmtMoney(e.depositedAmount - e.releasedAmount)}</strong></div>
                </div>
                <div className="ec-milestones-mini">
                  {e.milestones.map(m => (
                    <div key={m.step} className={`ec-ms ${m.status}`} title={m.name}>{m.status === "completed" ? <span className="em-check-mini" /> : m.step}</div>
                  ))}
                </div>
                <div className="ec-footer">
                  <span className="ec-date">Tạo: {e.createdAt}</span>
                  <div className="ec-footer-actions">
                    {e.status === "awaiting_deposit" && (
                      <button className="ec-deposit-btn" onClick={ev => { ev.stopPropagation(); if (e.milestones?.[0]) handleConfirmMilestone(e, e.milestones[0]); }}>
                        Nạp ký quỹ — {fmtMoney(e.totalAmount)}
                      </button>
                    )}
                    <button className="ec-view-btn">Xem chi tiết</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="escrow-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="escrow-modal" onClick={e => e.stopPropagation()}>
            <div className="escrow-modal-header">
              <h3>{confirmModal.milestone.step === 1 ? "Xác nhận đặt cọc ký quỹ" : "Xác nhận mốc thanh toán"}</h3>
              <button className="modal-close" onClick={() => setConfirmModal(null)}>X</button>
            </div>
            <div className="escrow-modal-body">
              <p><strong>Hợp đồng:</strong> {confirmModal.escrow.contractCode}</p>
              <p><strong>Sản phẩm:</strong> {confirmModal.escrow.productName}</p>
              <p><strong>Mốc:</strong> {confirmModal.milestone.name}</p>
              {confirmModal.milestone.releaseAmount > 0 && (
                <p><strong>Số tiền giải ngân:</strong> {fmtMoney(confirmModal.milestone.releaseAmount)}</p>
              )}
              {confirmModal.milestone.step === 1 && (
                <div className="escrow-deposit-info">
                  <p>Số tiền sẽ trừ từ số dư tài khoản ảo:</p>
                  <h3>{fmtMoney(confirmModal.escrow.totalAmount)}</h3>
                  <p className="balance-after">Số dư sau khi đặt cọc: {fmtMoney(balance - confirmModal.escrow.totalAmount)}</p>
                </div>
              )}
              <p className="escrow-modal-warning">Hành động này không thể hoàn tác. Xác nhận?</p>
            </div>
            <div className="escrow-modal-footer">
              <button className="em-btn-cancel" onClick={() => setConfirmModal(null)}>Hủy</button>
              <button className="em-btn-confirm" onClick={async () => {
                try {
                  const escRowId = confirmModal.escrow._id || confirmModal.escrow.id;
                  if (confirmModal.milestone.step === 1) {
                    await escrowService.deposit(escRowId, confirmModal.escrow.totalAmount);
                    toast.success("Đặt cọc ký quỹ thành công! Hợp đồng đã được kích hoạt.");
                  } else {
                    await escrowService.enterpriseConfirm(escRowId, confirmModal.milestone.step);
                    toast.success("Xác nhận mốc thanh toán thành công!");
                  }
                  await loadAll();
                } catch {
                  toast.error("Thao tác thất bại. Vui lòng thử lại.");
                }
                setConfirmModal(null);
              }}>
                {confirmModal.milestone.step === 1 ? "Đặt cọc ngay" : "Xác nhận đạt chuẩn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="escrow-modal-overlay" onClick={() => setDisputeModal(null)}>
          <div className="escrow-modal" onClick={e => e.stopPropagation()}>
            <div className="escrow-modal-header">
              <h3>Báo cáo vấn đề chất lượng</h3>
              <button className="modal-close" onClick={() => setDisputeModal(null)}>X</button>
            </div>
            <div className="escrow-modal-body">
              <p><strong>Hợp đồng:</strong> {disputeModal.escrow.contractCode}</p>
              <p><strong>Mốc:</strong> {disputeModal.milestone.name}</p>
              <div className="dispute-form">
                <label>Mô tả vấn đề (tối thiểu 10 ký tự)</label>
                <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={4} placeholder="Hàng không đạt tiêu chuẩn chất lượng đã cam kết trong hợp đồng. Cụ thể..." />
              </div>
              <div className="dispute-note">
                <p>Khiếu nại sẽ được gửi lên Admin PreOnic để xem xét. Vui lòng cung cấp đầy đủ bằng chứng (hình ảnh, báo cáo kiểm tra...).</p>
              </div>
            </div>
            <div className="escrow-modal-footer">
              <button className="em-btn-cancel" onClick={() => setDisputeModal(null)}>Hủy</button>
              <button className="em-btn-dispute" onClick={async () => {
                try {
                  const escRowId = disputeModal.escrow._id || disputeModal.escrow.id;
                  await escrowService.raiseDispute(escRowId, disputeModal.milestone.step, disputeReason);
                  toast.success("Khiếu nại đã được gửi thành công!");
                  await loadAll();
                } catch {
                  toast.error("Gửi khiếu nại thất bại. Vui lòng thử lại.");
                }
                setDisputeModal(null);
              }} disabled={disputeReason.length < 10}>Gửi khiếu nại</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================
   THỜI TIẾT & BẢO HIỂM — Weather & Insurance
   ========================================= */
function WeatherInsuranceContent() {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("weather");

  const loadWeatherData = useCallback(async () => {
    setLoading(true);
    try {
      const [weatherRes, alertsRes, thresholdsRes] = await Promise.all([
        weatherService.getCurrentWeather().catch(() => null),
        weatherService.getAlerts(1, 10).catch(() => ({ data: [] })),
        weatherService.getThresholds().catch(() => null),
      ]);
      setWeather(weatherRes?.data || null);
      setAlerts(alertsRes?.data || []);
      setThresholds(thresholdsRes?.data || null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeatherData();
  }, [loadWeatherData]);

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

  const getSeverityClass = (severity) => severity === "critical" ? "weather-critical" : "weather-warning";
  const getAlertIcon = (type) => {
    const icons = { extreme_heat: "heat", extreme_cold: "cold", heavy_rain: "rain", strong_wind: "wind", drought: "drought" };
    return icons[type] || "weather";
  };
  const getAlertLabel = (type) => {
    const labels = { extreme_heat: "Nắng nóng", extreme_cold: "Rét đậm", heavy_rain: "Mưa lớn", strong_wind: "Gió mạnh", drought: "Hạn hán" };
    return labels[type] || type;
  };
  const formatDate = (d) => new Date(d).toLocaleString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });

  return (
    <>
      <div className="breadcrumb"><span>Trang chủ</span><span className="arrow">&gt;</span><span>Thời tiết & Bảo hiểm</span></div>
      <h1 className="page-title">Thời tiết & Bảo hiểm nông nghiệp</h1>

      <div className="weather-section-tabs">
        <button className={`ws-tab ${activeSection === "weather" ? "active" : ""}`} onClick={() => setActiveSection("weather")}>
          <span className="ws-tab-icon weather-tab-icon" /> Thời tiết hiện tại
        </button>
        <button className={`ws-tab ${activeSection === "alerts" ? "active" : ""}`} onClick={() => setActiveSection("alerts")}>
          <span className="ws-tab-icon alert-tab-icon" /> Cảnh báo ({alerts.filter(a => !a.isRead).length})
        </button>
        <button className={`ws-tab ${activeSection === "thresholds" ? "active" : ""}`} onClick={() => setActiveSection("thresholds")}>
          <span className="ws-tab-icon threshold-tab-icon" /> Ngưỡng cảnh báo
        </button>
        <button className={`ws-tab ${activeSection === "insurance" ? "active" : ""}`} onClick={() => setActiveSection("insurance")}>
          <span className="ws-tab-icon insurance-tab-icon" /> Bảo hiểm
        </button>
      </div>

      {loading ? (
        <div className="weather-loading"><div className="weather-spinner" /><p>Đang tải dữ liệu thời tiết...</p></div>
      ) : (
        <>
          {/* Current Weather */}
          {activeSection === "weather" && (
            <div className="weather-current-card">
              {weather ? (
                <>
                  <div className="wc-main">
                    <div className="wc-temp">
                      <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="" className="wc-icon" />
                      <div>
                        <h2>{weather.temp?.toFixed(1)}°C</h2>
                        <p className="wc-desc">{weather.description}</p>
                      </div>
                    </div>
                    <div className="wc-details">
                      <div className="wc-detail"><span className="wc-label">Độ ẩm</span><span className="wc-value">{weather.humidity}%</span></div>
                      <div className="wc-detail"><span className="wc-label">Gió</span><span className="wc-value">{weather.windSpeed?.toFixed(1)} km/h</span></div>
                      <div className="wc-detail"><span className="wc-label">Mưa 1h</span><span className="wc-value">{weather.rain1h?.toFixed(1) || "0"} mm</span></div>
                    </div>
                  </div>
                  <button className="wc-refresh" onClick={loadWeatherData}>Làm mới</button>
                </>
              ) : (
                <div className="wc-no-data">
                  <span className="wc-no-icon" />
                  <h3>Chưa có dữ liệu thời tiết</h3>
                  <p>Vui lòng cập nhật vị trí (tỉnh/thành) trong hồ sơ để nhận thông tin thời tiết.</p>
                </div>
              )}
            </div>
          )}

          {/* Alerts */}
          {activeSection === "alerts" && (
            <div className="weather-alerts-section">
              {alerts.length > 0 && (
                <div className="wa-header">
                  <span>{alerts.filter(a => !a.isRead).length} cảnh báo chưa đọc</span>
                  <button className="wa-mark-all" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button>
                </div>
              )}
              {alerts.length === 0 ? (
                <div className="wa-empty"><span className="wa-empty-icon" /><p>Không có cảnh báo thời tiết nào.</p></div>
              ) : (
                <div className="wa-list">
                  {alerts.map(alert => (
                    <div key={alert._id} className={`wa-item ${getSeverityClass(alert.severity)} ${alert.isRead ? "read" : "unread"}`} onClick={() => !alert.isRead && markRead(alert._id)}>
                      <div className="wa-item-icon">
                        <span className={`alert-type-icon ${getAlertIcon(alert.alertType)}-icon`} />
                      </div>
                      <div className="wa-item-body">
                        <div className="wa-item-header">
                          <span className={`wa-badge ${alert.severity}`}>{alert.severity === "critical" ? "Khẩn cấp" : "Cảnh báo"}</span>
                          <span className="wa-type">{getAlertLabel(alert.alertType)}</span>
                          <span className="wa-date">{formatDate(alert.createdAt)}</span>
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

          {/* Thresholds */}
          {activeSection === "thresholds" && (
            <div className="weather-thresholds-card">
              <h3>Ngưỡng cảnh báo thời tiết hệ thống</h3>
              <p className="wt-desc">Các ngưỡng mặc định được hệ thống sử dụng để kiểm tra và gửi cảnh báo. Hệ thống kiểm tra mỗi 6 giờ.</p>
              <div className="wt-grid">
                <div className="wt-item heat"><span className="wt-icon heat-icon" /><div><h4>Nắng nóng</h4><p>&gt; {thresholds?.extremeHeatTemp || 38}°C</p></div></div>
                <div className="wt-item cold"><span className="wt-icon cold-icon" /><div><h4>Rét đậm</h4><p>&lt; {thresholds?.extremeColdTemp || 5}°C</p></div></div>
                <div className="wt-item rain"><span className="wt-icon rain-icon" /><div><h4>Mưa lớn</h4><p>&gt; {thresholds?.heavyRainMm || 100}mm/ngày</p></div></div>
                <div className="wt-item wind"><span className="wt-icon wind-icon" /><div><h4>Gió mạnh</h4><p>&gt; {thresholds?.strongWindKmh || 60}km/h</p></div></div>
                <div className="wt-item drought"><span className="wt-icon drought-icon" /><div><h4>Hạn hán</h4><p>&lt; {thresholds?.droughtMm || 5}mm / {thresholds?.droughtDays || 14} ngày</p></div></div>
              </div>
            </div>
          )}

          {/* Insurance Info */}
          {activeSection === "insurance" && (
            <div className="insurance-info-card">
              <h3>Bảo hiểm nông nghiệp</h3>
              <p className="ins-desc">Thông tin bảo hiểm được lưu trữ tham khảo trong hợp đồng. Hệ thống không bán bảo hiểm -- chỉ lưu thông tin bảo hiểm bên ngoài mà các bên đã mua.</p>

              <div className="ins-how">
                <h4>Cách thức hoạt động</h4>
                <div className="ins-steps">
                  <div className="ins-step">
                    <div className="ins-step-num">1</div>
                    <div><h5>Mua bảo hiểm</h5><p>Các bên tự mua bảo hiểm nông nghiệp từ công ty bảo hiểm bên ngoài.</p></div>
                  </div>
                  <div className="ins-step">
                    <div className="ins-step-num">2</div>
                    <div><h5>Nhập thông tin</h5><p>Khi tạo hợp đồng, mỗi bên có thể nhập thông tin bảo hiểm của mình (tùy chọn).</p></div>
                  </div>
                  <div className="ins-step">
                    <div className="ins-step-num">3</div>
                    <div><h5>Lưu trữ tham khảo</h5><p>Thông tin bảo hiểm được lưu trong hợp đồng để đối chiếu khi cần.</p></div>
                  </div>
                  <div className="ins-step">
                    <div className="ins-step-num">4</div>
                    <div><h5>Xử lý bồi thường</h5><p>Khi có sự cố, liên hệ công ty bảo hiểm để xử lý bồi thường theo hợp đồng bảo hiểm.</p></div>
                  </div>
                </div>
              </div>

              <div className="ins-fields">
                <h4>Thông tin bảo hiểm trong hợp đồng gồm</h4>
                <ul>
                  <li>Tên công ty bảo hiểm</li>
                  <li>Số hợp đồng bảo hiểm</li>
                  <li>Giá trị được bảo hiểm (VND)</li>
                  <li>Sự kiện được bảo hiểm (thiên tai, dịch bệnh, hoặc cả hai)</li>
                  <li>Thời gian hiệu lực</li>
                  <li>File đính kèm hợp đồng bảo hiểm</li>
                </ul>
              </div>

              <div className="ins-risk">
                <h4>Chia sẻ rủi ro</h4>
                <p>Việc chia sẻ rủi ro được xử lý bởi công ty bảo hiểm bên ngoài. Hệ thống PreOnic chỉ hỗ trợ:</p>
                <ul>
                  <li>Lưu trữ thông tin bảo hiểm tham khảo trong hợp đồng</li>
                  <li>Cảnh báo thời tiết để phòng ngừa rủi ro</li>
                  <li>Ghi nhận điều khoản chia sẻ rủi ro giữa các bên (nếu có)</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
