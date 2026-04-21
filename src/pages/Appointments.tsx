import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  time: string;
  duration: number;
  patient: string;
  procedure: string;
  dentist: string;
  status: string;
  chair: number;
}

const initialAppointments: Appointment[] = [];

const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00"];

const statusColors: Record<string, string> = {
  inChair: "bg-secondary/15 text-secondary border-secondary/30",
  confirmed: "bg-primary/10 text-primary border-primary/30",
  scheduled: "bg-muted text-muted-foreground border-border",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  inChair: "In Chair",
  confirmed: "Confirmed",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

function getStoredAppointments(): Appointment[] {
  const stored = localStorage.getItem("navadia_appointments");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("navadia_appointments", JSON.stringify(initialAppointments));
  return initialAppointments;
}

function saveAppointments(appointments: Appointment[]) {
  localStorage.setItem("navadia_appointments", JSON.stringify(appointments));
}

export default function Appointments() {
  const { user, allUsers } = useAuth();
  const dentists = allUsers.filter(u => u.role === "dentist");
  const [appointments, setAppointments] = useState<Appointment[]>(getStoredAppointments);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({ patient: "", procedure: "", dentist: dentists[0]?.name || "", time: "09:00", chair: "1", status: "scheduled" });
  const { toast } = useToast();

  const handleAdd = () => {
    if (!form.patient || !form.procedure) {
      toast({ title: "Error", description: "Patient and procedure are required", variant: "destructive" });
      return;
    }
    // Check for conflicts
    const conflict = appointments.find((a) => a.time === form.time && a.chair === parseInt(form.chair) && a.status !== "cancelled");
    if (conflict) {
      toast({ title: "Conflict", description: `Chair ${form.chair} is occupied at ${form.time}`, variant: "destructive" });
      return;
    }
    const newApt: Appointment = {
      id: crypto.randomUUID(),
      time: form.time,
      duration: 1,
      patient: form.patient,
      procedure: form.procedure,
      dentist: form.dentist,
      status: form.status,
      chair: parseInt(form.chair),
    };
    const updated = [...appointments, newApt];
    setAppointments(updated);
    saveAppointments(updated);
    toast({ title: "Appointment added", description: `${form.patient} at ${form.time}` });
    setForm({ patient: "", procedure: "", dentist: dentists[0]?.name || "", time: "09:00", chair: "1", status: "scheduled" });
    setOpen(false);
  };

  const updateStatus = (id: string, newStatus: string) => {
    const updated = appointments.map((a) => a.id === id ? { ...a, status: newStatus } : a);
    setAppointments(updated);
    saveAppointments(updated);
    toast({ title: "Status updated", description: statusLabels[newStatus] });
  };

  const deleteAppointment = (id: string) => {
    const updated = appointments.filter((a) => a.id !== id);
    setAppointments(updated);
    saveAppointments(updated);
    toast({ title: "Appointment deleted" });
  };

  const changeDate = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const displayDate = new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">{displayDate} — Day View</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date().toISOString().split("T")[0])}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => changeDate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Appointment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2"><Label>Patient Name *</Label><Input placeholder="Patient Name" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} /></div>
                <div className="space-y-2"><Label>Procedure *</Label><Input placeholder="e.g. Root Canal" value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dentist</Label>
                    <Select value={form.dentist} onValueChange={(v) => setForm({ ...form, dentist: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Dentist" /></SelectTrigger>
                      <SelectContent>
                        {dentists.map((d) => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Select value={form.time} onValueChange={(v) => setForm({ ...form, time: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chair</Label>
                    <Select value={form.chair} onValueChange={(v) => setForm({ ...form, chair: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Chair 1</SelectItem><SelectItem value="2">Chair 2</SelectItem><SelectItem value="3">Chair 3</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full">Schedule Appointment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-4 text-sm">
            {["Chair 1", "Chair 2", "Chair 3"].map((chair) => (
              <Badge key={chair} variant="outline" className="font-normal">{chair}</Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[60px_1fr_1fr_1fr] gap-px bg-border rounded-lg overflow-hidden">
            <div className="bg-muted p-2 text-xs font-medium text-muted-foreground">Time</div>
            {["Chair 1", "Chair 2", "Chair 3"].map((c) => (
              <div key={c} className="bg-muted p-2 text-xs font-medium text-center text-muted-foreground">{c}</div>
            ))}
            {timeSlots.map((slot) => {
              const slotApts = [1, 2, 3].map((chair) => appointments.find((a) => a.time === slot && a.chair === chair && a.status !== "cancelled"));
              return (
                <React.Fragment key={slot}>
                  <div className="bg-card p-2 text-xs text-muted-foreground font-mono border-t">{slot}</div>
                  {slotApts.map((apt, i) => (
                    <div key={`${slot}-${i}`} className="bg-card p-1 border-t min-h-[40px]">
                      {apt && (
                        <div className={`rounded-md border p-2 text-xs cursor-pointer hover:shadow-sm transition-shadow ${statusColors[apt.status]}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{apt.patient}</p>
                              <p className="opacity-75">{apt.procedure}</p>
                            </div>
                            <div className="flex gap-0.5">
                              <Select value={apt.status} onValueChange={(v) => updateStatus(apt.id, v)}>
                                <SelectTrigger className="h-5 w-5 p-0 border-0 bg-transparent [&>svg]:h-3 [&>svg]:w-3">
                                  <span className="sr-only">Status</span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="inChair">In Chair</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <button onClick={() => deleteAppointment(apt.id)} className="opacity-50 hover:opacity-100">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
