'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface SummaryErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SummaryErrorModal({ isOpen, onClose }: SummaryErrorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="summary-error-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(15, 14, 23, 0.6)' }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="summary-error-modal"
            className="fixed inset-0 z-[70] flex items-center justify-center px-6"
            initial={{ opacity: 0, scale: 0.93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-3xl px-8 py-9 border text-center"
              style={{
                background: 'rgba(31, 24, 51, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: 'rgba(220, 90, 90, 0.3)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              }}
            >
              <div
                className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{
                  background: 'rgba(220, 90, 90, 0.12)',
                  border: '1px solid rgba(220, 90, 90, 0.25)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 6v4M10 14h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="rgba(220, 90, 90, 0.85)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <p
                className="text-[16px] font-medium leading-relaxed mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Summary couldn&apos;t be saved
              </p>
              <p
                className="text-[13px] leading-relaxed mb-7"
                style={{ color: 'var(--text-secondary)' }}
              >
                Unfortunately your conversation summary could not be saved. Sorry for the
                inconvenience — please try again later.
              </p>

              <button
                onClick={onClose}
                className="px-7 py-2.5 text-[13px] font-semibold rounded-full border transition-all hover:bg-white/5 active:scale-95"
                style={{
                  borderColor: 'rgba(220, 90, 90, 0.4)',
                  color: 'rgba(220, 90, 90, 0.85)',
                }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
