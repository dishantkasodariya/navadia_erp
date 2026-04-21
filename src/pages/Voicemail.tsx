import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Play, Pause, Trash2, Send, Search, Phone, Clock } from "lucide-react";

interface VoicemailMessage {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  audioUrl: string;
  duration: number;
  subject: string;
  isRead: boolean;
  createdAt: string;
  isTaskRelated: boolean;
}

const INITIAL_MESSAGES: VoicemailMessage[] = [];

export default function Voicemail() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<VoicemailMessage[]>(INITIAL_MESSAGES);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({ toId: "", subject: "" });

  const staffOptions = allUsers.filter((u) => u.id !== user?.id);

  const myMessages = messages.filter((m) => {
    const isRelevant = m.toId === user?.id || m.fromId === user?.id;
    const matchSearch = m.subject.toLowerCase().includes(search.toLowerCase()) || m.fromName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "unread" && !m.isRead) || (filter === "sent" && m.fromId === user?.id) || (filter === "received" && m.toId === user?.id);
    return isRelevant && matchSearch && matchFilter;
  });

  const unreadCount = messages.filter((m) => m.toId === user?.id && !m.isRead).length;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setRecordedAudio(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSend = () => {
    const to = allUsers.find((u) => u.id === form.toId);
    if (!to || !user || (!recordedAudio && !form.subject)) return;
    const msg: VoicemailMessage = {
      id: crypto.randomUUID(),
      fromId: user.id,
      fromName: user.name,
      toId: to.id,
      toName: to.name,
      audioUrl: recordedAudio || "",
      duration: recordingDuration,
      subject: form.subject,
      isRead: false,
      createdAt: new Date().toISOString(),
      isTaskRelated: true,
    };
    setMessages((prev) => [msg, ...prev]);
    setDialogOpen(false);
    setForm({ toId: "", subject: "" });
    setRecordedAudio(null);
    setRecordingDuration(0);
    toast({ title: "Voicemail Sent", description: `Message sent to ${to.name}` });
  };

  const handleMarkRead = (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, isRead: true } : m));
  };

  const handleDelete = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "Message Deleted", variant: "destructive" });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Voicemail</h1>
          <p className="text-muted-foreground text-sm mt-1">Send and receive voice messages for task assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setRecordedAudio(null); setRecordingDuration(0); } }}>
          <DialogTrigger asChild>
            <Button><Mic className="h-4 w-4 mr-2" />New Voicemail</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Voicemail</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Send To</Label>
                <Select value={form.toId} onValueChange={(v) => setForm({ ...form, toId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
                  <SelectContent>
                    {staffOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief subject" />
              </div>
              <div>
                <Label>Voice Message</Label>
                <div className="mt-2 flex flex-col items-center gap-3 p-4 border rounded-lg bg-muted/30">
                  {!isRecording && !recordedAudio && (
                    <Button type="button" size="lg" className="rounded-full h-16 w-16" onClick={startRecording}>
                      <Mic className="h-6 w-6" />
                    </Button>
                  )}
                  {isRecording && (
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                        <span className="text-sm font-mono">{formatTime(recordingDuration)}</span>
                      </div>
                      <Button type="button" variant="destructive" size="lg" className="rounded-full h-16 w-16" onClick={stopRecording}>
                        <Square className="h-6 w-6" />
                      </Button>
                    </div>
                  )}
                  {recordedAudio && (
                    <div className="w-full space-y-2">
                      <audio controls src={recordedAudio} className="w-full h-10" />
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setRecordedAudio(null); setRecordingDuration(0); }}>Re-record</Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isRecording ? "Recording... Click stop when done" : recordedAudio ? "Preview your message" : "Tap to start recording"}
                  </p>
                </div>
              </div>
              <Button onClick={handleSend} className="w-full" disabled={!form.toId || !form.subject}>
                <Send className="h-4 w-4 mr-2" />Send Voicemail
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Phone className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold font-serif">{messages.length}</p>
            <p className="text-xs text-muted-foreground">Total Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold font-serif">{unreadCount}</p>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="pt-4 text-center">
            <Mic className="h-5 w-5 mx-auto text-secondary mb-1" />
            <p className="text-2xl font-bold font-serif">{messages.filter((m) => m.fromId === user?.id).length}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search voicemail..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {myMessages.map((m) => (
          <Card key={m.id} className={`transition-shadow hover:shadow-sm ${!m.isRead && m.toId === user?.id ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0" onClick={() => handleMarkRead(m.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{m.subject}</p>
                    {!m.isRead && m.toId === user?.id && <Badge className="text-[10px] h-4">New</Badge>}
                    {m.isTaskRelated && <Badge variant="outline" className="text-[10px]">Task</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{m.fromId === user?.id ? `To: ${m.toName}` : `From: ${m.fromName}`}</span>
                    <span>•</span>
                    <span>{formatTimestamp(m.createdAt)}</span>
                    {m.duration > 0 && <><span>•</span><span>{formatTime(m.duration)}</span></>}
                  </div>
                  {m.audioUrl && <audio controls src={m.audioUrl} className="mt-2 h-7 w-full max-w-xs" />}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {myMessages.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No voicemail messages</CardContent></Card>
        )}
      </div>
    </div>
  );
}
