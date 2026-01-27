
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
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 mb-8 px-2 lg:px-0">
      <div className="flex items-center justify-between lg:justify-start gap-4 animate-in fade-in slide-in-from-left duration-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          >
            <span className="material-icons-round">menu</span>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] md:text-xs lg:text-sm mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Mobile-only avatar or actions if needed */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-500 transition-all active:scale-95"
          >
            <span className="material-icons-round text-lg">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 flex-col sm:flex-row w-full lg:w-auto">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative group flex-1 sm:flex-initial">
            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-light transition-colors text-lg">search</span>
            <input
              className="pl-11 pr-4 py-2.5 rounded-xl border-none bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-primary-light w-full sm:w-48 md:w-64 lg:w-80 text-sm transition-all duration-300"
              placeholder="Pesquisar..."
              type="text"
            />
          </div>

          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            className="hidden lg:flex p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90"
          >
            <span className="material-icons-round text-xl">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0">
          <div className="flex items-center gap-3">
            {showAddButton && (
              <button className="flex-1 sm:flex-initial bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 text-sm">
                <span className="material-icons-round text-lg">add</span>
                <span>Novo</span>
              </button>
            )}

            <button className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative">
              <span className="material-icons-round text-xl">notifications_none</span>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
            </button>
          </div>

          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-md ring-2 ring-transparent hover:ring-primary-light transition-all cursor-pointer shrink-0">
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
