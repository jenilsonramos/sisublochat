
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Loader2, TrendingUp, CheckCircle, Clock, Heart, Download } from 'lucide-react';

const COLORS = ['#4f46e5', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'];

const AnalyticsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    deliveryRate: '0%',
    conversion: '12.4%',
    avgResponseTime: '0s',
    engagement: '0%'
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [instancePerformance, setInstancePerformance] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // 1. Fetch messages for the last 24h
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          id, 
          sender, 
          status, 
          timestamp,
          conversation:conversations (
            instance:instances (id, name, sector)
          )
        `)
        .gte('timestamp', last24h);

      if (msgError) throw msgError;

      // 2. Summary Calculations
      const sent = messages?.filter(m => m.sender === 'me') || [];
      const received = messages?.filter(m => m.sender === 'contact') || [];
      const delivered = sent.filter(m => m.status === 'delivered');

      const deliveryRate = sent.length > 0
        ? ((delivered.length / sent.length) * 100).toFixed(1) + '%'
        : '0%';

      // 2.1 Calculate Response Time
      const conversationsMap: any = {};
      messages?.forEach((m: any) => {
        const convId = (Array.isArray(m.conversation) ? m.conversation[0] : m.conversation)?.id || m.conversation_id;
        if (!conversationsMap[convId]) {
          conversationsMap[convId] = { contactTs: null, meTs: null };
        }
        if (m.sender === 'contact' && !conversationsMap[convId].contactTs) {
          conversationsMap[convId].contactTs = new Date(m.timestamp).getTime();
        }
        if (m.sender === 'me' && conversationsMap[convId].contactTs && !conversationsMap[convId].meTs) {
          conversationsMap[convId].meTs = new Date(m.timestamp).getTime();
        }
      });

      let totalDelay = 0;
      let replyCount = 0;
      Object.values(conversationsMap).forEach((conv: any) => {
        if (conv.contactTs && conv.meTs) {
          totalDelay += (conv.meTs - conv.contactTs);
          replyCount++;
        }
      });

      const avgDelayMs = replyCount > 0 ? totalDelay / replyCount : 0;
      const mins = Math.floor(avgDelayMs / 60000);
      const secs = Math.floor((avgDelayMs % 60000) / 1000);
      const avgResponseTime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      // 2.2 Calculate Engagement (Received / Total)
      const engagement = messages && messages.length > 0
        ? ((received.length / messages.length) * 100).toFixed(1) + '%'
        : '0%';

      // 2.3 Conversion (Unique contacts reached / Sent) - Simulation logic
      const uniqueContacts = new Set(messages?.map((m: any) => {
        const conv = Array.isArray(m.conversation) ? m.conversation[0] : m.conversation;
        return conv?.id;
      }));
      const conversion = sent.length > 0
        ? ((uniqueContacts.size / sent.length) * 100).toFixed(1) + '%'
        : '0%';

      // 3. Hourly Chart Data (Last 24h)
      const hourlyFlow: any = {};
      for (let i = 0; i < 24; i++) {
        const h = new Date(now.getTime() - i * 60 * 60 * 1000).getHours();
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        hourlyFlow[timeStr] = { time: timeStr, sent: 0, received: 0, sortKey: 23 - i };
      }

      messages?.forEach(m => {
        const h = new Date(m.timestamp).getHours();
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        if (hourlyFlow[timeStr]) {
          if (m.sender === 'me') hourlyFlow[timeStr].sent++;
          else hourlyFlow[timeStr].received++;
        }
      });

      const sortedChartData = Object.values(hourlyFlow).sort((a: any, b: any) => a.sortKey - b.sortKey);
      setChartData(sortedChartData);

      // 4. Sector Efficiency
      const sectors: any = {};
      messages?.forEach((m: any) => {
        const conv = Array.isArray(m.conversation) ? m.conversation[0] : m.conversation;
        const inst = conv?.instance ? (Array.isArray(conv.instance) ? conv.instance[0] : conv.instance) : null;

        const sector = inst?.sector || 'Outros';
        sectors[sector] = (sectors[sector] || 0) + 1;
      });

      const pieData = Object.entries(sectors).map(([name, value], idx) => ({
        name,
        value: Math.round(((value as number) / (messages?.length || 1)) * 100),
        color: COLORS[idx % COLORS.length]
      }));
      setSectorData(pieData);

      // 5. Instance Performance
      const instancesMap: any = {};
      messages?.forEach((m: any) => {
        const conv = Array.isArray(m.conversation) ? m.conversation[0] : m.conversation;
        const inst = conv?.instance ? (Array.isArray(conv.instance) ? conv.instance[0] : conv.instance) : null;

        if (!inst) return;
        if (!instancesMap[inst.id]) {
          instancesMap[inst.id] = { name: inst.name, sent: 0, received: 0, delivered: 0 };
        }
        if (m.sender === 'me') {
          instancesMap[inst.id].sent++;
          if (m.status === 'delivered') instancesMap[inst.id].delivered++;
        } else {
          instancesMap[inst.id].received++;
        }
      });

      const performanceTable = Object.values(instancesMap).map((inst: any) => ({
        name: inst.name,
        traffic: `${inst.sent} / ${inst.received}`,
        success: inst.sent > 0 ? ((inst.delivered / inst.sent) * 100).toFixed(1) + '%' : '100%',
        delay: '4s',
        status: inst.sent > 10 ? 'Excelente' : 'Normal'
      }));
      setInstancePerformance(performanceTable);

      setMetrics({
        deliveryRate,
        conversion,
        avgResponseTime,
        engagement
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="text-xl font-black text-slate-400 animate-pulse">Processando métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Taxa de Entrega', value: metrics.deliveryRate, icon: <CheckCircle />, color: 'emerald' },
          { label: 'Conversão', value: metrics.conversion, icon: <TrendingUp />, color: 'indigo' },
          { label: 'Tempo de Resposta', value: metrics.avgResponseTime, icon: <Clock />, color: 'amber' },
          { label: 'Engajamento', value: metrics.engagement, icon: <Heart />, color: 'rose' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center gap-4">
            <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
              stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                stat.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                  'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
              }`}>
              {React.cloneElement(stat.icon as React.ReactElement, { size: 24 })}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold dark:text-white">Fluxo de Mensagens (24h)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Volume de entrada vs saída por horário</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
              <button className="px-4 py-1.5 text-[10px] font-bold rounded-lg bg-white dark:bg-slate-600 shadow-sm dark:text-white">Hoje</button>
              <button onClick={fetchAnalytics} className="px-4 py-1.5 text-[10px] font-bold rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white">Atualizar</button>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="sent" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#sentGrad)" name="Sent" />
                <Area type="monotone" dataKey="received" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#receivedGrad)" name="Received" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h2 className="text-xl font-bold dark:text-white mb-2">Eficiência por Setor</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">Participação no volume total</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={sectorData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-6">
            {sectorData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="text-sm font-black dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance List */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Desempenho de Instâncias</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Detalhamento de performance individual (24h)</p>
          </div>
          <button className="flex items-center gap-2 text-primary-light dark:text-emerald-400 text-sm font-black hover:underline">
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instância</th>
                <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent/Rec</th>
                <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sucesso</th>
                <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Delay</th>
                <th className="text-right px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {instancePerformance.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-slate-500">{row.traffic}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{row.success}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-slate-500">{row.delay}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${row.status === 'Excelente' ? 'bg-emerald-100 text-emerald-600' :
                      row.status === 'Normal' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {instancePerformance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold">Nenhuma atividade registrada nas últimas 24h</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
