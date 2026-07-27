import { useState } from 'react'
import AppSidebar from './AppSidebar'
import './AppShell.css'

function AppShell({
  user,
  logoTo,
  navItems,
  footerItems,
  children,
  mainClassName = '',
  contentClassName = '',
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="app-shell">
      <AppSidebar
        user={user}
        logoTo={logoTo}
        navItems={navItems}
        footerItems={footerItems}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />

      <main className={`app-main ${mainClassName}`.trim()}>
        <button
          type="button"
          className="app-mobile-menu"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          ☰ Menú
        </button>

        <div className={`app-main-content ${contentClassName}`.trim()}>{children}</div>
      </main>
    </div>
  )
}

export default AppShell
