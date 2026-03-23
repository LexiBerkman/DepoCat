import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

export function TopNav({
  role,
  fullName,
  currentPath,
}: {
  role: "OWNER" | "PARALEGAL";
  fullName: string;
  currentPath: "/" | "/security";
}) {
  return (
    <div className="top-nav">
      <div className="row-wrap">
        <Link className={currentPath === "/" ? "nav-chip nav-chip-active" : "nav-chip"} href="/">
          Tracker
        </Link>
        <Link
          className={currentPath === "/security" ? "nav-chip nav-chip-active" : "nav-chip"}
          href="/security"
        >
          Security
        </Link>
      </div>
      <div className="row-wrap">
        <span className="link-chip">Signed in as {fullName}</span>
        <span className="link-chip">{role === "OWNER" ? "Owner" : "Paralegal"}</span>
        <LogoutButton />
      </div>
    </div>
  );
}
