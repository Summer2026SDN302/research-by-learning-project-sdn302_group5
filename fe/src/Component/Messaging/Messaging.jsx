import { useState, useRef, useEffect, useCallback } from "react";
import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { COMPANY } from "../../constants";
import messagingService from "../../services/messaging.service";
import Navbar from "../Navbar/Navbar";
import "./Messaging.css";

const POLLING_INTERVAL_MS = 5000;

/** Normalize a raw API conversation to UI shape */
const toUiConversation = (c) => ({
  id: c._id,
  name: c.partner?.fullName || "Người dùng",
  avatar: (c.partner?.fullName || "ND").slice(0, 2).toUpperCase(),
  role: c.partner?.role || "farmer",
  lastMessage: c.lastMessage || "",
  time: c.lastMessageAt
    ? new Date(c.lastMessageAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : "",
  unread: 0,
  online: false,
});

/** Normalize a raw API message to UI shape */
const toUiMessage = (m, currentUserId) => ({
  id: m._id,
  sender: m.sender?._id === currentUserId || m.sender?.email === currentUserId ? "me" : "them",
  text: m.text,
  time: new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
});

function Messaging() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState(null);
  const [inputText, setInputText] = useState("");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChat, messages]);

  // Load conversation list once on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await messagingService.getConversations();
        if (res?.data) {
          const convs = res.data.map(toUiConversation);
          setConversations(convs);
          if (convs.length > 0) setActiveChat(convs[0].id);
        }
      } catch {
        // API unavailable — show empty state, user can still try later
      } finally {
        setLoadingConvs(false);
      }
    };
    loadConversations();
  }, []);

  // Load messages when switching conversation + start polling
  const loadMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const res = await messagingService.getMessages(chatId);
      if (res?.data) {
        const userId = user?._id || user?.email;
        const apiMsgs = res.data.map((m) => toUiMessage(m, userId));
        setMessages((prev) => ({ ...prev, [chatId]: apiMsgs }));
      }
    } catch { /* keep existing messages on error */ }
  }, [user]);

  useEffect(() => {
    if (!activeChat) return;

    setLoadingMsgs(true);
    loadMessages(activeChat).finally(() => setLoadingMsgs(false));

    // Start / reset polling for active conversation
    clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => loadMessages(activeChat), POLLING_INTERVAL_MS);

    return () => clearInterval(pollingRef.current);
  }, [activeChat, loadMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;
    const text = inputText.trim();
    const now = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const optimisticMsg = { id: `opt-${Date.now()}`, sender: "me", text, time: now };

    // Optimistic update
    setMessages((prev) => ({ ...prev, [activeChat]: [...(prev[activeChat] || []), optimisticMsg] }));
    setConversations((prev) =>
      prev.map((c) => (c.id === activeChat ? { ...c, lastMessage: text, time: now } : c))
    );
    setInputText("");

    try {
      await messagingService.sendMessage(activeChat, text);
      // Refresh messages to replace optimistic entry with real one
      await loadMessages(activeChat);
    } catch { /* optimistic message already visible; user sees their text */ }
  };

  const activePerson = conversations.find((c) => c.id === activeChat);
  const currentMessages = messages[activeChat] || [];
  const filteredConversations = conversations.filter(
    (c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="messaging-page">
        <Container fluid className="messaging-container">
          <div className="messaging-layout">
            {/* LEFT — Conversation List */}
            <div className="msg-sidebar">
              <div className="msg-sidebar-header">
                <h3><span className="msg-header-icon" /> Tin nhắn</h3>
                <button className="back-btn" onClick={() => navigate(-1)}>Quay lại</button>
              </div>

              <div className="msg-search">
                <input type="text" placeholder="Tìm kiếm cuộc trò chuyện..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              <div className="msg-list">
                {loadingConvs ? (
                  <div className="msg-list-loading">Đang tải...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="msg-list-empty">
                    <p>{searchQuery ? "Không tìm thấy cuộc trò chuyện" : "Chưa có cuộc trò chuyện nào"}</p>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`msg-item ${activeChat === conv.id ? "active" : ""}`}
                      onClick={() => setActiveChat(conv.id)}
                    >
                      <div className="msg-item-avatar">
                        {conv.avatar}
                        {conv.online && <span className="online-dot"></span>}
                      </div>
                      <div className="msg-item-content">
                        <div className="msg-item-top">
                          <h4>{conv.name}</h4>
                          <span className="msg-time">{conv.time}</span>
                        </div>
                        <p className="msg-preview">{conv.lastMessage}</p>
                      </div>
                      {conv.unread > 0 && <span className="unread-badge">{conv.unread}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT — Chat */}
            <div className="msg-chat">
              {activePerson ? (
                <>
                  <div className="msg-chat-header">
                    <div className="chat-person">
                      <div className="msg-item-avatar">{activePerson.avatar}{activePerson.online && <span className="online-dot"></span>}</div>
                      <div>
                        <h4>{activePerson.name}</h4>
                        <span className="chat-status">{activePerson.online ? "Đang hoạt động" : "Offline"}</span>
                      </div>
                    </div>
                    <div className="chat-actions">
                      <button className="chat-action-btn contract-action" title="Tạo hợp đồng"><span className="action-icon contract-a-icon" /></button>
                      <button className="chat-action-btn call-action" title="Gọi điện"><span className="action-icon call-a-icon" /></button>
                      <button className="chat-action-btn more-action" title="Thêm">...</button>
                    </div>
                  </div>

                  <div className="msg-chat-body">
                    <div className="preon-notice">
                      <span className="shield-icon" />
                      <p>Cuộc trò chuyện được bảo vệ bởi {COMPANY.NAME}. Mọi thỏa thuận nên được ký kết qua hợp đồng điện tử để đảm bảo quyền lợi.</p>
                    </div>

                    {loadingMsgs && currentMessages.length === 0 ? (
                      <div className="msgs-loading">Đang tải tin nhắn...</div>
                    ) : currentMessages.length === 0 ? (
                      <div className="msgs-empty">Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!</div>
                    ) : (
                      currentMessages.map(msg => (
                        <div key={msg.id} className={`msg-bubble ${msg.sender}`}>
                          <p>{msg.text}</p>
                          <span className="msg-bubble-time">{msg.time}</span>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="msg-chat-input">
                    <button className="attach-btn" title="Đính kèm"><span className="attach-icon" /></button>
                    <input
                      type="text"
                      placeholder="Nhập tin nhắn..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                    />
                    <button className="send-btn" onClick={handleSend} disabled={!inputText.trim()}>Gửi</button>
                  </div>
                </>
              ) : (
                <div className="msg-empty">
                  <div className="empty-msg-icon" />
                  <p>Chọn cuộc trò chuyện để bắt đầu</p>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}

export default Messaging;
