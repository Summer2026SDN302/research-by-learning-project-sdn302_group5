import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { ROUTES, DEFAULT_UI_METRICS } from "../../constants";
import authService from "../../services/auth.service";
import { formatMoney } from "../../hooks/useApiData";
import Navbar from "../Navbar/Navbar";
import "./Profile.css";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    farmName: "",
    farmSize: "",
    companyName: "",
    taxCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authService.getMe();
        if (res?.data?.user) {
          setProfile(res.data.user);
          setForm({
            fullName: res.data.user.fullName || "",
            phone: res.data.user.phone || "",
            address: res.data.user.address || "",
            farmName: res.data.user.farmName || "",
            farmSize: res.data.user.farmSize || "",
            companyName: res.data.user.companyName || "",
            taxCode: res.data.user.taxCode || "",
          });
        }
      } catch {
        // Use local user data
        if (user) {
          setProfile(user);
          setForm({
            fullName: user.fullName || "",
            phone: user.phone || "",
            address: user.address || "",
            farmName: user.farmName || "",
            farmSize: user.farmSize || "",
            companyName: user.companyName || "",
            taxCode: user.taxCode || "",
          });
        }
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authService.updateProfile(form);
      if (res?.data?.user) {
        setProfile(res.data.user);
        if (updateUser) updateUser(res.data.user);
        toast.success("Cập nhật hồ sơ thành công!");
      }
      setEditing(false);
    } catch {
      toast.error("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const data = profile || user || {};
  const isFarmer = data.role === "farmer";

  return (
    <>
      <Navbar />
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-avatar">
              {(data.fullName || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="profile-header-info">
              <h1>{data.fullName || "Người dùng"}</h1>
              <p className="profile-role">
                {isFarmer ? "Nông dân" : "Doanh nghiệp"} — {data.email}
              </p>
              <div className="profile-badges">
                {data.isVerified && <span className="badge verified">Đã xác thực</span>}
                <span className="badge role">{isFarmer ? "Farmer" : "Enterprise"}</span>
              </div>
            </div>
            <div className="profile-header-actions">
              <button
                className="btn-dashboard"
                onClick={() => navigate(isFarmer ? ROUTES.FARMER : ROUTES.ENTERPRISE)}
              >
                Về Dashboard
              </button>
              {!editing && (
                <button className="btn-edit" onClick={() => setEditing(true)}>
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>

          <div className="profile-grid">
            {/* Account Info */}
            <div className="profile-card">
              <h3>Thông tin tài khoản</h3>
              <div className="profile-field">
                <label>Họ tên</label>
                {editing ? (
                  <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                ) : (
                  <p>{data.fullName || "—"}</p>
                )}
              </div>
              <div className="profile-field">
                <label>Email</label>
                <p>{data.email || "—"}</p>
              </div>
              <div className="profile-field">
                <label>Số điện thoại</label>
                {editing ? (
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                ) : (
                  <p>{data.phone || "—"}</p>
                )}
              </div>
              <div className="profile-field">
                <label>Địa chỉ</label>
                {editing ? (
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                ) : (
                  <p>{data.address || "—"}</p>
                )}
              </div>
            </div>

            {/* Role-specific info */}
            <div className="profile-card">
              <h3>{isFarmer ? "Thông tin nông trại" : "Thông tin doanh nghiệp"}</h3>
              {isFarmer ? (
                <>
                  <div className="profile-field">
                    <label>Tên nông trại</label>
                    {editing ? (
                      <input value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} />
                    ) : (
                      <p>{data.farmName || "—"}</p>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>Diện tích (ha)</label>
                    {editing ? (
                      <input value={form.farmSize} onChange={(e) => setForm({ ...form, farmSize: e.target.value })} />
                    ) : (
                      <p>{data.farmSize || "—"}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="profile-field">
                    <label>Tên công ty</label>
                    {editing ? (
                      <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                    ) : (
                      <p>{data.companyName || "—"}</p>
                    )}
                  </div>
                  <div className="profile-field">
                    <label>Mã số thuế</label>
                    {editing ? (
                      <input value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} />
                    ) : (
                      <p>{data.taxCode || "—"}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="profile-card stats-card">
              <h3>Thống kê</h3>
              <div className="profile-stats">
                <div className="stat-box">
                  <span className="stat-number">{data.reputationScore ?? DEFAULT_UI_METRICS.PROFILE_REPUTATION_SCORE}</span>
                  <span className="stat-label">Điểm uy tín</span>
                </div>
                <div className="stat-box">
                  <span className="stat-number">{formatMoney(data.virtualBalance ?? DEFAULT_UI_METRICS.PROFILE_VIRTUAL_BALANCE)}</span>
                  <span className="stat-label">Số dư ảo</span>
                </div>
                <div className="stat-box">
                  <span className="stat-number">{data.contractCount ?? 0}</span>
                  <span className="stat-label">Hợp đồng</span>
                </div>
              </div>
            </div>
          </div>

          {editing && (
            <div className="profile-actions">
              <button className="btn-cancel" onClick={() => setEditing(false)}>Hủy</button>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
