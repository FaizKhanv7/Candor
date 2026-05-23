'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Mic, MicOff } from 'lucide-react';
import BreathingOrb, { type OrbState } from './BreathingOrb';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  orbState: OrbState;
  isLoading: boolean;
  showWrapUp?: boolean;
  onEndConversation?: () => void;
  onContinueConversation?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// 5 lines × 24px line-height + 24px vertical padding
const TEXTAREA_MAX_HEIGHT = 144;

const WELCOME_PROMPTS = [
  "What's on your mind?",
  "Relax, tell me what happened.",
  "I'm here. What's going on?",
  "This is your space. What's on your heart?",
  "What's been weighing on you lately?",
  "Let it out. I'm listening.",
  "How are you really feeling today?",
  "Take your time. I'm not going anywhere.",
  "Whatever it is, you can share it here.",
  "Hey. How are you holding up?",
];

const QUICK_PROMPTS = [
  { label: "Reflect on my day", text: "I want to reflect on how today went. Here is what happened..." },
  { label: "Help me relax", text: "I'm feeling a bit anxious or stressed. Can you guide me through a grounding or relaxation exercise?" },
  { label: "Let it all out", text: "I just need to vent about something that's weighing on me..." },
  { label: "Breathing exercise", text: "Let's do a quick breathing exercise to center myself." }
];

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end mb-3"
      >
        <div
          className="max-w-[80%] text-[17px] leading-[1.75] px-[20px] py-3.5 rounded-[22px]"
          style={{ background: 'var(--user-bubble)', color: 'var(--text-primary)' }}
        >
          {message.content}
        </div>
      </motion.div>
    );
  }

  // Find the last sentence boundary (scan backwards for [.!?] followed by whitespace/newline)
  const trimmed = message.content.trimEnd();
  let splitIndex = -1;
  for (let i = trimmed.length - 2; i >= 1; i--) {
    if (/[.!?]/.test(trimmed[i]) && /[\s\n]/.test(trimmed[i + 1])) {
      splitIndex = i + 1;
      break;
    }
  }

  const mainContent = splitIndex > 0 ? message.content.slice(0, splitIndex) : '';
  const lastSentence = splitIndex > 0 ? trimmed.slice(splitIndex).trimStart() : trimmed;

  const renderLines = (text: string, highlighted: boolean, prefix: string) =>
    text.split('\n').map((line, idx) => {
      if (line.trim() === '') return <div key={`${prefix}-${idx}`} className="h-2" />;
      return (
        <p
          key={`${prefix}-${idx}`}
          style={{
            color: highlighted ? 'var(--accent-purple-glow-bright)' : 'var(--text-primary)',
            fontWeight: highlighted ? 400 : 300,
            fontStyle: highlighted ? 'italic' : 'normal',
            textShadow: highlighted ? '0 0 12px rgba(216, 180, 254, 0.35)' : 'none',
            transition: 'color 0.3s ease',
          }}
        >
          {line}
        </p>
      );
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex justify-start mb-5 w-full"
    >
      <div
        className="max-w-[85%] text-[17px] leading-[1.75] font-light space-y-2.5"
        style={{ color: 'var(--text-primary)' }}
      >
        {mainContent ? renderLines(mainContent, false, 'main') : null}
        {renderLines(lastSentence, true, 'last')}
      </div>
    </motion.div>
  );
}

// ─── Chat Interface ───────────────────────────────────────────────────────────

