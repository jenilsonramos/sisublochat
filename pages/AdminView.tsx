import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import {
    Shield,
    Users,
    Plus,
    Search,
    Check,
    X,
    Loader2,
    Trash2,
    Edit2,
    ToggleLeft,
    ToggleRight,
    Database,
    Globe,
    RefreshCw,
    Zap,
    Mail,
    Terminal,
    Save,
    Bell,
    DollarSign,
    ChevronRight,
    BarChart3,
    Lock,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

type AdminTab = 'plans' | 'users' | 'payments' | 'evolution' | 'reports' | 'security' | 'whatsapp' | 'cron' | 'seo' | 'billing';

const AdminView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('plans');
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsAdmin(false);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            setIsAdmin(data?.role === 'ADMIN');
        } catch (err) {
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isAdmin === false) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mb-6">
                    <Shield className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Acesso Negado</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">Você não tem as permissões necessárias para acessar o painel administrativo.</p>
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'plans': return <PlansManagement />;
            case 'users': return <UserManagement />;
            case 'payments': return <PaymentConfig />;
            case 'evolution': return <EvolutionConfig />;
            case 'reports': return <BillingReports />;
            case 'security': return <SecuritySettings />;
            case 'whatsapp' as any: return <WhatsAppManagement />;
            case 'cron': return <CronTasks />;
            case 'seo': return <SEOSettings />;
            case 'billing': return <BillingSettings />;
            default: return <PlansManagement />;
        }
    };

    return (
        <div className="flex flex-col h-full gap-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                {(['plans', 'users', 'billing', 'payments', 'evolution', 'reports', 'security', 'whatsapp', 'cron', 'seo'] as any[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${activeTab === tab
                            ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {tab === 'plans' && 'Planos'}
                        {tab === 'users' && 'Usuários'}
                        {tab === 'payments' && 'Meios de Pagamento'}
                        {tab === 'evolution' && 'Evolution API'}
                        {tab === 'reports' && 'Relatórios'}
                        {tab === 'billing' && 'Faturamento & E-mail'}
                        {tab === 'security' && 'Segurança'}
                        {tab === 'whatsapp' && 'WhatsApp Admin'}
                        {tab === 'cron' && 'Tarefas CRON'}
                        {tab === 'seo' && 'SEO & Branding'}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-y-auto custom-scrollbar">
                {renderTabContent()}
            </div>
        </div>
    );
};

// --- Sub-components ---

