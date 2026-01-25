import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Mail, Lock, User, Loader2, ArrowRight, Rocket, Target, Globe } from 'lucide-react';

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
            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
            script.async = true;
            document.body.appendChild(script);
        } else if (provider === 'turnstile') {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            document.body.appendChild(script);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        let currentToken = captchaToken;
        if (captchaSettings?.captcha_provider === 'recaptcha') {
            setLoading(true);
            try {
                // @ts-ignore
                currentToken = await window.grecaptcha.execute(captchaSettings.captcha_site_key, { action: 'register' });
            } catch (err) {
                showToast('Erro ao validar captcha', 'error');
                setLoading(false);
                return;
            }
        } else if (captchaSettings?.captcha_provider === 'turnstile' && !captchaToken) {
            showToast('Por favor, complete o desafio de segurança', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        whatsapp: whatsapp,
                    },
                    captchaToken: currentToken || undefined,
                },
            });

            if (error) throw error;

            // If auto-confirm is enabled on server, we might get a session immediately
            if (data.session) {
                showToast('Conta criada com sucesso! Entrando...', 'success');
                onLogin(); // Or direct navigation if onLogin just switches view
                // If using routing, we might need navigation here, but onLogin seems to handle the flip to Login form
            } else {
                // Check if user is created but no session (email confirmation required)
                if (data.user && !data.user.confirmed_at && !data.session) {
                    showToast('Conta criada! Verifique seu e-mail para confirmar.', 'success');
                } else {
                    // Fallback for auto-confirm scenarios where session might be missing initially
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Side: Branding & Visuals (Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-600 items-center justify-center p-12 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.1),transparent)] animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-40 right-20 w-80 h-80 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-40 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10 max-w-lg text-white">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-white/30 animate-in slide-in-from-top duration-700">
                        <Rocket className="text-white w-12 h-12 fill-white" />
                    </div>
                    <h2 className="text-5xl font-black mb-6 leading-tight animate-in slide-in-from-top duration-700 delay-100 italic tracking-tighter">
                        Alcance novos <br /> patamares.
                    </h2>
                    <p className="text-xl text-white/80 font-medium mb-12 animate-in slide-in-from-top duration-700 delay-200">
                        Comece sua jornada com a Evolution API e transforme a maneira como seu negócio se comunica.
                    </p>

                    <div className="space-y-6 animate-in slide-in-from-top duration-700 delay-300">
                        <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/15 transition-all">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Target className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Escalabilidade Infinita</h4>
                                <p className="text-xs text-white/60">Cresça sem limites com nossa infraestrutura robusta.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/15 transition-all">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Multi-instâncias</h4>
                                <p className="text-xs text-white/60">Gerencie múltiplas conexões em um único painel.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Register Form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-[440px] animate-in fade-in zoom-in duration-500 lg:duration-700">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl lg:shadow-none p-10 lg:p-12 border border-slate-100 dark:border-slate-800 lg:border-none">
                        <div className="text-center lg:text-left mb-10">
                            <div className="lg:hidden w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons-round text-emerald-500 text-5xl">person_add</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-950 dark:text-white mb-3 tracking-tight">Criar Conta</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Junte-se à revolução do atendimento.</p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Seu nome"
                                        required
                                        className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Profissional</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        required
                                        className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp (com 55)</label>
                                <div className="relative group">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                                    <input
                                        type="tel"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="55..."
                                        required
                                        className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors w-5 h-5" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                        minLength={6}
                                        className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 rounded-[1.5rem] transition-all dark:text-white text-sm outline-none"
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
                                className="w-full mt-4 py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Cadastrar com Sucesso
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800 space-y-4 text-center">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Já possui uma conta?{' '}
                                <button
                                    onClick={onLogin}
                                    className="text-emerald-600 font-black hover:underline underline-offset-4"
                                >
                                    Fazer login
                                </button>
                            </p>
                            <button
                                onClick={onForgotPassword}
                                className="text-[10px] font-black text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest"
                            >
                                Esqueci minha senha
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
