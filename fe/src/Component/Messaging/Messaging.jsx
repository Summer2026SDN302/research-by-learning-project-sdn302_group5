import { useState, useRef, useEffect, useCallback } from "react";
import { Container } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { COMPANY } from "../../constants";
import messagingService from "../../services/messaging.service";
import Navbar from "../Navbar/Navbar";
import "./Messaging.css";

const POLLING_INTERVAL_MS = 5000;

const getCurrentUserId = (user) => user?._id || user?.id || user?.email || null;

const toUiConversation = (conversation, currentUserId) => {
  const partner =
    conversation.partner
    || conversation.participants?.find((participant) => {
      const participantId = participant?._id || participant?.id;
      return participantId && participantId !== currentUserId;
    })
    || null;

  return {
    id: conversation._id,
    name: partner?.fullName || "Nguoi dung",
    avatar: (partner?.fullName || "ND").slice(0, 2).toUpperCase(),
    role: partner?.role || "farmer",
    lastMessage: conversation.lastMessage || "",
    time: conversation.lastMessageAt
      ? new Date(conversation.lastMessageAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    unread: 0,
    online: false,
  };
};

const toUiMessage = (message, currentUserId) => {
  const senderId = message.sender?._id || message.sender?.id || message.sender;
  return {
    id: message._id,
    sender: senderId === currentUserId ? "me" : "them",
    text: message.text,
    time: new Date(message.createdAt).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

function Messaging() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeChat, setActiveChat] = useState(null);
  const [inputText, setInputText] = useState("");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  const currentUserId = getCurrentUserId(user);
  const initialPartnerId = searchParams.get("partnerId");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const mergeConversation = useCallback((conversation) => {
    setConversations((prev) => {
      const next = prev.filter((item) => item.id !== conversation.id);
      return [conversation, ...next];
    });
  }, []);

  const loadMessages = useCallback(async (chatId) => {
    if (!chatId || !currentUserId) return;

    try {
      const res = await messagingService.getMessages(chatId);
      if (res?.data) {
        const apiMessages = res.data.map((message) =>
          toUiMessage(message, currentUserId)
        );
        setMessages((prev) => ({ ...prev, [chatId]: apiMessages }));
      }
    } catch {
      // Keep existing messages on error so the screen stays usable.
    }
  }, [currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat, messages]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    let cancelled = false;

    const bootstrap = async () => {
      setLoadingConvs(true);
      setConversationError("");

      try {
        const res = await messagingService.getConversations();
        let nextConversations = (res?.data || []).map((conversation) =>
          toUiConversation(conversation, currentUserId)
        );

        if (initialPartnerId) {
          try {
            const createdRes = await messagingService.createConversation(initialPartnerId);
            if (createdRes?.data) {
              const createdConversation = toUiConversation(
                createdRes.data,
                currentUserId
              );
              nextConversations = [
                createdConversation,
                ...nextConversations.filter((item) => item.id !== createdConversation.id),
              ];
            }
          } catch (error) {
            if (!cancelled) {
              setConversationError(
                error?.message || "Khong the bat dau cuoc tro chuyen moi"
              );
            }
          } finally {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }

        if (!cancelled) {
          setConversations(nextConversations);
          setActiveChat((prev) => prev || nextConversations[0]?.id || null);
        }
      } catch {
        if (!cancelled) {
          setConversationError("Khong the tai danh sach cuoc tro chuyen");
          setConversations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingConvs(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, initialPartnerId]);

  useEffect(() => {
    if (!activeChat) return undefined;

    setLoadingMsgs(true);
    loadMessages(activeChat).finally(() => setLoadingMsgs(false));

    clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      loadMessages(activeChat);
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(pollingRef.current);
  }, [activeChat, loadMessages]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;

    const text = inputText.trim();
    const now = new Date();
    const nowText = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const optimisticMessage = {
      id: `opt-${Date.now()}`,
      sender: "me",
      text,
      time: nowText,
    };

    setMessages((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), optimisticMessage],
    }));

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeChat
          ? { ...conversation, lastMessage: text, time: nowText }
          : conversation
      )
    );

    setInputText("");

    try {
      await messagingService.sendMessage(activeChat, text);
      const updatedConversation = conversations.find(
        (conversation) => conversation.id === activeChat
      );
      if (updatedConversation) {
        mergeConversation({
          ...updatedConversation,
          lastMessage: text,
          time: nowText,
        });
      }
      await loadMessages(activeChat);
    } catch {
      // The optimistic entry remains visible; polling/manual refresh can recover.
    }
  };

  const activePerson = conversations.find((conversation) => conversation.id === activeChat);
  const currentMessages = messages[activeChat] || [];
  const filteredConversations = conversations.filter(
    (conversation) =>
      !searchQuery
      || conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="messaging-page">
        <Container fluid className="messaging-container">
          <div className="messaging-layout">
            <div className="msg-sidebar">
              <div className="msg-sidebar-header">
                <h3><span className="msg-header-icon" /> Tin nhan</h3>
                <button className="back-btn" onClick={() => navigate(-1)}>Quay lai</button>
              </div>

              <div className="msg-search">
                <input
                  type="text"
                  placeholder="Tim kiem cuoc tro chuyen..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              {conversationError && (
                <div className="msg-list-empty">
                  <p>{conversationError}</p>
                </div>
              )}

              <div className="msg-list">
                {loadingConvs ? (
                  <div className="msg-list-loading">Dang tai...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="msg-list-empty">
                    <p>
                      {searchQuery
                        ? "Khong tim thay cuoc tro chuyen"
                        : "Chua co cuoc tro chuyen nao"}
                    </p>
                    {!searchQuery && (
                      <p>Hay mo tu trang san pham de bat dau nhan tin voi doi tac.</p>
                    )}
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`msg-item ${activeChat === conversation.id ? "active" : ""}`}
                      onClick={() => setActiveChat(conversation.id)}
                    >
                      <div className="msg-item-avatar">
                        {conversation.avatar}
                        {conversation.online && <span className="online-dot" />}
                      </div>
                      <div className="msg-item-content">
                        <div className="msg-item-top">
                          <h4>{conversation.name}</h4>
                          <span className="msg-time">{conversation.time}</span>
                        </div>
                        <p className="msg-preview">{conversation.lastMessage}</p>
                      </div>
                      {conversation.unread > 0 && (
                        <span className="unread-badge">{conversation.unread}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="msg-chat">
              {activePerson ? (
                <>
                  <div className="msg-chat-header">
                    <div className="chat-person">
                      <div className="msg-item-avatar">
                        {activePerson.avatar}
                        {activePerson.online && <span className="online-dot" />}
                      </div>
                      <div>
                        <h4>{activePerson.name}</h4>
                        <span className="chat-status">
                          {activePerson.online ? "Dang hoat dong" : "Offline"}
                        </span>
                      </div>
                    </div>
                    <div className="chat-actions">
                      <button className="chat-action-btn contract-action" title="Tao hop dong">
                        <span className="action-icon contract-a-icon" />
                      </button>
                      <button className="chat-action-btn call-action" title="Goi dien">
                        <span className="action-icon call-a-icon" />
                      </button>
                      <button className="chat-action-btn more-action" title="Them">...</button>
                    </div>
                  </div>

                  <div className="msg-chat-body">
                    <div className="preon-notice">
                      <span className="shield-icon" />
                      <p>
                        Cuoc tro chuyen duoc bao ve boi {COMPANY.NAME}. Moi thoa thuan
                        nen duoc ky ket qua hop dong dien tu de dam bao quyen loi.
                      </p>
                    </div>

                    {loadingMsgs && currentMessages.length === 0 ? (
                      <div className="msgs-loading">Dang tai tin nhan...</div>
                    ) : currentMessages.length === 0 ? (
                      <div className="msgs-empty">
                        Chua co tin nhan. Hay bat dau cuoc tro chuyen!
                      </div>
                    ) : (
                      currentMessages.map((message) => (
                        <div key={message.id} className={`msg-bubble ${message.sender}`}>
                          <p>{message.text}</p>
                          <span className="msg-bubble-time">{message.time}</span>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="msg-chat-input">
                    <button className="attach-btn" title="Dinh kem">
                      <span className="attach-icon" />
                    </button>
                    <input
                      type="text"
                      placeholder="Nhap tin nhan..."
                      value={inputText}
                      onChange={(event) => setInputText(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleSend()}
                    />
                    <button
                      className="send-btn"
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                    >
                      Gui
                    </button>
                  </div>
                </>
              ) : (
                <div className="msg-empty">
                  <div className="empty-msg-icon" />
                  <p>Chon cuoc tro chuyen de bat dau</p>
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
