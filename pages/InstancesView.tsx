import React, { useState, useEffect, useRef } from 'react';
import { evolutionApi, EvolutionInstance } from '../lib/evolution';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Loader2, Plus, Smartphone, WifiOff, Battery, Trash2, QrCode, RefreshCw, Key, Copy, Check, Eye, EyeOff, AlertCircle, Webhook, Pencil } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';

interface InstancesViewProps {
  isBlocked?: boolean;
}

const InstancesView: React.FC<InstancesViewProps> = ({ isBlocked = false }) => {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ name: string, base64: string } | null>(null);

  // Official API Config Modal State
  const [showOfficialConfigModal, setShowOfficialConfigModal] = useState(false);
  const [selectedOfficialConfig, setSelectedOfficialConfig] = useState<any>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [connectionType, setConnectionType] = useState<'evolution' | 'official'>('evolution');
  const [metaPhoneNumber, setMetaPhoneNumber] = useState(''); // Display Phone Number
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaBusinessId, setMetaBusinessId] = useState('');
  const [metaToken, setMetaToken] = useState('');

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeyId, setShowKeyId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedInstanceName, setCopiedInstanceName] = useState<string | null>(null);

  const { isLimitReached, limits, usage } = usePlanLimits();
  const { showToast } = useToast();

  // Auto-close QR Modal when connected
  useEffect(() => {
    if (!qrCodeData) return;

    const targetInstance = instances.find(i => i.name === qrCodeData.name);
    if (targetInstance) {
      const status = targetInstance.connectionStatus || targetInstance.status;
      // Check for various open statuses
      if (status === 'open' || status === 'open.scanning' || status === 'open.pairing') {
        setQrCodeData(null);
        showToast('Conectado com Sucesso! 🎉', 'success');
      }
    }
  }, [instances, qrCodeData, showToast]);

  useEffect(() => {
    fetchInstances(true);
    fetchApiKeys();

    // Poll DB updates
    const interval = setInterval(() => fetchInstances(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll Evolution API specifically when QR Modal is open to catch connection faster
  useEffect(() => {
    if (!qrCodeData) return;

    const checkStatus = async () => {
      try {
        const state = await evolutionApi.fetchInstanceState(qrCodeData.name);
        const status = state?.instance?.state || state?.state;

        if (status === 'open' || status === 'open.scanning' || status === 'open.pairing') {
          setQrCodeData(null);
          showToast('Conectado com Sucesso! 🎉', 'success');

          // Force update DB to match
          await supabase.from('instances').update({ status: 'open', owner_jid: state?.instance?.ownerJid }).eq('name', qrCodeData.name);
          fetchInstances();
        }
      } catch (err) {
        // Ignore errors during polling
      }
    };

    const poll = setInterval(checkStatus, 3000);
    return () => clearInterval(poll);
  }, [qrCodeData]);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (err: any) {
      console.error('Error fetching API keys:', err);
    }
  };

  const handleGenerateApiKey = async () => {
    if (isBlocked) {
      showToast('Sua conta está suspensa. Você não pode gerar chaves de API.', 'error');
      return;
    }
    if (!newKeyName.trim()) return;

    try {
      setProcessing('GENERATING_KEY');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const newKey = `sk_live_${randomString}`;

      const { error } = await supabase.from('api_keys').insert({
        name: newKeyName.trim(),
        key: newKey,
        user_id: user.id
      });

      if (error) throw error;

      showToast('Chave de API gerada com sucesso!', 'success');
      setNewKeyName('');
      fetchApiKeys();
    } catch (err: any) {
      showToast(err.message || 'Erro ao gerar chave', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta chave? Integrações usando ela pararão de funcionar.')) return;

    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
      showToast('Chave removida!', 'success');
      fetchApiKeys();
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover chave', 'error');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    showToast('Chave copiada!', 'success');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCopyInstanceName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedInstanceName(name);
    showToast('Nome da instância copiado!', 'success');
    setTimeout(() => setCopiedInstanceName(null), 2000);
  };

  const isFetchingRef = useRef(false);
  const fetchInstances = async (showLoading = false) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (showLoading) setLoading(true);

      const { data: dbInstances, error } = await supabase
        .from('instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch Real-time Status
      try {
        const evoData = await evolutionApi.fetchInstances();
        const validEvoInstances = Array.isArray(evoData) ? evoData : [];

        const enriched = (dbInstances || []).map(inst => {
          const evo = validEvoInstances.find(e => ((e as any).instance?.instanceName || e.name) === inst.name);
          const realStatus = evo?.connectionStatus || (evo as any)?.status;

          // Log for debugging
          if (realStatus) console.log(`Instance ${inst.name} Real Status:`, realStatus);

          return {
            ...inst,
            // If API returns a status, use it. Otherwise fallback to DB.
            // Map API 'open' -> DB 'open'
            connectionStatus: realStatus || inst.status
          };
        });
        setInstances(enriched);
      } catch (evoError) {
        console.warn('Evolution API fetch error:', evoError);
        setInstances(dbInstances || []);
      }

    } catch (err: any) {
      if (err.message?.includes('aborted')) return;
      console.error('Instances Error:', err);
      showToast(err.message || 'Erro ao carregar instâncias', 'error');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      showToast('Sua conta está suspensa. Você não pode criar instâncias.', 'error');
      return;
    }
    if (!newInstanceName.trim()) return;

    try {
      setProcessing('CREATING');
      console.log('DEBUG: Starting creation...');

      let instanceId = null;

      // 1. Create in Evolution API (ONLY if type is evolution)
      if (connectionType === 'evolution') {
        console.log('DEBUG: Calling Evolution API createInstance...');
        await evolutionApi.createInstance(newInstanceName.trim());
        console.log('DEBUG: Evolution API createInstance done.');
      }

      // 2. Get User ID
      console.log('DEBUG: Getting User ID...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      console.log('DEBUG: User ID found:', user.id);

      // 3. Save to Supabase (Instances Table)
      console.log('DEBUG: Inserting into Supabase...');
      const { data: insertedInstance, error: dbError } = await supabase.from('instances').insert({
        name: newInstanceName.trim(),
        identifier: newInstanceName.trim(),
        status: connectionType === 'official' ? 'open' : 'connecting',
        type: 'whatsapp',
        channel_type: connectionType,
        user_id: user.id,

        sector: 'Comercial',
        owner_jid: connectionType === 'official' && metaPhoneNumber ? `${metaPhoneNumber.replace(/\D/g, '')}@s.whatsapp.net` : null
      }).select('id').single();

      console.log('DEBUG: Supabase Insert result:', { insertedInstance, dbError });

      if (dbError) {
        console.error('DEBUG: DB Error details:', dbError);
        // Check for RLS or Unique violation
        if (dbError.code === '23505') throw new Error('Nome da instância já existe (em uso por outro usuário ou sistema).');
        throw dbError;
      }

      instanceId = insertedInstance.id;
      console.log('DEBUG: Instance ID created:', instanceId);

      // 4. Save Official Credentials (if applicable)
      if (connectionType === 'official') {
        const { error: metaError } = await supabase.from('whatsapp_official_resources').insert({
          instance_id: instanceId,
          phone_number_id: metaPhoneId.trim(),
          business_account_id: metaBusinessId.trim(),
          access_token: metaToken.trim(),
          verify_token: `verify_${Math.random().toString(36).substring(7)}`
        });

        if (metaError) {
          // Rollback instance creation if meta config fails
          await supabase.from('instances').delete().eq('id', instanceId);
          throw metaError;
        }
      }

      showToast('Instância criada e configurada com sucesso!', 'success');
      setShowModal(false);
      setNewInstanceName('');
      setMetaPhoneId('');
      setMetaBusinessId('');
      setMetaToken('');
      setMetaPhoneNumber('');
      setIsEditing(false);
      setEditingId(null);
      setConnectionType('evolution');
      fetchInstances();
    } catch (error: any) {
      console.error('Creation Error:', error);
      showToast(error.message || 'Erro ao criar instância', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleEditOfficial = async (instance: any) => {
    try {
      setProcessing('FETCH_EDIT');
      console.log('Fetching official config for:', instance.id);
      const { data, error } = await supabase
        .from('whatsapp_official_resources')
        .select('*')
        .eq('instance_id', instance.id)
        .single();

      if (error) throw error;

      setNewInstanceName(instance.name);
      setConnectionType('official');
      setMetaPhoneId(data.phone_number_id);
      setMetaBusinessId(data.business_account_id);
      setMetaToken(data.access_token);
      // Clean phone number from owner_jid which is usually 5511...@s.whatsapp.net
      setMetaPhoneNumber(instance.owner_jid ? instance.owner_jid.split('@')[0] : '');
      setEditingId(instance.id);
      setIsEditing(true);
      setShowModal(true);
    } catch (err: any) {
      showToast('Erro ao carregar dados para edição', 'error');
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleUpdateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !newInstanceName.trim()) return;

    try {
      setProcessing('UPDATING');

      // Update Instance Name & Phone
      const ownerJid = metaPhoneNumber ? `${metaPhoneNumber.replace(/\D/g, '')}@s.whatsapp.net` : null;
      const { error: instError } = await supabase
        .from('instances')
        .update({
          name: newInstanceName.trim(),
          owner_jid: ownerJid
        })
        .eq('id', editingId);

      if (instError) throw instError;

      if (connectionType === 'official') {
        const { error: metaError } = await supabase
          .from('whatsapp_official_resources')
          .update({
            phone_number_id: metaPhoneId.trim(),
            business_account_id: metaBusinessId.trim(),
            access_token: metaToken.trim()
          })
          .eq('instance_id', editingId);

        if (metaError) throw metaError;
      }

      showToast('Instância atualizada com sucesso!', 'success');
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      setNewInstanceName('');
      setMetaPhoneId('');
      setMetaBusinessId('');
      setMetaToken('');
      setMetaPhoneNumber('');
      setConnectionType('evolution');
      fetchInstances();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao atualizar instância', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteInstance = async (name: string) => {
    if (!confirm(`Tem certeza que deseja deletar a instância "${name}"?`)) return;

    try {
      setProcessing(name);

      const instanceToDelete = instances.find(i => i.name === name);
      const isOfficial = instanceToDelete?.channel_type === 'official';

      // 1. Delete from Evolution API first (ONLY if NOT official)
      if (!isOfficial) {
        try {
          await evolutionApi.deleteInstance(name);
        } catch (apiError: any) {
          console.warn('Evolution API delete failed (may already be deleted):', apiError);
        }
      }

      // 2. Delete from Supabase (Cascade will handle official resources)
      const { error } = await supabase.from('instances').delete().eq('name', name);
      if (error) throw error;

      showToast('Instância deletada com sucesso', 'success');
      fetchInstances();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao deletar instância', 'error');
    } finally {
      setProcessing(null);
    }
  };


  const handleConnect = async (instanceName: string) => {
    if (isBlocked) {
      showToast('Sua conta está suspensa. Você não pode conectar instâncias.', 'error');
      return;
    }
    try {
      setProcessing(instanceName);
      const data = await evolutionApi.connectInstance(instanceName);
      console.log('Connect response:', data);

      // Handle different response structures from Evolution API
      const qrBase64 = data?.base64 || data?.qrcode?.base64 || data?.code;
      const pairingCode = data?.pairingCode || data?.code;

      if (qrBase64 && qrBase64.includes('base64')) {
        setQrCodeData({ name: instanceName, base64: qrBase64 });
        showToast('QR Code gerado com sucesso!', 'success');
      } else if (qrBase64) {
        // If it's just the base64 data without the prefix
        setQrCodeData({ name: instanceName, base64: `data:image/png;base64,${qrBase64}` });
        showToast('QR Code gerado com sucesso!', 'success');
      } else if (pairingCode) {
        showToast(`Código de pareamento: ${pairingCode}`, 'success');
      } else if (data?.instance?.state === 'open' || data?.state === 'open') {
        showToast('Instância já está conectada!', 'info');
      } else {
        console.log('No QR code in response, full data:', JSON.stringify(data));
        showToast('Comando enviado. Verifique o status.', 'info');
      }
      fetchInstances();
    } catch (error: any) {
      console.error('Connect error:', error);
      showToast('Erro ao conectar instância', 'error');
    } finally {
      setProcessing(null);
    }
  };


  const handleLogout = async (instanceName: string) => {
    if (!confirm(`Tem certeza que deseja desconectar a instância "${instanceName}"?`)) return;

    try {
      setProcessing(instanceName);
      showToast('Iniciando processo de desconexão...', 'info');

      // 1. Update Supabase FIRST for instant UI feedback
      const { error: updateError } = await supabase
        .from('instances')
        .update({ status: 'close', owner_jid: null })
        .eq('name', instanceName);

      if (updateError) {
        console.error('Supabase update error:', updateError);
      }

      // Refresh UI immediately
      fetchInstances();

      // 2. Then call Evolution API (in background, don't wait)
      evolutionApi.logoutInstance(instanceName)
        .then(() => {
          console.log('Evolution API logout completed');
          showToast('Desconectado com segurança e sucesso! 👋', 'success');
        })
        .catch((err) => {
          console.warn('Evolution API logout failed:', err);
          showToast('Sessão encerrada localmente, mas houve um erro na API.', 'warning');
        });

    } catch (error: any) {
      console.error('Logout error:', error);
      showToast('Erro ao processar desconexão', 'error');
    } finally {
      setProcessing(null);
    }
  };



  const handleSyncInstances = async () => {
    try {
      setProcessing('SYNCING');
      showToast('Sincronizando com Evolution API...', 'info');

      // 1. Fetch from Evolution
      const evoInstances = await evolutionApi.fetchInstances();
      const evoNames = (evoInstances as any[]).map(i => i.instance?.instanceName || i.name);

      // 2. Compare with Supabase
      const { data: dbInstances } = await supabase.from('instances').select('name, id');

      if (dbInstances) {
        for (const inst of dbInstances) {
          if (!evoNames.includes(inst.name)) {
            // Delete from Supabase if not in Evolution
            await supabase.from('instances').delete().eq('id', inst.id);
          } else {
            // Repair Webhook for existing instances
            try {
              await evolutionApi.setWebhook(inst.name, true);
            } catch (wErr) {
              console.error(`Failed to repair webhook for ${inst.name}`, wErr);
            }
          }
        }
      }

      showToast('Sincronização e reparo concluídos!', 'success');
      fetchInstances(false);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao sincronizar instâncias', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleShowOfficialConfig = async (instanceId: string) => {
    try {
      setProcessing('FETCH_CONFIG');
      const { data, error } = await supabase
        .from('whatsapp_official_resources')
        .select('*')
        .eq('instance_id', instanceId)
        .single();

      if (error) throw error;

      setSelectedOfficialConfig(data);
      setShowOfficialConfigModal(true);
    } catch (err: any) {
      showToast('Erro ao buscar configurações', 'error');
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': // Connected
      case 'open.scanning':
      case 'open.pairing':
        return 'emerald';
      case 'close': // Disconnected
        return 'rose';
      case 'connecting': // Connecting/Waiting for QR
        return 'amber';
      default:
        return 'amber'; // Unknown -> Amber to be safe
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'CONECTADO';
      case 'open.scanning': return 'CONECTADO';
      case 'open.pairing': return 'CONECTADO';
      case 'close': return 'DESCONECTADO';
      case 'connecting': return 'AGUARDANDO LEITURA';
      default: return status?.toUpperCase() || 'DESCONHECIDO';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gerenciamento</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs md:text-sm">Controle suas instâncias do WhatsApp</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleSyncInstances}
            disabled={processing === 'SYNCING'}
            className="flex-1 sm:flex-initial bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-50 active:scale-95 text-xs md:text-sm"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${processing === 'SYNCING' ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <button
            onClick={() => {
              if (isLimitReached('instances')) {
                showToast(`Limite do plano atingido (${limits?.max_instances} instâncias). Faça upgrade para adicionar mais.`, 'error');
              } else {
                setIsEditing(false);
                setEditingId(null);
                setNewInstanceName('');
                setMetaPhoneNumber('');
                setMetaPhoneId('');
                setMetaBusinessId('');
                setMetaToken('');
                setConnectionType('evolution');
                setShowModal(true);
              }
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg md:shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 text-xs md:text-sm ${isLimitReached('instances') ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white'}`}
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Nova Instância
          </button>
        </div>
      </div>

      {/* List Table */}
      {
        loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : instances.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem]">
            <Smartphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma instância encontrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Instância</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">WhatsApp</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                    {instances.map((instance) => {
                      const status = instance.connectionStatus || instance.status || 'close';
                      const statusColor = getStatusColor(status);
                      const isProcessing = processing === instance.name;
                      const isConnected = status === 'open' || status === 'open.scanning' || status === 'open.pairing';
                      const whatsappNumber = instance.owner_jid ? `+${instance.owner_jid.split('@')[0]}` : '-';

                      return (
                        <tr key={instance.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl ${instance.channel_type === 'official' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-500' : `bg-${statusColor}-100 text-${statusColor}-500 dark:bg-${statusColor}-500/10`} flex items-center justify-center`}>
                                {instance.channel_type === 'official' ? <div className="font-black text-xs">OFF</div> : <Smartphone className="w-6 h-6" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black dark:text-white">{instance.name}</h4>
                                  <button
                                    onClick={() => handleCopyInstanceName(instance.name)}
                                    className="p-1 text-slate-400 hover:text-primary transition-colors"
                                  >
                                    {copiedInstanceName === instance.name ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {instance.channel_type === 'official' ? 'WhatsApp Oficial (Meta)' : 'Evolution V2'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">{whatsappNumber}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${statusColor}-50 dark:bg-${statusColor}-500/10`}>
                              <span className={`w-2 h-2 rounded-full bg-${statusColor}-500 animate-pulse`}></span>
                              <span className={`text-xs font-black uppercase tracking-widest text-${statusColor}-600 dark:text-${statusColor}-400`}>
                                {getStatusLabel(status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {instance.channel_type !== 'official' && (
                                !isConnected ? (
                                  <button
                                    onClick={() => handleConnect(instance.name)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95"
                                  >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                    QR Code
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleLogout(instance.name)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95"
                                  >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <WifiOff className="w-4 h-4" />}
                                    Sair
                                  </button>
                                )
                              )}
                              {instance.channel_type === 'official' && (
                                <>
                                  <button
                                    onClick={() => handleShowOfficialConfig(instance.id)}
                                    className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors"
                                  >
                                    <Webhook className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleEditOfficial(instance)}
                                    className="p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl text-slate-400 hover:text-amber-500 transition-colors"
                                  >
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteInstance(instance.name)}
                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {instances.map((instance) => {
                const status = instance.connectionStatus || instance.status || 'close';
                const statusColor = getStatusColor(status);
                const isConnected = status === 'open' || status === 'open.scanning' || status === 'open.pairing';
                const whatsappNumber = instance.owner_jid ? `+${instance.owner_jid.split('@')[0]}` : '---';
                const isConnecting = processing === instance.name;

                return (
                  <div key={instance.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-${statusColor}-50 dark:bg-${statusColor}-500/10 flex items-center justify-center`}>
                          <Smartphone className={`w-5 h-5 text-${statusColor}-500`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{instance.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{instance.channel_type === 'official' ? 'API Cloud' : 'WhatsApp Web'}</p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full bg-${statusColor}-50 dark:bg-${statusColor}-500/10 flex items-center gap-1.5`}>
                        <div className={`w-1 h-1 rounded-full bg-${statusColor}-500`}></div>
                        <span className={`text-[9px] font-black text-${statusColor}-500 tracking-wider`}>
                          {getStatusLabel(status)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6 px-1">
                      <span className="material-icons-round text-slate-300 text-sm">phone</span>
                      <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {whatsappNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-50 dark:border-slate-700/30">
                      {instance.channel_type !== 'official' ? (
                        !isConnected ? (
                          <button
                            onClick={() => handleConnect(instance.name)}
                            disabled={isConnecting}
                            className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                            QR Code
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLogout(instance.name)}
                            disabled={isConnecting}
                            className="flex items-center justify-center gap-2 py-2.5 bg-rose-500 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                          >
                            {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WifiOff className="w-3.5 h-3.5" />}
                            Sair
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleEditOfficial(instance)}
                          className="flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteInstance(instance.name)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded-xl text-[11px] font-bold active:scale-95 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      <div className="mt-16 mb-20 space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black dark:text-white tracking-tight">Tokens de Acesso API</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Integração com sistemas externos</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative group flex-1 sm:min-w-[240px]">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Nome Identificador (ex: CRM Vendas)"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/20 rounded-2xl text-sm font-bold outline-none transition-all dark:text-white"
                  />
                </div>
                <button
                  onClick={handleGenerateApiKey}
                  disabled={!newKeyName || processing === 'GENERATING_KEY'}
                  className="px-8 py-3.5 bg-primary hover:bg-primary-light text-white text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 uppercase tracking-wider"
                >
                  {processing === 'GENERATING_KEY' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Gerar Novo Token
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <p className="text-[10px] md:text-xs text-slate-500 font-medium leading-relaxed">
                <strong className="text-amber-500 uppercase tracking-widest mr-2">Segurança:</strong>
                Use tokens individuais para cada integração (CRM, Webhook, ERP). Se um token for comprometido, você poderá revogá-lo sem afetar os outros sistemas.
              </p>
            </div>
          </div>

          <div className="p-8">
            {apiKeys.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold">Nenhum token gerado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black dark:text-white uppercase tracking-wider">{apiKey.name}</span>
                      <button
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        title="Revogar chave"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <code className="flex-1 font-mono text-xs text-slate-600 dark:text-slate-400 truncate">
                        {showKeyId === apiKey.id ? apiKey.key : 'sk_live_••••••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowKeyId(showKeyId === apiKey.id ? null : apiKey.id)}
                        className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                      >
                        {showKeyId === apiKey.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                        className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                      >
                        {copiedKeyId === apiKey.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-bold text-slate-400">Criada em: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                      {apiKey.last_used_at && (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Ativa</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Create Modal */}
      {
        showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg md:max-w-2xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2">{isEditing ? 'Editar Instância' : 'Nova Instância'}</h2>
              <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8">{isEditing ? 'Atualize os dados da conexão.' : 'Configure sua nova conexão do WhatsApp.'}</p>

              <form onSubmit={isEditing ? handleUpdateInstance : handleCreateInstance} className="space-y-6">

                {/* Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {!isEditing && (
                    <div
                      onClick={() => setConnectionType('evolution')}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${connectionType === 'evolution' ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-xl ${connectionType === 'evolution' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <QrCode className="w-5 h-5" />
                        </div>
                        <span className={`font-bold ${connectionType === 'evolution' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>QR Code</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">Conecte seu WhatsApp existente escaneando um código.</p>

                      {connectionType === 'evolution' && (
                        <div className="absolute top-2 right-2">
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    onClick={() => {
                      if (!isEditing) showToast('Em manutenção. Aguarde novidades!', 'info');
                    }}
                    className={`cursor-not-allowed opacity-50 p-4 rounded-2xl border-2 transition-all relative overflow-hidden border-slate-100 dark:border-slate-700 hover:border-slate-100 dark:hover:border-slate-700 ${isEditing ? 'col-span-2' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400`}>
                        <span className="font-bold text-xs">M</span>
                      </div>
                      <span className={`font-bold text-slate-500 dark:text-slate-400`}>API Oficial</span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                        Em Breve
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">Use a API Cloud da Meta para alta performance e estabilidade.</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Instância</label>
                  <input
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    placeholder="Ex: Vendas 01"
                    className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white border-2 border-transparent focus:border-primary/20 transition-all"
                    autoFocus
                  />
                </div>

                {connectionType === 'official' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                        <span className="text-emerald-600 dark:text-emerald-500 font-bold text-xs">ID</span>
                      </div>
                      <h3 className="text-sm font-black text-slate-700 dark:text-white">Credenciais da Meta</h3>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">WhatsApp Number</label>
                      <input
                        value={metaPhoneNumber}
                        onChange={(e) => setMetaPhoneNumber(e.target.value)}
                        placeholder="Ex: 5511999999999"
                        className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white border border-slate-100 dark:border-slate-700/50"
                      />
                      <p className="text-[10px] text-slate-400 mt-1 ml-1">Número completo com código do país (DDI + DDD + Número)</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number ID</label>
                        <input
                          value={metaPhoneId}
                          onChange={(e) => setMetaPhoneId(e.target.value)}
                          placeholder="Ex: 1059..."
                          className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white border border-slate-100 dark:border-slate-700/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Business Account ID</label>
                        <input
                          value={metaBusinessId}
                          onChange={(e) => setMetaBusinessId(e.target.value)}
                          placeholder="Ex: 1023..."
                          className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white border border-slate-100 dark:border-slate-700/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Access Token (Permanente)</label>
                      <div className="relative">
                        <input
                          value={metaToken}
                          onChange={(e) => setMetaToken(e.target.value)}
                          placeholder="Ex: EAAG..."
                          type="password"
                          className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white border border-slate-100 dark:border-slate-700/50"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 ml-1">Use um token de sistema ou de usuário permanente.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={processing === 'CREATING' || !newInstanceName || (connectionType === 'official' && (!metaPhoneId || !metaToken))}
                    className={`flex-1 py-4 text-white font-bold rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${connectionType === 'official' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-primary hover:bg-primary-light shadow-primary/20'}`}
                  >
                    {processing === 'CREATING' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Instância'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* QR Code Modal */}
      {
        qrCodeData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 text-center relative">
              <button
                onClick={() => setQrCodeData(null)}
                className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <Trash2 className="w-5 h-5 rotate-45" />
              </button>

              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">QR Code de Conexão</h2>
              <p className="text-slate-500 mb-6 font-medium">{qrCodeData.name}</p>

              <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100 inline-block mb-6">
                <img src={qrCodeData.base64} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>

              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Abra o WhatsApp &gt; Dispositivos Conectados &gt; Conectar</p>

              <button
                onClick={() => setQrCodeData(null)}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20"
              >
                Fechar
              </button>
            </div>
          </div>
        )
      }

      {/* Official API Config Modal */}
      {
        showOfficialConfigModal && selectedOfficialConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">Configuração do Webhook</h2>
                  <p className="text-slate-500 text-sm">Configure estes dados no Painel da Meta (Facebook).</p>
                </div>
                <button
                  onClick={() => setShowOfficialConfigModal(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <Trash2 className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-500 font-bold leading-relaxed">
                    Acesse developers.facebook.com &gt; WhatsApp &gt; Configuração &gt; Webhook e insira os dados abaixo.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Callback URL</label>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 break-all">
                      {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-webhook`}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-webhook`);
                        showToast('URL copiada!', 'success');
                      }}
                      className="p-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Verify Token</label>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300">
                      {selectedOfficialConfig.verify_token}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOfficialConfig.verify_token);
                        showToast('Token copiado!', 'success');
                      }}
                      className="p-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowOfficialConfigModal(false)}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};


export default InstancesView;
