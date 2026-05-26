import { NavLink, Outlet } from 'react-router-dom'
import { FileText, ShoppingCart, TrendingUp, Package, BookOpen } from 'lucide-react'

const TABS = [
  { to: '/erp/invoicing',  label: 'Invoicing',  icon: FileText    },
  { to: '/erp/purchasing', label: 'Purchasing', icon: ShoppingCart },
  { to: '/erp/sales',      label: 'Sales',      icon: TrendingUp  },
  { to: '/erp/inventory',  label: 'Inventory',  icon: Package     },
  { to: '/erp/accounting', label: 'Accounting', icon: BookOpen    },
]

export default function ERPLayout() {
  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation tab bar */}
      <nav
        className="flex items-center gap-0.5 px-4 border-b border-gray-800 bg-gray-950 shrink-0 overflow-x-auto"
        aria-label="ERP modules"
      >
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon size={13} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
