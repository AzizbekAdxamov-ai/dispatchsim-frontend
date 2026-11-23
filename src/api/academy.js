// Thin layer over api/client.js for /academy. Student calls first, then the
// mentor calls (the server refuses those for anyone who is not a mentor).
import { api } from './client'
import { readAfterSaves, trackSave } from '../data/academyPending'

const opts = (signal) => ({ auth: true, signal })

// Waits (at most a few seconds) for uploads still in flight so the list never reads stale progress.
export function getAcademyMe(signal) {
  return readAfterSaves(() => api.get('/academy/me', opts(signal)))
}

export function saveProgress(lessonNo, body, signal) {
  return trackSave(api.put(`/academy/progress/${encodeURIComponent(lessonNo)}`, body, opts(signal)))
}

export function askAdvisor(lessonNo, message, signal) {
  return api.post('/academy/advisor', { lessonNo, message }, opts(signal))
}

export function listCohorts(signal) {
  return api.get('/academy/mentor/cohorts', opts(signal))
}

export function createCohort(body, signal) {
  return api.post('/academy/mentor/cohorts', body, opts(signal))
}

export function addMember(cohortId, email, signal) {
  return api.post(`/academy/mentor/cohorts/${encodeURIComponent(cohortId)}/members`, { email }, opts(signal))
}

export function getCohortStudents(cohortId, signal) {
  return api.get(`/academy/mentor/cohorts/${encodeURIComponent(cohortId)}/students`, opts(signal))
}

export function getStudent(studentId, signal) {
  return api.get(`/academy/mentor/students/${encodeURIComponent(studentId)}`, opts(signal))
}

export function addNote(studentId, body, signal) {
  return api.post(`/academy/mentor/students/${encodeURIComponent(studentId)}/notes`, body, opts(signal))
}
