import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Loader2, ArrowLeft, Send, Key, Lock, Fingerprint, Globe, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordPageProps {
    onBack: () => void;
    onRegister: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBack, onRegister }) => {
    const [whatsapp, setWhatsapp] = useState('55');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState<'input_number' | 'input_code' | 'reset_success'>('input_number');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('pw-recovery', {
                body: { action: 'send_code', payload: { whatsapp } }
            });

            if (error) {
                let errorMsg = 'Erro ao enviar código';
                try {
                    const errorBody = await error.context.json();
                    if (errorBody.error) errorMsg = errorBody.error;
                } catch (e) { }
                throw new Error(errorMsg);
            }
            if (data?.error) throw new Error(data.error);

            showToast('Código enviado via WhatsApp!', 'success');
            setStep('input_code');
        } catch (error: any) {
            showToast(error.message || 'Erro ao enviar código', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length !== 5) {
            showToast('Informe o código de 5 dígitos', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showToast('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('pw-recovery', {
                body: {
                    action: 'verify_and_update',
                    payload: { whatsapp, code, new_password: newPassword }
                }
            });

            if (error) {
                let errorMsg = 'Erro ao redefinir senha';
                try {
                    const errorBody = await error.context.json();
                    if (errorBody.error) errorMsg = errorBody.error;
                } catch (e) { }
                throw new Error(errorMsg);
            }
            if (data?.error) throw new Error(data.error);

            setStep('reset_success');
            showToast('Senha alterada com sucesso!', 'success');
        } catch (error: any) {
            showToast(error.message || 'Erro ao redefinir senha', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="w-full max-w-[440px] space-y-10 py-8">
                {/* Header Back Button & Logo */}
                <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-700 text-center">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para login
                    </button>
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Key className="text-primary w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Recuperação</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            {step === 'input_number' ? 'Resgate seu acesso via WhatsApp' : (step === 'input_code' ? 'Defina sua nova senha' : 'Acesso recuperado')}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 sm:border sm:border-slate-100 dark:sm:border-slate-800 sm:rounded-[2.5rem] sm:p-10 sm:shadow-2xl sm:shadow-primary/5 transition-all">
                    {step === 'input_number' && (
                        <form onSubmit={handleSendCode} className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">WhatsApp Cadastrado</label>
                                <div className="relative group">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                    <input
                                        type="tel"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="55..."
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Enviar Código <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </form>
                    )}

                    {step === 'input_code' && (
                        <form onSubmit={handleVerifyAndReset} className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            <div className="space-y-2 text-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Código de 5 dígitos</label>
                                <div className="relative group mt-2">
                                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5 hidden sm:block" />
                                    <input
                                        type="text"
                                        maxLength={5}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="00000"
                                        required
                                        className="w-full py-4 sm:pl-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-2xl font-black text-center tracking-[0.5em] outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nova Senha</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                        minLength={6}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Redefinir Senha <CheckCircle2 className="w-4 h-4" /></>}
                            </button>
                        </form>
                    )}

                    {step === 'reset_success' && (
                        <div className="text-center space-y-8 animate-in zoom-in duration-500 py-4">
                            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black dark:text-white">Sucesso!</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Sua nova senha já está ativa.</p>
                            </div>
                            <button
                                onClick={onBack}
                                className="w-full py-5 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl hover:bg-black transition-all shadow-2xl shadow-black/20"
                            >
                                Voltar ao Login
                            </button>
                        </div>
                    )}

                    {step !== 'reset_success' && (
                        <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col items-center gap-4">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Lembrou a senha?
                            </p>
                            <button
                                onClick={onRegister}
                                className="text-primary font-black hover:underline underline-offset-4 text-sm"
                            >
                                Criar novo cadastro
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
