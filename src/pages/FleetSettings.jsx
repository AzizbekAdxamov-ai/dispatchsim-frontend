import AccountSettings from '../components/settings/AccountSettings'

const ROLE_TEXT = 'Fleet manager'

export default function FleetSettings() {
  return <AccountSettings idPrefix="fs" roleText={ROLE_TEXT} />
}
