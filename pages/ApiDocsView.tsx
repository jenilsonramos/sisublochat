import React, { useState } from 'react';
import { Book, Code, Terminal, Key, Globe, MessageSquare, Webhook, Copy, Check, Clock } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

const ApiDocsView: React.FC = () => {
    const { showToast } = useToast();
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

    const handleCopy = (text: string, index: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        showToast('Copiado para a área de transferência', 'success');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const CodeBlock = ({ code, language, index }: { code: string, language: string, index: string }) => (
        <div className="relative group mt-4">
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => handleCopy(code, index)}
                    className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                >
                    {copiedIndex === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl overflow-x-auto font-mono text-sm leading-relaxed border border-slate-800 shadow-inner custom-scrollbar">
                <code className={`language-${language}`}>{code}</code>
            </pre>
        </div>
    );

    return (
        <div className="max-w-[1200px] mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Intro Header */}
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700/50 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
                    <div className="w-24 h-24 bg-indigo-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
                        <Book className="w-12 h-12" />
                    </div>
                    <div className="space-y-4 text-center md:text-left">
                        <h1 className="text-4xl font-black dark:text-white tracking-tight">Documentação da API</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed max-w-2xl">
                            Integre o Evolution Leve com seus próprios sistemas, CRMs e plataformas externas de forma simples e segura.
                        </p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none">
                    <Globe className="w-64 h-64 -mr-20 -mt-20" />
                </div>
            </div>

            {/* Grid Documentation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Sidebar Navigation (Sticky) */}
                <div className="lg:col-span-3">
                    <div className="sticky top-8 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Tópicos</h3>
                        {[
                            { id: 'auth', label: 'Autenticação', icon: <Key className="w-4 h-4" /> },
                            { id: 'greeting', label: 'Saudações', icon: <Book className="w-4 h-4" /> },
                            { id: 'hours', label: 'Horários', icon: <Clock className="w-4 h-4" /> },
                            { id: 'send', label: 'Enviar Mensagem', icon: <MessageSquare className="w-4 h-4" /> },
                            { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-4 h-4" /> }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all font-bold group shadow-sm"
                            >
                                <span className="text-slate-400 group-hover:text-indigo-500 transition-colors uppercase">{item.icon}</span>
                                <span className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9 space-y-16">

                    {/* Authentication */}
                    <section id="auth" className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Key className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black dark:text-white">Autenticação</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-4 shadow-sm">
                            <p className="text-slate-600 dark:text-slate-300 font-medium">Todas as requisições devem incluir sua **API Key** no cabeçalho `apikey`. Você pode encontrar sua chave nas configurações do sistema.</p>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-l-4 border-amber-500 flex items-center gap-4">
                                <span className="font-mono text-xs font-bold text-slate-500 shrink-0">HEADER:</span>
                                <code className="text-amber-600 dark:text-amber-400 font-bold">apikey: SEU_TOKEN_AQUI</code>
                            </div>
                        </div>
                    </section>

                    {/* Greeting Messages Integration */}
                    <section id="greeting" className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Book className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black dark:text-white">Saudações (Integração API)</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6 shadow-sm">
                            <p className="text-slate-600 dark:text-slate-300 font-medium">As saudações são automatizadas via banco de dados. Para gerenciar externamente, utilize a tabela <code>chatbots</code> com o tipo <code>GREETING</code>.</p>
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Requisição cURL (Sistema)</h4>
                                <CodeBlock
                                    index="curl-greeting"
                                    language="bash"
                                    code={`curl --location --request POST 'https://api.ublochat.com.br/config/greeting' \\
--header 'Authorization: Bearer SEU_TOKEN_JWT' \\
--header 'Content-Type: application/json' \\
--data-raw '{
  "name": "Saudação API",
  "status": "ACTIVE",
  "trigger": "cooldown:24",
  "steps": [
    {
      "type": "text",
      "content": "Olá {{primeiro_nome}}, bem-vindo!",
      "delay": 2,
      "order": 1
    }
  ]
}'`}
                                />
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-l-4 border-emerald-500 text-sm">
                                <strong>Dica Técnica:</strong> Para resetar todas as saudações via API, utilize o endpoint <code>/config/reset-greeting</code> (POST).
                            </div>
                        </div>
                    </section>

                    {/* Business Hours Integration */}
                    <section id="hours" className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Clock className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black dark:text-white">Horário de Atendimento (Integração API)</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6 shadow-sm">
                            <p className="text-slate-600 dark:text-slate-300 font-medium">Controle a disponibilidade do atendimento através da tabela <code>business_hours</code>.</p>
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Requisição cURL (Sistema)</h4>
                                <CodeBlock
                                    index="curl-hours"
                                    language="bash"
                                    code={`curl --location --request POST 'https://api.ublochat.com.br/config/business-hours' \\
--header 'Authorization: Bearer SEU_TOKEN_JWT' \\
--header 'Content-Type: application/json' \\
--data-raw '{
  "enabled": true,
  "timezone": "America/Sao_Paulo",
  "away_message": "Estamos ausentes.",
  "monday_enabled": true,
  "monday_start": "08:00:00",
  "monday_end": "18:00:00"
}'`}
                                />
                            </div>
                        </div>
                    </section>
                    <section id="send" className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black dark:text-white">Enviar Mensagem de Texto</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg uppercase">POST</span>
                                <code className="text-sm font-bold text-slate-500">/message/sendText/{"{instancia}"}</code>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Requisição cURL</h4>
                                <CodeBlock
                                    index="curl-send"
                                    language="bash"
                                    code={`curl --location --request POST 'https://api.ublochat.com.br/message/sendText/SUA_INSTANCIA' \\
--header 'apikey: SEU_TOKEN_AQUI' \\
--header 'Content-Type: application/json' \\
--data-raw '{
    "number": "5511999999999",
    "text": "Olá! Esta é uma mensagem de teste via API.",
    "delay": 1200
}'`}
                                />
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Exemplo JavaScript (Fetch)</h4>
                                <CodeBlock
                                    index="js-send"
                                    language="javascript"
                                    code={`const options = {
  method: 'POST',
  headers: {
    'apikey': 'SEU_TOKEN_AQUI',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    number: '5511999999999',
    text: 'Olá mundo!',
    delay: 1000
  })
};

fetch('https://api.ublochat.com.br/message/sendText/MINHA_INSTANCIA', options)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Webhooks */}
                    <section id="webhooks" className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Webhook className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black dark:text-white">Webhooks</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 space-y-6 shadow-sm">
                            <p className="text-slate-600 dark:text-slate-300 font-medium">
                                Receba notificações em tempo real sempre que uma nova mensagem chegar ou o status da sua conexão mudar.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl space-y-2 border border-slate-100 dark:border-slate-700/50">
                                    <h5 className="font-bold dark:text-white">MESSAGES_UPSERT</h5>
                                    <p className="text-xs text-slate-500 font-medium">Acionado quando uma nova mensagem é recebida ou enviada.</p>
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl space-y-2 border border-slate-100 dark:border-slate-700/50">
                                    <h5 className="font-bold dark:text-white">CONNECTION_UPDATE</h5>
                                    <p className="text-xs text-slate-500 font-medium">Notifica quando a instância conecta ou desconecta.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Exemplo de Payload (Webhook)</h4>
                                <CodeBlock
                                    index="webhook-payload"
                                    language="json"
                                    code={`{
  "event": "messages.upsert",
  "instanceId": "77bacb98...",
  "data": {
    "key": {
      "remoteJid": "5511988887777@s.whatsapp.net",
      "fromMe": false,
      "id": "ABCD1234EFGH"
    },
    "message": {
      "conversation": "Qual o horário de atendimento?"
    },
    "pushName": "João Silva"
  }
}`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Footer Card */}
                    <div className="bg-gradient-to-br from-indigo-500 to-primary p-10 rounded-[3rem] text-white space-y-6 shadow-2xl shadow-indigo-500/20">
                        <h3 className="text-2xl font-black">Precisa de auxílio avançado?</h3>
                        <p className="font-medium text-white/80 max-w-xl leading-relaxed">
                            Nossa equipe técnica pode ajudar no desenvolvimento de integrações personalizadas para sua empresa. Entre em contato através do nosso canal de suporte.
                        </p>
                        <button className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-slate-50 transition-all transform active:scale-95 shadow-xl shadow-black/10">
                            Falar com Especialista
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ApiDocsView;
