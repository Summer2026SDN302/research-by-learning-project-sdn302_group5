// Modal hiển thị chi tiết hợp đồng cho Farmer.
// Tách từ FarmerDashboard.jsx (≈1746 dòng) sang file riêng để tuân thủ SRP và giảm kích thước dashboard.

import {
  FiCalendar, FiClock, FiDollarSign, FiFeather, FiFileText,
  FiInfo, FiPackage, FiShield,
} from "react-icons/fi";
import { formatDate } from "../../../hooks/useApiData";

function ContractInfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0" }}>
      <span style={{ color: "#9ca3af", marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.74rem", color: "#9ca3af", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "0.87rem", color: "#111827", fontWeight: 600 }}>{value || "—"}</div>
      </div>
    </div>
  );
}

export default function ContractDetailModal({ contract, onClose, PAYMENT_TERMS_LABEL, getStatusBadge }) {
  const c = contract;
  const enterpriseName = c.enterpriseId?.fullName || "Doanh nghiệp";
  const enterpriseEmail = c.enterpriseId?.email || "";
  const enterprisePhone = c.enterpriseId?.phone || "";
  const productName = c.productId?.name || "Nông sản";
  const productUnit = c.productId?.unit || "kg";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FiFileText size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.05rem", fontWeight: 700 }}>Chi tiết hợp đồng</h3>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.78rem" }}>{c.contractCode}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>✕</button>
        </div>

        <div style={{ padding: "14px 24px", background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, color: "#15803d", fontSize: "1rem" }}>{c.contractCode}</span>
          {getStatusBadge(c.status)}
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 10px", color: "#111827", fontSize: "0.92rem", fontWeight: 700, borderBottom: "2px solid #f3f4f6", paddingBottom: 7 }}>Doanh nghiệp đối tác</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              <ContractInfoRow icon={<FiInfo size={14} />} label="Tên" value={enterpriseName} />
              {enterpriseEmail && <ContractInfoRow icon={<FiInfo size={14} />} label="Email" value={enterpriseEmail} />}
              {enterprisePhone && <ContractInfoRow icon={<FiInfo size={14} />} label="Điện thoại" value={enterprisePhone} />}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 10px", color: "#111827", fontSize: "0.92rem", fontWeight: 700, borderBottom: "2px solid #f3f4f6", paddingBottom: 7 }}>Thông tin nông sản</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              <ContractInfoRow icon={<FiFeather size={14} />} label="Sản phẩm" value={productName} />
              <ContractInfoRow icon={<FiPackage size={14} />} label="Đơn vị" value={productUnit} />
              {c.quantity && <ContractInfoRow icon={<FiPackage size={14} />} label="Khối lượng" value={`${c.quantity} ${productUnit}`} />}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 10px", color: "#111827", fontSize: "0.92rem", fontWeight: 700, borderBottom: "2px solid #f3f4f6", paddingBottom: 7 }}>Điều khoản hợp đồng</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              <ContractInfoRow icon={<FiDollarSign size={14} />} label="Giá trị" value={`${(c.totalValue || 0).toLocaleString("vi-VN")} VNĐ`} />
              <ContractInfoRow icon={<FiShield size={14} />} label="Điều khoản TT" value={PAYMENT_TERMS_LABEL[c.paymentTerms] || c.paymentTerms} />
              {c.deliveryDate && <ContractInfoRow icon={<FiCalendar size={14} />} label="Ngày giao" value={formatDate(c.deliveryDate)} />}
              <ContractInfoRow icon={<FiClock size={14} />} label="Ngày tạo" value={new Date(c.createdAt).toLocaleDateString("vi-VN")} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 10px", color: "#111827", fontSize: "0.92rem", fontWeight: 700, borderBottom: "2px solid #f3f4f6", paddingBottom: 7 }}>Trạng thái ký kết</h4>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, background: c.farmerSigned ? "#f0fdf4" : "#f9fafb", border: `1.5px solid ${c.farmerSigned ? "#bbf7d0" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: c.farmerSigned ? "#15803d" : "#6b7280", fontSize: "0.9rem" }}>Nông dân</div>
                <div style={{ fontSize: "0.78rem", color: c.farmerSigned ? "#15803d" : "#9ca3af" }}>{c.farmerSigned ? "Đã ký" : "Chờ ký"}</div>
              </div>
              <div style={{ flex: 1, background: c.enterpriseSigned ? "#f0fdf4" : "#f9fafb", border: `1.5px solid ${c.enterpriseSigned ? "#bbf7d0" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: c.enterpriseSigned ? "#15803d" : "#6b7280", fontSize: "0.9rem" }}>Doanh nghiệp</div>
                <div style={{ fontSize: "0.78rem", color: c.enterpriseSigned ? "#15803d" : "#9ca3af" }}>{c.enterpriseSigned ? "Đã ký" : "Chờ ký"}</div>
              </div>
            </div>
          </div>

          {(c.status === "cancelled" || c.status === "rejected") && c.cancellationReason && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#991b1b", fontWeight: 600 }}>Lý do hủy/từ chối:</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>{c.cancellationReason}</p>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", background: "#fafafa" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
