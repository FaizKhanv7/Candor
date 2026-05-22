'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, LogOut, Menu, X, Plus, BookOpen, Crown, ChevronUp, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

interface SidebarLayoutWrapperProps {
  children: React.ReactNode;
}

function SidebarNavigation({
  session,
  handleJournalClick,
  isCollapsed,
}: {
  session: any;
  handleJournalClick: any;
  isCollapsed: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams ? searchParams.get('view') || 'chat' : 'chat';

  const menuItems = [
    {
      name: 'Chat Space',
      icon: MessageSquare,
      href: '/',
      active: pathname === '/' && currentView !== 'breathing',
    },
    {
      name: 'Breathing Space',
      icon: Heart,
      href: '/?view=breathing',
      active: pathname === '/' && currentView === 'breathing',
    },
    {
      name: 'Memories',
      icon: BookOpen,
      href: '/memories',
      active: pathname === '/memories',
      onClick: handleJournalClick,
      isPro: true,
    },
  ];

  return (
    <div className="flex-1 space-y-2 w-full">
      {!isCollapsed && (
        <p className="text-[11px] font-bold tracking-widest text-[#9b93b0] uppercase px-3 mb-3">
          Wellness Hub
        </p>
      )}
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={item.onClick}
            title={isCollapsed ? item.name : undefined}
            className={`flex items-center transition-all ${
              isCollapsed
                ? `w-12 h-12 justify-center rounded-xl mx-auto ${
                    item.active
                      ? 'bg-[#9882bd]/15 text-[#9882bd] border border-[#9882bd]/10'
                      : 'text-[#dcd6eb] hover:bg-white/5 hover:text-white border border-transparent'
                  }`
                : `px-3 py-3 rounded-xl text-[15px] font-medium justify-between ${
                    item.active
                      ? 'bg-[#9882bd]/15 text-[#9882bd] border border-[#9882bd]/10'
                      : 'text-[#dcd6eb] hover:bg-white/5 hover:text-white border border-transparent'
                  }`
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className={item.active ? 'text-[#9882bd]' : 'text-[#9b93b0]'} />
              {!isCollapsed && item.name}
            </div>
            {!isCollapsed && item.isPro && !session?.user?.isPro && (
              <div className="p-0.5 rounded-md bg-white/5 text-[#9b93b0]">
                <Crown size={12} className="text-[#9882bd]" />
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function SidebarLayoutWrapper({ children }: SidebarLayoutWrapperProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('candor_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem('candor_sidebar_collapsed', String(newVal));
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Click outside to close profile dropdown
  useEffect(() => {
    if (!showProfileMenu) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showProfileMenu]);

  const handleNewChatClick = () => {
    if (pathname !== '/') {
      router.push('/');
      setTimeout(() => {
        window.dispatchEvent(new Event('new-chat'));
      }, 150);
    } else {
      window.dispatchEvent(new Event('new-chat'));
    }
  };

  const handleJournalClick = (e: React.MouseEvent) => {
    if (!session) {
      e.preventDefault();
      window.dispatchEvent(new Event('show-guest-modal'));
    } else if (!session.user?.isPro) {
      e.preventDefault();
      window.dispatchEvent(new Event('show-upgrade-modal'));
    }
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-[#1f1833] text-white border-r border-white/5 select-none transition-all duration-300 ${isCollapsed ? 'p-3.5 items-center' : 'p-5'}`}>
      {/* Brand logo + Name + Toggle */}
      <div className={`flex items-center mb-6 mt-2 w-full ${isCollapsed ? 'flex-col gap-4 justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 overflow-hidden flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/candor.png" alt="Candor Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <span className="font-serif text-2xl tracking-[0.08em] font-medium text-white">
              CANDOR
            </span>
          )}
        </div>
        {/* Toggle Collapse Button — desktop only */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-1.5 rounded-lg text-[#9b93b0] hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* New chat button */}
      <button
        onClick={handleNewChatClick}
        title={isCollapsed ? "New chat" : undefined}
        className={`flex items-center justify-center transition-all ${
          isCollapsed
            ? 'w-12 h-12 rounded-full border border-white/10 hover:border-[#9882bd]/50 hover:bg-[#9882bd]/10'
            : 'w-full py-3.5 px-2 rounded-xl border border-white/10 hover:border-[#9882bd]/50 hover:bg-[#9882bd]/10 text-sm font-medium gap-2'
        } text-white mb-6`}
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <Plus size={15} strokeWidth={2.5} style={{ color: '#9882bd' }} />
        {!isCollapsed && <span>New chat</span>}
      </button>

      {/* Menu Options (Suspense-wrapped to isolate useSearchParams) */}
      <Suspense fallback={
        <div className="flex-1 space-y-1.5 w-full">
          {!isCollapsed && (
            <p className="text-[11px] font-bold tracking-widest text-[#9b93b0] uppercase px-3 mb-3">
              Wellness Hub
            </p>
          )}
          <div className="h-10 animate-pulse bg-white/5 rounded-xl mb-2 w-full" />
          <div className="h-10 animate-pulse bg-white/5 rounded-xl mb-2 w-full" />
          <div className="h-10 animate-pulse bg-white/5 rounded-xl w-full" />
        </div>
      }>
        <SidebarNavigation session={session} handleJournalClick={handleJournalClick} isCollapsed={isCollapsed} />
      </Suspense>

      {/* Profile/Auth Section at the bottom-left */}
      <div className="border-t border-white/5 pt-4 relative w-full">
        {session ? (
          <div ref={dropdownRef} className="relative w-full flex justify-center">
            {/* Clickable Profile details */}
            <button
              onClick={() => setShowProfileMenu((v) => !v)}
              title={isCollapsed ? (session.user?.name || undefined) : undefined}
              className={`flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 ${
                isCollapsed ? 'p-2 w-12 h-12 justify-center' : 'p-2.5 w-full text-left gap-3'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#9882bd', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {session.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user?.name ?? 'Profile'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {(session.user?.name ?? '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <p className="text-[14px] font-semibold text-white truncate leading-tight">
                      {session.user?.name}
                    </p>
                    <p className="text-[11px] text-[#9b93b0] font-medium leading-none mt-0.5 flex items-center gap-1">
                      {session.user?.isPro ? (
                        <span className="text-[#9882bd] font-semibold flex items-center gap-0.5">
                          Pro Member
                        </span>
                      ) : (
                        'Free Account'
                      )}
                    </p>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronUp size={14} className="text-[#9b93b0]" />}
            </button>

            {/* Profile Dropup Menu */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-[60px] rounded-2xl border p-2 min-w-[200px] z-50 shadow-2xl"
                  style={{
                    background: 'rgba(31, 24, 51, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    left: isCollapsed ? '12px' : '0px',
                    right: isCollapsed ? 'auto' : '0px',
                  }}
                >
                  <div className="px-3 py-2 border-b border-white/5 mb-1.5">
                    <p className="text-xs text-[#9b93b0] font-medium truncate">{session.user?.email}</p>
                  </div>
                  {!session.user?.isPro && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        window.dispatchEvent(new Event('show-upgrade-modal'));
                      }}
                      className="w-full text-left px-3 py-2.5 text-[14px] font-semibold hover:bg-white/5 rounded-xl flex items-center gap-2 text-[#9882bd] transition-all"
                    >
                      <Crown size={14} />
                      Upgrade to Pro
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSettingsModal(true);
                    }}
                    className="w-full text-left px-3 py-2.5 text-[14px] font-medium hover:bg-white/5 rounded-xl flex items-center gap-2 text-[#dcd6eb] transition-all"
                  >
                    <Settings size={14} />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' });
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-[14px] font-medium hover:bg-[#ef4444]/10 hover:text-[#ef4444] rounded-xl flex items-center gap-2 text-[#dcd6eb] transition-all"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            title={isCollapsed ? "Sign in with Google" : undefined}
            className={`flex items-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#9882bd]/30 transition-all group ${
              isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3 w-full text-left gap-3'
            }`}
          >
            <div className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-black font-bold text-xs shrink-0 select-none">
              G
            </div>
            {!isCollapsed && (
              <span className="text-[14px] font-medium text-white group-hover:text-[#9882bd] transition-colors">
                Sign in with Google
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
    <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    <div className="flex h-screen w-screen overflow-hidden bg-[#281f41]">
      {/* Desktop Sidebar (Persistent) */}
      <aside className={`hidden md:block flex-none h-full transition-all duration-300 ${isCollapsed ? 'w-[76px]' : 'w-72'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile Top Navbar (Toggles drawer) */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between px-5 h-14 border-b border-white/5 z-20 flex-none" style={{
          background: 'rgba(40, 31, 65, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          <button
            onClick={() => setIsOpen(true)}
            className="p-1.5 rounded-lg text-white hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg tracking-[0.06em] font-medium text-white">CANDOR</span>
          </div>

          <div className="w-8 h-8" /> {/* Balance spacer */}
        </header>

        {/* Mobile Sidebar Slide-out Drawer */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Back drop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 md:hidden"
              />
              
              {/* Drawer Content */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="fixed top-0 bottom-0 left-0 z-50 w-72 h-full md:hidden shadow-2xl"
              >
                <div className="relative h-full">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-5 right-5 p-1.5 rounded-lg text-white hover:bg-white/5 transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                  {sidebarContent}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Pane */}
        <main className="flex-1 min-w-0 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
    </>
  );
}
