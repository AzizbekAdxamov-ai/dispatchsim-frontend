import AccountSettings from '../components/settings/AccountSettings'

// Administrator is a flag on the account, not a workspace role, so the
// profile line is stated here instead of read from the role list.
const ADMIN_ROLE_TEXT = 'Administrator'

export default function AdminSettings() {
  return <AccountSettings idPrefix="ads" roleText={ADMIN_ROLE_TEXT} />
}
