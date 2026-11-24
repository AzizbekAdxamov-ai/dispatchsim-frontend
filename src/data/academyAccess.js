// Who may see the Academy, and what the invite-only state says.
// Pure: the pages and the sidebar both read it, and the tests import it.
export const ACADEMY_COPY = {
  inviteOnly: 'Academy faqat taklif qilingan o‘quvchilar uchun',
  inviteOnlyHint: 'Mentoringizga murojaat qiling.',
  loadFailed: 'Ma‘lumotni yuklab bo‘lmadi. Qayta urinib ko‘ring.',
}

// The server decides (academyAccess); mentor/admin stay as a fallback for
// an older /auth/me answer. A plain role never opens the Academy.
export function hasAcademyAccess(user) {
  return user?.academyAccess === true || user?.isMentor === true || user?.isAdmin === true
}

export function canTeachClass(user) {
  return user?.isMentor === true || user?.isAdmin === true
}

// 'forbidden' = not invited (a neutral state); 'failed' = something broke.
export function academyLoadError(err) {
  return err?.code === 'FORBIDDEN' ? 'forbidden' : 'failed'
}
