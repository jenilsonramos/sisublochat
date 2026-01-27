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
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col lg:flex-row overflow-y-auto">
            {/* Left Side: Minimalist Branding (Desktop) */}
            <div className="hidden lg:flex lg:w-[40%] bg-slate-50 dark:bg-slate-900 items-center justify-center p-12 border-right border-slate-100 dark:border-slate-800">
                <div className="max-w-md space-y-12">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center animate-in zoom-in duration-700">
                        <Key className="text-primary w-10 h-10" />
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter italic">
                            Recupere o seu acesso agora.
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Rápido, seguro e direto no seu celular cadastrado no sistema.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Recovery Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-20 bg-white dark:bg-slate-950">
                <div className="w-full max-w-[440px]">
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors mb-6"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar para login
                            </button>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Recuperar Senha</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                {step === 'input_number' ? 'Insira seu WhatsApp cadastrado para receber o código de verificação.' : (step === 'input_code' ? 'Informe o código de 5 dígitos e sua nova senha.' : 'Sua senha foi redefinida com sucesso.')}
                            </p>
                        </div>

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
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Solicitar Código <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                                </button>
                            </form>
                        )}

                        {step === 'input_code' && (
                            <form onSubmit={handleVerifyAndReset} className="space-y-6 animate-in slide-in-from-bottom duration-500">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Código de 5 dígitos</label>
                                    <div className="relative group">
                                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                        <input
                                            type="text"
                                            maxLength={5}
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                            placeholder="00000"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none text-center font-black text-2xl tracking-[0.5em]"
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
                                            placeholder="No mínimo 6 caracteres"
                                            required
                                            minLength={6}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
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
                            <div className="text-center space-y-8 animate-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black dark:text-white">Senha Redefinida!</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium font-medium">Você já pode utilizar sua nova senha para acessar sua conta.</p>
                                </div>
                                <button
                                    onClick={onBack}
                                    className="w-full py-5 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl hover:bg-black transition-all shadow-2xl shadow-black/20"
                                >
                                    Ir para o Login
                                </button>
                            </div>
                        )}

                        <div className="pt-8 border-t border-slate-50 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Não possui uma conta?
                            </p>
                            <button
                                onClick={onRegister}
                                className="text-primary font-black hover:underline underline-offset-4 text-sm"
                            >
                                Criar conta agora
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
