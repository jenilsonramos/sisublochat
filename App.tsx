import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './pages/DashboardView';
import InstancesView from './pages/InstancesView';
import AnalyticsView from './pages/AnalyticsView';
import ChatbotsView from './pages/ChatbotsView';
import LiveChatView from './pages/LiveChatView';
import UsersView from './pages/UsersView';
import SettingsView from './pages/SettingsView';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ContactsView from './pages/ContactsView';
import ApiDocsView from './pages/ApiDocsView';
import MyPlanView from './pages/MyPlanView';
import AIConfigView from './pages/AIConfigView';
import AdminView from './pages/AdminView';
import FlowBuilderView from './pages/FlowBuilderView';
import BroadcastView from './pages/BroadcastView';
import { TabType } from './types';
import { ToastProvider, useToast } from './components/ToastProvider';
import { AlertCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace('/', '');
      if (path && path.length > 0) return path as TabType;

      const saved = localStorage.getItem('activeTab');
      return (saved as TabType) || 'dashboard';
    }
    return 'dashboard';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarExpanded') === 'true';
    }
    return false;
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Listen to Auth Changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUserProfile(data);
        fetchSubscription(userId);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      if (data) {
        setSystemSettings(data);
        applySEO(data);
      }
    } catch (err) {
      console.error('Error fetching system settings:', err);
    }
  };

  const applySEO = (settings: any) => {
    const systemName = settings.seo_title || 'Ublo Chat';
    document.title = systemName;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', settings.seo_description || 'Gerencie suas instâncias e chatbots com facilidade.');

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', settings.seo_keywords || 'whatsapp, api, ublo chat, automação');

    // Favicon
    if (settings.favicon_url) {
      let linkFav = document.querySelector("link[rel*='icon']");
      if (!linkFav) {
        linkFav = document.createElement('link');
        linkFav.setAttribute('rel', 'shortcut icon');
        document.head.appendChild(linkFav);
      }
      linkFav.setAttribute('href', settings.favicon_url);
    }

    // OG Tags
    const ogTags = [
      { property: 'og:title', content: systemName },
      { property: 'og:description', content: settings.seo_description || 'Gerencie suas instâncias e chatbots com facilidade.' },
      { property: 'og:image', content: settings.og_image_url },
      { property: 'og:type', content: 'website' }
    ];

    ogTags.forEach(tag => {
      if (!tag.content) return;
      let meta = document.querySelector(`meta[property="${tag.property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', tag.property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', tag.content);
    });
  };

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');

    if (status === 'success') {
      showToast('Pagamento aprovado com sucesso! 🎉', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'canceled') {
      showToast('Pagamento cancelado ou não concluído.', 'info');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showToast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', isSidebarExpanded.toString());
  }, [isSidebarExpanded]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    showToast(`Modo ${newMode ? 'escuro' : 'claro'} ativado`, 'info');
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);

    // Update URL to path format (/livechat instead of ?tab=livechat)
    window.history.pushState({ tab }, '', `/${tab}`);

    if (isMobileOpen) setIsMobileOpen(false);
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      let tab = event.state?.tab;

      if (!tab) {
        tab = window.location.pathname.replace('/', '') || 'dashboard';
      }

      setActiveTab(tab as TabType);
      localStorage.setItem('activeTab', tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  useEffect(() => {
    // Sincroniza a URL inicial com o formato de path
    const path = window.location.pathname.replace('/', '');

    if (!path || path !== activeTab) {
      window.history.replaceState({ tab: activeTab }, '', `/${activeTab}`);
    }
  }, []);

  if (!user) {
    switch (authView) {
      case 'register':
        return (
          <RegisterPage
            onLogin={() => setAuthView('login')}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordPage
            onBack={() => setAuthView('login')}
            onRegister={() => setAuthView('register')}
          />
        );
      default:
        return (
          <LoginPage
            onLoginSuccess={(userData) => setUser(userData)}
            onRegister={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        );
    }
  }

  // Calculate blocking state
  const isBlocked = userProfile?.status === 'INACTIVE' && userProfile?.role !== 'ADMIN';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'instances': return <InstancesView isBlocked={isBlocked} />;
      case 'analytics': return <AnalyticsView />;
      case 'chatbots': return <ChatbotsView isBlocked={isBlocked} />;
      case 'livechat': return <LiveChatView isBlocked={isBlocked} />;
      case 'users': return <UsersView />;
      case 'settings': return <SettingsView />;
      case 'contacts': return <ContactsView />;
      case 'apidocs': return <ApiDocsView />;
      case 'subscription': return <MyPlanView />;
      case 'aisettings': return <AIConfigView onTabChange={handleTabChange} />;
      case 'admin': return <AdminView />;
      case 'flowbuilder': return <FlowBuilderView isBlocked={isBlocked} />;
      case 'broadcast': return <BroadcastView isBlocked={isBlocked} />;
      default: return <DashboardView />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return `Olá, ${userProfile?.full_name?.split(' ')[0] || 'Bem-vindo'}! 👋`;
      case 'instances': return 'Gerenciamento';
      case 'analytics': return 'Relatórios e Métricas';
      case 'chatbots': return 'Automações Inteligentes';
      case 'livechat': return 'Atendimento em Tempo Real';
      case 'users': return 'Equipe e Acessos';
      case 'settings': return 'Configurações de Sistema';
      case 'contacts': return 'Meus Contatos';
      case 'apidocs': return 'Documentação Técnica';
      case 'subscription': return 'Controle de Assinatura';
      case 'aisettings': return 'Inteligência Artificial';
      case 'admin': return 'Painel Administrativo';
      case 'flowbuilder': return 'Flow Builder';
      case 'broadcast': return 'Mensagens em Massa';
      default: return 'Evolution API';
    }
  }

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': {
        const date = new Date();
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long'
        });
        const formattedDate = formatter.format(date);
        return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      }
      case 'instances': return 'Controle suas conexões em tempo real';
      case 'analytics': return 'Acompanhe a saúde das suas conversas';
      case 'chatbots': return 'Crie fluxos e respostas automáticas';
      case 'livechat': return 'Converse diretamente com seus clientes';
      case 'users': return 'Gerencie permissões de colaboradores';
      case 'settings': return 'Ajuste os parâmetros do seu ambiente';
      case 'contacts': return 'Gerencie sua lista de clientes e leads';
      case 'apidocs': return 'Integre o Evolution Leve com seus sistemas';
      case 'subscription': return 'Gerencie seu plano e limites de uso';
      case 'aisettings': return 'Configure seu assistente Gemini AI';
      case 'admin': return 'Gerenciamento global do sistema';
      case 'flowbuilder': return 'Crie fluxos de conversação avançados';
      case 'broadcast': return 'Gerencie suas campanhas de transmissão';
      default: return '';
    }
  }

  const isFullView = activeTab === 'livechat';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark selection:bg-primary-light selection:text-white transition-colors duration-500 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        systemSettings={systemSettings}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Status Warning Banners */}
        {userProfile?.role !== 'ADMIN' && (
          <>
            {subscription?.status === 'EXPIRED' && (
              <div className="bg-amber-500 text-white px-6 py-2.5 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 z-[100] shadow-lg">
                <AlertCircle className="w-4 h-4 animate-bounce" />
                <p className="text-[11px] font-black uppercase tracking-widest text-center">
                  Seu plano expirou! Você tem 24h de carência para renovar antes das funcionalidades serem bloqueadas.
                </p>
                <button
                  onClick={() => setActiveTab('subscription')}
                  className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black transition-colors"
                >
                  RENOVAR AGORA
                </button>
              </div>
            )}
            {subscription?.status === 'BLOCKED' && (
              <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 z-[100] shadow-lg">
                <Lock className="w-4 h-4 animate-pulse" />
                <p className="text-[11px] font-black uppercase tracking-widest text-center">
                  Funcionalidades Bloqueadas! Seu plano venceu há mais de 24h. Regularize sua assinatura para voltar a usar.
                </p>
                <button
                  onClick={() => setActiveTab('subscription')}
                  className="ml-4 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-black transition-colors"
                >
                  VER PLANOS
                </button>
              </div>
            )}
            {userProfile?.status === 'INACTIVE' && (
              <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 z-[100] shadow-lg">
                <AlertCircle className="w-4 h-4" />
                <p className="text-[11px] font-black uppercase tracking-widest">
                  Esta conta está suspensa por infração aos termos da plataforma.
                </p>
              </div>
            )}
          </>
        )}

        {/* Header - Stays Fixed at Top */}
        <div className="p-4 md:p-6 lg:p-8 lg:pb-0 shrink-0 z-30">
          <Header
            title={getPageTitle()}
            subtitle={getPageSubtitle()}
            activeTab={activeTab}
            onMenuClick={() => setIsMobileOpen(true)}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        </div>

        {/* Main Viewport */}
        <main className={`flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 overflow-hidden`}>
          <div className={`h-full w-full ${isFullView ? 'flex flex-col' : 'overflow-y-auto custom-scrollbar pb-10'}`}>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;
