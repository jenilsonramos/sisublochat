import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap, Check, X } from 'lucide-react';

const ApiNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeData = data as any;
    const method = nodeData?.method || 'GET';

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
                        <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">API</p>
                            <span className="px-1.5 py-0.5 bg-white/20 rounded text-[9px] font-black">{method}</span>
                        </div>
                        <p className="text-sm font-bold mt-0.5 truncate">
                            {nodeData?.url || 'Requisição HTTP'}
                        </p>
                    </div>
                </div>

                {/* Branches */}
                <div className="flex justify-between mt-4 pt-3 border-t border-white/20 gap-3 relative">
                    <div className="flex-1 text-center">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/40 rounded-lg">
                            <Check className="w-3 h-3" />
                            <span className="text-[10px] font-bold">200</span>
                        </div>
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="success"
                            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white !-bottom-5 !shadow-lg"
                            style={{ left: '25%' }}
                        />
                    </div>
                    <div className="flex-1 text-center">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/40 rounded-lg">
                            <X className="w-3 h-3" />
                            <span className="text-[10px] font-bold">Erro</span>
                        </div>
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="error"
                            className="!w-3 !h-3 !bg-rose-400 !border-2 !border-white !-bottom-5 !shadow-lg"
                            style={{ left: '75%' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ApiNode);
