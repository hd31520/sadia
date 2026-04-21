import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

function StatCard({ label, value, hint }) {
  return (
    <Card className="bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SectionPage({ title, description, stats = [], loading = false, error = "", children = null }) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      {loading ? <p className="text-sm text-muted-foreground">Loading data from server...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {stats.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </div>
      ) : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Live Data</CardTitle>
          <CardDescription>This section is connected to your local API server.</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

export default SectionPage;

