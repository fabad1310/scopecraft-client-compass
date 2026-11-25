import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { hasAgencyAccess } from "@/lib/access";
import { applyAdminSettings, useAdminSettings } from "@/lib/admin-settings";

/** Renders the admin only after the agency PIN was entered on this browser, with the panel's custom look. */
export function AgencyGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (hasAgencyAccess()) setOk(true);
    else navigate({ to: "/", search: { acceso: "agencia" }, replace: true });
  }, [navigate]);

  return ok ? <AdminTheme>{children}</AdminTheme> : <div className="admin-bg min-h-screen" />;
}

function AdminTheme({ children }: { children: ReactNode }) {
  const { data: settings } = useAdminSettings();
  useEffect(() => (settings ? applyAdminSettings(settings) : undefined), [settings]);
  return <>{children}</>;
}
