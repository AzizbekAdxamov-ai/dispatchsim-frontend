import AlertsBoard from '../components/alerts/AlertsBoard'

// The dispatcher's board: everything, unfiltered.
export default function Alerts() {
  return (
    <AlertsBoard
      title="Alerts"
      sub="Conditions that are true right now. Nothing here is a prediction."
    />
  )
}
