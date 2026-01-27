import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    CreditCard,
    CheckCircle2,
    Smartphone,
    Users,
    Bot,
    ArrowUpCircle,
    Clock,
    ShieldCheck,
    Zap,
    TrendingUp,
    Package,
    X,
    Loader2
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import { useRef } from 'react';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    max_instances: number;
    max_contacts: number;
    max_chatbots: number;
    max_users: number;
    ai_enabled: boolean;
    stripe_price_id?: string;
    features: string[];
}

interface Subscription {
    id: string;
    plan: Plan;
    status: string;
    current_period_end: string;
}

const MyPlanView: React.FC = () => {
    const [initialLoading, setInitialLoading] = useState(true);
    const [subscribingId, setSubscribingId] = useState<string | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState({
        instances: 0,
        contacts: 0,
        chatbots: 0,
        users: 0
    });
    const [payments, setPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const plansRef = useRef<HTMLDivElement>(null);

    const { showToast } = useToast();

    useEffect(() => {
        fetchSubscriptionData();
    }, []);

    const fetchSubscriptionData = async () => {
        try {
            setInitialLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Plans
            const { data: plansData } = await supabase.from('plans').select('*').order('price', { ascending: true });
            setPlans(plansData || []);

            // 2. Fetch User Subscription
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select(`
          id,
          status,
          current_period_end,
          plan:plans (*)
        `)
                .eq('user_id', user.id)
                .single();

            if (subError && subError.code !== 'PGRST116') {
                throw subError;
            }

            // If no subscription, assign the basic one for display (simulating SaaS behavior)
            if (!subData) {
                const basicPlan = (plansData || []).find(p => p.name === 'Básico');
                if (basicPlan) {
                    setSubscription({
                        id: 'trial',
                        status: 'trial',
                        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        plan: basicPlan
                    });
                }
            } else {
                setSubscription(subData as any);
            }

            // 3. Fetch Usage Stats
            const res: any[] = await Promise.all([
                supabase.from('instances').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('chatbots').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('profiles').select('*', { count: 'exact', head: true }) // Simplified for trial/basic
            ]);

            const [instRes, contactsRes, botsRes, usersRes] = res;

            setUsage({
                instances: instRes.count || 0,
                contacts: contactsRes.count || 0,
                chatbots: botsRes.count || 0,
                users: usersRes.count || 0
            });

            // 4. Fetch Payments
            fetchPayments(user.id);

        } catch (err: any) {
            console.error('Error fetching subscription:', err);
            showToast('Erro ao carregar dados do plano', 'error');
        } finally {
            setInitialLoading(false);
        }
    };

    const fetchPayments = async (userId: string) => {
        try {
            setLoadingPayments(true);
            const { data, error } = await supabase
                .from('payment_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) setPayments(data);
        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoadingPayments(false);
        }
    };

    const handleSubscribe = async (plan: Plan) => {
        try {
            if (!plan.stripe_price_id) {
                showToast('Este plano ainda não foi sincronizado com o Stripe.', 'error');
                return;
            }

            setSubscribingId(plan.id);
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    priceId: plan.stripe_price_id,
                    successUrl: window.location.origin + '?status=success',
                    cancelUrl: window.location.origin + '?status=canceled'
                })
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Erro ao iniciar checkout');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
            setSubscribingId(null);
        }
    };

    const UsageBar = ({ label, current, max, icon, color }: { label: string, current: number, max: number, icon: React.ReactNode, color: string }) => {
        const percentage = Math.min((current / max) * 100, 100);
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
                            {icon}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
                            <p className="text-lg font-black dark:text-white">{current} <span className="text-slate-400 font-medium">/ {max}</span></p>
                        </div>
                    </div>
                    <span className={`text-xs font-bold ${percentage > 90 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {percentage.toFixed(0)}%
                    </span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-${color}-500 transition-all duration-1000 ease-out rounded-full shadow-lg shadow-${color}-500/20`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    };

    if (initialLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando sua assinatura...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Top Banner: Current Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-primary to-emerald-500 p-[2px] rounded-[3rem] shadow-2xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-500">
                    <div className="bg-white dark:bg-slate-900 h-full w-full rounded-[2.9rem] p-10 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
                        {/* Ambient light effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="space-y-6 text-center md:text-left relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                                <ShieldCheck className="w-4 h-4" />
                                Seu status contratual
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black dark:text-white tracking-tighter italic">
                                {subscription?.plan.name || 'Básico'}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md text-base leading-relaxed">
                                {subscription?.plan.description || 'Aproveite os recursos essenciais do Evolution Leve.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-400 justify-center md:justify-start">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    Renovação: <span className="dark:text-white">{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                                    <Zap className="w-3.5 h-3.5 fill-emerald-500" />
                                    Assinatura Ativa
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] text-center min-w-[220px] border border-slate-100 dark:border-slate-700/50 shadow-inner relative z-10 group">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo Mensal</p>
                            <div className="flex items-end justify-center gap-1">
                                <span className="text-sm font-bold text-slate-400 mb-2">R$</span>
                                <span className="text-6xl font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform duration-500 inline-block">{subscription?.plan.price.toFixed(2).split('.')[0]}</span>
                                <span className="text-2xl font-bold text-slate-400 mb-2">,{subscription?.plan.price.toFixed(2).split('.')[1]}</span>
                            </div>
                            <button
                                onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                className="mt-8 w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black rounded-2xl transition-all shadow-2xl shadow-black/20 dark:shadow-white/10 active:scale-95 uppercase tracking-widest hover:bg-black dark:hover:bg-slate-200"
                            >
                                Gerenciar Plano
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mini Stats Card */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-xl font-black dark:text-white">Faturamento</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Acompanhe seu histórico de faturas e pagamentos realizados.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar min-h-[180px]">
                        {loadingPayments ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-slate-200 animate-spin" />
                            </div>
                        ) : payments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center py-6 text-center">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center mb-3">
                                    <CreditCard className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nenhuma fatura encontrada</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {payments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black dark:text-white">R$ {payment.amount.toFixed(2)}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{new Date(payment.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${payment.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="w-full mt-6 py-4 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2">
                        Histórico Completo
                        <TrendingUp className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Usage Section */}
            <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center rounded-2xl text-indigo-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black dark:text-white">Monitoramento de Recursos</h2>
                        <p className="text-sm text-slate-500 font-medium">Uso atual em tempo real dos limites contratados.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <UsageBar
                        label="Instâncias"
                        current={usage.instances}
                        max={subscription?.plan.max_instances || 1}
                        icon={<Smartphone className="w-5 h-5" />}
                        color="indigo"
                    />
                    <UsageBar
                        label="Contatos"
                        current={usage.contacts}
                        max={subscription?.plan.max_contacts || 100}
                        icon={<Users className="w-5 h-5" />}
                        color="emerald"
                    />
                    <UsageBar
                        label="Chatbots"
                        current={usage.chatbots}
                        max={subscription?.plan.max_chatbots || 1}
                        icon={<Bot className="w-5 h-5" />}
                        color="amber"
                    />
                    <UsageBar
                        label="Usuários"
                        current={usage.users}
                        max={subscription?.plan.max_users || 1}
                        icon={<Users className="w-5 h-5" />}
                        color="indigo"
                    />
                </div>
            </section>

            {/* Available Plans Grid */}
            <section ref={plansRef} className="space-y-8 pt-10">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black dark:text-white">Turbine seu Evolution</h2>
                    <p className="text-slate-500 font-medium italic">Escalabilidade sob demanda para o seu negócio.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-sm border transition-all hover:translate-y-[-8px] hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] duration-700 group ${plan.id === subscription?.plan.id
                                ? 'border-primary ring-[12px] ring-primary/5'
                                : 'border-slate-100 dark:border-slate-800'
                                }`}
                        >
                            {plan.id === subscription?.plan.id && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Contratado
                                </div>
                            )}

                            <div className="space-y-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-3xl font-black dark:text-white tracking-tighter">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className="text-sm font-bold text-slate-400">R$</span>
                                            <span className="text-4xl font-black text-primary">{plan.price.toFixed(2).split('.')[0]}</span>
                                            <span className="text-sm font-bold text-slate-400">,{plan.price.toFixed(2).split('.')[1]}</span>
                                        </div>
                                    </div>
                                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12 ${plan.name === 'Enterprise'
                                            ? 'bg-amber-500/10 text-amber-500'
                                            : 'bg-primary/10 text-primary'
                                        }`}>
                                        <Package className="w-7 h-7" />
                                    </div>
                                </div>

                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium min-h-[48px]">
                                    {plan.description}
                                </p>

                                <div className="space-y-5 pt-8 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        {plan.max_instances} {plan.max_instances === 1 ? 'Instância' : 'Instâncias'}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <Users className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        {plan.max_contacts.toLocaleString()} Contatos
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <Bot className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        {plan.max_chatbots} {plan.max_chatbots === 1 ? 'Chatbot' : 'Chatbots'}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                            <Zap className="w-3.5 h-3.5 text-indigo-500" />
                                        </div>
                                        IA (Gemini/GPT) {plan.ai_enabled ? 'Inclusa' : 'Premium'}
                                    </div>
                                </div>

                                <button
                                    disabled={plan.id === subscription?.plan.id || !!subscribingId}
                                    onClick={() => handleSubscribe(plan)}
                                    className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-2xl relative overflow-hidden group/btn ${plan.id === subscription?.plan.id
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-primary text-white hover:scale-[1.05] shadow-primary/20 hover:shadow-primary/40 active:scale-95'
                                        }`}
                                >
                                    <span className="relative z-10">
                                        {subscribingId === plan.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (plan.id === subscription?.plan.id ? 'Plano Ativo' : 'Fazer Upgrade')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Upgrade Call-to-action */}
            <div className="bg-slate-900 dark:bg-slate-800 p-12 rounded-[4rem] text-center space-y-8 relative overflow-hidden shadow-2xl">
                <div className="relative z-10 space-y-4">
                    <ArrowUpCircle className="w-16 h-16 text-primary mx-auto mb-6" />
                    <h2 className="text-4xl font-black text-white">Precisa de algo sob medida?</h2>
                    <p className="text-slate-400 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
                        Se o seu negócio exige limites personalizados, suporte dedicado ou implementações exclusivas, fale com nosso time de especialistas SaaS.
                    </p>
                    <button className="px-10 py-5 bg-primary text-white font-black rounded-[2rem] hover:scale-105 transition-all shadow-2xl shadow-primary/40 mt-6">
                        Solicitar Orçamento Customizado
                    </button>
                </div>

                {/* Abstract Background Decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
            </div>

        </div>
    );
};

export default MyPlanView;
