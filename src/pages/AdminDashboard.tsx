import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, CalendarDays, Users, TrendingUp, UserCog, Stethoscope, Megaphone, Mic, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";

const stats = [
  { label: "Today's Revenue", value: "₹0", icon: DollarSign, change: "0%" },
  { label: "Appointments", value: "0", icon: CalendarDays, change: "0 remaining" },
  { label: "New Patients", value: "0", icon: Users, change: "0 this week" },
  { label: "Collection Rate", value: "0%", icon: TrendingUp, change: "0% vs last month" },
];

export default function AdminDashboard() {
  const { user, allUsers } = useAuth();
  const { sendBroadcast } = useChat();
  const { toast } = useToast();
  const dentists = allUsers.filter((u) => u.role === "dentist");
  const staffCount = allUsers.filter((u) => u.role !== "admin").length;
  
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

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
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleBroadcast = () => {
    if (!broadcastText.trim() && !voiceNote) return;
    sendBroadcast(broadcastText, voiceNote || undefined);
    setBroadcastText("");
    setVoiceNote(null);
    setBroadcastOpen(false);
    toast({ title: "Broadcast Sent", description: "Message sent to all staff." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {user?.name}. Full system overview.
          </p>
        </div>
        <Dialog open={broadcastOpen} onOpenChange={(o) => { setBroadcastOpen(o); if (!o) setVoiceNote(null); }}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2">
              <Megaphone className="h-4 w-4" /> Broadcast Options
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Broadcast</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input 
                placeholder="Type your message to everyone..." 
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
              />
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <Button variant="outline" size="sm" onClick={startRecording}>
                    <Mic className="h-4 w-4 mr-1" /> Record Voice Note
                  </Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={stopRecording}>
                    <Square className="h-4 w-4 mr-1" /> Stop Recording
                  </Button>
                )}
                {voiceNote && <audio src={voiceNote} controls className="h-8 flex-1" />}
              </div>
              <Button onClick={handleBroadcast} className="w-full" disabled={!broadcastText && !voiceNote}>
                Send to All Staff
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-sans text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-serif">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans flex items-center gap-2">
              <Stethoscope className="h-4 w-4" /> Dentists On Duty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dentists.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.specialization || "General"}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary/15 text-secondary">Active</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Staff Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { role: "Dentists", count: allUsers.filter((u) => u.role === "dentist").length },
                { role: "Receptionists", count: allUsers.filter((u) => u.role === "receptionist").length },
                { role: "Staff", count: allUsers.filter((u) => u.role === "staff").length },
              ].map((item) => (
                <div key={item.role} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{item.role}</span>
                  <span className="text-lg font-serif font-bold">{item.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-primary/5">
                <span className="text-sm font-medium">Total Staff</span>
                <span className="text-lg font-serif font-bold text-primary">{staffCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-sans">Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[].map((apt: any) => (
                <div key={apt.time} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-12">{apt.time}</span>
                    <div>
                      <p className="text-sm font-medium">{apt.patient}</p>
                      <p className="text-xs text-muted-foreground">{apt.procedure} — {apt.dentist}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    apt.status === "In Chair" ? "bg-secondary/15 text-secondary"
                    : apt.status === "Confirmed" ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                  }`}>{apt.status}</span>
                </div>
              ))}
              {[].length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">No appointments scheduled for today.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
