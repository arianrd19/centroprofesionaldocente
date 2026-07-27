import { NavLink } from 'react-router-dom'
import logo from '../../assets/logo.png'
import './AppSidebar.css'

function userInitials(user) {
  const source = (user?.nombre || user?.email || 'U').trim()
  return source
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function roleLabel(user) {
  return (user?.rol || user?.role || 'usuario').toString()
}

function AppSidebar({
  user,
  logoTo = '/dashboard',
  navItems = [],
  footerItems = [],
  isOpen = false,
  onClose,
}) {
  const renderNavItem = (item, index) => {
    const className = ({ isActive }) =>
      `app-nav-item${isActive && item.to ? ' active' : ''}`

    if (item.onClick) {
      return (
        <button
          key={item.key || index}
          type="button"
          className="app-nav-item app-nav-item-button"
          onClick={() => {
            item.onClick()
            onClose?.()
          }}
        >
          {item.icon && <span className="app-nav-icon">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      )
    }

    return (
      <NavLink
        key={item.key || item.to || index}
        to={item.to}
        end={item.end}
        className={className}
        onClick={onClose}
      >
        {item.icon && <span className="app-nav-icon">{item.icon}</span>}
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <>
      {isOpen && <div className="app-sidebar-overlay" onClick={onClose} aria-hidden="true" />}

      <aside className={`app-sidebar${isOpen ? ' open' : ''}`}>
        <div className="app-sidebar-header">
          <div className="app-sidebar-header-user">
            <div className="app-sidebar-avatar">{userInitials(user)}</div>
            <div className="app-sidebar-user-name">{user?.nombre || 'Usuario'}</div>
          </div>
          <button type="button" className="app-sidebar-close" onClick={onClose} aria-label="Cerrar menú">
            ×
          </button>
        </div>

        <div className="app-sidebar-user app-sidebar-user--desktop">
          <div className="app-sidebar-avatar">{userInitials(user)}</div>
          <div className="app-sidebar-user-name">{user?.nombre || 'Usuario'}</div>
          <div className="app-sidebar-user-email">{user?.email}</div>
          <span className="app-sidebar-role">{roleLabel(user).toUpperCase()}</span>
        </div>

        <nav className="app-sidebar-nav">{navItems.map(renderNavItem)}</nav>

        {footerItems.length > 0 && (
          <div className="app-sidebar-footer">
            {footerItems.map(renderNavItem)}
            <NavLink to={logoTo} className="app-sidebar-brand" onClick={onClose} aria-label="Ir al inicio">
              <img src={logo} alt="CENPROD" className="app-sidebar-brand__img" />
            </NavLink>
          </div>
        )}
      </aside>
    </>
  )
}

export default AppSidebar
