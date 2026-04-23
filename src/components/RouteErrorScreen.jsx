import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { getAuthToken } from "../lib/api";

const DYNAMIC_IMPORT_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function getRouteErrorMessage(error) {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === "string" && error.data.trim()) {
      return error.data;
    }

    return [error.status, error.statusText].filter(Boolean).join(" ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Something went wrong while loading this page.";
}

export default function RouteErrorScreen() {
  const error = useRouteError();
  const navigate = useNavigate();
  const message = getRouteErrorMessage(error);
  const isDynamicImportError = DYNAMIC_IMPORT_ERROR_PATTERN.test(message);

  return (
    <section className="flex min-h-[70vh] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 shadow-[0_28px_70px_rgba(15,23,42,0.14)] backdrop-blur-md">
        <div className="border-b border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(241,245,249,0.88))] px-6 py-6 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,0.94))] sm:px-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 dark:bg-amber-400/12 dark:text-amber-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {isDynamicImportError ? "The app updated while this tab was open" : "Unexpected application error"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {isDynamicImportError
              ? "A new deployment replaced one of the page files. Reload once to sync this tab with the latest version."
              : "This page hit an error while loading. You can reload the app or jump back to a safe screen."}
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_16px_35px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_40px_rgba(37,99,235,0.28)]"
            >
              <RefreshCw className="h-4 w-4" />
              Reload app
            </button>

            <button
              type="button"
              onClick={() => navigate(getAuthToken() ? "/dashboard" : "/login", { replace: true })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Home className="h-4 w-4" />
              Go to {getAuthToken() ? "dashboard" : "login"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
