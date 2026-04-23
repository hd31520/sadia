import React from "react";

const DYNAMIC_IMPORT_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(_error, _errorInfo) {
    // You can log error info here if needed
    // console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || String(this.state.error);
      const isDynamicImportError = DYNAMIC_IMPORT_ERROR_PATTERN.test(message);

      return (
        <section className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur-md">
            <div className="border-b border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(241,245,249,0.88))] px-6 py-6 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,0.94))] sm:px-8">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {isDynamicImportError ? "The app updated while this tab was open" : "Application error"}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {isDynamicImportError
                  ? "A new deployment replaced one of the page files. Reload once to sync this tab with the latest version."
                  : "The app hit an unexpected error. Reload the page to try again."}
              </p>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div className="rounded-[1.25rem] border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">Details</p>
                <p className="mt-2 break-words leading-6 text-foreground/90">{message}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_16px_35px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_40px_rgba(37,99,235,0.28)]"
                >
                  Reload app
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = "#/dashboard";
                    window.location.reload();
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Open dashboard
                </button>
              </div>
            </div>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
