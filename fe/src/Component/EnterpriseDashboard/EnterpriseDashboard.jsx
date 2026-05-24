import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  ROUTES,
  ENTERPRISE_DASHBOARD_NAV_ITEMS,
  SEARCH_PLACEHOLDERS,
} from "../../constants";
import NotificationBell from "../NotificationBell/NotificationBell";
import TongQuanContent from "./sections/TongQuanContent";
import SanPhamContent from "./sections/SanPhamContent";
import WeatherInsuranceContent from "./sections/WeatherInsuranceContent";
import HopDongContent from "./sections/HopDongContent";
import DonHangContent from "./sections/DonHangContent";
import LichSuGiaoDichContent from "./sections/LichSuGiaoDichContent";
import EscrowContent from "./sections/EscrowContent";
import SuppliersContent from "./sections/SuppliersContent";
import WarehouseContent from "./sections/WarehouseContent";
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
          {activeNav === "nhacc" && <SuppliersContent />}
          {activeNav === "kho" && <WarehouseContent />}
          {activeNav === "lichsu" && <LichSuGiaoDichContent />}
          {activeNav === "danhgia" && <BilateralRating currentRole="enterprise" />}
          {activeNav === "thoitiet" && <WeatherInsuranceContent />}
        </div>
      </main>
    </div>
  );
}
