import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TabType } from '../types';
import { useToast } from './ToastProvider';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

interface NavItem {
  id: TabType;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', icon: 'grid_view', label: 'Dashboard' },
  { id: 'instances', icon: 'chat', label: 'Instâncias' },
  { id: 'livechat', icon: 'forum', label: 'Chat ao Vivo' },
  { id: 'contacts', icon: 'person', label: 'Contatos' },
  { id: 'chatbots', icon: 'smart_toy', label: 'Chatbots' },
  { id: 'flowbuilder', icon: 'account_tree', label: 'Flow Builder' },
  { id: 'analytics', icon: 'analytics', label: 'Relatórios' },
  { id: 'users', icon: 'groups', label: 'Usuários' },
  { id: 'subscription', icon: 'credit_card', label: 'Meu Plano' },
  { id: 'aisettings', icon: 'auto_awesome', label: 'IA Gemini' },
  { id: 'apidocs', icon: 'menu_book', label: 'Documentação' },
];

interface NavButtonProps {
  item: NavItem;
  isMobile?: boolean;
  isExpanded?: boolean;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  setIsMobileOpen: (open: boolean) => void;
}

const NavButton: React.FC<NavButtonProps> = ({
  item,
  isMobile = false,
  isExpanded = false,
  activeTab,
  setActiveTab,
  setIsMobileOpen
}) => (
  <div className="relative group w-full">
    <button
      onClick={() => {
        setActiveTab(item.id);
        if (isMobile) setIsMobileOpen(false);
      }}
      className={`w-full h-14 flex items-center transition-all duration-300 rounded-2xl ${activeTab === item.id
        ? 'bg-white/20 text-white shadow-lg'
        : 'text-white/40 hover:text-white hover:bg-white/5'
        } ${isExpanded && !isMobile ? 'px-4 gap-4' : 'justify-center'}`}
    >
      <span className="material-icons-round text-2xl shrink-0">{item.icon}</span>
      {isExpanded && !isMobile && (
        <span className="font-bold text-sm tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
          {item.label}
        </span>
      )}
    </button>
    {!isMobile && !isExpanded && (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl pointer-events-none -translate-x-2 group-hover:translate-x-0">
        {item.label}
        <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
      </div>
    )}
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  isExpanded,
  setIsExpanded
}) => {
  const { showToast } = useToast();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking admin status:', error);
          return;
        }

        if (data?.role === 'ADMIN') {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Unexpected error in checkAdmin:', err);
      }
    };

    checkAdmin();
  }, [supabase]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Sessão encerrada com sucesso', 'success');
      setIsLogoutDialogOpen(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 bg-primary lg:bg-primary lg:rounded-[2.5rem] flex flex-col items-center py-8 gap-6 shrink-0 shadow-2xl transition-all duration-500 lg:m-6 ${isMobileOpen ? 'translate-x-0 w-24' : '-translate-x-full lg:translate-x-0'} ${isExpanded ? 'lg:w-64 px-6' : 'lg:w-24 px-0'} overflow-visible`}>
        <div className={`w-full flex items-center mb-4 transition-all duration-300 ${isExpanded ? 'px-2 gap-4' : 'justify-center'}`}>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 transition-transform hover:scale-105">
            <span className="material-icons-round text-white text-3xl">hub</span>
          </div>
          {isExpanded && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-white font-black text-xl tracking-tighter leading-none">EVOLUTION</span>
              <span className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">v1.2.0</span>
            </div>
          )}
        </div>

        {/* Toggle Expand Button - Desktop Only */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden lg:flex absolute -right-3 top-[52px] w-7 h-7 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full items-center justify-center shadow-xl text-primary z-50 hover:bg-slate-50 transition-all active:scale-90"
        >
          <span className="material-icons-round text-lg transition-transform duration-500" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            chevron_right
          </span>
        </button>

        <div className="flex-1 w-full flex flex-col items-center overflow-y-auto overflow-x-hidden custom-scrollbar py-2 gap-8 px-4">
          <nav className="flex flex-col gap-6 w-full items-center">
            {navItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isMobile={isMobileOpen}
                isExpanded={isExpanded}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setIsMobileOpen={setIsMobileOpen}
              />
            ))}
          </nav>
        </div>

        <div className={`flex flex-col mt-auto shrink-0 pb-2 w-full px-4 items-center ${isExpanded ? 'gap-2' : 'gap-6'}`}>
          {isAdmin && (
            <div className="relative group w-full">
              <button
                onClick={() => {
                  setActiveTab('admin');
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
                className={`w-full h-14 flex items-center transition-all ${activeTab === 'admin'
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                  } ${isExpanded ? 'px-4 gap-4 rounded-2xl' : 'justify-center rounded-2xl'}`}
              >
                <span className="material-icons-round text-2xl shrink-0">security</span>
                {isExpanded && (
                  <span className="font-bold text-sm tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Admin</span>
                )}
              </button>
              {!isExpanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl pointer-events-none -translate-x-2 group-hover:translate-x-0">
                  Administração
                  <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
                </div>
              )}
            </div>
          )}

          <div className="relative group w-full">
            <button
              onClick={() => {
                setActiveTab('settings');
                setIsMobileOpen(false);
              }}
              className={`w-full h-14 flex items-center transition-all ${activeTab === 'settings'
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-white/40 hover:text-white hover:bg-white/5'
                } ${isExpanded ? 'px-4 gap-4 rounded-2xl' : 'justify-center rounded-2xl'}`}
            >
              <span className="material-icons-round text-2xl shrink-0">settings</span>
              {isExpanded && (
                <span className="font-bold text-sm tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Ajustes</span>
              )}
            </button>
            {!isExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl pointer-events-none -translate-x-2 group-hover:translate-x-0">
                Configurações
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-8 border-transparent border-r-slate-800"></div>
              </div>
            )}
          </div>

          <div className="relative group w-full">
            <button
              onClick={() => setIsLogoutDialogOpen(true)}
              className={`w-full h-14 flex items-center transition-all text-white/40 hover:text-rose-400 hover:bg-rose-500/10 ${isExpanded ? 'px-4 gap-4 rounded-2xl' : 'justify-center rounded-2xl'}`}
            >
              <span className="material-icons-round text-2xl shrink-0">logout</span>
              {isExpanded && (
                <span className="font-bold text-sm tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">Sair</span>
              )}
            </button>
            {!isExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl pointer-events-none -translate-x-2 group-hover:translate-x-0">
                Sair
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-8 border-transparent border-r-rose-600"></div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {isLogoutDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsLogoutDialogOpen(false)}></div>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300 border border-slate-100 dark:border-slate-700">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="material-icons-round text-rose-500 text-4xl">logout</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Sair do Sistema?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Você precisará fazer login novamente para acessar sua conta.</p>
            </div>
            <div className="flex gap-4 p-8 pt-0">
              <button
                onClick={() => setIsLogoutDialogOpen(false)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-6 py-4 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
