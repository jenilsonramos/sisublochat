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
  const [showProfile, setShowProfile] = useState(false); // Default closed for cleaner look

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

  // --- Render (Refined Dashboard UI) ---

  return (
    <div className="flex h-screen bg-[#F7F8FC] overflow-hidden font-sans text-slate-800">

      {/* 1. Sidebar - Chat List */}
      <div className="w-[340px] bg-white flex flex-col shrink-0 relative z-10">
        {/* Title */}
        <div className="h-20 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chat</h1>
          <button className="w-10 h-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:scale-105 active:scale-95" title="Nova Conversa">
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tabs - Pill Style */}
        <div className="px-6 pb-4">
          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button className="flex-1 py-2 text-sm font-semibold text-slate-800 bg-white shadow-sm rounded-xl transition-all">Open</button>
            <button className="flex-1 py-2 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-all">Archived</button>
          </div>
        </div>

        {/* Search - Minimalist */}
        <div className="px-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4F46E5] transition-colors" size={18} />
            <input
              placeholder="Search for people..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/10 transition-all outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-100 hover:scrollbar-thumb-gray-200">
          {loadingConversations && conversations.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#4F46E5]" /></div>
          ) : (
            conversations.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`
                  relative p-3.5 rounded-2xl cursor-pointer transition-all duration-200
                  ${selectedChat?.id === chat.id
                    ? 'bg-white shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)] z-10 scale-[1.02]'
                    : 'hover:bg-gray-50 hover:scale-[1.01]'
                  }
                `}
              >
                {/* Active Indicator (Small Dot or Pill) */}
                {selectedChat?.id === chat.id && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 h-10 w-1 bg-[#4F46E5] rounded-full" />
                )}

                <div className="flex items-center gap-4 pl-2">
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 transition-colors ${selectedChat?.id === chat.id
                        ? 'border-[#4F46E5] text-[#4F46E5] bg-indigo-50'
                        : 'border-transparent bg-indigo-100 text-indigo-500'
                      }`}>
                      {chat.contact_name ? chat.contact_name[0].toUpperCase() : 'U'}
                    </div>
                    {chat.unread_count > 0 && <span className="absolute 0 top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className={`font-bold text-[15px] truncate ${selectedChat?.id === chat.id ? 'text-slate-900' : 'text-slate-700'}`}>{chat.contact_name || chat.remote_jid}</h4>
                      <span className="text-[11px] text-gray-400 font-medium">{new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className={`text-xs truncate leading-relaxed ${chat.unread_count > 0 ? 'text-slate-600 font-semibold' : 'text-gray-400 font-medium'}`}>
                      {chat.last_message || 'Inicie a conversa...'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Main Chat Area - Clean & Spacious */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden relative shadow-md z-0">
        {selectedChat ? (
          <>
            {/* Header - Transparent/Minimal */}
            <header className="h-20 px-8 flex items-center justify-between border-b border-gray-50 bg-white/80 backdrop-blur-sm z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                  {(selectedChat.contact_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedChat.contact_name || selectedChat.remote_jid}</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-400 font-medium">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowProfile(!showProfile)} className={`p-2.5 rounded-xl transition-all ${showProfile ? 'bg-indigo-50 text-[#4F46E5]' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <Info size={20} />
                </button>
                <button className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            {/* Messages - Spacious Bubbles */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
              {/* Date Divider (Mock) */}
              <div className="flex justify-center">
                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-wider">MENSAGENS RECENTES</span>
              </div>

              {loadingMessages && displayMessages.length === 0 ? (
                <div className="flex justify-center mt-12"><Loader2 className="animate-spin text-[#4F46E5]" /></div>
              ) : (
                displayMessages.map((msg, idx) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-3 group`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mb-1 ${isMe ? 'bg-[#4F46E5] text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {isMe ? 'ME' : (selectedChat.contact_name || '?')[0]}
                      </div>

                      {/* Bubble */}
                      <div className={`
                               max-w-[65%] px-5 py-3 rounded-[20px] text-[15px] leading-relaxed shadow-sm relative transition-all
                               ${isMe
                          ? 'bg-gradient-to-br from-[#4F46E5] to-[#4338ca] text-white rounded-br-none'
                          : 'bg-white border border-gray-100 text-slate-600 rounded-bl-none shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]'
                        }
                            `}>
                        {msg.media_url && <div className="mb-2 text-xs opacity-90 font-medium">📎 Anexo</div>}
                        <p>{msg.text}</p>
                      </div>

                      {/* Time */}
                      <span className="text-[10px] text-gray-300 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Floating Bar */}
            <div className="p-8 pt-0 z-20">
              <form onSubmit={handleSendMessage} className="bg-white border border-gray-100 rounded-full p-2 pl-4 pr-2 flex items-center shadow-[0_8px_40px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] transition-shadow">
                <button type="button" className="p-2 text-gray-400 hover:text-[#4F46E5] transition-colors">
                  <Paperclip size={20} />
                </button>
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 bg-transparent border-none outline-none text-slate-700 placeholder:text-gray-400 font-medium"
                />
                <div className="flex gap-2">
                  <button type="button" className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-full transition-all">
                    <Mic size={20} />
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !newMessage}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${sending || !newMessage ? 'bg-gray-100 text-gray-300' : 'bg-[#4F46E5] text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95'}`}
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]">
              <MessageCircle size={48} className="text-[#4F46E5]" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back!</h2>
            <p className="text-gray-500 max-w-sm font-medium">Select a conversation from the list to start chatting with your contacts.</p>
          </div>
        )}
      </div>

      {/* 3. Details Panel (Collapsible) */}
      {selectedChat && showProfile && (
        <div className="w-[300px] bg-white border-l border-gray-50 flex flex-col pt-12 px-6 shrink-0 shadow-[-10px_0_40px_-10px_rgba(0,0,0,0.03)] z-10 animate-in slide-in-from-right duration-300">

          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white mb-5 shadow-xl shadow-indigo-200">
              {(selectedChat.contact_name || '?')[0].toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedChat.contact_name}</h3>
            <p className="text-sm font-bold text-[#4F46E5]">Content Manager</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-gray-50 p-3 rounded-2xl text-center">
              <span className="block text-lg font-bold text-slate-800">142</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Mensagens</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl text-center">
              <span className="block text-lg font-bold text-slate-800">12</span>
              <span className="text-[10px] uppercase font-bold text-gray-400">Arquivos</span>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-4">Contact Info</h4>
              <div className="flex items-center gap-4 text-slate-600 mb-4 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[#4F46E5] group-hover:bg-[#4F46E5] group-hover:text-white transition-colors">
                  <Phone size={14} />
                </div>
                <span className="text-sm font-semibold">{selectedChat.remote_jid.split('@')[0]}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-600 mb-4 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[#4F46E5] group-hover:bg-[#4F46E5] group-hover:text-white transition-colors">
                  <Bell size={14} />
                </div>
                <span className="text-sm font-semibold">Notifications On</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <button className="w-full py-4 rounded-2xl border-2 border-red-50 text-red-500 font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                <X size={16} /> Block Contact
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveChatView;
