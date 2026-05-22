'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
      style={{
        background: 'rgba(15, 14, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span
        className="text-xl tracking-[0.15em] font-light select-none"
        style={{ color: 'var(--accent-purple)' }}
      >
        Candor
      </span>

      {session ? (
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={open}
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center focus:outline-none"
            style={{
              background: 'var(--accent-purple-dim)',
              border: '2px solid var(--border-subtle)',
              transition: 'border-color 0.2s ease',
            }}
          >
            {session.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user?.name ?? 'Profile'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {(session.user?.name ?? '?')[0].toUpperCase()}
              </span>
            )}
          </button>

          {open && (
            <div
              className="absolute right-0 top-[46px] rounded-xl border py-1 min-w-[168px]"
              style={{
                background: 'rgba(22, 20, 34, 0.98)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderColor: 'var(--border-subtle)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              }}
            >
              {session.user?.name && (
                <p
                  className="px-4 py-2 text-[12px] truncate border-b mb-1"
                  style={{ color: 'var(--text-dim)', borderColor: 'var(--border-subtle)' }}
                >
                  {session.user.name}
                </p>
              )}
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="w-full text-left px-4 py-[9px] text-[14px] hover:bg-white/5"
                style={{ borderRadius: '8px', color: 'var(--text-secondary)' }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="text-[13px] px-4 py-[6px] rounded-full border"
          style={{
            color: 'var(--text-secondary)',
            borderColor: 'var(--border-subtle)',
            transition: 'border-color 0.2s ease, color 0.2s ease',
          }}
        >
          Sign in
        </button>
      )}
    </header>
  );
}
