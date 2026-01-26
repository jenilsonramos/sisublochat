import axios from 'axios';

const API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

console.log('Evolution API Config:', {
    url: API_URL,
    hasKey: !!API_KEY
});

if (!API_URL || !API_KEY) {
    console.warn('Evolution API environment variables are missing. Using fallbacks.');
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
    }
});

export interface EvolutionInstance {
    id: string;
    name: string;
    connectionStatus: string;
    instanceId: string;
    token?: string;
    status?: string; // Fallback
    serverUrl?: string;
    apikey?: string;
    ownerJid?: string;
    profileName?: string;
    profilePictureUrl?: string;
    Setting?: any;
    _count?: any;
}

export const evolutionApi = {
    // Fetch all instances
    fetchInstances: async () => {
        const response = await api.get<EvolutionInstance[]>('/instance/fetchInstances');
        return response.data;
    },

    createInstance: async (instanceName: string, token?: string, qrcode: boolean = true) => {
        const payload: any = {
            instanceName,
            qrcode,
            integration: 'WHATSAPP-BAILEYS'
        };
        if (token) payload.token = token;

        const response = await api.post('/instance/create', payload);

        // Auto-configure Webhook for this instance
        try {
            const webhookUrl = `https://ublochat.com.br/webhook/evolution`;
            console.log('Configuring Webhook:', webhookUrl);
            await api.post(`/webhook/set/${encodeURIComponent(instanceName)}`, {
                webhook: {
                    enabled: true,
                    url: webhookUrl,
                    events: [
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'MESSAGES_DELETE',
                        'MESSAGES_SET',
                        'SEND_MESSAGE',
                        'CONNECTION_UPDATE',
                        'INSTANCE_DELETE'
                    ],
                    webhookByEvents: true
                }
            });
        } catch (webhookError) {
            console.error('Failed to configure webhook:', webhookError);
        }

        return response.data;
    },

    // Set Webhook Manual
    setWebhook: async (instanceName: string, enabled: boolean = true) => {
        const webhookUrl = `https://ublochat.com.br/webhook/evolution`;
        const payload = {
            webhook: {
                enabled,
                url: webhookUrl,
                events: [
                    'MESSAGES_UPSERT',
                    'MESSAGES_UPDATE',
                    'MESSAGES_DELETE',
                    'MESSAGES_SET',
                    'SEND_MESSAGE',
                    'CONNECTION_UPDATE',
                    'INSTANCE_DELETE'
                ],
                webhookByEvents: true
            }
        };
        const response = await api.post(`/webhook/set/${encodeURIComponent(instanceName)}`, payload);
        return response.data;
    },

    // Connect instance (Get QR Code/Status)
    connectInstance: async (instanceName: string) => {
        const response = await api.get(`/instance/connect/${encodeURIComponent(instanceName)}`);
        return response.data;
    },

    // Logout/Disconnect instance
    logoutInstance: async (instanceName: string) => {
        const response = await api.delete(`/instance/logout/${encodeURIComponent(instanceName)}`);
        return response.data;
    },

    // Delete instance
    deleteInstance: async (instanceName: string) => {
        const response = await api.delete(`/instance/delete/${encodeURIComponent(instanceName)}`);
        return response.data;
    },

    // Fetch instance state
    fetchInstanceState: async (instanceName: string) => {
        const response = await api.get(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
        return response.data;
    },

    // --- CHAT METHODS ---

    // Fetch all chats
    fetchChats: async (instanceName: string) => {
        const response = await api.get(`/chat/findChats/${encodeURIComponent(instanceName)}`);
        return response.data;
    },

    // Fetch messages for a specific chat
    fetchMessages: async (instanceName: string, remoteJid: string) => {
        // Using POST for finding messages with specific criteria
        const response = await api.post(`/chat/findMessages/${encodeURIComponent(instanceName)}`, {
            where: {
                key: {
                    remoteJid: remoteJid
                }
            },
            options: {
                limit: 50,
                order: "ASC"
            }
        });
        return response.data;
    },

    // Send Text Message
    sendTextMessage: async (instanceName: string, number: string, text: string, quoted?: any) => {
        // remove @s.whatsapp.net if present to just get the number
        const cleanNumber = number.replace('@s.whatsapp.net', '');

        const payload: any = {
            number: cleanNumber,
            text: text,
            delay: 1200
        };

        if (quoted) {
            payload.quoted = quoted;
        }

        const response = await api.post(`/message/sendText/${instanceName}`, payload);
        return response.data;
    },

    // Find Contact Profile Picture
    fetchProfilePicture: async (instanceName: string, number: string) => {
        const response = await api.post(`/chat/fetchProfilePictureUrl/${instanceName}`, {
            number: number
        });
        return response.data;
    },

    // Send Media Message
    sendMediaMessage: async (instanceName: string, number: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio' | 'document', caption?: string, fileName?: string, ptt: boolean = false, quoted?: any) => {
        const cleanNumber = number.replace('@s.whatsapp.net', '');

        const payload: any = {
            number: cleanNumber,
            media: mediaUrl,
            mediatype: mediaType,
            caption: caption || ''
        };

        if (fileName) {
            payload.fileName = fileName;
        }

        if (mediaType === 'audio') {
            payload.ptt = ptt;
            // Force a standard audio mimetype if possible
            payload.mimetype = fileName?.endsWith('.ogg') ? 'audio/ogg; codecs=opus' : (fileName?.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4');
        }

        if (quoted) {
            payload.quoted = quoted;
        }

        const response = await api.post(`/message/sendMedia/${instanceName}`, payload);
        return response.data;
    },

    // Get Base64 from Media Message (for incoming media)
    getBase64FromMediaMessage: async (instanceName: string, messageId: string, limit: number = 100) => {
        // Evolution v2 endpoint to retrieve media
        // Adjust based on specific version if needed, but this is standard for recent versions
        const response = await api.post(`/chat/getBase64FromMediaMessage/${instanceName}`, {
            message: {
                key: {
                    id: messageId
                }
            },
            convertToMp4: false
        });
        return response.data;
    },

    // Update Block Status
    updateBlockStatus: async (instanceName: string, number: string, action: 'block' | 'unblock') => {
        const cleanNumber = number.replace('@s.whatsapp.net', '');

        try {
            // Some versions use 'action', others 'status'. We send both to be safe.
            // Some versions expect full JID, others just numbers.
            const response = await api.post(`/chat/updateBlockStatus/${instanceName}`, {
                number: cleanNumber,
                action: action,
                status: action
            });
            return response.data;
        } catch (error: any) {
            console.error('[evolutionApi] updateBlockStatus error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        }
    }
};
