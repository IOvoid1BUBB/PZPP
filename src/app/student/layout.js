import Footer from '@/components/layout/Footer'
import Sidebar from '@/components/layout/Sidebar'

export default function StudentLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#efefef]">
      {/* Pełna szerokość jak Dashboard CRM: sidebar od lewej krawędzi, treść 4/5 */}
      <div className="grid min-h-0 flex-1 w-full grid-cols-1 md:grid-cols-[1fr_4fr]">
        <div className="min-w-0">
          <Sidebar />
        </div>
        <div className="min-w-0 bg-background p-6 pb-12 pt-8 md:pt-10">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  )
}
