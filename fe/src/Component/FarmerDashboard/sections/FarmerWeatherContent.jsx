import { useMemo, useState, useEffect } from "react";
import { FiBell, FiCloud, FiClock, FiDroplet, FiMap, FiMapPin, FiRefreshCw, FiShield, FiWind, FiZap, FiCheckCircle, FiAlertTriangle, FiInfo, FiPhone } from "react-icons/fi";
import { useAuth } from "../../../contexts/AuthContext";
import { matchProvince, getDistricts } from "../../../data/vn-locations";
import weatherService from "../../../services/weather.service";

const VIETNAM_PROVINCES = [
  { value: "Ha Noi", label: "Hà Nội" }, { value: "Ho Chi Minh", label: "TP. Hồ Chí Minh" },
  { value: "Da Nang", label: "Đà Nẵng" }, { value: "Hai Phong", label: "Hải Phòng" },
  { value: "Can Tho", label: "Cần Thơ" }, { value: "Binh Duong", label: "Bình Dương" },
  { value: "Dong Nai", label: "Đồng Nai" }, { value: "Lam Dong", label: "Lâm Đồng" },
  { value: "Dak Lak", label: "Đắk Lắk" }, { value: "Gia Lai", label: "Gia Lai" },
  { value: "Long An", label: "Long An" }, { value: "Tien Giang", label: "Tiền Giang" },
  { value: "Ben Tre", label: "Bến Tre" }, { value: "An Giang", label: "An Giang" },
  { value: "Binh Thuan", label: "Bình Thuận" }, { value: "Khanh Hoa", label: "Khánh Hòa" },
  { value: "Tay Ninh", label: "Tây Ninh" }, { value: "Thai Nguyen", label: "Thái Nguyên" },
  { value: "Bac Giang", label: "Bắc Giang" }, { value: "Thanh Hoa", label: "Thanh Hóa" },
  { value: "Nghe An", label: "Nghệ An" }, { value: "Ha Tinh", label: "Hà Tĩnh" },
  { value: "Quang Binh", label: "Quảng Bình" }, { value: "Hue", label: "Thừa Thiên Huế" },
  { value: "Quang Nam", label: "Quảng Nam" }, { value: "Quang Ngai", label: "Quảng Ngãi" },
  { value: "Binh Dinh", label: "Bình Định" }, { value: "Phu Yen", label: "Phú Yên" },
];

const PROVINCE_COORDS_FE = {
  "Ha Noi": { lat: 21.0285, lng: 105.8542 }, "Ho Chi Minh": { lat: 10.8231, lng: 106.6297 },
  "Da Nang": { lat: 16.0544, lng: 108.2022 }, "Hai Phong": { lat: 20.8449, lng: 106.6881 },
  "Can Tho": { lat: 10.0452, lng: 105.7469 }, "Binh Duong": { lat: 11.3254, lng: 106.477 },
  "Dong Nai": { lat: 10.9453, lng: 106.8243 }, "Lam Dong": { lat: 11.9404, lng: 108.4583 },
  "Dak Lak": { lat: 12.71, lng: 108.2378 }, "Gia Lai": { lat: 13.9833, lng: 108.0 },
  "Long An": { lat: 10.5364, lng: 106.4134 }, "Tien Giang": { lat: 10.3599, lng: 106.3631 },
  "Ben Tre": { lat: 10.2434, lng: 106.3756 }, "An Giang": { lat: 10.5216, lng: 105.1259 },
  "Binh Thuan": { lat: 10.9333, lng: 108.1 }, "Khanh Hoa": { lat: 12.2585, lng: 109.0526 },
  "Tay Ninh": { lat: 11.3635, lng: 106.1016 }, "Thai Nguyen": { lat: 21.5671, lng: 105.825 },
  "Bac Giang": { lat: 21.2731, lng: 106.1946 }, "Thanh Hoa": { lat: 19.8, lng: 105.7667 },
  "Nghe An": { lat: 18.6733, lng: 105.6922 }, "Ha Tinh": { lat: 18.3559, lng: 105.8877 },
  "Quang Binh": { lat: 17.4688, lng: 106.6224 }, "Hue": { lat: 16.4637, lng: 107.5909 },
  "Quang Nam": { lat: 15.5394, lng: 108.019 }, "Quang Ngai": { lat: 15.1214, lng: 108.8044 },
  "Binh Dinh": { lat: 13.782, lng: 109.2197 }, "Phu Yen": { lat: 13.0882, lng: 109.0929 },
};

