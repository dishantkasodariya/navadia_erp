import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";

const stats = [
  { label: "Today's Revenue", value: "₹45,200", icon: DollarSign, change: "+12%" },
  { label: "Appointments", value: "18", icon: CalendarDays, change: "3 remaining" },
  { label: "New Patients", value: "4", icon: Users, change: "+2 this week" },
  { label: "Collection Rate", value: "87%", icon: TrendingUp, change: "+3% vs last month" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back. Here's what's happening today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-sans text-muted-foreground">
                {stat.label}
              </CardTitle>
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
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-sans">Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { time: "09:00", patient: "Sarah Johnson", procedure: "Root Canal", status: "In Chair" },
                { time: "10:30", patient: "Mike Chen", procedure: "Checkup", status: "Confirmed" },
                { time: "11:00", patient: "Emily Davis", procedure: "Crown Fitting", status: "Scheduled" },
                { time: "14:00", patient: "Raj Patel", procedure: "Extraction", status: "Confirmed" },
              ].map((apt) => (
                <div key={apt.time} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground w-12">{apt.time}</span>
                    <div>
                      <p className="text-sm font-medium">{apt.patient}</p>
                      <p className="text-xs text-muted-foreground">{apt.procedure}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    apt.status === "In Chair"
                      ? "bg-secondary/15 text-secondary"
                      : apt.status === "Confirmed"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-sans">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "Payment received", detail: "Sarah Johnson — ₹3,500", time: "2 min ago" },
                { action: "New patient registered", detail: "Priya Sharma — PT-2025-0148", time: "15 min ago" },
                { action: "Appointment cancelled", detail: "John Lee — No show", time: "1 hr ago" },
                { action: "Prescription sent", detail: "Dr. Sofia — Mike Chen", time: "2 hrs ago" },
              ].map((item, i) => (
                <div key={i} className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
