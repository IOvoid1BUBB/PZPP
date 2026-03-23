import Sidebar from "@/components/layout/Sidebar";

/**
 * Layout dashboardu: sidebar 1/5, treść 4/5 (grid-template-columns: 1fr 4fr).
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1fr_4fr]">
      <div className="min-w-0">
        <Sidebar />
      </div>
      <main className="min-w-0 bg-background p-6">{children}</main>
    </div>
  );
}
