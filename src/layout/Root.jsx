import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Box,
  Boxes,
  WalletCards,
  Users,
  BadgeDollarSign,
  Truck,
  UserCog,
  CreditCard,
  Menu,
  X,
  MoonStar,
  LogOut,
  SunMedium,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { cn } from "../lib/utils";
import { clearAuthSession, getStoredUser } from "../lib/api";
import { useTheme } from "../components/use-theme";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sale", label: "Sale", icon: ShoppingCart },
  { to: "/card", label: "Card", icon: CreditCard },
  { to: "/product", label: "Product", icon: Box },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/due-management", label: "Due Management", icon: WalletCards },
  { to: "/customer", label: "Customer", icon: Users },
  { to: "/supplier", label: "Supplier", icon: Truck },
  { to: "/worker", label: "Worker", icon: UserCog },
  { to: "/salary", label: "Salary", icon: BadgeDollarSign },
  { to: "/report", label: "Report", icon: LayoutDashboard }, // You can change the icon
];

function Root() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const storedUser = useMemo(() => getStoredUser(), []);

  const visibleNavItems = useMemo(() => {
    if (storedUser?.role === "admin") {
      return navItems;
    }

    return navItems.filter((item) => !["/worker", "/salary"].includes(item.to));
  }, [storedUser?.role]);

  const currentLabel = useMemo(() => {
    const found = visibleNavItems.find((item) => item.to === location.pathname);
    return found ? found.label : "Dashboard";
  }, [location.pathname, visibleNavItems]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(80rem_80rem_at_-10%_-20%,rgba(66,118,255,0.16),transparent_60%),radial-gradient(80rem_80rem_at_120%_120%,rgba(33,52,130,0.35),transparent_58%)]" />

      <div className="flex min-h-screen w-full overflow-x-hidden">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-md transition-transform duration-300 md:translate-x-0",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-20 items-center justify-between border-b border-sidebar-border/70 px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-sidebar-foreground/70">M/s Sadia Auto Parts</p>
              <h2 className="text-lg font-semibold text-sidebar-foreground">Control Panel</h2>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1 px-3 py-5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_24px_rgba(48,93,255,0.4)]"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {isOpen ? (
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden md:pl-72">
          <header className="fixed left-0 right-0 top-0 z-20 border-b border-border/70 bg-background/70 px-4 py-3 backdrop-blur-md md:left-72 md:px-8">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setIsOpen(true)}
                className="rounded-md border border-border bg-card p-2 text-foreground md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-foreground md:text-lg">{currentLabel}</h1>
                <p className="text-xs text-muted-foreground">Live data connected to local POS API</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  {theme === "dark" ? "Light" : "Dark"}
                </button>
                {storedUser ? (
                  <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground md:flex">
                    <span className="font-medium text-foreground">{storedUser.name}</span>
                    <span>•</span>
                    <span>{storedUser.role}</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    clearAuthSession();
                    navigate("/login", { replace: true });
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden p-4 pt-24 md:p-8 md:pt-24">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default Root;