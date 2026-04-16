import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, ChatMessage } from "@/contexts/ChatContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Mic, Square, Edit2, Check, X, Megaphone, Trash2 } from "lucide-react";

export default function Messages() {
  const { user, allUsers } = useAuth();
  const { messages, getConversation, sendMessage, editMessage, deleteMessage, markAsRead } = useChat();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const otherUsers = allUsers.filter((u) => u.id !== user?.id);
  const selectedUser = allUsers.find((u) => u.id === selectedUserId);
  const conversation = selectedUserId ? getConversation(selectedUserId) : [];

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (selectedUserId && user) {
      conversation.forEach((msg) => {
        if (!msg.isRead && (msg.receiverId === user.id || msg.receiverId === "broadcast")) {
          markAsRead(msg.id);
        }
      });
    }
  }, [selectedUserId, conversation, user, markAsRead]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleSend = () => {
    if (!selectedUserId || (!inputText.trim() && !voiceNote)) return;
    sendMessage(selectedUserId, inputText, voiceNote || undefined);
    setInputText("");
    setVoiceNote(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceNote(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleEditInit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.content);
    setVoiceNote(msg.voiceNote || null); // Load existing voice note for possible overwrite
  };

  const handleEditSave = () => {
    if (editingMessageId) {
      editMessage(editingMessageId, editText, voiceNote || undefined);
      setEditingMessageId(null);
      setEditText("");
      setVoiceNote(null);
    }
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar Contacts */}
      <Card className="w-1/3 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-serif font-medium text-lg">Contacts</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {otherUsers.map((u) => {
              const unread = messages.filter(m => m.senderId === u.id && m.receiverId === user?.id && !m.isRead).length;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors ${
                    selectedUserId === u.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <Avatar className="h-10 w-10 border border-muted">
                    <AvatarFallback className="bg-primary/5 text-primary text-xs">{getInitials(u.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                  </div>
                  {unread > 0 && (
                    <span className="min-w-5 h-5 flex items-center justify-center bg-primary text-primary-foreground text-[10px] rounded-full px-1">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {selectedUserId ? (
          <>
            <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(selectedUser?.name || "")}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-bold">{selectedUser?.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{selectedUser?.role}</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {conversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                conversation.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const isBroadcast = msg.receiverId === "broadcast";
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3 ${
                        isBroadcast ? "bg-accent/20 border border-accent/40 rounded-tl-none w-full max-w-[90%]" 
                        : isMine ? "bg-primary text-primary-foreground rounded-br-none" 
                        : "bg-muted rounded-bl-none"
                      }`}>
                        {isBroadcast && (
                          <div className="flex items-center gap-1 mb-2 text-accent font-bold text-xs uppercase tracking-wider">
                            <Megaphone className="h-3 w-3" /> Broadcast from Admin
                          </div>
                        )}
                        {!isMine && !isBroadcast && (
                          <div className="text-xs opacity-70 mb-1">{msg.senderName}</div>
                        )}

                        {editingMessageId === msg.id ? (
                          <div className="space-y-2">
                            <Input 
                              value={editText} 
                              onChange={(e) => setEditText(e.target.value)} 
                              className="bg-background text-foreground h-8 text-sm"
                            />
                            <div className="flex items-center gap-2">
                              {!isRecording ? (
                                <Button size="sm" variant="outline" className="h-7 text-xs bg-background text-foreground" onClick={startRecording}>
                                  <Mic className="h-3 w-3 mr-1" /> Re-record
                                </Button>
                              ) : (
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={stopRecording}>
                                  <Square className="h-3 w-3 mr-1" /> Stop
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50 bg-background" onClick={handleEditSave}><Check className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 bg-background" onClick={() => { setEditingMessageId(null); setVoiceNote(null); }}><X className="h-4 w-4" /></Button>
                            </div>
                            {voiceNote && <audio src={voiceNote} controls className="h-8 w-full mt-2" />}
                          </div>
                        ) : (
                          <>
                            {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                            {msg.voiceNote && (
                              <audio 
                                src={msg.voiceNote} 
                                controls 
                                className={`h-8 w-full mt-2 ${isMine ? "brightness-110 contrast-125" : ""}`} 
                              />
                            )}
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <span className="text-[10px] opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {msg.isEdited && " (edited)"}
                              </span>
                              {isMine && !isBroadcast && (
                                <div className="flex -mr-1">
                                  <button onClick={() => handleEditInit(msg)} className="p-1 hover:bg-black/10 rounded-full opacity-60 hover:opacity-100 transition-opacity"><Edit2 className="h-3 w-3" /></button>
                                  <button onClick={() => deleteMessage(msg.id)} className="p-1 hover:bg-red-500/20 rounded-full opacity-60 hover:opacity-100 hover:text-red-200 transition-colors"><Trash2 className="h-3 w-3" /></button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t bg-background">
              {voiceNote && !editingMessageId && (
                <div className="flex items-center gap-2 mb-3 bg-muted p-2 rounded-lg">
                  <audio src={voiceNote} controls className="flex-1 h-8" />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setVoiceNote(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    className="pr-12 bg-muted/50"
                  />
                  {!isRecording ? (
                    <button 
                      onClick={startRecording}
                      className="absolute right-3 bottom-0 top-0 text-muted-foreground hover:text-primary transition-colors flex items-center justify-center w-6"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecording}
                      className="absolute right-3 bottom-0 top-0 text-destructive animate-pulse flex items-center justify-center w-6"
                    >
                      <Square className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button onClick={handleSend} disabled={!inputText.trim() && !voiceNote} className="shrink-0 h-10 w-10 p-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a contact to start messaging</p>
            <p className="text-sm opacity-70">You can send private text and voice notes</p>
          </div>
        )}
      </Card>
    </div>
  );
}
