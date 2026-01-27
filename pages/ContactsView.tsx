import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import { Loader2, Search, UserPlus, Mail, Phone, Calendar, MoreVertical, Trash2, Edit2, Users, CalendarDays, CalendarCheck, History } from 'lucide-react';

interface ContactStats {
    total: number;
    hoje: number;
    ontem: number;
    este_mes: number;
}

interface Contact {
    id: string;
    name: string;
    remote_jid: string;
    avatar_url?: string;
    email?: string;
    notes?: string;
    created_at: string;
}

const ContactsView: React.FC = () => {
    const { showToast } = useToast();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<ContactStats>({ total: 0, hoje: 0, ontem: 0, este_mes: 0 });

    const fetchStats = async () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const monthStr = startOfMonth.toISOString().split('T')[0];

        const { data } = await supabase.from('contacts').select('created_at');
        if (data) {
            const total = data.length;
            const hoje = data.filter(c => c.created_at.startsWith(todayStr)).length;
            const ontem = data.filter(c => c.created_at.startsWith(yesterdayStr)).length;
            const este_mes = data.filter(c => c.created_at >= monthStr).length;
            setStats({ total, hoje, ontem, este_mes });
        }
    };

    useEffect(() => {
        fetchContacts();
        fetchStats();

        // Real-time subscription for contacts
        const contactsSubscription = supabase
            .channel('public:contacts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
                fetchContacts();
                fetchStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(contactsSubscription);
        };
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setContacts(data || []);
        } catch (error: any) {
            console.error('Error fetching contacts:', error);
            showToast('Erro ao carregar contatos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.remote_jid.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, icon: <Users className="w-5 h-5" />, color: 'indigo' },
                    { label: 'Hoje', value: stats.hoje, icon: <CalendarDays className="w-5 h-5" />, color: 'emerald' },
                    { label: 'Ontem', value: stats.ontem, icon: <History className="w-5 h-5" />, color: 'amber' },
                    { label: 'Este Mês', value: stats.este_mes, icon: <CalendarCheck className="w-5 h-5" />, color: 'blue' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4">
                        <div className={`w-11 h-11 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-xl flex items-center justify-center`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black dark:text-white leading-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar contatos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary-light text-sm dark:text-white transition-all outline-none"
                    />
                </div>

                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/20 active:scale-95">
                    <UserPlus size={20} />
                    Novo Contato
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
                                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Contato</th>
                                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">WhatsApp ID</th>
                                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Cadastro</th>
                                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                                        <p className="text-slate-400 font-medium">Carregando contatos...</p>
                                    </td>
                                </tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300">
                                            <Search size={40} />
                                        </div>
                                        <p className="text-slate-400 font-bold text-lg">Nenhum contato encontrado</p>
                                        <p className="text-slate-400 text-sm mt-1">Os contatos aparecerão aqui conforme você recebe mensagens.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredContacts.map((contact) => (
                                    <tr key={contact.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                                                    alt={contact.name}
                                                    className="w-12 h-12 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                                                />
                                                <div>
                                                    <h4 className="text-sm font-black dark:text-white">{contact.name}</h4>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{contact.email || 'Sem e-mail'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-500 dark:text-slate-400">
                                            {contact.remote_jid}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold dark:text-slate-300">{new Date(contact.created_at).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(contact.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-3 rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button className="p-3 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Carregando contatos...</p>
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300">
                                <Search size={40} />
                            </div>
                            <p className="text-slate-400 font-bold text-lg">Nenhum contato encontrado</p>
                        </div>
                    ) : (
                        filteredContacts.map((contact) => (
                            <div key={contact.id} className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`}
                                            alt={contact.name}
                                            className="w-12 h-12 rounded-2xl object-cover shadow-sm"
                                        />
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-black dark:text-white truncate">{contact.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{contact.remote_jid.split('@')[0]}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="p-2.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="p-2.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/5">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp ID</p>
                                        <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 break-all leading-tight">{contact.remote_jid}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cadastro</p>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold dark:text-slate-300">{new Date(contact.created_at).toLocaleDateString()}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(contact.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>

                                {contact.email && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{contact.email}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactsView;
