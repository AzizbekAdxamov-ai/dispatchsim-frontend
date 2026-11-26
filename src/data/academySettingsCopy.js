// Uzbek words for the Academy's Settings page. Same keys as
// ACCOUNT_SETTINGS_COPY and PASSWORD_COPY (English), so the shared
// AccountSettings component renders either without knowing the language.

export const ACADEMY_SETTINGS_COPY = {
  title: 'Sozlamalar',
  sub: 'Profil, ko‘rinish va hisobingizni boshqaring',
  profile: 'Profil',
  fullName: 'To‘liq ism',
  namePlaceholder: 'To‘liq ism',
  email: 'Kirish emaili',
  company: 'Kompaniya / jamoa nomi',
  companyPlaceholder: 'Kompaniya nomi',
  workspaces: 'Ish joylari',
  workspacesNoteSingle: 'Qaysi ish joylari ochiq ekanini administrator belgilaydi.',
  workspacesNoteSeveral: 'Birini tanlasangiz, o‘sha ish joyi ochiladi.',
  appearance: 'Ko‘rinish',
  theme: 'Mavzu',
  themeDesc: 'Qorong‘i va yorug‘ ko‘rinish o‘rtasida almashtiring',
  dark: 'Qorong‘i',
  light: 'Yorug‘',
  account: 'Hisob',
  signOut: 'Chiqish',
  signOutDesc: 'Shu qurilmadagi seansni tugatish',
  unnamed: 'Ismsiz foydalanuvchi',
  roleStudent: 'O‘quvchi',
  roleMentor: 'Mentor',
}

export const PASSWORD_COPY_UZ = {
  title: 'Parol',
  currentLabel: 'Joriy parol',
  newLabel: 'Yangi parol',
  hint: 'Kamida 8 ta belgi.',
  button: 'Parolni yangilash',
  buttonBusy: 'Yangilanmoqda…',
  success: 'Parol yangilandi.',
  mustChangeNotice: 'Administrator vaqtinchalik parol o‘rnatgan. Quyida yangi parol tanlang.',
  errors: {
    missingCurrent: 'Joriy parolni kiriting.',
    tooShort: 'Yangi parol kamida 8 ta belgidan iborat bo‘lsin.',
    tooLong: 'Yangi parol ko‘pi bilan 72 ta belgidan iborat bo‘lsin.',
    same: 'Yangi parol joriy paroldan farq qilsin.',
    CURRENT_PASSWORD_WRONG: 'Joriy parol noto‘g‘ri.',
    PASSWORD_UNCHANGED: 'Yangi parol joriy paroldan farq qilsin.',
    RATE_LIMITED: 'Juda ko‘p urinish. Bir necha daqiqadan keyin qayta urinib ko‘ring.',
    VALIDATION_ERROR: 'Yangi parol 8 dan 72 gacha belgidan iborat bo‘lsin.',
    NETWORK_ERROR: 'Serverga ulanib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.',
    unknown: 'Nimadir xato ketdi. Qayta urinib ko‘ring.',
  },
}
