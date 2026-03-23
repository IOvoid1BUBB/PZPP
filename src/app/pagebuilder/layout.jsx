import Sidebar from "@/components/layout/Sidebar";

/**
 * Layout page buildera - ten sam układ co dashboard (sidebar + główna treść).
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export default function PageBuilderLayout({ children }) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-5">
      <div className="md:col-span-1">
        <Sidebar />
      </div>
      <main className="md:col-span-4 bg-background p-6">{children}</main>
    </div>
  );
}
