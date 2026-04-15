import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast({ title: "Welcome back!", description: result.message });
      // Redirect based on role - get from localStorage since state may not have updated yet
      const stored = localStorage.getItem("dentaclinic_current_user");
      if (stored) {
        const user = JSON.parse(stored);
        const prefix = user.role === "receptionist" ? "reception" : user.role;
        navigate(`/${prefix}/dashboard`, { replace: true });
      }
    } else {
      toast({ title: "Login failed", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">D</span>
            </div>
            <h1 className="text-3xl font-serif text-foreground">DentaClinic</h1>
          </div>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-sans">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@dentaclinic.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
            </div>

            <div className="mt-6 border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Demo Accounts:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded border p-2">
                  <p className="font-medium text-foreground">Admin</p>
                  <p>admin@dentaclinic.com</p>
                  <p>admin123</p>
                </div>
                <div className="rounded border p-2">
                  <p className="font-medium text-foreground">Dentist</p>
                  <p>michael@dentaclinic.com</p>
                  <p>dentist123</p>
                </div>
                <div className="rounded border p-2">
                  <p className="font-medium text-foreground">Receptionist</p>
                  <p>emily@dentaclinic.com</p>
                  <p>reception123</p>
                </div>
                <div className="rounded border p-2">
                  <p className="font-medium text-foreground">Staff</p>
                  <p>james@dentaclinic.com</p>
                  <p>staff123</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
