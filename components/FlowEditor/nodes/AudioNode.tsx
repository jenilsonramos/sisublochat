import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Mic, CheckCircle2 } from 'lucide-react';

const AudioTranscriptionNode: React.FC<NodeProps> = ({ data, selected }) => {
    const nodeData = data as any;

    return (
        <div className={`relative group transition-all duration-300 ${selected ? 'scale-105' : 'hover:scale-[1.02]'}`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-400 to-violet-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${selected ? 'opacity-70' : ''}`}></div>

            {/* Main card */}
            <div className={`relative bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl px-6 py-5 w-[220px] shadow-2xl transition-all ${selected ? 'ring-4 ring-indigo-300/50 ring-offset-4 ring-offset-slate-900' : ''}`}>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>

                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-4 !h-4 !bg-white !border-[3px] !border-indigo-500 !-top-2 !shadow-lg"
                />

                <div className="relative flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/25 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner shrink-0">
                        <Mic className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Transcrição</p>
                        <p className="text-sm font-bold mt-0.5 truncate">
                            Whisper AI (OpenAI)
                        </p>
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-[10px] font-medium text-indigo-100">
                    <span>Sai em:</span>
                    <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-white font-mono">
                        {nodeData?.output_variable || 'transcription'}
                    </span>
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

export default memo(AudioTranscriptionNode);
