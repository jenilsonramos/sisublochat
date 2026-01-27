import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import {
    Send,
    Users,
    MessageSquare,
    Settings,
    Play,
    Pause,
    X,
    CheckCircle2,
    AlertCircle,
    Clock,
    BarChart3,
    Plus,
    Upload,
    FileText,
    ShieldCheck,
    HelpCircle,
    ChevronRight,
    Search,
    Loader2,
    Trash2
} from 'lucide-react';
import { Instance } from '../types';

interface BroadcastViewProps {
    isBlocked?: boolean;
}

interface Campaign {
    id: string;
    name: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
    instance_id: string;
    message_template: string;
    min_delay: number;
    max_delay: number;
    total_messages: number;
    sent_messages: number;
    error_messages: number;
    created_at: string;
    instances?: { name: string };
}

const BroadcastView: React.FC<BroadcastViewProps> = ({ isBlocked }) => {
    const { showToast } = useToast();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        instance_id: '',
        message_template: '',
        min_delay: 15,
        max_delay: 45,
        contacts_raw: ''
    });

    useEffect(() => {
        fetchData();
        const subscription = supabase
            .channel('campaigns_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
                fetchCampaigns();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchCampaigns(), fetchInstances(), fetchSettings()]);
        setLoading(false);
    };

    const [settings, setSettings] = useState<any>(null);
    const fetchSettings = async () => {
        const { data } = await supabase.from('system_settings').select('api_url, api_key').single();
        if (data) setSettings(data);
    };

    const fetchCampaigns = async () => {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*, instances(name)')
            .order('created_at', { ascending: false });

        if (data) setCampaigns(data);
        if (error) console.error('Error fetching campaigns:', error);
    };

    // --- BROADCAST ENGINE ---
    useEffect(() => {
        const processingCampaigns = campaigns.filter(c => c.status === 'PROCESSING');
        if (processingCampaigns.length > 0) {
            const timer = setTimeout(() => {
                processingCampaigns.forEach(c => runBatch(c));
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [campaigns]);

    const runBatch = async (campaign: Campaign) => {
        if (!settings) return;

        // 1. Get next pending message
        const { data: message, error } = await supabase
            .from('campaign_messages')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('status', 'PENDING')
            .limit(1)
            .maybeSingle();

        if (error || !message) {
            if (!message) {
                await supabase.from('campaigns').update({ status: 'COMPLETED' }).eq('id', campaign.id);
                showToast(`Campanha ${campaign.name} finalizada!`, 'success');
            }
            return;
        }

        // 2. Process message
        const vars = message.variables || {};
        let text = campaign.message_template;
        Object.keys(vars).forEach(key => {
            text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), vars[key]);
        });

        try {
            const response = await fetch(`${settings.api_url}/message/sendText/${campaign.instances?.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key },
                body: JSON.stringify({ number: message.remote_jid, text, delay: 1200 })
            });

            if (response.ok) {
                await supabase.from('campaign_messages').update({ status: 'SENT', sent_at: new Date().toISOString() }).eq('id', message.id);
                await supabase.rpc('increment_campaign_sent', { campaign_id: campaign.id });
            } else {
                throw new Error('API Rejection');
            }
        } catch (err) {
            await supabase.from('campaign_messages').update({ status: 'ERROR', error_message: 'Falha no envio' }).eq('id', message.id);
            await supabase.rpc('increment_campaign_error', { campaign_id: campaign.id });
        }

        // 3. Status is updated via realtime subscription, trigger next loop
        fetchCampaigns();
    };

    const fetchInstances = async () => {
        const { data, error } = await supabase
            .from('instances')
            .select('*')
            .eq('status', 'CONNECTED');

        if (data) setInstances(data);
        if (error) console.error('Error fetching instances:', error);
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCampaign.instance_id) {
            showToast('Selecione uma instância conectada', 'error');
            return;
        }

        const contacts = newCampaign.contacts_raw
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (contacts.length === 0) {
            showToast('Adicione pelo menos um contato', 'error');
            return;
        }

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // 1. Create Campaign
            const { data: campaign, error: cError } = await supabase
                .from('campaigns')
                .insert({
                    user_id: session.user.id,
                    instance_id: newCampaign.instance_id,
                    name: newCampaign.name,
                    message_template: newCampaign.message_template,
                    min_delay: newCampaign.min_delay,
                    max_delay: newCampaign.max_delay,
                    total_messages: contacts.length,
                    status: 'PENDING'
                })
                .select()
                .single();

            if (cError) throw cError;

            // 2. Prepare Messages
            const messagesToInsert = contacts.map(contactLine => {
                // Basic CSV-like parsing for name and other vars
                const parts = contactLine.split(/[,;]/);
                const phone = parts[0].trim().replace(/\D/g, '');
                const name = parts[1]?.trim() || '';

                return {
                    campaign_id: campaign.id,
                    remote_jid: `${phone}@s.whatsapp.net`,
                    variables: { nome: name, raw: contactLine },
                    status: 'PENDING'
                };
            });

            const { error: mError } = await supabase
                .from('campaign_messages')
                .insert(messagesToInsert);

            if (mError) throw mError;

            showToast('Campanha criada com sucesso!', 'success');
            setShowCreateModal(false);
            setNewCampaign({
                name: '',
                instance_id: '',
                message_template: '',
                min_delay: 15,
                max_delay: 45,
                contacts_raw: ''
            });
            fetchCampaigns();
        } catch (error: any) {
            showToast(error.message || 'Erro ao criar campanha', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleCampaignStatus = async (campaign: Campaign) => {
        const newStatus = campaign.status === 'PROCESSING' || campaign.status === 'PENDING' ? 'PAUSED' : 'PROCESSING';
        const { error } = await supabase
            .from('campaigns')
            .update({ status: newStatus })
            .eq('id', campaign.id);

        if (error) showToast('Erro ao atualizar status', 'error');
        else showToast(`Campanha ${newStatus === 'PROCESSING' ? 'retomada' : 'pausada'}`, 'success');
    };

    const deleteCampaign = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id);

        if (error) showToast('Erro ao excluir campanha', 'error');
        else showToast('Campanha excluída', 'success');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PROCESSING': return 'bg-blue-500';
            case 'COMPLETED': return 'bg-emerald-500';
            case 'PAUSED': return 'bg-amber-500';
            case 'CANCELLED': return 'bg-rose-500';
            default: return 'bg-slate-400';
        }
    };

    const filteredCampaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isBlocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mb-6">
                    <AlertCircle className="text-rose-500 w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Módulo Bloqueado</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm">Este recurso está desabilitado para o seu perfil ou plano atual.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Dicas Anti-Ban Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-[2.5rem] text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-lg">Regras Anti-Ban</h3>
                        </div>
                        <ul className="text-xs font-medium space-y-2 text-white/80">
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-white rounded-full" />
                                Use delays acima de 15 segundos
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-white rounded-full" />
                                Evite enviar links em massa para novos contatos
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-white rounded-full" />
                                Personalize chamando pelo nome
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Enviado</p>
                            <h4 className="text-3xl font-black text-slate-900 dark:text-white">
                                {campaigns.reduce((acc, c) => acc + c.sent_messages, 0)}
                            </h4>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                            <Send className="text-blue-500 w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-4 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Sincronizado com Evolution API
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Campanhas Ativas</p>
                            <h4 className="text-3xl font-black text-slate-900 dark:text-white">
                                {campaigns.filter(c => c.status === 'PROCESSING').length}
                            </h4>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <BarChart3 className="text-primary w-6 h-6" />
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full mt-4 py-3 bg-primary text-white text-xs font-black rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Transmissão
                    </button>
                </div>
            </div>

            {/* Campaigns Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Suas Campanhas</h2>
                    <p className="text-sm font-medium text-slate-500">Gerencie e acompanhe seus envios em massa</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar campanha..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                    />
                </div>
            </div>

            {/* Campaigns List */}
            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm font-bold text-slate-400 animate-pulse">Carregando transmissões...</p>
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                            <MessageSquare className="text-slate-300 w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-400">Nenhuma campanha encontrada</h3>
                        <p className="text-xs font-medium text-slate-400 mt-1">Comece criando sua primeira transmissão clicando no botão acima.</p>
                    </div>
                ) : (
                    filteredCampaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-primary/5 transition-all group overflow-hidden relative"
                        >
                            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                                {/* Left Side: Basic Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusColor(campaign.status)}`} />
                                            <h3 className="font-black text-slate-900 dark:text-white text-lg">{campaign.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg uppercase tracking-wider">
                                                {campaign.instances?.name || 'Sem instância'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 line-clamp-2 italic">
                                        "{campaign.message_template}"
                                    </p>

                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(campaign.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Users className="w-3.5 h-3.5" />
                                            {campaign.total_messages} contatos
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Settings className="w-3.5 h-3.5" />
                                            Delay: {campaign.min_delay}-{campaign.max_delay}s
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Progress Bar */}
                                <div className="w-full md:w-64 flex flex-col justify-center space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Progresso</span>
                                        <span className="text-primary font-black">
                                            {Math.round((campaign.sent_messages / (campaign.total_messages || 1)) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${getStatusColor(campaign.status)}`}
                                            style={{ width: `${(campaign.sent_messages / (campaign.total_messages || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div className="text-[10px] font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg text-center">
                                            {campaign.sent_messages} Enviados
                                        </div>
                                        <div className="text-[10px] font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg text-center">
                                            {campaign.error_messages} Erros
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="flex flex-row md:flex-col items-center justify-center gap-3">
                                    <button
                                        onClick={() => toggleCampaignStatus(campaign)}
                                        disabled={campaign.status === 'COMPLETED'}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-95 ${campaign.status === 'PROCESSING'
                                            ? 'bg-amber-500 text-white shadow-amber-500/20'
                                            : campaign.status === 'COMPLETED'
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                                : 'bg-primary text-white shadow-primary/20'
                                            }`}
                                    >
                                        {campaign.status === 'PROCESSING' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
                                    </button>
                                    <button
                                        onClick={() => deleteCampaign(campaign.id)}
                                        className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-100 dark:hover:border-rose-900/30 transition-all rounded-2xl flex items-center justify-center"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowCreateModal(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <Send className="text-primary w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Nova Transmissão</h3>
                                    <p className="text-sm font-medium text-slate-500">Configuração de disparo em massa</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            <form onSubmit={handleCreateCampaign} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Campanha</label>
                                        <input
                                            type="text"
                                            required
                                            value={newCampaign.name}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                            placeholder="Ex: Ofertas de Verão"
                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/5 dark:text-white outline-none font-medium placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instância Responsável</label>
                                        <select
                                            required
                                            value={newCampaign.instance_id}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, instance_id: e.target.value })}
                                            className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-4 focus:ring-primary/5 dark:text-white outline-none font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="">Selecione uma instância...</option>
                                            {instances.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lista de Contatos</label>
                                        <span className="text-[10px] font-bold text-slate-400">Formato: WhatsApp, Nome</span>
                                    </div>
                                    <textarea
                                        required
                                        rows={4}
                                        value={newCampaign.contacts_raw}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, contacts_raw: e.target.value })}
                                        placeholder="5511999999999, João&#10;5511888888888, Maria"
                                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl focus:ring-4 focus:ring-primary/5 dark:text-white outline-none font-medium resize-none placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensagem do Modelo</label>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-primary">{"{{nome}}"}</span>
                                        </div>
                                    </div>
                                    <textarea
                                        required
                                        rows={4}
                                        value={newCampaign.message_template}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, message_template: e.target.value })}
                                        placeholder="Olá {{nome}}! Tudo bem? Confira nossa promoção de hoje..."
                                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl focus:ring-4 focus:ring-primary/5 dark:text-white outline-none font-medium resize-none placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                                    <div className="space-y-2 text-center">
                                        <label className="text-[9px] font-black text-primary uppercase tracking-widest">Min Delay (s)</label>
                                        <input
                                            type="number"
                                            min={5}
                                            value={newCampaign.min_delay}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, min_delay: parseInt(e.target.value) })}
                                            className="w-full bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border-none text-center font-black dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-2 text-center">
                                        <label className="text-[9px] font-black text-primary uppercase tracking-widest">Max Delay (s)</label>
                                        <input
                                            type="number"
                                            min={10}
                                            value={newCampaign.max_delay}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, max_delay: parseInt(e.target.value) })}
                                            className="w-full bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border-none text-center font-black dark:text-white"
                                        />
                                    </div>
                                    <p className="col-span-2 text-center text-[10px] font-bold text-primary/60 italic">
                                        Delays aleatórios ajudam a simular o comportamento humano
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-primary text-white font-black rounded-3xl hover:brightness-110 transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 group active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                        <>
                                            Iniciar Transmissão
                                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BroadcastView;
