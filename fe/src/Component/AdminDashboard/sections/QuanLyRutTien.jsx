import { useEffect, useState, useCallback } from "react";
import adminService from "../../../services/admin.service";
import { formatMoney } from "../../../hooks/useApiData";
import { useToast } from "../../../contexts/ToastContext";

const STATUS_META = {
  pending:   { label: "Chờ duyệt", cls: "adm-badge-yellow" },
  completed: { label: "Đã chuyển", cls: "adm-badge-green" },
  rejected:  { label: "Từ chối",   cls: "adm-badge-red" },
};

const STATUS_OPTIONS = [
  { val: "pending", label: "Chờ duyệt" },
  { val: "completed", label: "Đã chuyển" },
  { val: "rejected", label: "Từ chối" },
  { val: "", label: "Tất cả" },
];

export default function QuanLyRutTien() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminService.getWithdrawals(params);
      const data = res?.data || {};
      setRequests(data.requests || []);
      setPagination({ page: data.page || 1, total: data.total || 0, totalPages: data.totalPages || 1 });
    } catch {
      toast.error("Không thể tải danh sách yêu cầu rút tiền");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => { load(1); }, [load]);

  const fmtDate = (d) => d ? new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

  const handleComplete = async (r) => {
    if (!window.confirm(`Xác nhận ĐÃ CHUYỂN KHOẢN ${formatMoney(r.amount)} cho ${r.bankAccountHolder}?\nHệ thống sẽ trừ số tiền này khỏi số dư của người dùng.`)) return;
    setActionId(r._id);
    try {
      await adminService.completeWithdrawal(r._id, "");
      toast.success("Đã hoàn tất rút tiền và trừ số dư người dùng.");
      await load(pagination.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (r) => {
    const reason = window.prompt("Lý do từ chối (không bắt buộc):", "");
    if (reason === null) return;
    setActionId(r._id);
    try {
      await adminService.rejectWithdrawal(r._id, reason);
      toast.success("Đã từ chối đơn rút tiền.");
      await load(pagination.page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Quản lý Rút tiền</h1>
          <p className="adm-page-subtitle">Xét duyệt yêu cầu rút tiền — xác nhận đã chuyển khoản để trừ số dư người dùng</p>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-filters">
          <select className="adm-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="adm-loading">Đang tải...</div>
        ) : requests.length === 0 ? (
          <div className="adm-empty"><p>Không có yêu cầu rút tiền nào</p></div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Số tiền</th>
                    <th>Ngân hàng nhận</th>
                    <th>Ghi chú</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => {
                    const sm = STATUS_META[r.status] || { label: r.status, cls: "adm-badge-gray" };
                    const busy = actionId === r._id;
                    return (
                      <tr key={r._id}>
                        <td>
                          {r.userId ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>{r.userId.fullName}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.userId.email}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>Số dư: {formatMoney(r.userId.virtualBalance || 0)}</div>
                            </div>
                          ) : <span style={{ color: "#94a3b8" }}>—</span>}
                        </td>
                        <td><span style={{ fontWeight: 700, fontSize: 14, color: "#b91c1c" }}>-{formatMoney(r.amount)}</span></td>
                        <td style={{ fontSize: 12.5, color: "#475569" }}>
                          <div style={{ fontWeight: 600 }}>{r.bankName}</div>
                          <div>{r.bankAccountNumber}</div>
                          <div style={{ color: "#94a3b8" }}>{r.bankAccountHolder}</div>
                        </td>
                        <td style={{ color: "#64748b", fontSize: 12, maxWidth: 160 }}>{r.note || "—"}</td>
                        <td><span className={`adm-badge ${sm.cls}`}>{sm.label}</span></td>
                        <td style={{ color: "#64748b", fontSize: 12 }}>{fmtDate(r.createdAt)}</td>
                        <td>
                          {r.status === "pending" ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                disabled={busy}
                                onClick={() => handleComplete(r)}
                                style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: busy ? "#d1d5db" : "#16a34a", color: "#fff", fontWeight: 700, fontSize: 12, cursor: busy ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                              >
                                {busy ? "..." : "Đã chuyển"}
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => handleReject(r)}
                                style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #fecaca", background: "#fff", color: "#dc2626", fontWeight: 600, fontSize: 12, cursor: busy ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>
                              {r.processedBy?.fullName ? `bởi ${r.processedBy.fullName}` : "Đã xử lý"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="adm-pagination">
              <span>Trang {pagination.page} / {pagination.totalPages} — {pagination.total} yêu cầu</span>
              <div className="adm-pagination-btns">
                <button className="adm-pagination-btn" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Trước</button>
                <button className="adm-pagination-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Tiếp →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
