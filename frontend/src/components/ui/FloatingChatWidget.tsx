import React, { useState, useEffect, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Minimize2, Send, MessageCircle, CheckCircle, Clock } from 'lucide-react';

export interface NegotiationMessage {
    id: string;
    sender: 'worker' | 'employer';
    senderName: string;
    message: string;
    timestamp: string;
    type: 'message' | 'counter_offer';
    priceProposal?: number;
}

interface FloatingChatWidgetProps {
    isOpen: boolean;
    onClose: () => void; // completely remove
    jobTitle: string;
    messages: NegotiationMessage[];
    status: 'idle' | 'active' | 'waiting_employer' | 'waiting_worker' | 'accepted' | 'rejected' | 'closed';
    isEmployer: boolean;
    onSendMessage: (msg: string, offer?: number) => void;
    onAccept: (finalPrice: number) => void;
    onReject: () => void;
}

const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
    isOpen,
    onClose,
    jobTitle,
    messages,
    status,
    isEmployer,
    onSendMessage,
    onAccept,
    onReject
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [offerPrice, setOfferPrice] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isExpanded]);
    
    // Auto-open if a new message arrives and we are minimized
    // But let's keep it simple for now and just rely on the user.

    if (!isOpen) return null;

    const handleSend = () => {
        if (!messageInput.trim() && !offerPrice) return;
        const offer = offerPrice ? parseFloat(offerPrice) : undefined;
        onSendMessage(messageInput, offer);
        setMessageInput('');
        setOfferPrice('');
    };

    // Find the latest proposed price
    let latestPrice: number | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].priceProposal) {
            latestPrice = messages[i].priceProposal!;
            break;
        }
    }

    const employerHasJoined = messages.some(m => m.sender === 'employer');
    const waitingForEmployer = !isEmployer && status === 'active' && !employerHasJoined;

    if (!isExpanded) {
        return (
            <motion.div
                drag
                dragConstraints={{ left: -100, right: 100, top: -100, bottom: 500 }}
                dragElastic={0.1}
                dragMomentum={false}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="fixed bottom-20 right-6 z-50 flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
            >
                <button
                    onClick={() => onClose()}
                    className="absolute -top-2 -right-2 bg-neutral-900 text-white rounded-full p-1 shadow-md hover:bg-neutral-800 transition-colors z-10"
                >
                    <X size={12} />
                </button>
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-colors relative"
                >
                    <MessageCircle size={28} className="text-white" />
                    {status === 'active' && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                    )}
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: -500, right: 100, top: -500, bottom: 100 }}
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl h-[550px] sm:h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200"
            style={{ touchAction: "none" }}
        >
            {/* Header */}
            <div 
                className="bg-neutral-900 text-white p-4 flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0 z-10"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                        <MessageCircle size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-base truncate">Negotiation</h3>
                        <p className="text-xs text-neutral-300 truncate">{jobTitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                        <Minimize2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-red-500 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Status Banner */}
            {status !== 'closed' && (
                <div className={`p-2 text-xs font-bold text-center shrink-0 border-b ${
                    status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                    waitingForEmployer ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-blue-50 text-blue-800 border-blue-100'
                }`}>
                    {status === 'accepted' && <div className="flex items-center justify-center gap-1"><CheckCircle size={14}/> Final Agreed Price: ₹{latestPrice}</div>}
                    {status === 'rejected' && <div className="flex items-center justify-center gap-1"><X size={14}/> Negotiation Closed / Rejected</div>}
                    {waitingForEmployer && <div className="flex items-center justify-center gap-1"><Clock size={14} className="animate-spin-slow"/> Waiting for employer to join...</div>}
                    {status === 'active' && !waitingForEmployer && <div className="flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/> Active Negotiation</div>}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-neutral-50 flex flex-col gap-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-2">
                        <MessageCircle size={32} className="opacity-50" />
                        <p className="text-sm font-medium">Send a message or propose a price to start.</p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = msg.sender === (isEmployer ? 'employer' : 'worker');
                        return (
                            <div key={msg.id || i} className={`max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                                {!isMe && (
                                    <div className="text-[10px] font-bold text-neutral-500 mb-1 ml-1">
                                        {msg.senderName}
                                    </div>
                                )}
                                <div className={`rounded-xl p-3 ${
                                    isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-neutral-200 text-neutral-900 rounded-tl-sm shadow-sm'
                                }`}>
                                    {msg.priceProposal && (
                                        <div className={`text-xs font-bold mb-1 pb-1 border-b ${isMe ? 'border-indigo-500/50' : 'border-neutral-100'}`}>
                                            Proposed Price: ₹{msg.priceProposal}
                                        </div>
                                    )}
                                    {msg.message && <div className="text-sm break-words">{msg.message}</div>}
                                </div>
                                <div className={`text-[10px] text-neutral-400 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                    {msg.timestamp}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Explicit Actions Area (if active and not waiting for employer) */}
            {status === 'active' && (
                <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
                    {/* Price Altering Bar */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">₹</span>
                            <input
                                type="number"
                                value={offerPrice}
                                onChange={(e) => setOfferPrice(e.target.value)}
                                placeholder="Propose a different price..."
                                className="w-full pl-8 pr-3 py-2 bg-neutral-100 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 ring-indigo-500"
                            />
                        </div>
                        <button 
                            onClick={() => setOfferPrice(String(Math.max(0, (parseInt(offerPrice || String(latestPrice || 0)) - 50))))}
                            className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-700 font-bold transition-colors"
                        >
                            -₹50
                        </button>
                        <button 
                            onClick={() => setOfferPrice(String((parseInt(offerPrice || String(latestPrice || 0)) + 50)))}
                            className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-700 font-bold transition-colors"
                        >
                            +₹50
                        </button>
                    </div>

                    {/* Chat Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={waitingForEmployer ? "Employer hasn't joined yet..." : "Type your message..."}
                            className="flex-1 px-4 py-2 bg-neutral-100 rounded-full text-sm focus:outline-none focus:ring-2 ring-indigo-500"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!messageInput.trim() && !offerPrice}
                            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-10 h-10 flex items-center justify-center shadow-md"
                        >
                            <Send size={16} className="-ml-1" />
                        </button>
                    </div>

                    {/* Action Buttons to finalize */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                        <button
                            onClick={onReject}
                            className="flex-1 py-2 rounded-lg text-sm font-bold bg-neutral-100 text-neutral-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            End Negotiation
                        </button>
                        <button
                            onClick={() => latestPrice && onAccept(latestPrice)}
                            disabled={!latestPrice}
                            className="flex-[2] py-2 rounded-lg text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircle size={16} />
                            Fix Price & Accept (₹{latestPrice})
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default FloatingChatWidget;
