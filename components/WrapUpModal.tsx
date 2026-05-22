'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FEEL_GOOD_STATEMENTS = [
  "Feels good to get that off your chest, doesn't it?",
  "You showed up for yourself today. That's not a small thing.",
  "That took courage — be proud of yourself for opening up.",
  "Every conversation like this is a step toward knowing yourself better.",
  "You gave yourself a moment today. You deserved it.",
  "Talking it out matters more than most people realize. You did that.",
  "The fact that you came here says something good about you.",
  "You carried something real today — notice how a little lighter you might feel.",
  "Being honest about how you feel is one of the bravest things a person can do.",
  "You didn't have to show up today, but you did. That matters.",
];

interface WrapUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WrapUpModal({ isOpen, onClose }: WrapUpModalProps) {
  const statement = useMemo(
    () => FEEL_GOOD_STATEMENTS[Math.floor(Math.random() * FEEL_GOOD_STATEMENTS.length)],
    // Pick once per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="wrapup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(15, 14, 23, 0.8)' }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="wrapup-modal"
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-3xl px-8 py-10 border text-center"
              style={{
                background: 'rgba(31, 24, 51, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: 'rgba(152, 130, 189, 0.3)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(152,130,189,0.08)',
              }}
            >
              {/* Decorative orb-like glow */}
              <div
                className="w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle, rgba(152,130,189,0.3) 0%, rgba(152,130,189,0.05) 70%)',
                  border: '1px solid rgba(152,130,189,0.2)',
                }}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ background: 'var(--accent-purple)', opacity: 0.8 }}
                />
              </div>

              <p
                className="text-[18px] font-serif font-medium leading-relaxed mb-8"
                style={{ color: 'var(--text-primary)' }}
              >
                {statement}
              </p>

              <button
                onClick={onClose}
                className="px-7 py-3 text-[14px] font-semibold rounded-full transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--accent-purple)', color: 'white' }}
              >
                Start fresh
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
