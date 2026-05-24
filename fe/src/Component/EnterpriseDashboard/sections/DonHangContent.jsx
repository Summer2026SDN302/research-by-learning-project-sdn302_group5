// Tách từ EnterpriseDashboard.jsx theo SRP.
import { useState, useEffect, useCallback } from "react";
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
