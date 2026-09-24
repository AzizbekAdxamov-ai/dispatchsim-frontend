import TrackingBoard from '../components/tracking/TrackingBoard'

// Tracking used to live here in full -- board, panel, map and the route
// cache. All of it moved to components/tracking/TrackingBoard.jsx when the
// Dashboard needed the same fleet picture: this page is now the full-height
// presentation of that shared board, and the Dashboard embeds it at its own
// card height. One implementation, two pages -- the list, the polls and the
// map cannot drift apart.
export default function Tracking() {
  return <TrackingBoard />
}
