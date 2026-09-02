// Thin layer over api/client.js for /hr. Applicant list is paginated;
// each function accepts an AbortSignal as its last argument.
import { api } from './client'

export function listApplicants(params = {}, signal) {
  const qs = new URLSearchParams()
  if (params.cdlClass) qs.set('cdlClass', params.cdlClass)
  if (params.homeBaseState) qs.set('homeBaseState', params.homeBaseState)
  if (params.minYearsExperience) qs.set('minYearsExperience', params.minYearsExperience)
  if (params.desiredEquipment) qs.set('desiredEquipment', params.desiredEquipment)
  if (params.sort) qs.set('sort', params.sort)
  if (params.page) qs.set('page', params.page)
  if (params.limit) qs.set('limit', params.limit)
  const query = qs.toString()
  return api.get(`/hr/applicants${query ? '?' + query : ''}`, { auth: true, signal })
}

export function getApplicant(id, signal) {
  return api.get(`/hr/applicants/${encodeURIComponent(id)}`, { auth: true, signal })
}

export function hireApplicant(id, signal) {
  return api.post(`/hr/applicants/${encodeURIComponent(id)}/hire`, {}, { auth: true, signal })
}
