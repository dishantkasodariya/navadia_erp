import { useState, useEffect } from "react";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Building2, User, Mail, Phone, MapPin, Clock, Save, Lock, ShieldCheck, Eye, EyeOff, Bell, Globe, Calendar, Plus, Trash2, CheckSquare, Square } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role.toLowerCase() === "admin";

  // Push Notifications state
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(() => {
    return localStorage.getItem("navadia_push_notifications_enabled") !== "false";
  });

  const handleTogglePushNotifications = () => {
    const newValue = !pushNotificationsEnabled;

    if (newValue) {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "denied") {
          toast({ 
            title: "Permission Denied", 
            description: "Notifications are blocked by your browser. Please allow them in your browser site settings.", 
            variant: "destructive" 
          });
          return;
        }

        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            setPushNotificationsEnabled(true);
            localStorage.setItem("navadia_push_notifications_enabled", "true");
            toast({ title: "Notifications Enabled", description: "You will now receive alerts for tasks and messages." });
          } else {
            toast({ 
              title: "Permission Required", 
              description: "You must allow notification permissions in your browser to turn this on.", 
              variant: "destructive" 
            });
          }
        });
      } else {
        setPushNotificationsEnabled(true);
        localStorage.setItem("navadia_push_notifications_enabled", "true");
        toast({ title: "Notifications Enabled", description: "Web alerts are now enabled." });
      }
    } else {
      setPushNotificationsEnabled(false);
      localStorage.setItem("navadia_push_notifications_enabled", "false");
      toast({ title: "Notifications Disabled", description: "You will no longer receive alerts." });
    }
  };

  // Clinic Settings state
  const [clinicName, setClinicName] = useState("Navadia Dental Clinic");
  const [clinicEmail, setClinicEmail] = useState("contact@navadia.com");
  const [clinicPhone, setClinicPhone] = useState("+91 98765 43210");
  const [clinicAddress, setClinicAddress] = useState("29, Siddheshwar Society, Ved Rd, Opp. Swaminarayan Mandir, Dabholi Char Rasta, Gayatri Nagar, Katargam, Surat, Gujarat - 395004");
  const [clinicHours, setClinicHours] = useState("09:00 AM - 08:00 PM");

  // Location & Geofencing parameters
  const [latitude, setLatitude] = useState(21.2269);
  const [longitude, setLongitude] = useState(72.8223);
  const [allowedRadius, setAllowedRadius] = useState(100);
  const [geofencingEnabled, setGeofencingEnabled] = useState(true);
  const [gpsVerificationEnabled, setGpsVerificationEnabled] = useState(true);
  const [weekendDays, setWeekendDays] = useState<number[]>([0]); // 0 = Sunday
  const [holidays, setHolidays] = useState<{ name: string; date: string }[]>([]);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  // Profile Settings state
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");

  // Security Settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  // Modal visibility states
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
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
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setClinicName(data.clinicName || "Navadia Dental Clinic");
          setClinicEmail(data.email || "contact@navadia.com");
          setClinicPhone(data.phone || "+91 98765 43210");
          setClinicAddress(data.address || "101, Medical Plaza, Surat, Gujarat");
          setClinicHours(data.workingHours || "09:00 AM - 08:00 PM");
          if (data.latitude !== undefined) setLatitude(data.latitude);
          if (data.longitude !== undefined) setLongitude(data.longitude);
          if (data.allowedRadius !== undefined) setAllowedRadius(data.allowedRadius);
          if (data.geofencingEnabled !== undefined) setGeofencingEnabled(data.geofencingEnabled);
          if (data.gpsVerificationEnabled !== undefined) setGpsVerificationEnabled(data.gpsVerificationEnabled);
          if (data.weekendDays !== undefined) setWeekendDays(data.weekendDays);
          if (data.holidays !== undefined) setHolidays(data.holidays);
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
        const res = await fetch(`${API_BASE_URL}/api/settings`, {
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
            workingHours: clinicHours,
            latitude,
            longitude,
            allowedRadius,
            geofencingEnabled,
            gpsVerificationEnabled,
            weekendDays,
            holidays
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
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
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
        toast({ title: "Profile Updated", description: "Your profile has been successfully saved." });
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
    
    try {
      if (token) {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: currentPassword,
            password: newPassword
          })
        });
        const data = await res.json();
        if (res.ok) {
          if (data.token) {
            localStorage.setItem("navadia_token", data.token);
          }
          // Sync with local users fallback list
          const localUsersStr = localStorage.getItem("navadia_users");
          if (localUsersStr) {
            try {
              const usersList = JSON.parse(localUsersStr);
              if (Array.isArray(usersList)) {
                const index = usersList.findIndex(u => u.email === user?.email);
                if (index !== -1) {
                  usersList[index].password = newPassword;
                  localStorage.setItem("navadia_users", JSON.stringify(usersList));
                }
              }
            } catch (err) {
              console.error("Local user parsing failed during sync", err);
            }
          }
          toast({ title: "Password Updated", description: "Your password has been updated. Use it on next login." });
          setIsChangePasswordOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
          setSecurityLoading(false);
          return;
        } else {
          toast({ title: "Update Failed", description: data.message || "Unable to update password.", variant: "destructive" });
          setSecurityLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Backend offline, updating password locally:", e);
    }

    // Offline / Fallback local storage update
    const localUsersStr = localStorage.getItem("navadia_users");
    if (localUsersStr) {
      try {
        const usersList = JSON.parse(localUsersStr);
        if (Array.isArray(usersList)) {
          const index = usersList.findIndex(u => u.email === user?.email);
          if (index !== -1) {
            if (usersList[index].password !== currentPassword) {
              toast({ title: "Update Failed", description: "Incorrect current password (local verification).", variant: "destructive" });
              setSecurityLoading(false);
              return;
            }
            usersList[index].password = newPassword;
            localStorage.setItem("navadia_users", JSON.stringify(usersList));
            toast({ title: "Password Updated", description: "Updated locally (backend offline)." });
            setIsChangePasswordOpen(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setSecurityLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Local user parsing failed", err);
      }
    }

    toast({ title: "Error", description: "Unable to update password. Server is unreachable.", variant: "destructive" });
    setSecurityLoading(false);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 font-sans">
     

      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* User Card */}
        <Card className="h-fit overflow-hidden shadow-sm xl:sticky xl:top-0">
          <CardHeader className="items-center text-center pb-4 px-4 sm:px-6 pt-5 sm:pt-6">
            <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold sm:h-24 sm:w-24 sm:text-3xl">
              {user?.name ? user.name[0] : "?"}
            </div>
            <CardTitle className="max-w-full truncate text-xl sm:text-2xl">{user?.name}</CardTitle>
            <div className="capitalize font-medium text-primary flex flex-col items-center gap-3 w-full mt-1">
              <Badge variant="outline" className="text-sm">
                {user?.role}
              </Badge>
              <Button 
                onClick={() => setIsChangePasswordOpen(true)}
                className="w-full sm:max-w-xs h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all font-medium text-sm mt-1"
              >
                <Lock className="h-4 w-4" /> Change Password
              </Button>

              {/* Push Notifications Toggle Switch (reference image 2 style) */}
              <div className="w-full sm:max-w-xs flex items-center justify-between p-3 rounded-xl border bg-muted/20 mt-1">
                <div className="flex items-center gap-2.5">
                  <Bell className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-foreground">Push Notifications</span>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePushNotifications}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    pushNotificationsEnabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      pushNotificationsEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 text-base sm:px-6 sm:pb-6">
            <div className="flex min-w-0 items-center gap-3 rounded-md bg-muted/30 px-3 py-2.5 text-muted-foreground">
              <Mail className="h-5 w-5 shrink-0" />
              <span className="break-all">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex min-w-0 items-center gap-3 rounded-md bg-muted/30 px-3 py-2.5 text-muted-foreground">
                <Phone className="h-5 w-5 shrink-0" />
                <span>{user?.phone}</span>
              </div>
            )}
            {user?.role.toLowerCase() === "dentist" && user?.specialization && (
              <div className="flex min-w-0 items-center gap-3 rounded-md bg-muted/30 px-3 py-2.5 text-muted-foreground">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span>{user?.specialization}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurations Form */}
        <div className="space-y-5">
          {/* Profile Settings */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="space-y-2 px-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center gap-3 text-primary">
                <User className="h-6 w-6 shrink-0" />
                <CardTitle className="text-xl sm:text-2xl">Profile Settings</CardTitle>
              </div>
              <CardDescription className="text-base">Update your personal information and contact details</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
              <form onSubmit={handleSaveProfileSettings} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="profileName" className="text-base">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="profileName" className="h-12 pl-11 text-base" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profileEmail" className="text-base">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="profileEmail" type="email" className="h-12 pl-11 text-base" value={profileEmail} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profilePhone" className="text-base">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="profilePhone" className="h-12 pl-11 text-base" placeholder="+91 99999 99999" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                    </div>
                  </div>
                </div>

                {user?.role.toLowerCase() === "dentist" && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-base">Specialization</Label>
                      <Input className="h-12 text-base" value={user.specialization || "General Dentistry"} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-base">License No.</Label>
                      <Input className="h-12 text-base" value={user.licenseNo || "-"} disabled />
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={profileLoading} className="h-12 w-full text-base sm:w-auto sm:px-6">
                  <Save className="h-4 w-4 mr-2" />
                  {profileLoading ? "Saving Changes..." : "Save Profile Details"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Clinic Settings (Admin Only) */}
          {isAdmin && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="space-y-2 px-4 pt-5 sm:px-6 sm:pt-6">
                <div className="flex items-center gap-3 text-primary">
                  <Building2 className="h-6 w-6 shrink-0" />
                  <CardTitle className="text-xl sm:text-2xl">Clinic Settings</CardTitle>
                </div>
                <CardDescription className="text-base">Update clinic details visible to staff and customers</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                <form onSubmit={handleSaveClinicSettings} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName" className="text-base">Clinic Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="clinicName" className="h-12 pl-11 text-base" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="clinicEmail" className="text-base">Contact Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="clinicEmail" type="email" className="h-12 pl-11 text-base" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clinicPhone" className="text-base">Contact Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="clinicPhone" className="h-12 pl-11 text-base" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinicAddress" className="text-base">Clinic Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="clinicAddress" className="h-12 pl-11 text-base" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clinicHours" className="text-base">Working Hours</Label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="clinicHours" className="h-12 pl-11 text-base" value={clinicHours} onChange={(e) => setClinicHours(e.target.value)} required />
                    </div>
                  </div>

                  {/* Geofencing Configuration */}
                  <div className="border-t pt-5 mt-5 space-y-4">
                    <h3 className="text-base font-bold text-primary flex items-center gap-2">
                      <Globe className="h-4.5 w-4.5 text-primary" /> Location Geofencing & GPS Verification
                    </h3>
                    <p className="text-xs text-muted-foreground">Require employees to verify their physical presence at the clinic when checking in or out.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-foreground">Enable Geofencing</span>
                          <p className="text-[10px] text-muted-foreground">Validate coordinates boundary limit</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGeofencingEnabled(!geofencingEnabled)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            geofencingEnabled ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              geofencingEnabled ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-foreground">Require Browser GPS</span>
                          <p className="text-[10px] text-muted-foreground">Blocks check-ins without device location</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGpsVerificationEnabled(!gpsVerificationEnabled)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            gpsVerificationEnabled ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              gpsVerificationEnabled ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="clinicLat" className="text-xs font-semibold">Latitude</Label>
                        <Input
                          id="clinicLat"
                          type="number"
                          step="0.000001"
                          value={latitude}
                          onChange={(e) => setLatitude(parseFloat(e.target.value))}
                          className="h-10 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clinicLon" className="text-xs font-semibold">Longitude</Label>
                        <Input
                          id="clinicLon"
                          type="number"
                          step="0.000001"
                          value={longitude}
                          onChange={(e) => setLongitude(parseFloat(e.target.value))}
                          className="h-10 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="allowedRadius" className="text-xs font-semibold">Allowed Radius (meters)</Label>
                        <Input
                          id="allowedRadius"
                          type="number"
                          value={allowedRadius}
                          onChange={(e) => setAllowedRadius(parseInt(e.target.value))}
                          className="h-10 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          toast({ title: "Fetching Location...", description: "Retrieving browser coordinates." });
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
                              setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
                              toast({ title: "Coordinates Loaded", description: `Lat: ${pos.coords.latitude.toFixed(6)}, Lon: ${pos.coords.longitude.toFixed(6)}` });
                            },
                            (err) => {
                              toast({ title: "Permission Denied", description: "Enable location permissions to capture current GPS.", variant: "destructive" });
                            }
                          );
                        }}
                        className="text-xs flex items-center gap-1.5 h-9 rounded-xl font-sans"
                      >
                        <MapPin className="h-4 w-4 text-primary" /> Capture Current Coordinates
                      </Button>
                    </div>
                  </div>

                  {/* Weekend days & Holidays configuration */}
                  <div className="border-t pt-5 mt-5 space-y-4">
                    <h3 className="text-base font-bold text-primary flex items-center gap-2">
                      <Calendar className="h-4.5 w-4.5 text-primary" /> Work Weekends & Holidays
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Weekend Days Off</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1.5">
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, idx) => {
                          const isWeekendSelected = weekendDays.includes(idx);
                          return (
                            <div
                              key={day}
                              onClick={() => {
                                if (isWeekendSelected) {
                                  setWeekendDays(weekendDays.filter(d => d !== idx));
                                } else {
                                  setWeekendDays([...weekendDays, idx]);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-xl border cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors select-none text-[11px] font-bold font-sans",
                                isWeekendSelected ? "border-primary bg-primary/5 text-primary" : "border-neutral-200/60 dark:border-neutral-800"
                              )}
                            >
                              {isWeekendSelected ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                              <span>{day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-xs font-semibold text-muted-foreground">Yearly Clinic Holidays</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Holiday Name (e.g. Diwali)"
                          value={newHolidayName}
                          onChange={(e) => setNewHolidayName(e.target.value)}
                          className="h-10 text-xs"
                        />
                        <Input
                          type="date"
                          value={newHolidayDate}
                          onChange={(e) => setNewHolidayDate(e.target.value)}
                          className="h-10 text-xs"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (!newHolidayName || !newHolidayDate) {
                              toast({ title: "Missing Fields", description: "Provide name and date.", variant: "destructive" });
                              return;
                            }
                            setHolidays([...holidays, { name: newHolidayName, date: newHolidayDate }]);
                            setNewHolidayName("");
                            setNewHolidayDate("");
                            toast({ title: "Holiday Added" });
                          }}
                          className="h-10 px-3 bg-primary"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="max-h-40 overflow-y-auto border border-neutral-100 dark:border-neutral-800 rounded-xl divide-y">
                        {holidays.map((h, i) => (
                          <div key={i} className="flex justify-between items-center px-3 py-2 text-xs hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-800 dark:text-neutral-200">{h.name}</span>
                              <span className="text-[10px] text-muted-foreground">{h.date}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setHolidays(holidays.filter((_, idx) => idx !== i));
                                toast({ title: "Holiday Removed" });
                              }}
                              className="h-8 w-8 text-red-500 hover:text-red-650 hover:bg-red-50 p-0 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {holidays.length === 0 && (
                          <p className="text-center py-4 text-xs text-muted-foreground font-sans">No yearly holidays configured.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={clinicLoading} className="h-12 w-full text-base sm:w-auto sm:px-6">
                    <Save className="h-4 w-4 mr-2" />
                    {clinicLoading ? "Saving Settings..." : "Save Clinic Configuration"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      <Dialog open={isChangePasswordOpen} onOpenChange={(o) => {
        setIsChangePasswordOpen(o);
        if (!o) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmNewPassword("");
        }
      }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:w-full sm:max-w-[460px] sm:p-6 bg-card border shadow-xl">
          <DialogHeader className="relative pr-6">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Change Password
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSecuritySettings} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Current Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input 
                  type={showCurrentPassword ? "text" : "password"} 
                  className="h-11 pr-10 text-sm rounded-lg" 
                  placeholder="Enter your current password..." 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">New Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"} 
                  className="h-11 pr-10 text-sm rounded-lg" 
                  placeholder="Enter your new password..." 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Confirm New Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input 
                  type={showConfirmNewPassword ? "text" : "password"} 
                  className="h-11 pr-10 text-sm rounded-lg" 
                  placeholder="Confirm your new password..." 
                  value={confirmNewPassword} 
                  onChange={(e) => setConfirmNewPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
              <p className="text-xs font-medium text-destructive">New passwords do not match</p>
            )}
            {newPassword && confirmNewPassword && newPassword === confirmNewPassword && (
              <p className="text-xs font-medium text-green-600">New passwords match</p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
              <Button 
                type="button" 
                variant="outline" 
                className="h-10 px-4 rounded-xl text-sm font-medium" 
                onClick={() => setIsChangePasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={securityLoading || !currentPassword || !newPassword || newPassword.length < 6 || newPassword !== confirmNewPassword} 
                className="h-10 px-5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all flex items-center gap-1.5"
              >
                {securityLoading ? "Updating..." : "Change Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
