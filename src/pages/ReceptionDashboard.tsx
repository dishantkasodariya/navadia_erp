import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Phone, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ReceptionDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif">Reception Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome, {user?.name}. Manage appointments and check-ins.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Today's Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">0</div>
            <p className="text-xs text-muted-foreground mt-1">0 checked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Waiting Room</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">0</div>
            <p className="text-xs text-muted-foreground mt-1">Avg wait: —</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Calls Pending</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">0</div>
            <p className="text-xs text-muted-foreground mt-1">Reminders & follow-ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Next Check-in</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">—</div>
            <p className="text-xs text-muted-foreground mt-1">No upcoming</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans">Upcoming Check-ins</CardTitle>
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
                  apt.status === "Arrived" ? "bg-secondary/15 text-secondary"
                  : apt.status === "En Route" ? "bg-accent/15 text-accent"
                  : "bg-primary/10 text-primary"
                }`}>{apt.status}</span>
              </div>
            ))}
            {[].length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">No upcoming check-ins.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
