import Sidebar from "@/components/layout/Sidebar";

/**
 * Layout dashboardu oparty o grid 1/5 i 4/5.
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-5">
      <div className="md:col-span-1">
        <Sidebar />
      </div>
      <main className="md:col-span-4 bg-background p-6">{children}</main>
    </div>
  );
}
