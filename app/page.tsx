'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChatInterface, { type Message } from '@/components/ChatInterface';
import GuestModal from '@/components/GuestModal';
import DisclaimerModal from '@/components/DisclaimerModal';
import WrapUpModal from '@/components/WrapUpModal';
import SummaryErrorModal from '@/components/SummaryErrorModal';
import BreathingOrb, { type OrbState } from '@/components/BreathingOrb';
import QuietGarden from '@/components/QuietGarden';
import {
  clearGuestSession,
  getGuestSession,
  setGuestSession,
  shouldShowModal,
} from '@/lib/guest';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#281f41]">
        <div className="w-6 h-6 rounded-full border-2 border-[#9882bd] border-t-transparent animate-spin" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeView = searchParams.get('view') || 'chat';

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [showModal, setShowModal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [aiResponseCount, setAiResponseCount] = useState(0);
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [showWrapUpModal, setShowWrapUpModal] = useState(false);
  const [showSummaryErrorModal, setShowSummaryErrorModal] = useState(false);

  // ref so the orb-idle reset timer can be cancelled on the next send
  const orbResetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // ref to detect a sign-in transition (null → userId)
  const prevUserIdRef = useRef<string | null>(null);
  // memory: inactivity timer + once-per-session guard
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const summarizedRef = useRef(false);
  // tracking refs so beforeunload/timer callbacks always read fresh state
  const messagesRef = useRef(messages);
  const sessionRef = useRef(session);
  const sessionIdRef = useRef(sessionId);
  const isLoadingRef = useRef(isLoading);

  // ── Keep tracking refs current ────────────────────────────────────────────
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // ── Hydrate from localStorage after mount ──────────────────────────────────
  useEffect(() => {
    const idKey = 'candor_session_id';
    let id = localStorage.getItem(idKey);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(idKey, id);
    }
    setSessionId(id);

    const guest = getGuestSession();
    if (guest.messages.length > 0) {
      setMessages(guest.messages as Message[]);
    }
  }, []);

  // ── Event listeners for sidebar integration ────────────────────────────────
  useEffect(() => {
    const handleNewChatEvent = () => {
      summarizeSession();
      setMessages([]);
      setOrbState('idle');
      setAiResponseCount(0);
      setShowWrapUp(false);
      const newId = crypto.randomUUID();
      localStorage.setItem('candor_session_id', newId);
      setSessionId(newId);
      summarizedRef.current = false;
    };

    const triggerGuestModal = () => setShowModal(true);

    window.addEventListener('new-chat', handleNewChatEvent);
    window.addEventListener('show-guest-modal', triggerGuestModal);

    return () => {
      window.removeEventListener('new-chat', handleNewChatEvent);
      window.removeEventListener('show-guest-modal', triggerGuestModal);
    };
  }, []);

  // ── Migrate guest messages when user signs in ──────────────────────────────
  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;
    const prevUserId = prevUserIdRef.current;

    if (currentUserId && !prevUserId) {
      const guest = getGuestSession();
      if (guest.messages.length > 0) {
        setMessages((prev) => {
          const guestMsgs = guest.messages as Message[];
          const guestIds = new Set(guestMsgs.map((m) => m.id));
          const extras = prev.filter((m) => !guestIds.has(m.id));
          return [...guestMsgs, ...extras];
        });
        clearGuestSession();
      }
    }

    prevUserIdRef.current = currentUserId;
  }, [session]);

  // ── Session memory summarization ──────────────────────────────────────────
  const summarizeSession = useCallback(() => {
    if (summarizedRef.current) return;
    if (isLoadingRef.current) return;
    if (!sessionRef.current?.user?.id) return;
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) return;
    const msgs = messagesRef.current;
    if (msgs.filter((m) => m.role === 'user').length < 2) return;

    summarizedRef.current = true;

    const body = JSON.stringify({
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
      sessionId: currentSessionId,
    });
    navigator.sendBeacon(
      '/api/memory/summarize',
      new Blob([body], { type: 'application/json' })
    );
  }, []); // empty deps — reads only from refs

  // Fire summarize when the tab is closed
  useEffect(() => {
    window.addEventListener('beforeunload', summarizeSession);
    return () => window.removeEventListener('beforeunload', summarizeSession);
  }, [summarizeSession]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(orbResetRef.current);
      clearTimeout(inactivityRef.current);
    };
  }, []);

  // ── Send message & stream AI response ──────────────────────────────────────
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!sessionId) return; // not hydrated yet
      if (showWrapUp) return;  // wait for user to end or continue

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);

      // Show disclaimer once per browser session on the very first message
      const userMsgsBefore = messages.filter((m) => m.role === 'user').length;
      if (userMsgsBefore === 0 && !sessionStorage.getItem('candor_disclaimer_shown')) {
        setShowDisclaimer(true);
      }

      // Guest-only: persist + check modal threshold
      if (!session) {
        setGuestSession({ messages: updatedMessages });
        const sentCount = updatedMessages.filter((m) => m.role === 'user').length;
        if (shouldShowModal(sentCount)) setShowModal(true);
      }

      // Kick off orb thinking state, cancelling any pending idle reset / inactivity timer
      clearTimeout(orbResetRef.current);
      clearTimeout(inactivityRef.current);
      setIsLoading(true);
      setOrbState('thinking');

      // Placeholder message for streaming-in AI content
      const aiId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: '' }]);

      // 5th, 10th, 15th... AI response becomes a wrap-up
      const isNextWrapUp = (aiResponseCount + 1) % 5 === 0;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
            sessionId,
            isWrapUp: isNextWrapUp,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({})) as { error?: string; code?: string };
          if (res.status === 429 && errBody.code === 'RATE_LIMIT_EXCEEDED') {
            if (!session) {
              setMessages((prev) => prev.filter((m) => m.id !== aiId));
              setShowModal(true);
            } else {
              const errorText = errBody.error ?? "You've reached your daily message limit. Come back tomorrow.";
              setMessages((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, content: errorText } : m))
              );
            }
            return;
          }
          const errorText = errBody.error ?? 'Something went wrong. Please try again.';
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: errorText } : m))
          );
          return;
        }

        // Read the plain-text stream chunk by chunk
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: snapshot } : m))
          );
        }

        // Brief bloom animation on the orb, then fade back to idle
        setOrbState('responding');
        orbResetRef.current = setTimeout(() => setOrbState('idle'), 1100);

        // Track AI response count; show wrap-up card every 10 responses
        const nextCount = aiResponseCount + 1;
        setAiResponseCount(nextCount);
        if (nextCount % 5 === 0) {
          setShowWrapUp(true);
        }

        // Start 30-min inactivity window — fires summarizeSession if idle
        inactivityRef.current = setTimeout(summarizeSession, 30 * 60 * 1000);

        // Persist final state for guests (includes the full AI reply)
        if (!session) {
          setMessages((prev) => {
            setGuestSession({ messages: prev });
            return prev;
          });
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, content: "I couldn't connect right now. Please try again." }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        // Only snap back to idle if we never made it to the responding bloom
        setOrbState((prev) => (prev === 'thinking' ? 'idle' : prev));
      }
    },
    [messages, session, sessionId, summarizeSession, aiResponseCount, showWrapUp]
  );

  const sentCount = messages.filter((m) => m.role === 'user').length;

  const handleAcknowledgeDisclaimer = () => {
    sessionStorage.setItem('candor_disclaimer_shown', '1');
    setShowDisclaimer(false);
  };

  const handleEndConversation = useCallback(() => {
    const msgs = messagesRef.current;
    const sid = sessionIdRef.current;
    if (
      !summarizedRef.current &&
      !isLoadingRef.current &&
      sessionRef.current?.user?.id &&
      sid &&
      msgs.filter((m) => m.role === 'user').length >= 2
    ) {
      summarizedRef.current = true;
      fetch('/api/memory/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          sessionId: sid,
        }),
        keepalive: true,
      })
        .then((res) => { if (!res.ok) setShowSummaryErrorModal(true); })
        .catch(() => setShowSummaryErrorModal(true));
    }
    setMessages([]);
    setOrbState('idle');
    setAiResponseCount(0);
    setShowWrapUp(false);
    summarizedRef.current = false;
    const newId = crypto.randomUUID();
    localStorage.setItem('candor_session_id', newId);
    setSessionId(newId);
    setShowWrapUpModal(true);
  }, []);

  const handleContinueConversation = useCallback(() => {
    setShowWrapUp(false);
  }, []);

  return (
    <>
      {activeView === 'garden' ? (
        <QuietGarden />
      ) : activeView === 'breathing' ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#281f41] text-white select-none">
          <div className="max-w-md w-full text-center space-y-8 flex flex-col items-center justify-center">
            <div className="space-y-3">
              <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-wide">
                Breathing Space
              </h1>
              <p className="text-sm sm:text-base text-[#dcd6eb] max-w-sm mx-auto leading-relaxed">
                Take a moment to align your body and mind. Follow the expansion and contraction of the orb using the 4-7-8 method.
              </p>
            </div>

            <div className="py-12 relative flex items-center justify-center">
              <BreathingOrb state="breathing" />
            </div>
          </div>
        </div>
      ) : (
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          orbState={orbState}
          isLoading={isLoading}
          showWrapUp={showWrapUp}
          onEndConversation={handleEndConversation}
          onContinueConversation={handleContinueConversation}
        />
      )}
      <DisclaimerModal
        isOpen={showDisclaimer}
        onAcknowledge={handleAcknowledgeDisclaimer}
      />
      <GuestModal
        isOpen={showModal && !session}
        sentCount={sentCount}
        onDismiss={() => setShowModal(false)}
      />
      <WrapUpModal
        isOpen={showWrapUpModal}
        onClose={() => setShowWrapUpModal(false)}
      />
      <SummaryErrorModal
        isOpen={showSummaryErrorModal}
        onClose={() => setShowSummaryErrorModal(false)}
      />
    </>
  );
}
