import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Mail, Lock, User, Loader2, ArrowRight, Rocket, Globe } from 'lucide-react';

interface RegisterPageProps {
    onLogin: () => void;
    onForgotPassword: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin, onForgotPassword }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('55');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaSettings, setCaptchaSettings] = useState<any>(null);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const { showToast } = useToast();

    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: 'bg-slate-200' });

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

    const checkPasswordStrength = (pw: string) => {
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        const levels = [
            { label: 'Muito Fraca', color: 'bg-rose-500' },
            { label: 'Fraca', color: 'bg-amber-500' },
            { label: 'Média', color: 'bg-blue-500' },
            { label: 'Forte', color: 'bg-emerald-500' },
            { label: 'Muito Forte', color: 'bg-emerald-600' }
        ];

        setPasswordStrength({ score, ...levels[score] });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        let currentCaptchaToken = captchaToken;

        if (captchaSettings?.captcha_provider === 'recaptcha') {
            setLoading(true);
            try {
                // @ts-ignore
                if (window.grecaptcha) {
                    // @ts-ignore
                    currentCaptchaToken = await window.grecaptcha.execute(captchaSettings.captcha_site_key, { action: 'register' });
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
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        whatsapp: whatsapp,
                        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=059669,10b981,34d399`,
                    },
                    captchaToken: currentCaptchaToken || undefined,
                },
            });

            if (error) throw error;

            if (data.session) {
                showToast('Conta criada com sucesso! Entrando...', 'success');
                onLogin();
            } else {
                if (data.user && !data.user.confirmed_at && !data.session) {
                    showToast('Conta criada! Verifique seu e-mail para confirmar.', 'success');
                } else {
                    showToast('Conta criada com sucesso!', 'success');
                    onLogin();
                }
            }
        } catch (error: any) {
            showToast(error.message || 'Erro ao criar conta', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-white dark:bg-slate-950 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-[520px] space-y-8 py-10 sm:py-12">
                {/* Logo Centralizado */}
                <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-700">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Rocket className="text-primary w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Evolution</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Crie sua conta em segundos</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 sm:border sm:border-slate-100 dark:sm:border-slate-800 sm:rounded-[2.5rem] p-6 sm:p-10 sm:shadow-2xl sm:shadow-primary/5 transition-all">
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Seu nome"
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">WhatsApp</label>
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
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-mail Profissional</label>
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
                                {password && (
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${passwordStrength.color} transition-all duration-500`}>
                                        {passwordStrength.label}
                                    </span>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        checkPasswordStrength(e.target.value);
                                    }}
                                    placeholder="No mínimo 8 caracteres"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-2xl transition-all dark:text-white text-sm outline-none"
                                />
                            </div>
                            {password && (
                                <div className="flex gap-1 px-1 h-1 mt-2">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 rounded-full transition-all duration-500 ${i <= passwordStrength.score ? passwordStrength.color : 'bg-slate-100 dark:bg-slate-800'
                                                }`}
                                        />
                                    ))}
                                </div>
                            )}
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
                            disabled={loading || (password.length > 0 && passwordStrength.score < 2)}
                            className="w-full py-5 bg-primary text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Criar minha conta
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col items-center gap-4 text-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Já possui uma conta?
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={onLogin}
                                className="text-primary font-black hover:underline underline-offset-4 text-sm"
                            >
                                Fazer login
                            </button>
                            <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2" />
                            <button
                                onClick={onForgotPassword}
                                className="text-sm font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
                            >
                                Esqueci a senha
                            </button>
                        </div>
                    </div>
                </div>
                {/* Spacer extra para mobile */}
                <div className="h-8 sm:hidden"></div>
            </div>
        </div>
    );
};

export default RegisterPage;
