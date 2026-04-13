import Footer from '@/components/layout/Footer'
import Sidebar from '@/components/layout/Sidebar'

export default function StudentLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#efefef]">
      {/* Pełna szerokość jak Dashboard CRM: sidebar od lewej krawędzi, treść 4/5 */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[1fr_4fr] md:grid-rows-1 md:min-h-0">
        <div className="min-w-0 md:flex md:h-full md:min-h-0 md:flex-col">
          <Sidebar isStudentLayout />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto bg-background px-6 pt-8 md:h-full md:pt-10">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  )
}