/* =========================================
   INSURANCE SECTION
   ========================================= */
const INSURANCE_PROGRAMS = [
  {
    id: "agribank",
    name: "Bảo hiểm nông nghiệp Agribank",
    provider: "Agribank Insurance (ABIC)",
    hotline: "1900 55 88 99",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    coverages: ["Thiên tai, lũ lụt, hạn hán", "Dịch bệnh cây trồng", "Cháy nổ kho lưu trữ", "Mất mùa do thời tiết cực đoan"],
    suitable: ["Lúa, ngô, hoa màu", "Cây ăn quả", "Cây công nghiệp"],
    note: "Hỗ trợ nông dân vùng ĐBSCL và Tây Nguyên theo chương trình nhà nước.",
  },
  {
    id: "vbi",
    name: "Bảo hiểm cây trồng VBI",
    provider: "VietinBank Insurance (VBI)",
    hotline: "1800 588 878",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    coverages: ["Thiệt hại do bão, lũ", "Sâu bệnh, dịch hại", "Hỏa hoạn, sét đánh", "Rủi ro vận chuyển nông sản"],
    suitable: ["Cà phê, tiêu, điều", "Rau màu, nấm", "Cây ăn quả cao cấp"],
    note: "Gói linh hoạt, phí thấp, phù hợp nông hộ nhỏ đến trang trại lớn.",
  },
  {
    id: "bvbh",
    name: "Bảo hiểm nông sản Bảo Việt",
    provider: "Bảo Việt Nhân Thọ (BVBH)",
    hotline: "1800 599 980",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    coverages: ["Thiên tai, mưa đá, sương giá", "Dịch bệnh quy mô lớn", "Mất thu hoạch trên 30%", "Thiệt hại cơ sở hạ tầng nông nghiệp"],
    suitable: ["Lúa gạo đặc sản", "Thanh long, xoài, sầu riêng", "Cây trồng xuất khẩu"],
    note: "Phối hợp chương trình hỗ trợ phí bảo hiểm của Nhà nước theo Nghị định 58/2018.",
  },
  {
    id: "mic",
    name: "Bảo hiểm nông nghiệp MIC",
    provider: "Military Insurance Corporation (MIC)",
    hotline: "1900 54 54 52",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    coverages: ["Rủi ro thời tiết theo mùa vụ", "Đảm bảo thu nhập tối thiểu", "Bảo vệ vốn đầu tư vụ mùa", "Hỗ trợ phục hồi sau thiên tai"],
    suitable: ["Hoa màu ngắn ngày", "Nông sản ký hợp đồng bao tiêu", "Trang trại kết hợp"],
    note: "Đặc biệt phù hợp cho nông dân đã ký hợp đồng bao tiêu, bảo vệ đôi bên.",
  },
];

