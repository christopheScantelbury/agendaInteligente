import { Link, useLocation } from 'react-router-dom'
import { Sun, Calendar, User } from 'lucide-react'

interface NavItem {
  path: string
  label: string
  icon: typeof Sun
  matchPaths?: string[]
}

const ITEMS: NavItem[] = [
  { path: '/profissional/hoje', label: 'Hoje', icon: Sun, matchPaths: ['/profissional/hoje', '/profissional'] },
  { path: '/profissional/agenda', label: 'Agenda', icon: Calendar, matchPaths: ['/profissional/agenda'] },
  { path: '/profissional/perfil', label: 'Perfil', icon: User, matchPaths: ['/profissional/perfil'] },
]

export default function BottomNavProfissional() {
  const { pathname } = useLocation()

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
    }
    return pathname === item.path
  }

  return (
    <nav
      aria-label="Navegação do profissional"
      data-tour="bottom-nav-profissional"
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex justify-around items-stretch h-16 max-w-md mx-auto">
        {ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`
                  h-full flex flex-col items-center justify-center gap-1 px-2
                  transition-colors min-w-[44px] min-h-[44px]
                  ${active ? 'text-violet-700' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5]' : ''}`} aria-hidden />
                <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
