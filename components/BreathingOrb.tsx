'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';

export type OrbState = 'idle' | 'thinking' | 'breathing' | 'responding';

type BreathPhase = 'inhale' | 'hold' | 'exhale';

interface BreathingOrbProps {
  state?: OrbState;
}

export default function BreathingOrb({ state = 'idle' }: BreathingOrbProps) {
  const controls = useAnimation();
  const [breathPhase, setBreathPhase] = useState<BreathPhase | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const ids: ReturnType<typeof setTimeout>[] = [];

    function after(ms: number, fn: () => void) {
      const id = setTimeout(() => {
        if (aliveRef.current) fn();
      }, ms);
      ids.push(id);
    }

    controls.stop();

    switch (state) {
      case 'idle':
        setBreathPhase(null);
        controls.start({
          scale: [1, 1.06, 1],
          opacity: 0.5,
          transition: { duration: 4, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
        });
        break;

      case 'thinking':
        setBreathPhase(null);
        controls.start({
          scale: [1, 1.12, 1],
          opacity: 0.7,
          transition: { duration: 1.2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' },
        });
        break;

      case 'breathing': {
        // 4-7-8: inhale 4s → hold 7s → exhale 8s → repeat
        function cycle() {
          if (!aliveRef.current) return;
          setBreathPhase('inhale');
          controls.start({
            scale: 1.15,
            opacity: 0.9,
            transition: { duration: 4, ease: [0.42, 0, 0.58, 1] },
          });
          after(4_000, () => {
            setBreathPhase('hold');
            after(7_000, () => {
              setBreathPhase('exhale');
              controls.start({
                scale: 1,
                opacity: 0.9,
                transition: { duration: 8, ease: [0.42, 0, 0.58, 1] },
              });
              after(8_000, cycle);
            });
          });
        }
        cycle();
        break;
      }

      case 'responding':
        setBreathPhase(null);
        // Single bloom: quick scale up then settle back
        controls.start({
          scale: [1, 1.15, 1],
          opacity: [0.5, 1, 0.5],
          transition: { duration: 0.8, ease: 'easeOut', times: [0, 0.3, 1] },
        });
        break;
    }

    return () => {
      aliveRef.current = false;
      ids.forEach(clearTimeout);
      controls.stop();
    };
  }, [state, controls]);

  return (
    <div className="relative flex flex-col items-center select-none" aria-hidden="true">
      {/* Breath phase label — only visible during breathing state */}
      <AnimatePresence mode="wait">
        {breathPhase && (
          <motion.span
            key={breathPhase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="mb-4 text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-dim)' }}
          >
            {breathPhase}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Orb */}
      <motion.div
        animate={controls}
        initial={{ scale: 1, opacity: 0.5 }}
        className="w-[200px] h-[200px] md:w-[280px] md:h-[280px] rounded-full relative"
        style={{
          background: 'radial-gradient(circle, rgba(152, 130, 189, 0.45) 0%, transparent 70%)',
          boxShadow: [
            '0 0 25px 6px rgba(152, 130, 189, 0.6)',
            '0 0 90px 32px rgba(152, 130, 189, 0.2)',
          ].join(', '),
        }}
      >
        {/* Warm amber tint that fades in during "thinking" */}
        <motion.div
          animate={{ opacity: state === 'thinking' ? 1 : 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 60%)',
          }}
        />
      </motion.div>
    </div>
  );
}
