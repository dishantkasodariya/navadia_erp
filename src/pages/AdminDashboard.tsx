import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  DollarSign, 
  CalendarDays, 
  Users, 
  TrendingUp, 
  UserCog, 
  Stethoscope, 
  Megaphone, 
  Mic, 
  Square,
  Clock,
  CalendarOff,
  Settings,
  CheckSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";

export default function AdminDashboard() {
  const { user, allUsers } = useAuth();
  const { sendBroadcast } = useChat();
  const { toast } = useToast();
  const navigate = useNavigate();
  const dentists = allUsers.filter((u) => u.role.toLowerCase() === "dentist");
  const staffCount = allUsers.filter((u) => u.role.toLowerCase() !== "admin").length;
  
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [patientsCount, setPatientsCount] = useState<number>(0);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("navadia_token");
      if (!token) return;
      try {
        const todayDate = new Date().toISOString().split("T")[0];
        
        // Fetch appointments count
        const aptRes = await fetch(`${API_BASE_URL}/api/appointments?date=${todayDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (aptRes.ok) {
          const apts = await aptRes.json();
          setAppointmentsCount(apts.length);
        }

        // Fetch patients count
        const patRes = await fetch(`${API_BASE_URL}/api/patients`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (patRes.ok) {
          const pats = await patRes.json();
          setPatientsCount(pats.length);
        }
      } catch (e) {
        console.warn("Error fetching dashboard statistics:", e);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { label: "Today's Revenue", value: "₹24,500", icon: DollarSign, change: "+12% vs yesterday" },
    { label: "Appointments Today", value: String(appointmentsCount), icon: CalendarDays, change: "Updated live" },
    { label: "New Patients", value: String(patientsCount), icon: Users, change: "Total registered" },
    { label: "Collection Rate", value: "94%", icon: TrendingUp, change: "+2% vs last month" },
  ];

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

  const adminModules = [
    { 
      title: "Employee Management", 
      description: "Add Dentists & Staff members, manage roles.", 
      icon: UserCog, 
      color: "text-primary bg-primary/10",
      path: "/admin/staff" 
    },
    { 
      title: "Attendance Management", 
      description: "Monitor check-in times and daily hours.", 
      icon: Clock, 
      color: "text-secondary bg-secondary/10",
      path: "/admin/attendance" 
    },
    { 
      title: "Assign Tasks", 
      description: "Assign dental duties with optional voice notes.", 
      icon: CheckSquare, 
      color: "text-primary bg-primary/10",
      path: "/admin/tasks" 
    },
    { 
      title: "Leave Management", 
      description: "Review and approve/decline leave requests.", 
      icon: CalendarOff, 
      color: "text-secondary bg-secondary/10",
      path: "/admin/leave-requests" 
    },
    { 
      title: "Send Voicemail", 
      description: "Record internal voice notes for team members.", 
      icon: Mic, 
      color: "text-primary bg-primary/10",
      path: "/admin/voicemail" 
    },
    { 
      title: "Clinic Settings", 
      description: "Configure clinic info, contact, working hours.", 
      icon: Settings, 
      color: "text-secondary bg-secondary/10",
      path: "/admin/settings" 
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Welcome back, {user?.name}. Full clinic administration overview.
          </p>
        </div>
        <Dialog open={broadcastOpen} onOpenChange={(o) => { setBroadcastOpen(o); if (!o) setVoiceNote(null); }}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2">
              <Megaphone className="h-4 w-4" /> Send Broadcast
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

      {/* Stats Cards Section */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="bg-card border border-border/50 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 sm:p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold font-sans">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-emerald-500 font-medium">{stat.change}</p>
              </div>
              <div className="p-2 sm:p-3 bg-primary/10 text-primary rounded-xl">
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Navigation Portal */}
      <div>
        <h2 className="text-lg sm:text-lg mb-3">Quick Administration Hub</h2>
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          {adminModules.map((mod) => (
            <Card 
              key={mod.title} 
              className="group hover:border-primary/40 hover:shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => navigate(mod.path)}
            >
              <CardContent className="p-5 flex gap-4">
                <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg shrink-0 ${mod.color}`}>
                  <mod.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-medium group-hover:text-primary transition-colors">{mod.title}</h3>
                  <p className="text-sm sm:text-md text-muted-foreground leading-normal">{mod.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Duty and Schedule Status */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" /> Dentists On Duty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dentists.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/10 transition-colors">
                  <div>
                    <p className="text-md font-medium">{d.name}</p>
                    <p className="text-sm text-muted-foreground">{d.specialization || "General Dentistry"}</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">On Duty</span>
                </div>
              ))}
              {dentists.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No dentists registered.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <UserCog className="h-5 w-5 text-secondary" /> Staff Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { role: "Dentists", count: dentists.length },
                { role: "Receptionists", count: allUsers.filter((u) => u.role.toLowerCase() === "receptionist").length },
                { role: "Support Staff", count: allUsers.filter((u) => u.role.toLowerCase() === "staff").length },
              ].map((item) => (
                <div key={item.role} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-base font-medium">{item.role}</span>
                  <span className="text-2xl font-bold">{item.count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-primary border-primary/20">
                <span className="text-base font-medium text-primary-foreground">Total Active Personnel</span>
                <span className="text-2xl font-bold text-primary-foreground">{staffCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
