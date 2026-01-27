import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Mail, Lock, Loader2, ArrowRight, Shield } from 'lucide-react';

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
        <div className="min-h-screen w-full bg-white dark:bg-slate-950 flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-[440px] space-y-8 py-12 sm:py-20">
                {/* Logo Centralizado */}
                <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-700">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Shield className="text-primary w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Ublo Chat</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Acesse sua conta profissional</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 sm:border sm:border-slate-100 dark:sm:border-slate-800 sm:rounded-[2.5rem] p-6 sm:p-10 sm:shadow-2xl sm:shadow-primary/5 transition-all">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-mail Corporativo</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Senha de Acesso</label>
                                <button
                                    type="button"
                                    onClick={onForgotPassword}
                                    className="text-[10px] font-black text-primary hover:brightness-110 transition-colors uppercase tracking-widest"
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
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
                                />
                            </div>
                        </div>

                        {captchaSettings?.captcha_provider === 'turnstile' && (
                            <div className="flex justify-center py-2 scale-90 sm:scale-100">
                                <div
                                    className="cf-turnstile"
                                    data-sitekey={captchaSettings.captcha_site_key}
                                    data-callback="onTurnstileSuccess"
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
                            className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Acessar Plataforma
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col items-center gap-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Não tem uma conta?
                        </p>
                        <button
                            onClick={onRegister}
                            className="text-primary font-black hover:underline underline-offset-4 text-sm"
                        >
                            Crie seu cadastro gratuito
                        </button>
                    </div>
                </div>
                {/* Spacer extra para garantir que o scroll vá até o fim no mobile */}
                <div className="h-8 sm:hidden"></div>
            </div>
        </div>
    );
};

export default LoginPage;
