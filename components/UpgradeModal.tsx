'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onDismiss: () => void;
}

const FREE_FEATURES = [
  '15 messages per day',
  'Core chat experience',
  'Guest mode',
];

const PRO_FEATURES = [
  'Unlimited messages',
  'Saved conversation history',
  'Priority response speed',
  'Early access to new features',
];

export default function UpgradeModal({ isOpen, onDismiss }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('[UpgradeModal] checkout error:', data.error);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="upgrade-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(15, 14, 23, 0.75)' }}
            onClick={onDismiss}
            aria-hidden="true"
          />

          <motion.div
            key="upgrade-modal"
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="upgrade-modal-heading"
              className="relative w-full max-w-lg rounded-3xl px-8 pt-10 pb-10 border"
              style={{
                background: 'rgba(31, 24, 51, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: 'var(--border-subtle)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              }}
            >
              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 transition-colors"
                style={{ color: 'var(--text-dim)' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <h2
                id="upgrade-modal-heading"
                className="text-xl font-medium mb-2 tracking-[0.01em] text-center"
                style={{ color: 'var(--text-primary)' }}
              >
                You&apos;ve reached today&apos;s limit
              </h2>
              <p
                className="text-[15px] text-center mb-8"
                style={{ color: 'var(--text-secondary)' }}
              >
                Upgrade to Pro for unlimited conversations.
              </p>

              {/* Two-column comparison */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {/* Free column */}
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-widest mb-3"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    Free
                  </p>
                  <ul className="space-y-2">
                    {FREE_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        <Check size={13} className="mt-[3px] shrink-0" style={{ color: 'var(--text-dim)' }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pro column */}
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: 'var(--accent-purple-dim)',
                    border: '1px solid var(--accent-purple)',
                  }}
                >
                  <p
                    className="text-xs font-medium uppercase tracking-widest mb-3"
                    style={{ color: 'var(--accent-purple-glow)' }}
                  >
                    Pro
                  </p>
                  <ul className="space-y-2">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        <Check size={13} className="mt-[3px] shrink-0" style={{ color: 'var(--accent-purple-glow)' }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-[14px] font-medium text-[15px] mb-3 disabled:opacity-50"
                style={{
                  background: 'var(--accent-purple)',
                  color: 'var(--text-primary)',
                  borderRadius: '999px',
                }}
              >
                {loading ? 'Redirecting…' : 'Upgrade to Pro — $7/month'}
              </button>

              <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                Cancel anytime. No questions asked.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
