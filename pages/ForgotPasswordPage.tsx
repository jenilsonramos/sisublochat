import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Phone, Loader2, ArrowLeft, Send, Key, Lock, Fingerprint, Globe, CheckCircle2 } from 'lucide-react';

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Side: Branding & Visuals (Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-amber-500 items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.1),transparent)] animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-80 h-80 bg-white rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10 max-w-lg text-white">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-white/30 animate-in slide-in-from-left duration-700">
                        <Key className="text-white w-12 h-12" />
                    </div>
                    <h2 className="text-5xl font-black mb-6 leading-tight animate-in slide-in-from-left duration-700 delay-100 italic tracking-tighter">
                        Recupere seu <br /> WhatsApp access.
                    </h2>
                    <p className="text-xl text-white/80 font-medium mb-12 animate-in slide-in-from-left duration-700 delay-200">
                        Rápido, seguro e direto no seu celular. Sem depender de e-mails que caem no spam.
                    </p>

                    <div className="space-y-6 animate-in slide-in-from-left duration-700 delay-300">
                        <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/15 transition-all">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Lock className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Código de 5 Dígitos</h4>
                                <p className="text-xs text-white/60">Verificação instantânea via WhatsApp.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/15 transition-all">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Fingerprint className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Privacidade Total</h4>
                                <p className="text-xs text-white/60">Garantimos que apenas o dono do número acesse.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Recovery Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-[440px] animate-in fade-in zoom-in duration-500 lg:duration-700">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl lg:shadow-none p-10 lg:p-12 border border-slate-100 dark:border-slate-800 lg:border-none">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-amber-500 uppercase tracking-widest mb-10 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar para login
                        </button>

                        <div className="text-center lg:text-left mb-10">
                            <div className="lg:hidden w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons-round text-amber-500 text-5xl">key</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-950 dark:text-white mb-3 tracking-tight">Recuperar</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                {step === 'input_number' ? 'Insira seu WhatsApp (com 55) para receber o código.' : (step === 'input_code' ? 'Informe o código de 5 dígitos enviado e sua nova senha.' : 'Tudo certo! Sua conta foi recuperada.')}
                            </p>
                        </div>

                        {step === 'input_number' && (
                            <form onSubmit={handleSendCode} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp Cadastrado</label>
                                    <div className="relative group">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                        <input
                                            type="tel"
                                            value={whatsapp}
                                            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="55..."
                                            required
                                            className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-500/20 focus:bg-white focus:ring-4 focus:ring-amber-500/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 transition-all shadow-2xl shadow-amber-500/30 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Solicitar Código <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                                </button>
                            </form>
                        )}

                        {step === 'input_code' && (
                            <form onSubmit={handleVerifyAndReset} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de 5 dígitos</label>
                                    <div className="relative group">
                                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                        <input
                                            type="text"
                                            maxLength={5}
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                            placeholder="00000"
                                            required
                                            className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-500/20 focus:bg-white focus:ring-4 focus:ring-amber-500/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none text-center font-black text-2xl tracking-[0.5em]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            minLength={6}
                                            className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-500/20 focus:bg-white focus:ring-4 focus:ring-amber-500/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Redefinir Senha <ArrowLeft className="w-4 h-4 rotate-180" /></>}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep('input_number')}
                                    className="w-full text-[10px] font-black text-slate-400 hover:text-amber-500 uppercase tracking-widest transition-colors"
                                >
                                    Trocar Número
                                </button>
                            </form>
                        )}

                        {step === 'reset_success' && (
                            <div className="text-center space-y-8 animate-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black dark:text-white">Sucesso!</h2>
                                    <p className="text-slate-500 dark:text-slate-400">Sua senha foi redefinida. Você já pode acessar sua conta.</p>
                                </div>
                                <button
                                    onClick={onBack}
                                    className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-2xl shadow-black/20"
                                >
                                    Fazer Login Agora
                                </button>
                            </div>
                        )}

                        <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800">
                            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                                Não tem uma conta?{' '}
                                <button
                                    onClick={onRegister}
                                    className="text-amber-500 font-black hover:underline underline-offset-4"
                                >
                                    Crie agora mesmo
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
