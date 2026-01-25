import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Split } from 'lucide-react';

const SwitchNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeData = data as any;
    // Safely ensure cases is an array. Default to empty if not.
    const cases = Array.isArray(nodeData?.cases) ? nodeData.cases : [];

    return (
        <div className={`relative group transition-all duration-300 ${selected ? 'scale-105' : 'hover:scale-[1.02]'}`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${selected ? 'opacity-70' : ''}`}></div>

            {/* Main card */}
            <div className={`relative bg-gradient-to-br from-violet-500 via-violet-500 to-purple-600 text-white rounded-2xl px-6 py-5 w-[240px] shadow-2xl transition-all ${selected ? 'ring-4 ring-violet-300/50 ring-offset-4 ring-offset-slate-900' : ''}`}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-4 !h-4 !bg-white !border-[3px] !border-violet-500 !-top-2 !shadow-lg"
                />

                <div className="relative flex items-center gap-4 mb-4">
                    <div className="w-11 h-11 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner shrink-0">
                        <Split className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-100">Switch</p>
                        <p className="text-sm font-bold mt-0.5 truncate">
                            {nodeData?.variable || 'Variável'}
                        </p>
                    </div>
                </div>

                {/* Dynamic Handles */}
                <div className="space-y-3 pt-3 border-t border-white/20">
                    {cases.length > 0 ? (
                        cases.map((c: any, index: number) => (
                            <div key={index} className="relative flex items-center justify-end h-6">
                                <span className="text-xs font-medium mr-3 truncate max-w-[140px]">{c.condition || '...'}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`case-${index}`}
                                    className="!w-3 !h-3 !bg-violet-300 !border-2 !border-white !-right-[1.6rem] !shadow-lg"
                                />
                            </div>
                        ))
                    ) : (
                        <p className="text-[10px] text-violet-200 italic text-center">Adicione casos no painel</p>
                    )}

                    {/* Default case */}
                    <div className="relative flex items-center justify-end h-6 mt-2 pt-2 border-t border-white/10">
                        <span className="text-[10px] font-bold opacity-75 mr-3">Padrão</span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="default"
                            className="!w-3 !h-3 !bg-slate-300 !border-2 !border-slate-500 !-right-[1.6rem] !shadow-lg"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(SwitchNode);
