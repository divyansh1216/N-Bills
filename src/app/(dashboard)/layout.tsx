import Sidebar from '@/components/layout/Sidebar'
import PageWrapper from '@/components/layout/PageWrapper'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <PageWrapper>
            {children}
          </PageWrapper>
        </div>
      </div>
    </div>
  )
}
