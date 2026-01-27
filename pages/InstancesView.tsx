import React, { useState, useEffect } from 'react';
import { evolutionApi, EvolutionInstance } from '../lib/evolution';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Loader2, Plus, Smartphone, WifiOff, Battery, Trash2, QrCode, RefreshCw, Key, Copy, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
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

  // Form State
  const [newInstanceName, setNewInstanceName] = useState('');
  const [connectionType, setConnectionType] = useState<'evolution' | 'official'>('evolution');
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

  const fetchInstances = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstances(data || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao carregar instâncias', 'error');
    } finally {
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

      let instanceId = null;

      // 1. Create in Evolution API (ONLY if type is evolution)
      if (connectionType === 'evolution') {
        await evolutionApi.createInstance(newInstanceName.trim());
      }

      // 2. Get User ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 3. Save to Supabase (Instances Table)
      const { data: insertedInstance, error: dbError } = await supabase.from('instances').insert({
        name: newInstanceName.trim(),
        identifier: newInstanceName.trim(),
        status: connectionType === 'official' ? 'open' : 'connecting', // Official is 'open' directly as we have tokens
        type: 'whatsapp',
        channel_type: connectionType,
        user_id: user.id,
        sector: 'Comercial'
      }).select('id').single();

      if (dbError) throw dbError;
      instanceId = insertedInstance.id;

      // 4. Save Official Credentials (if applicable)
      if (connectionType === 'official') {
        const { error: metaError } = await supabase.from('whatsapp_official_resources').insert({
          instance_id: instanceId,
          phone_number_id: metaPhoneId.trim(),
          business_account_id: metaBusinessId.trim(),
          access_token: metaToken.trim(),
          verify_token: `verify_${Math.random().toString(36).substring(7)}` // Auto-generate verify token
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
      setConnectionType('evolution');
      fetchInstances();
    } catch (error: any) {
      console.error('Creation Error:', error);
      showToast(error.message || 'Erro ao criar instância', 'error');
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
    try {
      setProcessing(instanceName);
      showToast('Desconectando...', 'info');

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
        .then(() => console.log('Evolution API logout completed'))
        .catch((err) => console.warn('Evolution API logout failed:', err));

      showToast('Desconectado com sucesso!', 'success');
    } catch (error: any) {
      console.error('Logout error:', error);
      showToast('Erro ao desconectar', 'error');
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gerenciamento</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Controle suas instâncias do WhatsApp</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSyncInstances}
            disabled={processing === 'SYNCING'}
            className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl font-bold flex items-center gap-3 border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-50 active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 ${processing === 'SYNCING' ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <button
            onClick={() => {
              if (isLimitReached('instances')) {
                showToast(`Limite do plano atingido (${limits?.max_instances} instâncias). Faça upgrade para adicionar mais.`, 'error');
              } else {
                setShowModal(true);
              }
            }}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 ${isLimitReached('instances') ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-light text-white'}`}
          >
            <Plus className="w-5 h-5" />
            Nova Instância
          </button>
        </div>
      </div>

      {/* List Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : instances.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem]">
          <Smartphone className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma instância encontrada.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 overflow-hidden shadow-sm">
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
                    <tr key={instance.id || instance.instanceId} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
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
                                title="Copiar nome da instância"
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
                                Desconectar
                              </button>
                            )
                          )}
                          <button
                            onClick={() => handleDeleteInstance(instance.name)}
                            disabled={isProcessing}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                            title="Deletar"
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
      )}

      {/* API Tokens Section */}
      <div className="mt-12 mb-20">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Tokens de API
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Gerencie chaves para integração com sistemas externos.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nome da Chave (ex: CRM)"
                className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
              />
              <button
                onClick={handleGenerateApiKey}
                disabled={!newKeyName || processing === 'GENERATING_KEY'}
                className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {processing === 'GENERATING_KEY' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Gerar Token
              </button>
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Nova Instância</h2>
            <p className="text-slate-500 mb-8">Configure sua nova conexão do WhatsApp.</p>

            <form onSubmit={handleCreateInstance} className="space-y-6">

              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div
                  onClick={() => setConnectionType('evolution')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${connectionType === 'evolution' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <QrCode className={`w-5 h-5 ${connectionType === 'evolution' ? 'text-primary' : 'text-slate-400'}`} />
                    <span className={`font-bold ${connectionType === 'evolution' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>QR Code</span>
                  </div>
                  <p className="text-xs text-slate-500">Conecte seu WhatsApp existente escaneando um código.</p>
                </div>

                <div
                  onClick={() => setConnectionType('official')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${connectionType === 'official' ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">M</div>
                    <span className={`font-bold ${connectionType === 'official' ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>API Oficial</span>
                  </div>
                  <p className="text-xs text-slate-500">Use a API Cloud da Meta para alta performance e estabilidade.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Instância</label>
                <input
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder="Ex: Vendas 01"
                  className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
                  autoFocus
                />
              </div>

              {connectionType === 'official' && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-black text-slate-700 dark:text-white">Credenciais da Meta (Facebook)</h3>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number ID</label>
                    <input
                      value={metaPhoneId}
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      placeholder="Ex: 1059..."
                      className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Business Account ID</label>
                    <input
                      value={metaBusinessId}
                      onChange={(e) => setMetaBusinessId(e.target.value)}
                      placeholder="Ex: 1023..."
                      className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Access Token</label>
                    <div className="relative">
                      <input
                        value={metaToken}
                        onChange={(e) => setMetaToken(e.target.value)}
                        placeholder="Ex: EAAG..."
                        type="password"
                        className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
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
                  {processing === 'CREATING' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeData && (
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
      )}

    </div>
  );
};

export default InstancesView;
