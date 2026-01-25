import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Dices, Shuffle } from 'lucide-react';

const RandomNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeData = data as any;

    return (
        <div className={`relative group transition-all duration-300 ${selected ? 'scale-105' : 'hover:scale-[1.02]'}`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${selected ? 'opacity-70' : ''}`}></div>

            {/* Main card */}
            <div className={`relative bg-gradient-to-br from-orange-500 to-pink-600 text-white rounded-2xl px-6 py-5 w-[220px] shadow-2xl transition-all ${selected ? 'ring-4 ring-orange-300/50 ring-offset-4 ring-offset-slate-900' : ''}`}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-4 !h-4 !bg-white !border-[3px] !border-orange-500 !-top-2 !shadow-lg"
                />

                <div className="relative flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner shrink-0">
                        <Dices className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-100">Teste A/B</p>
                        <p className="text-sm font-bold mt-0.5 truncate">
                            Randomizador
                        </p>
                    </div>
                </div>

                {/* Outputs: A / B */}
                <div className="flex justify-between mt-4 pt-3 border-t border-white/20 gap-3 relative">
                    <div className="flex-1 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider block mb-1 opacity-80">A (50%)</span>
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="a"
                            className="!w-3 !h-3 !bg-orange-300 !border-2 !border-white !bottom-[-6px] !shadow-lg"
                            style={{ left: '25%' }}
                        />
                    </div>
                    <div className="flex-1 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider block mb-1 opacity-80">B (50%)</span>
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="b"
                            className="!w-3 !h-3 !bg-pink-300 !border-2 !border-white !bottom-[-6px] !shadow-lg"
                            style={{ left: '75%' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(RandomNode);