function PlansManagement() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        max_instances: 1,
        max_contacts: 100,
        max_chatbots: 1,
        max_users: 1,
        status: 'ACTIVE',
        is_public: true,
        ai_enabled: false
    });
    const { showToast } = useToast();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data } = await supabase.from('plans').select('*').order('price', { ascending: true });
        setPlans(data || []);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let planId;
            if (editingPlan) {
                const { error } = await supabase.from('plans').update(formData).eq('id', editingPlan.id);
                if (error) throw error;
                planId = editingPlan.id;
            } else {
                const { data, error } = await supabase.from('plans').insert(formData).select();
                if (error) throw error;
                planId = data[0].id;
            }

            // Trigger Stripe Sync
            try {
                await supabase.functions.invoke('stripe-sync', {
                    body: { planId }
                });
            } catch (syncErr) {
                console.error('Stripe sync failed:', syncErr);
            }

            showToast(`Plano ${editingPlan ? 'atualizado' : 'criado'} com sucesso!`, 'success');
            setShowModal(false);
            fetchPlans();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        const { error } = await supabase.from('plans').delete().eq('id', id);
        if (!error) {
            showToast('Plano excluído', 'success');
            fetchPlans();
        }
    };

    const handleSyncAll = async () => {
        try {
            setLoading(true);
            for (const plan of plans) {
                const { error } = await supabase.functions.invoke('stripe-sync', {
                    body: { planId: plan.id }
                });
                if (error) throw error;
            }
            showToast('Sincronização concluída!', 'success');
            fetchPlans();
        } catch (err: any) {
            showToast('Erro ao sincronizar: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Gerenciar Planos</h2>
                    <p className="text-sm text-slate-500">Combine funcionalidade e preço</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleSyncAll}
                        disabled={loading}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sincronizar Todos
                    </button>
                    <button
                        onClick={() => {
                            setEditingPlan(null);
                            setFormData({ name: '', price: 0, max_instances: 1, max_contacts: 100, max_chatbots: 1, max_users: 1, status: 'ACTIVE', is_public: true, ai_enabled: false });
                            setShowModal(true);
                        }}
                        className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Plano
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.id} className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 relative group transition-all hover:shadow-xl hover:shadow-primary/5">
                            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setEditingPlan(plan);
                                        setFormData({
                                            name: plan.name,
                                            price: plan.price,
                                            max_instances: plan.max_instances,
                                            max_contacts: plan.max_contacts,
                                            max_chatbots: plan.max_chatbots,
                                            max_users: plan.max_users || 1,
                                            status: plan.status,
                                            is_public: plan.is_public,
                                            ai_enabled: plan.ai_enabled || false
                                        });
                                        setShowModal(true);
                                    }}
                                    className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-400 hover:text-primary transition-colors hover:scale-110"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="p-2 bg-white dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-colors hover:scale-110"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 ${plan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                {plan.status}
                            </div>

                            <h3 className="text-xl font-black dark:text-white mb-1">{plan.name}</h3>
                            <p className="text-4xl font-black text-primary mb-6">
                                <span className="text-sm align-top mr-1 font-bold">R$</span>
                                {plan.price}
                                <span className="text-xs text-slate-400 font-bold ml-2 italic">/mes</span>
                            </p>

                            <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Instâncias</span>
                                    <span className="text-xs font-black dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">{plan.max_instances}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Contatos</span>
                                    <span className="text-xs font-black dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">{plan.max_contacts}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Chatbots</span>
                                    <span className="text-xs font-black dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">{plan.max_chatbots}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Lim. Usuários</span>
                                    <span className="text-xs font-black dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">{plan.max_users || 1}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Inteligência Artificial</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${plan.ai_enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                        {plan.ai_enabled ? 'Liberado' : 'Bloqueado'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500">Status Stripe</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${plan.stripe_price_id ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {plan.stripe_price_id ? 'Sincronizado' : 'Pendente Sync'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-10 pb-4 flex justify-between items-center shrink-0">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 pt-0 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Plano</label>
                                    <input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none border border-transparent focus:border-primary/20 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Mensal (R$)</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                        required
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none border border-transparent focus:border-primary/20 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Máx. Instâncias</label>
                                    <input
                                        type="number"
                                        value={formData.max_instances}
                                        onChange={e => setFormData({ ...formData, max_instances: Number(e.target.value) })}
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none border border-transparent focus:border-primary/20 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidade de Contatos</label>
                                    <input
                                        type="number"
                                        value={formData.max_contacts}
                                        onChange={e => setFormData({ ...formData, max_contacts: Number(e.target.value) })}
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none border border-transparent focus:border-primary/20 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Limite de Chatbots</label>
                                    <input
                                        type="number"
                                        value={formData.max_chatbots}
                                        onChange={e => setFormData({ ...formData, max_chatbots: Number(e.target.value) })}
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none border border-transparent focus:border-primary/20 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Máx. Usuários</label>
                                    <input
                                        type="number"
                                        value={formData.max_users}
                                        onChange={e => setFormData({ ...formData, max_users: Number(e.target.value) })}
                                        className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none border border-transparent focus:border-primary/20 dark:text-white"
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2 lg:col-span-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <label className="text-xs font-black dark:text-white block">Inteligência Artificial</label>
                                        <span className="text-[10px] text-slate-400 font-bold">Habilitar acesso a Gemini/ChatGPT</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, ai_enabled: !formData.ai_enabled })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${formData.ai_enabled ? 'bg-primary' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.ai_enabled ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8 pb-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-black text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20">Salvar Plano</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingWhatsapp, setEditingWhatsapp] = useState<{ id: string, val: string } | null>(null);
    const [assigningPlan, setAssigningPlan] = useState<{ userId: string, currentPlanId?: string, currentExpiry?: string } | null>(null);
    const [expiryDate, setExpiryDate] = useState<string>('');
    const { showToast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchPlans()]);
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    subscriptions (
                        plan_id,
                        current_period_end,
                        plans (
                            name
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching users:', error);
                // Try simpler fetch without joins if join fails
                const { data: simpleData, error: simpleError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (simpleError) {
                    showToast('Erro ao carregar usuários: ' + simpleError.message, 'error');
                } else {
                    setUsers(simpleData || []);
                }
            } else {
                setUsers(data || []);
            }
        } catch (err: any) {
            console.error('Unexpected error:', err);
            showToast('Erro inesperado ao carregar usuários', 'error');
        }
    };

    const fetchPlans = async () => {
        const { data } = await supabase.from('plans').select('*').order('price');
        setPlans(data || []);
    };

    const handleAssignPlan = async (planId: string) => {
        if (!assigningPlan) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('subscriptions').upsert({
                user_id: assigningPlan.userId,
                plan_id: planId,
                status: 'active',
                current_period_end: expiryDate ? new Date(expiryDate).toISOString() : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

            if (error) throw error;
            showToast('Plano atribuído com sucesso!', 'success');
            fetchUsers();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
            setAssigningPlan(null);
        }
    };

    const toggleUserStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        setLoading(true);

        try {
            if (newStatus === 'INACTIVE') {
                // BLOCKING USER: Find active resources, save them, and pause them

                // 1. Find active chatbots
                const { data: activeBots } = await supabase
                    .from('chatbots')
                    .select('id')
                    .eq('user_id', id)
                    .eq('status', 'ACTIVE');

                // 2. Find active flows
                const { data: activeFlows } = await supabase
                    .from('flows')
                    .select('id')
                    .eq('user_id', id)
                    .eq('status', 'ACTIVE');

                // 3. Insert into blocked_resources
                const resourcesToBlock = [
                    ...(activeBots || []).map(b => ({ user_id: id, resource_type: 'chatbot', resource_id: b.id })),
                    ...(activeFlows || []).map(f => ({ user_id: id, resource_type: 'flow', resource_id: f.id }))
                ];

                if (resourcesToBlock.length > 0) {
                    await supabase.from('blocked_resources').upsert(resourcesToBlock, { onConflict: 'user_id, resource_type, resource_id' });
                }

                // 4. Pause resources
                if (activeBots?.length) {
                    await supabase.from('chatbots').update({ status: 'PAUSED' }).in('id', activeBots.map(b => b.id));
                }
                if (activeFlows?.length) {
                    await supabase.from('flows').update({ status: 'PAUSED' }).in('id', activeFlows.map(f => f.id));
                }

                showToast(`Usuário bloqueado e ${resourcesToBlock.length} recursos pausados automaticamente.`, 'warning');

            } else {
                // UNBLOCKING USER: Restore resources from blocked_resources

                // 1. Find resources to restore
                const { data: blockedResources } = await supabase
                    .from('blocked_resources')
                    .select('resource_type, resource_id')
                    .eq('user_id', id);

                if (blockedResources && blockedResources.length > 0) {
                    const botsToRestore = blockedResources.filter(r => r.resource_type === 'chatbot').map(r => r.resource_id);
                    const flowsToRestore = blockedResources.filter(r => r.resource_type === 'flow').map(r => r.resource_id);

                    // 2. Restore resources
                    if (botsToRestore.length > 0) {
                        await supabase.from('chatbots').update({ status: 'ACTIVE' }).in('id', botsToRestore);
                    }
                    if (flowsToRestore.length > 0) {
                        await supabase.from('flows').update({ status: 'ACTIVE' }).in('id', flowsToRestore);
                    }

                    // 3. Clear blocked_resources
                    await supabase.from('blocked_resources').delete().eq('user_id', id);

                    showToast(`Usuário desbloqueado e ${blockedResources.length} recursos reativados.`, 'success');
                } else {
                    showToast('Usuário desbloqueado. Sem recursos para restaurar.', 'info');
                }
            }

            // Finally, update user status
            const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
            if (error) throw error;

            fetchUsers();

        } catch (error: any) {
            console.error('Error toggling user status:', error);
            showToast('Erro ao alterar status do usuário: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateWhatsapp = async (id: string, val: string) => {
        const { error } = await supabase.from('profiles').update({ whatsapp: val }).eq('id', id);
        if (!error) {
            showToast('WhatsApp atualizado', 'success');
            setEditingWhatsapp(null);
            fetchUsers();
        } else {
            showToast(error.message, 'error');
        }
    };

    const deleteUser = async (id: string) => {
        if (!confirm('Deseja realmente EXCLUIR este usuário?')) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) {
            showToast('Usuário removido', 'success');
            fetchUsers();
        }
    };

    const filteredUsers = users.filter(u => {
        const email = u.email?.toLowerCase() || '';
        const name = u.full_name?.toLowerCase() || '';
        const s = search.toLowerCase();
        return email.includes(s) || name.includes(s);
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Gerenciamento de Usuários</h2>
                    <p className="text-sm text-slate-500">Controle de acesso e atividade</p>
                </div>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="E-mail ou nome..."
                        className="pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none w-72 focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all dark:text-white"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-700">
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Contato</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Plano</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden border border-primary/10">
                                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.full_name?.charAt(0) || user.email.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black dark:text-white">{user.full_name || 'Usuário'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID: {user.id.slice(0, 8)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold dark:text-slate-300">{user.email}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            {editingWhatsapp?.id === user.id ? (
                                                <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                                    <input
                                                        autoFocus
                                                        value={editingWhatsapp.val}
                                                        onChange={e => setEditingWhatsapp({ ...editingWhatsapp, val: e.target.value.replace(/\D/g, '') })}
                                                        className="w-32 bg-white dark:bg-slate-800 border border-primary/30 rounded px-2 py-0.5 text-[10px] outline-none"
                                                    />
                                                    <button onClick={() => updateWhatsapp(user.id, editingWhatsapp.val)} className="text-emerald-500 hover:scale-110 transition-transform"><Check size={12} /></button>
                                                    <button onClick={() => setEditingWhatsapp(null)} className="text-rose-500 hover:scale-110 transition-transform"><X size={12} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/wa">
                                                    <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded font-mono">
                                                        {user.whatsapp || 'Sem WhatsApp'}
                                                    </span>
                                                    <button onClick={() => setEditingWhatsapp({ id: user.id, val: user.whatsapp || '55' })} className="transition-all p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-primary hover:scale-110 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                        <Edit2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 group/plan">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.subscriptions?.[0]?.plans?.name ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                            {user.subscriptions?.[0]?.plans?.name || 'Sem Plano'}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const currentExpiry = user.subscriptions?.[0]?.current_period_end;
                                                setAssigningPlan({
                                                    userId: user.id,
                                                    currentPlanId: user.subscriptions?.[0]?.plan_id,
                                                    currentExpiry: currentExpiry ? new Date(currentExpiry).toISOString().slice(0, 10) : ''
                                                });
                                                setExpiryDate(currentExpiry ? new Date(currentExpiry).toISOString().slice(0, 10) : '');
                                            }}
                                            className="transition-all p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-primary hover:scale-110 border border-slate-100 dark:border-slate-700 shadow-sm"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/10'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{user.status}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => toggleUserStatus(user.id, user.status)} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-500 hover:text-primary border border-slate-100 dark:border-slate-700 transition-all">
                                            {user.status === 'ACTIVE' ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                                        </button>
                                        <button onClick={() => deleteUser(user.id)} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-slate-500 hover:text-rose-500 border border-slate-100 dark:border-slate-700 transition-all">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && <div className="text-center py-20 text-slate-400 font-bold">Nenhum usuário encontrado.</div>}
            </div>

            {/* Assign Plan Modal */}
            {assigningPlan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white italic">Atribuir Plano</h2>
                            <button onClick={() => setAssigningPlan(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-3 block">1. Selecione o Plano</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {plans.map(plan => (
                                        <button
                                            key={plan.id}
                                            onClick={() => setAssigningPlan({ ...assigningPlan, currentPlanId: plan.id })}
                                            className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${assigningPlan.currentPlanId === plan.id
                                                ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                                }`}
                                        >
                                            <div>
                                                <div className={`font-black text-sm ${assigningPlan.currentPlanId === plan.id ? 'text-primary' : 'dark:text-white text-slate-700'}`}>
                                                    {plan.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                    R$ {plan.price?.toLocaleString('pt-BR')} / {plan.billing_period}
                                                </div>
                                            </div>
                                            {assigningPlan.currentPlanId === plan.id && <Check className="w-4 h-4 text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-3 block">2. Data de Vencimento</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={e => setExpiryDate(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl outline-none border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 dark:text-white font-bold text-sm"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 italic px-1">Selecione a data em que os recursos premium serão suspensos.</p>
                            </div>

                            <button
                                onClick={() => handleAssignPlan(assigningPlan.currentPlanId || '')}
                                disabled={!assigningPlan.currentPlanId || loading}
                                className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-light active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function PaymentConfig() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('admin_settings').select('key, value').match({ category: 'PAYMENTS' });
        const mapped = (data || []).reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        setSettings(mapped);
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            for (const [key, value] of Object.entries(settings)) {
                await supabase.from('admin_settings').upsert({
                    key,
                    value,
                    category: 'PAYMENTS',
                    description: key.replace(/_/g, ' ')
                }, { onConflict: 'key' });
            }
            showToast('Configurações de pagamento salvas!', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Checkout & Gateways</h2>
                    <p className="text-sm text-slate-500 font-medium">Parametrize seus fluxos de recebimento</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-primary hover:bg-primary-light text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Configurações
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                            <Database className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black dark:text-white">Stripe Integration</h3>
                            <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Cartão de Crédito</span>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Stripe Publishable Key</label>
                            <input
                                value={settings.STRIPE_PUB_KEY || ''}
                                onChange={e => setSettings({ ...settings, STRIPE_PUB_KEY: e.target.value })}
                                placeholder="pk_live_..."
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary font-mono text-sm dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Stripe Secret Key</label>
                            <input
                                type="password"
                                value={settings.STRIPE_SECRET_KEY || ''}
                                onChange={e => setSettings({ ...settings, STRIPE_SECRET_KEY: e.target.value })}
                                placeholder="sk_live_..."
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary font-mono text-sm dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <Globe className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black dark:text-white">Mercado Pago</h3>
                            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Pagamento via PIX</span>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">MP Access Token</label>
                            <input
                                type="password"
                                value={settings.MP_ACCESS_TOKEN || ''}
                                onChange={e => setSettings({ ...settings, MP_ACCESS_TOKEN: e.target.value })}
                                placeholder="APP_USR-..."
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary font-mono text-sm dark:text-white"
                            />
                        </div>
                        <div className="pt-4 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed uppercase">
                                Ao ativar o Mercado Pago, o sistema tentará gerar QRCodes PIX automaticamente para novas assinaturas e renovações pendentes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function EvolutionConfig() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [availableInstances, setAvailableInstances] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchSettings();
        fetchInstances();
    }, []);

    const [configId, setConfigId] = useState<string | null>(null);

    const fetchInstances = async () => {
        const { data } = await supabase.from('instances').select('name').order('name');
        setAvailableInstances(data || []);
    };

    const fetchSettings = async () => {
        const { data } = await supabase.from('system_settings').select('*').limit(1).single();
        if (data) {
            setSettings({
                api_url: data.api_url,
                api_key: data.api_key,
                system_instance: data.system_instance,
                test_phone: data.test_phone
            });
            setConfigId(data.id);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase.from('system_settings').upsert({
            id: configId || '00000000-0000-0000-0000-000000000000',
            api_url: settings.api_url,
            api_key: settings.api_key,
            system_instance: settings.system_instance,
            test_phone: settings.test_phone,
        }, { onConflict: 'id' });

        if (!error) {
            showToast('Configurações Evolution API salvas!', 'success');
            // Trigger re-fetch for WhatsAppManagement if needed (using a simple event or just let it re-mount, but here we expect sibling components to stay mounted)
            // A more robust way in React is to lift state up, but for now we suggest a reload or we can add a simple window event
            window.dispatchEvent(new CustomEvent('system-settings-updated'));
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Evolution API Core</h2>
                    <p className="text-sm text-slate-500">Comunicação e Engine</p>
                </div>
                <button onClick={handleSave} disabled={loading} className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 flex items-center gap-3">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar
                </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6 max-w-2xl">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">URL da Instância Evolution</label>
                    <input
                        value={settings.api_url || ''}
                        onChange={e => setSettings({ ...settings, api_url: e.target.value })}
                        placeholder="https://api.seusite.com"
                        className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary dark:text-white font-mono"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Global API Key</label>
                    <input
                        type="password"
                        value={settings.api_key || ''}
                        onChange={e => setSettings({ ...settings, api_key: e.target.value })}
                        className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary dark:text-white font-mono"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID da Instância de Sistema (WhatsApp Admin)</label>
                    <select
                        value={settings.system_instance || ''}
                        onChange={e => setSettings({ ...settings, system_instance: e.target.value })}
                        className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary dark:text-white font-bold appearance-none cursor-pointer"
                    >
                        <option value="">Selecione uma instância...</option>
                        {availableInstances.map(inst => (
                            <option key={inst.name} value={inst.name}>{inst.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-2 px-1">Esta instância será usada para enviar alertas do sistema e mensagens de teste.</p>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefone Master (Para Testes e Alertas)</label>
                    <input
                        value={settings.test_phone || ''}
                        onChange={e => setSettings({ ...settings, test_phone: e.target.value })}
                        placeholder="ex: 5511999999999"
                        className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary dark:text-white font-bold"
                    />
                </div>
            </div>
        </div>
    );
};

function SecuritySettings() {
    const [settings, setSettings] = useState<any>({
        captcha_provider: 'none',
        captcha_site_key: '',
        captcha_secret_key: '',
        maintenance_mode: false,
        maintenance_return_time: ''
    });
    const [loading, setLoading] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('system_settings').select('*').limit(1).single();
        if (data) {
            setSettings({
                captcha_provider: data.captcha_provider || 'none',
                captcha_site_key: data.captcha_site_key || '',
                captcha_secret_key: data.captcha_secret_key || '',
                maintenance_mode: data.maintenance_mode || false,
                maintenance_return_time: data.maintenance_return_time ? new Date(data.maintenance_return_time).toISOString().slice(0, 16) : ''
            });
            setConfigId(data.id);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase.from('system_settings').upsert({
            id: configId || '00000000-0000-0000-0000-000000000000',
            captcha_provider: settings.captcha_provider || 'none',
            captcha_site_key: settings.captcha_site_key || '',
            captcha_secret_key: settings.captcha_secret_key || '',
            maintenance_mode: settings.maintenance_mode || false,
            maintenance_return_time: settings.maintenance_return_time || null,
        }, { onConflict: 'id' });

        if (!error) {
            showToast('Configurações de segurança salvas!', 'success');
        } else {
            showToast(error.message, 'error');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Segurança & Captcha</h2>
                    <p className="text-sm text-slate-500">Proteção contra bots em cadastros e login</p>
                </div>
                <button onClick={handleSave} disabled={loading} className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-primary/20 flex items-center gap-3">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Configurações
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-8">
                    <div>
                        <h3 className="text-lg font-black dark:text-white mb-6">Provedor de Captcha</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { id: 'none', title: 'Nenhum', desc: 'Sem proteção de captcha' },
                                { id: 'recaptcha', title: 'Google reCAPTCHA v3', desc: 'Proteção invisível do Google' },
                                { id: 'turnstile', title: 'Cloudflare Turnstile', desc: 'Alternativa gratuita e privada' }
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setSettings({ ...settings, captcha_provider: p.id })}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${settings.captcha_provider === p.id
                                        ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <div>
                                        <div className={`font-black text-sm ${settings.captcha_provider === p.id ? 'text-primary' : 'dark:text-white text-slate-700'}`}>{p.title}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{p.desc}</div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${settings.captcha_provider === p.id ? 'border-primary bg-primary' : 'border-slate-200 dark:border-slate-700'}`}>
                                        {settings.captcha_provider === p.id && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {settings.captcha_provider !== 'none' && (
                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Site Key</label>
                                <input
                                    value={settings.captcha_site_key}
                                    onChange={e => setSettings({ ...settings, captcha_site_key: e.target.value })}
                                    placeholder="Site Key fornecido pelo provedor"
                                    className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary dark:text-white font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secret Key</label>
                                <input
                                    type="password"
                                    value={settings.captcha_secret_key}
                                    onChange={e => setSettings({ ...settings, captcha_secret_key: e.target.value })}
                                    placeholder="Secret Key (mantenha em sigilo)"
                                    className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary dark:text-white font-mono text-sm"
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black dark:text-white flex items-center gap-3">
                                    <RefreshCw className={`w-5 h-5 ${settings.maintenance_mode ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
                                    Modo Manutenção
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Bloquear acesso de usuários comuns</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                                className={`w-14 h-8 rounded-full relative transition-all duration-300 ${settings.maintenance_mode ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${settings.maintenance_mode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        {settings.maintenance_mode && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Previsão de Retorno</label>
                                    <div className="relative mt-2">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="datetime-local"
                                            value={settings.maintenance_return_time}
                                            onChange={e => setSettings({ ...settings, maintenance_return_time: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 focus:primary dark:text-white font-bold text-sm"
                                        />
                                    </div>
                                    <p className="text-[10px] text-amber-500 font-bold mt-2 px-1 lowercase italic">* os administradores continuam com acesso normal ao sistema.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/10">
                    <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl shadow-indigo-500/20">
                        <Lock className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-black dark:text-white mb-4 italic">Por que usar Captcha?</h3>
                    <div className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>O captcha é essencial para proteger seu sistema contra ataques de força bruta, bots de spam no cadastro e abusos de API.</p>
                        <div className="p-6 bg-white dark:bg-slate-800/50 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-black uppercase tracking-widest">Google reCAPTCHA v3</span>
                            </div>
                            <p className="text-[11px]">Excelente para privacidade e performance. Sem cookies invasivos e gratuito para qualquer escala.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function BillingReports() {
    const [billingSubTab, setBillingSubTab] = useState<'dashboard' | 'transactions'>('dashboard');
    const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'month' | 'year' | 'all'>('30d');
    const [stats, setStats] = useState<{
        total_billed: number;
        active_subs: number;
        avg_ticket: number;
        growth: number;
        count: number;
    } | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Date Range
            const now = new Date();
            let startDate = new Date();

            if (period === 'today') startDate.setHours(0, 0, 0, 0);
            else if (period === '7d') startDate.setDate(now.getDate() - 7);
            else if (period === '30d') startDate.setDate(now.getDate() - 30);
            else if (period === '90d') startDate.setDate(now.getDate() - 90);
            else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);
            else if (period === 'all') startDate = new Date(2000, 0, 1);

            const startDateStr = startDate.toISOString();

            // 2. Fetch Payments in Period
            const { data: payments, error: pError } = await supabase
                .from('payment_logs')
                .select('*, profiles!user_id(full_name, email)')
                .gte('created_at', startDateStr)
                .order('created_at', { ascending: false });

            if (pError) {
                console.error('Payments fetch error:', pError);
                showToast('Erro ao carregar pagamentos: ' + pError.message, 'error');
                throw pError;
            }

            // 3. Fetch Active Subs
            const { count: activeSubs, error: sError } = await supabase
                .from('subscriptions')
                .select('*', { count: 'exact', head: true })
                .or('status.eq.active,status.eq.ACTIVE');

            if (sError) throw sError;

            // 4. Calculate Metrics
            const total = (payments || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
            const count = payments?.length || 0;
            const avg = count > 0 ? total / count : 0;

            setStats({
                total_billed: total,
                active_subs: activeSubs || 0,
                avg_ticket: avg,
                growth: 15,
                count
            });

            setRecentPayments((payments || []).slice(0, 10));

            // 5. Format Chart Data - Improved logic for continuous curve
            const groupedData: Record<string, number> = {};

            // Fill with zeros for the period (simplified for 30d/7d)
            const chartDays = period === '7d' ? 7 : (period === '30d' ? 30 : 0);
            if (chartDays > 0) {
                for (let i = chartDays; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    groupedData[key] = 0;
                }
            }

            (payments || []).forEach(p => {
                const date = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (chartDays === 0 || groupedData[date] !== undefined) {
                    groupedData[date] = (groupedData[date] || 0) + Number(p.amount);
                }
            });

            const chart = Object.entries(groupedData)
                .map(([name, value]) => ({ name, value }));

            setChartData(chart);

        } catch (err) {
            console.error('Error fetching billing data:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12">
            {/* Sub-Tabs Selector */}
            <div className="flex items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-0">
                <button
                    onClick={() => setBillingSubTab('dashboard')}
                    className={`pb-4 px-4 text-xs font-black uppercase tracking-widest transition-all relative ${billingSubTab === 'dashboard'
                        ? 'text-primary'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                >
                    Dashboard
                    {billingSubTab === 'dashboard' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full" />}
                </button>
                <button
                    onClick={() => setBillingSubTab('transactions')}
                    className={`pb-4 px-4 text-xs font-black uppercase tracking-widest transition-all relative ${billingSubTab === 'transactions'
                        ? 'text-primary'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                >
                    Histórico de Transações
                    {billingSubTab === 'transactions' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-full" />}
                </button>
            </div>

            {billingSubTab === 'dashboard' ? (
                <>
                    {/* Header & Filter */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-xl font-black dark:text-white">Relatório de Faturamento</h2>
                            <p className="text-sm text-slate-500">Acompanhe o desempenho financeiro</p>
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
                            {[
                                { id: 'today', label: 'Hoje' },
                                { id: '7d', label: '7 Dias' },
                                { id: '30d', label: '30 Dias' },
                                { id: 'month', label: 'Este Mês' },
                                { id: 'year', label: 'Este Ano' },
                                { id: 'all', label: 'Tudo' }
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setPeriod(p.id as any)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${period === p.id
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSign className="w-24 h-24" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Faturamento</span>
                            <h3 className="text-3xl font-black text-emerald-900 dark:text-emerald-300 mt-2 tracking-tighter">
                                {stats ? `R$ ${stats.total_billed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '...'}
                            </h3>
                            <div className="mt-4 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                <span className="text-[10px] font-bold text-emerald-600">Performance estável</span>
                            </div>
                        </div>

                        <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Zap className="w-24 h-24" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Ticket Médio</span>
                            <h3 className="text-3xl font-black text-indigo-900 dark:text-indigo-300 mt-2 tracking-tighter">
                                {stats ? `R$ ${stats.avg_ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '...'}
                            </h3>
                            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-indigo-500">
                                Baseado em {stats?.count || 0} vendas
                            </div>
                        </div>

                        <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users className="w-24 h-24" />
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Assinaturas Ativas</span>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">
                                {stats ? stats.active_subs : '...'}
                            </h3>
                            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                Usuários pagantes recorrentes
                            </div>
                        </div>

                        <div className="p-8 bg-orange-50 dark:bg-orange-900/20 rounded-[2rem] border border-orange-100 dark:border-orange-500/10 relative overflow-hidden group hover:scale-[1.02] transition-all">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp className="w-24 h-24" />
                            </div>
                            <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Previsão Mensal</span>
                            <h3 className="text-3xl font-black text-orange-900 dark:text-orange-300 mt-2 tracking-tighter">
                                {stats ? `R$ ${(stats.active_subs * 197).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '...'}
                            </h3>
                            <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-orange-500">
                                Estimativa aproximada
                            </div>
                        </div>
                    </div>

                    {/* Chart Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-lg font-black dark:text-white">Curva de Receita</h3>
                                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">Evolução no período</p>
                                </div>
                            </div>

                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00A884" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00A884" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F033" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                            tickFormatter={(val) => `R$ ${val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: '#fff' }}
                                            itemStyle={{ fontWeight: 900, color: '#00A884' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#00A884"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h3 className="text-lg font-black dark:text-white mb-2">Logs Recentes</h3>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-8">Últimas transações</p>

                            <div className="space-y-4">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-2xl" />
                                    ))
                                ) : recentPayments.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Database className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">Sem registros</p>
                                    </div>
                                ) : (
                                    recentPayments.map((p) => (
                                        <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xs">
                                                    R$
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black dark:text-white line-clamp-1">
                                                        {p.profiles ? (Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name) || 'Usuário Sem Nome' : 'Carregando...'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(p.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-emerald-600">+{p.amount}</p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase">{p.method}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {recentPayments.length > 0 && (
                                <button className="w-full mt-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-all">
                                    Ver Extrato Completo
                                </button>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <TransactionsManager onUpdate={fetchData} />
            )}
        </div>
    );
};

function TransactionsManager({ onUpdate }: { onUpdate: () => void }) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payment_logs')
                .select('*, profiles!user_id(full_name, email)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (err: any) {
            showToast('Erro ao buscar transações: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('payment_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Transação excluída com sucesso!', 'success');
            fetchTransactions();
            onUpdate();
        } catch (err: any) {
            showToast('Erro ao excluir: ' + err.message, 'error');
        } finally {
            setIdToDelete(null);
        }
    };

    const filtered = transactions.filter(t => {
        const query = searchTerm.toLowerCase();
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
        return (
            profile?.full_name?.toLowerCase().includes(query) ||
            profile?.email?.toLowerCase().includes(query) ||
            t.external_id?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Gerenciamento de Transações</h2>
                    <p className="text-sm text-slate-500">Visualize e gerencie todos os registros de entrada</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, e-mail ou id..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ID / Data</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Cliente</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Valor / Moeda</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Método</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-6"><div className="h-10 bg-slate-50 dark:bg-slate-900 rounded-xl" /></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        Nenhuma transação encontrada
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((t) => {
                                    const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="text-[11px] font-black dark:text-white truncate max-w-[120px]" title={t.id}>
                                                    {t.id.split('-')[0]}...
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-bold mt-1">
                                                    {new Date(t.created_at).toLocaleString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[11px] font-black dark:text-white">{profile?.full_name || 'Usuário Sem Nome'}</div>
                                                <div className="text-[9px] text-slate-400 font-bold lowercase">{profile?.email || '-'}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-xs font-black text-emerald-600">R$ {parseFloat(t.amount).toFixed(2)}</div>
                                                <div className="text-[9px] text-slate-400 font-black tracking-widest uppercase mt-1">{t.currency}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                    {t.method}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => setIdToDelete(t.id)}
                                                    className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                                    title="Excluir Transação"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Native-like Delete Dialog */}
            {idToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300 border border-slate-100 dark:border-slate-700">
                        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <Trash2 className="w-10 h-10 text-rose-500 animate-pulse" />
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-4 italic">Confirmar Exclusão</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium leading-relaxed mb-10">
                            Tem certeza que deseja excluir esta transação? Esta ação é <span className="text-rose-500 font-bold uppercase">irreversível</span> e afetará os relatórios imediatamente.
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIdToDelete(null)}
                                className="flex-1 py-5 font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all uppercase tracking-widest text-[10px]"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(idToDelete)}
                                className="flex-1 py-5 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 uppercase tracking-widest text-[10px]"
                            >
                                Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function WhatsAppManagement() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [templates, setTemplates] = useState<any[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        fetchSystemSettings();
        fetchTemplates();

        const handleUpdate = () => fetchSystemSettings();
        window.addEventListener('system-settings-updated', handleUpdate);
        return () => window.removeEventListener('system-settings-updated', handleUpdate);
    }, []);

    const fetchSystemSettings = async () => {
        const { data } = await supabase.from('system_settings').select('*').limit(1).single();
        if (data) {
            setSettings({
                api_url: data.api_url,
                api_key: data.api_key,
                system_instance: data.system_instance || '',
                test_phone: data.test_phone || ''
            });
        }
    };

    const fetchTemplates = async () => {
        const { data } = await supabase.from('email_templates').select('*').order('slug');
        if (data) setTemplates(data);
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('email_templates').update({
                body: editingTemplate.body,
                updated_at: new Date().toISOString()
            }).eq('id', editingTemplate.id);

            if (error) throw error;
            showToast('Template atualizado!', 'success');
            setEditingTemplate(null);
            fetchTemplates();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTestMessage = async () => {
        if (!settings.test_phone) {
            showToast('Configure o Telefone Master na aba Evolution API primeiro!', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action: 'send_whatsapp_test',
                    payload: {
                        to: settings.test_phone,
                        message: '✅ *Evolution API - Teste de Notificação*\n\nSeu sistema de notificações via WhatsApp está configurado corretamente!'
                    }
                }
            });

            if (error) throw error;
            showToast('Mensagem de teste enviada!', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (slug: string) => {
        switch (slug) {
            case 'plan_expiry': return <Bell />;
            case 'payment_reminder': return <DollarSign />;
            case 'welcome': return <Users />;
            case 'password_reset': return <Lock />;
            case 'subscription_confirmed': return <Check />;
            default: return <Mail />;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Notificações via WhatsApp</h2>
                    <p className="text-sm text-slate-500">Gestão de avisos automáticos do sistema</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleTestMessage}
                        disabled={loading}
                        className="px-8 py-4 bg-slate-900 text-white border border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Testar Notificação
                    </button>
                </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black dark:text-white">Instância de Notificação</h3>
                        <p className="text-xs text-slate-500">Esta instância será usada para enviar todos os avisos do sistema.</p>
                    </div>
                </div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Configurado em: Evolution API Core {"->"} ID da Instância de Sistema
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                    <div key={t.slug} className="group p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                {React.cloneElement(getIcon(t.slug) as React.ReactElement, { className: 'w-6 h-6' })}
                            </div>
                            <span className="font-black dark:text-white text-sm">{t.subject}</span>
                        </div>
                        <div className="mb-6 line-clamp-3 text-xs text-slate-500 font-medium">
                            {t.body}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aviso Automático</span>
                            <button
                                onClick={() => setEditingTemplate(t)}
                                className="text-primary font-black text-[10px] uppercase hover:underline tracking-widest"
                            >
                                Customizar Texto
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {editingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Customizar Template</h2>
                                <p className="text-sm text-slate-500">Editando: {editingTemplate.subject}</p>
                            </div>
                            <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem do WhatsApp</label>
                                <textarea
                                    value={editingTemplate.body}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                                    rows={6}
                                    className="w-full mt-2 p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl font-medium outline-none border border-transparent focus:border-primary/20 dark:text-white text-sm resize-none"
                                    placeholder="Escreva sua mensagem aqui..."
                                />
                                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                                    Dica: Use {"{{full_name}}"}, {"{{expiry_date}}"}, {"{{payment_link}}"} como variáveis.
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setEditingTemplate(null)}
                                    className="flex-1 py-4 font-black text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveTemplate}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


function SEOSettings() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        seo_title: 'Ublo Chat - O melhor Dashboard',
        seo_description: 'Gerencie suas instâncias e chatbots com facilidade.',
        seo_keywords: 'whatsapp, api, ublo chat, automação',
        favicon_url: '',
        og_image_url: '',
        robots_txt: 'User-agent: *\nAllow: /\n\nSitemap: https://seu-dominio.com/sitemap.xml',
        footer_text: '© 2024 Ublo Chat - Todos os direitos reservados'
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('system_settings').select('*').single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setFormData({
                    seo_title: data.seo_title || 'Ublo Chat - O melhor Dashboard',
                    seo_description: data.seo_description || 'Gerencie suas instâncias e chatbots com facilidade.',
                    seo_keywords: data.seo_keywords || 'whatsapp, api, ublo chat, automação',
                    favicon_url: data.favicon_url || '',
                    og_image_url: data.og_image_url || '',
                    robots_txt: data.robots_txt || 'User-agent: *\nAllow: /\n\nSitemap: https://seu-dominio.com/sitemap.xml',
                    footer_text: data.footer_text || '© 2024 Ublo Chat - Todos os direitos reservados'
                });
            }
        } catch (err: any) {
            showToast('Erro ao carregar SEO: ' + err.message, 'error');
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data: existing } = await supabase.from('system_settings').select('id').single();

            let error;
            if (existing) {
                const { error: err } = await supabase
                    .from('system_settings')
                    .update(formData)
                    .eq('id', existing.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('system_settings')
                    .insert(formData);
                error = err;
            }

            if (error) throw error;
            showToast('Configurações de SEO salvas!', 'success');
        } catch (err: any) {
            showToast('Erro ao salvar SEO: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">SEO & Branding</h2>
                    <p className="text-sm text-slate-500">Otimize sua presença nos motores de busca</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-primary hover:bg-primary-light text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Alterações
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Meta Tags Principais
                        </h3>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Página (SEO Title)</label>
                            <input
                                value={formData.seo_title}
                                onChange={e => setFormData({ ...formData, seo_title: e.target.value })}
                                placeholder="Ublo Chat - O melhor Dashboard"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-bold"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição (Meta Description)</label>
                            <textarea
                                value={formData.seo_description}
                                onChange={e => setFormData({ ...formData, seo_description: e.target.value })}
                                placeholder="Breve descrição para o Google..."
                                rows={3}
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Palavras-chave (Keywords)</label>
                            <input
                                value={formData.seo_keywords}
                                onChange={e => setFormData({ ...formData, seo_keywords: e.target.value })}
                                placeholder="whatsapp, api, automation, etc..."
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Robots & Crawlers
                        </h3>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Robots.txt</label>
                            <textarea
                                value={formData.robots_txt}
                                onChange={e => setFormData({ ...formData, robots_txt: e.target.value })}
                                rows={4}
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-mono text-xs resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Identidade Visual (URLs)
                        </h3>

                        <div>
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Favicon URL</label>
                                <span className="text-[9px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">Recomendado: 32x32px (.ico/.png)</span>
                            </div>
                            <input
                                value={formData.favicon_url}
                                onChange={e => setFormData({ ...formData, favicon_url: e.target.value })}
                                placeholder="https://exemplo.com/favicon.png"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OG Image URL (Social Share)</label>
                                <span className="text-[9px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded-full">Recomendado: 1200x630px</span>
                            </div>
                            <input
                                value={formData.og_image_url}
                                onChange={e => setFormData({ ...formData, og_image_url: e.target.value })}
                                placeholder="https://exemplo.com/og-image.jpg"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            Rodapé (Branding)
                        </h3>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texto do Rodapé / Copyright</label>
                            <input
                                value={formData.footer_text}
                                onChange={e => setFormData({ ...formData, footer_text: e.target.value })}
                                placeholder="© 2024 Ublo Chat - Todos os direitos reservados"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BillingSettings() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        from_email: '',
        from_name: 'Ublo Chat Billing',
        reminder_3d_subject: 'Seu plano vence em 3 dias',
        reminder_3d_body: 'Olá {{user_name}}, seu plano no Ublo Chat vence em 3 dias. Renove agora para evitar o bloqueio!',
        reminder_2d_subject: 'Seu plano vence em 2 dias',
        reminder_2d_body: 'Olá {{user_name}}, restam apenas 2 dias para o vencimento do seu plano. Não perca o acesso!',
        reminder_0d_subject: 'Seu plano vence HOJE',
        reminder_0d_body: 'Olá {{user_name}}, seu plano vence hoje à meia-noite. Renove agora!',
        expiry_subject: 'Seu plano expirou',
        expiry_body: 'Olá {{user_name}}, seu plano expirou hoje. Você tem 24h de carência antes do bloqueio das funcionalidades.',
        blockage_subject: 'Funcionalidades Bloqueadas',
        blockage_body: 'Olá {{user_name}}, seu plano não foi renovado e as funcionalidades foram bloqueadas. Regularize sua situação para voltar a usar.'
    });

    useEffect(() => {
        fetchBillingSettings();
    }, []);

    const fetchBillingSettings = async () => {
        try {
            const { data, error } = await supabase.from('billing_settings').select('*').single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setFormData({
                    smtp_host: data.smtp_host || '',
                    smtp_port: data.smtp_port || 587,
                    smtp_user: data.smtp_user || '',
                    smtp_pass: data.smtp_pass || '',
                    from_email: data.from_email || '',
                    from_name: data.from_name || 'Ublo Chat Billing',
                    reminder_3d_subject: data.reminder_3d_subject || 'Seu plano vence em 3 dias',
                    reminder_3d_body: data.reminder_3d_body || 'Olá {{user_name}}, seu plano no Ublo Chat vence em 3 dias. Renove agora para evitar o bloqueio!',
                    reminder_2d_subject: data.reminder_2d_subject || 'Seu plano vence em 2 dias',
                    reminder_2d_body: data.reminder_2d_body || 'Olá {{user_name}}, restam apenas 2 dias para o vencimento do seu plano. Não perca o acesso!',
                    reminder_0d_subject: data.reminder_0d_subject || 'Seu plano vence HOJE',
                    reminder_0d_body: data.reminder_0d_body || 'Olá {{user_name}}, seu plano vence hoje à meia-noite. Renove agora!',
                    expiry_subject: data.expiry_subject || 'Seu plano expirou',
                    expiry_body: data.expiry_body || 'Olá {{user_name}}, seu plano expirou hoje. Você tem 24h de carência antes do bloqueio das funcionalidades.',
                    blockage_subject: data.blockage_subject || 'Funcionalidades Bloqueadas',
                    blockage_body: data.blockage_body || 'Olá {{user_name}}, seu plano não foi renovado e as funcionalidades foram bloqueadas. Regularize sua situação para voltar a usar.'
                });
            }
        } catch (err: any) {
            showToast('Erro ao carregar faturamento: ' + err.message, 'error');
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data: existing } = await supabase.from('billing_settings').select('id').single();
            let error;
            if (existing) {
                const { error: err } = await supabase.from('billing_settings').update(formData).eq('id', existing.id);
                error = err;
            } else {
                const { error: err } = await supabase.from('billing_settings').insert(formData);
                error = err;
            }
            if (error) throw error;
            showToast('Configurações de faturamento salvas!', 'success');
        } catch (err: any) {
            showToast('Erro ao salvar: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black dark:text-white">Faturamento & Notificações por E-mail</h2>
                    <p className="text-sm text-slate-500">Configure o servidor de e-mail e os modelos de aviso automático</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-primary hover:bg-primary-light text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Configurações
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SMTP Config */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6">
                    <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Configurações de Servidor SMTP
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Host</label>
                            <input
                                value={formData.smtp_host}
                                onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                                placeholder="smtp.resend.com"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMTP Port</label>
                            <input
                                value={formData.smtp_port}
                                onChange={e => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                                type="number"
                                placeholder="587"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário</label>
                            <input
                                value={formData.smtp_user}
                                onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                                placeholder="resend"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha / API Key</label>
                            <input
                                value={formData.smtp_pass}
                                onChange={e => setFormData({ ...formData, smtp_pass: e.target.value })}
                                type="password"
                                placeholder="re_..."
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Remetente</label>
                            <input
                                value={formData.from_email}
                                onChange={e => setFormData({ ...formData, from_email: e.target.value })}
                                placeholder="financeiro@ublochat.site"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Remetente</label>
                            <input
                                value={formData.from_name}
                                onChange={e => setFormData({ ...formData, from_name: e.target.value })}
                                placeholder="Ublo Chat Faturameno"
                                className="w-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all dark:text-white font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Templates Summary */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6">
                    <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Status da Automação
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs italic">00h</div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white leading-tight">Verificação de Vencimento</h4>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Mark as Expired & UI Warning</p>
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs italic">09h</div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white leading-tight">E-mail de Expiração</h4>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Notify via Email (Expired today)</p>
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs italic">14h</div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white leading-tight">Lembretes Preventivos</h4>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Emails (3d, 2d, Today-Expiring)</p>
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xs italic">+24h</div>
                            <div>
                                <h4 className="font-bold text-sm dark:text-white leading-tight">Bloqueio de Funções</h4>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Mark as Blocked & Notify Email</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Email Templates */}
                <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-8">
                    <h3 className="font-black text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Modelos de Mensagem (Templates)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* 3 Days Before */}
                        <div className="space-y-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Vencimento em 3 Dias (14h)</h4>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assunto</label>
                                <input
                                    value={formData.reminder_3d_subject}
                                    onChange={e => setFormData({ ...formData, reminder_3d_subject: e.target.value })}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Corpo do E-mail</label>
                                <textarea
                                    value={formData.reminder_3d_body}
                                    onChange={e => setFormData({ ...formData, reminder_3d_body: e.target.value })}
                                    rows={3}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-xs font-medium resize-none"
                                />
                            </div>
                        </div>

                        {/* 2 Days Before */}
                        <div className="space-y-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Vencimento em 2 Dias (14h)</h4>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assunto</label>
                                <input
                                    value={formData.reminder_2d_subject}
                                    onChange={e => setFormData({ ...formData, reminder_2d_subject: e.target.value })}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Corpo do E-mail</label>
                                <textarea
                                    value={formData.reminder_2d_body}
                                    onChange={e => setFormData({ ...formData, reminder_2d_body: e.target.value })}
                                    rows={3}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-xs font-medium resize-none"
                                />
                            </div>
                        </div>

                        {/* Expiring Today */}
                        <div className="space-y-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Vence Hoje (14h)</h4>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assunto</label>
                                <input
                                    value={formData.reminder_0d_subject}
                                    onChange={e => setFormData({ ...formData, reminder_0d_subject: e.target.value })}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Corpo do E-mail</label>
                                <textarea
                                    value={formData.reminder_0d_body}
                                    onChange={e => setFormData({ ...formData, reminder_0d_body: e.target.value })}
                                    rows={3}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-xs font-medium resize-none"
                                />
                            </div>
                        </div>

                        {/* Expired Notification */}
                        <div className="space-y-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 border-dashed">
                            <h4 className="text-xs font-black text-orange-500 uppercase tracking-[0.2em] mb-2">Plano Expirado (09h)</h4>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assunto</label>
                                <input
                                    value={formData.expiry_subject}
                                    onChange={e => setFormData({ ...formData, expiry_subject: e.target.value })}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Corpo do E-mail</label>
                                <textarea
                                    value={formData.expiry_body}
                                    onChange={e => setFormData({ ...formData, expiry_body: e.target.value })}
                                    rows={3}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-xs font-medium resize-none"
                                />
                            </div>
                        </div>

                        {/* Blockage Notification */}
                        <div className="space-y-4 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                            <h4 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] mb-2">Bloqueio (+24h)</h4>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Assunto</label>
                                <input
                                    value={formData.blockage_subject}
                                    onChange={e => setFormData({ ...formData, blockage_subject: e.target.value })}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Corpo do E-mail</label>
                                <textarea
                                    value={formData.blockage_body}
                                    onChange={e => setFormData({ ...formData, blockage_body: e.target.value })}
                                    rows={3}
                                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 outline-none focus:border-primary/50 text-xs font-medium resize-none"
                                />
                            </div>
                        </div>

                        {/* Placeholder Info */}
                        <div className="flex flex-col justify-center p-8 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-transparent">
                            <h4 className="font-black text-sm dark:text-white mb-2">Dica de Personalização</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                Use as tags abaixo nos textos para personalizar as mensagens:<br />
                                <strong className="text-primary">{"{{user_name}}"}</strong> - Nome do usuário<br />
                                <strong className="text-primary">{"{{plan_name}}"}</strong> - Nome do plano<br />
                                <strong className="text-primary">{"{{expiry_date}}"}</strong> - Data de vencimento
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminView;

function CronTasks() {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<string>('loading');
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const { data } = await supabase.from('system_settings').select('cron_api_key, cron_job_id, test_phone').single();
            if (data?.cron_api_key) {
                setApiKey(data.cron_api_key);
                // In a real scenario, we would call the Edge Function to get real statuses from cron-job.org
                // For now, let's parse the stored IDs
                const extraIds = data.test_phone ? JSON.parse(data.test_phone) : {};

                const loadedJobs = [
                    {
                        id: 'broadcast',
                        title: 'Transmissão de Mensagens',
                        description: 'Processa disparos em massa e agendamentos.',
                        jobId: data.cron_job_id,
                        frequency: '1 minuto',
                        status: data.cron_job_id ? 'active' : 'inactive'
                    },
                    {
                        id: 'billing',
                        title: 'Faturamento & Cobrança',
                        description: 'Lembretes, expirações e bloqueios automáticos.',
                        jobId: extraIds.billing_job_id,
                        frequency: '1 hora',
                        status: extraIds.billing_job_id ? 'active' : 'inactive'
                    }
                ];
                setJobs(loadedJobs);
                setStatus(data.cron_job_id ? 'active' : 'inactive');
            } else {
                setStatus('inactive');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivateAll = async () => {
        if (!apiKey) return showToast('Insira a API Key do cron-job.org', 'error');
        setLoading(true);
        try {
            const { error } = await supabase.functions.invoke('cron-manager', {
                body: { action: 'SETUP', apiKey }
            });
            if (error) throw error;
            showToast('Processos ativados com sucesso!', 'success');
            fetchStatus();
        } catch (err: any) {
            showToast('Erro ao ativar: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivateAll = async () => {
        if (!confirm('Desativar todos os processos automáticos?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.functions.invoke('cron-manager', {
                body: { action: 'DELETE' }
            });
            if (error) throw error;
            showToast('Processos desativados.', 'success');
            fetchStatus();
        } catch (err: any) {
            showToast('Erro ao desativar: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black dark:text-white">Central de Automação (CRON)</h2>
                    <p className="text-sm text-slate-500">Gerencie a estabilidade dos fluxos automáticos do sistema</p>
                </div>
                {status === 'active' ? (
                    <button
                        onClick={handleDeactivateAll}
                        disabled={loading}
                        className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                        Desativar Tudo
                    </button>
                ) : (
                    <button
                        onClick={handleActivateAll}
                        disabled={loading || !apiKey}
                        className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                        Ativar Automação
                    </button>
                )}
            </div>

            {/* API Config Section */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm shrink-0 border border-slate-100 dark:border-slate-700">
                        <Globe className="w-10 h-10 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <h3 className="text-lg font-black dark:text-white">Integração Cron-Job.org</h3>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                            Utilizamos o <strong>Cron-Job.org</strong> para gatilhar os processos internos.
                            Configure sua API Key para permitir que o sistema crie e gerencie os jobs automaticamente.
                        </p>
                        <div className="flex gap-4 mt-4">
                            <input
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                type="password"
                                placeholder="Insira sua Cron-Job.org API Key aqui..."
                                className="flex-1 max-w-md p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:border-primary/50 transition-all font-mono text-xs dark:text-white"
                            />
                            {status === 'active' && (
                                <div className="px-4 py-1 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    Conectado
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Jobs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:scale-110 transition-transform ${job.status === 'active' ? 'text-emerald-500' : 'text-slate-300'}`}>
                            {job.id === 'broadcast' ? <RefreshCw className="w-full h-full" /> : <DollarSign className="w-full h-full" />}
                        </div>

                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl ${job.status === 'active' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20' : 'bg-slate-100 text-slate-400 dark:bg-slate-700/50'}`}>
                                {job.id === 'broadcast' ? <Zap className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${job.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                                {job.status === 'active' ? 'Ativo' : 'Offline'}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xl font-black dark:text-white mb-1">{job.title}</h4>
                                <p className="text-xs text-slate-500 font-medium">{job.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 dark:border-slate-700/50">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Frequência</span>
                                    <span className="text-sm font-black dark:text-white">{job.frequency}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Job ID</span>
                                    <span className="text-sm font-bold font-mono dark:text-slate-300">{job.jobId || '---'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleActivateAll()} // Re-sync
                                    className="flex-1 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Editar / Sinc
                                </button>
                                <button
                                    className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 rounded-xl transition-all"
                                    title="Ver Logs"
                                >
                                    <Terminal className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Help/Support Section */}
            <div className="flex gap-6 p-8 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-800/20">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-black text-blue-900 dark:text-blue-300">Como funciona?</h4>
                    <p className="text-xs text-blue-700/70 dark:text-blue-400/60 leading-relaxed">
                        Ao clicar em "Ativar Automação", o sistema cria automaticamente dois cronjobs na sua conta.
                        O de <strong>Transmissão</strong> funciona em tempo real (1 min) e o de <strong>Faturamento</strong>
                        roda de hora em hora para garantir que ninguém perca o acesso injustamente.
                    </p>
                </div>
            </div>
        </div>
    );
}
