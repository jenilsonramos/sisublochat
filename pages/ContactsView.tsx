import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ToastProvider';
import {
    Loader2,
    Search,
    UserPlus,
    Mail,
    Phone,
    Calendar,
    MoreVertical,
    Trash2,
    Edit2,
    Users,
    CalendarDays,
    CalendarCheck,
    History,
    ListFilter,
    X,
    Check,
    Plus,
    UserCircle,
    PhoneCall,
    AtSign
} from 'lucide-react';

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
    tags?: string[];
    created_at: string;
}

interface ContactList {
    id: string;
    name: string;
    created_at: string;
    _count?: number;
}

const ContactsView: React.FC = () => {
    const { showToast } = useToast();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [lists, setLists] = useState<ContactList[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<ContactStats>({ total: 0, hoje: 0, ontem: 0, este_mes: 0 });
    const [activeTab, setActiveTab] = useState<'contacts' | 'lists'>('contacts');

    // Modals
    const [showContactModal, setShowContactModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [editingList, setEditingList] = useState<ContactList | null>(null);

    // Form inputs
    const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', notes: '', tags: [] as string[] });
    const [listForm, setListForm] = useState({ name: '' });

    const fetchStats = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const todayStr = today.toISOString().split('T')[0];
        const monthStr = startOfMonth.toISOString().split('T')[0];

        const { data } = await supabase.from('contacts').select('created_at').eq('user_id', session.user.id);
        if (data) {
            const total = data.length;
            const hoje = data.filter(c => c.created_at.startsWith(todayStr)).length;
            const este_mes = data.filter(c => c.created_at >= monthStr).length;
            setStats(prev => ({ ...prev, total, hoje, este_mes }));
        }
    };

    const fetchLists = async () => {
        const { data, error } = await supabase
            .from('contact_lists')
            .select(`
                *,
                contact_list_members(count)
            `)
            .order('name');

        if (data) {
            setLists(data.map(l => ({
                ...l,
                _count: l.contact_list_members?.[0]?.count || 0
            })));
        }
    };

    useEffect(() => {
        fetchData();

        const contactsSub = supabase.channel('contacts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
                fetchContacts();
                fetchStats();
            }).subscribe();

        const listsSub = supabase.channel('lists')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_lists' }, () => {
                fetchLists();
            }).subscribe();

        return () => {
            contactsSub.unsubscribe();
            listsSub.unsubscribe();
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchContacts(), fetchLists(), fetchStats()]);
        setLoading(false);
    };

    const fetchContacts = async () => {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setContacts(data || []);
        } catch (error: any) {
            showToast('Erro ao carregar contatos', 'error');
        }
    };

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const phone = contactForm.phone.replace(/\D/g, '');
            const remote_jid = `${phone}@s.whatsapp.net`;

            const payload = {
                user_id: session.user.id,
                name: contactForm.name,
                remote_jid,
                email: contactForm.email,
                notes: contactForm.notes,
                tags: contactForm.tags,
            };

            if (editingContact) {
                const { error } = await supabase.from('contacts').update(payload).eq('id', editingContact.id);
                if (error) throw error;
                showToast('Contato atualizado', 'success');
            } else {
                const { error } = await supabase.from('contacts').insert(payload);
                if (error) throw error;
                showToast('Contato criado', 'success');
            }

            setShowContactModal(false);
            setEditingContact(null);
            setContactForm({ name: '', phone: '', email: '', notes: '', tags: [] });
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleDeleteContact = async (id: string) => {
        if (!confirm('Deseja excluir este contato?')) return;
        const { error } = await supabase.from('contacts').delete().eq('id', id);
        if (error) showToast('Erro ao excluir', 'error');
    };

    const handleSaveList = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const payload = { user_id: session.user.id, name: listForm.name };

            if (editingList) {
                const { error } = await supabase.from('contact_lists').update(payload).eq('id', editingList.id);
                if (error) throw error;
                showToast('Lista atualizada', 'success');
            } else {
                const { error } = await supabase.from('contact_lists').insert(payload);
                if (error) throw error;
                showToast('Lista criada', 'success');
            }

            setShowListModal(false);
            setEditingList(null);
            setListForm({ name: '' });
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleDeleteList = async (id: string) => {
        if (!confirm('Excluir esta lista? (Os contatos não serão apagados)')) return;
        const { error } = await supabase.from('contact_lists').delete().eq('id', id);
        if (error) showToast('Erro ao excluir lista', 'error');
    };

    // List Management helper
    const [selectedContactForList, setSelectedContactForList] = useState<Contact | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [memberLists, setMemberLists] = useState<string[]>([]);

    const openAssignModal = async (contact: Contact) => {
        setSelectedContactForList(contact);
        const { data } = await supabase.from('contact_list_members').select('list_id').eq('contact_id', contact.id);
        setMemberLists(data?.map(m => m.list_id) || []);
        setShowAssignModal(true);
    };

    const toggleListMembership = async (listId: string) => {
        if (!selectedContactForList) return;

        try {
            if (memberLists.includes(listId)) {
                await supabase.from('contact_list_members')
                    .delete()
                    .eq('list_id', listId)
                    .eq('contact_id', selectedContactForList.id);
                setMemberLists(prev => prev.filter(id => id !== listId));
            } else {
                await supabase.from('contact_list_members')
                    .insert({ list_id: listId, contact_id: selectedContactForList.id });
                setMemberLists(prev => [...prev, listId]);
            }
        } catch (error) {
            showToast('Erro ao atualizar lista', 'error');
        }
    };

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.remote_jid.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, icon: <Users className="w-5 h-5" />, color: 'indigo' },
                    { label: 'Listas', value: lists.length, icon: <ListFilter className="w-5 h-5" />, color: 'emerald' },
                    { label: 'Novos Hoje', value: stats.hoje, icon: <Plus className="w-5 h-5" />, color: 'amber' },
                    { label: 'Este Mês', value: stats.este_mes, icon: <CalendarCheck className="w-5 h-5" />, color: 'blue' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                        <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-black dark:text-white leading-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl w-fit self-center md:self-start">
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'contacts' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Todos os Contatos
                </button>
                <button
                    onClick={() => setActiveTab('lists')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'lists' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Listas de Segmentação
                </button>
            </div>

            {/* Search & Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={activeTab === 'contacts' ? "Buscar por nome ou número..." : "Buscar lista..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] focus:ring-4 focus:ring-primary/5 text-sm dark:text-white transition-all outline-none font-medium"
                    />
                </div>

                {activeTab === 'contacts' ? (
                    <button
                        onClick={() => { setEditingContact(null); setContactForm({ name: '', phone: '', email: '', notes: '', tags: [] }); setShowContactModal(true); }}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-primary/20 active:scale-95 text-sm"
                    >
                        <UserPlus size={18} />
                        Adicionar Contato
                    </button>
                ) : (
                    <button
                        onClick={() => { setEditingList(null); setListForm({ name: '' }); setShowListModal(true); }}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-primary/20 active:scale-95 text-sm"
                    >
                        <Plus size={18} />
                        Nova Lista
                    </button>
                )}
            </div>

            {/* Content Table/Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none flex-1 flex flex-col min-h-0">
                <div className="overflow-x-auto custom-scrollbar">
                    {activeTab === 'contacts' ? (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={3} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></td></tr>
                                ) : filteredContacts.map(contact => (
                                    <tr key={contact.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary font-black relative overflow-hidden">
                                                    {contact.avatar_url ? <img src={contact.avatar_url} className="w-full h-full object-cover" /> : contact.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-black dark:text-white truncate uppercase tracking-tight">{contact.name}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{contact.remote_jid.split('@')[0]}</p>
                                                        {contact.tags && contact.tags.length > 0 && (
                                                            <div className="flex gap-1">
                                                                {contact.tags.slice(0, 2).map(tag => (
                                                                    <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded uppercase">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                                {contact.tags.length > 2 && (
                                                                    <span className="text-[8px] text-slate-400 font-bold">+{contact.tags.length - 2}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                    <Mail size={12} className="text-slate-300" />
                                                    {contact.email || '-'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                                                    <Calendar size={12} className="text-slate-300" />
                                                    Desde {new Date(contact.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openAssignModal(contact)}
                                                    className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-all"
                                                >
                                                    <ListFilter size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingContact(contact);
                                                        setContactForm({ name: contact.name, phone: contact.remote_jid.split('@')[0], email: contact.email || '', notes: contact.notes || '', tags: contact.tags || [] });
                                                        setShowContactModal(true);
                                                    }}
                                                    className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-all"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteContact(contact.id)}
                                                    className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                            {lists.map(list => (
                                <div key={list.id} className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 hover:shadow-xl transition-all group">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                            <ListFilter className="text-primary w-6 h-6" />
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingList(list); setListForm({ name: list.name }); setShowListModal(true); }}
                                                className="p-2 text-slate-400 hover:text-primary"
                                            ><Edit2 size={16} /></button>
                                            <button
                                                onClick={() => handleDeleteList(list.id)}
                                                className="p-2 text-slate-400 hover:text-rose-500"
                                            ><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black dark:text-white">{list.name}</h4>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{list._count} Contatos</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showContactModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowContactModal(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8 animate-in zoom-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black dark:text-white">{editingContact ? 'Editar Contato' : 'Novo Contato'}</h3>
                            <button onClick={() => setShowContactModal(false)} className="text-slate-400 hover:text-primary"><X /></button>
                        </div>
                        <form onSubmit={handleSaveContact} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                <input
                                    required
                                    value={contactForm.name}
                                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl outline-none font-medium dark:text-white focus:ring-4 focus:ring-primary/5"
                                    placeholder="João Silva"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp (com DDD)</label>
                                <input
                                    required
                                    value={contactForm.phone}
                                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl outline-none font-medium dark:text-white focus:ring-4 focus:ring-primary/5"
                                    placeholder="5511999999999"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail (Opcional)</label>
                                <input
                                    type="email"
                                    value={contactForm.email}
                                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl outline-none font-medium dark:text-white focus:ring-4 focus:ring-primary/5"
                                    placeholder="joao@email.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags (separadas por vírgula)</label>
                                <input
                                    value={contactForm.tags.join(', ')}
                                    onChange={e => setContactForm({ ...contactForm, tags: e.target.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t) })}
                                    className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl outline-none font-medium dark:text-white focus:ring-4 focus:ring-primary/5"
                                    placeholder="vip, lead, cliente"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas</label>
                                <textarea
                                    value={contactForm.notes}
                                    onChange={e => setContactForm({ ...contactForm, notes: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl outline-none font-medium dark:text-white focus:ring-4 focus:ring-primary/5 min-h-[100px] resize-none"
                                    placeholder="Observações sobre o contato..."
                                />
                            </div>
                            <button className="w-full py-5 bg-primary text-white font-black rounded-3xl mt-4 hover:brightness-110 shadow-xl shadow-primary/20 transition-all">
                                {editingContact ? 'Atualizar Dados' : 'Salvar Contato'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showListModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowListModal(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 p-8 animate-in zoom-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black dark:text-white">{editingList ? 'Editar Lista' : 'Nova Lista'}</h3>
                            <button onClick={() => setShowListModal(false)} className="text-slate-400 hover:text-primary"><X /></button>
                        </div>
                        <form onSubmit={handleSaveList} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Lista</label>
                                <input
                                    required
                                    value={listForm.name}
                                    onChange={e => setListForm({ ...listForm, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl outline-none font-medium dark:text-white focus:ring-4 focus:ring-primary/5"
                                    placeholder="Ex: Clientes VIP"
                                />
                            </div>
                            <button className="w-full py-5 bg-primary text-white font-black rounded-3xl mt-4 hover:brightness-110 shadow-xl shadow-primary/20 transition-all">
                                {editingList ? 'Atualizar Lista' : 'Criar Lista'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showAssignModal && selectedContactForList && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowAssignModal(false)}></div>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 p-8 animate-in zoom-in">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black dark:text-white">Gerenciar Listas</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase">{selectedContactForList.name}</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-primary"><X /></button>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            {lists.length === 0 ? (
                                <p className="text-center py-8 text-slate-400 font-bold italic">Nenhuma lista criada ainda...</p>
                            ) : lists.map(list => (
                                <button
                                    key={list.id}
                                    onClick={() => toggleListMembership(list.id)}
                                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${memberLists.includes(list.id) ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'}`}
                                >
                                    <span className={`font-black uppercase text-xs ${memberLists.includes(list.id) ? 'text-primary' : 'text-slate-400'}`}>
                                        {list.name}
                                    </span>
                                    {memberLists.includes(list.id) && <Check size={18} className="text-primary" />}
                                </button>
                            ))}
                        </div>

                        <button onClick={() => setShowAssignModal(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl mt-6 hover:brightness-110 transition-all">
                            Concluído
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsView;
