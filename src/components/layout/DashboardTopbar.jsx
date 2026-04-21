"use client";

import NotificationsBell from "@/components/layout/NotificationsBell";

export default function DashboardTopbar() {
  return (
    <div className="flex items-center justify-end gap-2 pb-4">
      <NotificationsBell />
    </div>
  );
}

