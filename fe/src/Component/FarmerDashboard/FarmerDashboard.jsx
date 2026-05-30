import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  ROUTES,
  FARMER_DASHBOARD_NAV_ITEMS,
} from "../../constants";
import MuaVuContent from "./sections/MuaVuContent";
import FarmerWeatherContent from "./sections/FarmerWeatherContent";
import HopDongContent from "./sections/HopDongContent";
import DonHangContent from "./sections/DonHangContent";
import DangBanContent from "./sections/DangBanContent";
import FarmerEscrowContent from "./sections/FarmerEscrowContent";
import FarmerFinanceContent from "./sections/FarmerFinanceContent";
import WalletPayment from "../WalletPayment/WalletPayment";
import BilateralRating from "../BilateralRating/BilateralRating";
import NotificationBell from "../NotificationBell/NotificationBell";
import MessageBell from "../MessageBell/MessageBell";
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
        <header className="fd-header">
          <div className="fd-header-search">
            <span className="search-input-icon" />
            <input type="text" placeholder="Tìm kiếm hợp đồng, đơn hàng..." value={headerSearch} onChange={e => setHeaderSearch(e.target.value)} />
          </div>
          <div className="fd-header-actions">
            <MessageBell />
            <NotificationBell onNavigate={setActiveTab} />
            <div className="divider" />
            <div className="fd-user-profile" onClick={() => navigate(ROUTES.PROFILE)} style={{ cursor: "pointer" }}>
              <div className="fd-user-info">
                <p className="fd-user-name">{user?.fullName || "Nông dân"}</p>
                <p className="fd-user-role">Quản lý nông trại</p>
              </div>
              <div className="fd-user-avatar">{(user?.fullName || "ND").slice(0, 2).toUpperCase()}</div>
            </div>
          </div>
        </header>
        <div className="fd-content">
          {activeTab === "muavu" && <MuaVuContent user={user} onNavigate={setActiveTab} />}
          {activeTab === "hopdong" && <HopDongContent searchQuery={headerSearch} />}
          {activeTab === "donhang" && <DonHangContent searchQuery={headerSearch} />}
          {activeTab === "escrow" && <FarmerEscrowContent />}
          {activeTab === "vi" && <WalletPayment role="farmer" />}
          {activeTab === "taichinh" && <FarmerFinanceContent />}
          {activeTab === "danhgia" && <BilateralRating currentRole="farmer" />}
          {activeTab === "thoitiet" && <FarmerWeatherContent />}
          {activeTab === "dangban" && <DangBanContent />}
        </div>
      </main>
    </div>
  );
}
