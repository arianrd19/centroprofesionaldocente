import { getUser } from '../../utils/auth'
import DashboardHome from './DashboardHome'
import DashboardAdminHome from './DashboardAdminHome'

function DashboardIndex() {
  const user = getUser()
  const isAdmin = user?.role === 'admin' || (user?.rol || '').toLowerCase() === 'admin'
  return isAdmin ? <DashboardAdminHome /> : <DashboardHome />
}

export default DashboardIndex
