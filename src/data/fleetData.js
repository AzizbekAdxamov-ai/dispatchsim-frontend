// Display-label maps only. All mock data (trucks, fleetDocuments,
// fleetAlerts) has been removed — pages now use the real backend API
// (api/fleet.js).
export const FLEET_STATUS_LABEL = {
  active: 'Active',
  maintenance: 'In Maintenance',
  idle: 'Idle',
}

export const MAINTENANCE_STATUS_LABEL = {
  overdue: 'Overdue',
  due: 'Due Soon',
  scheduled: 'Scheduled',
  done: 'Completed',
}
