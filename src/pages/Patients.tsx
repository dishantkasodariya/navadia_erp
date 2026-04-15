import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Trash2, Edit2, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  mrn: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  lastVisit: string;
  status: "Active" | "Inactive";
  balance: string;
}

const initialPatients: Patient[] = [
  { id: "1", mrn: "PT-2025-0847", name: "Sarah Johnson", phone: "+1 (555) 123-4567", email: "sarah@email.com", dob: "1990-03-15", gender: "Female", bloodGroup: "A+", lastVisit: "Oct 12, 2025", status: "Active", balance: "$570" },
  { id: "2", mrn: "PT-2025-0846", name: "Mike Chen", phone: "+1 (555) 234-5678", email: "mike@email.com", dob: "1985-07-22", gender: "Male", bloodGroup: "O+", lastVisit: "Oct 10, 2025", status: "Active", balance: "$0" },
  { id: "3", mrn: "PT-2025-0845", name: "Emily Davis", phone: "+1 (555) 345-6789", email: "emily@email.com", dob: "1992-11-08", gender: "Female", bloodGroup: "B+", lastVisit: "Sep 28, 2025", status: "Active", balance: "$200" },
  { id: "4", mrn: "PT-2025-0844", name: "Raj Patel", phone: "+1 (555) 456-7890", email: "raj@email.com", dob: "1978-01-30", gender: "Male", bloodGroup: "AB+", lastVisit: "Sep 15, 2025", status: "Inactive", balance: "$0" },
  { id: "5", mrn: "PT-2025-0843", name: "Priya Sharma", phone: "+1 (555) 567-8901", email: "priya@email.com", dob: "1995-06-14", gender: "Female", bloodGroup: "O-", lastVisit: "Oct 11, 2025", status: "Active", balance: "$150" },
];

function getStoredPatients(): Patient[] {
  const stored = localStorage.getItem("dentaclinic_patients");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("dentaclinic_patients", JSON.stringify(initialPatients));
  return initialPatients;
}

function savePatients(patients: Patient[]) {
  localStorage.setItem("dentaclinic_patients", JSON.stringify(patients));
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>(getStoredPatients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", dob: "", gender: "Male", bloodGroup: "O+", status: "Active" as "Active" | "Inactive" });
  const { toast } = useToast();

  const filtered = patients.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.mrn.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => setForm({ name: "", phone: "", email: "", dob: "", gender: "Male", bloodGroup: "O+", status: "Active" });

  const handleAdd = () => {
    if (!form.name || !form.phone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    const mrnNum = patients.length > 0 ? Math.max(...patients.map((p) => parseInt(p.mrn.split("-")[2]))) + 1 : 1;
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      mrn: `PT-2025-${String(mrnNum).padStart(4, "0")}`,
      name: form.name,
      phone: form.phone,
      email: form.email,
      dob: form.dob,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      lastVisit: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: form.status,
      balance: "$0",
    };
    const updated = [newPatient, ...patients];
    setPatients(updated);
    savePatients(updated);
    toast({ title: "Patient added", description: `${form.name} — ${newPatient.mrn}` });
    resetForm();
    setOpen(false);
  };

  const handleEdit = (p: Patient) => {
    setEditingId(p.id);
    setForm({ name: p.name, phone: p.phone, email: p.email, dob: p.dob, gender: p.gender, bloodGroup: p.bloodGroup, status: p.status });
  };

  const handleSaveEdit = (id: string) => {
    const updated = patients.map((p) => p.id === id ? { ...p, name: form.name, phone: form.phone, email: form.email, dob: form.dob, gender: form.gender, bloodGroup: form.bloodGroup, status: form.status } : p);
    setPatients(updated);
    savePatients(updated);
    setEditingId(null);
    resetForm();
    toast({ title: "Patient updated" });
  };

  const handleDelete = (id: string, name: string) => {
    const updated = patients.filter((p) => p.id !== id);
    setPatients(updated);
    savePatients(updated);
    toast({ title: "Patient removed", description: name });
  };

  const handleExport = () => {
    const csv = ["MRN,Name,Phone,Email,DOB,Gender,Blood Group,Last Visit,Status,Balance", ...patients.map((p) => `${p.mrn},${p.name},${p.phone},${p.email},${p.dob},${p.gender},${p.bloodGroup},${p.lastVisit},${p.status},${p.balance}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "patients.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Patients exported to CSV" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage patient records and profiles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Patient</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register New Patient</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name *</Label><Input placeholder="Sarah Johnson" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone *</Label><Input placeholder="+1 555-0100" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="sarah@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Blood Group</Label>
                    <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "Active" | "Inactive" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full">Register Patient</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, MRN, or phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MRN</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No patients found</TableCell></TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.mrn}</TableCell>
                    <TableCell className="font-medium">
                      {editingId === p.id ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8" /> : p.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {editingId === p.id ? <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8" /> : p.phone}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.lastVisit}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "Active" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {p.balance !== "$0" ? <span className="text-accent">{p.balance}</span> : <span className="text-muted-foreground">{p.balance}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === p.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveEdit(p.id)}><Check className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(null); resetForm(); }}><X className="h-3 w-3" /></Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}><Edit2 className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id, p.name)}><Trash2 className="h-3 w-3" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
