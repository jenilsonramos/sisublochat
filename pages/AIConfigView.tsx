import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import {
    Bot,
    Key,
    Settings,
    Save,
    Sparkles,
    ShieldCheck,
    Zap,
    BrainCircuit,
    Loader2,
    RefreshCcw,
    Sliders,
    History,
    MessageSquare,
    AlertTriangle,
    Cpu,
    Lock
} from 'lucide-react';
import { TabType } from '../types';
import { usePlanLimits } from '../hooks/usePlanLimits';

interface AISettings {
    api_key: string;
    model: string;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    history_limit: number;
    enabled: boolean;
    provider: 'gemini' | 'chatgpt';
}

interface AIConfigViewProps {
    onTabChange?: (tab: TabType) => void;
}

const AIConfigView: React.FC<AIConfigViewProps> = ({ onTabChange }) => {
    const { hasFeature, loading: loadingPlan } = usePlanLimits();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<AISettings>({
        api_key: '',
        model: 'gemini-1.5-flash',
        system_prompt: 'Você é um assistente prestativo da Evolution API.',
        temperature: 0.7,
        max_tokens: 800,
        history_limit: 5,
        enabled: false,
        provider: 'gemini'
    });

    const geminiModels = [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Rápido e eficiente para respostas curtas', icon: <Zap className="w-4 h-4" /> },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Altamente inteligente para fluxos complexos', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)', desc: 'Nova geração, ultra-rápida', icon: <BrainCircuit className="w-4 h-4" /> }
    ];

    const chatgptModels = [
        { id: 'gpt-4o', name: 'GPT-4o', desc: 'O modelo mais avançado e inteligente', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Equilíbrio perfeito entre custo e velocidade', icon: <Zap className="w-4 h-4" /> },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', desc: 'Confiável, rápido e econômico', icon: <Cpu className="w-4 h-4" /> }
    ];

    const currentModels = settings.provider === 'gemini' ? geminiModels : chatgptModels;

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('ai_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setSettings({
                    api_key: data.api_key || '',
                    model: data.model || (data.provider === 'chatgpt' ? 'gpt-4o-mini' : 'gemini-1.5-flash'),
                    system_prompt: data.system_prompt || '',
                    temperature: data.temperature ?? 0.7,
                    max_tokens: data.max_tokens ?? 800,
                    history_limit: data.history_limit ?? 5,
                    enabled: data.enabled || false,
                    provider: data.provider || 'gemini'
                });
            }
        } catch (err: any) {
            console.error('Error fetching AI settings:', err);
            showToast('Erro ao carregar configurações de IA', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) throw new Error('Usuário não autenticado');

            // 1. Save AI Settings
            const { error: aiError } = await supabase
                .from('ai_settings')
                .upsert({
                    user_id: user.id,
                    api_key: settings.api_key,
                    model: settings.model,
                    system_prompt: settings.system_prompt,
                    temperature: settings.temperature,
                    max_tokens: settings.max_tokens,
                    history_limit: settings.history_limit,
                    enabled: settings.enabled,
                    provider: settings.provider,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (aiError) throw aiError;

            // 2. Synchronize Chatbots (Error-tolerant)
            try {
                if (settings.enabled) {
                    await supabase
                        .from('chatbots')
                        .update({ status: 'PAUSED' })
                        .eq('user_id', user.id)
                        .eq('status', 'ACTIVE');
                    showToast(`Configurações salvas! IA ${settings.provider === 'gemini' ? 'Gemini' : 'ChatGPT'} Ativada e Chatbots pausados.`, 'success');
                } else {
                    await supabase
                        .from('chatbots')
                        .update({ status: 'ACTIVE' })
                        .eq('user_id', user.id)
                        .eq('status', 'PAUSED');
                    showToast('Configurações salvas! IA Desativada e Chatbots reativados.', 'success');
                }
            } catch (botErr) {
                console.error('Error syncing chatbots:', botErr);
                showToast('Configurações salvas, mas houve um erro ao sincronizar os chatbots.', 'warning');
            }

        } catch (err: any) {
            console.error('Error saving AI settings:', err);
            showToast(err.message || 'Erro ao salvar configurações', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading || loadingPlan) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <p className="text-xl font-black text-slate-400 animate-pulse">Carregando inteligência artificial...</p>
            </div>
        );
    }

    if (!hasFeature('ai_enabled')) {
        return (
            <div className="flex flex-col h-[70vh] items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-8 relative">
                    <Sparkles className="w-12 h-12 text-primary opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Recurso Premium</h2>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm font-medium leading-relaxed mb-10">
                    O módulo de Inteligência Artificial não está disponível no seu plano atual. Faça o upgrade agora para automatizar seus atendimentos.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => onTabChange?.('subscription')}
                        className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 active:scale-95"
                    >
                        Fazer Upgrade Agora
                    </button>
                    <button
                        onClick={() => onTabChange?.('subscription')}
                        className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-black rounded-2xl hover:bg-slate-200 transition-all"
                    >
                        Ver Planos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Header Card - Ultra Compact Version */}
            <div className={`bg-gradient-to-br transition-all duration-700 rounded-3xl p-5 md:p-6 text-white shadow-xl relative overflow-hidden group ${settings.provider === 'gemini' ? 'from-primary via-indigo-600 to-indigo-800' : 'from-emerald-600 via-teal-700 to-slate-900'}`}>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider">
                            <Sparkles className="w-3 h-3" />
                            {settings.provider === 'gemini' ? 'Google Gemini' : 'OpenAI ChatGPT'}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight italic leading-none">IA {settings.provider === 'gemini' ? 'Gemini' : 'ChatGPT'}</h1>
                        <p className="text-white/80 max-w-lg text-[11px] font-medium leading-normal">
                            Automação de atendimentos com inteligência artificial e perfeição humana.
                        </p>

                        {/* Compact Provider Selector */}
                        <div className="flex bg-white/10 backdrop-blur-md p-0.5 rounded-xl w-fit border border-white/20 mt-1">
                            <button
                                onClick={() => setSettings({ ...settings, provider: 'gemini', model: 'gemini-1.5-flash' })}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${settings.provider === 'gemini' ? 'bg-white text-primary shadow-sm' : 'text-white hover:bg-white/5'}`}
                            >
                                GEMINI
                            </button>
                            <button
                                onClick={() => setSettings({ ...settings, provider: 'chatgpt', model: 'gpt-4o-mini' })}
                                className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${settings.provider === 'chatgpt' ? 'bg-white text-emerald-600 shadow-sm' : 'text-white hover:bg-white/5'}`}
                            >
                                CHATGPT
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 gap-2 min-w-[140px]">
                        <label className="relative inline-flex items-center cursor-pointer group scale-75 origin-center">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.enabled}
                                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-6 after:transition-all after:shadow-lg peer-checked:bg-secondary border border-white/30 backdrop-blur-sm"></div>
                        </label>
                        <div className="text-center">
                            <span className="text-xs font-black uppercase block leading-none">{settings.enabled ? 'ATIVO' : 'DESATIVADO'}</span>
                            <span className="text-white/50 text-[8px] font-bold uppercase tracking-tighter">Status Global</span>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 opacity-10 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none">
                    <Bot className="w-48 h-48" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Auth Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`p-3 rounded-2xl ${settings.provider === 'gemini' ? 'bg-primary/10' : 'bg-emerald-500/10'}`}>
                                <Key className={`w-6 h-6 ${settings.provider === 'gemini' ? 'text-primary' : 'text-emerald-500'}`} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">API Key</h2>
                                <p className="text-slate-400 text-sm font-medium">Chave de acesso da {settings.provider === 'gemini' ? 'Google AI' : 'OpenAI'}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <input
                                    type="password"
                                    value={settings.api_key}
                                    onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                                    placeholder={settings.provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-2">
                                {settings.provider === 'gemini' ? (
                                    <>Onde obter? <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google AI Studio</a></>
                                ) : (
                                    <>Onde obter? <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">OpenAI Dashboard</a></>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Model Selector */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Escolha o Modelo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {currentModels.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => setSettings({ ...settings, model: model.id })}
                                    className={`p-6 rounded-3xl text-left border-2 transition-all flex flex-col gap-4 ${settings.model === model.id
                                        ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                        : 'border-transparent bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`p-3 rounded-2xl w-fit ${settings.model === model.id ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm'}`}>
                                        {model.icon}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${settings.model === model.id ? 'text-primary' : 'dark:text-white'}`}>{model.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">{model.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Persona Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-secondary/10 rounded-2xl">
                                    <BrainCircuit className="w-6 h-6 text-secondary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold dark:text-white">Personalidade do Assistente</h2>
                                    <p className="text-slate-400 text-sm font-medium">Instruções de comportamento para a IA</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, system_prompt: 'Você é um assistente prestativo da Evolution API.' })}
                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                            >
                                <RefreshCcw className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            value={settings.system_prompt}
                            onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                            rows={8}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-secondary/50 transition-all text-sm font-medium leading-relaxed custom-scrollbar"
                            placeholder="Ex: Você é um vendedor cordial..."
                        />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Fine Tuning */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-amber-500/10 rounded-2xl">
                                <Sliders className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold dark:text-white">Ajustes Finos</h2>
                                <p className="text-slate-400 text-xs font-medium italic">Parâmetros de resposta</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold dark:text-white">Criatividade (Temp)</label>
                                    <span className="text-sm font-black text-primary">{settings.temperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={settings.temperature}
                                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-bold dark:text-white">Máximo de Tokens</label>
                                <input
                                    type="number"
                                    value={settings.max_tokens}
                                    onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) || 0 })}
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all font-bold text-sm"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-bold dark:text-white">Histórico de Mensagens</label>
                                <div className="flex items-center gap-4">
                                    <History className="w-5 h-5 text-slate-400" />
                                    <input
                                        type="number" min="1" max="50"
                                        value={settings.history_limit}
                                        onChange={(e) => setSettings({ ...settings, history_limit: parseInt(e.target.value) || 1 })}
                                        className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-5 bg-primary hover:bg-primary-light disabled:bg-slate-400 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all"
                    >
                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIConfigView;
