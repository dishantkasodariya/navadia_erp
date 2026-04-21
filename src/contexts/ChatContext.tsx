import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

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

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (receiverId: string, content: string, voiceNote?: string) => void;
  sendBroadcast: (content: string, voiceNote?: string) => void;
  editMessage: (id: string, newContent: string, newVoiceNote?: string) => void;
  deleteMessage: (id: string) => void;
  markAsRead: (id: string) => void;
  getConversation: (otherUserId: string) => ChatMessage[];
  unreadCountContext: number;
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

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(getStoredMessages);
  const { user } = useAuth();

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const sendMessage = (receiverId: string, content: string, voiceNote?: string) => {
    if (!user) return;
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

  const sendBroadcast = (content: string, voiceNote?: string) => {
    if (!user) return;
    const newBroadcast: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: user.name,
      receiverId: "broadcast",
      content,
      voiceNote,
      isEdited: false,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setMessages((prev) => [...prev, newBroadcast]);
  };

  const editMessage = (id: string, newContent: string, newVoiceNote?: string) => {
    setMessages((prev) => 
      prev.map(msg => 
        msg.id === id 
          ? { ...msg, content: newContent, voiceNote: newVoiceNote !== undefined ? newVoiceNote : msg.voiceNote, isEdited: true } 
          : msg
      )
    );
  };

  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter(msg => msg.id !== id));
  };

  const markAsRead = (id: string) => {
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
        unreadCountContext
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
