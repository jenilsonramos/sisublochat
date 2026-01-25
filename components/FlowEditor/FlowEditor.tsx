import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import {
    ReactFlow,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    type NodeTypes,
    Panel,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
    Save,
    X,
    MessageSquare,
    GitBranch,
    Clock,
    CircleDot,
    StopCircle,
    GripVertical,
    Database,
    Code2,
    Trash2,
    Settings2,
    Type,
    Image,
    Play,
    Link2,
    AlertCircle,
    Upload,
    FileText,
    MessageCircle,
    Hash,
    Copy,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Sun,
    Moon,
    HelpCircle,
    UserCog,
    Lock,
    Globe
} from 'lucide-react';

// Import custom nodes
import StartNode from './nodes/StartNode';
import MessageNode from './nodes/MessageNode';
import ConditionNode from './nodes/ConditionNode';
import DelayNode from './nodes/DelayNode';
import ApiNode from './nodes/ApiNode';
import EndNode from './nodes/EndNode';
import QuestionNode from './nodes/QuestionNode';
import AgentNode from './nodes/AgentNode';
import DatabaseNode from './nodes/DatabaseNode';
import SwitchNode from './nodes/SwitchNode';
import SetVariableNode from './nodes/SetVariableNode';
import CodeNode from './nodes/CodeNode';
// { Split, Save, Code2 } already imported above
import AiNode from './nodes/AiNode';
import TagNode from './nodes/TagNode';
import NotificationNode from './nodes/NotificationNode';
import ScheduleNode from './nodes/ScheduleNode';
import MercadoPagoNode from './nodes/MercadoPagoNode';
import AudioNode from './nodes/AudioNode';
import SheetsNode from './nodes/SheetsNode';
import RandomNode from './nodes/RandomNode';
import { Split, Bot, Tag, Bell, CalendarClock, QrCode, Mic, FileSpreadsheet, Dices } from 'lucide-react';
// Import custom edges
import CustomEdge from './edges/CustomEdge';

interface FlowEditorProps {
    flow: {
        id: string;
        name: string;
        nodes: Node[];
        edges: Edge[];
    };
    onSave: (nodes: Node[], edges: Edge[]) => void;
    onClose: () => void;
}

const nodeTypes: NodeTypes = {
    start: StartNode,
    message: MessageNode,
    condition: ConditionNode,
    delay: DelayNode,
    api: ApiNode,
    end: EndNode,
    question: QuestionNode,
    agent: AgentNode,
    database: DatabaseNode,
    switch: SwitchNode,
    set_variable: SetVariableNode,
    code: CodeNode,
    ai: AiNode,
    tag: TagNode,
    notification: NotificationNode,
    schedule: ScheduleNode,
    mercadopago: MercadoPagoNode,
    audio_transcription: AudioNode,
    sheets: SheetsNode,
    random: RandomNode,
};

const edgeTypes = {
    default: CustomEdge,
};

const nodeConfig = [
    { type: 'start', label: 'Início', icon: CircleDot, color: 'emerald' },
    { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'blue' },
    { type: 'question', label: 'Pergunta', icon: HelpCircle, color: 'amber' },
    { type: 'condition', label: 'Condição', icon: GitBranch, color: 'orange' },
    { type: 'switch', label: 'Switch', icon: Split, color: 'violet' },
    { type: 'set_variable', label: 'Definir Var', icon: Save, color: 'pink' },
    { type: 'code', label: 'Código', icon: Code2, color: 'gray' },
    { type: 'ai', label: 'IA (LLM)', icon: Bot, color: 'fuchsia' },
    { type: 'tag', label: 'Etiqueta', icon: Tag, color: 'rose' },
    { type: 'notification', label: 'Notificar', icon: Bell, color: 'yellow' },
    { type: 'schedule', label: 'Horário', icon: CalendarClock, color: 'cyan' },
    { type: 'random', label: 'Teste A/B', icon: Dices, color: 'orange' },
    { type: 'mercadopago', label: 'Pagamento PIX', icon: QrCode, color: 'sky' },
    { type: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet, color: 'emerald' },
    { type: 'audio_transcription', label: 'Transcrever Áudio', icon: Mic, color: 'indigo' },
    { type: 'delay', label: 'Delay', icon: Clock, color: 'purple' },
    { type: 'api', label: 'API', icon: Code2, color: 'indigo' },
    { type: 'database', label: 'Banco de Dados', icon: Database, color: 'cyan' },
    { type: 'agent', label: 'Atendente', icon: UserCog, color: 'indigo' },
    { type: 'end', label: 'Fim', icon: StopCircle, color: 'rose' },
];

