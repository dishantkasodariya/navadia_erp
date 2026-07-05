import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  const { sendBroadcast, sendMessage } = useChat();
  const { toast } = useToast();
  const navigate = useNavigate();
  const dentists = allUsers.filter((u) => u.role.toLowerCase() === "dentist");
  const staffCount = allUsers.filter((u) => u.role.toLowerCase() !== "admin").length;
  
  const [appointmentsCount, setAppointmentsCount] = useState<number>(0);
  const [patientsCount, setPatientsCount] = useState<number>(0);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);

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

      // Fetch today's attendance
      const attRes = await fetch(`${API_BASE_URL}/api/attendance?date=${todayDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (attRes.ok) {
        const atts = await attRes.json();
        setTodayAttendance(atts);
      }
    } catch (e) {
      console.warn("Error fetching dashboard statistics:", e);
      // Fallback to local storage cached attendance
      const cached = localStorage.getItem("navadia_attendance");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const todayStr = new Date().toISOString().split("T")[0];
            const todayAtts = parsed.filter((r: any) => r.date === todayStr);
            setTodayAttendance(todayAtts);
          }
        } catch (err) {
          console.error("Failed to parse cached attendance", err);
        }
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const handleSync = () => {
      fetchStats();
    };
    window.addEventListener('attendance-synced', handleSync);
    return () => window.removeEventListener('attendance-synced', handleSync);
  }, []);


  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
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
    if (broadcastTarget === "all") {
      sendBroadcast(broadcastText, voiceNote || undefined);
      toast({ title: "Broadcast Sent", description: "Message sent to all staff and dentists." });
    } else if (broadcastTarget.startsWith("broadcast_")) {
      const roleName = broadcastTarget.replace("broadcast_", "");
      const displayName = roleName === "dentist" ? "Dentists" : "Support Staff";
      sendMessage(broadcastTarget, broadcastText, voiceNote || undefined);
      toast({ title: "Broadcast Sent", description: `Message sent to all ${displayName}.` });
    } else {
      const targetUser = allUsers.find(u => u.id === broadcastTarget);
      sendMessage(broadcastTarget, broadcastText, voiceNote || undefined);
      toast({ title: "Message Sent", description: `Message sent to ${targetUser?.name || 'employee'}.` });
    }
    setBroadcastText("");
    setVoiceNote(null);
    setBroadcastTarget("all");
    setBroadcastOpen(false);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Welcome back, {user?.name}. Full clinic administration overview.
          </p>
        </div>
        <Dialog open={broadcastOpen} onOpenChange={(o) => { setBroadcastOpen(o); if (!o) { setVoiceNote(null); setBroadcastTarget("all"); } }}>
          <DialogTrigger asChild>
            <Button variant="default" className="gap-2">
              <Megaphone className="h-4 w-4" /> Send Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:w-full sm:max-w-[480px] sm:p-6">
            <DialogHeader>
              <DialogTitle>Send Broadcast / Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff & Dentists (Broadcast)</SelectItem>
                    <SelectItem value="broadcast_dentist">All Dentists (Broadcast)</SelectItem>
                    <SelectItem value="broadcast_staff">All Support Staff (Broadcast)</SelectItem>
                    {allUsers.filter((u) => u.role.toLowerCase() !== "admin").map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Input 
                  placeholder={
                    broadcastTarget === "all" 
                      ? "Type your message to everyone..." 
                      : broadcastTarget === "broadcast_dentist"
                      ? "Type your message to all dentists..."
                      : broadcastTarget === "broadcast_staff"
                      ? "Type your message to all support staff..."
                      : `Type your message to ${allUsers.find(u => u.id === broadcastTarget)?.name || 'employee'}...`
                  } 
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Voice Note (Optional)</Label>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  {!isRecording ? (
                    <Button variant="outline" size="sm" onClick={startRecording}>
                      <Mic className="h-4 w-4 mr-1.5" /> Record
                    </Button>
                  ) : (
                    <Button variant="destructive" size="sm" onClick={stopRecording} className="animate-pulse">
                      <Square className="h-4 w-4 mr-1.5" /> Stop
                    </Button>
                  )}
                  {voiceNote && <audio src={voiceNote} controls className="h-8 flex-1 max-w-[200px]" />}
                  <span className="text-xs text-muted-foreground">{isRecording ? "Recording..." : voiceNote ? "Voice note captured" : "No recording"}</span>
                </div>
              </div>

              <Button onClick={handleBroadcast} className="w-full bg-[#e7b008] hover:bg-[#c59606] text-white" disabled={!broadcastText.trim() && !voiceNote}>
                {broadcastTarget === "all" 
                  ? "Send to All Staff & Dentists" 
                  : broadcastTarget === "broadcast_dentist"
                  ? "Send to All Dentists"
                  : broadcastTarget === "broadcast_staff"
                  ? "Send to All Support Staff"
                  : `Send to ${allUsers.find(u => u.id === broadcastTarget)?.name || 'Employee'}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>


      {/* Module Navigation Portal */}
      <div>
        <h2 className="text-lg sm:text-lg mb-3 font-serif text-foreground">Quick Administration Hub</h2>
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
              <Users className="h-5 w-5 text-primary" /> Dentists & Staff On Duty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {(() => {
                const onDutyPersonnel = todayAttendance
                  .map((a: any) => {
                    const userId = a.userId || a.staffId;
                    const userName = a.userName || a.staffName;
                    const checkIn = a.checkIn || null;
                    const checkOut = a.checkOut || null;
                    const rawStatus = a.status || "Present";
                    
                    const matchedUser = allUsers.find(u => u.id === userId);
                    const role = matchedUser?.role || "Staff";
                    const specialization = matchedUser?.specialization || (role === "Dentist" ? "General Dentistry" : role);
                    
                    let displayStatus = "On Duty";
                    let statusColorClass = "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
                    
                    const lowerStatus = rawStatus.toLowerCase();
                    if (lowerStatus === "absent") {
                      displayStatus = "Absent";
                      statusColorClass = "bg-destructive/15 text-destructive border border-destructive/20";
                    } else if (lowerStatus === "on break" || lowerStatus === "on-break" || lowerStatus === "stepped_out") {
                      displayStatus = "On Break";
                      statusColorClass = "bg-amber-500/15 text-amber-600 border border-amber-500/20";
                    } else if (checkOut) {
                      displayStatus = "Checked Out";
                      statusColorClass = "bg-muted text-muted-foreground border border-muted/20";
                    } else if (lowerStatus === "late") {
                      displayStatus = "Late";
                      statusColorClass = "bg-accent/15 text-accent border border-accent/20";
                    }

                    return {
                      userId,
                      userName,
                      role,
                      specialization,
                      checkIn,
                      checkOut,
                      status: displayStatus,
                      statusColorClass,
                      rawStatus: lowerStatus
                    };
                  })
                  .filter((p) => p.checkIn && p.rawStatus !== "absent" && p.role.toLowerCase() !== "admin");

                if (onDutyPersonnel.length === 0) {
                  return (
                    <p className="text-center text-muted-foreground text-sm py-8 font-sans">
                      No dentists or staff checked in today.
                    </p>
                  );
                }

                return onDutyPersonnel.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/10 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-md font-semibold text-foreground">{p.userName}</p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground capitalize border border-muted-foreground/10 font-sans">
                          {p.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.specialization}
                        {p.checkIn && ` • In: ${p.checkIn}`}
                        {p.checkOut && ` • Out: ${p.checkOut}`}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${p.statusColorClass}`}>
                      {p.status}
                    </span>
                  </div>
                ));
              })()}
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
