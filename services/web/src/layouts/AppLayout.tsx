import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import TopBar  from '@/components/layout/TopBar'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
