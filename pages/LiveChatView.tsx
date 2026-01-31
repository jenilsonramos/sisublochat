import React, { useState, useEffect, useRef } from 'react';
import { supabase, isAbortError } from '../lib/supabase';
import { evolutionApi, EvolutionInstance } from '../lib/evolution';
import { useToast } from '../components/ToastProvider';
import {
  Loader2, Send, Search, MessageCircle, MoreVertical,
  Paperclip, Mic, CheckCircle2, RefreshCw, Smartphone,
  ChevronLeft, Plus, Star, Phone, Video, Info, X, Bell, User
} from 'lucide-react';

// --- Types ---

interface Conversation {
  id: string;
  remote_jid: string;
  contact_name: string;
  contact_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: 'pending' | 'resolved' | 'analyzing';
  instance_id: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  text: string;
  sender: 'me' | 'contact';
  timestamp: string;
  status: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'document';
  wamid?: string;
}

interface LiveChatViewProps {
  isBlocked?: boolean;
}

const LiveChatView: React.FC<LiveChatViewProps> = ({ isBlocked = false }) => {
  const { showToast } = useToast();

  // --- State ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);

  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [activeInstance, setActiveInstance] = useState<EvolutionInstance | null>(null);
  const [showProfile, setShowProfile] = useState(true); // Toggle right panel

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // --- Refs ---
  const abortControllers = useRef<Record<string, AbortController>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Fetch Actions (Logic Preserved) ---

  const fetchInstances = async () => {
    const KEY = 'instances';
    if (abortControllers.current[KEY]) abortControllers.current[KEY].abort();
    const controller = new AbortController();
    abortControllers.current[KEY] = controller;

    try {
      const { data, error } = await supabase.from('instances').select('*').abortSignal(controller.signal);
      if (error) throw error;
      if (data && data.length > 0 && !activeInstance) setActiveInstance(data[0] as unknown as EvolutionInstance);
    } catch (error: any) {
      if (error.name === 'AbortError' || isAbortError(error)) return;
      console.error(error);
    } finally {
      if (abortControllers.current[KEY] === controller) delete abortControllers.current[KEY];
    }
  };

  const fetchConversations = async (isBackground = false) => {
    const KEY = 'conversations';
    if (abortControllers.current[KEY]) abortControllers.current[KEY].abort();
    const controller = new AbortController();
    abortControllers.current[KEY] = controller;

    try {
      if (!isBackground) setLoadingConversations(true);
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_time', { ascending: false })
        .limit(50)
        .abortSignal(controller.signal);

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      if (error.name === 'AbortError' || isAbortError(error)) return;
      console.error(error);
    } finally {
      if (abortControllers.current[KEY] === controller) delete abortControllers.current[KEY];
      if (!isBackground) setLoadingConversations(false);
    }
  };

  const fetchMessages = async (chatId: string, isBackground = false) => {
    const KEY = 'messages';
    if (abortControllers.current[KEY]) abortControllers.current[KEY].abort();
    const controller = new AbortController();
    abortControllers.current[KEY] = controller;

    try {
      if (!isBackground && messages.length === 0) setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', chatId)
        .order('timestamp', { ascending: true })
        .abortSignal(controller.signal);

      if (error) throw error;

      const fetched = data || [];
      setMessages(fetched);

      if (fetched.length > 0) {
        setPendingMessages(prev => prev.filter(p => !fetched.some(m => m.text === p.text && Math.abs(new Date(m.timestamp).getTime() - new Date(p.timestamp).getTime()) < 5000)));
      }

      if (!isBackground && messages.length === 0) setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      if (error.name === 'AbortError' || isAbortError(error)) return;
      console.error(error);
    } finally {
      if (abortControllers.current[KEY] === controller) delete abortControllers.current[KEY];
      if (!isBackground) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !activeInstance) return;

    const tempId = crypto.randomUUID();
    const messageContent = newMessage.trim();

    const optimistic: ChatMessage = {
      id: tempId,
      conversation_id: selectedChat.id,
      text: messageContent,
      sender: 'me',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    setPendingMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    setTimeout(scrollToBottom, 100);

    try {
      setSending(true);
      await evolutionApi.sendTextMessage(activeInstance.name, selectedChat.remote_jid, messageContent);
      setTimeout(() => fetchMessages(selectedChat.id, true), 1500);
    } catch (error) {
      console.error(error);
      showToast('Erro ao enviar', 'error');
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const displayMessages = [...messages, ...pendingMessages.filter(p => !messages.some(m => m.id === p.id))].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // --- Effects ---

  useEffect(() => {
    fetchInstances();
    fetchConversations();
    let t: NodeJS.Timeout;
    const poll = async () => { if (!document.hidden) await fetchConversations(true); t = setTimeout(poll, 10000); };
    t = setTimeout(poll, 10000);
    return () => { clearTimeout(t); Object.values(abortControllers.current).forEach((c: any) => c.abort()); };
  }, []);

  useEffect(() => {
    let t: NodeJS.Timeout;
    const poll = async () => { if (selectedChat && !document.hidden) await fetchMessages(selectedChat.id, true); t = setTimeout(poll, 3000); };
    if (selectedChat) {
      setPendingMessages([]); fetchMessages(selectedChat.id); t = setTimeout(poll, 3000);
    } else { setMessages([]); setPendingMessages([]); }
    return () => clearTimeout(t);
  }, [selectedChat?.id]);

  useEffect(() => {
    const handleVis = () => {
      if (document.hidden) {
        Object.values(abortControllers.current).forEach((c: any) => c.abort());
        abortControllers.current = {};
      } else {
        setLoadingConversations(false); setLoadingMessages(false); setSending(false);
        fetchConversations(true);
        if (selectedChat) fetchMessages(selectedChat.id, true);
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [selectedChat]);

  // --- Render (Modern Dashboard UI) ---

  return (
    <div className="flex h-screen bg-[#F4F5fa] overflow-hidden font-sans text-slate-800">

      {/* 1. Sidebar - Chat List */}
      <div className="w-[320px] bg-white flex flex-col border-r border-gray-100 shrink-0">
        {/* Title */}
        <div className="h-20 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Chat</h1>
          <button className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5" title="Nova Conversa">
            <Plus size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-2">
          <div className="flex bg-gray-50 p-1 rounded-xl">
            <button className="flex-1 py-1.5 text-sm font-medium text-slate-700 bg-white shadow-sm rounded-lg transition-all">Open</button>
            <button className="flex-1 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-600 transition-all">Archived</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-100">
          {loadingConversations && conversations.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : (
            conversations.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`
                  relative p-4 rounded-2xl cursor-pointer transition-all duration-200 group
                  ${selectedChat?.id === chat.id ? 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]' : 'hover:bg-gray-50'}
                `}
              >
                {/* Left Active Indicator */}
                {selectedChat?.id === chat.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-600 rounded-r-full" />
                )}

                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold border-2 ${selectedChat?.id === chat.id ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-gray-100 border-transparent text-gray-500'}`}>
                      {chat.contact_name ? chat.contact_name[0].toUpperCase() : 'U'}
                    </div>
                    {chat.unread_count > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className={`font-semibold text-sm truncate ${selectedChat?.id === chat.id ? 'text-indigo-900' : 'text-slate-700'}`}>{chat.contact_name || chat.remote_jid}</h4>
                      <span className="text-[11px] text-gray-400 font-medium">{new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className={`text-xs truncate leading-relaxed ${chat.unread_count > 0 ? 'text-slate-600 font-medium' : 'text-gray-400'}`}>
                      {chat.last_message || 'Nova conversa iniciada'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative shadow-[0_0_40px_-5px_rgba(0,0,0,0.03)] z-0 rounded-l-[30px] my-4 mr-4 ml-0">
        {selectedChat ? (
          <>
            {/* Header */}
            <header className="h-20 px-8 flex items-center justify-between border-b border-gray-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center text-indigo-700 font-bold border border-indigo-50 shadow-sm">
                  {(selectedChat.contact_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedChat.contact_name || selectedChat.remote_jid}</h3>
                  <span className="text-xs text-green-500 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowProfile(!showProfile)} className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                  <Info size={22} />
                </button>
                <div className="h-6 w-px bg-gray-100 mx-1" />
                <button className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <MoreVertical size={22} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-100">
              {loadingMessages && displayMessages.length === 0 ? (
                <div className="flex justify-center"><Loader2 className="animate-spin text-indigo-300" /></div>
              ) : (
                displayMessages.map((msg, idx) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'items-end justify-end' : 'items-start'} gap-3 group`}>
                      {/* Avatar for contact */}
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0 mt-2">
                          {(selectedChat.contact_name || '?')[0]}
                        </div>
                      )}

                      <div className={`
                               max-w-[70%] px-5 py-3.5 rounded-[20px] text-[15px] leading-relaxed shadow-sm relative
                               ${isMe
                          ? 'bg-[#6366f1] text-white rounded-br-sm'
                          : 'bg-white border border-gray-100 text-slate-600 rounded-bl-sm shadow-[0_2px_20px_-5px_rgba(0,0,0,0.05)]'
                        }
                            `}>
                        {msg.media_url && <div className="mb-2 text-xs opacity-80">📎 Media Anexada</div>}
                        <p>{msg.text}</p>
                      </div>

                      {/* Timestamp (Outside) */}
                      <span className="text-[10px] text-gray-300 font-medium self-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 pt-2">
              <form onSubmit={handleSendMessage} className="bg-white border border-gray-100 rounded-[20px] p-2 pr-3 flex items-center shadow-[0_5px_30px_-5px_rgba(0,0,0,0.05)] relative z-10">
                <button type="button" className="p-3 text-gray-400 hover:text-indigo-500 hover:bg-gray-50 rounded-xl transition-all">
                  <Paperclip size={20} />
                </button>
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 bg-transparent border-none outline-none text-slate-700 placeholder:text-gray-300"
                />
                <div className="flex gap-1">
                  <button type="button" className="p-3 text-gray-400 hover:text-indigo-500 hover:bg-gray-50 rounded-xl transition-all">
                    <Mic size={20} />
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !newMessage}
                    className={`p-3 rounded-xl transition-all shadow-md ${sending || !newMessage ? 'bg-gray-100 text-gray-300' : 'bg-indigo-600 text-white shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5'}`}
                  >
                    {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <MessageCircle size={40} className="text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo ao Chat</h2>
            <p className="text-gray-400 max-w-sm">Selecione uma conversa ao lado para começar o atendimento.</p>
          </div>
        )}
      </div>

      {/* 3. Right Profile Panel (Collapsible) */}
      {selectedChat && showProfile && (
        <div className="w-[280px] bg-white border-l border-gray-50 flex flex-col py-8 px-6 shrink-0 transition-all">
          <div className="flex items-center justify-end mb-8">
            <button onClick={() => setShowProfile(false)} className="text-gray-300 hover:text-gray-500"><X size={20} /></button>
          </div>

          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-24 h-24 rounded-[30px] bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 mb-4 shadow-inner">
              {(selectedChat.contact_name || '?')[0].toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-slate-800">{selectedChat.contact_name}</h3>
            <p className="text-sm text-gray-400 mt-1">Lead / Cliente</p>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detalhes</h4>
              <div className="flex items-center gap-3 text-slate-600 mb-2">
                <Phone size={16} className="text-indigo-400" />
                <span className="text-sm">{selectedChat.remote_jid.split('@')[0]}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 mb-2">
                <Bell size={16} className="text-indigo-400" />
                <span className="text-sm">Notificações Ativas</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Mídia</h4>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-square bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-300">
                    <User size={16} />
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors mt-4">
              Bloquear Contato
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveChatView;
