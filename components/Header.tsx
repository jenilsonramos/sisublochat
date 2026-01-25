
import React from 'react';

interface HeaderProps {
  title: string;
  subtitle: string;
  showAddButton?: boolean;
  onMenuClick: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  showAddButton = false, 
  onMenuClick,
  darkMode,
  toggleDarkMode
}) => {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 px-2 lg:px-0">
      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left duration-700">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
        >
          <span className="material-icons-round">menu</span>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <div className="relative group flex-1">
            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-light transition-colors">search</span>
            <input
              className="pl-12 pr-6 py-3 rounded-2xl border-none bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-primary-light w-full sm:w-64 md:w-80 text-sm transition-all duration-300"
              placeholder="Pesquisar aqui..."
              type="text"
            />
          </div>
          
          <button 
            onClick={toggleDarkMode}
            title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90"
          >
            <span className="material-icons-round text-xl">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {showAddButton && (
            <button className="bg-primary hover:bg-primary-light text-white px-4 md:px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-95 text-sm">
              <span className="material-icons-round text-xl">add</span>
              <span className="hidden xs:inline">Novo</span>
            </button>
          )}
          
          <div className="hidden sm:flex gap-2">
            <button className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative">
              <span className="material-icons-round text-xl">notifications_none</span>
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </button>
          </div>

          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg ring-2 ring-transparent hover:ring-primary-light transition-all cursor-pointer">
            <img 
              alt="Avatar do usuário" 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80" 
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
