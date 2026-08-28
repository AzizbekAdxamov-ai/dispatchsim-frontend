export const STATUS_LABEL = {
  ontime: 'On time',
  warn: 'At risk',
  crit: 'Delayed',
  neutral: 'Pending pickup',
  done: 'Delivered',
}

export const alerts = [
  { strong: '2 loads', text: 'at risk of delay today' },
  { strong: 'Driver #114', text: 'has 45 minutes left before HOS limit' },
  { strong: 'Coyote Logistics', text: 'is waiting on a response — 12 min' },
]

// `loads` is kept here in full (not removed, despite the mock-trim plan
// listing it for removal) because Documents.jsx — an out-of-scope page
// this round — still imports it and reads each load's `documents`
// array. Loads.jsx / LoadDetail.jsx / Dashboard.jsx no longer read from
// here; they use api/loads.js. See the coder report for this deviation
// from the plan's literal C13 list.
export const loads = [
  {
    id: '4471', origin: 'Dallas, TX', destination: 'Memphis, TN', broker: 'XPO Logistics', rate: 1850, status: 'ontime',
    distance: '282 mi', pickup: 'Aug 19, 08:00', delivery: 'Aug 20, 14:00', weight: '28,700 lbs', equipmentType: 'dry-van', equipmentLength: '53ft',
    driver: { name: 'Marcus Webb', cdl: 'CDL-A · TX-88421', hos: '6h 20m HOS' },
    progress: 72, eta: 'ETA 1h 8m',
    timeline: [
      { label: 'Booked', time: 'Aug 18, 09:12', state: 'done' },
      { label: 'Dispatched', time: 'Aug 19, 07:40', state: 'done' },
      { label: 'In Transit', time: 'Now — 72%', state: 'current' },
      { label: 'Delivered', time: 'ETA 1h 8m', state: 'pending' },
    ],
    documents: [
      { name: 'Rate Confirmation', meta: 'PDF · 240 KB', ready: true },
      { name: 'Bill of Lading (BOL)', meta: 'PDF · 180 KB', ready: true },
      { name: 'Proof of Delivery (POD)', meta: 'Pending', ready: false },
    ],
    chat: [
      { dir: 'in', text: 'Load #4471 confirmed, rate $1,850', time: 'Aug 18, 09:14' },
      { dir: 'out', text: 'Got it, driver assigned', time: 'Aug 18, 09:20' },
      { dir: 'in', text: 'Confirming pickup time is unchanged', time: 'Aug 19, 07:10' },
      { dir: 'out', text: 'Yes, 08:00 as planned', time: 'Aug 19, 07:15' },
    ],
    hosAlert: 'Required break in 45 min — after 8h driving',
  },
  {
    id: '4472', origin: 'Atlanta, GA', destination: 'Orlando, FL', broker: 'Coyote Logistics', rate: 1220, status: 'warn',
    distance: '438 mi', pickup: 'Aug 19, 10:30', delivery: 'Aug 20, 09:00', weight: '22,100 lbs', equipmentType: 'reefer', equipmentLength: '53ft',
    driver: { name: 'Elena Petrova', cdl: 'CDL-A · GA-55207', hos: '0h 45m HOS' },
    progress: 54, eta: 'ETA 4h 20m',
    timeline: [
      { label: 'Booked', time: 'Aug 18, 13:05', state: 'done' },
      { label: 'Dispatched', time: 'Aug 19, 10:30', state: 'done' },
      { label: 'In Transit', time: 'Now — 54%', state: 'current' },
      { label: 'Delivered', time: 'ETA 4h 20m', state: 'pending' },
    ],
    documents: [
      { name: 'Rate Confirmation', meta: 'PDF · 210 KB', ready: true },
      { name: 'Bill of Lading (BOL)', meta: 'PDF · 165 KB', ready: true },
      { name: 'Proof of Delivery (POD)', meta: 'Pending', ready: false },
    ],
    chat: [
      { dir: 'in', text: 'Reefer set to 34°F, please confirm', time: 'Aug 19, 09:50' },
      { dir: 'out', text: 'Confirmed, temp holding at 34°F', time: 'Aug 19, 10:05' },
    ],
    hosAlert: 'Driver has 45 minutes left before mandatory rest',
  },
  {
    id: '4473', origin: 'Chicago, IL', destination: 'Detroit, MI', broker: 'TQL', rate: 980, status: 'crit',
    distance: '283 mi', pickup: 'Aug 18, 07:00', delivery: 'Aug 18, 15:00', weight: '19,400 lbs', equipmentType: 'tanker', equipmentLength: '42ft',
    driver: { name: 'Devon Carter', cdl: 'CDL-A · IL-30918', hos: '2h 10m HOS' },
    progress: 88, eta: '2h 10m behind schedule',
    timeline: [
      { label: 'Booked', time: 'Aug 17, 11:20', state: 'done' },
      { label: 'Dispatched', time: 'Aug 18, 07:00', state: 'done' },
      { label: 'In Transit', time: 'Now — 88%', state: 'current' },
      { label: 'Delivered', time: 'Delayed', state: 'pending' },
    ],
    documents: [
      { name: 'Rate Confirmation', meta: 'PDF · 195 KB', ready: true },
      { name: 'Bill of Lading (BOL)', meta: 'PDF · 150 KB', ready: true },
      { name: 'Proof of Delivery (POD)', meta: 'Pending', ready: false },
    ],
    chat: [
      { dir: 'in', text: 'ETA update needed, delivery window closes at 15:00', time: 'Aug 18, 13:40' },
      { dir: 'out', text: 'Running 2h behind due to I-94 traffic, will call ahead', time: 'Aug 18, 13:52' },
    ],
    hosAlert: 'Load #4473 to Detroit, MI is running 2h 10m behind schedule',
  },
  {
    id: '4474', origin: 'Phoenix, AZ', destination: 'Denver, CO', broker: 'Landstar', rate: 2140, status: 'ontime',
    distance: '862 mi', pickup: 'Aug 19, 06:00', delivery: 'Aug 21, 11:00', weight: '31,200 lbs', equipmentType: 'flatbed', equipmentLength: '48ft',
    driver: { name: 'Raj Malhotra', cdl: 'CDL-A · AZ-71204', hos: '11h 00m HOS' },
    progress: 35, eta: 'ETA 1d 4h',
    timeline: [
      { label: 'Booked', time: 'Aug 17, 15:30', state: 'done' },
      { label: 'Dispatched', time: 'Aug 19, 06:00', state: 'done' },
      { label: 'In Transit', time: 'Now — 35%', state: 'current' },
      { label: 'Delivered', time: 'ETA 1d 4h', state: 'pending' },
    ],
    documents: [
      { name: 'Rate Confirmation', meta: 'PDF · 260 KB', ready: true },
      { name: 'Bill of Lading (BOL)', meta: 'PDF · 190 KB', ready: true },
      { name: 'Proof of Delivery (POD)', meta: 'Pending', ready: false },
    ],
    chat: [
      { dir: 'in', text: 'Load #4474 booked at $2,140, flatbed tarps included', time: 'Aug 17, 15:32' },
      { dir: 'out', text: 'Confirmed, driver Raj Malhotra assigned', time: 'Aug 17, 16:10' },
    ],
    hosAlert: null,
  },
  {
    id: '4475', origin: 'Houston, TX', destination: 'New Orleans, LA', broker: 'XPO Logistics', rate: 1050, status: 'neutral',
    distance: '348 mi', pickup: 'Aug 20, 09:00', delivery: 'Aug 21, 08:00', weight: '17,850 lbs', equipmentType: 'dry-van', equipmentLength: '53ft',
    driver: null,
    progress: 0, eta: 'Awaiting dispatch',
    timeline: [
      { label: 'Booked', time: 'Aug 19, 16:45', state: 'done' },
      { label: 'Dispatched', time: 'Pending', state: 'pending' },
      { label: 'In Transit', time: 'Pending', state: 'pending' },
      { label: 'Delivered', time: 'Pending', state: 'pending' },
    ],
    documents: [
      { name: 'Rate Confirmation', meta: 'PDF · 205 KB', ready: true },
      { name: 'Bill of Lading (BOL)', meta: 'Pending', ready: false },
      { name: 'Proof of Delivery (POD)', meta: 'Pending', ready: false },
    ],
    chat: [
      { dir: 'in', text: 'Load #4475 confirmed, needs a driver assigned by tonight', time: 'Aug 19, 16:47' },
    ],
    hosAlert: null,
  },
  {
    id: '4468', origin: 'Seattle, WA', destination: 'Portland, OR', broker: 'Coyote Logistics', rate: 720, status: 'done',
    distance: '174 mi', pickup: 'Aug 17, 08:00', delivery: 'Aug 17, 13:00', weight: '14,600 lbs', equipmentType: 'step-deck', equipmentLength: '48ft',
    driver: { name: 'James Kim', cdl: 'CDL-A · WA-40317', hos: '9h 40m HOS' },
    progress: 100, eta: 'Delivered on time',
    timeline: [
      { label: 'Booked', time: 'Aug 16, 10:00', state: 'done' },
      { label: 'Dispatched', time: 'Aug 17, 08:00', state: 'done' },
      { label: 'In Transit', time: 'Aug 17, 12:40', state: 'done' },
      { label: 'Delivered', time: 'Aug 17, 13:00', state: 'done' },
    ],
    documents: [
      { name: 'Rate Confirmation', meta: 'PDF · 175 KB', ready: true },
      { name: 'Bill of Lading (BOL)', meta: 'PDF · 140 KB', ready: true },
      { name: 'Proof of Delivery (POD)', meta: 'PDF · 95 KB', ready: true },
    ],
    chat: [
      { dir: 'in', text: 'Delivered and signed at 13:00, POD attached', time: 'Aug 17, 13:04' },
      { dir: 'out', text: 'Confirmed, thanks for the quick turnaround', time: 'Aug 17, 13:10' },
    ],
    hosAlert: null,
  },
]

