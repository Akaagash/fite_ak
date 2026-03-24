import React, { createContext, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationMessage {
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    job_id?: string;
    worker_id?: string;
    [key: string]: any;
}

interface NotificationContextType {}

const NotificationContext = createContext<NotificationContextType>({});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const WS_BASE = API_BASE.replace(/^http/, 'ws');
        const wsUrl = `${WS_BASE}/api/notifications/ws?token=${token}`;
        
        let ws: WebSocket;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        const connect = () => {
            ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'personal_notification' || data.type === 'broadcast') {
                        const newNotif = { ...data.data, id: Math.random().toString(36).substr(2, 9) };
                        setNotifications(prev => [...prev, newNotif]);
                        
                        // Auto dismiss after 10 seconds (giving more time to click)
                        setTimeout(() => {
                            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
                        }, 10000);
                    }
                } catch (err) {
                    console.error("Failed to parse notification", err);
                }
            };

            ws.onclose = () => {
                reconnectTimer = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimer);
            if (ws) ws.close();
        };
    }, []);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNotificationClick = (notif: NotificationMessage) => {
        if ((notif.type === 'negotiation_started' || notif.type === 'negotiation_message') && notif.job_id) {
            navigate('/posted-jobs', { state: { openJobId: notif.job_id, workerId: notif.worker_id } });
        }
        removeNotification(notif.id);
    };

    return (
        <NotificationContext.Provider value={{}}>
            {children}
            {/* Global Toasts Container */}
            <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {notifications.map(notif => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleNotificationClick(notif)}
                            className="pointer-events-auto w-80 bg-white rounded-2xl shadow-2xl border-l-4 border-indigo-600 overflow-hidden flex items-start cursor-pointer transition-all hover:bg-neutral-50"
                        >
                            <div className="p-4 bg-indigo-50 text-indigo-600">
                                <Bell size={24} />
                            </div>
                            <div className="flex-1 p-4">
                                <h4 className="text-sm font-bold text-neutral-900 leading-tight">{notif.title || 'Notification'}</h4>
                                <p className="text-xs text-neutral-600 mt-1 lines-clamp-2">{notif.message}</p>
                                {notif.job_id && (
                                    <div className="mt-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Click to view details</div>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notif.id);
                                }}
                                className="p-4 text-neutral-400 hover:text-neutral-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};
