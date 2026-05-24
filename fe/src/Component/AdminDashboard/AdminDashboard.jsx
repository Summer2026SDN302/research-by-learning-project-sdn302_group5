import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ROUTES } from "../../constants";
import TongQuanContent from "./sections/TongQuanContent";
import QuanLyNguoiDung from "./sections/QuanLyNguoiDung";
import QuanLyHopDong from "./sections/QuanLyHopDong";
import QuanLyKhieuNai from "./sections/QuanLyKhieuNai";
import QuanLyGiaoDich from "./sections/QuanLyGiaoDich";
import "./AdminDashboard.css";

const NAV_ITEMS = [
  { key: "tongquan",   label: "Tổng quan",           icon: "TQ" },
  { key: "nguoidung",  label: "Quản lý Người dùng",   icon: "ND" },
  { key: "hopdong",    label: "Quản lý Hợp đồng",     icon: "HD" },
  { key: "khieuuai",  label: "Quản lý Khiếu nại",    icon: "KN" },
  { key: "giaodich",  label: "Quản lý Giao dịch",    icon: "GD" },
];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState("tongquan");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <div className="ad-layout">
      {/* SIDEBAR */}
      <aside className="ad-sidebar">
        <div className="ad-logo" onClick={() => navigate(ROUTES.HOME)} style={{ cursor: "pointer" }}>
          <div className="ad-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="ad-logo-text">
            <h1>PreOnic</h1>
            <p>Bảng quản trị</p>
          </div>
        </div>

        <nav className="ad-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`ad-nav-btn ${activeNav === item.key ? "active" : ""}`}
              onClick={() => setActiveNav(item.key)}
            >
              <span className="ad-nav-icon">{item.icon}</span>
              <span className="ad-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-footer">
          <button className="ad-logout-btn" onClick={handleLogout}>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ad-main">
        <header className="ad-header">
          <div className="ad-header-left">
            <span className="ad-admin-badge">Admin</span>
            <span className="ad-header-title">
              {NAV_ITEMS.find(n => n.key === activeNav)?.label || "Tổng quan"}
            </span>
          </div>
          <div className="ad-header-right">
            <div className="ad-user-info">
              <div className="ad-user-avatar">{(user?.fullName || "AD").slice(0, 2).toUpperCase()}</div>
              <div className="ad-user-text">
                <span className="ad-user-name">{user?.fullName || "Admin"}</span>
                <span className="ad-user-role">Quản trị viên</span>
              </div>
            </div>
          </div>
        </header>

        <div className="ad-content">
          {activeNav === "tongquan"   && <TongQuanContent onNavigate={setActiveNav} />}
          {activeNav === "nguoidung"  && <QuanLyNguoiDung />}
          {activeNav === "hopdong"    && <QuanLyHopDong />}
          {activeNav === "khieuuai"  && <QuanLyKhieuNai />}
          {activeNav === "giaodich"  && <QuanLyGiaoDich />}
        </div>
      </main>
    </div>
  );
}
