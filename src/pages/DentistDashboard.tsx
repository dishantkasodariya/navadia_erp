import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Clock, Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function DentistDashboard() {
  const { user } = useAuth();

  const myAppointments = [
    { time: "09:00", patient: "Sarah Johnson", procedure: "Root Canal", status: "In Chair" },
    { time: "10:30", patient: "Emily Davis", procedure: "Crown Fitting", status: "Scheduled" },
    { time: "14:00", patient: "Raj Patel", procedure: "Extraction", status: "Confirmed" },
    { time: "15:30", patient: "Priya Sharma", procedure: "Teeth Whitening", status: "Scheduled" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif">Dentist Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome, {user?.name}. Here are your appointments for today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">My Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">{myAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Patients Seen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">1</div>
            <p className="text-xs text-muted-foreground mt-1">3 remaining</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Next Appointment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif">10:30</div>
            <p className="text-xs text-muted-foreground mt-1">Emily Davis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Specialization</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-serif">{user?.specialization || "General"}</div>
            <p className="text-xs text-muted-foreground mt-1">{user?.licenseNo || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans">My Schedule Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myAppointments.map((apt) => (
              <div key={apt.time} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground w-12">{apt.time}</span>
                  <div>
                    <p className="text-sm font-medium">{apt.patient}</p>
                    <p className="text-xs text-muted-foreground">{apt.procedure}</p>
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
  );
}
