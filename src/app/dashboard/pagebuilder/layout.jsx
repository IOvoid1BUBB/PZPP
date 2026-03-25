/**
 * Layout page buildera - ten sam układ co dashboard (sidebar + główna treść).
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export default function PageBuilderLayout({ children }) {
  // Sidebar jest już renderowany w `src/app/dashboard/layout.jsx`,
  // więc tutaj nie dodajemy kolejnego, żeby nie robić "sidebaru w sidebarze".
  return <>{children}</>;
}
