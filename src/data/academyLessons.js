// The twelve lessons, in one place. `exits` are the seven checkpoints each
// lesson page records (same keys the lesson files write to localStorage).
// simulatorPath: where the dispatch workspace practises that lesson; a few
// are approximate, there is no screen built for exactly that topic yet.

export const EXITS_PER_LESSON = 7
export const LESSON_COUNT = 12
export const WEEK_COUNT = 6

const BOARD = { simulatorPath: '/load-board', simulatorLabel: 'Open the load board' }
const DRIVERS = { simulatorPath: '/drivers', simulatorLabel: 'Open drivers' }
const LOADS = { simulatorPath: '/loads', simulatorLabel: 'Open loads' }

export const ACADEMY_LESSONS = [
  { no: 1, week: 1, title: 'Bitta yuk — bir jamoa', minutes: 110, ...BOARD, exits: ['story', 'roles', 'life', 'case', 'talk', 'quiz', 'app'] },
  { no: 2, week: 1, title: 'Truck bu yukni ola oladimi?', minutes: 100, ...BOARD, exits: ['story', 'types', 'weight', 'haul', 'talk', 'quiz', 'app'] },
  { no: 3, week: 2, title: 'Xavfsiz va qonuniy', minutes: 110, ...DRIVERS, exits: ['story', 'hos', 'eld', 'plan', 'insp', 'talk', 'app'] },
  { no: 4, week: 2, title: 'Fleet va texnik xizmat', minutes: 105, ...DRIVERS, exits: ['story', 'pm', 'break', 'fuel', 'insp', 'talk', 'app'] },
  { no: 5, week: 3, title: 'Bozor va narx', minutes: 110, ...BOARD, exits: ['story', 'spot', 'lane', 'broker', 'price', 'talk', 'app'] },
  { no: 6, week: 3, title: 'Load board va bozor', minutes: 120, ...BOARD, exits: ['story', 'board', 'rate', 'search', 'safe', 'talk', 'app'] },
  { no: 7, week: 4, title: 'Narxlash va foyda', minutes: 130, ...BOARD, exits: ['story', 'cost', 'load', 'week', 'floor', 'talk', 'app'] },
  { no: 8, week: 4, title: 'Muzokara va broker', minutes: 125, ...BOARD, exits: ['story', 'nums', 'lang', 'sim', 'pos', 'talk', 'app'] },
  { no: 9, week: 5, title: 'Dispatch operatsiyalari', minutes: 130, ...LOADS, exits: ['story', 'flow', 'rc', 'day', 'pay', 'talk', 'app'] },
  { no: 10, week: 5, title: 'Rejalash va strategiya', minutes: 130, simulatorPath: '/routes', simulatorLabel: 'Open the route planner', exits: ['story', 'trip', 'chain', 'zone', 'hos', 'talk', 'app'] },
  { no: 11, week: 6, title: 'Muammolar va muloqot', minutes: 130, ...LOADS, exits: ['story', 'break', 'late', 'cancel', 'hard', 'talk', 'app'] },
  { no: 12, week: 6, title: 'Yakuniy amaliyot', minutes: 130, simulatorPath: '/', simulatorLabel: 'Open the workspace', exits: ['story', 'sim', 'exa', 'exb', 'calc', 'talk', 'app'] },
]

export function lessonByNo(no) {
  return ACADEMY_LESSONS.find((l) => l.no === no) ?? null
}

export function lessonFile(no) {
  return `/course/lesson-${String(no).padStart(2, '0')}.html`
}
