import { useAuth } from '../context/AuthContext'
import AccountSettings from '../components/settings/AccountSettings'
import CarrierPanel from '../components/settings/CarrierPanel'

export default function Settings() {
  const { user } = useAuth()
  return (
    <AccountSettings
      idPrefix="settings"
      primaryExtra={<CarrierPanel isAdmin={Boolean(user?.isAdmin)} />}
    />
  )
}
