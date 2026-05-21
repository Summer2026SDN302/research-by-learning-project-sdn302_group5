import { useState, useEffect, useRef } from "react";
import { FiFileText, FiDollarSign, FiPackage, FiCloud, FiBell } from "react-icons/fi";
import notificationService from "../../services/notification.service";
import { formatDate } from "../../hooks/useApiData";
import "./NotificationBell.css";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.getNotifications(1, 10);
      if (res?.data) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n) => !n.isRead).length);
      }
    } catch {
      /* silent */
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      if (res?.data?.count != null) setUnreadCount(res.data.count);
    } catch {
      /* silent */
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      /* silent */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* silent */
    }
  };

  const getIcon = (type) => {
    const icons = {
      contract: <FiFileText size={16} />,
      escrow: <FiDollarSign size={16} />,
      order: <FiPackage size={16} />,
      weather_alert: <FiCloud size={16} />,
      insurance: <FiFileText size={16} />,
      system: <FiBell size={16} />,
    };
    return icons[type] || <FiBell size={16} />;
  };

  return (
    <div className="notif-bell-wrapper" ref={ref}>
      <button
        className="notification-btn"
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h4>Thông báo</h4>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={handleMarkAllRead}>
                Đọc tất cả
              </button>
            )}
          </div>
          <div className="notif-dropdown-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">Không có thông báo mới</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`notif-item ${n.isRead ? "read" : "unread"}`}
                  onClick={() => !n.isRead && handleMarkRead(n._id)}
                >
                  <span className="notif-icon">{getIcon(n.type)}</span>
                  <div className="notif-content">
                    <p className="notif-title">{n.title || n.message}</p>
                    {n.description && (
                      <p className="notif-desc">{n.description}</p>
                    )}
                    <span className="notif-time">
                      {n.createdAt ? formatDate(n.createdAt) : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
