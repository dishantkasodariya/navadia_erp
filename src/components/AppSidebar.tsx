import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  ClipboardList,
  Receipt,
  ScanLine,
  Package,
  UserCog,
  BarChart3,
  Settings,
  Bell,
  MessageSquare,
  LogOut,
  Clock,
  CheckSquare,
  CalendarOff,
  Mic,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";

function getNavItems(rolePrefix: string) {
  const mainItems = [
    { title: "Dashboard", url: `/${rolePrefix}/dashboard`, icon: LayoutDashboard },
    { title: "Patients", url: `/${rolePrefix}/patients`, icon: Users },
    { title: "Appointments", url: `/${rolePrefix}/appointments`, icon: CalendarDays },
  ];

  const clinicalItems = [
    { title: "Clinical Records", url: `/${rolePrefix}/clinical`, icon: Stethoscope },
    { title: "Treatment Plans", url: `/${rolePrefix}/treatment-plans`, icon: ClipboardList },
    { title: "Imaging", url: `/${rolePrefix}/imaging`, icon: ScanLine },
  ];

  const hrItems = [
    { title: "Attendance", url: `/${rolePrefix}/attendance`, icon: Clock },
    { title: "Tasks", url: `/${rolePrefix}/tasks`, icon: CheckSquare },
    { title: "Leave Requests", url: `/${rolePrefix}/leave-requests`, icon: CalendarOff },
    { title: "Voicemail", url: `/${rolePrefix}/voicemail`, icon: Mic },
  ];

  const businessItems = [
    { title: "Billing", url: `/${rolePrefix}/billing`, icon: Receipt },
    { title: "Inventory", url: `/${rolePrefix}/inventory`, icon: Package },
    { title: "Staff & HR", url: `/${rolePrefix}/staff`, icon: UserCog },
  ];

  const analyticsItems = [
    { title: "Reports", url: `/${rolePrefix}/reports`, icon: BarChart3 },
    { title: "Notifications", url: `/${rolePrefix}/notifications`, icon: Bell },
    { title: "Messages", url: `/${rolePrefix}/messages`, icon: MessageSquare },
    { title: "Settings", url: `/${rolePrefix}/settings`, icon: Settings },
  ];

  return { mainItems, clinicalItems, hrItems, businessItems, analyticsItems };
}

interface NavSectionProps {
  label: string;
  items: { title: string; url: string; icon: any }[];
  collapsed: boolean;
}

function NavSection({ label, items, collapsed }: NavSectionProps) {
  const location = useLocation();
  const { unreadCountContext } = useChat();

  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url))}
              >
                <NavLink
                  to={item.url}
                  end={item.url.endsWith("/dashboard")}
                  className="hover:bg-sidebar-accent/60"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span className="flex-1">{item.title}</span>}
                  {item.title === "Messages" && unreadCountContext > 0 && !collapsed && (
                    <span className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full">
                      {unreadCountContext}
                    </span>
                  )}
                  {item.title === "Messages" && unreadCountContext > 0 && collapsed && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();

  const rolePrefix = user?.role === "receptionist" ? "reception" : user?.role || "admin";
  const { mainItems, clinicalItems, hrItems, businessItems, analyticsItems } = getNavItems(rolePrefix);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">D</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-serif font-bold text-foreground">
            DentaClinic
          </span>
        )}
      </div>

      <SidebarContent>
        <NavSection label="Main" items={mainItems} collapsed={collapsed} />
        <NavSection label="Clinical" items={clinicalItems} collapsed={collapsed} />
        <NavSection label="HR & Tasks" items={hrItems} collapsed={collapsed} />
        <NavSection label="Business" items={businessItems} collapsed={collapsed} />
        <NavSection label="Analytics" items={analyticsItems} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
