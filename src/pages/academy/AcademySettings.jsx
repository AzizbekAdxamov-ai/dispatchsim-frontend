import { useAuth } from '../../context/AuthContext'
import AccountSettings from '../../components/settings/AccountSettings'
import { ACADEMY_SETTINGS_COPY, PASSWORD_COPY_UZ } from '../../data/academySettingsCopy'
import { canTeachClass } from '../../data/academyAccess'

export default function AcademySettings() {
  const { user } = useAuth()
  return (
    <AccountSettings
      idPrefix="acs"
      copy={ACADEMY_SETTINGS_COPY}
      passwordCopy={PASSWORD_COPY_UZ}
      roleText={canTeachClass(user) ? ACADEMY_SETTINGS_COPY.roleMentor : ACADEMY_SETTINGS_COPY.roleStudent}
    />
  )
}
