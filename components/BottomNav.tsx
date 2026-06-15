"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HOME_TAB = { href: "/", label: "היתרות שלי", icon: "📊" };
const ADMIN_TAB = { href: "/admin", label: "ניהול", icon: "⚙️" };

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = [HOME_TAB, ...(isAdmin ? [ADMIN_TAB] : [])];

  // אין צורך בתפריט ניווט כשיש מסך אחד בלבד (משתמש רפת)
  if (tabs.length <= 1) return null;

  return (
    <nav className="sticky bottom-0 z-10 border-t border-brand-line bg-brand-surface">
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? "text-brand-primary" : "text-brand-muted"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
