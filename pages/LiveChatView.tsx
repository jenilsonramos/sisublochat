import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/ToastProvider';
import ConfirmationModal from '../components/ConfirmationModal';
import { evolutionApi, EvolutionInstance } from '../lib/evolution';
import { supabase } from '../lib/supabase';
import { Loader2, Send, Search, Info, X, Smartphone, MessageCircle, Volume2, VolumeX, Settings, Paperclip, ImageIcon, FileText, Mic, Square, Trash2, ChevronLeft, ChevronRight, Smile, AlertCircle, Reply, Video, Download, UserCog, CheckCircle2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

// Types updated to match Supabase Schema
interface Conversation {
  id: string; // UUID
  remote_jid: string;
  contact_name: string;
  contact_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: 'pending' | 'resolved' | 'analyzing';
  is_blocked?: boolean;
  instance_id: string; // Added to fix instance mixing
  assigned_agent_id?: string; // Added to track human assignment
}

interface ChatMessage {
  id: string; // UUID
  conversation_id: string;
  text: string;
  sender: 'me' | 'contact';
  timestamp: string;
  status: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'document';
  wamid?: string;
  quoted_id?: string;
}


interface LiveChatViewProps {
  isBlocked?: boolean;
}

interface LiveChatViewProps {
  isBlocked?: boolean;
}

const LiveChatView: React.FC<LiveChatViewProps> = ({ isBlocked = false }) => {
  const { showToast } = useToast();

  // State
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [activeInstance, setActiveInstance] = useState<EvolutionInstance | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Conversation['status']>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<ChatMessage | null>(null);
  const [isMsgDeleteModalOpen, setIsMsgDeleteModalOpen] = useState(false);
  const [isDeletingMsg, setIsDeletingMsg] = useState(false);

  // Audio Settings
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('chatSoundEnabled') !== 'false');
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('chatVolume') || '0.5'));

  const soundEnabledRef = useRef(soundEnabled);
  const volumeRef = useRef(volume);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist Audio Settings & Update Refs
  useEffect(() => {
    localStorage.setItem('chatSoundEnabled', soundEnabled.toString());
    localStorage.setItem('chatVolume', volume.toString());
    soundEnabledRef.current = soundEnabled;
    volumeRef.current = volume;
  }, [soundEnabled, volume]);

  const playNotificationSound = () => {
    if (!soundEnabledRef.current) return;
    const audio = new Audio('/notification.mp3');
    audio.volume = volumeRef.current;
    audio.play().catch(e => console.log('Audio play failed', e));
  };

  // 1. Initial Load & Subscriptions
  useEffect(() => {
    fetchInstances();
    fetchConversations();

    // Subscribe to conversation changes
    const conversationsSubscription = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
        const updatedConv = payload.new as Conversation;

        // Update the conversations list
        setConversations(prev => prev.map(c =>
          c.id === updatedConv.id ? { ...c, ...updatedConv } : c
        ));

        // Update selectedChat in real-time if it's the one that changed
        if (selectedChatRef.current?.id === updatedConv.id) {
          setSelectedChat(prev => {
            if (!prev) return null;
            // Ensure we handle cleared fields (like assigned_agent_id becoming null)
            return { ...prev, ...updatedConv };
          });
        }

        // If it's a new conversation or we need a full refresh, we can still fetch
        if (payload.eventType === 'INSERT') {
          fetchConversations(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsSubscription);
    };
  }, []);

  const fetchInstances = async () => {
    try {
      // Fetch from Supabase instead of Evolution API to get the ID mapping
      const { data: dbInstances, error } = await supabase
        .from('instances')
        .select('*');

      if (error) throw error;

      // Also fetch from Evolution API to get real-time connection status
      const evoData = await evolutionApi.fetchInstances();
      const validEvoInstances = Array.isArray(evoData) ? evoData : [];

      const enrichedInstances = (dbInstances || []).map(dbInst => {
        const evoInst = validEvoInstances.find(ei => ((ei as any).instance?.instanceName || ei.name) === dbInst.name);
        return {
          ...dbInst,
          connectionStatus: evoInst?.connectionStatus || (evoInst as any)?.status || (dbInst.status === 'open' ? 'open' : 'close')
        };
      });

      setInstances(enrichedInstances);

      // Restore: Select first connected instance as active by default to avoid "Connecting..." hang
      const firstConnected = enrichedInstances.find(i => i.connectionStatus === 'open' || i.status === 'open');
      if (firstConnected) setActiveInstance(firstConnected);
    } catch (error) {
      console.error('Instances Error:', error);
    }
  };

  const selectedChatRef = useRef<Conversation | null>(null);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoadingChats(true);

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_time', { ascending: false });

      if (error) throw error;

      if (data) {
        data.forEach((c: Conversation) => {
          if (c.id === selectedChatRef.current?.id) {
            if (c.unread_count > 0) markChatAsRead(c.id);
            c.unread_count = 0;
          }
        });
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Chats Error:', error);
    } finally {
      if (!silent) setLoadingChats(false);
    }
  };

  // 2. Select Chat & Subscriptions
  useEffect(() => {
    if (!selectedChat) return;

    setLoadingMessages(true);
    setMessages([]);
    fetchMessages(selectedChat.id);
    markChatAsRead(selectedChat.id);

    // Sync activeInstance with selectedChat's instance_id
    const chatInst = instances.find(i => i.id === selectedChat.instance_id);
    if (chatInst) setActiveInstance(chatInst);

    // Subscribe to message changes for this conversation
    const messagesSubscription = supabase
      .channel(`public:messages:conv_${selectedChat.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedChat.id}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;

            if (newMessage.sender !== 'me') {
              playNotificationSound();
            }
            return [...prev, newMessage];
          });
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedChat.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [selectedChat?.id]);

  const handleDeleteMessage = async () => {
    if (!msgToDelete) return;
    setIsDeletingMsg(true);
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msgToDelete.id);

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== msgToDelete.id));
      showToast('Mensagem excluída com sucesso', 'success');
    } catch (error: any) {
      console.error('Delete Message Error:', error);
      showToast('Erro ao excluir mensagem', 'error');
    } finally {
      setIsDeletingMsg(false);
      setIsMsgDeleteModalOpen(false);
      setMsgToDelete(null);
    }
  };

  const markChatAsRead = async (conversationId: string) => {
    try {
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ));

      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const updateConversationStatus = async (conversationId: string, newStatus: Conversation['status']) => {
    try {
      // Optimistic Update
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, status: newStatus } : c
      ));
      if (selectedChat?.id === conversationId) {
        setSelectedChat(prev => prev ? { ...prev, status: newStatus } : null);
      }

      const { error } = await supabase
        .from('conversations')
        .update({ status: newStatus })
        .eq('id', conversationId);

      if (error) throw error;
      showToast(`Status atualizado para ${newStatus}`, 'success');
    } catch (error: any) {
      console.error('Failed to update status', error);
      showToast('Erro ao atualizar status', 'error');
    }
  };

  const toggleBlockStatus = async () => {
    if (!selectedChat || !activeInstance) return;

    const newBlockedState = !selectedChat.is_blocked;
    const action = newBlockedState ? 'block' : 'unblock';

    try {
      // Optimistic Update
      setSelectedChat(prev => prev ? { ...prev, is_blocked: newBlockedState } : null);
      setConversations(prev => prev.map(c =>
        c.id === selectedChat.id ? { ...c, is_blocked: newBlockedState } : c
      ));

      // 1. Update Evolution API
      await evolutionApi.updateBlockStatus(activeInstance.name, selectedChat.remote_jid, action);

      // 2. Update Supabase
      const { error } = await supabase
        .from('conversations')
        .update({ is_blocked: newBlockedState })
        .eq('id', selectedChat.id);

      if (error) throw error;
      showToast(newBlockedState ? 'Contato bloqueado' : 'Contato desbloqueado', 'success');
    } catch (error: any) {
      console.error('Failed to update block status', error);
      showToast('Erro ao atualizar status de bloqueio', 'error');
      // Revert optimistic update
      setSelectedChat(prev => prev ? { ...prev, is_blocked: !newBlockedState } : null);
      setConversations(prev => prev.map(c =>
        c.id === selectedChat.id ? { ...c, is_blocked: !newBlockedState } : c
      ));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (convId: string, silent = false) => {
    try {
      if (!silent) setLoadingMessages(true);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const fetchedMessages = data || [];
      setMessages(fetchedMessages);

      // Auto-load media for messages that need it (WhatsApp URLs)
      if (activeInstance) {
        for (const msg of fetchedMessages) {
          if (msg.media_type && msg.wamid && msg.media_url &&
            (msg.media_url.includes('whatsapp.net') || msg.media_url.includes('.enc'))) {
            // Load media in background
            autoLoadMedia(msg);
          }
        }
      }
    } catch (error) {
      console.error('Messages Error:', error);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Auto-load media without user interaction
  const autoLoadMedia = async (msg: ChatMessage) => {
    if (!msg.wamid || !activeInstance) return;
    try {
      const response = await evolutionApi.getBase64FromMediaMessage(activeInstance.name, msg.wamid);
      const base64 = response?.base64 || response?.data?.base64;
      const mimetype = response?.mimetype || response?.data?.mimetype || 'image/jpeg';

      if (base64) {
        const dataUri = `data:${mimetype};base64,${base64}`;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, media_url: dataUri } : m));
      }
    } catch (error) {
      console.error('Auto-load media failed for:', msg.id);
    }
  };

  const handleSendMediaFile = async (file: File, isVoiceNote: boolean = false) => {
    console.log('--- handleSendMediaFile Start ---');
    console.log('File Name:', file.name, 'Size:', file.size, 'Type:', file.type);

    if (!selectedChat) {
      console.warn('handleSendMediaFile: No selectedChat');
      showToast('Selecione uma conversa primeiro.', 'error');
      return;
    }
    if (!activeInstance) {
      console.warn('handleSendMediaFile: No activeInstance');
      showToast('Nenhuma instância conectada.', 'error');
      return;
    }

    if (isBlocked) {
      showToast('Sua conta está suspensa. Você não pode enviar mídias.', 'error');
      return;
    }

    try {
      setIsUploading(true);
      showToast('Enviando arquivo...', 'success');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${selectedChat.id}/${fileName}`;

      console.log('Uploading to Supabase Storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Supabase Storage Error:', uploadError);
        showToast(`Erro no upload: ${uploadError.message}`, 'error');
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', publicUrl);

      let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      const tempMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: selectedChat.id,
        text: file.name,
        sender: 'me',
        timestamp: new Date().toISOString(),
        status: 'sending',
        media_url: publicUrl,
        media_type: mediaType
      };
      setMessages(prev => [...prev, tempMsg]);

      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === selectedChat.id
            ? { ...c, last_message: `[${mediaType === 'image' ? 'Imagem' : (mediaType === 'audio' ? 'Áudio' : (mediaType === 'video' ? 'Vídeo' : 'Arquivo'))}]`, last_message_time: tempMsg.timestamp }
            : c
        );
        return updated.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
      });

      const quoted = replyingTo && replyingTo.wamid ? {
        key: {
          id: replyingTo.wamid,
          fromMe: replyingTo.sender === 'me',
          remoteJid: selectedChat.remote_jid
        },
        message: {
          conversation: replyingTo.text || "[Mídia]"
        }
      } : undefined;

      // Find the correct instance for this specific chat
      const chatInstance = instances.find(i => i.id === selectedChat.instance_id);
      if (!chatInstance) {
        showToast('Erro: Instância para esta conversa não encontrada.', 'error');
        return;
      }

      console.log('Sending to Evolution API...', { instance: chatInstance.name, to: selectedChat.remote_jid, mediaType, isVoiceNote, quoted });
      await evolutionApi.sendMediaMessage(chatInstance.name, selectedChat.remote_jid, publicUrl, mediaType, file.name, file.name, isVoiceNote, quoted)
        .then(res => {
          console.log('Evolution API Response Success:', res);
          showToast('Enviado para o WhatsApp!', 'success');
        })
        .catch(err => {
          console.error('Evolution API Error:', err);
          showToast(`Erro ao enviar para o WhatsApp: ${err.message || 'Erro de conexão'}`, 'error');
        });

      console.log('Inserting message into Supabase...');
      const { data: savedMsg, error: dbError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedChat.id,
          text: file.name,
          sender: 'me',
          status: 'sent',
          media_url: publicUrl,
          media_type: mediaType
        })
        .select()
        .single();

      if (dbError) throw dbError;

      if (savedMsg) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? savedMsg : m));
        setReplyingTo(null);
      }

    } catch (error: any) {
      console.error('handleSendMediaFile Fatal Error:', error);
      showToast(`Erro fatal no envio: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsUploading(false);
      console.log('--- handleSendMediaFile End ---');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSendMediaFile(file);
  };

  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // WhatsApp prefers audio/ogg;codecs=opus.
      // We prioritize ogg, then fall back to webm (which we will label as ogg if it uses opus).
      const mimeTypes = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      console.log('Final MimeType chosen for recorder:', supportedType);

      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk received:', event.data.size);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped. Processing chunks...', audioChunksRef.current.length);
        if (audioChunksRef.current.length === 0) {
          console.warn('No audio chunks recorded.');
          showToast('Nenhum áudio foi capturado.', 'error');
          return;
        }

        const actualType = mediaRecorder.mimeType || 'audio/ogg';
        const extension = 'ogg';

        // Even if the browser uses webm, if it uses opus, WhatsApp often accepts it if sent with .ogg extension and correct mimetype
        const blobType = actualType.includes('opus') ? 'audio/ogg; codecs=opus' : actualType;

        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const file = new File([audioBlob], `voice_${Date.now()}.${extension}`, { type: blobType });

        console.log('Generated voice note for upload:', file.name, file.size, file.type);
        await handleSendMediaFile(file, true);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      showToast('Gravando...', 'success');
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      showToast('Erro ao acessar microfone: ' + (error.message || ''), 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      showToast('Sua conta está suspensa. Você não pode enviar mensagens.', 'error');
      return;
    }

    if (!newMessage.trim() || !selectedChat || !activeInstance) return;

    try {
      setSending(true);

      const tempId = crypto.randomUUID();
      const optimisticMsg: ChatMessage = {
        id: tempId,
        conversation_id: selectedChat.id,
        text: newMessage,
        sender: 'me',
        timestamp: new Date().toISOString(),
        status: 'sending'
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setNewMessage('');

      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === selectedChat.id
            ? { ...c, last_message: optimisticMsg.text, last_message_time: optimisticMsg.timestamp }
            : c
        );
        return updated.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
      });

      const quoted = replyingTo && replyingTo.wamid ? {
        key: {
          id: replyingTo.wamid,
          fromMe: replyingTo.sender === 'me',
          remoteJid: selectedChat.remote_jid
        },
        message: {
          conversation: replyingTo.text || "[Mídia]"
        }
      } : undefined;

      // Find the correct instance for this specific chat
      const chatInstance = instances.find(i => i.id === selectedChat.instance_id);
      if (!chatInstance) {
        showToast('Erro: Instância vinculada a esta conversa não encontrada.', 'error');
        return;
      }

      await evolutionApi.sendTextMessage(chatInstance.name, selectedChat.remote_jid, optimisticMsg.text, quoted);

      const { data: savedMsg, error: dbError } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedChat.id,
          text: optimisticMsg.text,
          sender: 'me',
          status: 'sent'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      if (savedMsg) {
        setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
        setReplyingTo(null);
      }

    } catch (error: any) {
      showToast('Erro ao enviar mensagem', 'error');
      console.error(error);
      setMessages(prev => prev.filter(m => m.status !== 'sending'));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteClick = () => {
    if (selectedChat) setIsDeleteModalOpen(true);
  };

  const confirmDeleteConversation = async () => {
    if (!selectedChat) return;

    try {
      setIsDeleting(true);
      showToast('Apagando conversa...', 'success');
      console.log('Deleting conversation ID:', selectedChat.id);

      // 1. Delete conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', selectedChat.id);

      if (error) throw error;

      // 2. Update local state
      const deletedId = selectedChat.id;
      setConversations(prev => prev.filter(c => c.id !== deletedId));
      setSelectedChat(null);
      setMessages([]);
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      console.error('Delete Fatal Error:', error);
      showToast('Erro fatal: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadMedia = async (msg: ChatMessage) => {
    if (!msg.wamid || !activeInstance) {
      showToast('Não é possível carregar mídia sem ID da mensagem', 'error');
      return;
    }
    try {
      showToast('Baixando mídia...', 'info');
      const response = await evolutionApi.getBase64FromMediaMessage(activeInstance.name, msg.wamid);
      console.log('Media response:', response);

      // Handle different response structures
      const base64 = response?.base64 || response?.data?.base64 || response?.message?.base64;
      const mimetype = response?.mimetype || response?.data?.mimetype || 'image/jpeg';

      if (base64) {
        const dataUri = `data:${mimetype};base64,${base64}`;
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, media_url: dataUri } : m));
        showToast('Mídia carregada!', 'success');
      } else {
        console.error('No base64 found in response:', response);
        showToast('Não foi possível baixar a mídia.', 'error');
      }
    } catch (error) {
      console.error('Error loading media:', error);
      showToast('Erro ao carregar mídia.', 'error');
    }
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden min-h-0 relative">

      {/* Sidebar - Contacts List using Supabase Data */}
      <div className={`border-r border-slate-50 dark:border-slate-700/50 flex flex-col min-h-0 shrink-0 transition-all duration-300 relative ${sidebarCollapsed ? 'w-20 lg:w-24' : 'w-full md:w-80 lg:w-96'} ${selectedChat ? 'hidden md:flex' : 'flex'}`}>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-4 top-10 z-50 hidden md:flex w-8 h-8 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full items-center justify-center shadow-md text-slate-400 hover:text-primary transition-all active:scale-95"
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        <div className={`p-6 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/10 dark:bg-slate-900/10 shrink-0 ${sidebarCollapsed ? 'flex flex-col items-center px-2' : ''}`}>
          <div className={`flex items-center justify-between mb-6 ${sidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            {!sidebarCollapsed && <h2 className="text-xl font-black dark:text-white">Conversas</h2>}
            {activeInstance && (
              <div className={`px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1 ${sidebarCollapsed ? 'p-1' : ''}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {!sidebarCollapsed && 'Online'}
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="space-y-4">
              <div className="relative animate-in fade-in duration-300">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-light text-sm dark:text-white transition-all outline-none"
                />
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                {[
                  { id: 'all', label: 'Todos', color: 'bg-slate-500' },
                  { id: 'pending', label: 'Pendentes', color: 'bg-slate-400' },
                  { id: 'analyzing', label: 'Em Análise', color: 'bg-amber-500' },
                  { id: 'resolved', label: 'Resolvidos', color: 'bg-emerald-500' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${statusFilter === f.id
                      ? `${f.color} text-white shadow-lg shadow-black/10`
                      : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 hover:text-slate-500 border border-slate-100 dark:border-slate-700/50'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {loadingChats ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs">Sincronizando...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-bold">Nenhuma conversa ainda</p>
              <p className="text-xs mt-1">Envie uma mensagem pelo WhatsApp para começar.</p>
            </div>
          ) : (
            conversations
              .filter(conv => {
                const matchesSearch = conv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  conv.remote_jid.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
                return matchesSearch && matchesStatus;
              })
              .map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedChat(conv)}
                  title={sidebarCollapsed ? conv.contact_name : undefined}
                  className={`w-full p-4 flex items-center gap-4 border-b border-slate-50 dark:border-slate-700/30 transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 group ${selectedChat?.id === conv.id ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'} ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={conv.contact_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.contact_name)}&background=random`}
                      alt={conv.contact_name}
                      className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform ${conv.assigned_agent_id ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`}
                    />
                    {conv.assigned_agent_id && (
                      <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-800 animate-pulse">
                        <UserCog size={8} />
                      </span>
                    )}
                    {sidebarCollapsed && conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 animate-in zoom-in">{conv.unread_count}</span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 text-left min-w-0 animate-in slide-in-from-left-2 duration-300">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 truncate">
                          <h4 className="text-sm font-black dark:text-white truncate">{conv.contact_name}</h4>
                          {instances.find(i => i.id === conv.instance_id) && (
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-[8px] font-black text-slate-500 rounded uppercase tracking-tighter shrink-0">
                              {instances.find(i => i.id === conv.instance_id)?.name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-widest">
                          {conv.last_message_time ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2 w-32">{conv.last_message}</p>
                        {conv.unread_count > 0 && conv.id !== selectedChat?.id && (
                          <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              ))
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className={`flex-1 flex flex-col min-w-0 bg-slate-50/5 dark:bg-slate-900/5 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 md:p-6 bg-white dark:bg-slate-800 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between shadow-sm z-30 shrink-0">
              <div className="flex items-center gap-4 overflow-hidden">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-icons-round">arrow_back</span>
                </button>
                <div className="relative flex-shrink-0">
                  <img
                    src={selectedChat.contact_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.contact_name)}`}
                    alt={selectedChat.contact_name}
                    className="w-10 h-10 md:w-11 md:h-11 rounded-2xl object-cover"
                  />
                </div>
                <div className="truncate">
                  <h3 className="text-sm md:text-base font-black dark:text-white truncate">{selectedChat.contact_name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{selectedChat.remote_jid}</p>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${selectedChat.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' :
                      selectedChat.status === 'analyzing' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                      {selectedChat.status === 'resolved' ? 'Resolvido' : selectedChat.status === 'analyzing' ? 'Em Análise' : 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 relative">
                {/* Status Selector */}
                <div className="hidden lg:flex items-center bg-slate-50 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-100 dark:border-slate-700/50 mr-2">
                  <button
                    onClick={() => updateConversationStatus(selectedChat.id, 'pending')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedChat.status === 'pending' ? 'bg-white dark:bg-slate-800 text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                  >
                    Pendente
                  </button>
                  <button
                    onClick={() => updateConversationStatus(selectedChat.id, 'analyzing')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedChat.status === 'analyzing' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-amber-500'}`}
                  >
                    Em Análise
                  </button>
                  <button
                    onClick={() => updateConversationStatus(selectedChat.id, 'resolved')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedChat.status === 'resolved' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-emerald-500'}`}
                  >
                    Resolvido
                  </button>
                </div>

                {/* Mobile/Compact Status Selector */}
                <select
                  value={selectedChat.status || 'pending'}
                  onChange={(e) => updateConversationStatus(selectedChat.id, e.target.value as any)}
                  className="lg:hidden bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 text-[10px] font-black uppercase rounded-xl px-2 py-1.5 outline-none mr-1"
                >
                  <option value="pending">Pendente</option>
                  <option value="analyzing">Em Análise</option>
                  <option value="resolved">Resolvido</option>
                </select>
                <button
                  onClick={handleDeleteClick}
                  className="p-2 md:p-3 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                  title="Apagar conversa"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 md:p-3 rounded-2xl transition-all ${showSettings ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showSettings && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 z-[60] animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-sm dark:text-white">Notificações</h4>
                      <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-10 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Volume</span>
                        <span>{Math.round(volume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setSoundEnabled(true) || setVolume(parseFloat(e.target.value))} // Auto-enable on volume change
                        className="w-full accent-primary h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBlockStatus();
                        }}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${selectedChat.is_blocked
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                          }`}
                      >
                        <AlertCircle size={14} />
                        {selectedChat.is_blocked ? 'Desbloquear Contato' : 'Bloquear Contato'}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`p-2 md:p-3 rounded-2xl transition-all ${showDetails ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden relative min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
              {/* Premium Background Elements */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-400/10 blur-[100px] rounded-full animate-bounce [animation-duration:10s]" />
                <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-rose-400/5 blur-[120px] rounded-full animate-pulse [animation-duration:8s]" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/40 dark:from-transparent dark:to-transparent" />
              </div>
              {/* Human Assistance Alert Banner */}
              {selectedChat.assigned_agent_id && (
                <div className="z-30 w-full p-4 bg-orange-500/10 backdrop-blur-xl border-b border-orange-500/20 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500 shadow-sm">
                  <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
                    <div className="w-10 h-10 bg-orange-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner animate-pulse border border-orange-500/20">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-wider">Modo Humano Ativo</p>
                      <p className="text-[10px] font-bold opacity-80 uppercase tracking-tight">O bot está em silêncio agora</p>
                    </div>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const { error } = await supabase
                          .from('conversations')
                          .update({
                            assigned_agent_id: null,
                            assigned_at: null
                          })
                          .eq('id', selectedChat.id);

                        if (error) throw error;

                        // Optimistic update for immediate feedback
                        setSelectedChat(prev => prev ? { ...prev, assigned_agent_id: undefined } : null);
                        setConversations(prev => prev.map(c =>
                          c.id === selectedChat.id ? { ...c, assigned_agent_id: undefined } : c
                        ));

                        showToast('Conversa liberada para automação', 'success');
                      } catch (err) {
                        showToast('Erro ao liberar conversa', 'error');
                      }
                    }}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Liberar para o Bot
                  </button>
                </div>
              )}

              <div className="flex-1 relative min-h-0">
                {/* WhatsApp Doodle Background - Now as a subtle overlay layer */}
                <div
                  className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.02] pointer-events-none"
                  style={{
                    backgroundImage: 'url(/doodle-light.png)',
                    backgroundRepeat: 'repeat',
                    backgroundSize: '450px',
                    mixBlendMode: 'soft-light'
                  }}
                />

                <div className="absolute inset-0 z-10 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6 scroll-smooth">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                    </div>
                  ) : (

                    messages.map((msg, index) => {
                      const currentDate = new Date(msg.timestamp);
                      const prevDate = index > 0 ? new Date(messages[index - 1].timestamp) : null;

                      let showDateSeparator = false;
                      let dateLabel = '';

                      if (!prevDate || currentDate.toDateString() !== prevDate.toDateString()) {
                        showDateSeparator = true;
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(today.getDate() - 1);

                        if (currentDate.toDateString() === today.toDateString()) {
                          dateLabel = 'Hoje';
                        } else if (currentDate.toDateString() === yesterday.toDateString()) {
                          dateLabel = 'Ontem';
                        } else {
                          dateLabel = currentDate.toLocaleDateString('pt-BR');
                        }
                      }

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-8 opacity-100 animate-in fade-in zoom-in-95 duration-700">
                              <span className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm border border-white/50 dark:border-slate-700/30">
                                {dateLabel}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 group`}>
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-md relative transition-all ${msg.sender === 'me'
                              ? 'bg-primary text-white rounded-tr-none shadow-primary/10'
                              : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-800 dark:text-slate-200 rounded-tl-none border border-white dark:border-slate-700/50 shadow-slate-200/50 dark:shadow-none'
                              }`}>

                              {/* Individual Actions */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingTo(msg);
                                }}
                                className={`absolute -top-6 ${msg.sender === 'me' ? '-left-8' : '-right-8'} p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all hover:text-primary z-20`}
                                title="Responder"
                              >
                                <Reply size={12} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMsgToDelete(msg);
                                  setIsMsgDeleteModalOpen(true);
                                }}
                                className={`absolute -top-2 ${msg.sender === 'me' ? '-left-8' : '-right-8'} p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all hover:text-rose-500 z-20`}
                                title="Excluir mensagem"
                              >
                                <Trash2 size={12} />
                              </button>

                              {/* Render Quote/Reply if present */}
                              {msg.quoted_id && (
                                <div className={`mb-2 p-2 rounded-xl border-l-4 ${msg.sender === 'me' ? 'bg-white/10 border-white/30' : 'bg-slate-50 dark:bg-slate-900 border-primary'} text-[11px] opacity-90`}>
                                  {(() => {
                                    const quotedMsg = messages.find(m => m.id === msg.quoted_id);
                                    if (!quotedMsg) return <span className="italic">Mensagem respondida</span>;
                                    return (
                                      <>
                                        <p className={`font-black uppercase tracking-widest text-[9px] mb-0.5 ${msg.sender === 'me' ? 'text-white' : 'text-primary'}`}>
                                          {quotedMsg.sender === 'me' ? 'Você' : selectedChat?.contact_name}
                                        </p>
                                        <p className="truncate line-clamp-2 italic">
                                          {quotedMsg.media_type ? `[${quotedMsg.media_type === 'image' ? 'Imagem' : (quotedMsg.media_type === 'audio' ? 'Áudio' : (quotedMsg.media_type === 'video' ? 'Vídeo' : 'Arquivo'))}] ` : ''}
                                          {quotedMsg.text || ''}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Media Rendering - only for accessible URLs (data URIs or Supabase storage) */}
                              {msg.media_url && !msg.media_url.includes('whatsapp.net') && !msg.media_url.includes('.enc') && (
                                <div className="mb-2 rounded-lg overflow-hidden relative group" style={{ maxWidth: '280px' }}>
                                  {msg.media_type === 'image' && (
                                    <img
                                      src={msg.media_url}
                                      alt="Media"
                                      className="w-full h-auto rounded-lg bg-slate-100 dark:bg-slate-700 object-contain"
                                      style={{ maxHeight: '300px' }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const btn = document.getElementById(`load-btn-${msg.id}`);
                                        if (btn) btn.style.display = 'flex';
                                      }}
                                    />
                                  )}
                                  {msg.media_type === 'video' && (
                                    <video src={msg.media_url} controls className="w-full h-auto rounded-lg" style={{ maxHeight: '300px' }} />
                                  )}
                                  {msg.media_type === 'audio' && (
                                    <audio src={msg.media_url} controls className="w-full max-w-[250px]" />
                                  )}
                                  {msg.media_type === 'document' && (
                                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                      <FileText size={20} />
                                      <span className="text-xs truncate max-w-[150px] underline">Baixar Arquivo</span>
                                    </a>
                                  )}

                                  {/* Fallback Load Button (Hidden by default, shown on error or if URL suggests it needs fetching) */}
                                  <div
                                    id={`load-btn-${msg.id}`}
                                    className={`absolute inset-0 bg-black/40 flex items-center justify-center ${msg.media_url?.includes('whatsapp.net') && msg.sender !== 'me' ? 'flex' : 'hidden'}`}
                                  >
                                    {msg.wamid && (
                                      <button
                                        type="button"
                                        onClick={() => loadMedia(msg)}
                                        className="bg-white/90 text-slate-800 text-xs font-bold px-3 py-2 rounded-full shadow-lg hover:bg-white transition flex items-center gap-2"
                                      >
                                        <Loader2 size={14} className="hover:animate-spin" />
                                        Carregar Mídia
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Show load button when media_type exists but no media_url */}
                              {/* Show load button when media needs to be fetched */}
                              {msg.media_type && msg.wamid && (!msg.media_url || msg.media_url?.includes('whatsapp.net') || msg.media_url?.includes('.enc')) && (
                                <div className="mb-2 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700/50 p-4 flex flex-col items-center justify-center min-w-[180px]">
                                  <div className="text-slate-400 mb-2">
                                    {msg.media_type === 'image' && <ImageIcon size={32} />}
                                    {msg.media_type === 'video' && <Video size={32} />}
                                    {msg.media_type === 'audio' && <Mic size={32} />}
                                    {msg.media_type === 'document' && <FileText size={32} />}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 capitalize">
                                    {msg.media_type === 'image' ? 'Imagem' : msg.media_type === 'video' ? 'Vídeo' : msg.media_type === 'audio' ? 'Áudio' : 'Documento'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => loadMedia(msg)}
                                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-primary-light transition flex items-center gap-2"
                                  >
                                    <Download size={14} />
                                    Carregar Mídia
                                  </button>
                                </div>
                              )}

                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text || (msg.media_type ? '' : '...')}</p>
                              <div className={`flex items-center gap-1.5 justify-end mt-2 opacity-60 text-[10px] font-bold uppercase`}>
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {msg.sender === 'me' && (
                                  <span className="text-[14px]">
                                    {msg.status === 'read' ? '✓✓' : (msg.status === 'sent' ? '✓' : '•')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} className="h-2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white dark:bg-slate-800 border-t border-slate-50 dark:border-slate-700/50 shrink-0">
              {selectedChat.is_blocked ? (
                <div className="flex flex-col items-center justify-center p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Este contato está bloqueado</p>
                  <button
                    onClick={toggleBlockStatus}
                    className="mt-2 text-xs font-black uppercase text-rose-700 dark:text-rose-300 hover:underline"
                  >
                    Desbloquear para enviar mensagens
                  </button>
                </div>
              ) : (
                <>
                  {replyingTo && (
                    <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border-l-4 border-primary flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                          Respondendo a {replyingTo.sender === 'me' ? 'você' : selectedChat?.contact_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate italic">
                          {replyingTo.media_type ? `[${replyingTo.media_type === 'image' ? 'Imagem' : (replyingTo.media_type === 'audio' ? 'Áudio' : (replyingTo.media_type === 'video' ? 'Vídeo' : 'Arquivo'))}] ${replyingTo.text || ''}` : replyingTo.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all hover:text-rose-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {isBlocked ? (
                    <div className="w-full bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800 rounded-xl p-4 flex items-center justify-center gap-3 text-rose-500">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-bold text-sm">Envio de mensagens bloqueado.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 md:gap-4">
                      <div className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-30">
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-2 text-slate-400 hover:text-primary transition"
                          >
                            <Smile size={20} />
                          </button>
                          {showEmojiPicker && (
                            <div ref={emojiPickerRef} className="absolute bottom-full mb-4 left-0 animate-in zoom-in-95 duration-200">
                              <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                  setNewMessage(prev => prev + emojiData.emoji);
                                }}
                                theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                                width={320}
                                height={400}
                              />
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Sua mensagem..."
                          disabled={sending}
                          className="w-full pl-12 pr-12 py-3 md:py-4 bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] focus:ring-2 focus:ring-primary-light text-sm dark:text-white transition-all outline-none disabled:opacity-50"
                        />
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading || isRecording}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary transition disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                        </button>
                      </div>

                      {/* Audio Recording Button */}
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-3 md:p-4 rounded-xl transition-all flex items-center justify-center ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-primary'}`}
                      >
                        {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                      </button>

                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className={`p-3 md:p-4 rounded-2xl transition-all active:scale-90 flex items-center justify-center ${newMessage.trim() && !sending
                          ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary-light'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                      >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/30 dark:bg-slate-900/10 min-h-0">
            <div className="w-24 h-24 md:w-28 md:h-28 bg-white dark:bg-slate-800 rounded-[3rem] shadow-sm flex items-center justify-center mb-8">
              <Smartphone className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl md:text-2xl font-black dark:text-white">Comece a Conversar</h3>
            <p className="text-slate-400 text-sm mt-3 max-w-xs leading-relaxed">Selecione uma conversa para enviar uma mensagem.</p>
            {activeInstance ? (
              <p className="mt-8 text-xs font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-full">
                Instância: {activeInstance.name}
              </p>
            ) : (
              <p className="mt-8 text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-4 py-2 rounded-full flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Conectando...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Details */}
      {selectedChat && showDetails && (
        <div className="absolute inset-y-0 right-0 z-20 w-80 lg:relative lg:flex lg:w-80 lg:shrink-0 lg:border-l lg:border-slate-100 lg:dark:border-slate-700/50 flex-col bg-white dark:bg-slate-800 p-8 shadow-2xl lg:shadow-none animate-in slide-in-from-right duration-300 min-h-0 overflow-hidden">
          <button
            onClick={() => setShowDetails(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center shrink-0">
            <div className="relative inline-block mb-6 mt-4 lg:mt-0">
              <img src={selectedChat.contact_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.contact_name)}`} alt={selectedChat.contact_name} className="w-28 h-28 md:w-32 md:h-32 rounded-[2.5rem] object-cover mx-auto shadow-xl border-4 border-white dark:border-slate-700" />
            </div>
            <h3 className="text-xl font-black dark:text-white truncate px-2">{selectedChat.contact_name}</h3>
            <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-100 dark:bg-slate-900 rounded-lg py-1 px-2 inline-block break-all">{selectedChat.remote_jid}</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteConversation}
        isLoading={isDeleting}
        title="Apagar Conversa?"
        message={`Tem certeza que deseja apagar a conversa com ${selectedChat?.contact_name}? Esta ação é permanente e todas as mensagens serão perdidas.`}
        confirmText="Sim, Apagar"
        cancelText="Não, Cancelar"
        type="danger"
      />

      <ConfirmationModal
        isOpen={isMsgDeleteModalOpen}
        onClose={() => setIsMsgDeleteModalOpen(false)}
        onConfirm={handleDeleteMessage}
        title="Excluir Mensagem"
        message="Deseja excluir esta mensagem permanentemente?"
        confirmText="Excluir"
        isLoading={isDeletingMsg}
        type="danger"
      />
    </div >
  );
};

export default LiveChatView;
