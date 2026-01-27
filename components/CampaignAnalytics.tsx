import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import { Send, AlertCircle, CheckCircle2, BarChart3, TrendingUp } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    total_messages: number;
    sent_messages: number;
    error_messages: number;
    status: string;
    created_at: string;
}

interface CampaignAnalyticsProps {
    campaigns: Campaign[];
}

const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({ campaigns }) => {
    // 1. Calculate KPIs
    const totalSent = campaigns.reduce((acc, curr) => acc + curr.sent_messages, 0);
    const totalErrors = campaigns.reduce((acc, curr) => acc + curr.error_messages, 0);
    const totalMessages = totalSent + totalErrors; // Or use total_messages from campaign if accurate
    const successRate = totalMessages > 0 ? ((totalSent / totalMessages) * 100).toFixed(1) : '0';

    // 2. Prepare Data for Charts

    // Bar Chart: Last 5 Campaigns Performance
    const campaignsData = campaigns
        .slice(0, 5)
        .map(c => ({
            name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
            Enviados: c.sent_messages,
            Falhas: c.error_messages,
            Total: c.total_messages
        }))
        .reverse();

    // Pie Chart: Overall Status Distribution
    const pieData = [
        { name: 'Sucesso', value: totalSent, fill: '#10b981' }, // emerald-500
        { name: 'Falhas', value: totalErrors, fill: '#f43f5e' }, // rose-500
    ].filter(d => d.value > 0);

    // Area Chart: Volume over time (grouped by day)
    // Group campaigns by date
    const volumeByDate = campaigns.reduce((acc: any, curr) => {
        const date = new Date(curr.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (!acc[date]) {
            acc[date] = { date, sent: 0, errors: 0 };
        }
        acc[date].sent += curr.sent_messages;
        acc[date].errors += curr.error_messages;
        return acc;
    }, {});

    // Convert object to array and maximize to last 7 entries
    const timeData = Object.values(volumeByDate).reverse().slice(-7) as any[];


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Send className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500">Total</span>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalSent.toLocaleString()}</h3>
                        <p className="text-xs font-medium text-slate-400">Mensagens enviadas</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-rose-500" />
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500">Falhas</span>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalErrors.toLocaleString()}</h3>
                        <p className="text-xs font-medium text-slate-400">Erros de envio</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500">Taxa</span>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{successRate}%</h3>
                        <p className="text-xs font-medium text-slate-400">Taxa de entrega</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-violet-500" />
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500">Campanhas</span>
                    </div>
                    <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{campaigns.length}</h3>
                        <p className="text-xs font-medium text-slate-400">Total criado</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Bar Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Desempenho Recente</h3>
                            <p className="text-xs font-medium text-slate-400">Últimas 5 campanhas</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={campaignsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Enviados" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="Falhas" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative">
                    <div className="mb-6 w-full text-left">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Taxa de Sucesso</h3>
                        <p className="text-xs font-medium text-slate-400">Visão geral de entregas</p>
                    </div>
                    <div className="flex-1 min-h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center Text Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8 pl-[6px]">
                            <div className="text-center">
                                <span className="text-2xl font-black text-slate-900 dark:text-white block">{successRate}%</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Area Chart: Volume History */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="mb-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Volume de Envios</h3>
                    <p className="text-xs font-medium text-slate-400">Histórico de atividade diária</p>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSent)" name="Enviados" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default CampaignAnalytics;