// `drivers`, `stats`, `onTimeTrend` and `utilizationTrend` were removed
// here (C13): Drivers.jsx/DriverDetail.jsx/Dashboard.jsx now read drivers
// and dashboard stats from the real API (api/drivers.js, api/stats.js).

export const brokerChats = [
  {
    id: 'xpo', name: 'XPO Logistics', initials: 'XL', online: true,
    messages: [
      { dir: 'in', text: 'Load #4471 confirmed, rate $1,850', time: 'Aug 18, 09:14', loadId: '4471' },
      { dir: 'out', text: 'Got it, driver assigned', time: 'Aug 18, 09:20', loadId: '4471' },
      { dir: 'in', text: 'Confirming pickup time is unchanged', time: 'Aug 19, 07:10', loadId: '4471' },
      { dir: 'out', text: 'Yes, 08:00 as planned', time: 'Aug 19, 07:15', loadId: '4471' },
      { dir: 'in', text: 'Load #4475 confirmed, needs a driver assigned by tonight', time: 'Aug 19, 16:47', loadId: '4475' },
    ],
  },
  {
    id: 'coyote', name: 'Coyote Logistics', initials: 'CL', online: true,
    messages: [
      { dir: 'in', text: 'Reefer set to 34°F, please confirm', time: 'Aug 19, 09:50', loadId: '4472' },
      { dir: 'out', text: 'Confirmed, temp holding at 34°F', time: 'Aug 19, 10:05', loadId: '4472' },
      { dir: 'in', text: 'Coyote Logistics is waiting on a response — 12 min', time: 'Aug 19, 10:41', loadId: '4472' },
      { dir: 'in', text: 'Delivered and signed at 13:00, POD attached', time: 'Aug 17, 13:04', loadId: '4468' },
      { dir: 'out', text: 'Confirmed, thanks for the quick turnaround', time: 'Aug 17, 13:10', loadId: '4468' },
    ],
  },
  {
    id: 'tql', name: 'TQL', initials: 'TQ', online: false,
    messages: [
      { dir: 'in', text: 'ETA update needed, delivery window closes at 15:00', time: 'Aug 18, 13:40', loadId: '4473' },
      { dir: 'out', text: 'Running 2h behind due to I-94 traffic, will call ahead', time: 'Aug 18, 13:52', loadId: '4473' },
    ],
  },
  {
    id: 'landstar', name: 'Landstar', initials: 'LS', online: false,
    messages: [
      { dir: 'in', text: 'Load #4474 booked at $2,140, flatbed tarps included', time: 'Aug 17, 15:32', loadId: '4474' },
      { dir: 'out', text: 'Confirmed, driver Raj Malhotra assigned', time: 'Aug 17, 16:10', loadId: '4474' },
    ],
  },
]