function InsuranceSection({ weather, alerts, thresholds }) {
  const [expanded, setExpanded] = useState(null);

  const riskLevel = useMemo(() => {
    const criticalAlerts = alerts.filter(a => a.severity === "critical" && !a.isRead);
    const warningAlerts = alerts.filter(a => a.severity === "warning" && !a.isRead);
    if (criticalAlerts.length > 0) return { level: "high", label: "Cao", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🔴" };
    if (warningAlerts.length > 0) return { level: "medium", label: "Trung bình", color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "🟡" };
    return { level: "low", label: "Thấp", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: "🟢" };
  }, [alerts]);

  const activeAlertTypes = useMemo(() =>
    [...new Set(alerts.filter(a => !a.isRead).map(a => a.alertType))],
    [alerts]
  );

  const alertTypeLabel = {
    extreme_heat: "nắng nóng",
    extreme_cold: "rét đậm",
    heavy_rain: "mưa lớn",
    strong_wind: "gió mạnh",
    drought: "hạn hán",
  };

  return (
    <div className="wthr-insurance" style={{ padding: "0 0 32px" }}>
      {/* Risk assessment */}
      <div style={{ background: riskLevel.bg, border: `1.5px solid ${riskLevel.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 22, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <span style={{ fontSize: "2rem", lineHeight: 1 }}>{riskLevel.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: riskLevel.color }}>Mức rủi ro thời tiết hiện tại: {riskLevel.label}</h3>
          </div>
          {activeAlertTypes.length > 0 ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", lineHeight: 1.6 }}>
              Đang có cảnh báo: <strong>{activeAlertTypes.map(t => alertTypeLabel[t] || t).join(", ")}</strong>.
              Khuyến nghị kiểm tra các gói bảo hiểm phù hợp để bảo vệ vụ mùa.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151" }}>
              Thời tiết ổn định. Đây là thời điểm tốt để cân nhắc tham gia bảo hiểm nông nghiệp với phí thấp.
            </p>
          )}
          {weather && (
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.78rem", background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "3px 8px", color: "#374151" }}>
                🌡️ {weather.temp?.toFixed(1)}°C
              </span>
              <span style={{ fontSize: "0.78rem", background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "3px 8px", color: "#374151" }}>
                💧 Độ ẩm {weather.humidity}%
              </span>
              <span style={{ fontSize: "0.78rem", background: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "3px 8px", color: "#374151" }}>
                💨 Gió {weather.windSpeed?.toFixed(1)} km/h
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Section title */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Các gói bảo hiểm nông nghiệp</h3>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "#6b7280" }}>Thông tin tham khảo các chương trình bảo hiểm phổ biến tại Việt Nam</p>
      </div>

      {/* Insurance cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {INSURANCE_PROGRAMS.map(prog => {
          const isOpen = expanded === prog.id;
          return (
            <div key={prog.id} style={{ background: "#fff", border: `1.5px solid ${isOpen ? prog.border : "#e5e7eb"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: isOpen ? `0 4px 16px ${prog.border}` : "none" }}>
              {/* Card header */}
              <button
                onClick={() => setExpanded(isOpen ? null : prog.id)}
                style={{ width: "100%", background: "none", border: "none", padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: prog.bg, border: `1.5px solid ${prog.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FiShield size={18} color={prog.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.92rem" }}>{prog.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{prog.provider}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <a
                    href={`tel:${prog.hotline.replace(/\s/g, "")}`}
                    onClick={e => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", gap: 4, background: prog.bg, color: prog.color, border: `1px solid ${prog.border}`, borderRadius: 8, padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    <FiPhone size={12} /> {prog.hotline}
                  </a>
                  <span style={{ color: "#9ca3af", fontSize: "1rem", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ borderTop: `1px solid ${prog.border}`, padding: "14px 18px", background: prog.bg }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                        <FiCheckCircle size={13} color={prog.color} /> Phạm vi bảo hiểm
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 14, listStyle: "none" }}>
                        {prog.coverages.map((c, i) => (
                          <li key={i} style={{ fontSize: "0.82rem", color: "#374151", marginBottom: 4, display: "flex", gap: 6 }}>
                            <span style={{ color: prog.color, flexShrink: 0 }}>•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                        <FiInfo size={13} color={prog.color} /> Phù hợp với
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 14, listStyle: "none" }}>
                        {prog.suitable.map((s, i) => (
                          <li key={i} style={{ fontSize: "0.82rem", color: "#374151", marginBottom: 4, display: "flex", gap: 6 }}>
                            <span style={{ color: prog.color, flexShrink: 0 }}>•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${prog.border}`, borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8 }}>
                    <FiAlertTriangle size={13} color={prog.color} style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#374151", lineHeight: 1.6 }}>{prog.note}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Government program note */}
      <div style={{ marginTop: 20, background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <FiShield size={18} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#15803d", fontSize: "0.88rem" }}>Chương trình hỗ trợ phí bảo hiểm Nhà nước</p>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#374151", lineHeight: 1.7 }}>
            Theo <strong>Nghị định 58/2018/NĐ-CP</strong>, nông dân nghèo và cận nghèo được hỗ trợ tới <strong>90%</strong> phí bảo hiểm.
            Nông dân không thuộc diện nghèo được hỗ trợ <strong>20%</strong>. Liên hệ UBND xã/phường để được hướng dẫn đăng ký.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FarmerWeatherContent() {
  const { user } = useAuth();
  const defaultProvince = matchProvince(user?.province) || "Ha Noi";
  const [selectedProvince, setSelectedProvince] = useState(defaultProvince);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("weather");

  const districtOptions = useMemo(() => getDistricts(selectedProvince), [selectedProvince]);

  const handleProvinceChange = (e) => {
    setSelectedProvince(e.target.value);
    setSelectedDistrict("");
  };

  useEffect(() => { loadData(selectedProvince); }, [selectedProvince]);

  const loadData = async (province) => {
    setLoading(true);
    try {
      const [weatherRes, forecastRes, alertsRes, thresholdsRes] = await Promise.all([
        weatherService.getCurrentWeather(province).catch(() => null),
        weatherService.getForecast(province).catch(() => null),
        weatherService.getAlerts(1, 10).catch(() => ({ data: [] })),
        weatherService.getThresholds().catch(() => null),
      ]);
      setWeather(weatherRes?.data || null);
      setForecast(Array.isArray(forecastRes?.data) ? forecastRes.data : []);
      setAlerts(alertsRes?.data || []);
      setThresholds(thresholdsRes?.data || null);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await weatherService.markAlertAsRead(id);
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, isRead: true } : a));
    } catch {
      /* silent */
    }
  };
  const markAllRead = async () => {
    try {
      await weatherService.markAllAlertsAsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch {
      /* silent */
    }
  };

  const getSeverityClass = (s) => s === "critical" ? "weather-critical" : "weather-warning";
  const getAlertIcon = (t) => ({ extreme_heat: "heat", extreme_cold: "cold", heavy_rain: "rain", strong_wind: "wind", drought: "drought" })[t] || "weather";
  const getAlertLabel = (t) => ({ extreme_heat: "Nắng nóng", extreme_cold: "Rét đậm", heavy_rain: "Mưa lớn", strong_wind: "Gió mạnh", drought: "Hạn hán" })[t] || t;
  const formatDateStr = (d) => new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatForecastDate = (ds) => {
    const d = new Date(ds);
    const days = ["CN","T2","T3","T4","T5","T6","T7"];
    return { day: days[d.getDay()], date: `${d.getDate()}/${d.getMonth() + 1}` };
  };

  const provinceLabel = VIETNAM_PROVINCES.find((p) => p.value === selectedProvince)?.label || selectedProvince;
  const displayLocation = selectedDistrict ? `${selectedDistrict}, ${provinceLabel}` : provinceLabel;
  const coords = PROVINCE_COORDS_FE[selectedProvince] || { lat: 16.0, lng: 107.0 };
  const windyZoom = selectedDistrict ? 10 : 8;
  const windyUrl = `https://embed.windy.com/embed2.html?lat=${coords.lat}&lon=${coords.lng}&detailLat=${coords.lat}&detailLon=${coords.lng}&zoom=${windyZoom}&level=surface&overlay=temp&menu=&message=&marker=true&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  const getHeroGradient = (icon) => {
    if (!icon) return "linear-gradient(145deg, #2d6a4f 0%, #40916c 60%, #52b788 100%)";
    const code = icon.slice(0, 2);
    const isDay = icon.endsWith("d");
    if (code === "01") return isDay
      ? "linear-gradient(145deg, #0369a1 0%, #0ea5e9 55%, #38bdf8 100%)"
      : "linear-gradient(145deg, #0f172a 0%, #1e3a5f 55%, #1e40af 100%)";
    if (code === "02") return isDay
      ? "linear-gradient(145deg, #0284c7 0%, #38bdf8 55%, #7dd3fc 100%)"
      : "linear-gradient(145deg, #1e293b 0%, #334155 55%, #475569 100%)";
    if (["03","04"].includes(code)) return "linear-gradient(145deg, #475569 0%, #64748b 55%, #94a3b8 100%)";
    if (["09","10"].includes(code)) return "linear-gradient(145deg, #1e3a5f 0%, #374151 55%, #4b5563 100%)";
    if (code === "11") return "linear-gradient(145deg, #111827 0%, #1f2937 55%, #374151 100%)";
    return "linear-gradient(145deg, #2d6a4f 0%, #40916c 60%, #52b788 100%)";
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const sectionTabs = [
    { key: "weather", label: "Thời tiết", Icon: FiCloud },
    { key: "map", label: "Bản đồ", Icon: FiMap },
    { key: "alerts", label: "Cảnh báo", Icon: FiBell, badgeCount: unreadCount },
    { key: "thresholds", label: "Ngưỡng", Icon: FiZap },
    { key: "insurance", label: "Bảo hiểm", Icon: FiShield },
  ];

  return (
    <>
      <div className="fd-pg-header">
        <div>
          <h2>Thời tiết &amp; Bảo hiểm</h2>
          <p className="fd-pg-subtitle">Theo dõi thời tiết và quản lý thông tin bảo hiểm cho vùng canh tác.</p>
        </div>
      </div>

      <div className="wthr-hero" style={{ background: getHeroGradient(weather?.icon) }}>
        <div className="wthr-deco wthr-deco-1" />
        <div className="wthr-deco wthr-deco-2" />

        <div className="wthr-loc-row">
          <div className="wthr-loc-selects">
            <select className="wthr-loc-select" value={selectedProvince} onChange={handleProvinceChange}>
              {VIETNAM_PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select
              className="wthr-loc-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={districtOptions.length === 0}
            >
              <option value="">{districtOptions.length > 0 ? "Tất cả Quận/Huyện" : "— Không có dữ liệu —"}</option>
              {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="wthr-refresh-btn" onClick={() => loadData(selectedProvince)} disabled={loading}>
            {loading ? <FiClock size={14} /> : <FiRefreshCw size={14} />} Làm mới
          </button>
        </div>

        {loading ? (
          <div className="wthr-hero-loading">
            <div className="wthr-spinner" />
            <span>Đang tải dữ liệu thời tiết...</span>
          </div>
        ) : weather ? (
          <div className="wthr-current">
            <div className="wthr-location-label"><FiMapPin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{displayLocation}</div>
            <div className="wthr-main-row">
              <div className="wthr-icon-temp">
                <img src={`https://openweathermap.org/img/wn/${weather.icon}@4x.png`} alt={weather.description} className="wthr-big-icon" />
                <div>
                  <div className="wthr-temp">{weather.temp?.toFixed(1)}°C</div>
                  <div className="wthr-desc-text">{weather.description}</div>
                </div>
              </div>
              <div className="wthr-stats-grid">
                <div className="wthr-stat-badge">
                  <span className="stat-emoji"><FiDroplet size={18} /></span>
                  <div><div className="stat-lbl">Độ ẩm</div><div className="stat-val">{weather.humidity}%</div></div>
                </div>
                <div className="wthr-stat-badge">
                  <span className="stat-emoji"><FiWind size={18} /></span>
                  <div><div className="stat-lbl">Gió</div><div className="stat-val">{weather.windSpeed?.toFixed(1)} km/h</div></div>
                </div>
                <div className="wthr-stat-badge">
                  <span className="stat-emoji"><FiCloud size={18} /></span>
                  <div><div className="stat-lbl">Mưa 1h</div><div className="stat-val">{weather.rain1h?.toFixed(1) || 0} mm</div></div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="wthr-tabs">
          {sectionTabs.map(({ key, label, Icon, badgeCount }) => (
            <button key={key} className={`wthr-tab ${activeSection === key ? "active" : ""}`} onClick={() => setActiveSection(key)}>
              <Icon size={14} /> {label}
              {badgeCount > 0 && <span className="wthr-tab-badge">{badgeCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <>
          {activeSection === "map" && (
            <div className="wthr-map-wrap">
              <iframe title="windy" src={windyUrl} frameBorder="0" className="wthr-map-frame" />
            </div>
          )}

          {activeSection === "weather" && (
            <div className="wthr-forecast">
              <h3>Dự báo 5 ngày</h3>
              <div className="wthr-forecast-grid">
                {forecast.length === 0 ? (
                  <div className="wthr-empty">Chưa có dữ liệu dự báo</div>
                ) : forecast.map((f, i) => {
                  const label = formatForecastDate(f.date || f.dt_txt || "");
                  return (
                    <div key={i} className="wthr-forecast-item">
                      <span className="wf-day">{label.day}</span>
                      <span className="wf-date">{label.date}</span>
                      <img src={`https://openweathermap.org/img/wn/${f.icon}@2x.png`} alt={f.description} />
                      <span className="wf-temp">{f.temp?.toFixed?.(0) || f.temp}°C</span>
                      <span className="wf-desc">{f.description}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "alerts" && (
            <div className="wthr-alerts">
              <div className="wthr-alerts-header">
                <h3>Cảnh báo thời tiết</h3>
                {alerts.length > 0 && (
                  <button onClick={markAllRead} className="wthr-mark-all">Đánh dấu tất cả đã đọc</button>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="wthr-empty">Không có cảnh báo</div>
              ) : (
                <div className="wthr-alert-list">
                  {alerts.map((a) => (
                    <div key={a._id} className={`wthr-alert-item ${getSeverityClass(a.severity)} ${a.isRead ? "read" : "unread"}`} onClick={() => !a.isRead && markRead(a._id)}>
                      <div className={`wthr-alert-icon ${getAlertIcon(a.alertType)}-icon`} />
                      <div className="wthr-alert-body">
                        <div className="wthr-alert-header">
                          <span className={`wthr-alert-badge ${a.severity}`}>{a.severity === "critical" ? "Khẩn cấp" : "Cảnh báo"}</span>
                          <span className="wthr-alert-type">{getAlertLabel(a.alertType)}</span>
                          <span className="wthr-alert-date">{formatDateStr(a.createdAt)}</span>
                        </div>
                        <p className="wthr-alert-msg">{a.message}</p>
                        <p className="wthr-alert-detail">{a.thresholdExceeded}</p>
                        <p className="wthr-alert-loc">{a.location?.province}{a.location?.district ? ` - ${a.location.district}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "thresholds" && (
            <div className="wthr-thresholds">
              <h3>Ngưỡng cảnh báo hệ thống</h3>
              <div className="wthr-threshold-grid">
                <div className="wt-item heat"><span className="wt-icon heat-icon" /><div><h4>Nắng nóng</h4><p>&gt; {thresholds?.extremeHeatTemp || 38}°C</p></div></div>
                <div className="wt-item cold"><span className="wt-icon cold-icon" /><div><h4>Rét đậm</h4><p>&lt; {thresholds?.extremeColdTemp || 5}°C</p></div></div>
                <div className="wt-item rain"><span className="wt-icon rain-icon" /><div><h4>Mưa lớn</h4><p>&gt; {thresholds?.heavyRainMm || 100}mm/ngày</p></div></div>
                <div className="wt-item wind"><span className="wt-icon wind-icon" /><div><h4>Gió mạnh</h4><p>&gt; {thresholds?.strongWindKmh || 60}km/h</p></div></div>
                <div className="wt-item drought"><span className="wt-icon drought-icon" /><div><h4>Hạn hán</h4><p>&lt; {thresholds?.droughtMm || 5}mm / {thresholds?.droughtDays || 14} ngày</p></div></div>
              </div>
            </div>
          )}

          {activeSection === "insurance" && (
            <InsuranceSection weather={weather} alerts={alerts} thresholds={thresholds} />
          )}
        </>
      )}
    </>
  );
}