const TableOpPayloadInputs = ({ data, selectedNodeId, updateNodeData }: any) => (
    <>
        <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Tabela
            </label>
            <input
                type="text"
                value={data.table || ''}
                onChange={(e) => updateNodeData(selectedNodeId, { table: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                placeholder="ex: agendamentos"
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Operação
            </label>
            <select
                value={data.operation || 'SELECT'}
                onChange={(e) => updateNodeData(selectedNodeId, { operation: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            >
                <option value="SELECT">Buscar (SELECT)</option>
                <option value="INSERT">Criar (INSERT)</option>
                <option value="UPDATE">Atualizar (UPDATE)</option>
            </select>
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Dados / Filtros (JSON)
            </label>
            <textarea
                value={data.payload || ''}
                onChange={(e) => updateNodeData(selectedNodeId, { payload: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono h-32"
                placeholder={data.operation === 'SELECT' ? '{"phone": "{{phone}}"}' : '{"name": "{{name}}", "phone": "{{phone}}", "status": "pendente"}'}
            />
            <p className="text-[10px] text-slate-500 mt-1 italic">
                Use {"{{variável}}"} para injetar valores.
            </p>
        </div>
    </>
);

const FlowEditorInner: React.FC<FlowEditorProps> = ({ flow, onSave, onClose }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const [nodes, setNodes] = useState<Node[]>(flow.nodes || []);
    const [edges, setEdges] = useState<Edge[]>(flow.edges || []);
    const [isDirty, setIsDirty] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [dbUnlocked, setDbUnlocked] = useState(false);
    const [dbPassword, setDbPassword] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning'; visible: boolean }>({ message: '', type: 'warning', visible: false });
    const [agents, setAgents] = useState<{ id: string; full_name: string }[]>([]);

    // Fetch agents (profiles with role OPERATOR)
    useEffect(() => {
        const fetchAgents = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'OPERATOR')
                .eq('status', 'ACTIVE');

            if (!error && data) {
                setAgents(data);
            }
        };
        fetchAgents();
    }, []);

    // Show toast notification
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'warning') => {
        setToast({ message, type, visible: true });
    }, []);

    // Auto-hide toast after 3 seconds
    React.useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => {
                setToast(prev => ({ ...prev, visible: false }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    // Validation Hooks
    const { limits } = usePlanLimits();
    const [aiSettings, setAiSettings] = useState<{ enabled: boolean; api_key: string } | null>(null);

    // Fetch AI Settings
    useEffect(() => {
        const fetchSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('ai_settings').select('enabled, api_key').eq('user_id', user.id).single();
                setAiSettings(data);
            }
        };
        fetchSettings();
    }, []);

    const selectedNode = useMemo(() => {
        return nodes.find(n => n.id === selectedNodeId) || null;
    }, [nodes, selectedNodeId]);

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
            setIsDirty(true);
        },
        []
    );

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));
            setIsDirty(true);
        },
        []
    );

    const onConnect: OnConnect = useCallback(
        (connection) => {
            setEdges((eds) => addEdge({
                ...connection,
                animated: true,
                style: { stroke: '#6366f1', strokeWidth: 2 }
            }, eds));
            setIsDirty(true);
        },
        []
    );

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // Delete edge when clicked
    const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        setIsDirty(true);
        showToast('Conexão removida', 'success');
    }, [showToast]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            // Prevent adding more than one Start node
            if (type === 'start') {
                const hasStartNode = nodes.some(node => node.type === 'start');
                if (hasStartNode) {
                    showToast('Só é permitido um Ponto de Entrada por fluxo!', 'warning');
                    return;
                }
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const defaultData: Record<string, any> = {
                start: { label: 'Início', triggerType: 'new_message' },
                message: { content: '', messageType: 'text' },
                condition: { condition: '', variable: '' },
                delay: { delay: 5 },
                api: { url: '', method: 'GET', headers: '' },
                end: { label: 'Fim' },
            };

            const newNode: Node = {
                id: `${type}_${Date.now()}`,
                type,
                position,
                data: defaultData[type] || { label: type },
            };

            setNodes((nds) => [...nds, newNode]);
            setIsDirty(true);
            setSelectedNodeId(newNode.id);
        },
        [screenToFlowPosition, nodes]
    );

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const updateNodeData = useCallback((nodeId: string, newData: any) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...newData } }
                    : node
            )
        );
        setIsDirty(true);
    }, []);

    const deleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedNodeId(null);
        setIsDirty(true);
    }, []);

    const duplicateNode = useCallback((node: Node) => {
        const newNode: Node = {
            ...node,
            id: `${node.type}_${Date.now()}`,
            position: {
                x: node.position.x + 50,
                y: node.position.y + 50,
            },
            data: { ...node.data },
            selected: false,
        };
        setNodes((nds) => [...nds, newNode]);
        setSelectedNodeId(newNode.id);
        setIsDirty(true);
    }, []);

    const handleSave = () => {
        onSave(nodes, edges);
        setIsDirty(false);
    };

    // Render properties panel based on node type
    const renderPropertiesPanel = () => {
        if (!selectedNode) return null;

        const nodeType = selectedNode.type;
        const data = selectedNode.data || {};

        return (
            <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 shrink-0 overflow-y-auto animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                            <Settings2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Propriedades</h3>
                            <p className="text-xs text-slate-400">{nodeConfig.find(n => n.type === nodeType)?.label || nodeType}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedNodeId(null)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Message Node */}
                    {nodeType === 'message' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Tipo de Mensagem
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'text', icon: Type, label: 'Texto' },
                                        { value: 'image', icon: Image, label: 'Imagem' },
                                        { value: 'audio', icon: Play, label: 'Áudio' },
                                        { value: 'document', icon: FileText, label: 'Documento' },
                                    ].map((type) => (
                                        <button
                                            key={type.value}
                                            onClick={() => updateNodeData(selectedNode.id, { messageType: type.value, file: null, fileName: '' })}
                                            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${data.messageType === type.value
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                }`}
                                        >
                                            <type.icon className="w-4 h-4" />
                                            <span className="text-[10px] font-bold">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Text Content */}
                            {data.messageType === 'text' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Conteúdo da Mensagem
                                    </label>
                                    <textarea
                                        value={data.content || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, { content: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                        placeholder="Digite sua mensagem..."
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Dica: Use {"{{variavel}}"} para personalizar a mensagem com dados coletados (ex: {"{{nome}}"})</p>
                                </div>
                            )}

                            {/* File Upload for Image/Audio/Document */}
                            {(data.messageType === 'image' || data.messageType === 'audio' || data.messageType === 'document') && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        {data.messageType === 'image' ? 'Selecionar Imagem' :
                                            data.messageType === 'audio' ? 'Selecionar Áudio' : 'Selecionar Documento'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept={
                                                data.messageType === 'image' ? 'image/*' :
                                                    data.messageType === 'audio' ? 'audio/*' :
                                                        '.pdf,.doc,.docx,.xls,.xlsx,.txt'
                                            }
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        updateNodeData(selectedNode.id, {
                                                            fileData: event.target?.result,
                                                            fileName: file.name,
                                                            fileType: file.type,
                                                            fileSize: file.size
                                                        });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="hidden"
                                            id={`file-upload-${selectedNode.id}`}
                                        />
                                        <label
                                            htmlFor={`file-upload-${selectedNode.id}`}
                                            className="w-full px-4 py-4 bg-slate-900 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl text-slate-400 text-sm cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                                        >
                                            <Upload className="w-6 h-6" />
                                            <span className="text-xs font-bold">Clique para enviar</span>
                                        </label>
                                    </div>

                                    {/* File Preview */}
                                    {data.fileName && (
                                        <div className="mt-3 p-3 bg-slate-900 rounded-xl border border-slate-700">
                                            <div className="flex items-center gap-3">
                                                {data.messageType === 'image' && data.fileData && (
                                                    <img src={data.fileData} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                                                )}
                                                {data.messageType !== 'image' && (
                                                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                        {data.messageType === 'audio' ? <Play className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{data.fileName}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {data.fileSize ? `${(data.fileSize / 1024).toFixed(1)} KB` : ''}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => updateNodeData(selectedNode.id, { fileData: null, fileName: '', fileType: '', fileSize: 0 })}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Caption for media */}
                            {(data.messageType === 'image' || data.messageType === 'audio' || data.messageType === 'document') && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Legenda (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.caption || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, { caption: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Adicione uma legenda..."
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Delay Node */}
                    {nodeType === 'delay' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                Tempo de Espera (segundos)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="300"
                                value={data.delay || 5}
                                onChange={(e) => updateNodeData(selectedNode.id, { delay: parseInt(e.target.value) || 5 })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                            <p className="text-xs text-slate-500 mt-2">Aguarda antes de seguir para o próximo passo</p>
                        </div>
                    )}

                    {/* Condition Node */}
                    {nodeType === 'condition' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Variável
                                </label>
                                <input
                                    type="text"
                                    value={data.variable || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                    placeholder="Ex: {{mensagem}}"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Condição
                                </label>
                                <input
                                    type="text"
                                    value={data.condition || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                    placeholder="Ex: contém 'sim'"
                                />
                                <p className="text-xs text-slate-500 mt-2">Operadores: contém, igual, diferente, maior, menor</p>
                            </div>
                        </>
                    )}

                    {/* API Node */}
                    {nodeType === 'api' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Método HTTP
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['GET', 'POST', 'PUT', 'DELETE'].map((method) => (
                                        <button
                                            key={method}
                                            onClick={() => updateNodeData(selectedNode.id, { method })}
                                            className={`p-2 rounded-lg text-xs font-bold transition-all ${data.method === method
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    URL da API
                                </label>
                                <input
                                    type="text"
                                    value={data.url || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Ex: https://api.invertexto.com/v1/cep/{{cep}}?token=..."
                                />
                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                    Use {"{{variável}}"} para passar dados para a API.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Headers (JSON)
                                </label>
                                <textarea
                                    value={data.headers || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { headers: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                    placeholder='{"Authorization": "Bearer ..."}'
                                />
                                <p className="text-[10px] text-slate-500 mt-2">
                                    Dica: Respostas JSON (como campos de CEP) são salvas automaticamente como variáveis (ex: {"{{city}}"}) para uso nos próximos nós.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Database Node Config */}
                    {/* Database Node Config */}
                    {nodeType === 'database' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Connection Type Selector - ALWAYS VISIBLE */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Tipo de Conexão
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => {
                                            updateNodeData(selectedNode.id, { connectionType: 'local' });
                                            setDbUnlocked(false); // Relock when switching to local
                                        }}
                                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2 ${data.connectionType === 'local' || !data.connectionType
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                            : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'
                                            }`}
                                    >
                                        <Database className="w-4 h-4" />
                                        <span className="text-[10px] font-bold">Local</span>
                                    </button>
                                    <button
                                        onClick={() => updateNodeData(selectedNode.id, { connectionType: 'external' })}
                                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2 ${data.connectionType === 'external'
                                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                            : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'
                                            }`}
                                    >
                                        <Globe className="w-4 h-4" />
                                        <span className="text-[10px] font-bold">Postgres</span>
                                    </button>
                                    <button
                                        onClick={() => updateNodeData(selectedNode.id, { connectionType: 'mysql' })}
                                        className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2 ${data.connectionType === 'mysql'
                                            ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                            : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'
                                            }`}
                                    >
                                        <Database className="w-4 h-4" />
                                        <span className="text-[10px] font-bold">MySQL</span>
                                    </button>
                                </div>
                            </div>

                            {/* Local Connection - Password Protected */}
                            {(data.connectionType === 'local' || !data.connectionType) && (
                                !dbUnlocked ? (
                                    <div className="p-4 bg-slate-900 rounded-xl border border-rose-500/20">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 text-rose-400">
                                                <Lock className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Área Protegida</span>
                                            </div>
                                            <input
                                                type="password"
                                                value={dbPassword}
                                                onChange={(e) => setDbPassword(e.target.value)}
                                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                                placeholder="Senha de Admin"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (dbPassword === '125714Ab#') {
                                                        setDbUnlocked(true);
                                                        setDbPassword('');
                                                        showToast('Acesso concedido', 'success');
                                                    } else {
                                                        showToast('Senha incorreta', 'error');
                                                    }
                                                }}
                                                className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all"
                                            >
                                                Desbloquear
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Unlocked Content (Local) - Just table/op/payload
                                    <>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setDbUnlocked(false)}
                                                className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                                            >
                                                Bloquear
                                            </button>
                                        </div>
                                        <TableOpPayloadInputs
                                            data={data}
                                            selectedNodeId={selectedNode.id}
                                            updateNodeData={updateNodeData}
                                        />
                                    </>
                                )
                            )}

                            {/* External Connections (Postgres/MySQL) - Open */}
                            {(data.connectionType === 'external' || data.connectionType === 'mysql') && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                            String de Conexão
                                        </label>
                                        <textarea
                                            value={data.connectionString || ''}
                                            onChange={(e) => updateNodeData(selectedNode.id, { connectionString: e.target.value })}
                                            rows={2}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                            placeholder={data.connectionType === 'mysql' ? "mysql://user:password@host:port/db" : "postgresql://user:password@host:port/db"}
                                        />
                                        <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Cuidado: Credenciais ficarão salvas no fluxo.
                                        </p>
                                    </div>
                                    <TableOpPayloadInputs
                                        data={data}
                                        selectedNodeId={selectedNode.id}
                                        updateNodeData={updateNodeData}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Switch Node Config */}
                    {nodeType === 'switch' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                Variável para testar
                            </label>
                            <input
                                type="text"
                                value={data.variable || ''}
                                onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all mb-4"
                                placeholder="ex: department"
                            />

                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                Casos (Condições)
                            </label>
                            <div className="space-y-2">
                                {(data.cases || []).map((c: any, index: number) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={c.condition}
                                            onChange={(e) => {
                                                const newCases = [...(data.cases || [])];
                                                newCases[index].condition = e.target.value;
                                                updateNodeData(selectedNode.id, { cases: newCases });
                                            }}
                                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                            placeholder="Valor ex: financeiro"
                                        />
                                        <button
                                            onClick={() => {
                                                const newCases = data.cases.filter((_: any, i: number) => i !== index);
                                                updateNodeData(selectedNode.id, { cases: newCases });
                                            }}
                                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const newCases = [...(data.cases || []), { condition: '' }];
                                        updateNodeData(selectedNode.id, { cases: newCases });
                                    }}
                                    className="w-full py-2 border-2 border-dashed border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400 rounded-lg text-xs font-bold transition-all"
                                >
                                    + Adicionar Caso
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Set Variable Node Config */}
                    {nodeType === 'set_variable' && (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Nome da Variável
                                </label>
                                <input
                                    type="text"
                                    value={data.variable || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                                    placeholder="ex: status_cliente"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Valor
                                </label>
                                <input
                                    type="text"
                                    value={data.value || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                                    placeholder="ex: vip"
                                />
                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                    Pode usar {"{{outra_var}}"} aqui.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Code Node Config */}
                    {nodeType === 'code' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                Nome do Script
                            </label>
                            <input
                                type="text"
                                value={data.name || ''}
                                onChange={(e) => updateNodeData(selectedNode.id, { name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all mb-4"
                                placeholder="ex: Formatar CPF"
                            />

                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                Código Javascript
                            </label>
                            <div className="relative">
                                <textarea
                                    value={data.code || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { code: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all resize-none h-64"
                                    placeholder={`// Exemplo:
// const cpf = vars.cpf;
// return { cpf_formatted: cpf.replace(...) };

return { status: 'ok' };`}
                                />
                                <div className="absolute bottom-2 right-2">
                                    <a href="https://developer.mozilla.org/pt-BR/docs/Web/JavaScript" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-white transition-colors">
                                        <HelpCircle className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Variáveis disponíveis em <code>vars</code>. Retorne um objeto para salvar novas variáveis.
                            </p>
                        </div>
                    )}

                    {/* AI Node Config */}
                    {nodeType === 'ai' && (
                        <div className="space-y-4">
                            {/* Validation Alerts */}
                            {(!limits?.ai_enabled) && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                                    <Lock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-rose-400">Recurso Indisponível</p>
                                        <p className="text-[10px] text-rose-300 mt-0.5">
                                            Seu plano atual não inclui Inteligência Artificial.
                                            Por favor, atualize seu plano ou remova este nó.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(limits?.ai_enabled && (!aiSettings?.enabled || !aiSettings?.api_key)) && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-500">IA Não Configurada</p>
                                        <p className="text-[10px] text-amber-300 mt-0.5">
                                            A inteligência artificial está ativa no plano, mas não foi configurada nas configurações do sistema.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Prompt do Sistema
                                </label>
                                <textarea
                                    value={data.system_prompt || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { system_prompt: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all h-32 resize-none"
                                    placeholder="Ex: Você é um especialista em vendas. Analise a mensagem do cliente..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Input (Mensagem do Usuário)
                                </label>
                                <input
                                    type="text"
                                    value={data.input || '{{last_message}}'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { input: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Variável de Saída
                                </label>
                                <input
                                    type="text"
                                    value={data.output_variable || 'ai_response'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { output_variable: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                                    placeholder="ex: ai_result"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Onde salvar a resposta da IA.</p>
                            </div>
                        </div>
                    )}

                    {/* Tag Node Config */}
                    {nodeType === 'tag' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                Ação
                            </label>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    onClick={() => updateNodeData(selectedNode.id, { action: 'add' })}
                                    className={`p-2 rounded-lg text-xs font-bold transition-all ${data.action !== 'remove' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                >
                                    Adicionar
                                </button>
                                <button
                                    onClick={() => updateNodeData(selectedNode.id, { action: 'remove' })}
                                    className={`p-2 rounded-lg text-xs font-bold transition-all ${data.action === 'remove' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                >
                                    Remover
                                </button>
                            </div>

                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                Nome da Tag
                            </label>
                            <input
                                type="text"
                                value={data.tag || ''}
                                onChange={(e) => updateNodeData(selectedNode.id, { tag: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                                placeholder="ex: cliente_vip"
                            />
                        </div>
                    )}

                    {/* Notification Node Config */}
                    {nodeType === 'notification' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Telefone Destino
                                </label>
                                <input
                                    type="text"
                                    value={data.phone || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                    placeholder="5511999999999"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Para quem enviar o alerta interno.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Mensagem
                                </label>
                                <textarea
                                    value={data.message || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all h-24 resize-none"
                                    placeholder="Ex: Novo lead: {{name}}"
                                />
                            </div>
                        </div>
                    )}

                    {/* Schedule Node Config */}
                    {nodeType === 'schedule' && (
                        <div className="space-y-4">
                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                                <p className="text-xs text-cyan-400">
                                    Este nó verifica o horário atual. Se estiver dentro do horário definido, sai por <span className="font-bold text-emerald-400">Aberto</span>, senão sai por <span className="font-bold text-rose-400">Fechado</span>.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Horário de Início
                                </label>
                                <input
                                    type="time"
                                    value={data.startTime || '09:00'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { startTime: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Horário de Fim
                                </label>
                                <input
                                    type="time"
                                    value={data.endTime || '18:00'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { endTime: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    Dias da Semana
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'].map((day, idx) => (
                                        <button
                                            key={day}
                                            onClick={() => {
                                                const currentDays = data.days || [1, 2, 3, 4, 5];
                                                const newDays = currentDays.includes(idx)
                                                    ? currentDays.filter((d: number) => d !== idx)
                                                    : [...currentDays, idx];
                                                updateNodeData(selectedNode.id, { days: newDays });
                                            }}
                                            className={`p-2 rounded-lg text-[10px] font-bold uppercase transition-all ${(data.days || [1, 2, 3, 4, 5]).includes(idx)
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mercado Pago Config */}
                    {
                        nodeType === 'mercadopago' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                                    <p className="text-xs text-sky-400">
                                        Gera um código PIX. O fluxo aguarda até o pagamento ser confirmado via Webhook.
                                    </p>
                                </div>

                                {/* Credential Input */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Access Token (Mercado Pago)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            placeholder="APP_USR-..."
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all pr-10"
                                            onBlur={async (e) => {
                                                const token = e.target.value;
                                                if (token && token.startsWith('APP_USR')) {
                                                    const { data: { user } } = await supabase.auth.getUser();
                                                    if (user) {
                                                        const { error } = await supabase.from('integrations').upsert({
                                                            user_id: user.id,
                                                            type: 'mercadopago',
                                                            credentials: { access_token: token },
                                                            is_active: true
                                                        }, { onConflict: 'user_id,type' });

                                                        if (!error) showToast('Token salvo com sucesso!', 'success');
                                                        else showToast('Erro ao salvar token', 'error');
                                                    }
                                                }
                                            }}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Insira seu Token. Salvo automaticamente no banco.
                                    </p>
                                </div>

                                <div className="border-t border-slate-700/50 my-4"></div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Valor do PIX (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.value || 0}
                                        onChange={(e) => updateNodeData(selectedNode.id, { value: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Descrição
                                    </label>
                                    <input
                                        type="text"
                                        value={data.description || 'Pagamento'}
                                        onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        )
                    }

                    {/* Audio Transcription Config */}
                    {
                        nodeType === 'audio_transcription' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <p className="text-xs text-indigo-400">
                                        Se a mensagem anterior for um áudio, ele será transcrito usando Whisper (OpenAI).
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Variável de Saída
                                    </label>
                                    <input
                                        type="text"
                                        value={data.output_variable || 'transcription'}
                                        onChange={(e) => updateNodeData(selectedNode.id, { output_variable: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">O texto transcrito será salvo nesta variável.</p>
                                </div>
                            </div>
                        )
                    }

                    {/* Google Sheets Config */}
                    {
                        nodeType === 'sheets' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <p className="text-xs text-emerald-400">
                                        Adiciona uma linha na planilha. Configure suas credenciais nas Integrações.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Spreadsheet ID
                                    </label>
                                    <input
                                        type="text"
                                        value={data.spreadsheetId || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, { spreadsheetId: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder="ID da Planilha (da URL)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Dados (JSON)
                                    </label>
                                    <textarea
                                        value={data.row_data || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, { row_data: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all h-32 resize-none"
                                        placeholder={'{"Nome": "{{name}}", "Telefone": "{{phone}}"}'}
                                    />
                                </div>
                            </div>
                        )
                    }

                    {/* Random Config */}
                    {
                        nodeType === 'random' && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                <p className="text-xs text-orange-400">
                                    Este nó divide o fluxo aleatoriamente (50/50). Útil para testes A/B. Não requer configuração.
                                </p>
                            </div>
                        )
                    }

                    {/* Start Node */}
                    {
                        nodeType === 'start' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Tipo de Gatilho
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => updateNodeData(selectedNode.id, { triggerType: 'new_message' })}
                                            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all border-2 ${data.triggerType === 'new_message' || !data.triggerType
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'
                                                }`}
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                            <span className="text-[11px] font-bold text-center">Nova Mensagem</span>
                                        </button>
                                        <button
                                            onClick={() => updateNodeData(selectedNode.id, { triggerType: 'keyword' })}
                                            className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all border-2 ${data.triggerType === 'keyword'
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'
                                                }`}
                                        >
                                            <Hash className="w-5 h-5" />
                                            <span className="text-[11px] font-bold text-center">Palavra-chave</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Cooldown Input (Only for Any Message) */}
                                {(data.triggerType === 'new_message' || !data.triggerType) && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                            Cooldown (Minutos)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.cooldown !== undefined ? data.cooldown : 360}
                                            onChange={(e) => updateNodeData(selectedNode.id, { cooldown: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            placeholder="Ex: 360"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">
                                            Tempo de espera para o mesmo contato iniciar o fluxo novamente (Padrão: 6h)
                                        </p>
                                    </div>
                                )}

                                {/* Keyword Input */}
                                {data.triggerType === 'keyword' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                            Palavra-chave
                                        </label>
                                        <input
                                            type="text"
                                            value={data.keyword || ''}
                                            onChange={(e) => updateNodeData(selectedNode.id, { keyword: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            placeholder="Ex: oi, olá, menu"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">Separe múltiplas palavras com vírgula</p>
                                    </div>
                                )}

                                {/* Info box */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-2">
                                    <div className="flex items-start gap-3 text-emerald-400">
                                        <CircleDot className="w-5 h-5 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm">Ponto de Entrada</p>
                                            <p className="text-xs opacity-70">
                                                {data.triggerType === 'keyword'
                                                    ? 'O fluxo inicia quando a palavra-chave é detectada'
                                                    : 'O fluxo inicia com qualquer nova mensagem'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    {/* Question Node */}
                    {
                        nodeType === 'question' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Pergunta
                                    </label>
                                    <textarea
                                        value={data.content || ''}
                                        onChange={(e) => updateNodeData(selectedNode.id, { content: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                                        placeholder="Ex: Qual é o seu nome?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Salvar resposta em
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500">
                                                <div className="font-bold text-xs">{"{{"}</div>
                                            </div>
                                            <input
                                                type="text"
                                                value={data.variable || ''}
                                                onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                                className="w-full pl-8 pr-8 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                                placeholder="nome, email, telefone..."
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500">
                                                <div className="font-bold text-xs">{"}}"}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">O sistema esperará a resposta do usuário e salvará nesta variável.</p>
                                </div>

                                {/* Info box */}
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-2">
                                    <div className="flex items-start gap-3 text-amber-400">
                                        <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm">Interação Obrigatória</p>
                                            <p className="text-xs opacity-70">O fluxo pausará até que o usuário responda à pergunta.</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    {/* Agent Node */}
                    {
                        nodeType === 'agent' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                        Selecionar Atendente
                                    </label>
                                    <select
                                        value={data.agentId || ''}
                                        onChange={(e) => {
                                            const agent = agents.find(a => a.id === e.target.value);
                                            updateNodeData(selectedNode.id, {
                                                agentId: e.target.value,
                                                agentName: agent?.full_name || 'Agente'
                                            });
                                        }}
                                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    >
                                        <option value="">Selecione um agente...</option>
                                        {agents.map((agent) => (
                                            <option key={agent.id} value={agent.id}>
                                                {agent.full_name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2">A conversa será transferida para este atendente e o robô será pausado.</p>
                                </div>

                                {/* Info box */}
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mt-2">
                                    <div className="flex items-start gap-3 text-indigo-400">
                                        <UserCog className="w-5 h-5 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm">Transferência Humana</p>
                                            <p className="text-xs opacity-70">O atendimento automatizado será encerrado para este contato.</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }

                    {/* End Node */}
                    {
                        nodeType === 'end' && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-3 text-rose-400">
                                    <StopCircle className="w-5 h-5" />
                                    <div>
                                        <p className="font-bold text-sm">Fim do Fluxo</p>
                                        <p className="text-xs opacity-70">Encerra a conversação</p>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >

                {/* Action Buttons */}
                {
                    nodeType !== 'start' && (
                        <div className="mt-8 pt-4 border-t border-slate-700 space-y-2">
                            <button
                                onClick={() => duplicateNode(selectedNode)}
                                className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <Copy className="w-4 h-4" />
                                Duplicar Componente
                            </button>
                            <button
                                onClick={() => deleteNode(selectedNode.id)}
                                className="w-full px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Excluir Componente
                            </button>
                        </div>
                    )
                }
            </div >
        );
    };

    // State for floating tooltip
    const [hoveredNode, setHoveredNode] = useState<{ label: string; y: number } | null>(null);

    // Custom Drag Start to fix "Whole screen" dragging
    const onNodeDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
        onDragStart(event, nodeType);

        // Create a custom drag image
        const ghost = document.createElement('div');
        ghost.textContent = label;
        ghost.style.background = isDarkMode ? '#1e293b' : '#ffffff';
        ghost.style.color = isDarkMode ? '#ffffff' : '#0f172a';
        ghost.style.padding = '8px 16px';
        ghost.style.borderRadius = '8px';
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        ghost.style.fontWeight = 'bold';
        ghost.style.fontSize = '12px';
        ghost.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        document.body.appendChild(ghost);

        event.dataTransfer.setDragImage(ghost, 0, 0);

        // Clean up
        setTimeout(() => {
            document.body.removeChild(ghost);
        }, 0);
    };

    return (
        <div className={`fixed inset-0 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'} z-50 flex flex-col transition-colors duration-300`}>
            {/* Header */}
            <div className={`h-16 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 shrink-0 transition-colors duration-300`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className={`p-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'} rounded-xl transition-all`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{flow.name}</h1>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Flow Builder Visual</p>
                    </div>
                    {isDirty && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded-full uppercase">
                            Não salvo
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`p-2.5 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-indigo-600'} rounded-xl transition-all`}
                        title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center gap-2 transition-all text-sm"
                    >
                        <Save className="w-4 h-4" />
                        Salvar
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* GLOBAL TOOLTIP (Lives outside overflow containers) */}
                {hoveredNode && isSidebarCollapsed && (
                    <div
                        className="fixed left-20 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-2xl z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: hoveredNode.y }}
                    >
                        {hoveredNode.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-slate-900"></div>
                    </div>
                )}

                {/* Node Palette */}
                <div className={`${isSidebarCollapsed ? 'w-[72px]' : 'w-64'} ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-r shrink-0 transition-all duration-300 flex flex-col relative`}>
                    {/* Toggle Button */}
                    <div className={`p-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} border-b`}>
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`w-full p-2.5 ${isDarkMode ? 'bg-slate-900/50 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900'} rounded-xl flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} transition-all`}
                        >
                            {!isSidebarCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Componentes</span>}
                            {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex-1 overflow-x-visible overflow-y-auto p-2 scrollbar-none">
                        <div className={`${isSidebarCollapsed ? 'space-y-1' : 'space-y-2'}`}>
                            {nodeConfig.map((node) => {
                                const Icon = node.icon;
                                return (
                                    <div
                                        key={node.type}
                                        draggable
                                        onDragStart={(e) => onNodeDragStart(e, node.type, node.label)}
                                        onMouseEnter={(e) => {
                                            if (isSidebarCollapsed) {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                // Center the tooltip relative to the item
                                                const centerY = rect.top + (rect.height / 2) - 15; // -15 approx half tooltip height
                                                setHoveredNode({ label: node.label, y: centerY });
                                            }
                                        }}
                                        onMouseLeave={() => setHoveredNode(null)}
                                        className={`relative group ${isSidebarCollapsed ? 'p-3' : 'p-4'} ${isDarkMode ? 'bg-slate-900/50 hover:bg-slate-700 border-slate-700/50' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} rounded-2xl cursor-grab active:cursor-grabbing transition-all border hover:border-${node.color}-500/50 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} select-none`}
                                    >
                                        <div className={`${isSidebarCollapsed ? 'w-9 h-9' : 'w-10 h-10'} bg-${node.color}-500/20 text-${node.color}-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        {!isSidebarCollapsed && (
                                            <>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{node.label}</p>
                                                    <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Arraste para adicionar</p>
                                                </div>
                                                <GripVertical className={`w-4 h-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Canvas */}
                <div ref={reactFlowWrapper} className={`flex-1 ${isDarkMode ? '' : 'bg-slate-50'}`}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onEdgeClick={onEdgeClick}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[20, 20]}
                        deleteKeyCode={['Backspace', 'Delete']}
                        defaultEdgeOptions={{
                            animated: true,
                            style: { stroke: '#6366f1', strokeWidth: 2 }
                        }}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            color={isDarkMode ? '#334155' : '#cbd5e1'}
                        />
                        <Controls
                            className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-lg'} border rounded-xl overflow-hidden`}
                            showZoom={true}
                            showFitView={true}
                            showInteractive={false}
                        />
                        <MiniMap
                            className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-lg'} border rounded-xl overflow-hidden`}
                            nodeColor="#6366f1"
                            maskColor={isDarkMode ? "rgba(0, 0, 0, 0.5)" : "rgba(148, 163, 184, 0.3)"}
                        />
                        <Panel position="top-center">
                            <div className={`${isDarkMode ? 'bg-slate-800/90 border-slate-700 text-slate-400' : 'bg-white/90 border-slate-200 text-slate-500 shadow-lg'} backdrop-blur-sm px-4 py-2 rounded-xl border text-xs font-medium`}>
                                {selectedNode ? 'Clique no canvas para desselecionar' : 'Arraste componentes ou clique em um nó para editar'}
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Properties Panel */}
                {renderPropertiesPanel()}
            </div>

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[300px] border backdrop-blur-sm ${toast.type === 'success'
                        ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
                        : toast.type === 'error'
                            ? 'bg-rose-900/90 border-rose-700 text-rose-100'
                            : 'bg-amber-900/90 border-amber-700 text-amber-100'
                        }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toast.type === 'success'
                            ? 'bg-emerald-500/30'
                            : toast.type === 'error'
                                ? 'bg-rose-500/30'
                                : 'bg-amber-500/30'
                            }`}>
                            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <p className="flex-1 font-bold text-sm">{toast.message}</p>
                        <button
                            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const FlowEditor: React.FC<FlowEditorProps> = (props) => {
    return (
        <ReactFlowProvider>
            <FlowEditorInner {...props} />
        </ReactFlowProvider>
    );
};

export default FlowEditor;
