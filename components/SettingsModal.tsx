'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';

interface Memory {
  id: string;
  sessionId: string;
  summary: string;
  emotionalTags: string[];
  createdAt: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/memory')
      .then((r) => r.json())
      .then((data: { memories?: Memory[] }) => {
        setMemories(data.memories ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch {}
    setDeleting(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(15, 14, 23, 0.75)' }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            key="settings-modal"
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-modal-heading"
              className="relative w-full max-w-lg rounded-3xl px-8 pt-8 pb-8 border"
              style={{
                background: 'rgba(31, 24, 51, 0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: 'var(--border-subtle)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="settings-modal-heading"
                  className="text-xl font-medium tracking-[0.01em]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Settings
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                  style={{ color: 'var(--text-dim)' }}
                  aria-label="Close settings"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Conversation Summaries Section */}
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Conversation Summaries
                </p>
                <p
                  className="text-[13px] mb-5 leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  The 3 most recent summaries are shared with your AI to provide continuity across sessions.
                </p>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: 'var(--accent-purple)', borderTopColor: 'transparent' }}
                    />
                  </div>
                ) : memories.length === 0 ? (
                  <div
                    className="text-center py-8 text-[14px]"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    No summaries yet. They appear here after your sessions end.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-hidden">
                    {memories.map((memory, idx) => (
                      <div
                        key={memory.id}
                        className="rounded-2xl p-4 flex items-start gap-3"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          opacity: idx < 3 ? 1 : 0.6,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-[11px] font-semibold uppercase tracking-widest"
                              style={{ color: idx < 3 ? 'var(--accent-purple)' : 'var(--text-dim)' }}
                            >
                              Session {idx + 1}
                            </span>
                            {idx < 3 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  background: 'var(--accent-purple-dim)',
                                  color: 'var(--accent-purple)',
                                }}
                              >
                                active
                              </span>
                            )}
                            <span
                              className="text-[11px]"
                              style={{ color: 'var(--text-dim)' }}
                            >
                              {new Date(memory.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p
                            className="text-[13px] leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {cleanSummary(memory.summary)}
                          </p>
                          {memory.emotionalTags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {memory.emotionalTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full text-[11px]"
                                  style={{
                                    background: 'var(--accent-purple-dim)',
                                    color: 'var(--accent-purple)',
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(memory.id)}
                          disabled={deleting === memory.id}
                          className="p-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0 hover:bg-red-500/10"
                          style={{ color: 'var(--text-dim)' }}
                          aria-label="Delete summary"
                        >
                          {deleting === memory.id ? (
                            <div
                              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                              style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
                            />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
