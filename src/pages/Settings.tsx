import { useState, useEffect } from "react";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Building2, User, Mail, Phone, MapPin, Clock, Save, Lock, ShieldCheck } from "lucide-react";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role.toLowerCase() === "admin";

  // Clinic Settings state
  const [clinicName, setClinicName] = useState("Navadia Dental Clinic");
  const [clinicEmail, setClinicEmail] = useState("contact@navadia.com");
  const [clinicPhone, setClinicPhone] = useState("+91 98765 43210");
  const [clinicAddress, setClinicAddress] = useState("101, Medical Plaza, Surat, Gujarat");
  const [clinicHours, setClinicHours] = useState("09:00 AM - 08:00 PM");

  // Profile Settings state
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");

  // Security Settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Loading states
  const [clinicLoading, setClinicLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Sync state when user profile is updated in AuthContext
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
      setProfilePhone(user.phone || "");
    }
  }, [user]);

  // Sync with MongoDB settings
  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("navadia_token");
      try {
        const res = await fetch("${API_BASE_URL}/api/settings", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setClinicName(data.clinicName || "Navadia Dental Clinic");
          setClinicEmail(data.email || "contact@navadia.com");
          setClinicPhone(data.phone || "+91 98765 43210");
          setClinicAddress(data.address || "101, Medical Plaza, Surat, Gujarat");
          setClinicHours(data.workingHours || "09:00 AM - 08:00 PM");
        }
      } catch (e) {
        console.warn("Backend offline, settings loaded from defaults:", e);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveClinicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setClinicLoading(true);
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            clinicName,
            email: clinicEmail,
            phone: clinicPhone,
            address: clinicAddress,
            workingHours: clinicHours
          })
        });
        if (res.ok) {
          toast({ title: "Settings Saved", description: "Clinic configuration updated successfully." });
          setClinicLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Backend offline, updating local mock state:", e);
      }
    }
    
    // Fallback save representation
    setTimeout(() => {
      setClinicLoading(false);
      toast({ title: "Settings Saved", description: "Clinic configuration updated successfully (local)." });
    }, 800);
  };

  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    const token = localStorage.getItem("navadia_token");
    try {
      const res = await fetch("${API_BASE_URL}/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh token & update context
        if (data.token) localStorage.setItem("navadia_token", data.token);
        updateUser({ name: data.name, phone: data.phone });
        toast({ title: "Profile Updated ✓", description: "Your profile has been successfully saved." });
      } else {
        toast({ title: "Update Failed", description: data.message || "Could not update profile.", variant: "destructive" });
      }
    } catch (e) {
      console.warn("Backend offline, updating locally:", e);
      // Fallback: update local state only
      updateUser({ name: profileName, phone: profilePhone });
      toast({ title: "Profile Updated", description: "Saved locally (backend offline)." });
    }
    setProfileLoading(false);
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast({ title: "Error", description: "Please enter a new password.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setSecurityLoading(true);
    const token = localStorage.getItem("navadia_token");
    if (!token) {
      toast({ title: "Error", description: "You are not logged in. Please log in again.", variant: "destructive" });
      setSecurityLoading(false);
      return;
    }
    try {
      const res = await fetch("${API_BASE_URL}/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Refresh the token in localStorage so next login uses new password
        if (data.token) {
          localStorage.setItem("navadia_token", data.token);
        }
        toast({ title: "Password Updated ✓", description: "Your password has been updated. Use it on next login." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        toast({ title: "Update Failed", description: data.message || "Unable to update password.", variant: "destructive" });
      }
    } catch (e) {
      console.error("Password update error:", e);
      toast({ title: "Error", description: "Server unreachable. Please check your connection.", variant: "destructive" });
    }
    setSecurityLoading(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {isAdmin ? "Manage clinical credentials, configurations, and personal profile settings" : "Manage your personal profile and account settings"}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:gap-4 md:grid-cols-3">
        {/* User Card */}
        <Card className="md:col-span-1 h-fit shadow-sm md:sticky md:top-6">
          <CardHeader className="text-center pb-3 sm:pb-4 md:pb-3">
            <div className="mx-auto h-16 sm:h-20 md:h-16 w-16 sm:w-20 md:w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg sm:text-2xl md:text-lg font-bold font-serif mb-2">
              {user?.name ? user.name[0] : "?"}
            </div>
            <CardTitle className="text-sm sm:text-lg md:text-sm">{user?.name}</CardTitle>
            <CardDescription className="capitalize font-medium text-primary">
              <Badge variant="outline" className="mt-1 text-xs md:text-[10px]">
                {user?.role}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 md:space-y-2 text-[10px] sm:text-sm md:text-[9px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 sm:h-4 md:h-3" />
              <span className="break-all">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 sm:h-4 md:h-3" />
                <span>{user?.phone}</span>
              </div>
            )}
            {user?.role.toLowerCase() === "dentist" && user?.specialization && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 md:h-3" />
                <span>{user?.specialization}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurations Form */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6 md:space-y-4">
          {/* Profile Settings */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <User className="h-4 sm:h-5 md:h-4 w-4 sm:w-5 md:w-4" />
                <CardTitle className="text-sm sm:text-lg md:text-base font-sans">Profile Settings</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm md:text-xs">Update your personal information and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfileSettings} className="space-y-3 sm:space-y-4 md:space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="profileName" className="text-xs sm:text-sm md:text-xs">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                    <Input id="profileName" className="pl-9 text-xs sm:text-sm md:text-xs" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4 md:gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="profileEmail" className="text-xs sm:text-sm md:text-xs">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                      <Input id="profileEmail" type="email" className="pl-9 text-xs sm:text-sm md:text-xs" value={profileEmail} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profilePhone" className="text-xs sm:text-sm md:text-xs">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                      <Input id="profilePhone" className="pl-9 text-xs sm:text-sm md:text-xs" placeholder="+91 99999 99999" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                    </div>
                  </div>
                </div>

                {user?.role.toLowerCase() === "dentist" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4 md:gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm md:text-xs">Specialization</Label>
                      <Input className="text-xs sm:text-sm md:text-xs" value={user.specialization || "General Dentistry"} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm md:text-xs">License No.</Label>
                      <Input className="text-xs sm:text-sm md:text-xs" value={user.licenseNo || "—"} disabled />
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={profileLoading} className="w-full sm:w-auto md:w-full text-xs sm:text-sm md:text-xs h-8 sm:h-10 md:h-8">
                  <Save className="h-3.5 w-3.5 sm:h-4 md:h-3 mr-2" />
                  {profileLoading ? "Saving Changes..." : "Save Profile Details"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Clinic Settings (Admin Only) */}
          {isAdmin && (
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Building2 className="h-4 sm:h-5 md:h-4 w-4 sm:w-5 md:w-4" />
                  <CardTitle className="text-sm sm:text-lg md:text-base font-sans">Clinic Settings</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm md:text-xs">Update clinic details visible to staff and customers</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveClinicSettings} className="space-y-3 sm:space-y-4 md:space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="text-xs sm:text-sm md:text-xs">Clinic Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                      <Input id="clinicName" className="pl-9 text-xs sm:text-sm md:text-xs" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3 sm:gap-4 md:gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="clinicEmail" className="text-xs sm:text-sm md:text-xs">Contact Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                        <Input id="clinicEmail" type="email" className="pl-9 text-xs sm:text-sm md:text-xs" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clinicPhone" className="text-xs sm:text-sm md:text-xs">Contact Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                        <Input id="clinicPhone" className="pl-9 text-xs sm:text-sm md:text-xs" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress" className="text-xs sm:text-sm md:text-xs">Clinic Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                      <Input id="clinicAddress" className="pl-9 text-xs sm:text-sm md:text-xs" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinicHours" className="text-xs sm:text-sm md:text-xs">Working Hours</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 md:h-3.5" />
                      <Input id="clinicHours" className="pl-9 text-xs sm:text-sm md:text-xs" value={clinicHours} onChange={(e) => setClinicHours(e.target.value)} required />
                    </div>
                  </div>

                  <Button type="submit" disabled={clinicLoading} className="w-full sm:w-auto md:w-full text-xs sm:text-sm md:text-xs h-8 sm:h-10 md:h-8">
                    <Save className="h-3.5 w-3.5 sm:h-4 md:h-3 mr-2" />
                    {clinicLoading ? "Saving Settings..." : "Save Clinic Configuration"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Lock className="h-4 sm:h-5 md:h-4 w-4 sm:w-5 md:w-4" />
                <CardTitle className="text-sm sm:text-lg md:text-base font-sans">Security Settings</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm md:text-xs">Update your account password and secure credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSecuritySettings} className="space-y-3 sm:space-y-4 md:space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs sm:text-sm md:text-xs">New Password</Label>
                  <Input id="newPassword" type="password" className="text-xs sm:text-sm md:text-xs" placeholder="Minimum 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword" className="text-xs sm:text-sm md:text-xs">Confirm New Password</Label>
                  <Input id="confirmNewPassword" type="password" className="text-xs sm:text-sm md:text-xs" placeholder="Re-enter new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                </div>
                {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-xs sm:text-sm md:text-xs text-destructive">⚠ Passwords do not match</p>
                )}
                {newPassword && confirmNewPassword && newPassword === confirmNewPassword && (
                  <p className="text-xs sm:text-sm md:text-xs text-green-600">✓ Passwords match</p>
                )}
                <Button type="submit" disabled={securityLoading || (!!newPassword && !!confirmNewPassword && newPassword !== confirmNewPassword)} className="w-full sm:w-auto md:w-full text-xs sm:text-sm md:text-xs h-8 sm:h-10 md:h-8">
                  <Lock className="h-3.5 w-3.5 sm:h-4 md:h-3 mr-2" />
                  {securityLoading ? "Updating Password..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
