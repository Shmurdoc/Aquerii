import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, FileText, ShoppingCart, TrendingUp, Package, BookOpen, Users, CheckCircle, Calendar, Mail, Building2, Shield, Webhook } from 'lucide-react'

const TABS = [
  { to: '/erp/job-cards',  label: 'Job Cards',  icon: ClipboardList },
  { to: '/erp/delegations', label: 'Delegations', icon: Users },
  { to: '/erp/invoicing',  label: 'Invoicing',  icon: FileText    },
  { to: '/erp/purchasing', label: 'Purchasing', icon: ShoppingCart },
  { to: '/erp/sales',      label: 'Sales',      icon: TrendingUp  },
  { to: '/erp/inventory',  label: 'Inventory',  icon: Package     },
  { to: '/erp/accounting', label: 'Accounting', icon: BookOpen    },
  { to: '/erp/financial-approvals', label: 'Approvals', icon: CheckCircle },
  { to: '/erp/report-schedules', label: 'Report Schedules', icon: Calendar },
  { to: '/erp/goals',      label: 'Goals',     icon: TrendingUp  },
  { to: '/erp/meeting-outcomes', label: 'Meeting Outcomes', icon: Calendar },
  { to: '/erp/email-addresses', label: 'Email Addresses', icon: Mail },
  { to: '/erp/employee-groups', label: 'Employee Groups', icon: Building2 },
  { to: '/erp/audit-logs', label: 'Audit Logs', icon: Shield },
  { to: '/erp/webhook-events', label: 'Webhook Events', icon: Webhook },
  { to: '/erp/field-permissions', label: 'Field Permissions', icon: Shield },
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
