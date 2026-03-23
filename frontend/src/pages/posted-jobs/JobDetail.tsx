import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Clock, Star, MessageCircle, ArrowLeft, MoreVertical, X, Send, Phone, User as UserIcon, Calendar, CheckCircle, Navigation, Users, Check, Briefcase } from 'lucide-react';
import { useMode } from '../../context/ModeContext';
// Removed useAuth

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

interface NegotiationMsg {
    sender_id: string;
    sender_role: 'worker' | 'employer';
    sender_name: string;
    message: string;
    offer_amount?: number | null;
    sent_at: string;
}

interface ApplicantMessage {
    sender: 'worker' | 'employer';
    sender_name: string;
    message: string;
    offer_amount?: number | null;
    sent_at: string;
}

interface Worker {
    id: string;
    applicationId: string;
    name: string;
    rating: number;
    distance: string;
    phone: string;
    avatar: string;
    status: 'accepted' | 'waiting' | 'rejected' | 'negotiating' | 'completed';
    coverLetter?: string;
    messages: ApplicantMessage[];
    negotiatedPrice?: number;
}

const formatTimeAgo = (dateStr: string): string => {
    const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const diff = Date.now() - new Date(utcStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const formatPay = (salary: any): string => {
    if (!salary) return '—';
    const periodMap: Record<string, string> = { daily: '/day', hourly: '/hr', monthly: '/mo', yearly: ' LPA' };
    return `₹${salary.amount.toLocaleString('en-IN')}${periodMap[salary.period] ?? ''}`;
};

const JobDetail: React.FC = () => {
    const { mode, jobId } = useParams();
    const { mode: contextMode } = useMode();
    const navigate = useNavigate();
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [job, setJob] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [applicants, setApplicants] = useState<Worker[]>([]);
    const [isApplicantsLoading, setIsApplicantsLoading] = useState(false);
    const [applicantsError, setApplicantsError] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Negotiation WebSocket state
    const [showNegotiationChat, setShowNegotiationChat] = useState(false);
    const [negotiationId, setNegotiationId] = useState<string | null>(null);
    const [negotiationMessages, setNegotiationMessages] = useState<NegotiationMsg[]>([]);
    const [negotiationStatus, setNegotiationStatus] = useState<string>('active');
    const [chatInput, setChatInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const isDaily = mode === 'daily' || contextMode === 'daily';

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [negotiationMessages]);

    // Fetch job
    useEffect(() => {
        if (!jobId) return;
        const fetchJob = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Job not found');
                const data = await res.json();
                setJob(data.job);
            } catch (err: any) {
                setFetchError(err.message || 'Failed to load job');
            } finally {
                setIsLoading(false);
            }
        };
        fetchJob();
    }, [jobId]);

    const jobData = job ? {
        id: job._id,
        title: job.title,
        description: job.description,
        location: job.location?.address || '—',
        pay: formatPay(job.salary),
        time: job.work_hours || '—',
        date: job.start_date ? new Date(job.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        applicants: job.applicants_count ?? 0,
        postedAt: job.created_at ? formatTimeAgo(job.created_at) : '—',
        category: job.category || '—',
        requirements: Array.isArray(job.requirements) && job.requirements.length > 0
            ? job.requirements
            : ['No specific requirements listed'],
    } : null;

    // Fetch applicants
    useEffect(() => {
        if (!jobId || !isDaily) return;

        const mapStatus = (s: string): Worker['status'] => {
            if (s === 'accepted') return 'accepted';
            if (s === 'rejected') return 'rejected';
            if (s === 'negotiating') return 'negotiating';
            if (s === 'completed') return 'completed';
            return 'waiting';
        };

        const toWorker = (app: any, index: number): Worker => {
            const seed = app.applicant_id ? app.applicant_id.length : index + 1;
            const rating = (4.2 + ((seed % 8) / 10)).toFixed(1);
            const distance = (1.5 + (seed % 6) * 0.7).toFixed(1);
            return {
                id: app.applicant_id || String(index),
                applicationId: app._id,
                name: app.applicant_name || 'Applicant',
                rating: Number(rating),
                distance: `${distance} km`,
                phone: app.applicant_contact || '',
                avatar: `https://i.pravatar.cc/150?img=${(seed % 60) + 1}`,
                status: mapStatus(app.status),
                coverLetter: app.cover_letter || '',
                messages: Array.isArray(app.messages) ? app.messages : [],
                negotiatedPrice: app.negotiated_price,
            };
        };

        const fetchApplicants = async () => {
            setIsApplicantsLoading(true);
            setApplicantsError('');
            try {
                const res = await fetch(`${API_BASE}/api/jobs/${jobId}/applicants`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load applicants');
                const data = await res.json();
                setApplicants((data.applicants || []).map(toWorker));
            } catch (err: any) {
                setApplicantsError(err.message || 'Could not load applicants');
            } finally {
                setIsApplicantsLoading(false);
            }
        };

        fetchApplicants();
    }, [jobId, isDaily]);

    const patchWorkerLocal = (applicationId: string, update: Partial<Worker>) => {
        setApplicants(prev => prev.map(w => w.applicationId === applicationId ? { ...w, ...update } : w));
        setSelectedWorker(prev => prev && prev.applicationId === applicationId ? { ...prev, ...update } : prev);
    };

    const updateApplicantStatus = async (newStatus: 'accepted' | 'rejected' | 'completed', overrideAppId?: string) => {
        const appId = overrideAppId || selectedWorker?.applicationId;
        if (!appId || !jobId) return;
        setIsActionLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/jobs/${jobId}/applicants/${appId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update applicant status');
            patchWorkerLocal(appId, { status: newStatus });
        } catch (err: any) {
            alert(err.message || 'Could not update status');
        } finally {
            setIsActionLoading(false);
        }
    };

    // ── Negotiation WebSocket ─────────────────────────────────────────────

    const openNegotiationChat = async (worker: Worker) => {
        setSelectedWorker(worker);
        setShowNegotiationChat(true);
        setNegotiationMessages([]);
        setNegotiationStatus('active');
        setChatInput('');

        // Check if there's an existing negotiation for this job/worker
        try {
            const res = await fetch(`${API_BASE}/api/negotiations/job/${jobId}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const existingNeg = (data.negotiations || []).find(
                    (n: any) => n.worker_id === worker.id && n.status === 'active'
                );
                if (existingNeg) {
                    setNegotiationId(existingNeg._id);
                    setNegotiationMessages(existingNeg.messages || []);
                    setNegotiationStatus(existingNeg.status || 'active');
                    connectWebSocket(existingNeg._id);
                    return;
                }
            }
        } catch { /* ignore */ }

        // No existing active negotiation — just open the chat and wait
        // (Worker initiates from ExploreJobs side)
        setNegotiationId(null);
    };

    const connectWebSocket = (negId: string) => {
        // Close existing
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const token = document.cookie
            .split('; ')
            .find(c => c.startsWith('access_token='))
            ?.split('=')[1] || '';

        const ws = new WebSocket(`${WS_BASE}/api/negotiations/ws/${negId}?token=${token}`);

        ws.onopen = () => {
            console.log('Negotiation WS connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'history') {
                setNegotiationMessages(data.messages || []);
                setNegotiationStatus(data.status || 'active');
            } else if (data.type === 'message') {
                setNegotiationMessages(prev => {
                    // Deduplicate by sent_at
                    if (prev.some(m => m.sent_at === data.sent_at && m.sender_id === data.sender_id)) return prev;
                    return [...prev, {
                        sender_id: data.sender_id,
                        sender_role: data.sender_role,
                        sender_name: data.sender_name,
                        message: data.message,
                        offer_amount: data.offer_amount,
                        sent_at: data.sent_at,
                    }];
                });
            } else if (data.type === 'accepted') {
                setNegotiationStatus('accepted');
            } else if (data.type === 'session_ended') {
                setNegotiationStatus(data.status || 'closed');
            }
        };

        ws.onclose = () => {
            console.log('Negotiation WS closed');
        };

        wsRef.current = ws;
    };

    // Poll for new negotiations when chat is open but no ID yet (employer waiting for worker to start)
    useEffect(() => {
        if (!showNegotiationChat || negotiationId || !selectedWorker || !jobId) return;
        let active = true;

        const poll = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/negotiations/job/${jobId}`, { credentials: 'include' });
                if (!res.ok || !active) return;
                const data = await res.json();
                const neg = (data.negotiations || []).find(
                    (n: any) => n.worker_id === selectedWorker.id && n.status === 'active'
                );
                if (neg && active) {
                    setNegotiationId(neg._id);
                    setNegotiationMessages(neg.messages || []);
                    connectWebSocket(neg._id);
                }
            } catch { /* ignore */ }
        };

        poll();
        const timer = setInterval(poll, 3000);
        return () => { active = false; clearInterval(timer); };
    }, [showNegotiationChat, negotiationId, selectedWorker, jobId]);

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const sendNegotiationMessage = () => {
        if (!chatInput.trim() || isSending) return;

        const priceMatch = chatInput.match(/₹(\d+)/);
        const offerAmount = priceMatch ? parseFloat(priceMatch[1]) : undefined;

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                message: chatInput,
                offer_amount: offerAmount,
            }));
            setChatInput('');
        } else {
            // Fallback: send via REST
            sendViaRest(chatInput, offerAmount);
        }
    };

    const sendViaRest = async (message: string, offerAmount?: number) => {
        if (!negotiationId) return;
        setIsSending(true);
        try {
            const res = await fetch(`${API_BASE}/api/negotiations/${negotiationId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message, offer_amount: offerAmount }),
            });
            if (!res.ok) throw new Error('Failed to send');
            // Re-fetch messages
            const getRes = await fetch(`${API_BASE}/api/negotiations/${negotiationId}`, { credentials: 'include' });
            if (getRes.ok) {
                const data = await getRes.json();
                setNegotiationMessages(data.negotiation.messages || []);
            }
            setChatInput('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleAcceptNegotiation = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'accept' }));
        } else if (negotiationId) {
            fetch(`${API_BASE}/api/negotiations/${negotiationId}/accept`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            }).then(() => setNegotiationStatus('accepted'));
        }
    };

    const handleRejectNegotiation = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'reject' }));
        } else if (negotiationId) {
            fetch(`${API_BASE}/api/negotiations/${negotiationId}/reject`, {
                method: 'POST', credentials: 'include',
            });
        }
        setShowNegotiationChat(false);
        wsRef.current?.close();
        wsRef.current = null;
    };

    const closeNegotiationChat = () => {
        setShowNegotiationChat(false);
        wsRef.current?.close();
        wsRef.current = null;
    };

    // ── Render ────────────────────────────────────────────────────────────

    if (isLoading) return (
        <div className="w-full min-h-screen flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-4 border-neutral-900 border-t-transparent animate-spin" />
        </div>
    );

    if (fetchError || !jobData) return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center gap-4">
            <p className="text-red-500 font-medium">{fetchError || 'Job not found'}</p>
            <button onClick={() => navigate('/posted-jobs')} className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-bold">Back to Jobs</button>
        </div>
    );

    return (
        <div className="w-full min-h-screen relative px-4 md:px-8 pt-8 pb-10">
            <div className="mx-auto w-full max-w-6xl">

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/posted-jobs')}
                    className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-neutral-900 text-white hover:bg-neutral-800"
                >
                    <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Jobs</span>
                </button>
            </div>

            {/* Main Job Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 mb-6 p-6 pl-8 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm"
            >
                <div className="absolute left-0 top-6 bottom-6 w-1.5 rounded-full bg-neutral-900" />

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pl-4">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 text-neutral-900">
                                <Briefcase size={12} />
                                {jobData.category}
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black leading-tight text-neutral-900">
                            {jobData.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                                <MapPin size={14} className="opacity-70" />
                                {jobData.location}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                                <Clock size={14} className="opacity-70" />
                                {jobData.postedAt}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-neutral-600">
                                <Navigation size={14} className="opacity-70" />
                                {jobData.time}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-3 min-w-[200px]">
                        <div className="text-3xl md:text-4xl font-black text-neutral-900">
                            {jobData.pay}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                            <Users size={16} className="opacity-70" />
                            <span className="font-bold text-neutral-900">{jobData.applicants}</span>
                            <span>applicants</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                            <Calendar size={16} className="opacity-70" />
                            <span>{jobData.date}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Description & Requirements Grid */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm"
                >
                    <h3 className="text-lg font-bold mb-3 text-neutral-900">Description</h3>
                    <p className="text-sm leading-relaxed text-neutral-600">{jobData.description}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-6 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm"
                >
                    <h3 className="text-lg font-bold mb-3 text-neutral-900">Requirements</h3>
                    <ul className="space-y-2.5">
                        {jobData.requirements.map((req: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-neutral-600">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-neutral-900" />
                                <span>{req}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>

            {/* Workers Section */}
            {isDaily && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="z-10 p-6 rounded-2xl mb-20 bg-white border-2 border-neutral-200 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-neutral-900">Applicant Workers</h3>
                        <span className="text-xs font-medium text-neutral-500">Click to negotiate or manage</span>
                    </div>

                    {isApplicantsLoading && (
                        <div className="py-10 text-center text-sm font-medium text-neutral-500">Loading applicants...</div>
                    )}

                    {!isApplicantsLoading && applicantsError && (
                        <div className="py-10 text-center text-sm font-medium text-red-600">{applicantsError}</div>
                    )}

                    {!isApplicantsLoading && !applicantsError && applicants.length === 0 && (
                        <div className="py-10 text-center text-sm font-medium text-neutral-500">No applicants yet.</div>
                    )}

                    {!isApplicantsLoading && !applicantsError && applicants.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {applicants.map((worker) => (
                            <motion.div
                                key={worker.applicationId}
                                onClick={() => openNegotiationChat(worker)}
                                className={`relative cursor-pointer p-4 pl-6 rounded-xl border-2 transition-all ${worker.status === 'accepted'
                                    ? 'bg-emerald-50 border-emerald-300'
                                    : worker.status === 'waiting' || worker.status === 'negotiating'
                                        ? 'bg-white border-neutral-200 hover:border-neutral-400'
                                        : 'bg-neutral-50 border-neutral-200 opacity-50'
                                    }`}
                            >
                                <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${worker.status === 'accepted'
                                    ? 'bg-emerald-500'
                                    : 'bg-neutral-400'
                                    }`} />
                                {worker.status === 'accepted' && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                                        <Check size={14} className="text-white" />
                                    </div>
                                )}

                                <div className="flex flex-col items-center text-center gap-3">
                                    <div className="relative">
                                        <img
                                            src={worker.avatar}
                                            alt={worker.name}
                                            className={`w-16 h-16 rounded-full object-cover border-2 ${worker.status === 'accepted'
                                                ? 'border-emerald-500'
                                                : 'border-neutral-300'
                                                }`}
                                        />
                                        {worker.status === 'waiting' && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
                                                <Clock size={10} className="text-white" />
                                            </div>
                                        )}
                                        {worker.status === 'negotiating' && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                                                <MessageCircle size={10} className="text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-full">
                                        <div className="font-bold text-sm text-neutral-900">{worker.name}</div>
                                        <div className="flex items-center justify-center gap-1 text-xs mt-1 text-neutral-700">
                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                            <span>{worker.rating}</span>
                                            <span className="mx-1">•</span>
                                            <span>{worker.distance}</span>
                                        </div>
                                        {worker.status === 'accepted' && <div className="mt-2 text-xs font-bold text-neutral-900">Primary Worker</div>}
                                        {worker.status === 'waiting' && <div className="mt-2 text-xs font-semibold text-neutral-700">In Queue</div>}
                                        {worker.status === 'negotiating' && <div className="mt-2 text-xs font-semibold text-blue-700">Negotiating</div>}
                                        {worker.status === 'completed' && <div className="mt-2 text-xs font-semibold text-neutral-700">Completed</div>}
                                    </div>

                                    <div className="flex gap-2 w-full mt-2">
                                        <a
                                            href={`tel:${worker.phone}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${worker.status === 'accepted'
                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                                }`}
                                        >
                                            <Phone size={12} />
                                            Call
                                        </a>
                                        {worker.status === 'accepted' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateApplicantStatus('completed', worker.applicationId);
                                                }}
                                                disabled={isActionLoading}
                                                className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 disabled:opacity-50"
                                            >
                                                Complete ✓
                                            </button>
                                        )}
                                        {worker.status === 'completed' && (
                                            <div className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-neutral-100 text-neutral-500 flex items-center justify-center gap-1">
                                                Completed ✓
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    )}
                </motion.div>
            )}

            {/* ── Negotiation Chat Modal (WebSocket) ──────────────────────── */}
            <AnimatePresence>
                {showNegotiationChat && selectedWorker && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                            onClick={closeNegotiationChat}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[90vw] sm:max-w-lg z-[101]"
                        >
                            <div className="rounded-t-2xl sm:rounded-2xl bg-white border border-neutral-200 shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
                                {/* Header */}
                                <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-white">
                                    <div className="flex items-center gap-3">
                                        <img src={selectedWorker.avatar} alt={selectedWorker.name} className="w-10 h-10 rounded-full border-2 border-neutral-200 object-cover" />
                                        <div>
                                            <h3 className="text-base font-bold text-neutral-900">{selectedWorker.name}</h3>
                                            <p className="text-xs text-neutral-500">
                                                <Star size={10} className="fill-amber-400 text-amber-400 inline mr-1" />
                                                {selectedWorker.rating} · {selectedWorker.distance}
                                                {negotiationId && <span className="ml-2 text-emerald-600">● Live</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={closeNegotiationChat} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
                                        <X size={18} className="text-neutral-500" />
                                    </button>
                                </div>

                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-neutral-50" style={{ minHeight: '260px', maxHeight: '400px' }}>
                                    {/* Base rate badge */}
                                    <div className="flex justify-center">
                                        <span className="text-xs text-neutral-400 bg-white px-3 py-1 rounded-full border border-neutral-100">
                                            Base rate: {jobData.pay}
                                        </span>
                                    </div>

                                    {!negotiationId && negotiationMessages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                                                <MessageCircle size={18} className="text-neutral-400" />
                                            </div>
                                            <p className="text-sm text-neutral-500">Waiting for the worker to start a negotiation</p>
                                            <p className="text-xs text-neutral-400 mt-1">They'll send a price proposal from their side</p>
                                        </div>
                                    ) : (
                                        <>
                                            {negotiationMessages.map((msg, i) => (
                                                <motion.div
                                                    key={`${i}-${msg.sent_at}`}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${msg.sender_role === 'employer' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                                                        msg.sender_role === 'employer'
                                                            ? 'bg-neutral-900 text-white rounded-br-md'
                                                            : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-md shadow-sm'
                                                    }`}>
                                                        {msg.offer_amount && (
                                                            <div className={`text-xs font-bold mb-1 ${msg.sender_role === 'employer' ? 'text-emerald-300' : 'text-amber-600'}`}>
                                                                ₹{msg.offer_amount}/day
                                                            </div>
                                                        )}
                                                        <p>{msg.message}</p>
                                                        <p className="text-[10px] mt-1.5 text-neutral-400">
                                                            {msg.sender_name} · {new Date(msg.sent_at).toLocaleTimeString()}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {/* Status indicators */}
                                            {negotiationStatus === 'accepted' && (
                                                <div className="flex justify-center">
                                                    <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">✓ Price agreed!</span>
                                                </div>
                                            )}
                                            {(negotiationStatus === 'rejected' || negotiationStatus === 'closed') && (
                                                <div className="flex justify-center">
                                                    <span className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 font-medium">Negotiation closed</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="px-5 py-3 border-t border-neutral-100 bg-white">
                                    {negotiationStatus === 'accepted' || negotiationStatus === 'rejected' || negotiationStatus === 'closed' ? (
                                        <p className="text-xs text-neutral-400 text-center py-1">This negotiation is {negotiationStatus}</p>
                                    ) : !negotiationId ? (
                                        <p className="text-xs text-neutral-400 text-center py-1">Waiting for the worker to start the negotiation...</p>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type your response (e.g. I can offer ₹550/day)..."
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !isSending && sendNegotiationMessage()}
                                                disabled={isSending}
                                                className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 focus:border-neutral-400 focus:bg-white focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors disabled:opacity-50"
                                            />
                                            <button
                                                onClick={sendNegotiationMessage}
                                                disabled={!chatInput.trim() || isSending}
                                                className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Actions */}
                                {negotiationId && (
                                    <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50 flex gap-2">
                                        <button
                                            onClick={handleRejectNegotiation}
                                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-100 transition-colors"
                                        >
                                            Close & Reject
                                        </button>
                                        {negotiationStatus === 'accepted' ? (
                                            <button
                                                onClick={() => { updateApplicantStatus('accepted'); closeNegotiationChat(); }}
                                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                                            >
                                                Assign Work ✓
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleAcceptNegotiation}
                                                disabled={!negotiationMessages.some(m => m.offer_amount) || negotiationStatus !== 'active'}
                                                className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Accept Offer
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            </div>
        </div>
    );
};

export default JobDetail;
