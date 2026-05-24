import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { ROUTES } from "../../constants";
import authService from "../../services/auth.service";
import { formatMoney } from "../../hooks/useApiData";
import "./Profile.css";

function validate(form, isFarmer) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = "Họ tên không được để trống";
  if (form.phone && !/^[0-9]{10,11}$/.test(form.phone.trim())) errors.phone = "Số điện thoại không hợp lệ (10-11 chữ số)";
  if (isFarmer && form.farmSize && isNaN(Number(form.farmSize))) errors.farmSize = "Diện tích phải là số";
  return errors;
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", address: "", farmName: "", farmSize: "", companyName: "", taxCode: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authService.getMe();
        if (res?.data?.user) {
          const u = res.data.user;
          setProfile(u);
          setForm({ fullName: u.fullName || "", phone: u.phone || "", address: u.address || "", farmName: u.farmName || "", farmSize: u.farmSize || "", companyName: u.companyName || "", taxCode: u.taxCode || "" });
        }
      } catch {
        if (user) {
          setProfile(user);
          setForm({ fullName: user.fullName || "", phone: user.phone || "", address: user.address || "", farmName: user.farmName || "", farmSize: user.farmSize || "", companyName: user.companyName || "", taxCode: user.taxCode || "" });
        }
      }
    };
    loadProfile();
  }, [user]);

  const data = profile || user || {};
  const isFarmer = data.role === "farmer";

  const handleSave = async () => {
    const errs = validate(form, isFarmer);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
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

  const handleCancelEdit = () => {
    setEditing(false);
    setErrors({});
    setForm({ fullName: data.fullName || "", phone: data.phone || "", address: data.address || "", farmName: data.farmName || "", farmSize: data.farmSize || "", companyName: data.companyName || "", taxCode: data.taxCode || "" });
  };

  const handleSavePassword = async () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = "Nhập mật khẩu hiện tại";
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) errs.newPassword = "Mật khẩu mới ít nhất 6 ký tự";
    if (pwForm.newPassword !== pwForm.confirmNewPassword) errs.confirmNewPassword = "Mật khẩu xác nhận không khớp";
    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }
    setPwErrors({});
    setSavingPw(true);
    try {
      await authService.updatePassword(pwForm);
      toast.success("Đổi mật khẩu thành công!");
      setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setShowPasswordSection(false);
    } catch (err) {
      toast.error(err?.message || "Đổi mật khẩu thất bại");
    } finally {
      setSavingPw(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";

  const dashRoute = isFarmer ? ROUTES.FARMER : ROUTES.ENTERPRISE;
  const roleBadgeCls = isFarmer ? "role-farmer" : "role-enterprise";
  const roleLabel = isFarmer ? "Nông dân" : "Doanh nghiệp";

  return (
    <div className="profile-page">
      {/* Topbar */}
      <div className="profile-topbar">
        <div className="profile-topbar-logo" onClick={() => navigate(ROUTES.HOME)}>
          <div className="profile-topbar-logo-img" />
          <span className="profile-topbar-brand">PreOnic</span>
        </div>
        <button className="profile-back-btn" onClick={() => navigate(dashRoute)}>
          ← Về Dashboard
        </button>
      </div>

      <div className="profile-container">
        {/* Header Card */}
        <div className="profile-header">
          <div className="profile-avatar">
            {(data.fullName || "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="profile-header-info">
            <h1>{data.fullName || "Người dùng"}</h1>
            <p className="profile-role">{data.email}</p>
            <div className="profile-badges">
              <span className={`badge ${roleBadgeCls}`}>{roleLabel}</span>
              {data.isVerified && <span className="badge verified">✓ Đã xác thực email</span>}
            </div>
          </div>
          {!editing && (
            <button className="btn-edit" onClick={() => setEditing(true)}>
              Chỉnh sửa hồ sơ
            </button>
          )}
        </div>

        {/* Info Grid */}
        <div className="profile-grid">
          {/* Account Info */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3>Thông tin tài khoản</h3>
            </div>
            <div className="profile-field">
              <label>Họ tên</label>
              {editing ? (
                <>
                  <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className={errors.fullName ? "error" : ""} placeholder="Nhập họ tên..." />
                  {errors.fullName && <span className="field-error">{errors.fullName}</span>}
                </>
              ) : (
                <p className={data.fullName ? "" : "placeholder"}>{data.fullName || "Chưa cập nhật"}</p>
              )}
            </div>
            <div className="profile-field">
              <label>Email</label>
              <input value={data.email || ""} disabled />
            </div>
            <div className="profile-field">
              <label>Số điện thoại</label>
              {editing ? (
                <>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={errors.phone ? "error" : ""} placeholder="VD: 0901234567" />
                  {errors.phone && <span className="field-error">{errors.phone}</span>}
                </>
              ) : (
                <p className={data.phone ? "" : "placeholder"}>{data.phone || "Chưa cập nhật"}</p>
              )}
            </div>
            <div className="profile-field">
              <label>Địa chỉ</label>
              {editing ? (
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ của bạn..." />
              ) : (
                <p className={data.address ? "" : "placeholder"}>{data.address || "Chưa cập nhật"}</p>
              )}
            </div>
          </div>

          {/* Role-specific info */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3>{isFarmer ? "Thông tin nông trại" : "Thông tin doanh nghiệp"}</h3>
            </div>
            {isFarmer ? (
              <>
                <div className="profile-field">
                  <label>Tên nông trại</label>
                  {editing ? (
                    <input value={form.farmName} onChange={e => setForm({ ...form, farmName: e.target.value })} placeholder="VD: Nông trại Xanh..." />
                  ) : (
                    <p className={data.farmName ? "" : "placeholder"}>{data.farmName || "Chưa cập nhật"}</p>
                  )}
                </div>
                <div className="profile-field">
                  <label>Diện tích (ha)</label>
                  {editing ? (
                    <>
                      <input value={form.farmSize} onChange={e => setForm({ ...form, farmSize: e.target.value })} className={errors.farmSize ? "error" : ""} placeholder="VD: 2.5" type="text" />
                      {errors.farmSize && <span className="field-error">{errors.farmSize}</span>}
                    </>
                  ) : (
                    <p className={data.farmSize ? "" : "placeholder"}>{data.farmSize ? `${data.farmSize} ha` : "Chưa cập nhật"}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="profile-field">
                  <label>Tên công ty</label>
                  {editing ? (
                    <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="VD: Công ty TNHH ABC..." />
                  ) : (
                    <p className={data.companyName ? "" : "placeholder"}>{data.companyName || "Chưa cập nhật"}</p>
                  )}
                </div>
                <div className="profile-field">
                  <label>Mã số thuế</label>
                  {editing ? (
                    <input value={form.taxCode} onChange={e => setForm({ ...form, taxCode: e.target.value })} placeholder="VD: 0123456789" />
                  ) : (
                    <p className={data.taxCode ? "" : "placeholder"}>{data.taxCode || "Chưa cập nhật"}</p>
                  )}
                </div>
              </>
            )}
            <div className="profile-field">
              <label>Ngày tham gia</label>
              <p>{fmtDate(data.createdAt)}</p>
            </div>
            <div className="profile-field">
              <label>Đăng nhập lần cuối</label>
              <p>{fmtDate(data.lastLogin)}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="profile-card stats-card">
            <div className="profile-card-header">
              <h3>Thống kê tài khoản</h3>
            </div>
            <div className="profile-stats">
              <div className="stat-box">
                <span className="stat-number">{data.reputationScore?.toFixed(1) ?? "0.0"}</span>
                <span className="stat-label">Điểm uy tín</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{formatMoney(data.virtualBalance ?? 0)}</span>
                <span className="stat-label">Số dư ví</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{data.contractCount ?? 0}</span>
                <span className="stat-label">Hợp đồng</span>
              </div>
              <div className="stat-box">
                <span className="stat-number">{data.province || "—"}</span>
                <span className="stat-label">Tỉnh / TP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Actions */}
        {editing && (
          <div className="profile-actions">
            <button className="btn-cancel" onClick={handleCancelEdit}>Hủy</button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        )}

        {/* Password Change Section */}
        <div className="profile-password-card">
          <div className="profile-card-header">
            <h3>Bảo mật tài khoản</h3>
            <button className="btn-password-toggle" onClick={() => { setShowPasswordSection(v => !v); setPwErrors({}); setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" }); }}>
              {showPasswordSection ? "Ẩn" : "Đổi mật khẩu"}
            </button>
          </div>
          {!showPasswordSection && (
            <p style={{ fontSize: 13, color: "#618968" }}>Mật khẩu của bạn được bảo mật. Nhấn "Đổi mật khẩu" để thay đổi.</p>
          )}
          {showPasswordSection && (
            <>
              <div className="password-grid">
                <div className="profile-field">
                  <label>Mật khẩu hiện tại</label>
                  <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} className={pwErrors.currentPassword ? "error" : ""} placeholder="••••••••" />
                  {pwErrors.currentPassword && <span className="field-error">{pwErrors.currentPassword}</span>}
                </div>
                <div className="profile-field">
                  <label>Mật khẩu mới</label>
                  <input type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} className={pwErrors.newPassword ? "error" : ""} placeholder="Ít nhất 6 ký tự" />
                  {pwErrors.newPassword && <span className="field-error">{pwErrors.newPassword}</span>}
                </div>
                <div className="profile-field">
                  <label>Xác nhận mật khẩu mới</label>
                  <input type="password" value={pwForm.confirmNewPassword} onChange={e => setPwForm({ ...pwForm, confirmNewPassword: e.target.value })} className={pwErrors.confirmNewPassword ? "error" : ""} placeholder="Nhập lại mật khẩu mới" />
                  {pwErrors.confirmNewPassword && <span className="field-error">{pwErrors.confirmNewPassword}</span>}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn-cancel" onClick={() => { setShowPasswordSection(false); setPwErrors({}); }}>Hủy</button>
                <button className="btn-save-password" onClick={handleSavePassword} disabled={savingPw}>
                  {savingPw ? "Đang đổi..." : "Xác nhận đổi mật khẩu"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
