// Tách từ EnterpriseDashboard.jsx theo SRP.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../contexts/ToastContext";
import { ROUTES, COMPANY } from "../../../constants";
import enterpriseService from "../../../services/enterprise.service";
import contractService from "../../../services/contract.service";
import { formatMoney, formatDate } from "../../../hooks/useApiData";

const CONTRACT_STATUS_VI_ENT = {
  pending:   'Chờ ký',
  approved:  'Chờ ký quỹ',
  active:    'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  disputed:  'Đang tranh chấp',
};
const ENT_PAYMENT_LABELS = {
  '50_50':        '50% trả trước – 50% khi nhận hàng',
  '30_70':        '30% trả trước – 70% khi nhận hàng',
  '100_delivery': '100% sau khi giao hàng',
  '100_upfront':  '100% trả trước',
};

export default function HopDongContent({ searchQuery = "", onNavigate }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [activeContractTab, setActiveContractTab] = useState("pending");
  const [apiContracts, setApiContracts] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showSignTerms, setShowSignTerms] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const loadContracts = useCallback(async () => {
    try {
      const res = await enterpriseService.getContracts();
      setApiContracts(res?.data?.contracts || []);
    } catch { setApiContracts([]); }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const mapContract = (c) => ({
    ...c,
    id: c.contractCode || c._id,
    supplier: c.farmerName || "Nông dân",
    product: c.productName || "Nông sản",
    quantityLabel: `${c.quantity} ${c.unit || ""}`.trim(),
    valueLabel: formatMoney(c.totalValue || 0),
    dateLabel: formatDate(c.createdAt),
    deliveryDateLabel: formatDate(c.deliveryDate),
  });

  const contracts = (apiContracts || []).map(mapContract);

  const tabs = [
    { key: "pending",   label: "Chờ phê duyệt",   count: contracts.filter(c => c.status === 'pending' || c.status === 'approved').length },
    { key: "active",    label: "Đang hoạt động",   count: contracts.filter(c => c.status === 'active').length },
    { key: "completed", label: "Hoàn thành",        count: contracts.filter(c => c.status === 'completed').length },
    { key: "cancelled", label: "Đã hủy",            count: contracts.filter(c => c.status === 'cancelled').length },
  ];

  const filteredContracts = contracts.filter(c => {
    const q = (searchQuery || "").toLowerCase();
    const matchSearch = !q || c.product?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q) || c.supplier?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeContractTab === "pending")   return c.status === 'pending' || c.status === 'approved';
    if (activeContractTab === "active")    return c.status === 'active';
    if (activeContractTab === "completed") return c.status === 'completed';
    if (activeContractTab === "cancelled") return c.status === 'cancelled';
    return false;
  });

  const openContract = async (contract) => {
    setSignSuccess(false); setAgreed(false);
    setOtpCode(""); setOtpSent(false); setOtpSending(false);
    setSelectedContract(contract);
    setDetailLoading(true);
    try {
      const res = await contractService.getById(contract._id);
      if (res?.data?.contract) setSelectedContract(mapContract(res.data.contract));
    } catch { /* use list data */ }
    finally { setDetailLoading(false); }
  };

  const goBack = () => { setSelectedContract(null); setSignSuccess(false); setShowCancelModal(false); };

  const handleRequestOtp = async () => {
    if (!selectedContract || otpSending) return;
    setOtpSending(true);
    try {
      await contractService.requestSignOtp(selectedContract._id);
      setOtpSent(true);
      toast.success?.("Mã OTP đã được gửi đến email của bạn");
    } catch (err) {
      toast.error(err?.message || "Gửi mã OTP thất bại.");
    } finally { setOtpSending(false); }
  };

  const handleSign = async () => {
    if (!agreed || !selectedContract || signingLoading) return;
    if (!otpCode.trim()) { toast.error("Vui lòng nhập mã OTP"); return; }
    setSigningLoading(true);
    try {
      await contractService.sign(selectedContract._id, otpCode.trim());
      setSignSuccess(true);
      await loadContracts();
    } catch (err) {
      toast.error(err?.message || "Ký hợp đồng thất bại.");
    } finally { setSigningLoading(false); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim() || cancelLoading || !selectedContract) return;
    setCancelLoading(true);
    try {
      await contractService.cancel(selectedContract._id, cancelReason);
      toast.success("Đã hủy hợp đồng.");
      setShowCancelModal(false); setCancelReason("");
      setSelectedContract(null);
      await loadContracts();
    } catch (err) {
      toast.error(err?.message || "Hủy hợp đồng thất bại.");
    } finally { setCancelLoading(false); }
  };

  const sc = selectedContract;

  return (
    <>
      <div className="breadcrumb">
        <span onClick={goBack} style={{ cursor: sc ? 'pointer' : 'default' }}>Trang chủ</span>
        <span className="arrow">›</span>
        <span onClick={sc ? goBack : undefined} style={{ cursor: sc ? 'pointer' : 'default', color: sc ? '#618968' : undefined }}>Hợp đồng</span>
        {sc && <><span className="arrow">›</span><span className="active">{sc.contractCode || sc.id}</span></>}
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Hợp đồng Thu mua</h1>
          <p className="page-subtitle">Tổng: <strong>{contracts.length} hợp đồng</strong> — Phí dịch vụ {COMPANY.NAME}: <strong>{COMPANY.COMMISSION_RATE}%</strong></p>
        </div>
        {!sc && (
          <button className="cf-btn primary" onClick={() => navigate(ROUTES.CONTRACT_FLOW)}>
            + Tạo hợp đồng mới
          </button>
        )}
      </div>

      {/* ═══ DETAIL VIEW ═══ */}
      {sc && (
        detailLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, margin: '0 auto 12px', display: 'block', color: '#d1d5db' }}><path d="M5 3h10M5 17h10M7 3v5l-2 4 2 4M13 3v5l2 4-2 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p>Đang tải hợp đồng...</p>
          </div>
        ) : signSuccess ? (
          <div className="sign-success-card">
            <div className="ssc-icon">✓</div>
            <h2>Ký hợp đồng thành công!</h2>
            <p>Hợp đồng <strong>{sc.contractCode || sc.id}</strong> đã được ký điện tử.</p>
            <div className="ssc-info-grid">
              <div className="ssc-info-item"><span>Nông dân</span><strong>{sc.supplier}</strong></div>
              <div className="ssc-info-item"><span>Sản phẩm</span><strong>{sc.product}</strong></div>
              <div className="ssc-info-item"><span>Giá trị</span><strong>{sc.valueLabel}</strong></div>
              <div className="ssc-info-item"><span>Ngày giao</span><strong>{sc.deliveryDateLabel}</strong></div>
            </div>
            <p className="ssc-note">{sc.signedByFarmer ? "Cả hai bên đã ký. Hệ thống Escrow đã được kích hoạt tự động." : "Đang chờ nông dân ký. Khi cả hai bên ký xong, hệ thống Escrow sẽ được kích hoạt."}</p>
            <div className="ssc-actions">
              <button className="ssc-btn-primary" onClick={goBack}>← Về danh sách</button>
            </div>
          </div>
        ) : (
          <div className="contract-detail-view">
            <div className="cd-topnav">
              <button className="cd-back-btn" onClick={goBack}>← Danh sách hợp đồng</button>
              <div className="cd-topnav-right">
                <span className="cd-code-badge">{sc.contractCode || sc.id || "—"}</span>
                <span className={`status-badge ${sc.status}`}>{CONTRACT_STATUS_VI_ENT[sc.status] || sc.status}</span>
              </div>
            </div>

            <div className="contract-grid">
              {/* Left: document */}
              <div className="contract-preview">
                <div className="preview-header">
                  <div className="preview-title">
                    <span className="doc-icon" />
                    <span>Nội dung hợp đồng</span>
                  </div>
                  <div className="preview-header-status">
                    <span className={`preview-status-dot ${sc.signedByEnterprise ? 'signed' : 'waiting'}`} />
                    <span className="preview-status-text">{sc.signedByEnterprise ? 'Bạn đã ký' : 'Chờ chữ ký của bạn'}</span>
                    <span className="preview-divider">|</span>
                    <span className={`preview-status-dot ${sc.signedByFarmer ? 'signed' : 'waiting'}`} />
                    <span className="preview-status-text">{sc.signedByFarmer ? 'Nông dân đã ký' : 'Chờ nông dân ký'}</span>
                  </div>
                </div>
                <div className="preview-body">
                  <div className="contract-document">
                    <div className="doc-header">
                      <div className="doc-logo-row"><span className="doc-logo-text">{COMPANY.NAME}</span></div>
                      <h3>THỎA THUẬN MUA BÁN NÔNG SẢN</h3>
                      <p>Mã: <strong>{sc.contractCode || sc.id}</strong></p>
                      <p className="doc-date">Ngày lập: {sc.dateLabel || "—"}</p>
                    </div>
                    <div className="doc-content">
                      <section className="doc-section">
                        <h4>1. CÁC BÊN THAM GIA</h4>
                        <div className="doc-parties">
                          <div className="doc-party">
                            <span className="party-role">Bên bán (Nông dân)</span>
                            <span className="party-name">{sc.farmerName || sc.supplier}</span>
                          </div>
                          <div className="doc-party-divider">—</div>
                          <div className="doc-party">
                            <span className="party-role">Bên mua (Doanh nghiệp)</span>
                            <span className="party-name">{sc.enterpriseName || "—"}</span>
                          </div>
                        </div>
                      </section>
                      <section className="doc-section">
                        <h4>2. ĐỐI TƯỢNG HỢP ĐỒNG</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row"><span>Sản phẩm</span><strong>{sc.productName || sc.product}</strong></div>
                          <div className="ddt-row"><span>Số lượng</span><strong>{sc.quantityLabel}</strong></div>
                          <div className="ddt-row"><span>Đơn giá</span><strong>{formatMoney(sc.pricePerUnit)} / {sc.unit}</strong></div>
                          {sc.notes && <div className="ddt-row"><span>Ghi chú</span><strong>{sc.notes}</strong></div>}
                        </div>
                      </section>
                      <section className="doc-section">
                        <h4>3. GIÁ TRỊ &amp; THANH TOÁN</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row highlight"><span>Tổng giá trị</span><strong>{sc.valueLabel}</strong></div>
                          <div className="ddt-row"><span>Hình thức</span><strong>{ENT_PAYMENT_LABELS[sc.paymentTerms] || sc.paymentTerms || "—"}</strong></div>
                          <div className="ddt-row"><span>Đặt cọc ({sc.depositPercentage}%)</span><strong>{formatMoney(sc.depositAmount)}</strong></div>
                          <div className="ddt-row muted"><span>Phí {COMPANY.NAME} ({sc.commissionRate || COMPANY.COMMISSION_RATE}%)</span><strong>{formatMoney(sc.commission)}</strong></div>
                        </div>
                      </section>
                      <section className="doc-section">
                        <h4>4. THỜI GIAN GIAO HÀNG</h4>
                        <div className="doc-detail-table">
                          <div className="ddt-row"><span>Ngày giao</span><strong>{sc.deliveryDateLabel || "—"}</strong></div>
                        </div>
                      </section>
                      <div className="doc-signatures">
                        <div className={`signature-box ${sc.signedByEnterprise ? 'buyer-signed' : 'buyer-pending-box'}`}>
                          <p className="sig-label">{sc.enterpriseName || 'Bên mua'}</p>
                          {sc.signedByEnterprise ? <p className="sig-status sig-signed">✓ Đã ký</p> : <p className="sig-status sig-waiting">Chờ ký ▼</p>}
                          <span className="sig-role">BÊN MUA</span>
                        </div>
                        <div className={`signature-box ${sc.signedByFarmer ? 'seller-signed-done' : 'seller-pending'}`}>
                          <p className="sig-label">{sc.farmerName || sc.supplier || 'Bên bán'}</p>
                          {sc.signedByFarmer ? <p className="sig-status sig-signed">✓ Đã ký</p> : <p className="sig-status sig-waiting">Chưa ký</p>}
                          <span className="sig-role">BÊN BÁN</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: sidebar */}
              <div className="contract-sidebar">
                <div className="cd-info-panel">
                  <div className="cd-info-header">Tóm tắt hợp đồng</div>
                  <div className="cd-info-body">
                    <div className="cd-info-row"><span>Nông dân</span><strong>{sc.supplier}</strong></div>
                    <div className="cd-info-row"><span>Sản phẩm</span><strong>{sc.product}</strong></div>
                    <div className="cd-info-row"><span>Giá trị</span><strong className="cd-value-hl">{sc.valueLabel}</strong></div>
                    <div className="cd-info-row"><span>Ngày giao</span><strong>{sc.deliveryDateLabel}</strong></div>
                    <div className="cd-info-row"><span>Đặt cọc</span><strong>{formatMoney(sc.depositAmount)}</strong></div>
                  </div>
                </div>

                {/* Sign panel — enterprise hasn't signed yet */}
                {sc.status === 'pending' && !sc.signedByEnterprise && (
                  <div className="signature-panel">
                    <div className="panel-header">
                      <h4>Ký điện tử phê duyệt</h4>
                      <p>Xác nhận và ký kết hợp đồng</p>
                    </div>
                    <div className="panel-body">
                      <div className="otp-sign-area">
                        {!otpSent ? (
                          <div className="otp-request-block">
                            <p className="otp-desc">Mã OTP 6 chữ số sẽ được gửi đến email đăng ký của bạn để xác nhận chữ ký điện tử.</p>
                            <button
                              className="otp-send-btn"
                              onClick={handleRequestOtp}
                              disabled={otpSending}
                            >
                              {otpSending ? "Đang gửi..." : "Gửi mã OTP đến email"}
                            </button>
                          </div>
                        ) : (
                          <div className="otp-verify-block">
                            <p className="otp-sent-notice">✓ Mã OTP đã gửi đến email của bạn</p>
                            <input
                              className="otp-input"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="Nhập 6 chữ số"
                              value={otpCode}
                              onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            />
                            <button
                              type="button"
                              className="otp-resend-link"
                              onClick={() => { setOtpSent(false); setOtpCode(""); }}
                            >
                              Gửi lại mã
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="agreement-box">
                        <label>
                          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                          <span>
                            Tôi xác nhận đã đọc đầy đủ hợp đồng,&nbsp;
                            <button type="button" className="cf-link-btn" onClick={() => setShowSignTerms(true)}>điều khoản ký kết</button>
                            &nbsp;và đồng ý. Phí trung gian: <strong>{COMPANY.COMMISSION_RATE}%</strong>.
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="panel-footer">
                      <button
                        className="sign-btn"
                        disabled={!agreed || !otpSent || otpCode.length !== 6 || signingLoading}
                        onClick={handleSign}
                      >
                        {signingLoading ? "Đang xử lý..." : "Ký hợp đồng ngay"}
                      </button>
                      <p className="security-note"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 12, height: 12, marginRight: 4, verticalAlign: 'middle' }}><path d="M8 1l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V3l5-2z" strokeLinejoin="round"/></svg>Mã hóa SSL 256-bit · Xác thực OTP qua email</p>
                    </div>
                  </div>
                )}

                {/* Enterprise signed, waiting for farmer */}
                {sc.signedByEnterprise && !sc.signedByFarmer && (
                  <div className="cd-signed-badge" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <p>✓ Bạn đã ký hợp đồng này</p>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>Đang chờ nông dân ký kết...</span>
                  </div>
                )}

                {/* Both signed */}
                {sc.signedByEnterprise && sc.signedByFarmer && (
                  <div className="cd-signed-badge" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 22 }}>✓</span>
                      <div>
                        <p>Cả hai bên đã ký kết</p>
                        <span style={{ color: '#4ade80', fontSize: 12 }}>Hệ thống Escrow đã được kích hoạt</span>
                      </div>
                    </div>
                    {sc.status === 'approved' && onNavigate && (
                      <button
                        className="approve-btn"
                        style={{ width: '100%', marginTop: 2, padding: '10px 16px', fontWeight: 700 }}
                        onClick={() => { goBack(); onNavigate("escrow"); }}
                      >
                        Nạp ký quỹ ngay →
                      </button>
                    )}
                  </div>
                )}

                {/* Cancel button */}
                {(sc.status === 'pending' || sc.status === 'approved') && (
                  <button className="cd-cancel-btn" onClick={() => setShowCancelModal(true)}>
                    Hủy hợp đồng này
                  </button>
                )}

                <div className="support-panel">
                  <h5>HỖ TRỢ KÝ KẾT</h5>
                  <p>Cần tư vấn? Kết nối với chuyên viên pháp lý {COMPANY.NAME}.</p>
                  <button>Yêu cầu gọi lại</button>
                </div>
              </div>
            </div>

            {/* Cancel modal */}
            {showCancelModal && (
              <div className="terms-modal-overlay" onClick={() => !cancelLoading && setShowCancelModal(false)}>
                <div className="terms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                  <div className="terms-modal-header">
                    <h3>Hủy hợp đồng</h3>
                    <button className="terms-modal-close" onClick={() => setShowCancelModal(false)} disabled={cancelLoading}>✕</button>
                  </div>
                  <div className="terms-modal-body">
                    <p style={{ marginBottom: 12 }}>Lý do hủy hợp đồng <strong>{sc.contractCode || sc.id}</strong>:</p>
                    <textarea className="cd-cancel-reason" placeholder="Nhập lý do hủy..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={4} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', resize: 'vertical' }} />
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Hành động này không thể hoàn tác.</p>
                  </div>
                  <div className="terms-modal-footer">
                    <button className="cf-btn primary" style={{ background: '#ef4444' }} onClick={handleCancel} disabled={!cancelReason.trim() || cancelLoading}>
                      {cancelLoading ? "Đang xử lý..." : "Xác nhận hủy"}
                    </button>
                    <button className="cf-btn outline" onClick={() => setShowCancelModal(false)} disabled={cancelLoading}>Không hủy</button>
                  </div>
                </div>
              </div>
            )}

            {/* Terms modal */}
            {showSignTerms && (
              <div className="terms-modal-overlay" onClick={() => setShowSignTerms(false)}>
                <div className="terms-modal" onClick={e => e.stopPropagation()}>
                  <div className="terms-modal-header">
                    <h3>Điều khoản Ký kết Hợp đồng</h3>
                    <button className="terms-modal-close" onClick={() => setShowSignTerms(false)}>✕</button>
                  </div>
                  <div className="terms-modal-body">
                    <h4>1. Hiệu lực của chữ ký điện tử</h4>
                    <p>Chữ ký điện tử của bạn trên nền tảng {COMPANY.NAME} có giá trị pháp lý tương đương chữ ký tay theo Luật Giao dịch Điện tử Việt Nam. Hành động ký được ghi nhận kèm thời gian và thiết bị thực hiện.</p>
                    <h4>2. Trách nhiệm của Doanh nghiệp khi ký</h4>
                    <p>Bằng việc ký hợp đồng, Doanh nghiệp cam kết: (i) đã đọc và hiểu toàn bộ nội dung; (ii) có đủ thẩm quyền đại diện pháp lý; (iii) thực hiện đầy đủ các nghĩa vụ trong hợp đồng.</p>
                    <h4>3. Hệ thống Escrow</h4>
                    <p>Khi cả hai bên ký, hệ thống Escrow được kích hoạt. Doanh nghiệp cần nạp tiền vào Escrow trước khi giao hàng bắt đầu. Phí dịch vụ <strong>{COMPANY.COMMISSION_RATE}%</strong> được khấu trừ tự động khi giải ngân.</p>
                    <h4>4. Hủy hợp đồng</h4>
                    <p>Sau khi ký, hợp đồng chỉ có thể hủy khi cả hai bên đồng ý hoặc có vi phạm nghiêm trọng được {COMPANY.NAME} xác nhận.</p>
                  </div>
                  <div className="terms-modal-footer">
                    <button className="cf-btn primary" onClick={() => { setAgreed(true); setShowSignTerms(false); }}>Tôi đã đọc và đồng ý</button>
                    <button className="cf-btn outline" onClick={() => setShowSignTerms(false)}>Đóng</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ═══ LIST VIEW ═══ */}
      {!sc && (
        <>
          <div className="contract-tabs">
            {tabs.map(tab => (
              <button key={tab.key} className={`contract-tab ${activeContractTab === tab.key ? "active" : ""}`} onClick={() => setActiveContractTab(tab.key)}>
                {tab.label} {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="contracts-list">
            {apiContracts === null && <p style={{ textAlign: "center", color: "#888", padding: "40px" }}>Đang tải hợp đồng...</p>}
            {apiContracts !== null && filteredContracts.length === 0 && (
              <p style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                {activeContractTab === "pending" ? "Chưa có hợp đồng nào đang chờ phê duyệt." : "Không có hợp đồng nào trong mục này."}
              </p>
            )}
            {filteredContracts.map(contract => {
              const cci = contract.status === 'active' ? 'cci-active' : contract.status === 'completed' ? 'cci-completed' : contract.status === 'cancelled' ? 'cci-cancelled' : 'cci-pending';
              return (
                <div key={contract.id} className={`contract-card-item ${cci}`}>
                  <div className="contract-main">
                    <div className="contract-left">
                      <h4>{contract.supplier}</h4>
                      <p className="contract-meta">{contract.product} · {contract.quantityLabel}</p>
                      <p className="cci-code" style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{contract.id}</p>
                    </div>
                    <div className="contract-right">
                      <span className="contract-value">{contract.valueLabel}</span>
                      <span className={`status-badge ${contract.status}`}>{CONTRACT_STATUS_VI_ENT[contract.status] || contract.status}</span>
                    </div>
                  </div>
                  <div className="contract-actions-row">
                    <span className="contract-date cci-date">Tạo: {contract.dateLabel}</span>
                    {contract.status === 'pending' && !contract.signedByEnterprise && (
                      <>
                        <button className="approve-btn" onClick={() => openContract(contract)}>Ký hợp đồng</button>
                        <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                        <button className="reject-btn" onClick={() => { setSelectedContract(contract); setShowCancelModal(true); }}>Hủy</button>
                      </>
                    )}
                    {contract.status === 'pending' && contract.signedByEnterprise && !contract.signedByFarmer && (
                      <>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Chờ nông dân ký</span>
                        <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                      </>
                    )}
                    {contract.status === 'approved' && (
                      <>
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Cả hai đã ký — Chờ ký quỹ</span>
                        {onNavigate && (
                          <button className="approve-btn" onClick={() => onNavigate("escrow")}>
                            Nạp ký quỹ ngay →
                          </button>
                        )}
                        <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                      </>
                    )}
                    {contract.status === 'active' && (
                      <button className="review-btn" onClick={() => openContract(contract)}>Xem tiến độ</button>
                    )}
                    {contract.status === 'completed' && (
                      <button className="review-btn" onClick={() => openContract(contract)}>Xem báo cáo</button>
                    )}
                    {contract.status === 'cancelled' && (
                      <button className="review-btn" onClick={() => openContract(contract)}>Xem chi tiết</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Activity log — derived from real data */}
      {!sc && (
        <div className="activity-log">
          <div className="activity-header">
            <h4>Lịch sử giao dịch</h4>
            <span className="update-time">Cập nhật mới nhất</span>
          </div>
          <div className="activity-list">
            {contracts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: 13 }}>Chưa có hoạt động nào</div>
            ) : contracts.slice(0, 5).map((c, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-icon ${c.status === 'active' || c.status === 'completed' ? 'success' : 'pending'}`}>
                  <span className={`ai-dot ${c.status === 'active' || c.status === 'completed' ? 'success' : 'pending'}`} />
                </div>
                <div className="activity-details">
                  <p className="activity-title">{CONTRACT_STATUS_VI_ENT[c.status] || c.status}: {c.supplier}</p>
                  <p className="activity-desc">{c.product} · {c.quantityLabel}</p>
                </div>
                <span className="activity-time">{c.dateLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
