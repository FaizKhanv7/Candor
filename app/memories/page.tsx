'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Trash2, X, BookOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Memory {
  id: string;
  sessionId: string;
  summary: string;
  emotionalTags: string[];
  createdAt: string;
}

interface EmotionalColor {
  glow: string;
  dotColor: string;
  tagBg: string;
  tagText: string;
  border: string;
}

function getEmotionalColor(tags: string[]): EmotionalColor {
  const str = tags.join(' ').toLowerCase();
  if (/grief|loss|sad|depress|mourn/.test(str))
    return { glow: 'rgba(96,165,250,0.18)', dotColor: '#60a5fa', tagBg: 'rgba(96,165,250,0.12)', tagText: '#93c5fd', border: 'rgba(96,165,250,0.22)' };
  if (/anx|stress|overwhelm|panic|worry|burn/.test(str))
    return { glow: 'rgba(251,146,60,0.18)', dotColor: '#fb923c', tagBg: 'rgba(251,146,60,0.12)', tagText: '#fdba74', border: 'rgba(251,146,60,0.22)' };
  if (/anger|frustrat|rage|bitter|resent/.test(str))
    return { glow: 'rgba(248,113,113,0.18)', dotColor: '#f87171', tagBg: 'rgba(248,113,113,0.12)', tagText: '#fca5a5', border: 'rgba(248,113,113,0.22)' };
  if (/lone|isolat|disconn|empty/.test(str))
    return { glow: 'rgba(167,139,250,0.22)', dotColor: '#a78bfa', tagBg: 'rgba(167,139,250,0.12)', tagText: '#c4b5fd', border: 'rgba(167,139,250,0.28)' };
  if (/hope|gratitude|joy|happy|relief|calm|peace|content/.test(str))
    return { glow: 'rgba(52,211,153,0.18)', dotColor: '#34d399', tagBg: 'rgba(52,211,153,0.12)', tagText: '#6ee7b7', border: 'rgba(52,211,153,0.22)' };
  if (/love|relation|intimacy|connect|fam/.test(str))
    return { glow: 'rgba(244,114,182,0.18)', dotColor: '#f472b4', tagBg: 'rgba(244,114,182,0.12)', tagText: '#f9a8d4', border: 'rgba(244,114,182,0.22)' };
  return { glow: 'rgba(152,130,189,0.18)', dotColor: '#9882bd', tagBg: 'rgba(152,130,189,0.12)', tagText: '#c4b5fd', border: 'rgba(152,130,189,0.22)' };
}

function cleanSummary(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { summary?: string };
      if (parsed.summary) return parsed.summary;
    } catch {
      const m = trimmed.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) return m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"');
    }
  }
  return raw;
}

