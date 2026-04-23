import { useEffect, useMemo, useState } from "react";
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
  { to: "/cart", label: "Cart", icon: CreditCard },
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
  const [now, setNow] = useState(() => new Date());
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
    if (/^\/worker\/[^/]+\/history$/i.test(location.pathname)) {
      return "Worker History";
    }

    const found = visibleNavItems.find((item) => item.to === location.pathname);
    return found ? found.label : "Dashboard";
  }, [location.pathname, visibleNavItems]);

  const isCartRoute = /^\/(cart|card)$/i.test(location.pathname);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(80rem_80rem_at_-10%_-20%,rgba(66,118,255,0.16),transparent_60%),radial-gradient(80rem_80rem_at_120%_120%,rgba(33,52,130,0.35),transparent_58%)]" />

      <div className="flex min-h-screen w-full overflow-x-hidden">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[85vw] max-w-72 border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-md transition-transform duration-300",
            isCartRoute
              ? isOpen
                ? "translate-x-0 md:translate-x-0"
                : "-translate-x-full md:-translate-x-full"
              : isOpen
                ? "translate-x-0"
                : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="flex h-20 items-center justify-between border-b border-sidebar-border/70 px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-sidebar-foreground/70">M/s Sadia Auto Parts</p>
              <h2 className="text-lg font-semibold text-sidebar-foreground">Business Console</h2>
              <p className="mt-1 text-xs text-sidebar-foreground/60">Sales, stock, dues and workforce in one place.</p>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsOpen(false)}
              className={cn(
                "rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !isCartRoute && "md:hidden"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1 overflow-y-auto px-3 py-5">
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

          <div className="mx-3 mb-4 rounded-2xl border border-sidebar-border/80 bg-white/5 p-4 text-xs text-sidebar-foreground/80">
            <p className="text-[10px] uppercase tracking-[0.24em] text-sidebar-foreground/55">Today</p>
            <p className="mt-2 text-sm font-semibold text-sidebar-foreground">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <p className="mt-1 text-sidebar-foreground/65">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </aside>

        {isOpen ? (
          <button
            type="button"
            aria-label="Close menu backdrop"
            className={cn("fixed inset-0 z-30 bg-black/40", !isCartRoute && "md:hidden")}
            onClick={() => setIsOpen(false)}
          />
        ) : null}

        <div className={cn("flex min-w-0 flex-1 flex-col overflow-x-hidden", !isCartRoute && "md:pl-72")}>
          <header
            className={cn(
              "fixed left-0 right-0 top-0 z-20 border-b border-border/70 bg-background/72 px-3 py-3 backdrop-blur-xl md:px-8",
              isCartRoute ? "md:left-0" : "md:left-72"
            )}
          >
            <div className="flex items-start justify-between gap-3 sm:items-center">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setIsOpen(true)}
                className={cn(
                  "rounded-md border border-border bg-card p-2 text-foreground",
                  isCartRoute ? "inline-flex" : "md:hidden"
                )}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-semibold text-foreground sm:text-base md:text-lg">{currentLabel}</h1>
                <p className="hidden text-xs text-muted-foreground sm:block">Live data connected to local POS API</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 lg:block">
                  Live Workspace
                </div>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted sm:px-3"
                >
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
                </button>
                {storedUser ? (
                  <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground md:flex">
                    <span className="font-medium text-foreground">{storedUser.name}</span>
                    <span>&bull;</span>
                    <span>{storedUser.role}</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    clearAuthSession();
                    navigate("/login", { replace: true });
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted sm:px-3"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden p-3 pt-22 sm:p-4 sm:pt-24 md:p-8 md:pt-24">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default Root;
