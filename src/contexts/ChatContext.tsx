import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

import { API_BASE_URL } from './config/api';
import { useAuth } from "./AuthContext";
import { io, Socket } from "socket.io-client";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string | "broadcast";
  content: string;
  voiceNote?: string;
  isEdited: boolean;
  timestamp: string;
  isRead: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  type: "message" | "leave" | "attendance" | "general" | "task";
}

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (receiverId: string, content: string, voiceNote?: string) => Promise<void>;
  sendBroadcast: (content: string, voiceNote?: string) => Promise<void>;
  editMessage: (id: string, newContent: string, newVoiceNote?: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  getConversation: (otherUserId: string) => ChatMessage[];
  unreadCountContext: number;
  socket: Socket | null;
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function getStoredMessages(): ChatMessage[] {
  const stored = localStorage.getItem("navadia_chat_messages");
  if (stored) return JSON.parse(stored);
  return [];
}

function saveMessages(messages: ChatMessage[]) {
  localStorage.setItem("navadia_chat_messages", JSON.stringify(messages));
}

function getStoredNotifications(): AppNotification[] {
  const stored = localStorage.getItem("navadia_notifications");
  if (stored) return JSON.parse(stored);
  return [];
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(getStoredMessages);
  const [notifications, setNotifications] = useState<AppNotification[]>(getStoredNotifications);
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const addNotification = (title: string, description: string, type: AppNotification["type"]) => {
    const newNotif: AppNotification = {
      id: crypto.randomUUID(),
      title,
      description,
      timestamp: new Date().toISOString(),
      isRead: false,
      type
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem("navadia_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, isRead: true } : n);
      localStorage.setItem("navadia_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("navadia_notifications");
  };

  // Sync to local storage for quick access & offline mode
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Establish real-time socket connection
  useEffect(() => {
    const token = localStorage.getItem("navadia_token");
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      return;
    }

    const socketInstance = io("${API_BASE_URL}", {
      auth: { token }
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on("joined", ({ userId }) => {
      console.log("Socket connected successfully:", userId);
    });

    socketInstance.on("receive_message", (message: any) => {
      const senderId = message.sender?._id || message.sender || message.senderId;
      if (senderId !== user?.id) {
        toast({
          title: `New Message from ${message.senderName}`,
          description: message.content || "Voice note received",
        });
        addNotification(
          `New Message from ${message.senderName}`,
          message.content || "Voice note received",
          "message"
        );
      }
      setMessages((prev) => {
        const id = message._id || message.id;
        const exists = prev.some(m => m.id === id);
        if (exists) return prev;
        return [
          ...prev,
          {
            id,
            senderId,
            senderName: message.senderName,
            receiverId: message.receiver || message.receiverId,
            content: message.content,
            voiceNote: message.voiceNote,
            isEdited: message.isEdited,
            timestamp: message.timestamp,
            isRead: message.isRead
          }
        ];
      });
    });

    socketInstance.on("leave_applied", (leave: any) => {
      if (user?.role.toLowerCase() === "admin" && leave.userId !== user?.id) {
        toast({
          title: "New Leave Application",
          description: `${leave.userName} has applied for a ${leave.type} leave from ${leave.startDate} to ${leave.endDate}.`,
        });
        addNotification(
          "New Leave Application",
          `${leave.userName} has applied for a ${leave.type} leave from ${leave.startDate} to ${leave.endDate}.`,
          "leave"
        );
      }
    });

    socketInstance.on("leave_updated", (leave: any) => {
      if (leave.userId === user?.id) {
        toast({
          title: `Leave Request ${leave.status}`,
          description: `Your leave request from ${leave.startDate} to ${leave.endDate} has been ${leave.status.toLowerCase()} by the Administrator.`,
          variant: leave.status === "Approved" ? "default" : "destructive",
        });
        addNotification(
          `Leave Request ${leave.status}`,
          `Your leave request from ${leave.startDate} to ${leave.endDate} has been ${leave.status.toLowerCase()} by the Administrator.`,
          "leave"
        );
      }
    });

    socketInstance.on("message_edited", (updatedMsg: any) => {
      const id = updatedMsg._id || updatedMsg.id;
      setMessages((prev) =>
        prev.map(msg =>
          msg.id === id
            ? {
                ...msg,
                content: updatedMsg.content,
                voiceNote: updatedMsg.voiceNote,
                isEdited: true
              }
            : msg
        )
      );
    });

    socketInstance.on("task_assigned", (task: any) => {
      if (task.assignedTo === user?.id && task.createdBy !== user?.id) {
        toast({
          title: "New Task Assigned",
          description: `You have been assigned a new task: ${task.title}`,
        });
        addNotification(
          "New Task Assigned",
          `You have been assigned a new task: ${task.title}`,
          "task"
        );
      }
    });

    socketInstance.on("message_deleted", ({ id }: { id: string }) => {
      setMessages((prev) => prev.filter(msg => msg.id !== id));
    });

    socketInstance.on("message_read", ({ id }: { id: string }) => {
      setMessages((prev) =>
        prev.map(msg => msg.id === id ? { ...msg, isRead: true } : msg)
      );
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  // Sync with MongoDB message history on login
  useEffect(() => {
    const fetchMessages = async () => {
      const token = localStorage.getItem("navadia_token");
      if (!token) return;

      try {
        const res = await fetch("${API_BASE_URL}/api/messages", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((m: any) => ({
            id: m._id,
            senderId: typeof m.sender === 'object' ? m.sender._id : m.sender,
            senderName: m.senderName,
            receiverId: m.receiver,
            content: m.content,
            voiceNote: m.voiceNote,
            isEdited: m.isEdited,
            timestamp: m.timestamp,
            isRead: m.isRead
          }));
          setMessages(mapped);
        }
      } catch (err) {
        console.warn("Backend offline, using cached messages:", err);
      }
    };

    if (user) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [user]);

  const sendMessage = async (receiverId: string, content: string, voiceNote?: string) => {
    if (!user) return;
    const token = localStorage.getItem("navadia_token");
    
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ receiver: receiverId, content, voiceNote })
        });
        if (res.ok) {
          const created = await res.json();
          setMessages((prev) => {
            const id = created._id || created.id;
            const exists = prev.some(m => m.id === id);
            if (exists) return prev;
            return [
              ...prev,
              {
                id,
                senderId: typeof created.sender === 'object' ? created.sender._id : created.sender,
                senderName: created.senderName,
                receiverId: created.receiver,
                content: created.content,
                voiceNote: created.voiceNote,
                isEdited: created.isEdited,
                timestamp: created.timestamp,
                isRead: created.isRead
              }
            ];
          });
          return;
        }
      } catch (err) {
        console.warn("Backend message send failed, relying on offline local save:", err);
      }
    }

    // Local Storage offline fallback
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: user.name,
      receiverId,
      content,
      voiceNote,
      isEdited: false,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const sendBroadcast = async (content: string, voiceNote?: string) => {
    await sendMessage("broadcast", content, voiceNote);
  };

  const editMessage = async (id: string, newContent: string, newVoiceNote?: string) => {
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content: newContent, voiceNote: newVoiceNote })
        });
        if (res.ok) {
          const updated = await res.json();
          setMessages((prev) =>
            prev.map(msg =>
              msg.id === id
                ? {
                    ...msg,
                    content: updated.content,
                    voiceNote: updated.voiceNote,
                    isEdited: true
                  }
                : msg
            )
          );
          return;
        }
      } catch (err) {
        console.warn("Backend message edit failed, fallback to local:", err);
      }
    }

    setMessages((prev) =>
      prev.map(msg =>
        msg.id === id
          ? {
              ...msg,
              content: newContent,
              voiceNote: newVoiceNote !== undefined ? newVoiceNote : msg.voiceNote,
              isEdited: true
            }
          : msg
      )
    );
  };

  const deleteMessage = async (id: string) => {
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setMessages((prev) => prev.filter(msg => msg.id !== id));
          return;
        }
      } catch (err) {
        console.warn("Backend message delete failed, fallback to local:", err);
      }
    }
    setMessages((prev) => prev.filter(msg => msg.id !== id));
  };

  const markAsRead = async (id: string) => {
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages/${id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setMessages((prev) =>
            prev.map(msg => msg.id === id ? { ...msg, isRead: true } : msg)
          );
          return;
        }
      } catch (err) {
        console.warn("Backend read sync failed, fallback to local:", err);
      }
    }
    setMessages((prev) =>
      prev.map(msg => msg.id === id ? { ...msg, isRead: true } : msg)
    );
  };

  const getConversation = (otherUserId: string) => {
    if (!user) return [];
    return messages.filter(
      (m) =>
        m.receiverId === "broadcast" ||
        (m.senderId === user.id && m.receiverId === otherUserId) ||
        (m.senderId === otherUserId && m.receiverId === user.id)
    );
  };

  const unreadCountContext = messages.filter(
    (m) => (m.receiverId === user?.id || m.receiverId === "broadcast") && !m.isRead && m.senderId !== user?.id
  ).length;

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        sendBroadcast,
        editMessage,
        deleteMessage,
        markAsRead,
        getConversation,
        unreadCountContext,
        socket,
        notifications,
        markNotificationAsRead,
        clearNotifications
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within ChatProvider");
  return context;
}

