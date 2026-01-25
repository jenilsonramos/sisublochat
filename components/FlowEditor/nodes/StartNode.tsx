import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

const StartNode: React.FC<NodeProps> = ({ data, selected }) => {
    return (
        <div className={`relative group transition-all duration-300 ${selected ? 'scale-105' : 'hover:scale-[1.02]'}`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${selected ? 'opacity-70' : ''}`}></div>

            {/* Main card */}
            <div className={`relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-emerald-600 text-white rounded-2xl px-6 py-5 w-[220px] shadow-2xl transition-all ${selected ? 'ring-4 ring-emerald-300/50 ring-offset-4 ring-offset-slate-900' : ''}`}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

                <div className="relative flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner shrink-0">
                        <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Início</p>
                        <p className="text-sm font-bold mt-0.5 truncate">{(data as any)?.triggerType === 'keyword' ? 'Palavra-chave' : 'Nova Mensagem'}</p>
                        {(data as any)?.triggerType !== 'keyword' && (data as any)?.cooldown && (
                            <p className="text-[9px] font-bold text-emerald-200/80 mt-1">Cooldown: {(data as any).cooldown} min</p>
                        )}
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-4 !h-4 !bg-white !border-[3px] !border-emerald-500 !-bottom-2 !shadow-lg"
            />
        </div>
    );
};

export default memo(StartNode);