export const alertQueue = [
  {
    id: 'a1',
    severity: 'warning',
    type: 'Route',
    title: 'Route deviation',
    description: 'Load #4472 deviated from planned route on I-75 N. Driver rerouted via US-41.',
    loadId: '4472',
    time: '07:22 AM',
  },
  {
    id: 'a2',
    severity: 'critical',
    type: 'HOS',
    title: 'HOS limit approaching',
    description: 'Driver #114 (Elena Petrova) has 45 minutes left before mandatory rest.',
    loadId: '4472',
    time: '08:05 AM',
  },
  {
    id: 'a3',
    severity: 'critical',
    type: 'Delay',
    title: 'Delivery delayed',
    description: 'Load #4473 to Detroit, MI is running 2h 10m behind schedule.',
    loadId: '4473',
    time: '13:52 PM',
  },
  {
    id: 'a4',
    severity: 'warning',
    type: 'Document',
    title: 'BOL missing',
    description: 'Load #4475 has not received a signed Bill of Lading — pickup is tomorrow at 09:00.',
    loadId: '4475',
    time: '04:10 PM',
  },
  {
    id: 'a5',
    severity: 'warning',
    type: 'Fuel',
    title: 'Low fuel level',
    description: 'Unit T-118 (Marcus Webb) is at 18% fuel with 240 mi left to Memphis, TN.',
    loadId: '4471',
    time: '09:30 AM',
  },
  {
    id: 'a6',
    severity: 'critical',
    type: 'Broker',
    title: 'Broker awaiting response',
    description: 'Coyote Logistics is waiting on rate confirmation for load #4472 — 12 min unanswered.',
    loadId: '4472',
    time: '10:41 AM',
  },
]

