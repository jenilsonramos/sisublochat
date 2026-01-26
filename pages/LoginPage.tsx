import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Mail, Lock, Loader2, ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';

interface LoginPageProps {
    onLoginSuccess: (user: any) => void;
    onRegister: () => void;
    onForgotPassword: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onRegister, onForgotPassword }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaSettings, setCaptchaSettings] = useState<any>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const { showToast } = useToast();

    React.useEffect(() => {
        const fetchCaptcha = async () => {
            const { data } = await supabase.from('system_settings').select('captcha_provider, captcha_site_key').limit(1).single();
            if (data && data.captcha_provider !== 'none') {
                setCaptchaSettings(data);
                loadCaptchaScript(data.captcha_provider, data.captcha_site_key);
            }
        };
        fetchCaptcha();

        const handleTurnstile = (e: any) => setCaptchaToken(e.detail);
        window.addEventListener('turnstile-success', handleTurnstile);
        return () => window.removeEventListener('turnstile-success', handleTurnstile);
    }, []);

    const loadCaptchaScript = (provider: string, siteKey: string) => {
        if (provider === 'recaptcha') {
            if (document.querySelector(`script[src*="recaptcha/api.js?render=${siteKey}"]`)) return;
            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
            script.async = true;
            document.body.appendChild(script);
        } else if (provider === 'turnstile') {
            if (document.querySelector('script[src*="turnstile/v0/api.js"]')) return;
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            document.body.appendChild(script);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        let currentToken = captchaToken;
        if (captchaSettings?.captcha_provider === 'recaptcha') {
            setLoading(true);
            try {
                // @ts-ignore
                if (window.grecaptcha) {
                    // @ts-ignore
                    currentToken = await window.grecaptcha.execute(captchaSettings.captcha_site_key, { action: 'login' });
                } else {
                    console.warn('reCAPTCHA not loaded yet');
                }
            } catch (err) {
                console.error('reCAPTCHA execution failed:', err);
                showToast('Erro ao validar desafio de segurança. Tente novamente.', 'error');
                setLoading(false);
                return;
            }
        } else if (captchaSettings?.captcha_provider === 'turnstile' && !captchaToken) {
            showToast('Por favor, complete o desafio de segurança', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: {
                    captchaToken: currentToken || undefined,
                }
            });

            if (error) throw error;

            showToast('Login realizado com sucesso!', 'success');
            onLoginSuccess(data.user);
        } catch (error: any) {
            showToast(error.message || 'Credenciais inválidas', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Side: Branding & Visuals (Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent)] animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10 max-w-lg text-white">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-white/30 animate-in slide-in-from-bottom duration-700">
                        <Zap className="text-white w-12 h-12 fill-white" />
                    </div>
                    <h2 className="text-5xl font-black mb-6 leading-tight animate-in slide-in-from-bottom duration-700 delay-100 italic tracking-tighter">
                        Evolua sua <br /> comunicação.
                    </h2>
                    <p className="text-xl text-white/80 font-medium mb-12 animate-in slide-in-from-bottom duration-700 delay-200">
                        A plataforma definitiva para automação de WhatsApp com inteligência e escala.
                    </p>

                    <div className="space-y-6 animate-in slide-in-from-bottom duration-700 delay-300">
                        <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/15 transition-all">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Segurança Enterprise</h4>
                                <p className="text-xs text-white/60">Seus dados protegidos com criptografia de ponta.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/15 transition-all">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">IA Generativa</h4>
                                <p className="text-xs text-white/60">Atendimento humano via inteligência artificial.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-[440px] animate-in fade-in zoom-in duration-500 lg:duration-700">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl lg:shadow-none p-10 lg:p-12 border border-slate-100 dark:border-slate-800 lg:border-none">
                        <div className="text-center lg:text-left mb-10">
                            <div className="lg:hidden w-20 h-20 bg-primary/10 dark:bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons-round text-primary text-5xl">rocket_launch</span>
                            </div>
                            <div className="flex flex-col items-center lg:items-start gap-4 mb-8">
                                <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 animate-in zoom-in duration-700">
                                    <Shield className="text-white w-8 h-8 fill-white" />
                                </div>
                                <div className="text-center lg:text-left">
                                    <h1 className="text-4xl font-black text-slate-950 dark:text-white tracking-tight">Login</h1>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Acesse sua conta Evolution</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        required
                                        className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha de Acesso</label>
                                    <button
                                        type="button"
                                        onClick={onForgotPassword}
                                        className="text-[10px] font-black text-primary hover:text-primary-light transition-colors uppercase tracking-widest"
                                    >
                                        Esqueci a senha
                                    </button>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-primary/20 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>

                            {captchaSettings?.captcha_provider === 'turnstile' && (
                                <div className="flex justify-center py-2 animate-in fade-in duration-500">
                                    <div
                                        className="cf-turnstile"
                                        data-sitekey={captchaSettings.captcha_site_key}
                                        data-callback="onTurnstileSuccess"
                                        style={{ height: '65px' }}
                                    ></div>
                                    <script dangerouslySetInnerHTML={{
                                        __html: `
                                            window.onTurnstileSuccess = function(token) {
                                                window.dispatchEvent(new CustomEvent('turnstile-success', { detail: token }));
                                            };
                                        `
                                    }} />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Entrar na Evolution
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800">
                            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                                Novo por aqui?{' '}
                                <button
                                    onClick={onRegister}
                                    className="text-primary font-black hover:underline underline-offset-4"
                                >
                                    Crie sua conta agora
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
