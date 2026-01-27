import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { evolutionApi } from '../lib/evolution';
import { useToast } from '../components/ToastProvider';
import { Loader2, Bot, Bolt, MessageSquare, AlertTriangle, Plus, Brain, Network, MessageCircle, Edit, Trash2, Settings, List, X, ShieldAlert, Rocket, PlusCircle, Trash, Hand, Clock } from 'lucide-react';

interface Chatbot {
  id: string;
  name: string;
  trigger: string;
  instance_id: string;
  status: 'ACTIVE' | 'PAUSED';
  last_run: string | null;
  type: 'SIMPLE' | 'FLOW' | 'AI' | 'GREETING';
  match_type?: 'exact' | 'contains' | 'starts' | 'ends';
  is_active?: boolean;
  description?: string;
}

interface ChatbotStep {
  id: string;
  chatbot_id: string;
  type: 'text' | 'image' | 'audio';
  content: string;
  delay: number;
  position: number;
}

interface DayConfig {
  enabled: boolean;
  start: string;
  end: string;
}

interface ChatbotsViewProps {
  isBlocked?: boolean;
}

const ChatbotsView: React.FC<ChatbotsViewProps> = ({ isBlocked = false }) => {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [botName, setBotName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [steps, setSteps] = useState<Partial<ChatbotStep>[]>([
    { type: 'text', content: '', delay: 2, position: 0 }
  ]);
  const [uploadingStep, setUploadingStep] = useState<number | null>(null);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'starts' | 'ends'>('contains');
  const [botDescription, setBotDescription] = useState(''); // Added for new bot payload
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null); // Added for new bot payload
  const [editingBot, setEditingBot] = useState<Chatbot | null>(null); // Added for new bot payload

  // Greeting Modal State
  const [showGreetingModal, setShowGreetingModal] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [greetingCooldownHours, setGreetingCooldownHours] = useState(24);
  const [savingGreeting, setSavingGreeting] = useState(false);
  const [loadingGreeting, setLoadingGreeting] = useState(false);
  const [isGreetingModalOpen, setIsGreetingModalOpen] = useState(false); // Added for new greeting modal
  const [greetingBot, setGreetingBot] = useState<Chatbot | null>(null); // Added for new greeting modal

  // Business Hours Modal State
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false);
  const [loadingBusinessHours, setLoadingBusinessHours] = useState(false);
  const [savingBusinessHours, setSavingBusinessHours] = useState(false);
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [awayMessage, setAwayMessage] = useState('Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve.');
  const [businessHours, setBusinessHours] = useState<Record<string, DayConfig>>({
    monday: { enabled: true, start: '08:00', end: '18:00' },
    tuesday: { enabled: true, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, start: '08:00', end: '18:00' },
    thursday: { enabled: true, start: '08:00', end: '18:00' },
    friday: { enabled: true, start: '08:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' },
  });

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploadingStep(index);

      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `bots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      updateStep(index, 'content' as any, publicUrl);
      showToast('Arquivo carregado com sucesso!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro no upload do arquivo', 'error');
    } finally {
      setUploadingStep(null);
    }
  };

  useEffect(() => {
    fetchChatbots();
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        .eq('status', 'open');
      if (error) throw error;
      setInstances(data || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  const fetchChatbots = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatbots(data || []);
    } catch (error: any) {
      showToast(error.message || 'Erro ao carregar chatbots', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatus = async (newStatus: 'ACTIVE' | 'PAUSED') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('chatbots')
        .update({ status: newStatus })
        .eq('user_id', user.id);

      if (error) throw error;

      showToast(
        `Todos os chatbots foram ${newStatus === 'ACTIVE' ? 'ativados' : 'pausados'} com sucesso!`,
        'success'
      );
      fetchChatbots();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar status em massa', 'error');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('chatbots')
        .update({ status: !currentStatus ? 'ACTIVE' : 'PAUSED' })
        .eq('id', id);

      if (error) throw error;
      showToast(`Chatbot ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`, 'success');
      fetchChatbots();
    } catch (error: any) {
      showToast(error.message || 'Erro ao alterar status do chatbot', 'error');
    }
  };

  const handleDeleteBot = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('chatbots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setChatbots(prev => prev.filter(b => b.id !== id));
      showToast(`Bot "${name}" removido`, 'warning');
    } catch (error: any) {
      showToast(error.message || 'Erro ao remover bot', 'error');
    }
  };

  const addStep = () => {
    setSteps([...steps, {
      type: 'text',
      content: '',
      delay: 2,
      position: steps.length
    }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i }));
      setSteps(newSteps);
    }
  };

  const updateStep = (index: number, field: keyof ChatbotStep, value: any) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleEditBot = async (bot: Chatbot) => {
    try {
      setEditingBotId(bot.id);
      setEditingBot(bot); // Set the full bot object for editing
      setBotName(bot.name);
      setKeywords(bot.trigger);
      setMatchType(bot.match_type || 'contains');
      setBotDescription(bot.description || ''); // Assuming description exists on Chatbot
      setSelectedInstanceId(bot.instance_id); // Assuming instance_id exists on Chatbot

      const fetchSteps = async (chatbotId: string) => {
        try {
          const { data, error } = await supabase
            .from('chatbot_steps')
            .select('*')
            .eq('chatbot_id', chatbotId)
            .order('order', { ascending: true });

          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error('Error fetching steps:', error);
          return [];
        }
      };
      // Fetch steps for this bot
      const stepsData = await fetchSteps(bot.id);

      if (stepsData && stepsData.length > 0) {
        setSteps(stepsData.map((s: any) => ({
          id: s.id,
          chatbot_id: s.chatbot_id,
          type: s.type,
          content: s.content,
          delay: s.delay,
          position: s.order
        })));
      } else {
        setSteps([{ type: 'text', content: '', delay: 2, position: 0 }]);
      }

      setShowModal(true);
    } catch (error: any) {
      showToast(error.message || 'Erro ao carregar bot', 'error');
    }
  };

  const resetForm = () => {
    setBotName('');
    setKeywords('');
    setSteps([{ type: 'text', content: '', delay: 2, position: 0 }]);
    setEditingBotId(null);
    setEditingBot(null);
    setMatchType('contains');
    setBotDescription('');
    setSelectedInstanceId(null);
  };

  const handleSaveBot = async () => {
    if (!botName.trim()) {
      showToast('Por favor, dê um nome à automação', 'error');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      if (editingBot) {
        // Update Bot
        const { error: botError } = await supabase
          .from('chatbots')
          .update({
            name: botName,
            description: botDescription,
            instance_id: selectedInstanceId || null,
            updated_at: new Date().toISOString(),
            trigger: keywords, // Assuming trigger is part of the bot update
            match_type: matchType, // Assuming match_type is part of the bot update
            type: steps.length > 1 ? 'FLOW' : 'SIMPLE', // Assuming type can be updated
          })
          .eq('id', editingBot.id);

        if (botError) throw botError;

        // Update Steps: Delete old, Insert new
        await supabase.from('chatbot_steps').delete().eq('chatbot_id', editingBot.id);

        const stepsToInsert = steps.map((s, idx) => ({
          chatbot_id: editingBot.id,
          type: s.type,
          content: s.content,
          order: idx,
          delay: s.delay, // Assuming delay is part of the step
          next_step_id: null
        }));

        const { error: stepsError } = await supabase.from('chatbot_steps').insert(stepsToInsert);
        if (stepsError) throw stepsError;

      } else {
        // Create Bot
        const { data: newBot, error: botError } = await supabase
          .from('chatbots')
          .insert({
            name: botName,
            description: botDescription,
            instance_id: selectedInstanceId || null,
            user_id: user.id,
            trigger: keywords, // Assuming trigger is part of the bot creation
            match_type: matchType, // Assuming match_type is part of the bot creation
            type: steps.length > 1 ? 'FLOW' : 'SIMPLE', // Assuming type is part of the bot creation
            status: 'ACTIVE', // Default status for new bots
          })
          .select()
          .single();

        if (botError) throw botError;

        const stepsToInsert = steps.map((s, idx) => ({
          chatbot_id: newBot.id,
          type: s.type,
          content: s.content,
          order: idx,
          delay: s.delay, // Assuming delay is part of the step
          next_step_id: null
        }));

        const { error: stepsError } = await supabase.from('chatbot_steps').insert(stepsToInsert);
        if (stepsError) throw stepsError;
      }

      showToast(`Automação "${botName}" ${editingBotId ? 'atualizada' : 'criada'} com sucesso!`, 'success');
      setShowModal(false);
      fetchChatbots();
      resetForm();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar bot', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url: string) => {
    try { return new URL(url); } catch { return false; }
  };

  const handleOpenGreetingModal = async (instanceIdInput?: any) => {
    let instanceId = typeof instanceIdInput === 'string' ? instanceIdInput : null;

    // If no instanceId and we have instances, use the first one
    if (!instanceId && instances.length > 0) {
      instanceId = instances[0].id;
    }

    if (!instanceId) {
      showToast('Nenhuma instância conectada encontrada para configurar a saudação', 'error');
      return;
    }

    setSelectedInstanceId(instanceId);
    setLoadingGreeting(true);
    setIsGreetingModalOpen(true);
    setGreetingMessage('');
    setGreetingBot(null);

    try {
      const { data, error } = await supabase
        .from('chatbots')
        .select('*, chatbot_steps(*)')
        .eq('instance_id', instanceId)
        .eq('type', 'GREETING')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found

      if (data) {
        setGreetingBot(data);
        // Parse cooldown from trigger if it exists
        const cooldownMatch = data.trigger?.match(/cooldown:(\d+)/);
        if (cooldownMatch) {
          setGreetingCooldownHours(parseInt(cooldownMatch[1]));
        } else {
          setGreetingCooldownHours(24); // Default if not found
        }

        if (data.chatbot_steps && data.chatbot_steps.length > 0) {
          setGreetingMessage(data.chatbot_steps[0].content);
        }
      } else {
        // No greeting bot found, set defaults
        setGreetingMessage('');
        setGreetingCooldownHours(24);
      }
      setShowGreetingModal(true); // Keep this to open the modal
    } catch (error: any) {
      showToast('Erro ao carregar saudação', 'error');
      // If an error occurs, still open the modal with defaults
      setGreetingMessage('');
      setGreetingCooldownHours(24);
      setShowGreetingModal(true);
    } finally {
      setLoadingGreeting(false);
    }
  };

  const handleSaveGreeting = async () => {
    if (isBlocked) {
      showToast('Sua conta está suspensa. Você não pode salvar saudações.', 'error');
      return;
    }
    if (!greetingMessage.trim()) {
      showToast('Por favor, digite uma mensagem de saudação', 'error');
      return;
    }
    if (!selectedInstanceId) {
      showToast('Nenhuma instância selecionada para a saudação.', 'error');
      return;
    }

    try {
      setSavingGreeting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const triggerValue = `cooldown:${greetingCooldownHours}`;

      if (greetingBot) {
        // Update existing greeting bot
        await supabase.from('chatbots').update({
          name: 'Saudação Padrão',
          trigger: triggerValue,
          updated_at: new Date().toISOString(),
          status: 'ACTIVE', // Ensure it's active on update
        }).eq('id', greetingBot.id);

        // Update its step
        if (greetingBot.chatbot_steps && greetingBot.chatbot_steps.length > 0) {
          await supabase.from('chatbot_steps').update({ content: greetingMessage }).eq('id', greetingBot.chatbot_steps[0].id);
        } else {
          // If for some reason steps are missing, create one
          await supabase.from('chatbot_steps').insert({
            chatbot_id: greetingBot.id,
            type: 'text',
            content: greetingMessage,
            order: 0,
            delay: 1,
          });
        }
      } else {
        // Create new greeting bot
        const { data: newBot, error: botError } = await supabase.from('chatbots').insert({
          name: 'Saudação Padrão',
          type: 'GREETING',
          instance_id: selectedInstanceId,
          user_id: user.id,
          trigger: triggerValue,
          status: 'ACTIVE',
        }).select().single();

        if (botError) throw botError;

        await supabase.from('chatbot_steps').insert({
          chatbot_id: newBot.id,
          type: 'text',
          content: greetingMessage,
          order: 0,
          delay: 1,
        });
      }

      // 2. Reset all conversations' last_greeted_at for the selected instance
      await supabase
        .from('conversations')
        .update({ last_greeted_at: null })
        .eq('instance_id', selectedInstanceId);


      showToast('Mensagem de saudação salva com sucesso!', 'success');
      setShowGreetingModal(false);
      setIsGreetingModalOpen(false); // Close the new modal state
      fetchChatbots();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar saudação', 'error');
    } finally {
      setSavingGreeting(false);
    }
  };

  const resetAllGreetings = async () => {
    if (!confirm('Deseja resetar o contador de saudações para todos os contatos? Eles receberão a saudação novamente na próxima mensagem.')) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ last_greeted_at: null });

      if (error) throw error;
      showToast('Saudações resetadas com sucesso!', 'success');
    } catch (error: any) {
      showToast('Erro ao resetar saudações', 'error');
    }
  };

  // Business Hours Functions
  const handleOpenBusinessHours = async () => {
    setShowBusinessHoursModal(true);
    setLoadingBusinessHours(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setBusinessHoursEnabled(data.enabled);
        setAwayMessage(data.away_message);
        setBusinessHours({
          monday: { enabled: data.monday_enabled, start: data.monday_start?.substring(0, 5) || '08:00', end: data.monday_end?.substring(0, 5) || '18:00' },
          tuesday: { enabled: data.tuesday_enabled, start: data.tuesday_start?.substring(0, 5) || '08:00', end: data.tuesday_end?.substring(0, 5) || '18:00' },
          wednesday: { enabled: data.wednesday_enabled, start: data.wednesday_start?.substring(0, 5) || '08:00', end: data.wednesday_end?.substring(0, 5) || '18:00' },
          thursday: { enabled: data.thursday_enabled, start: data.thursday_start?.substring(0, 5) || '08:00', end: data.thursday_end?.substring(0, 5) || '18:00' },
          friday: { enabled: data.friday_enabled, start: data.friday_start?.substring(0, 5) || '08:00', end: data.friday_end?.substring(0, 5) || '18:00' },
          saturday: { enabled: data.saturday_enabled, start: data.saturday_start?.substring(0, 5) || '09:00', end: data.saturday_end?.substring(0, 5) || '13:00' },
          sunday: { enabled: data.sunday_enabled, start: data.sunday_start?.substring(0, 5) || '09:00', end: data.sunday_end?.substring(0, 5) || '13:00' },
        });
      }
    } catch (error: any) {
      console.error('Error loading business hours:', error);
    } finally {
      setLoadingBusinessHours(false);
    }
  };

  const handleSaveBusinessHours = async () => {
    setSavingBusinessHours(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const payload = {
        user_id: user.id,
        enabled: businessHoursEnabled,
        away_message: awayMessage,
        monday_enabled: businessHours.monday.enabled,
        monday_start: businessHours.monday.start,
        monday_end: businessHours.monday.end,
        tuesday_enabled: businessHours.tuesday.enabled,
        tuesday_start: businessHours.tuesday.start,
        tuesday_end: businessHours.tuesday.end,
        wednesday_enabled: businessHours.wednesday.enabled,
        wednesday_start: businessHours.wednesday.start,
        wednesday_end: businessHours.wednesday.end,
        thursday_enabled: businessHours.thursday.enabled,
        thursday_start: businessHours.thursday.start,
        thursday_end: businessHours.thursday.end,
        friday_enabled: businessHours.friday.enabled,
        friday_start: businessHours.friday.start,
        friday_end: businessHours.friday.end,
        saturday_enabled: businessHours.saturday.enabled,
        saturday_start: businessHours.saturday.start,
        saturday_end: businessHours.saturday.end,
        sunday_enabled: businessHours.sunday.enabled,
        sunday_start: businessHours.sunday.start,
        sunday_end: businessHours.sunday.end,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('business_hours')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      showToast('Horário de atendimento salvo!', 'success');
      setShowBusinessHoursModal(false);
    } catch (error: any) {
      console.error('Error saving business hours:', error);
      showToast('Erro ao salvar horário', 'error');
    } finally {
      setSavingBusinessHours(false);
    }
  };

  const dayNames: { [key: string]: string } = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Bots', value: chatbots.length.toString(), icon: <Bot className="w-5 h-5" />, color: 'indigo' },
          { label: 'Ativos', value: chatbots.filter(b => b.status === 'ACTIVE').length.toString(), icon: <Bolt className="w-5 h-5" />, color: 'emerald' },
          { label: 'Mensagens', value: '0', icon: <MessageSquare className="w-5 h-5" />, color: 'blue' },
          { label: 'Alertas', value: '0', icon: <AlertTriangle className="w-5 h-5" />, color: 'rose' }
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

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-10">
        <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleOpenBusinessHours}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-xs uppercase"
            >
              <Clock className="w-5 h-5" />
              Horários
            </button>
            <button
              onClick={() => handleOpenGreetingModal()}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 active:scale-95 text-xs uppercase"
            >
              <Hand className="w-5 h-5" />
              Saudação
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <button
                onClick={() => handleBulkStatus('PAUSED')}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] uppercase"
                title="Pausar todos os chatbots"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Pausar Tudo
              </button>
              <button
                onClick={() => handleBulkStatus('ACTIVE')}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] uppercase"
                title="Ativar todos os chatbots"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
                Ativar Tudo
              </button>
            </div>
            <button
              onClick={() => {
                if (isBlocked) {
                  showToast('Funcionalidade bloqueada.', 'error');
                  return;
                }
                resetForm(); setShowModal(true);
              }}
              disabled={isBlocked}
              className={`px-6 py-4 bg-primary hover:bg-primary-light text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-95 text-xs uppercase ${isBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus className="w-5 h-5" />
              Novo Chatbot
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-bold text-slate-400 animate-pulse">Carregando seus bots...</p>
            </div>
          ) : chatbots.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-400 font-medium">Você ainda não possui chatbots criados.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block divide-y divide-slate-50 dark:divide-slate-700/30">
                {chatbots.map((bot) => (
                  <div key={bot.id} className="py-6 flex items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bot.type === 'AI' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
                        bot.type === 'FLOW' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' :
                          'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                        {bot.type === 'AI' ? <Brain className="w-7 h-7" /> : bot.type === 'FLOW' ? <Network className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold dark:text-white">{bot.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="material-icons-round text-xs">key</span>
                            {bot.trigger}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span>{bot.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:gap-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Execução</p>
                        <p className="text-sm font-bold dark:text-white">{bot.last_run || 'Nunca'}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                          <button
                            onClick={() => toggleStatus(bot.id, bot.status === 'ACTIVE')}
                            className={`relative w-12 h-6 rounded-full transition-all ${bot.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${bot.status === 'ACTIVE' ? 'translate-x-7' : 'translate-x-1'}`}></div>
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBot(bot)}
                            className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBot(bot.id, bot.name)}
                            className="p-3 bg-slate-100 dark:bg-slate-700 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden grid grid-cols-1 gap-4">
                {chatbots.map((bot) => (
                  <div key={bot.id} className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bot.type === 'AI' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
                          bot.type === 'FLOW' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' :
                            'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                          }`}>
                          {bot.type === 'AI' ? <Brain className="w-6 h-6" /> : bot.type === 'FLOW' ? <Network className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-base font-bold dark:text-white leading-tight">{bot.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-1">
                              <span className="material-icons-round text-[10px]">key</span>
                              {bot.trigger}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{bot.type}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleStatus(bot.id, bot.status === 'ACTIVE')}
                        className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${bot.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${bot.status === 'ACTIVE' ? 'translate-x-5.5' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                      <div>
                        <p className="mb-0.5">Execução</p>
                        <p className="text-slate-600 dark:text-slate-300">{bot.last_run || 'Nunca'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditBot(bot)}
                          className="px-4 py-2 bg-white dark:bg-slate-800 text-primary border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm active:scale-95"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteBot(bot.id, bot.name)}
                          className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl active:scale-95"
                        >
                          Excluir
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

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)}></div>
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in duration-300">

            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <span className="material-icons-round">auto_fix_high</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black dark:text-white leading-tight">{editingBotId ? 'Editar Automação' : 'Criar Fluxo de Resposta'}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuração de Gatilhos e Ações</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm transition-all active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-sm font-black dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      Configuração Geral
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Automação</label>
                        <input
                          value={botName}
                          onChange={(e) => setBotName(e.target.value)}
                          type="text"
                          placeholder="Ex: Boas-vindas"
                          className="w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm shadow-sm outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Palavras-Chave (Gatilho)</label>
                        <div className="relative group">
                          <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors text-lg">key</span>
                          <input
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            type="text"
                            placeholder="ola, preço, ajuda"
                            className="w-full pl-12 pr-4 p-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm shadow-sm outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium ml-1">Separe por vírgulas. Deixe vazio para responder a tudo.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Correspondência</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'contains', label: 'Contém', desc: 'Mensagem contém a palavra' },
                            { value: 'exact', label: 'Exata', desc: 'Mensagem é exatamente igual' },
                            { value: 'starts', label: 'Começa com', desc: 'Mensagem começa com a palavra' },
                            { value: 'ends', label: 'Termina com', desc: 'Mensagem termina com a palavra' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setMatchType(opt.value as any)}
                              className={`p-3 rounded-xl border-2 text-left transition-all ${matchType === opt.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                                }`}
                            >
                              <p className="text-xs font-bold dark:text-white">{opt.label}</p>
                              <p className="text-[10px] text-slate-400">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <List className="w-4 h-4 text-emerald-500" />
                      Sequência de Mensagens
                    </h3>
                    <button
                      onClick={addStep}
                      className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Adicionar Etapa
                    </button>
                  </div>

                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={index} className="group relative p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:border-primary/50">
                        {steps.length > 1 && (
                          <button
                            onClick={() => removeStep(index)}
                            className="absolute -right-2 -top-2 w-8 h-8 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg flex items-center justify-center transform hover:scale-110 active:scale-90"
                          >
                            <Trash className="w-5 h-5" />
                          </button>
                        )}

                        <div className="flex flex-col sm:flex-row gap-6">
                          <div className="w-full sm:w-12 shrink-0">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 font-black text-sm">
                              {index + 1}
                            </div>
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
                                {['text', 'image', 'audio'].map(t => (
                                  <button
                                    key={t}
                                    onClick={() => updateStep(index, 'type' as any, t as any)}
                                    className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${step.type === t ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                  >
                                    {t.toUpperCase()}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 tracking-widest">Delay:</span>
                                <input
                                  type="number"
                                  value={step.delay}
                                  onChange={(e) => updateStep(index, 'delay' as any, parseInt(e.target.value))}
                                  className="w-12 p-1 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs font-bold text-center dark:text-white outline-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-3">
                              {step.type === 'text' ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={step.content}
                                    onChange={(e) => updateStep(index, 'content' as any, e.target.value)}
                                    placeholder="O que o bot deve responder? Use {{nome}} para personalizar!"
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all dark:text-white text-sm min-h-[80px] outline-none"
                                  />
                                  <div className="flex flex-wrap gap-2 px-1">
                                    <span className="text-[10px] font-black text-slate-400">Variáveis:</span>
                                    {[
                                      { var: '{{nome}}', desc: 'Nome completo' },
                                      { var: '{{primeiro_nome}}', desc: 'Primeiro nome' },
                                      { var: '{{telefone}}', desc: 'Telefone' }
                                    ].map(v => (
                                      <button
                                        key={v.var}
                                        type="button"
                                        onClick={() => updateStep(index, 'content' as any, (step.content || '') + v.var)}
                                        className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-mono"
                                        title={v.desc}
                                      >
                                        {v.var}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                    <label className="flex-1 cursor-pointer">
                                      <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl hover:border-primary transition-all">
                                        {uploadingStep === index ? (
                                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        ) : (
                                          <PlusCircle className="w-5 h-5 text-slate-400" />
                                        )}
                                        <span className="text-sm font-bold text-slate-500 text-center">
                                          {uploadingStep === index ? 'Enviando...' : `Selecionar ${step.type === 'image' ? 'Imagem' : 'Áudio'}`}
                                        </span>
                                      </div>
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept={step.type === 'image' ? 'image/*' : 'audio/*'}
                                        onChange={(e) => handleFileUpload(index, e)}
                                        disabled={uploadingStep !== null}
                                      />
                                    </label>
                                    {step.content && (
                                      <button
                                        onClick={() => updateStep(index, 'content' as any, '')}
                                        className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
                                      >
                                        <Trash className="w-5 h-5" />
                                      </button>
                                    )}
                                  </div>

                                  <input
                                    value={step.content}
                                    onChange={(e) => updateStep(index, 'content' as any, e.target.value)}
                                    placeholder="Ou cole o link direto aqui..."
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-[10px] dark:text-white outline-none"
                                  />
                                </div>
                              )}

                              {step.type === 'image' && step.content && isValidUrl(step.content) && (
                                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pré-visualização da Mídia</p>
                                  <img src={step.content} alt="Preview" className="max-h-32 rounded-xl shadow-sm object-contain bg-white dark:bg-slate-800" onError={(e) => e.currentTarget.src = "https://placehold.co/400x200?text=URL+Inválida"} />
                                </div>
                              )}

                              {step.type === 'audio' && step.content && isValidUrl(step.content) && (
                                <div className="mt-2 p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                  <audio controls src={step.content} className="w-full h-8" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addStep}
                    className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 hover:text-primary hover:border-primary transition-all font-bold text-sm flex items-center justify-center gap-2 group shadow-inner"
                  >
                    <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Adicionar Próxima Resposta
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col-reverse sm:flex-row gap-3 md:gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBot}
                disabled={loading}
                className="flex-1 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Salvar Automação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Greeting Modal */}
      {showGreetingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowGreetingModal(false)}></div>
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in duration-300">

            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Hand className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black dark:text-white leading-tight">Mensagem de Saudação</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Boas-vindas automáticas</p>
                </div>
              </div>
              <button onClick={() => setShowGreetingModal(false)} className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-sm transition-all active:scale-90">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem de Saudação</label>
                <textarea
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="Olá! Seja bem-vindo! Como posso te ajudar hoje?"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-amber-500/20 transition-all dark:text-white text-sm min-h-[120px] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Repetir após (horas)</label>
                <p className="text-[10px] text-slate-400 ml-1 mb-2">Tempo para enviar a saudação novamente para o mesmo contato</p>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={greetingCooldownHours}
                    onChange={(e) => setGreetingCooldownHours(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-24 p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-center font-bold dark:text-white outline-none"
                  />
                  <span className="text-sm font-bold text-slate-500">horas</span>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 flex gap-4">
              <button
                onClick={() => setShowGreetingModal(false)}
                className="px-8 py-4 bg-white dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGreeting}
                disabled={savingGreeting}
                className="flex-1 px-8 py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingGreeting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Hand className="w-5 h-5" />
                    Salvar Saudação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Hours Modal */}
      {showBusinessHoursModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black dark:text-white flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-500" />
                    Horário de Atendimento
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Configure os dias e horários de funcionamento</p>
                </div>
                <button
                  onClick={() => setShowBusinessHoursModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {loadingBusinessHours ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <div>
                      <p className="font-bold dark:text-white">Ativar Horário de Atendimento</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Responder automaticamente fora do horário</p>
                    </div>
                    <button
                      onClick={() => setBusinessHoursEnabled(!businessHoursEnabled)}
                      className={`w-14 h-8 rounded-full transition-all ${businessHoursEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all ${businessHoursEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Away Message */}
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                      Mensagem de Ausência
                    </label>
                    <textarea
                      value={awayMessage}
                      onChange={(e) => setAwayMessage(e.target.value)}
                      rows={3}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl resize-none font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Digite a mensagem que será enviada fora do horário..."
                    />
                  </div>

                  {/* Days Configuration */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300">
                      Dias e Horários
                    </label>
                    {Object.entries(businessHours).map(([day, config]: [string, DayConfig]) => (
                      <div key={day} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                        <button
                          onClick={() => setBusinessHours(prev => ({
                            ...prev,
                            [day]: { ...config, enabled: !config.enabled }
                          }))}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${config.enabled ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}
                        >
                          {config.enabled ? '✓' : ''}
                        </button>
                        <span className={`w-24 font-bold ${config.enabled ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                          {dayNames[day]}
                        </span>
                        <input
                          type="time"
                          value={config.start}
                          onChange={(e) => setBusinessHours(prev => ({
                            ...prev,
                            [day]: { ...config, start: e.target.value }
                          }))}
                          disabled={!config.enabled}
                          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white disabled:opacity-50"
                        />
                        <span className="text-slate-400">até</span>
                        <input
                          type="time"
                          value={config.end}
                          onChange={(e) => setBusinessHours(prev => ({
                            ...prev,
                            [day]: { ...config, end: e.target.value }
                          }))}
                          disabled={!config.enabled}
                          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold dark:text-white disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-8 border-t border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 flex gap-4">
              <button
                onClick={() => setShowBusinessHoursModal(false)}
                className="px-8 py-4 bg-white dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBusinessHours}
                disabled={savingBusinessHours}
                className="flex-1 px-8 py-4 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingBusinessHours ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <Clock className="w-5 h-5" />
                    Salvar Horários
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotsView;
