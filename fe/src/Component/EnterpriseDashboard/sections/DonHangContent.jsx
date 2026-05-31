import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../../../contexts/ToastContext";
import enterpriseService from "../../../services/enterprise.service";
import escrowService from "../../../services/escrow.service";
import { formatMoney, formatDate } from "../../../hooks/useApiData";

export default function DonHangContent({ searchQuery = "" }) {
  const [orderTab, setOrderTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [apiOrders, setApiOrders] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnModal, setReturnModal] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [qcChecked, setQcChecked] = useState([false, false, false, false]);
  const [qcVerifiedByOrder, setQcVerifiedByOrder] = useState({});
  const [qcFocus, setQcFocus] = useState(false);
  const qcPanelRef = useRef(null);
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

  useEffect(() => {
    if (!qcFocus || !selectedOrder) return;
    if (selectedOrder.status !== "quality_check" || selectedOrder.escrowStatus === "none") return;
    const timer = setTimeout(() => {
      if (qcPanelRef.current) {
        qcPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [qcFocus, selectedOrder]);

  const closeSelectedOrder = useCallback(() => {
    setSelectedOrder(null);
    setQcFocus(false);
  }, []);

  const orders = apiOrders || [];
  const noEscrowCount = orders.filter(o => o.escrowStatus === "none").length;
  const awaitingDepositCount = orders.filter(o => o.escrowStatus === "awaiting_deposit").length;
  const totalValue = orders.reduce((sum, o) => sum + o.rawValue, 0);
  const shippingCount = orders.filter(o => o.status === "shipping").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;
  const pendingCount = orders.filter(o => ["confirmed", "processing"].includes(o.status)).length;

  const statusLabels = {
    confirmed:     { label: "Đã xác nhận",     cls: "confirmed" },
    processing:    { label: "Đang xử lý",       cls: "processing" },
    shipping:      { label: "Đang vận chuyển",  cls: "shipping" },
    quality_check: { label: "Kiểm tra CL",      cls: "quality" },
    delivered:     { label: "Đã giao hàng",     cls: "delivered" },
  };

  const escrowStatusLabels = {
    none:               { label: "Chưa có ký quỹ",   cls: "esc-none" },
    awaiting_deposit:   { label: "Chờ nạp ký quỹ",   cls: "esc-awaiting" },
    funded:             { label: "Đã ký quỹ",         cls: "esc-funded" },
    partially_released: { label: "Đang giải ngân",    cls: "esc-partial" },
    fully_released:     { label: "Ký quỹ hoàn tất",  cls: "esc-done" },
    refunded:           { label: "Đã hoàn trả",       cls: "esc-refund" },
    disputed:           { label: "Tranh chấp",         cls: "esc-dispute" },
  };

  const orderTabs = [
    { key: "all",           label: "Tất cả",           count: orders.length },
    { key: "confirmed",     label: "Đã xác nhận",      count: orders.filter(o => o.status === "confirmed").length },
    { key: "processing",    label: "Đang xử lý",       count: orders.filter(o => o.status === "processing").length },
    { key: "shipping",      label: "Đang vận chuyển",  count: orders.filter(o => o.status === "shipping").length },
    { key: "quality_check", label: "Kiểm tra CL",      count: orders.filter(o => o.status === "quality_check").length },
    { key: "delivered",     label: "Đã giao",          count: orders.filter(o => o.status === "delivered").length },
  ];

  const filtered = orders
    .filter(o => orderTab === "all" || o.status === orderTab)
    .filter(o => !searchQuery ||
      o.product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.supplier?.toLowerCase().includes(searchQuery.toLowerCase()));

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
      const msgs = { farmer: "Đang chờ nông dân xác nhận.", system: "Hệ thống đang xử lý.", enterprise: "Chưa đủ điều kiện xác nhận." };
      toast.warning(msgs[order.waitingFor] || "Đơn hàng chưa sẵn sàng để xác nhận.");
      setActionModal(null);
      return;
    }
    if (order.status === "quality_check" && !qcVerifiedByOrder[order.contractId]) {
      toast.warning("Vui lòng hoàn tất checklist kiểm tra chất lượng trước khi xác nhận.");
      setQcFocus(true);
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
    if (!returnReason.trim()) { toast.warning("Vui lòng cung cấp lý do trả hàng."); return; }
    setReturnLoading(true);
    try {
      const escrowRes = await escrowService.getByContract(returnModal.contractId);
      const escrow = escrowRes?.data?.escrow;
      if (!escrow) throw new Error("Không tìm thấy escrow cho hợp đồng này");
      const disputeStep = returnModal.disputeStep || returnModal.currentMilestoneStep || 4;
      await escrowService.raiseDispute(escrow._id || escrow.id, disputeStep, returnReason.trim(), []);
      toast.success("Đã gửi khiếu nại. PreOnic sẽ phân giải trong 3–5 ngày làm việc.");
      setReturnModal(null);
      setReturnReason("");
      await loadOrders();
    } catch (err) {
      toast.error(err?.message || "Gửi khiếu nại thất bại.");
    } finally {
      setReturnLoading(false);
    }
  };

  const STEP_MAP = { confirmed: 1, processing: 2, shipping: 3, quality_check: 4, delivered: 5 };
  const STEP_LABELS = ["Xác nhận", "Xử lý", "Vận chuyển", "Kiểm tra CL", "Hoàn thành"];

  return (
    <>
      {/* ── Breadcrumb ── */}
      <div className="breadcrumb">
        <span>Trang chủ</span>
        <span className="arrow">&gt;</span>
        <span>Theo dõi đơn hàng</span>
      </div>

      {/* ── Page header ── */}
      <div className="dh-page-header">
        <h1 className="dh-page-title">Theo Dõi Đơn Hàng</h1>
        <p className="dh-page-subtitle">Giám sát tiến độ hợp đồng thu mua nông sản từ giao hàng đến hoàn tất</p>
      </div>

      {/* ── Stats ── */}
      <div className="dh-stats">
        <div className="dh-stat">
          <div className="dh-stat-icon dh-si-total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <div className="dh-stat-body">
            <span className="dh-stat-num">{orders.length}</span>
            <span className="dh-stat-lbl">Tổng đơn hàng</span>
          </div>
        </div>

        <div className="dh-stat">
          <div className="dh-stat-icon dh-si-pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="dh-stat-body">
            <span className="dh-stat-num">{pendingCount}</span>
            <span className="dh-stat-lbl">Chờ xử lý</span>
          </div>
        </div>

        <div className="dh-stat">
          <div className="dh-stat-icon dh-si-ship">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div className="dh-stat-body">
            <span className="dh-stat-num">{shippingCount}</span>
            <span className="dh-stat-lbl">Đang vận chuyển</span>
          </div>
        </div>

        <div className="dh-stat">
          <div className="dh-stat-icon dh-si-done">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="dh-stat-body">
            <span className="dh-stat-num">{deliveredCount}</span>
            <span className="dh-stat-lbl">Đã giao hàng</span>
          </div>
        </div>

        <div className="dh-stat dh-stat--wide">
          <div className="dh-stat-icon dh-si-value">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="dh-stat-body">
            <span className="dh-stat-num dh-stat-num--money">{totalValue.toLocaleString("vi-VN")} <small>VNĐ</small></span>
            <span className="dh-stat-lbl">Tổng giá trị đơn hàng</span>
          </div>
        </div>
      </div>

      {/* ── Guide cards ── */}
      <div className="dh-guides">
        <div className="dh-guide">
          <div className="dh-guide-icon dh-gi-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="dh-guide-text">
            <strong>Xem chi tiết</strong>
            <span>Hợp đồng, tiến trình, ký quỹ và checklist kiểm tra theo từng đơn</span>
          </div>
        </div>
        <div className="dh-guide">
          <div className="dh-guide-icon dh-gi-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="dh-guide-text">
            <strong>Xác nhận đơn hàng</strong>
            <span>Khả dụng khi đến mốc cần xác nhận. Bước CL cần tick đủ checklist trước khi duyệt</span>
          </div>
        </div>
        <div className="dh-guide">
          <div className="dh-guide-icon dh-gi-red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="dh-guide-text">
            <strong>Trả hàng / Khiếu nại</strong>
            <span>Tạm dừng ký quỹ và chuyển hồ sơ cho PreOnic phân giải trong 3–5 ngày</span>
          </div>
        </div>
      </div>

      {/* ── Escrow alert ── */}
      {(noEscrowCount > 0 || awaitingDepositCount > 0) && (
        <div className="dh-alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            {noEscrowCount > 0 && <span><strong>{noEscrowCount} hợp đồng</strong> chưa có ký quỹ — nhấn "Tạo ký quỹ" trên từng đơn để bảo vệ giao dịch. </span>}
            {awaitingDepositCount > 0 && <span><strong>{awaitingDepositCount} ký quỹ</strong> đang chờ nạp tiền — vào <em>Thanh toán trung gian</em> để nạp ngay.</span>}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="dh-tabs">
        {orderTabs.map(t => (
          <button
            key={t.key}
            className={`dh-tab ${orderTab === t.key ? "active" : ""}`}
            onClick={() => setOrderTab(t.key)}
          >
            {t.label}
            {t.count > 0 && <span className="dh-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          MODAL: Xác nhận / Tạo ký quỹ
      ══════════════════════════════════════════ */}
      {actionModal && (
        <div className="dh-overlay" onClick={() => !actionLoading && setActionModal(null)}>
          <div className="dh-modal dh-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="dh-mhead">
              <div className={`dh-mhead-icon ${actionModal.type === "create_escrow" ? "dh-mhead-icon--green" : "dh-mhead-icon--blue"}`}>
                {actionModal.type === "create_escrow"
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                }
              </div>
              <div className="dh-mhead-info">
                <h3>{actionModal.type === "create_escrow" ? "Tạo ký quỹ" : "Xác nhận mốc thanh toán"}</h3>
                <p>{actionModal.order.contractCode}</p>
              </div>
              <button className="dh-close-btn" onClick={() => !actionLoading && setActionModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="dh-mbody">
              <div className="dh-confirm-table">
                <div className="dh-confirm-row"><span>Sản phẩm</span><strong>{actionModal.order.product}</strong></div>
                <div className="dh-confirm-row"><span>Nhà cung cấp</span><strong>{actionModal.order.supplier}</strong></div>
                <div className="dh-confirm-row"><span>Giá trị</span><strong className="dh-money-hi">{actionModal.order.value}</strong></div>
              </div>

              <div className={`dh-note ${actionModal.type === "create_escrow" ? "dh-note--amber" : "dh-note--blue"}`}>
                {actionModal.type === "create_escrow"
                  ? <p>Hệ thống sẽ tạo tài khoản ký quỹ. Sau đó vào <strong>Thanh toán trung gian</strong> để nạp số tiền theo hợp đồng.</p>
                  : actionModal.order.status === "quality_check" && !qcVerifiedByOrder[actionModal.order.contractId]
                    ? <p>Đơn đang ở bước <strong>Kiểm tra chất lượng</strong>. Mở chi tiết và tick đủ checklist trước khi xác nhận giải ngân.</p>
                    : <p>Xác nhận hàng hóa đạt tiêu chuẩn. Mốc thanh toán sẽ hoàn tất và tiền được giải ngân cho nông dân.</p>
                }
              </div>

              <div className="dh-warn-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Hành động này không thể hoàn tác. Bạn có chắc chắn không?
              </div>
            </div>

            <div className="dh-mfoot">
              <button className="dh-btn-ghost" onClick={() => !actionLoading && setActionModal(null)}>Hủy</button>
              <button
                className={`dh-btn-primary ${actionModal.type === "confirm_milestone" && !actionModal.order.enterpriseCanConfirm ? "dh-btn-disabled" : ""}`}
                disabled={actionLoading || (actionModal.type === "confirm_milestone" && !actionModal.order.enterpriseCanConfirm && !(actionModal.order.status === "quality_check"))}
                onClick={() => {
                  if (actionModal.type === "create_escrow") { handleCreateEscrow(actionModal.order); return; }
                  if (actionModal.order.status === "quality_check" && !qcVerifiedByOrder[actionModal.order.contractId]) {
                    setActionModal(null);
                    setQcFocus(true);
                    setSelectedOrder(actionModal.order);
                    return;
                  }
                  handleMilestoneConfirm(actionModal.order);
                }}
              >
                {actionLoading ? "Đang xử lý..."
                  : actionModal.type === "create_escrow" ? "Tạo ký quỹ"
                  : !actionModal.order.enterpriseCanConfirm ? "Chưa thể xác nhận"
                  : actionModal.order.status === "quality_check" && !qcVerifiedByOrder[actionModal.order.contractId] ? "Mở checklist CL"
                  : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL: Chi tiết đơn hàng
      ══════════════════════════════════════════ */}
      {selectedOrder && (() => {
        const currentStep = STEP_MAP[selectedOrder.status] || 0;
        const QC_ITEMS = [
          { id: 0, label: "Số lượng khớp với hợp đồng", extra: selectedOrder.quantity },
          { id: 1, label: "Chất lượng sản phẩm đạt tiêu chuẩn cam kết" },
          { id: 2, label: "Bao bì, tem nhãn đầy đủ và không hư hại" },
          { id: 3, label: "Giấy tờ giao hàng hợp lệ" },
        ];
        const allChecked = qcChecked.every(Boolean);
        const checkedCount = qcChecked.filter(Boolean).length;
        const STEPS = [
          { label: "Xác nhận đơn",   desc: "Hợp đồng đã ký, đơn hàng được xác nhận" },
          { label: "Đang xử lý",     desc: "Nông dân đang chuẩn bị và thu hoạch hàng" },
          { label: "Vận chuyển",     desc: "Hàng đang trên đường vận chuyển đến kho" },
          { label: "Kiểm tra CL",    desc: "Kiểm tra chất lượng tại điểm nhận hàng" },
          { label: "Hoàn thành",     desc: "Đã giao hàng thành công, tiền đã giải ngân" },
        ];
        const escLbl = escrowStatusLabels[selectedOrder.escrowStatus] || { label: selectedOrder.escrowStatus, cls: "esc-none" };
        return (
          <div className="dh-overlay" onClick={closeSelectedOrder}>
            <div className={`dh-modal dh-modal-lg dh-detail-${selectedOrder.status}`} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="dh-detail-head">
                <div>
                  <span className="dh-detail-code">{selectedOrder.contractCode}</span>
                  <h2 className="dh-detail-product">{selectedOrder.product}</h2>
                  <span className="dh-detail-supplier">Nhà cung cấp: <strong>{selectedOrder.supplier}</strong></span>
                </div>
                <div className="dh-detail-head-right">
                  <span className={`dh-status-chip dh-chip-${selectedOrder.status}`}>
                    {(statusLabels[selectedOrder.status] || {}).label || selectedOrder.status}
                  </span>
                  <button className="dh-close-btn" onClick={closeSelectedOrder}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              <div className="dh-detail-body">
                {/* Two-col info */}
                <div className="dh-detail-cols">
                  <div className="dh-info-card">
                    <div className="dh-info-card-head">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>Thông tin hợp đồng</span>
                    </div>
                    <div className="dh-irow"><span>Số lượng</span><strong>{selectedOrder.quantity}</strong></div>
                    <div className="dh-irow"><span>Giá trị HĐ</span><strong className="dh-money-hi">{selectedOrder.value}</strong></div>
                    <div className="dh-irow"><span>Dự kiến giao</span><strong>{selectedOrder.eta}</strong></div>
                    <div className="dh-irow dh-irow-last"><span>Ngày tạo HĐ</span><strong>{selectedOrder.orderDate}</strong></div>
                  </div>

                  <div className="dh-info-card">
                    <div className="dh-info-card-head">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span>Trạng thái ký quỹ</span>
                    </div>
                    <div className="dh-irow">
                      <span>Trạng thái</span>
                      <span className={`dh-esc-chip dh-esc-${selectedOrder.escrowStatus}`}>{escLbl.label}</span>
                    </div>
                    {selectedOrder.currentMilestone && (
                      <div className="dh-irow"><span>Mốc hiện tại</span><strong>{selectedOrder.currentMilestone}</strong></div>
                    )}
                    <div className="dh-irow">
                      <span>Tiến độ</span>
                      <strong>{selectedOrder.completedSteps}/{selectedOrder.totalSteps} mốc</strong>
                    </div>
                    <div className="dh-esc-bar-wrap">
                      <div className="dh-esc-bar" style={{ width: `${(selectedOrder.completedSteps / (selectedOrder.totalSteps || 1)) * 100}%` }} />
                    </div>
                    {selectedOrder.escrowStatus === "none" && (
                      <button className="dh-btn-esc-create" onClick={() => { closeSelectedOrder(); setActionModal({ order: selectedOrder, type: "create_escrow" }); }}>
                        + Tạo ký quỹ ngay
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="dh-timeline-wrap">
                  <div className="dh-timeline-top">
                    <span className="dh-timeline-title">Tiến trình đơn hàng</span>
                    <span className="dh-timeline-count">{currentStep} / {STEPS.length} bước</span>
                  </div>
                  <div className="dh-timeline">
                    {STEPS.map((step, i) => {
                      const done = i < currentStep;
                      const active = i === currentStep - 1;
                      return (
                        <div key={i} className={`dh-tl-item ${done ? "done" : ""} ${active ? "active" : ""}`}>
                          <div className="dh-tl-left">
                            <div className="dh-tl-dot">
                              {done
                                ? <svg viewBox="0 0 12 10" fill="none"><polyline points="1,5 4.5,9 11,1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                : <span>{i + 1}</span>}
                            </div>
                            {i < STEPS.length - 1 && <div className={`dh-tl-vline ${done ? "done" : ""}`} />}
                          </div>
                          <div className="dh-tl-right">
                            <div className="dh-tl-row">
                              <span className="dh-tl-label">{step.label}</span>
                              {active && <span className="dh-tl-now">Hiện tại</span>}
                            </div>
                            <span className="dh-tl-desc">{step.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* QC Panel */}
                {selectedOrder.status === "quality_check" && selectedOrder.escrowStatus !== "none" && (
                  <div className="dh-qc" ref={qcPanelRef}>
                    <div className="dh-qc-head">
                      <div className="dh-qc-head-left">
                        <div className="dh-qc-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                            <rect x="9" y="3" width="6" height="4" rx="1"/>
                            <polyline points="9 12 11 14 15 10"/>
                          </svg>
                        </div>
                        <div>
                          <span className="dh-qc-title">Kiểm tra chất lượng hàng hóa</span>
                          <span className="dh-qc-sub">Tick đủ các mục bên dưới trước khi duyệt giải ngân</span>
                        </div>
                      </div>
                      <span className="dh-qc-counter">{checkedCount}/{QC_ITEMS.length}</span>
                    </div>

                    <div className="dh-qc-prog">
                      <div className={`dh-qc-prog-fill${allChecked ? " complete" : ""}`} style={{ width: `${(checkedCount / QC_ITEMS.length) * 100}%` }} />
                    </div>

                    <ul className="dh-qc-list">
                      {QC_ITEMS.map(item => (
                        <li
                          key={item.id}
                          className={`dh-qc-item ${qcChecked[item.id] ? "checked" : ""}`}
                          onClick={() => setQcChecked(prev => { const n = [...prev]; n[item.id] = !n[item.id]; return n; })}
                        >
                          <span className="dh-qc-cb">
                            {qcChecked[item.id] && (
                              <svg viewBox="0 0 12 10" fill="none">
                                <polyline points="1,5 4.5,9 11,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          <span>{item.label}{item.extra && <strong> ({item.extra})</strong>}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="dh-qc-actions">
                      <button
                        className={`dh-qc-approve ${!allChecked ? "disabled" : ""}`}
                        disabled={!allChecked}
                        onClick={() => {
                          if (!allChecked) return;
                          setQcVerifiedByOrder(prev => ({ ...prev, [selectedOrder.contractId]: true }));
                          closeSelectedOrder();
                          setQcChecked([false, false, false, false]);
                          setActionModal({ order: selectedOrder, type: "confirm_milestone" });
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Duyệt chất lượng &amp; Giải ngân
                        {!allChecked && <span className="dh-qc-hint">({checkedCount}/{QC_ITEMS.length} mục)</span>}
                      </button>
                      <button
                        className="dh-qc-reject"
                        onClick={() => {
                          closeSelectedOrder();
                          setQcChecked([false, false, false, false]);
                          setReturnReason("");
                          setReturnModal(selectedOrder);
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Trả hàng / Khiếu nại
                      </button>
                    </div>

                    <p className="dh-qc-warn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Sau khi duyệt, tiền ký quỹ sẽ được giải ngân cho nông dân và không thể hoàn tác.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="dh-detail-foot">
                {selectedOrder.status === "shipping" && selectedOrder.escrowStatus !== "none" && (
                  <button
                    className={`dh-btn-primary ${!selectedOrder.enterpriseCanConfirm ? "dh-btn-disabled" : ""}`}
                    disabled={!selectedOrder.enterpriseCanConfirm}
                    onClick={() => {
                      if (!selectedOrder.enterpriseCanConfirm) {
                        toast.warning("Đơn hàng đang chờ nông dân xác nhận giao hàng.");
                        return;
                      }
                      closeSelectedOrder();
                      setActionModal({ order: selectedOrder, type: "confirm_milestone" });
                    }}
                  >
                    {selectedOrder.enterpriseCanConfirm ? "Xác nhận đã nhận hàng" : "Đang chờ nông dân giao hàng"}
                  </button>
                )}
                {selectedOrder.status === "shipping" && selectedOrder.escrowStatus !== "none" && (
                  <button
                    className="dh-btn-danger-outline"
                    onClick={() => { closeSelectedOrder(); setReturnReason(""); setReturnModal(selectedOrder); }}
                  >
                    Trả hàng / Khiếu nại
                  </button>
                )}
                <button className="dh-btn-ghost" onClick={closeSelectedOrder}>Đóng</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════
          MODAL: Trả hàng / Khiếu nại
      ══════════════════════════════════════════ */}
      {returnModal && (
        <div className="dh-overlay" onClick={() => !returnLoading && setReturnModal(null)}>
          <div className="dh-modal dh-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="dh-mhead">
              <div className="dh-mhead-icon dh-mhead-icon--red">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="dh-mhead-info">
                <h3>Trả hàng / Khiếu nại</h3>
                <p>{returnModal.contractCode} — {returnModal.product}</p>
              </div>
              <button className="dh-close-btn" onClick={() => !returnLoading && setReturnModal(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="dh-mbody">
              <div className="dh-note dh-note--amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p>Khiếu nại sẽ <strong>tạm dừng toàn bộ giao dịch ký quỹ</strong>. PreOnic sẽ xem xét và phân giải trong <strong>3–5 ngày làm việc</strong>.</p>
              </div>

              <div className="dh-field">
                <label className="dh-field-label">
                  Lý do trả hàng / khiếu nại <span className="dh-required">*</span>
                </label>
                <textarea
                  className="dh-textarea"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="Mô tả vấn đề: hàng không đến, không đúng chất lượng, sai số lượng..."
                  rows={4}
                />
              </div>
            </div>

            <div className="dh-mfoot">
              <button className="dh-btn-ghost" onClick={() => !returnLoading && setReturnModal(null)}>Hủy</button>
              <button
                className="dh-btn-danger"
                disabled={!returnReason.trim() || returnLoading}
                onClick={handleReturnGoods}
              >
                {returnLoading ? "Đang gửi..." : "Gửi khiếu nại"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ORDER LIST
      ══════════════════════════════════════════ */}
      <div className="dh-orders">
        {apiOrders === null && (
          <div className="dh-empty">
            <div className="dh-spinner" />
            <p>Đang tải đơn hàng...</p>
          </div>
        )}
        {apiOrders !== null && filtered.length === 0 && (
          <div className="dh-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            <h3>Không có đơn hàng</h3>
            <p>Chưa có đơn hàng nào trong mục này</p>
          </div>
        )}

        {filtered.map(order => {
          const st = statusLabels[order.status] || { label: order.status, cls: "confirmed" };
          const curStep = STEP_MAP[order.status] || 0;
          return (
            <div key={order.contractId} className="dh-card">
              {/* Card header */}
              <div className="dh-card-head">
                <div className="dh-card-head-left">
                  <h4 className="dh-card-product">{order.product}</h4>
                  <span className="dh-card-supplier">{order.supplier}</span>
                </div>
                <div className="dh-card-badges">
                  <span className={`dh-status-chip dh-chip-${order.status}`}>{st.label}</span>
                  {order.status === "quality_check" && (
                    <span className="dh-badge-qc">Cần kiểm tra CL</span>
                  )}
                  {order.escrowStatus === "none" && <span className="dh-badge-esc-none">Chưa ký quỹ</span>}
                  {order.escrowStatus === "awaiting_deposit" && <span className="dh-badge-esc-wait">Chờ nạp ký quỹ</span>}
                </div>
              </div>

              {/* Info row */}
              <div className="dh-card-info">
                <div className="dh-card-info-item">
                  <span>Mã HĐ</span>
                  <strong className="dh-code">{order.contractCode}</strong>
                </div>
                <div className="dh-card-info-item">
                  <span>Số lượng</span>
                  <strong>{order.quantity}</strong>
                </div>
                <div className="dh-card-info-item">
                  <span>Giá trị</span>
                  <strong className="dh-money-hi">{order.value}</strong>
                </div>
                <div className="dh-card-info-item">
                  <span>Dự kiến giao</span>
                  <strong>{order.eta}</strong>
                </div>
              </div>

              {/* Step progress */}
              <div className="dh-card-steps">
                {STEP_LABELS.map((label, i) => {
                  const done = i < curStep;
                  const active = i === curStep - 1;
                  return (
                    <div key={i} className="dh-cs-wrap">
                      <div className={`dh-cs-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
                        <div className="dh-cs-dot">
                          {done
                            ? <svg viewBox="0 0 12 10" fill="none"><polyline points="1,5 4.5,9 11,1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <span>{i + 1}</span>
                          }
                        </div>
                        <span className="dh-cs-label">{label}</span>
                      </div>
                      {i < STEP_LABELS.length - 1 && <div className={`dh-cs-line ${i < curStep - 1 ? "done" : ""}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="dh-card-foot">
                <span className="dh-card-date">Tạo HĐ: {order.orderDate}</span>
                <div className="dh-card-actions">
                  <button className="dh-act-detail" onClick={() => { setQcFocus(false); setSelectedOrder(order); }}>
                    Xem chi tiết
                  </button>
                  {order.escrowStatus === "none" && (
                    <button className="dh-act-esc" onClick={() => setActionModal({ order, type: "create_escrow" })}>
                      Tạo ký quỹ
                    </button>
                  )}
                  {order.status === "quality_check" && order.escrowStatus !== "none" && (
                    <button className="dh-act-qc" onClick={() => { setQcFocus(true); setSelectedOrder(order); }}>
                      Kiểm tra CL
                    </button>
                  )}
                  {order.status === "shipping" && order.escrowStatus !== "none" && (
                    <button
                      className={`dh-act-confirm ${!order.enterpriseCanConfirm ? "disabled" : ""}`}
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
                    <button
                      className="dh-act-dispute"
                      onClick={() => { setReturnReason(""); setReturnModal(order); }}
                    >
                      Trả hàng
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
