import React, { useState, useEffect, useRef } from 'react';
import { supabase, isAbortError } from '../lib/supabase';
import { evolutionApi, EvolutionInstance } from '../lib/evolution';
import { formatMessage } from '../lib/chatUtils';
import { useToast } from '../components/ToastProvider';
import {
  Loader2, Send, Search, MessageCircle, MoreVertical,
  Paperclip, Mic, Image, Video, FileText, Check, CheckCircle2,
  RefreshCw, Smartphone
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
  connectionStatus?: string; // Enriched
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

  // --- strictFetch Pattern ---
  // HOF to enforce standard fetch behavior? 
  // User asked for "Simple code", so explicit function calls might be better than complex wrappers.

  // --- Fetch Actions ---

  const fetchInstances = async () => {
    // Unique key for this request type
    const KEY = 'instances';

    // 1. Abort previous if exists (cleanup should have handled it, but safe guard)
    if (abortControllers.current[KEY]) {
      abortControllers.current[KEY].abort();
    }

    // 2. Create New Controller
    const controller = new AbortController();
    abortControllers.current[KEY] = controller;

    try {
      // 3. Perform Request
      const { data, error } = await supabase
        .from('instances')
        .select('*')
        // @ts-ignore
        .abortSignal(controller.signal);

      if (error) throw error;

      // Select active instance if not set
      if (data && data.length > 0 && !activeInstance) {
        setActiveInstance(data[0] as unknown as EvolutionInstance);
      }

    } catch (error: any) {
      // 4. Strict Abort Handling
      if (error.name === 'AbortError' || isAbortError(error)) {
        return; // Silent return
      }
      console.error('Fetch Instances Error:', error);
    } finally {
      // 5. Cleanup
      if (abortControllers.current[KEY] === controller) {
        delete abortControllers.current[KEY];
      }
    }
  };

  const fetchConversations = async (silent = false) => {
    const KEY = 'conversations';

    if (abortControllers.current[KEY]) {
      abortControllers.current[KEY].abort();
    }

    const controller = new AbortController();
    abortControllers.current[KEY] = controller;

    try {
      if (!silent) setLoadingConversations(true);

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
      if (error.name === 'AbortError' || isAbortError(error)) {
        return;
      }
      console.error('Fetch Conversations Error:', error);
    } finally {
      if (abortControllers.current[KEY] === controller) {
        delete abortControllers.current[KEY];
      }
      if (!silent) setLoadingConversations(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    const KEY = 'messages';

    if (abortControllers.current[KEY]) {
      abortControllers.current[KEY].abort();
    }

    const controller = new AbortController();
    abortControllers.current[KEY] = controller;

    try {
      setLoadingMessages(true);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', chatId)
        .order('timestamp', { ascending: true })
        // @ts-ignore
        .abortSignal(controller.signal);

      if (error) throw error;

      setMessages(data || []);
      setTimeout(scrollToBottom, 100);

    } catch (error: any) {
      if (error.name === 'AbortError' || isAbortError(error)) {
        return;
      }
      console.error('Fetch Messages Error:', error);
    } finally {
      if (abortControllers.current[KEY] === controller) {
        delete abortControllers.current[KEY];
      }
      setLoadingMessages(false);
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

      // Refresh to confirm status (delay for webhook processing)
      setTimeout(() => fetchMessages(selectedChat.id), 1500);

    } catch (error) {
      console.error('Send Error:', error);
      showToast('Erro ao enviar mensagem', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };


  // --- Effects ---

  // 1. Initial Load
  useEffect(() => {
    fetchInstances();
    fetchConversations();

    // Cleanup on unmount
    return () => {
      Object.values(abortControllers.current).forEach((c: any) => c.abort());
    };
  }, []); // Run once

  // 2. Load messages when chat selected AND Auto-Poll
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (selectedChat) {
      // Initial fetch
      fetchMessages(selectedChat.id);

      // FAST Polling (3s) for real-time feel since we lack WebSocket for now
      pollInterval = setInterval(() => {
        if (!document.hidden) {
          fetchMessages(selectedChat.id);
        }
      }, 3000);
    } else {
      setMessages([]);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedChat?.id]); // Re-run if ID changes

  // 3. Tab Visibility Handling (CRITICAL)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // TAB HIDDEN: Abort EVERYTHING
        console.log('Tab hidden: Aborting all requests');
        Object.values(abortControllers.current).forEach((c: any) => c.abort());
        abortControllers.current = {}; // Clear refs
      } else {
        // TAB VISIBLE: Restart necessary polling
        console.log('Tab visible: Restarting requests');
        fetchConversations(true); // Silent refresh
        if (selectedChat) {
          fetchMessages(selectedChat.id);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedChat]); // Depend on selectedChat to refetch it on show


  // --- Render ---

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar - Conversations */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-100">
          <h2 className="font-bold text-lg text-gray-700">Conversas</h2>
          <button
            onClick={() => fetchConversations()}
            className="p-2 rounded-full hover:bg-gray-200"
            title="Recarregar"
          >
            <RefreshCw size={20} className={loadingConversations ? "animate-spin" : ""} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations && conversations.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin text-blue-500" size={30} />
            </div>
          ) : (
            conversations.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
              >
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-gray-800">{chat.contact_name || chat.remote_jid}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <p className="text-sm text-gray-600 truncate w-3/4">{chat.last_message}</p>
                  {chat.unread_count > 0 && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">{chat.unread_count}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Area - Chat */}
      <div className="flex-1 flex flex-col bg-[#e5ded8]">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-gray-100 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {(selectedChat.contact_name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{selectedChat.contact_name}</h3>
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Smartphone size={12} /> {activeInstance?.name || 'Online'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {/* Actions like search, info could go here */}
                <MoreVertical className="text-gray-500 cursor-pointer" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex justify-center mt-10">
                  <Loader2 className="animate-spin text-gray-500" />
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-3 rounded-lg shadow-sm ${msg.sender === 'me' ? 'bg-[#d9fdd3]' : 'bg-white'
                      }`}>
                      {msg.media_url && (
                        <div className="mb-2">
                          {msg.media_type === 'image' && <img src={msg.media_url} alt="Media" className="rounded max-h-60" />}
                          {msg.media_type === 'audio' && <audio src={msg.media_url} controls className="w-60" />}
                        </div>
                      )}
                      <p className="text-gray-800 whitespace-pre-wrap">{msg.text}</p>
                      <div className="text-[10px] text-gray-500 text-right mt-1 flex justify-end gap-1 items-center">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender === 'me' && <CheckCircle2 size={12} className={msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'} />}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-gray-100 flex items-center gap-2">
              <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 p-3 rounded-lg border-none focus:ring-1 focus:ring-green-500 outline-none"
                placeholder="Digite uma mensagem..."
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className={`p-3 rounded-full ${sending ? 'bg-gray-400' : 'bg-green-500 text-white hover:bg-green-600'}`}
              >
                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle size={64} className="mb-4 text-gray-300" />
            <p className="text-lg">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChatView;
