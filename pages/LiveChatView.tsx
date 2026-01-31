import React, { useState, useEffect, useRef } from 'react';
import { supabase, isAbortError } from '../lib/supabase';
import { evolutionApi, EvolutionInstance } from '../lib/evolution';
import { useToast } from '../components/ToastProvider';
import {
  Loader2, Send, Search, MessageCircle, MoreVertical,
  Paperclip, Mic, CheckCircle2, RefreshCw, Smartphone,
  ChevronLeft, Image as ImageIcon, Video, FileText
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
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);

  const [activeInstance, setActiveInstance] = useState<EvolutionInstance | null>(null);

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // --- Refs (Strict AbortController Management) ---
  const abortControllers = useRef<Record<string, AbortController>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Fetch Actions ---

  const fetchInstances = async () => {
    const KEY = 'instances';
    if (abortControllers.current[KEY]) abortControllers.current[KEY].abort();
    const controller = new AbortController();
    abortControllers.current[KEY] = controller;

    try {
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        // @ts-ignore
        .abortSignal(controller.signal);

      if (error) throw error;

      if (data && data.length > 0 && !activeInstance) {
        setActiveInstance(data[0] as unknown as EvolutionInstance);
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || isAbortError(error)) return;
      console.error('Fetch Instances Error:', error);
    } finally {
      if (abortControllers.current[KEY] === controller) delete abortControllers.current[KEY];
    }
  };

  const fetchConversations = async (isBackground = false) => {
    const KEY = 'conversations';
    // Only abort strict "foreground" loads if we want manual overrides.
    // For general polling, we replace strictly to avoid leaks.
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
        // @ts-ignore
        .abortSignal(controller.signal);

      if (error) throw error;
      setConversations(data || []);

    } catch (error: any) {
      if (error.name === 'AbortError' || isAbortError(error)) return;
      console.error('Fetch Conversations Error:', error);
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
        // @ts-ignore
        .abortSignal(controller.signal);

      if (error) throw error;

      setMessages(data || []);
      // Scroll on initial load only
      if (!isBackground && messages.length === 0) setTimeout(scrollToBottom, 100);

    } catch (error: any) {
      if (error.name === 'AbortError' || isAbortError(error)) return;
      console.error('Fetch Messages Error:', error);
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

    // Optimistic Update
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversation_id: selectedChat.id,
      text: messageContent,
      sender: 'me',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setTimeout(scrollToBottom, 100);

    try {
      setSending(true);

      await evolutionApi.sendTextMessage(
        activeInstance.name,
        selectedChat.remote_jid,
        messageContent
      );

      // Update specifically via background fetch to avoid flicker
      setTimeout(() => fetchMessages(selectedChat.id, true), 1500);

    } catch (error) {
      console.error('Send Error:', error);
      showToast('Erro ao enviar mensagem', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // --- Effects ---

  // 1. Initial Load & Conversation Polling (Recursive)
  useEffect(() => {
    fetchInstances();
    fetchConversations(); // Initial fetch

    // Recursive Polling for Conversations (every 10s)
    let timeoutId: NodeJS.Timeout;

    const pollConversations = async () => {
      // Only poll if tab is visible to avoid backlog
      if (!document.hidden) {
        await fetchConversations(true); // Background fetch
      }
      // Schedule next poll ONLY after current one finishes
      timeoutId = setTimeout(pollConversations, 10000);
    };

    timeoutId = setTimeout(pollConversations, 10000);

    return () => {
      clearTimeout(timeoutId);
      Object.values(abortControllers.current).forEach((c: any) => c.abort());
    };
  }, []);

  // 2. Chat Selection & Message Polling (Recursive)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const pollMessages = async () => {
      if (selectedChat && !document.hidden) {
        await fetchMessages(selectedChat.id, true); // Background fetch
      }
      // Recursive: Wait for fetch to finish before scheduling next
      timeoutId = setTimeout(pollMessages, 3000);
    };

    if (selectedChat) {
      fetchMessages(selectedChat.id); // Initial load
      timeoutId = setTimeout(pollMessages, 3000);
    } else {
      setMessages([]);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedChat?.id]);

  // 3. Tab Visibility Recovery
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Tab hidden: Pausing...');
        // We abort everything to be safe and save resources
        Object.values(abortControllers.current).forEach((c: any) => c.abort());
        abortControllers.current = {};
      } else {
        console.log('Tab visible: Resuming...');
        fetchConversations(true);
        if (selectedChat) fetchMessages(selectedChat.id, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedChat]);

  // --- Render (Beautiful UI) ---

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">

      {/* Sidebar - Conversations */}
      <div className="w-[350px] md:w-[400px] border-r border-gray-200 bg-white flex flex-col shadow-sm z-10 transition-all duration-300">

        {/* Sidebar Header */}
        <div className="h-16 px-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00a884] to-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
              <MessageCircle size={20} />
            </div>
            <h2 className="font-bold text-xl text-gray-800 tracking-tight">Conversas</h2>
          </div>
          <button
            onClick={() => fetchConversations()}
            className="p-2.5 rounded-full hover:bg-gray-200 text-gray-600 transition-all active:scale-95"
            title="Atualizar Conversas"
          >
            <RefreshCw size={18} className={loadingConversations ? "animate-spin text-[#00a884]" : ""} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-white border-b border-gray-100 box-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar conversa..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#00a884]/20 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
          {loadingConversations && conversations.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-40 gap-3 text-gray-400">
              <Loader2 className="animate-spin text-[#00a884]" size={32} />
              <span className="text-sm font-medium">Carregando conversas...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {conversations.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`group relative p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${selectedChat?.id === chat.id ? 'bg-[#f0f2f5] border-l-4 border-l-[#00a884]' : 'border-l-4 border-l-transparent'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-500 border border-gray-100 overflow-hidden select-none">
                        {chat.contact_name ? chat.contact_name[0].toUpperCase() : <Smartphone size={20} />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`truncate font-medium text-base ${selectedChat?.id === chat.id ? 'text-gray-900' : 'text-gray-800'}`}>
                          {chat.contact_name || chat.remote_jid}
                        </span>
                        <span className={`text-[11px] shrink-0 font-medium ${chat.unread_count > 0 ? 'text-[#00a884]' : 'text-gray-400'}`}>
                          {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <p className={`truncate text-sm ${chat.unread_count > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                          {chat.last_message || "Nova conversa"}
                        </p>
                        {chat.unread_count > 0 && (
                          <span className="bg-[#25D366] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm h-5 flex items-center justify-center">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#EFE7DD]">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.3] pointer-events-none" style={{
          backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
          backgroundRepeat: 'repeat'
        }}></div>

        {selectedChat ? (
          <>
            {/* Header */}
            <header className="h-16 px-4 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between shrink-0 shadow-sm z-20 sticky top-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedChat(null)} className="md:hidden text-gray-500">
                  <ChevronLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold border border-gray-300 select-none">
                  {(selectedChat.contact_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-800 leading-tight">{selectedChat.contact_name || selectedChat.remote_jid}</h3>
                  <span className="text-xs text-[#00a884] flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse" />
                    {activeInstance?.name || 'Online'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                  <Search size={20} />
                </button>
                <button className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 z-10 scrollbar-thin scrollbar-thumb-gray-300/50 hover:scrollbar-thumb-gray-400/50">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex justify-center mt-10">
                  <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center gap-2 text-gray-500 text-sm border border-gray-100">
                    <Loader2 className="animate-spin text-[#00a884]" size={16} />
                    Carregando mensagens...
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender === 'me';
                  const isContinuous = idx > 0 && messages[idx - 1].sender === msg.sender;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isContinuous ? 'mt-0.5' : 'mt-2'}`}
                    >
                      <div className={`
                        relative max-w-[85%] md:max-w-[65%] px-3 py-1.5 rounded-lg text-[15px] leading-relaxed shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]
                        ${isMe
                          ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                          : 'bg-white text-gray-900 rounded-tl-none'
                        }
                      `}>
                        {/* Media */}
                        {msg.media_url && (
                          <div className="mb-2 -mx-1 -mt-1">
                            {msg.media_type === 'image' && (
                              <div className="relative rounded overflow-hidden bg-black/5">
                                <img src={msg.media_url} alt="Media" className="max-w-full max-h-[300px] object-contain" />
                              </div>
                            )}
                            {msg.media_type === 'audio' && (
                              <audio src={msg.media_url} controls className="w-64 max-w-full" />
                            )}
                          </div>
                        )}

                        {/* Text */}
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                        {/* Status/Time */}
                        <div className={`
                           flex items-center justify-end gap-1 mt-0.5 select-none
                           ${isMe ? 'text-green-900/40' : 'text-gray-400'}
                        `}>
                          <span className="text-[10px] font-medium leading-none">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <CheckCircle2 size={12} className={msg.status === 'read' ? 'text-[#53bdeb]' : 'text-gray-400'} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <footer className="bg-[#f0f2f5] px-4 py-2 border-t border-gray-200 z-20">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-5xl mx-auto w-full">
                <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors shrink-0 mb-1">
                  <Paperclip size={24} />
                </button>

                <div className="flex-1 bg-white rounded-lg px-4 py-2 border border-white focus-within:border-white shadow-sm flex items-center min-h-[42px]">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-500 text-[15px] max-h-32"
                    placeholder="Mensagem"
                  />
                  <button type="button" className="text-gray-400 hover:text-gray-600 ml-2">
                    <Mic size={20} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className={`
                      p-2.5 rounded-full transition-all active:scale-95 shrink-0 flex items-center justify-center mb-1
                      ${sending || !newMessage.trim()
                      ? 'text-gray-400'
                      : 'text-[#00a884]'
                    }
                   `}
                >
                  {sending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] border-b-[6px] border-[#25D366] z-10 p-8 text-center relative select-none">
            {/* Empty State / Welcome Screen */}
            <div className="max-w-[560px] flex flex-col items-center">
              <div className="mb-10 opacity-80">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#00a884] rounded-full blur-[60px] opacity-20" />
                  <Smartphone size={100} className="text-gray-300 relative z-10" strokeWidth={1} />
                </div>
              </div>
              <h3 className="text-[32px] font-light text-gray-700 mb-5 tracking-tight">
                WhatsApp Web
              </h3>
              <p className="text-sm text-gray-500 leading-6 max-w-md">
                Envie e receba mensagens sem precisar manter seu celular conectado. <br />
                Use o WhatsApp em até 4 aparelhos conectados e 1 celular ao mesmo tempo.
              </p>

              <div className="mt-12 flex items-center gap-2 text-[13px] text-gray-400 font-medium">
                <div className="flex items-center gap-1">
                  <span className="text-[10px]">🔒</span>
                  Protegido com criptografia de ponta a ponta
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChatView;