export const activityFeed = [
  { id: 'e1', text: 'Load #4471 marked on time at Memphis, TN', time: '08:41 AM' },
  { id: 'e2', text: 'Driver Marcus Webb fueled at Texarkana, TX — 62 gal', time: '07:58 AM' },
  { id: 'e3', text: 'Load #4472 departed Atlanta, GA', time: '07:12 AM' },
  { id: 'e4', text: 'Broker XPO Logistics confirmed rate for load #4475', time: '06:44 AM' },
  { id: 'e5', text: 'Driver Raj Malhotra came on duty — Dallas, TX yard', time: '06:15 AM' },
]

export const trackedShipment = {
  loadId: '4471',
  unit: 'Freightliner — T-118',
  distance: '612.4 mi',
  commodity: 'Packaged Electronics',
  weight: '18,400 lbs',
  dimensions: '48 x 8.5 ft',
  status: 'In Transit',
  customer: 'XPO Logistics',
  arrival: '21 Aug 2026, 14:00',
  driver: {
    name: 'Marcus Webb',
    role: 'Assigned driver',
  },
  waypoints: [
    { label: 'Loaded at origin', place: 'Dallas, TX', time: '19 Aug 2026, 06:10', state: 'done' },
    { label: 'Departure waypoint', place: 'Shreveport, LA', time: '19 Aug 2026, 11:40', state: 'done' },
    { label: 'Arrival waypoint', place: 'Memphis, TN', time: '21 Aug 2026, 14:00', state: 'pending' },
  ],
}

