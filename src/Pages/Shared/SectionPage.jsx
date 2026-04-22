import { cn } from "../../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

function StatCard({ label, value, hint }) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/92 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="h-1 w-full bg-[linear-gradient(90deg,rgba(37,99,235,0.95),rgba(20,184,166,0.7),rgba(251,191,36,0.8))]" />
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <CardDescription className="text-xs sm:text-sm">{label}</CardDescription>
        <CardTitle className="break-words text-xl leading-tight sm:text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SectionPage({ title, description, stats = [], loading = false, error = "", aside = null, children = null }) {
  return (
    <section
      className={cn(
        "relative min-w-0 space-y-4 sm:space-y-6",
        aside ? "lg:pr-[20.75rem] xl:pr-[23.75rem] 2xl:pr-[24.75rem]" : null
      )}
    >
      {aside ? (
        <aside className="pointer-events-none fixed right-8 top-24 z-10 hidden lg:block lg:h-[calc(100dvh-8rem)] lg:w-[20rem] xl:w-[23rem] 2xl:w-[24rem]">
          <div className="pointer-events-auto h-full">{aside}</div>
        </aside>
      ) : null}

      <header className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(248,250,252,0.76))] p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-md dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.95),rgba(15,23,42,0.9))] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Business Overview
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>
          {stats.length ? (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:flex sm:flex-wrap">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
                <span className="block text-[10px] uppercase tracking-[0.2em]">Metrics</span>
                <span className="text-sm font-semibold text-foreground">{stats.length}</span>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
                <span className="block text-[10px] uppercase tracking-[0.2em]">Status</span>
                <span className="text-sm font-semibold text-foreground">{loading ? "Syncing" : "Live"}</span>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {loading ? <p className="text-sm text-muted-foreground">Loading data from server...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {stats.length ? (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </div>
      ) : null}

      <Card className="overflow-visible border-border/60 bg-card/86 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Workspace</CardTitle>
          <CardDescription>This section is connected to your POS API server.</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

export default SectionPage;

