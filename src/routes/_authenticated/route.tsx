import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ensureSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    await ensureSession();
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
