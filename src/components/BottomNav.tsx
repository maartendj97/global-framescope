"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AboutIcon, EventsIcon, HomeIcon, SettingsIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/events", label: "Events", Icon: EventsIcon },
  { href: "/about", label: "About", Icon: AboutIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
    >
      <div className="flex w-full max-w-sm items-center justify-between gap-1 rounded-[28px] border border-border bg-surface-elevated px-2 py-2 shadow-lg">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-foreground text-inverse-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
