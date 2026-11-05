// Display-label map only. All mock data (loads, alerts, activityFeed,
// brokerChats, dispatchRating, trackedShipment, trackingHistory,
// complianceDocuments) has been removed — pages now use the real backend
// API (api/loads.js, api/drivers.js, api/stats.js, etc.).
export const STATUS_LABEL = {
  ontime: 'On time',
  warn: 'At risk',
  crit: 'Delayed',
  neutral: 'Pending pickup',
  done: 'Delivered',
  cancelled: 'Cancelled',
}
