import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import {
    Plus,
    Loader2,
    Trash2,
    Edit3,
    Play,
    Pause,
    Workflow,
    Zap,
    Clock,
    CheckCircle2,
    XCircle,
    Power,
    Smartphone,
    X
} from 'lucide-react';
import FlowEditor from '../components/FlowEditor/FlowEditor';

interface Flow {
    id: string;
    name: string;
    description: string | null;
    nodes: any[];
    edges: any[];
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
    instance_id: string | null;
    trigger_type: 'any' | 'keyword' | null;
    trigger_keyword: string | null;
    created_at: string;
    updated_at: string;
}

interface Instance {
    id: string;
    name: string;
    status: string;
}

interface FlowBuilderViewProps {
    isBlocked?: boolean;
}

const FlowBuilderView: React.FC<FlowBuilderViewProps> = ({ isBlocked = false }) => {
    const { showToast } = useToast();
    const [flows, setFlows] = useState<Flow[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFlowName, setNewFlowName] = useState('');
    const [newFlowDesc, setNewFlowDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Activation Modal State
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [activatingFlow, setActivatingFlow] = useState<Flow | null>(null);
    const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
    const [triggerType, setTriggerType] = useState<'any' | 'keyword'>('any');
    const [triggerKeyword, setTriggerKeyword] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchFlows();
        fetchInstances();
    }, []);

    const fetchFlows = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('flows')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setFlows(data || []);
        } catch (error: any) {
            showToast(error.message || 'Erro ao carregar fluxos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchInstances = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('instances')
                .select('id, name, status')
                .eq('user_id', user.id)
                .ilike('status', 'open%');

            if (error) throw error;
            setInstances(data || []);
        } catch (error: any) {
            console.error('Erro ao carregar instâncias:', error);
        }
    };

    const handleCreateFlow = async () => {
        if (isBlocked) {
            showToast('Sua conta está suspensa. Você não pode criar fluxos.', 'error');
            return;
        }

        if (!newFlowName.trim()) {
            showToast('Digite um nome para o fluxo', 'error');
            return;
        }

        try {
            setCreating(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            const { data, error } = await supabase
                .from('flows')
                .insert({
                    user_id: user.id,
                    name: newFlowName.trim(),
                    description: newFlowDesc.trim() || null,
                    nodes: [],
                    edges: [],
                    status: 'DRAFT'
                })
                .select()
                .single();

            if (error) throw error;

            showToast('Fluxo criado com sucesso!', 'success');
            setShowCreateModal(false);
            setNewFlowName('');
            setNewFlowDesc('');
            setFlows(prev => [data, ...prev]);

            // Open editor for the new flow
            setSelectedFlow(data);
            setIsEditorOpen(true);
        } catch (error: any) {
            showToast(error.message || 'Erro ao criar fluxo', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteFlow = async (flowId: string) => {
        if (!confirm('Tem certeza que deseja excluir este fluxo?')) return;

        try {
            const { error } = await supabase
                .from('flows')
                .delete()
                .eq('id', flowId);

            if (error) throw error;
            setFlows(prev => prev.filter(f => f.id !== flowId));
            showToast('Fluxo excluído', 'warning');
        } catch (error: any) {
            showToast(error.message || 'Erro ao excluir fluxo', 'error');
        }
    };

    const handleEditFlow = (flow: Flow) => {
        setSelectedFlow(flow);
        setIsEditorOpen(true);
    };

    const handleSaveFlow = async (nodes: any[], edges: any[]) => {
        if (!selectedFlow) return;

        try {
            const { error } = await supabase
                .from('flows')
                .update({
                    nodes,
                    edges,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedFlow.id);

            if (error) throw error;

            setFlows(prev => prev.map(f =>
                f.id === selectedFlow.id
                    ? { ...f, nodes, edges, updated_at: new Date().toISOString() }
                    : f
            ));
            showToast('Fluxo salvo!', 'success');
        } catch (error: any) {
            showToast(error.message || 'Erro ao salvar fluxo', 'error');
        }
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setSelectedFlow(null);
    };

    // Open activation modal
    const openActivateModal = (flow: Flow) => {
        setActivatingFlow(flow);
        setSelectedInstanceId(flow.instance_id || '');
        setShowActivateModal(true);
    };

    // Activate flow
    const handleActivateFlow = async () => {
        if (!activatingFlow) return;
        if (!selectedInstanceId) {
            showToast('Selecione uma instância', 'error');
            return;
        }

        // Extract trigger from StartNode and map to db values
        const startNode = activatingFlow.nodes?.find(n => n.type === 'start');
        let nodeTriggerType = startNode?.data?.triggerType || 'any';
        // Map frontend "new_message" to backend "any"
        if (nodeTriggerType === 'new_message') nodeTriggerType = 'any';

        const nodeKeyword = startNode?.data?.keyword || null;

        try {
            setSaving(true);
            const { error } = await supabase
                .from('flows')
                .update({
                    instance_id: selectedInstanceId,
                    trigger_type: nodeTriggerType,
                    trigger_keyword: nodeTriggerType === 'keyword' ? nodeKeyword : null,
                    status: 'ACTIVE',
                    updated_at: new Date().toISOString()
                })
                .eq('id', activatingFlow.id);

            if (error) throw error;

            setFlows(prev => prev.map(f =>
                f.id === activatingFlow.id
                    ? {
                        ...f,
                        instance_id: selectedInstanceId,
                        trigger_type: nodeTriggerType,
                        trigger_keyword: nodeTriggerType === 'keyword' ? nodeKeyword : null,
                        status: 'ACTIVE' as const,
                        updated_at: new Date().toISOString()
                    }
                    : f
            ));

            showToast('Fluxo ativado com sucesso!', 'success');
            setShowActivateModal(false);
            setActivatingFlow(null);
        } catch (error: any) {
            showToast(error.message || 'Erro ao ativar fluxo', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Deactivate flow
    const handleDeactivateFlow = async (flowId: string) => {
        try {
            const { error } = await supabase
                .from('flows')
                .update({
                    status: 'PAUSED',
                    updated_at: new Date().toISOString()
                })
                .eq('id', flowId);

            if (error) throw error;

            setFlows(prev => prev.map(f =>
                f.id === flowId
                    ? { ...f, status: 'PAUSED' as const, updated_at: new Date().toISOString() }
                    : f
            ));

            showToast('Fluxo pausado', 'warning');
        } catch (error: any) {
            showToast(error.message || 'Erro ao pausar fluxo', 'error');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-600';
            case 'PAUSED': return 'bg-amber-100 text-amber-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Ativo';
            case 'PAUSED': return 'Pausado';
            default: return 'Rascunho';
        }
    };

    const getInstanceName = (instanceId: string | null) => {
        if (!instanceId) return null;
        const instance = instances.find(i => i.id === instanceId);
        return instance?.name || null;
    };

    // Full-screen editor mode
    if (isEditorOpen && selectedFlow) {
        return (
            <FlowEditor
                flow={selectedFlow}
                onSave={handleSaveFlow}
                onClose={handleCloseEditor}
            />
        );
    }

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-20">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">
                        Carregando seus fluxos...
                    </p>
                </div>
            </div>
        );
    }

    if (isMobile) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="max-w-sm space-y-8 bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-700/50">
                    <div className="w-24 h-24 bg-rose-50 dark:bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 transform -rotate-12">
                        <Smartphone className="w-12 h-12 text-rose-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black dark:text-white leading-tight">FlowBuilder é exclusivo para Desktop</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Para garantir a melhor experiência na criação de fluxos complexos, utilize um <b>computador ou notebook</b>.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stats Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Fluxos', value: flows.length.toString(), icon: <Workflow className="w-5 h-5" />, color: 'indigo' },
                    { label: 'Ativos', value: flows.filter(f => f.status === 'ACTIVE').length.toString(), icon: <Zap className="w-5 h-5" />, color: 'emerald' },
                    { label: 'Rascunhos', value: flows.filter(f => f.status === 'DRAFT').length.toString(), icon: <Clock className="w-5 h-5" />, color: 'amber' },
                    { label: 'Pausados', value: flows.filter(f => f.status === 'PAUSED').length.toString(), icon: <XCircle className="w-5 h-5" />, color: 'rose' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center gap-5">
                        <div className={`w-12 h-12 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-2xl flex items-center justify-center`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black dark:text-white leading-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </section>

            {/* Main Content */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black dark:text-white tracking-tight">Seus Fluxos</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Crie fluxos de conversação visuais e interativos
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (isBlocked) {
                                showToast('Funcionalidade bloqueada.', 'error');
                                return;
                            }
                            setShowCreateModal(true);
                        }}
                        disabled={isBlocked}
                        className={`w-full md:w-auto px-6 py-4 bg-primary hover:bg-primary-light text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-95 text-xs uppercase ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Plus className="w-5 h-5" />
                        Novo Fluxo
                    </button>
                </div>

                {/* Flow List */}
                <div className="p-6 md:p-8">
                    {flows.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <Workflow className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black dark:text-white mb-2">Nenhum fluxo criado</h3>
                            <p className="text-slate-500 font-medium mb-6">
                                Crie seu primeiro fluxo de conversação visual
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-4 bg-primary hover:bg-primary-light text-white font-black rounded-2xl inline-flex items-center gap-2 transition-all shadow-xl shadow-primary/20"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Primeiro Fluxo
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700/50">
                                {/* Table Header */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 grid grid-cols-12 gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <div className="col-span-4">Nome</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2">Instância</div>
                                    <div className="col-span-2">Atualizado</div>
                                    <div className="col-span-2 text-right">Ações</div>
                                </div>

                                {/* Table Rows */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {flows.map((flow) => (
                                        <div
                                            key={flow.id}
                                            className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer group"
                                            onClick={() => handleEditFlow(flow)}
                                        >
                                            {/* Name & Description */}
                                            <div className="col-span-4 flex items-center gap-4">
                                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                                    <Workflow className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold dark:text-white truncate">{flow.name}</h3>
                                                    <p className="text-xs text-slate-400 truncate">{flow.description || 'Sem descrição'}</p>
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(flow.status)}`}>
                                                    {getStatusLabel(flow.status)}
                                                </span>
                                            </div>

                                            {/* Instance */}
                                            <div className="col-span-2">
                                                {flow.instance_id ? (
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                        <Smartphone className="w-3.5 h-3.5 text-primary" />
                                                        <span className="truncate">{getInstanceName(flow.instance_id) || 'Vinculado'}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </div>

                                            {/* Updated Date */}
                                            <div className="col-span-2 flex items-center gap-2 text-xs text-slate-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(flow.updated_at).toLocaleDateString()}
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-2 flex items-center justify-end gap-1">
                                                {flow.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeactivateFlow(flow.id); }}
                                                        className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all"
                                                        title="Pausar"
                                                    >
                                                        <Pause className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openActivateModal(flow); }}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                                                        title="Ativar"
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditFlow(flow); }}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFlow(flow.id); }}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden grid grid-cols-1 gap-4">
                                {flows.map((flow) => (
                                    <div
                                        key={flow.id}
                                        className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-4"
                                        onClick={() => handleEditFlow(flow)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                                    <Workflow className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold dark:text-white truncate">{flow.name}</h3>
                                                    <p className="text-[10px] text-slate-400 truncate">{flow.description || 'Sem descrição'}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${getStatusColor(flow.status)}`}>
                                                {getStatusLabel(flow.status)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Smartphone className="w-3 h-3" />
                                                    <span className="truncate max-w-[80px]">{getInstanceName(flow.instance_id) || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{new Date(flow.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {flow.status === 'ACTIVE' ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeactivateFlow(flow.id); }}
                                                        className="px-3 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-xl font-bold"
                                                    >
                                                        Pausar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openActivateModal(flow); }}
                                                        className="px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl font-bold"
                                                    >
                                                        Ativar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFlow(flow.id); }}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create Flow Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-2xl font-black dark:text-white mb-6">Criar Novo Fluxo</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                    Nome do Fluxo *
                                </label>
                                <input
                                    type="text"
                                    value={newFlowName}
                                    onChange={(e) => setNewFlowName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    placeholder="Ex: Fluxo de Atendimento"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                    Descrição (opcional)
                                </label>
                                <textarea
                                    value={newFlowDesc}
                                    onChange={(e) => setNewFlowDesc(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/50 transition-all font-medium resize-none"
                                    placeholder="Descreva o objetivo deste fluxo..."
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-8">
                            <button
                                onClick={() => { setShowCreateModal(false); setNewFlowName(''); setNewFlowDesc(''); }}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateFlow}
                                disabled={creating}
                                className="px-6 py-3 bg-primary hover:bg-primary-light text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Criar Fluxo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activation Modal */}
            {showActivateModal && activatingFlow && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black dark:text-white">Ativar Fluxo</h3>
                            <button
                                onClick={() => { setShowActivateModal(false); setActivatingFlow(null); }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Flow Info */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Workflow className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold dark:text-white">{activatingFlow.name}</h4>
                                    <p className="text-sm text-slate-500">{activatingFlow.nodes?.length || 0} nós configurados</p>
                                </div>
                            </div>

                            {/* Instance Selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                    Selecione a Instância *
                                </label>
                                {instances.length === 0 ? (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-xl text-sm">
                                        Nenhuma instância conectada. Conecte uma instância primeiro.
                                    </div>
                                ) : (
                                    <select
                                        value={selectedInstanceId}
                                        onChange={(e) => setSelectedInstanceId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                    >
                                        <option value="">Selecione...</option>
                                        {instances.map((instance) => (
                                            <option key={instance.id} value={instance.id}>
                                                {instance.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-8">
                            <button
                                onClick={() => { setShowActivateModal(false); setActivatingFlow(null); }}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleActivateFlow}
                                disabled={saving || !selectedInstanceId || instances.length === 0}
                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
                                Ativar Fluxo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlowBuilderView;
