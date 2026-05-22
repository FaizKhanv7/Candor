// ─── Guest Session (localStorage) ────────────────────────────────────────────
// Unauthenticated users accumulate messages here. On sign-in the host page
// reads this, passes them into the authenticated chat state, then clears it.

export const GUEST_SESSION_KEY = 'candor_guest_session';

export interface GuestMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface GuestSession {
  messages: GuestMessage[];
}

export function getGuestSession(): GuestSession {
  return { messages: [] };
}

export function setGuestSession(session: GuestSession): void {
  // Disallowed: signed out chats should not save to localStorage
}

export function clearGuestSession(): void {
  // Disallowed: signed out chats should not save to localStorage
}

// ─── Guest Modal State (sessionStorage) ──────────────────────────────────────
// Controls how often the sign-in modal re-surfaces within a browser session.
//
// Phase lifecycle:
//   unseen           → modal triggers at messageCount ≥ 2
//   dismissed-once   → modal triggers again at nextShowAt
//   done             → modal never shows again this session

export const MODAL_STATE_KEY = 'candor_modal_state';

export type ModalPhase =
  | { phase: 'unseen' }
  | { phase: 'dismissed-once'; nextShowAt: number }
  | { phase: 'done' };

export function getModalPhase(): ModalPhase {
  if (typeof window === 'undefined') return { phase: 'unseen' };
  try {
    const raw = sessionStorage.getItem(MODAL_STATE_KEY);
    return raw ? (JSON.parse(raw) as ModalPhase) : { phase: 'unseen' };
  } catch {
    return { phase: 'unseen' };
  }
}

function setModalPhase(phase: ModalPhase): void {
  try {
    sessionStorage.setItem(MODAL_STATE_KEY, JSON.stringify(phase));
  } catch {}
}

/** Returns true when the modal should appear given the current sent-message count. */
export function shouldShowModal(sentCount: number): boolean {
  const mp = getModalPhase();
  if (mp.phase === 'done') return false;
  if (mp.phase === 'unseen') return sentCount >= 2;
  return sentCount >= mp.nextShowAt;
}

/** Call when the user clicks "Continue without saving". */
export function recordModalDismissal(currentSentCount: number): void {
  const mp = getModalPhase();
  if (mp.phase === 'done') return;
  if (mp.phase === 'unseen') {
    setModalPhase({ phase: 'dismissed-once', nextShowAt: currentSentCount + 3 });
  } else {
    // Second dismissal — never show again this session
    setModalPhase({ phase: 'done' });
  }
}
