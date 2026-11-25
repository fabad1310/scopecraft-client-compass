import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { hasAgencyAccess } from "@/lib/access";

/** Renders the admin only after the agency PIN was entered on this browser. */
export function AgencyGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (hasAgencyAccess()) setOk(true);
    else navigate({ to: "/", search: { acceso: "agencia" }, replace: true });
  }, [navigate]);

  return ok ? <>{children}</> : <div className="admin-bg min-h-screen" />;
}
