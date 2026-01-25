import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Tag } from 'lucide-react';

const TagNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeData = data as any;
    const isAdd = nodeData?.action === 'remove' ? false : true;

    return (
        <div className={`relative group transition-all duration-300 ${selected ? 'scale-105' : 'hover:scale-[1.02]'}`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${isAdd ? 'from-emerald-400 to-teal-600' : 'from-rose-400 to-red-600'} rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${selected ? 'opacity-70' : ''}`}></div>

            {/* Main card */}
            <div className={`relative bg-gradient-to-br ${isAdd ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-red-600'} text-white rounded-2xl px-6 py-5 w-[220px] shadow-2xl transition-all ${selected ? (isAdd ? 'ring-4 ring-emerald-300/50' : 'ring-4 ring-rose-300/50') + ' ring-offset-4 ring-offset-slate-900' : ''}`}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

                <Handle
                    type="target"
                    position={Position.Top}
                    className={`!w-4 !h-4 !bg-white !border-[3px] ${isAdd ? '!border-emerald-500' : '!border-rose-500'} !-top-2 !shadow-lg`}
                />

                <div className="relative flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner shrink-0">
                        <Tag className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isAdd ? 'text-emerald-100' : 'text-rose-100'}`}>
                            {isAdd ? 'Adicionar Tag' : 'Remover Tag'}
                        </p>
                        <p className="text-sm font-bold mt-0.5 truncate">
                            {nodeData?.tag || '...'}
                        </p>
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className={`!w-4 !h-4 !bg-white !border-[3px] ${isAdd ? '!border-emerald-500' : '!border-rose-500'} !-bottom-2 !shadow-lg`}
            />
        </div>
    );
};

export default memo(TagNode);
