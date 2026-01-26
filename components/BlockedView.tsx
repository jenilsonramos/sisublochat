import React from 'react';
import { ShieldAlert, LogOut, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const BlockedView: React.FC = () => {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.05),transparent)]">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center shadow-2xl border border-rose-100 dark:border-rose-900/20 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-rose-50 dark:bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-rose-500/10">
                    <ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" />
                </div>

                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-6 italic tracking-tight">
                    Acesso Suspenso
                </h1>

                <div className="bg-rose-50/50 dark:bg-rose-500/5 p-6 rounded-3xl mb-10 border border-rose-100/50 dark:border-rose-900/10">
                    <p className="text-slate-600 dark:text-rose-200/70 font-medium leading-relaxed">
                        Esta conta está <span className="text-rose-600 font-black">bloqueada</span> por infringir os termos de uso da plataforma ou por pendências administrativas.
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                        className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Falar com Suporte
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full py-5 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sair da Conta
                    </button>
                </div>

                <p className="mt-12 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    ID de Segurança: {Math.random().toString(36).substring(7).toUpperCase()}
                </p>
            </div>
        </div>
    );
};

export default BlockedView;
