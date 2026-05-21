import { useCallback, useEffect, useState } from "react";
import weatherService from "../../../services/weather.service";

export default function WeatherInsuranceContent() {
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("weather");

  const loadWeatherData = useCallback(async () => {
    setLoading(true);
    try {
      const [weatherRes, alertsRes, thresholdsRes] = await Promise.all([
        weatherService.getCurrentWeather().catch(() => null),
        weatherService.getAlerts(1, 10).catch(() => ({ data: [] })),
        weatherService.getThresholds().catch(() => null),
      ]);
      setWeather(weatherRes?.data || null);
      setAlerts(alertsRes?.data || []);
      setThresholds(thresholdsRes?.data || null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeatherData();
  }, [loadWeatherData]);

  const markRead = async (id) => {
    try {
      await weatherService.markAlertAsRead(id);
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await weatherService.markAllAlertsAsRead();
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch { /* silent */ }
  };

  const getSeverityClass = (severity) => severity === "critical" ? "weather-critical" : "weather-warning";
  const getAlertIcon = (type) => {
    const icons = { extreme_heat: "heat", extreme_cold: "cold", heavy_rain: "rain", strong_wind: "wind", drought: "drought" };
    return icons[type] || "weather";
  };
  const getAlertLabel = (type) => {
    const labels = { extreme_heat: "Nắng nóng", extreme_cold: "Rét đậm", heavy_rain: "Mưa lớn", strong_wind: "Gió mạnh", drought: "Hạn hán" };
    return labels[type] || type;
  };
  const formatDate = (d) => new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="breadcrumb"><span>Trang chủ</span><span className="arrow">&gt;</span><span>Thời tiết &amp; Bảo hiểm</span></div>
      <h1 className="page-title">Thời tiết &amp; Bảo hiểm nông nghiệp</h1>

      <div className="weather-section-tabs">
        <button className={`ws-tab ${activeSection === "weather" ? "active" : ""}`} onClick={() => setActiveSection("weather")}>
          <span className="ws-tab-icon weather-tab-icon" /> Thời tiết hiện tại
        </button>
        <button className={`ws-tab ${activeSection === "alerts" ? "active" : ""}`} onClick={() => setActiveSection("alerts")}>
          <span className="ws-tab-icon alert-tab-icon" /> Cảnh báo ({alerts.filter(a => !a.isRead).length})
        </button>
        <button className={`ws-tab ${activeSection === "thresholds" ? "active" : ""}`} onClick={() => setActiveSection("thresholds")}>
          <span className="ws-tab-icon threshold-tab-icon" /> Ngưỡng cảnh báo
        </button>
        <button className={`ws-tab ${activeSection === "insurance" ? "active" : ""}`} onClick={() => setActiveSection("insurance")}>
          <span className="ws-tab-icon insurance-tab-icon" /> Bảo hiểm
        </button>
      </div>

      {loading ? (
        <div className="weather-loading"><div className="weather-spinner" /><p>Đang tải dữ liệu thời tiết...</p></div>
      ) : (
        <>
          {/* Current Weather */}
          {activeSection === "weather" && (
            <div className="weather-current-card">
              {weather ? (
                <>
                  <div className="wc-main">
                    <div className="wc-temp">
                      <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="" className="wc-icon" />
                      <div>
                        <h2>{weather.temp?.toFixed(1)}°C</h2>
                        <p className="wc-desc">{weather.description}</p>
                      </div>
                    </div>
                    <div className="wc-details">
                      <div className="wc-detail"><span className="wc-label">Độ ẩm</span><span className="wc-value">{weather.humidity}%</span></div>
                      <div className="wc-detail"><span className="wc-label">Gió</span><span className="wc-value">{weather.windSpeed?.toFixed(1)} km/h</span></div>
                      <div className="wc-detail"><span className="wc-label">Mưa 1h</span><span className="wc-value">{weather.rain1h?.toFixed(1) || "0"} mm</span></div>
                    </div>
                  </div>
                  <button className="wc-refresh" onClick={loadWeatherData}>Làm mới</button>
                </>
              ) : (
                <div className="wc-no-data">
                  <span className="wc-no-icon" />
                  <h3>Chưa có dữ liệu thời tiết</h3>
                  <p>Vui lòng cập nhật vị trí (tỉnh/thành) trong hồ sơ để nhận thông tin thời tiết.</p>
                </div>
              )}
            </div>
          )}

          {/* Alerts */}
          {activeSection === "alerts" && (
            <div className="weather-alerts-section">
              {alerts.length > 0 && (
                <div className="wa-header">
                  <span>{alerts.filter(a => !a.isRead).length} cảnh báo chưa đọc</span>
                  <button className="wa-mark-all" onClick={markAllRead}>Đánh dấu tất cả đã đọc</button>
                </div>
              )}
              {alerts.length === 0 ? (
                <div className="wa-empty"><span className="wa-empty-icon" /><p>Không có cảnh báo thời tiết nào.</p></div>
              ) : (
                <div className="wa-list">
                  {alerts.map(alert => (
                    <div key={alert._id} className={`wa-item ${getSeverityClass(alert.severity)} ${alert.isRead ? "read" : "unread"}`} onClick={() => !alert.isRead && markRead(alert._id)}>
                      <div className="wa-item-icon">
                        <span className={`alert-type-icon ${getAlertIcon(alert.alertType)}-icon`} />
                      </div>
                      <div className="wa-item-body">
                        <div className="wa-item-header">
                          <span className={`wa-badge ${alert.severity}`}>{alert.severity === "critical" ? "Khẩn cấp" : "Cảnh báo"}</span>
                          <span className="wa-type">{getAlertLabel(alert.alertType)}</span>
                          <span className="wa-date">{formatDate(alert.createdAt)}</span>
                        </div>
                        <p className="wa-message">{alert.message}</p>
                        <p className="wa-detail">{alert.thresholdExceeded}</p>
                        <p className="wa-location">{alert.location?.province}{alert.location?.district ? ` - ${alert.location.district}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Thresholds */}
          {activeSection === "thresholds" && (
            <div className="weather-thresholds-card">
              <h3>Ngưỡng cảnh báo thời tiết hệ thống</h3>
              <p className="wt-desc">Các ngưỡng mặc định được hệ thống sử dụng để kiểm tra và gửi cảnh báo. Hệ thống kiểm tra mỗi 6 giờ.</p>
              <div className="wt-grid">
                <div className="wt-item heat"><span className="wt-icon heat-icon" /><div><h4>Nắng nóng</h4><p>&gt; {thresholds?.extremeHeatTemp || 38}°C</p></div></div>
                <div className="wt-item cold"><span className="wt-icon cold-icon" /><div><h4>Rét đậm</h4><p>&lt; {thresholds?.extremeColdTemp || 5}°C</p></div></div>
                <div className="wt-item rain"><span className="wt-icon rain-icon" /><div><h4>Mưa lớn</h4><p>&gt; {thresholds?.heavyRainMm || 100}mm/ngày</p></div></div>
                <div className="wt-item wind"><span className="wt-icon wind-icon" /><div><h4>Gió mạnh</h4><p>&gt; {thresholds?.strongWindKmh || 60}km/h</p></div></div>
                <div className="wt-item drought"><span className="wt-icon drought-icon" /><div><h4>Hạn hán</h4><p>&lt; {thresholds?.droughtMm || 5}mm / {thresholds?.droughtDays || 14} ngày</p></div></div>
              </div>
            </div>
          )}

          {/* Insurance Info */}
          {activeSection === "insurance" && (
            <div className="insurance-info-card">
              <h3>Bảo hiểm nông nghiệp</h3>
              <p className="ins-desc">Thông tin bảo hiểm được lưu trữ tham khảo trong hợp đồng. Hệ thống không bán bảo hiểm -- chỉ lưu thông tin bảo hiểm bên ngoài mà các bên đã mua.</p>

              <div className="ins-how">
                <h4>Cách thức hoạt động</h4>
                <div className="ins-steps">
                  <div className="ins-step">
                    <div className="ins-step-num">1</div>
                    <div><h5>Mua bảo hiểm</h5><p>Các bên tự mua bảo hiểm nông nghiệp từ công ty bảo hiểm bên ngoài.</p></div>
                  </div>
                  <div className="ins-step">
                    <div className="ins-step-num">2</div>
                    <div><h5>Nhập thông tin</h5><p>Khi tạo hợp đồng, mỗi bên có thể nhập thông tin bảo hiểm của mình (tùy chọn).</p></div>
                  </div>
                  <div className="ins-step">
                    <div className="ins-step-num">3</div>
                    <div><h5>Lưu trữ tham khảo</h5><p>Thông tin bảo hiểm được lưu trong hợp đồng để đối chiếu khi cần.</p></div>
                  </div>
                  <div className="ins-step">
                    <div className="ins-step-num">4</div>
                    <div><h5>Xử lý bồi thường</h5><p>Khi có sự cố, liên hệ công ty bảo hiểm để xử lý bồi thường theo hợp đồng bảo hiểm.</p></div>
                  </div>
                </div>
              </div>

              <div className="ins-fields">
                <h4>Thông tin bảo hiểm trong hợp đồng gồm</h4>
                <ul>
                  <li>Tên công ty bảo hiểm</li>
                  <li>Số hợp đồng bảo hiểm</li>
                  <li>Giá trị được bảo hiểm (VND)</li>
                  <li>Sự kiện được bảo hiểm (thiên tai, dịch bệnh, hoặc cả hai)</li>
                  <li>Thời gian hiệu lực</li>
                  <li>File đính kèm hợp đồng bảo hiểm</li>
                </ul>
              </div>

              <div className="ins-risk">
                <h4>Chia sẻ rủi ro</h4>
                <p>Việc chia sẻ rủi ro được xử lý bởi công ty bảo hiểm bên ngoài. Hệ thống PreOnic chỉ hỗ trợ:</p>
                <ul>
                  <li>Lưu trữ thông tin bảo hiểm tham khảo trong hợp đồng</li>
                  <li>Cảnh báo thời tiết để phòng ngừa rủi ro</li>
                  <li>Ghi nhận điều khoản chia sẻ rủi ro giữa các bên (nếu có)</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
