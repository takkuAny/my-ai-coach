"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { BookOpen, Calendar, LayoutDashboard, Settings } from "lucide-react";

export function SidebarNav() {
  return (
    <aside className="w-64 h-screen bg-gray-100 border-r p-4">
      <nav className="space-y-4">
        <SidebarItem href="/dashboard" icon={<LayoutDashboard size={20} />} label="ダッシュボード" />
        <SidebarItem href="/records" icon={<BookOpen size={20} />} label="学習記録" />
        <SidebarItem href="/schedule" icon={<Calendar size={20} />} label="スケジューラー" />
        <SidebarItem href="/settings" icon={<Settings size={20} />} label="設定" />
      </nav>
    </aside>
  );
}

function SidebarItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 p-2 rounded transition-colors",
        isActive ? "bg-blue-100 text-blue-600 font-semibold" : "text-gray-700 hover:bg-gray-200"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
