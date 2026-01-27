
export type TabType = 'dashboard' | 'instances' | 'analytics' | 'chatbots' | 'livechat' | 'users' | 'settings' | 'contacts' | 'apidocs' | 'subscription' | 'aisettings'
  | 'admin'
  | 'flowbuilder'
  | 'broadcast';

export interface Instance {
  id: string;
  name: string;
  status: 'open' | 'open.scanning' | 'open.pairing' | 'close' | 'connecting' | 'CONNECTED' | 'DISCONNECTED';
  battery: number | null;
  identifier: string;
  type: string;
}

export interface Chatbot {
  id: string;
  name: string;
  trigger: string;
  instanceId: string;
  status: 'ACTIVE' | 'PAUSED';
  lastRun: string;
  type: 'AI' | 'FLOW' | 'SIMPLE';
}

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'contact';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  online: boolean;
  messages: Message[];
}

export interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
  icon: string;
  bgColor: string;
  textColor: string;
}