export const trackingHistory = [
  { id: '4468', dimensions: '40 x 8 ft', weight: '16,200 lbs', route: 'Fort Worth → Tulsa', arrival: '15 Aug 2026, 18:20', customer: 'TQL', status: 'ontime' },
  { id: '4459', dimensions: '48 x 8.5 ft', weight: '21,000 lbs', route: 'Laredo → San Antonio', arrival: '12 Aug 2026, 09:05', customer: 'Landstar', status: 'ontime' },
  { id: '4447', dimensions: '45 x 8 ft', weight: '19,850 lbs', route: 'Memphis → Nashville', arrival: '08 Aug 2026, 22:40', customer: 'Coyote Logistics', status: 'crit' },
  { id: '4432', dimensions: '48 x 8.5 ft', weight: '17,300 lbs', route: 'Dallas → Houston', arrival: '03 Aug 2026, 13:15', customer: 'XPO Logistics', status: 'ontime' },
]

export const complianceDocuments = [
  { id: 'cd1', name: 'CDL — Marcus Webb', category: 'Driver', type: 'PDF', size: '310 KB', status: 'ready', updated: 'Jan 4, 2026', expires: 'Jun 2028' },
  { id: 'cd2', name: 'CDL — Elena Petrova', category: 'Driver', type: 'PDF', size: '295 KB', status: 'ready', updated: 'Feb 11, 2026', expires: 'Nov 2027' },
  { id: 'cd3', name: 'CDL — Devon Carter', category: 'Driver', type: 'PDF', size: '288 KB', status: 'expiring', updated: 'Mar 2, 2025', expires: 'Sep 2026' },
  { id: 'cd4', name: 'Medical Certificate — Raj Malhotra', category: 'Driver', type: 'PDF', size: '150 KB', status: 'ready', updated: 'May 18, 2026', expires: 'May 2028' },
  { id: 'cd5', name: 'Motor Carrier Authority (MC-771204)', category: 'Company', type: 'PDF', size: '410 KB', status: 'ready', updated: 'Jan 1, 2026', expires: 'Jan 2027' },
  { id: 'cd6', name: 'Certificate of Insurance', category: 'Company', type: 'PDF', size: '520 KB', status: 'ready', updated: 'Jan 1, 2026', expires: 'Jan 2027' },
  { id: 'cd7', name: 'IFTA Fuel Tax Report — Q2 2026', category: 'Company', type: 'PDF', size: '180 KB', status: 'ready', updated: 'Jul 15, 2026', expires: null },
  { id: 'cd8', name: 'IRP Cab Card — Unit T-118', category: 'Equipment', type: 'PDF', size: '95 KB', status: 'ready', updated: 'Jan 1, 2026', expires: 'Dec 2026' },
]

export const dispatchRating = {
  overall: 4.8,
  scale: 5,
  totalReviews: 47,
  period: 'Last 30 days',
  breakdown: [
    { label: 'On-time delivery', value: 96, unit: '%', tone: 'green' },
    { label: 'Communication response', value: 92, unit: '%', tone: 'blue' },
    { label: 'Load acceptance rate', value: 88, unit: '%', tone: 'amber' },
    { label: 'HOS / safety compliance', value: 100, unit: '%', tone: 'green' },
  ],
  trend: [
    { month: 'Mar', score: 4.5 },
    { month: 'Apr', score: 4.6 },
    { month: 'May', score: 4.6 },
    { month: 'Jun', score: 4.7 },
    { month: 'Jul', score: 4.7 },
    { month: 'Aug', score: 4.8 },
  ],
  reviews: [
    { broker: 'XPO Logistics', score: 5, text: 'Great communication, load delivered ahead of schedule.', loadId: '4471', date: 'Aug 20, 2026' },
    { broker: 'Coyote Logistics', score: 4, text: 'Solid handling of the reefer load, minor delay on pickup confirmation.', loadId: '4472', date: 'Aug 19, 2026' },
    { broker: 'Landstar', score: 5, text: 'Flatbed tarping was handled professionally, no issues in transit.', loadId: '4474', date: 'Aug 17, 2026' },
    { broker: 'TQL', score: 3, text: 'Load ran behind schedule, would like earlier status updates next time.', loadId: '4473', date: 'Aug 18, 2026' },
  ],
}
