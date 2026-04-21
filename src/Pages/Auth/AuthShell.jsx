import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "../../components/use-theme";

function AuthShell({ title, description, children, footer }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(71,111,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl shadow-black/10 backdrop-blur-md md:p-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">M/s Sadia Auto Parts</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
              </div>

              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>

            <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">{description}</p>

            <div className="mt-8">{children}</div>

            {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
          </section>

          <aside className="hidden rounded-3xl border border-border/60 bg-slate-950/90 p-8 text-slate-100 shadow-2xl shadow-black/20 backdrop-blur-md lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Operations</p>
              <h2 className="mt-3 text-3xl font-semibold">Clean login. Fast worker management. Smooth POS flow.</h2>
              <p className="mt-4 max-w-md text-sm text-slate-300">
                Sign in, manage workers from the admin panel, switch theme, and handle attendance without leaving the app shell.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Attendance buttons update color immediately.</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">No page-level horizontal overflow.</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Dark and light themes persist locally.</div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed bottom-4 left-4 text-xs text-muted-foreground">Login</div>
    </div>
  );
}

export default AuthShell;

