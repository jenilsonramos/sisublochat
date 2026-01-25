import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { UserCog } from 'lucide-react';

const AgentNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeData = data as any;

    return (
        <div className={`relative group transition-all duration-300 ${selected ? 'scale-105' : 'hover:scale-[1.02]'}`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${selected ? 'opacity-70' : ''}`}></div>

            {/* Main card */}
            <div className={`relative bg-gradient-to-br from-indigo-500 via-indigo-500 to-indigo-600 text-white rounded-2xl px-6 py-5 w-[220px] shadow-2xl transition-all ${selected ? 'ring-4 ring-indigo-300/50 ring-offset-4 ring-offset-slate-900' : ''}`}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-4 !h-4 !bg-white !border-[3px] !border-indigo-500 !-top-2 !shadow-lg"
                />

                <div className="relative flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner shrink-0">
                        <UserCog className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Atendimento</p>
                        <p className="text-sm font-bold mt-0.5 truncate">
                            {nodeData?.agentName || 'Encaminhar p/ Agente'}
                        </p>
                        {nodeData?.agentId && (
                            <p className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
                                ID: {nodeData.agentId.substring(0, 8)}...
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-white !border-[3px] !border-indigo-500 !-bottom-2 !shadow-lg"
            />
        </div>
    );
};

export default memo(AgentNode);
