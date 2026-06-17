/* Tuotteen kuvat (Gainly-appi) + Unsplash-coachikuvat. */
const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`

// Tuote-screenshotit (public/)
export const heroPhoto = '/dashboard.png'
export const benefitProgramming = '/editor.png'
export const benefitProgress = '/clients.png'
export const benefitMessaging = '/messages.png'

// Coach-karuselli (Unsplash väliaikaisesti)
export const coachA = u('1571019613454-1cb2f99b2d8b')
export const coachB = u('1534438327276-14e5300c3a48')
export const coachC = u('1599058917212-d750089bc07e')
export const coachD = u('1546483875-ad9014c88eba')
export const coachE = u('1517344884509-a0c97ec11bcc')