export default function ChatInterface({
  messages,
  onSendMessage,
  orbState,
  isLoading,
  showWrapUp = false,
  onEndConversation,
  onContinueConversation,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Null on the server, set after first client paint to avoid hydration mismatch
  const [welcomeText, setWelcomeText] = useState<string | null>(null);
  useEffect(() => {
    setWelcomeText(WELCOME_PROMPTS[Math.floor(Math.random() * WELCOME_PROMPTS.length)]);
    setHasSpeechSupport(
      typeof window !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in (window as any))
    );
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const baseText = input.trimEnd();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let allFinal = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          allFinal += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const sep = baseText ? ' ' : '';
      setInput(baseText + sep + allFinal + interim);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const isEmpty = messages.length === 0;

  // Resize textarea as content grows, capped at 5 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT) + 'px';
  }, [input]);

  // Smooth-scroll to newest message unless the user has scrolled up to read history
  useEffect(() => {
    if (!isScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isScrolledUp]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setIsScrolledUp(el.scrollHeight - el.scrollTop - el.clientHeight > 50);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden h-full"
      style={{ background: 'var(--bg-base)' }}
    >
      {/*
        Orb: when empty its center tracks top 58% of the viewport (behind the
        input), when messages exist it drops to 100% (half-clipped at bottom).
        x/y in style are Framer transform shorthands — y:'-50%' makes `top`
        point at the orb's visual center rather than its top edge.
      */}
      <motion.div
        className="absolute pointer-events-none z-0"
        style={{ left: '50%', x: '-50%', y: '-50%' }}
        animate={{ top: isEmpty ? '58%' : '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 180, restDelta: 0.5 }}
      >
        <BreathingOrb state={orbState} />
      </motion.div>

      {/* Gap so content sits below the mobile Navbar */}
      <div className="flex-none h-14 md:h-0" />

      {/*
        Empty state: two equal flex-1 spacers sandwich the welcome text + input,
        centering them vertically. When messages arrive the top spacer is replaced
        by the scrollable message list and the bottom spacer unmounts; Framer's
        `layout` on the input div animates it from center down to the bottom.
      */}
      {isEmpty ? (
        <div className="flex-1 min-h-0" aria-hidden="true" />
      ) : (
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="relative z-10 flex-1 min-h-0 overflow-y-auto scrollbar-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%)',
          }}
        >
          <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Welcome text — fades out the moment the first message is sent */}
      <AnimatePresence>
        {isEmpty && welcomeText && (
          <motion.h2
            key="welcome"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            className="flex-none text-center px-6 pb-6 relative z-10 text-4xl sm:text-5xl md:text-6xl font-serif font-medium tracking-wide select-none max-w-3xl mx-auto leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {welcomeText}
          </motion.h2>
        )}
      </AnimatePresence>

      {/* Input / wrap-up card — layout-animated */}
      <motion.div
        layout
        transition={{ layout: { type: 'spring', damping: 30, stiffness: 200 } }}
        className="flex-none px-4 pb-6 pt-3 relative z-10"
      >
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {showWrapUp ? (
              /* Wrap-up card */
              <motion.div
                key="wrapup-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-2xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'rgba(152, 130, 189, 0.35)',
                  boxShadow: '0 0 28px rgba(152, 130, 189, 0.1)',
                }}
              >
                <div>
                  <p className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    This feels like a natural pause.
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    Would you like to wrap up, or keep going?
                  </p>
                </div>
                <div className="flex gap-2.5 shrink-0">
                  <button
                    onClick={onContinueConversation}
                    className="px-4 py-2 text-[13px] font-medium rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Keep going
                  </button>
                  <button
                    onClick={onEndConversation}
                    className="px-4 py-2 text-[13px] font-semibold rounded-xl transition-all hover:opacity-90 cursor-pointer"
                    style={{ background: 'var(--accent-purple)', color: 'white' }}
                  >
                    End conversation
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Normal input */
              <motion.div
                key="input-area"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="relative rounded-2xl border"
                  style={{
                    background: 'var(--bg-input)',
                    borderColor: isFocused ? 'var(--accent-purple)' : 'var(--border-subtle)',
                    boxShadow: isFocused
                      ? '0 0 0 3px rgba(152,130,189,0.22), 0 0 32px rgba(152,130,189,0.14)'
                      : 'none',
                    transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Vent away..."
                    rows={1}
                    className={`scrollbar-hidden w-full bg-transparent px-5 py-4 text-[17px] leading-6 resize-none outline-none ${hasSpeechSupport ? 'pr-24' : 'pr-14'}`}
                    style={{
                      color: 'var(--text-primary)',
                      caretColor: 'var(--accent-purple)',
                    }}
                  />
                  {hasSpeechSupport && (
                    <button
                      onClick={handleMicClick}
                      disabled={isLoading}
                      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                      className="absolute right-14 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:opacity-80"
                      style={{
                        background: isRecording ? 'rgba(239,68,68,0.12)' : 'transparent',
                      }}
                    >
                      {isRecording ? (
                        <MicOff size={16} strokeWidth={2} className="animate-pulse" style={{ color: '#ef4444' }} />
                      ) : (
                        <Mic size={16} strokeWidth={2} style={{ color: 'var(--text-dim)' }} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    aria-label="Send message"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center disabled:opacity-30 hover:opacity-80"
                    style={{ background: 'var(--accent-purple)', transition: 'opacity 0.25s ease', borderRadius: '8px' }}
                  >
                    <ArrowUp size={15} strokeWidth={2.5} color="white" />
                  </button>
                </div>

                {/* Quick wellness prompt cards */}
                {isEmpty && (
                  <div className="flex flex-wrap gap-2 justify-center mt-5">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setInput(p.text);
                          textareaRef.current?.focus();
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-white/5 bg-white/5 hover:bg-white/10 hover:border-[#9882bd]/30 transition-all text-[#dcd6eb] hover:text-white font-medium cursor-pointer shadow-sm"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom spacer — mirrors the top spacer to vertically center the content */}
      {isEmpty && <div className="flex-1 min-h-0" aria-hidden="true" />}
    </div>
  );
}
