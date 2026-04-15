import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CalendarDays, Users, TrendingUp, UserCog, Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { label: "Today's Revenue", value: "₹45,200", icon: DollarSign, change: "+12%" },
  { label: "Appointments", value: "18", icon: CalendarDays, change: "3 remaining" },
  { label: "New Patients", value: "4", icon: Users, change: "+2 this week" },
  { label: "Collection Rate", value: "87%", icon: TrendingUp, change: "+3% vs last month" },
];

export default function AdminDashboard() {
  const { user, allUsers } = useAuth();
  const dentists = allUsers.filter((u) => u.role === "dentist");
  const staffCount = allUsers.filter((u) => u.role !== "admin").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {user?.name}. Full system overview.
        </p>
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
              {[
                { time: "09:00", patient: "Sarah Johnson", procedure: "Root Canal", dentist: "Dr. Michael", status: "In Chair" },
                { time: "10:30", patient: "Mike Chen", procedure: "Checkup", dentist: "Dr. Sofia", status: "Confirmed" },
                { time: "11:00", patient: "Emily Davis", procedure: "Crown Fitting", dentist: "Dr. Michael", status: "Scheduled" },
                { time: "14:00", patient: "Raj Patel", procedure: "Extraction", dentist: "Dr. Pratt", status: "Confirmed" },
              ].map((apt) => (
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
