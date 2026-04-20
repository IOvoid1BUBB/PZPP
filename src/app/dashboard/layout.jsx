import Sidebar from "@/components/layout/Sidebar";

/**
 * Layout dashboardu: sidebar 1/5, treść 4/5 (grid-template-columns: 1fr 4fr).
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:h-dvh md:min-h-0 md:grid-cols-[1fr_4fr] md:grid-rows-1">
      <div className="min-w-0 md:flex md:h-full md:min-h-0 md:flex-col">
        <Sidebar />
      </div>
      <main className="flex min-h-0 min-w-0 flex-col bg-background px-6 pt-6 md:h-full md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
