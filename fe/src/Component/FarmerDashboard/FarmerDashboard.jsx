import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiFeather, FiCalendar, FiDollarSign, FiCamera, FiCheck, FiCheckCircle,
  FiPackage, FiAlertTriangle, FiFileText, FiEye, FiMapPin, FiInfo,
  FiShield, FiClock, FiTruck
} from "react-icons/fi";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  ROUTES,
  FILE_SIZE_LIMIT,
  FARMER_DASHBOARD_NAV_ITEMS,
} from "../../constants";
import farmerService from "../../services/farmer.service";
import escrowService from "../../services/escrow.service";
import productService from "../../services/product.service";
import { formatMoney, formatDate } from "../../hooks/useApiData";
import MuaVuContent from "./sections/MuaVuContent";
import FarmerWeatherContent from "./sections/FarmerWeatherContent";
import WalletPayment from "../WalletPayment/WalletPayment";
import BilateralRating from "../BilateralRating/BilateralRating";
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
   HỢP ĐỒNG — Contract management
   ========================================= */
function HopDongContent() {
  return (
    <div className="fd-pg-card">
      <div className="fd-pg-header">
        <div>
          <h2>Hợp đồng của tôi</h2>
          <p className="fd-pg-subtitle">Khu vực hợp đồng đang được tạm rút gọn để đảm bảo ứng dụng khởi động ổn định.</p>
        </div>
      </div>
      <div className="fd-empty">
        <FiFileText size={40} color="#d1d5db" />
        <h4>Đang tái cấu trúc khu vực hợp đồng</h4>
        <p>Phần giao diện này sẽ được khôi phục sau khi tách module hoàn tất.</p>
      </div>
    </div>
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

