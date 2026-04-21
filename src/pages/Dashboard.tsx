import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";

const stats = [
  { label: "Today's Revenue", value: "₹0", icon: DollarSign, change: "0%" },
  { label: "Appointments", value: "0", icon: CalendarDays, change: "0 remaining" },
  { label: "New Patients", value: "0", icon: Users, change: "0 this week" },
  { label: "Collection Rate", value: "0%", icon: TrendingUp, change: "0% vs last month" },
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
              {[].map((apt: any) => (
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
              {[].length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">No appointments scheduled.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-sans">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[].map((item: any, i) => (
                <div key={i} className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              ))}
              {[].length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">No recent activity.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
