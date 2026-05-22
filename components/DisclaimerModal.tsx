'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
}

export default function DisclaimerModal({ isOpen, onAcknowledge }: DisclaimerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="disclaimer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(15, 14, 23, 0.75)' }}
            aria-hidden="true"
          />

          <motion.div
            key="disclaimer-modal"
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="disclaimer-heading"
              className="w-full max-w-sm rounded-3xl px-8 pt-10 pb-10 border text-center"
              style={{
                background: 'rgba(31, 24, 51, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: 'var(--border-subtle)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              }}
            >
              {/* Logo */}
              <div className="flex justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/candor.png"
                  alt="Candor"
                  className="w-14 h-14 object-contain"
                />
              </div>

              <h2
                id="disclaimer-heading"
                className="text-lg font-medium mb-3 tracking-[0.01em]"
                style={{ color: 'var(--text-primary)' }}
              >
                Before we begin
              </h2>

              <p
                className="text-[14px] leading-[1.8] mb-8"
                style={{ color: 'var(--text-secondary)' }}
              >
                Candor is a supportive companion, not a licensed therapist. It can make mistakes — please don&apos;t rely on it for medical or clinical decisions. If your situation feels serious, please reach out to a qualified mental health professional.
              </p>

              <button
                onClick={onAcknowledge}
                className="w-full py-[14px] font-medium text-[15px]"
                style={{
                  background: 'var(--accent-purple)',
                  color: 'var(--text-primary)',
                  borderRadius: '999px',
                }}
              >
                I understand
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