function groupByMonth(memories: Memory[]): { label: string; items: Memory[] }[] {
  const map = new Map<string, Memory[]>();
  for (const m of memories) {
    const key = new Date(m.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function MemoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revisitMemory, setRevisitMemory] = useState<Memory | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' || !session?.user?.isPro) {
      router.replace('/');
      return;
    }
    fetch('/api/memory')
      .then((r) => r.json() as Promise<{ memories: Memory[] }>)
      .then(({ memories: data }) => {
        setMemories(data);
        setLoading(false);
      });
  }, [status, session, router]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (revisitMemory?.id === id) setRevisitMemory(null);
    setDeletingId(null);
  };

  const handleExport = () => {
    const entries = memories.map((m) => {
      const date = new Date(m.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const tags = m.emotionalTags.length > 0 ? `Themes: ${m.emotionalTags.join(', ')}\n` : '';
      return `${date}\n${tags}\n${cleanSummary(m.summary)}`;
    });
    const exported = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const content = `My Candor Memories\n${'─'.repeat(30)}\nExported ${exported}\n\n${entries.join('\n\n─────\n\n')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candor-memories-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const groups = groupByMonth(memories);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 h-14 flex items-center justify-between px-6 border-b"
        style={{ background: 'rgba(40,31,65,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderColor: 'var(--border-subtle)' }}
      >
        <Link href="/" className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-dim)' }}>
          <ArrowLeft size={15} />
          Candor
        </Link>
        <h1 className="font-serif text-base tracking-wide" style={{ color: 'var(--text-primary)' }}>
          Your Memories
        </h1>
        {memories.length > 0 ? (
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-dim)' }}>
            <Download size={14} />
            Export
          </button>
        ) : (
          <span className="w-16" />
        )}
      </header>

      {/* Content */}
      <main className="max-w-xl mx-auto px-5 py-10">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: 'rgba(152,130,189,0.1)', border: '1px solid rgba(152,130,189,0.15)' }}
            >
              <BookOpen size={22} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <p className="text-[16px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              No sessions saved yet.
            </p>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-dim)' }}>
              After a conversation ends, Candor saves a gentle summary here so you can look back on your journey.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map(({ label, items }) => (
              <div key={label}>
                {/* Month label */}
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    {label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>

                {/* Timeline */}
                <div className="relative pl-8">
                  {/* Vertical connecting line */}
                  <div
                    className="absolute left-[11px] top-5 bottom-5 w-px"
                    style={{ background: 'linear-gradient(to bottom, rgba(152,130,189,0.1) 0%, rgba(152,130,189,0.18) 40%, rgba(152,130,189,0.18) 60%, rgba(152,130,189,0.1) 100%)' }}
                  />

                  <div className="space-y-6">
                    {items.map((memory) => {
                      const colors = getEmotionalColor(memory.emotionalTags);
                      return (
                        <div key={memory.id} className="relative">
                          {/* Timeline dot */}
                          <div
                            className="absolute -left-8 top-5 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                            style={{
                              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                              boxShadow: `0 0 10px ${colors.glow}`,
                            }}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: colors.dotColor, boxShadow: `0 0 6px ${colors.dotColor}` }}
                            />
                          </div>

                          {/* Memory card */}
                          <motion.div
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="rounded-2xl p-5"
                            style={{
                              background: 'rgba(31,24,51,0.75)',
                              border: `1px solid ${colors.border}`,
                              boxShadow: `0 4px 32px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.03)`,
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                            }}
                          >
                            {/* Top row: date + delete */}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
                                {new Date(memory.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <button
                                onClick={() => handleDelete(memory.id)}
                                disabled={deletingId === memory.id}
                                className="p-1.5 rounded-lg disabled:opacity-30 transition-colors hover:bg-red-500/10"
                                style={{ color: 'var(--text-dim)' }}
                                aria-label="Delete memory"
                              >
                                {deletingId === memory.id ? (
                                  <div className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />
                                ) : (
                                  <Trash2 size={13} />
                                )}
                              </button>
                            </div>

                            {/* Emotional tags */}
                            {memory.emotionalTags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {memory.emotionalTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide"
                                    style={{ background: colors.tagBg, color: colors.tagText }}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Summary preview (2 lines) */}
                            <p
                              className="text-[13px] leading-[1.7] mb-4"
                              style={{
                                color: 'var(--text-secondary)',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {cleanSummary(memory.summary)}
                            </p>

                            {/* Revisit button */}
                            <button
                              onClick={() => setRevisitMemory(memory)}
                              className="flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80"
                              style={{ color: colors.tagText }}
                            >
                              <BookOpen size={12} />
                              Revisit
                            </button>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Revisit Modal */}
      <AnimatePresence>
        {revisitMemory && (
          <>
            <motion.div
              key="revisit-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(15,14,23,0.8)' }}
              onClick={() => setRevisitMemory(null)}
              aria-hidden="true"
            />
            <motion.div
              key="revisit-modal"
              className="fixed inset-0 z-50 flex items-center justify-center px-5 py-8"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              {(() => {
                const colors = getEmotionalColor(revisitMemory.emotionalTags);
                return (
                  <div
                    role="dialog"
                    aria-modal="true"
                    className="relative w-full max-w-lg rounded-3xl p-8 border max-h-[80vh] flex flex-col"
                    style={{
                      background: 'rgba(31,24,51,0.98)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      borderColor: colors.border,
                      boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 40px ${colors.glow}`,
                    }}
                  >
                    {/* Close */}
                    <button
                      onClick={() => setRevisitMemory(null)}
                      className="absolute top-5 right-5 p-2 rounded-xl hover:bg-white/5 transition-colors"
                      style={{ color: 'var(--text-dim)' }}
                      aria-label="Close"
                    >
                      <X size={17} />
                    </button>

                    {/* Date */}
                    <p className="text-[12px] mb-3" style={{ color: 'var(--text-dim)' }}>
                      {new Date(revisitMemory.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    {/* Tags */}
                    {revisitMemory.emotionalTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {revisitMemory.emotionalTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ background: colors.tagBg, color: colors.tagText }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Full summary */}
                    <div className="overflow-y-auto flex-1 scrollbar-hidden">
                      <p
                        className="text-[15px] leading-[1.8] font-light"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {cleanSummary(revisitMemory.summary)}
                      </p>
                    </div>

                    {/* Delete from modal */}
                    <div className="flex justify-end mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      <button
                        onClick={() => handleDelete(revisitMemory.id)}
                        disabled={deletingId === revisitMemory.id}
                        className="flex items-center gap-1.5 text-[13px] transition-colors disabled:opacity-40 hover:text-red-400"
                        style={{ color: 'var(--text-dim)' }}
                      >
                        <Trash2 size={13} />
                        Delete this memory
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
