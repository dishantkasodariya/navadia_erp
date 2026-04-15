import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, Edit2, Mic, Square, Play } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  dueDate: string;
  createdAt: string;
  voiceNote?: string; // base64 audio data URL
}

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

const INITIAL_TASKS: Task[] = [
  { id: "1", title: "Sterilize instruments for Room 2", description: "Complete sterilization cycle for afternoon procedures", assignedTo: "5", assignedToName: "James Wilson", assignedBy: "2", assignedByName: "Dr. Michael Ross", priority: "high", status: "pending", dueDate: today, createdAt: today },
  { id: "2", title: "Prepare patient files for tomorrow", description: "Print and organize files for scheduled patients", assignedTo: "4", assignedToName: "Emily Carter", assignedBy: "2", assignedByName: "Dr. Michael Ross", priority: "medium", status: "in-progress", dueDate: today, createdAt: today },
  { id: "3", title: "Order dental supplies", description: "Restock composite resin and bonding agent", assignedTo: "5", assignedToName: "James Wilson", assignedBy: "3", assignedByName: "Dr. Sofia Patel", priority: "low", status: "completed", dueDate: tomorrow, createdAt: today },
];

export default function Tasks() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", priority: "medium" as Task["priority"], dueDate: today });

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const staffOptions = allUsers.filter((u) => u.role !== "admin");
  const canAssign = user?.role === "dentist" || user?.role === "admin";

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.assignedToName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    // Staff/receptionist only see their own tasks
    if (user?.role === "staff" || user?.role === "receptionist") {
      return matchSearch && matchStatus && matchPriority && t.assignedTo === user.id;
    }
    return matchSearch && matchStatus && matchPriority;
  });

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
      setAudioChunks(chunks);
      setIsRecording(true);
      toast({ title: "Recording started", description: "Speak your task instructions..." });
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleAdd = () => {
    const staff = allUsers.find((u) => u.id === form.assignedTo);
    if (!staff || !form.title) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: form.title,
      description: form.description,
      assignedTo: staff.id,
      assignedToName: staff.name,
      assignedBy: user!.id,
      assignedByName: user!.name,
      priority: form.priority,
      status: "pending",
      dueDate: form.dueDate,
      createdAt: today,
      voiceNote: voiceNote || undefined,
    };
    setTasks((prev) => [newTask, ...prev]);
    setDialogOpen(false);
    setForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: today });
    setVoiceNote(null);
    toast({ title: "Task Created" });
  };

  const handleStatusChange = (id: string, status: Task["status"]) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    toast({ title: `Task marked as ${status}` });
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Task Deleted", variant: "destructive" });
  };

  const handleUpdate = () => {
    if (!editTask) return;
    setTasks((prev) => prev.map((t) => t.id === editTask.id ? editTask : t));
    setEditTask(null);
    toast({ title: "Task Updated" });
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "bg-destructive/15 text-destructive border-destructive/30";
      case "high": return "bg-accent/15 text-accent border-accent/30";
      case "medium": return "bg-primary/10 text-primary border-primary/30";
      case "low": return "bg-muted text-muted-foreground border-border";
      default: return "";
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-secondary" />;
      case "in-progress": return <Clock className="h-4 w-4 text-accent" />;
      case "cancelled": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {canAssign ? "Assign and manage staff tasks" : "View your assigned tasks"}
          </p>
        </div>
        {canAssign && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setVoiceNote(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Assign To</Label>
                    <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                      <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>
                        {staffOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                {/* Voice Note */}
                <div>
                  <Label>Voice Note (optional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {!isRecording ? (
                      <Button type="button" variant="outline" size="sm" onClick={startRecording}>
                        <Mic className="h-4 w-4 mr-1" />Record Voice
                      </Button>
                    ) : (
                      <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                        <Square className="h-4 w-4 mr-1" />Stop
                      </Button>
                    )}
                    {voiceNote && (
                      <audio controls src={voiceNote} className="h-8 flex-1" />
                    )}
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!form.title || !form.assignedTo}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold font-serif">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold font-serif text-accent">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold font-serif text-secondary">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((t) => (
          <Card key={t.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button onClick={() => handleStatusChange(t.id, t.status === "completed" ? "pending" : "completed")} className="mt-0.5 shrink-0">
                    {statusIcon(t.status)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${priorityColor(t.priority)}`}>{t.priority}</span>
                      <span className="text-[10px] text-muted-foreground">→ {t.assignedToName}</span>
                      <span className="text-[10px] text-muted-foreground">by {t.assignedByName}</span>
                      <span className="text-[10px] text-muted-foreground">Due: {t.dueDate}</span>
                      {t.voiceNote && (
                        <Badge variant="outline" className="text-[10px] gap-1"><Mic className="h-2.5 w-2.5" />Voice</Badge>
                      )}
                    </div>
                    {t.voiceNote && (
                      <audio controls src={t.voiceNote} className="mt-2 h-7 w-full max-w-xs" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Select value={t.status} onValueChange={(v: any) => handleStatusChange(t.id, v)}>
                    <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {canAssign && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTask(t)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No tasks found</CardContent></Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (
            <div className="space-y-4 mt-2">
              <div><Label>Title</Label><Input value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editTask.description} onChange={(e) => setEditTask({ ...editTask, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={editTask.priority} onValueChange={(v: any) => setEditTask({ ...editTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={editTask.dueDate} onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleUpdate} className="w-full">Update Task</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
