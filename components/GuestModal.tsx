'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { signIn } from 'next-auth/react';

interface GuestModalProps {
  isOpen: boolean;
  sentCount: number;
  onDismiss: () => void;
}

export default function GuestModal({ isOpen }: GuestModalProps) {
  const handleSignIn = () => {
    signIn('google', { callbackUrl: window.location.origin + '/' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Non-dismissible overlay */}
          <motion.div
            key="guest-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(15, 14, 23, 0.75)' }}
            aria-hidden="true"
          />

          <motion.div
            key="guest-modal"
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="guest-modal-heading"
              className="w-full max-w-sm rounded-3xl px-8 pt-10 pb-10 border text-center"
              style={{
                background: 'rgba(31, 24, 51, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: 'var(--border-subtle)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              }}
            >
              <h2
                id="guest-modal-heading"
                className="text-xl font-medium mb-3 tracking-[0.01em]"
                style={{ color: 'var(--text-primary)' }}
              >
                Sign in to continue
              </h2>

              <p
                className="text-[15px] leading-[1.75] mb-8"
                style={{ color: 'var(--text-secondary)' }}
              >
                Create a free account to keep chatting and save your conversations.
              </p>

              <button
                onClick={handleSignIn}
                className="w-full py-[14px] font-medium text-[15px]"
                style={{
                  background: 'var(--accent-purple)',
                  color: 'var(--text-primary)',
                  borderRadius: '999px',
                }}
              >
                Continue with Google
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
