import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Loader2, MessageSquare, Send, Timer, LayoutDashboard, MoreHorizontal, ChevronDown, Users, Bot } from 'lucide-react';

interface DashboardStats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  avgTime: string;
  activeConversations: number;
  instancesCount: number;
  chatbotsCount: number;
  usersCount: number;
  statusStats: {
    sent: number;
    received: number;
    pending: number;
    failed: number;
  };
  weeklyData: { day: string, count: number }[];
}

const StatCard: React.FC<{ label: string, value: string, trend: string, isPositive: boolean, icon: React.ReactNode, bgColor: string, textColor: string }> = ({ label, value, trend, isPositive, icon, bgColor, textColor }) => (
  <div className={`${bgColor} p-6 rounded-[2rem] relative overflow-hidden group transition-all hover:scale-[1.02] shadow-sm`}>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl shadow-sm backdrop-blur-sm">
        <span className={`${textColor}`}>{icon}</span>
      </div>
      <span className={`${isPositive ? 'bg-secondary' : 'bg-rose-500'} text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg`}>
        {trend}
      </span>
    </div>
    <div className="relative z-10">
      <h3 className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-1">{label}</h3>
      <p className="text-2xl font-black text-slate-800 dark:text-white">{value}</p>
    </div>
    <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
      <div className={`${textColor} transform scale-[5]`}>{icon}</div>
    </div>
  </div>
);

const DashboardView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    sentMessages: 0,
    receivedMessages: 0,
    avgTime: '0 Min',
    activeConversations: 0,
    instancesCount: 0,
    chatbotsCount: 0,
    usersCount: 0,
    statusStats: { sent: 0, received: 0, pending: 0, failed: 0 },
    weeklyData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        { count: instancesCount },
        { count: chatbotsCount },
        { count: usersCount },
        { count: totalMessages },
        { data: sentMessagesData },
        { count: conversationsCount },
        { data: recentMessages }
      ] = await Promise.all([
        supabase.from('instances').select('*', { count: 'exact', head: true }),
        supabase.from('chatbots').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender', 'me'),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*').order('timestamp', { ascending: false }).limit(1000)
      ]);

      const sentMessages = sentMessagesData?.length || 0;

      // Calculate Weekly Data
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weeklyMap: { [key: string]: number } = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        weeklyMap[d.toDateString()] = 0;
      }

      const statusStats = { sent: 0, received: 0, pending: 0, failed: 0 };

      recentMessages?.forEach((m: any) => {
        const d = new Date(m.timestamp).toDateString();
        if (weeklyMap[d] !== undefined) weeklyMap[d]++;

        if (m.sender === 'me') {
          statusStats.sent++;
        } else {
          statusStats.received++;
        }

        if (m.status === 'pending') statusStats.pending++;
        if (m.status === 'failed') statusStats.failed++;
      });

      const weeklyData = Object.entries(weeklyMap).map(([date, count]) => ({
        day: days[new Date(date).getDay()],
        count
      }));

      setStats({
        totalMessages: totalMessages || 0,
        sentMessages: sentMessages || 0,
        receivedMessages: (totalMessages || 0) - (sentMessages || 0),
        avgTime: '2 Min',
        activeConversations: conversationsCount || 0,
        instancesCount: instancesCount || 0,
        chatbotsCount: chatbotsCount || 0,
        usersCount: usersCount || 0,
        statusStats,
        weeklyData
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Instâncias Ativas', value: stats.instancesCount.toString(), trend: '+ 10%', isPositive: true, icon: <LayoutDashboard className="w-6 h-6" />, bgColor: 'bg-indigo-50 dark:bg-indigo-900/30', textColor: 'text-indigo-600' },
    { label: 'Chatbots Configurados', value: stats.chatbotsCount.toString(), trend: '+ 5%', isPositive: true, icon: <Bot className="w-6 h-6" />, bgColor: 'bg-blue-50 dark:bg-blue-900/30', textColor: 'text-blue-600' },
    { label: 'Equipe Total', value: stats.usersCount.toString(), trend: '+ 2%', isPositive: true, icon: <Users className="w-6 h-6" />, bgColor: 'bg-pink-50 dark:bg-pink-900/30', textColor: 'text-pink-600' },
    { label: 'Conversas Ativas', value: stats.activeConversations.toString(), trend: '0%', isPositive: true, icon: <MessageSquare className="w-6 h-6" />, bgColor: 'bg-orange-50 dark:bg-orange-900/30', textColor: 'text-orange-600' },
  ];

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="text-xl font-black text-slate-400 animate-pulse">Sincronizando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* Stat Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </section>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold dark:text-white">Status das Mensagens</h2>
            <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="space-y-6 flex-1 w-full">
              {[
                { label: 'Recebidas', value: `${stats.totalMessages > 0 ? Math.round((stats.statusStats.received / stats.totalMessages) * 100) : 0}%`, color: 'bg-secondary', raw: stats.statusStats.received },
                { label: 'Enviadas', value: `${stats.totalMessages > 0 ? Math.round((stats.statusStats.sent / stats.totalMessages) * 100) : 0}%`, color: 'bg-indigo-600', raw: stats.statusStats.sent },
                { label: 'Pendentes', value: `${stats.totalMessages > 0 ? Math.round((stats.statusStats.pending / stats.totalMessages) * 100) : 0}%`, color: 'bg-slate-900 dark:bg-slate-400', raw: stats.statusStats.pending },
                { label: 'Falhas', value: `${stats.totalMessages > 0 ? Math.round((stats.statusStats.failed / stats.totalMessages) * 100) : 0}%`, color: 'bg-slate-200 dark:bg-slate-600', raw: stats.statusStats.failed }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-4">
                    <span className={`w-4 h-4 rounded-full ${item.color} shadow-sm transition-transform group-hover:scale-125`}></span>
                    <span className="text-sm font-bold dark:text-white">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black dark:text-white block">{item.raw}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-slate-100 dark:text-slate-700" cx="50%" cy="50%" fill="transparent" r="40%" stroke="currentColor" strokeWidth="16"></circle>
                {stats.totalMessages > 0 && (
                  <circle
                    className="text-primary transition-all duration-1000"
                    cx="50%"
                    cy="50%"
                    fill="transparent"
                    r="40%"
                    stroke="currentColor"
                    strokeWidth="16"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - (stats.statusStats.sent + stats.statusStats.received) / stats.totalMessages)}`}
                    strokeLinecap="round"
                  ></circle>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Total</span>
                <span className="text-2xl font-black dark:text-white">{stats.totalMessages}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold dark:text-white">Volume Semanal</h2>
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors dark:text-white">
              <span>Semanal</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          <div className="h-64 w-full min-h-[256px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <BarChart data={stats.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar
                  dataKey="count"
                  fill="#00A884"
                  radius={[6, 6, 6, 6]}
                  barSize={32}
                >
                  {stats.weeklyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === stats.weeklyData.length - 1 ? '#00A884' : '#E2E8F0'}
                      className="hover:fill-primary-light transition-colors duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
