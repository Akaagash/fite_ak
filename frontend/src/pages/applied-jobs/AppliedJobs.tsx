import React, { useState, useEffect } from 'react';
import { useMode } from '../../context/ModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, MapPin, IndianRupee, Calendar, CheckCircle, XCircle, Clock3, ChevronDown, Loader2, X, MessageCircle, Send } from 'lucide-react';
import TextType from '../../components/ui/TextType';

type JobStatus = 'pending' | 'negotiating' | 'accepted' | 'rejected' | 'completed' | 'CANCELLED' | 'COMPLETED';
type DateFilter = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all';

interface DailyMeta {
    original_price: number;
    final_agreed_price?: number;
    is_locked: boolean;
    negotiation_history: any[];
}

interface LongTermMeta {
    resume_url?: string;
    match_score?: number;
    cover_letter?: string;
}

interface Application {
    _id: string;
    worker_id: string;
    job_id: string;
    provider_id: string;
    job_snapshot: {
        title: string;
        location: string;
        type: 'daily' | 'longterm';
        cover_image?: string;
    };
    status: JobStatus;
    daily_meta?: DailyMeta;
    long_term_meta?: LongTermMeta;
    messages?: {
        sender: 'worker' | 'employer';
        sender_name: string;
        message: string;
        offer_amount?: number | null;
        sent_at: string;
    }[];
    created_at: string;
    updated_at: string;
}

const AppliedJobs: React.FC = () => {
    const { mode } = useMode();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [chatMessage, setChatMessage] = useState('');
    const [offerAmount, setOfferAmount] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    const isDaily = mode === 'daily';

    // Fetch applications from backend
    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/applications/my-applications', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setApplications(data.applications || []);
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshSelectedApplication = async (applicationId: string) => {
        const response = await fetch(`http://localhost:8000/api/applications/${applicationId}`, {
            credentials: 'include'
        });
        if (!response.ok) return;
        const data = await response.json();
        setSelectedApplication(data.application);
    };

    const openApplicationDetails = async (app: Application) => {
        setSelectedApplication(app);
        setOfferAmount(String(app.daily_meta?.final_agreed_price || app.daily_meta?.original_price || ''));
        await refreshSelectedApplication(app._id);
    };

    const handleSendMessage = async () => {
        if (!selectedApplication || !chatMessage.trim()) return;
        setIsSendingMessage(true);
        try {
            const response = await fetch(`http://localhost:8000/api/applications/${selectedApplication._id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: chatMessage.trim(),
                    offer_amount: isDaily && offerAmount ? Number(offerAmount) : undefined,
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to send message');
            }

            setChatMessage('');
            await fetchApplications();
            await refreshSelectedApplication(selectedApplication._id);
        } catch (error: any) {
            alert(error.message || 'Failed to send message');
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleCancelApplication = async () => {
        if (!selectedAppId) return;
        
        setCancellingId(selectedAppId);
        try {
            const response = await fetch('http://localhost:8000/api/applications/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ application_id: selectedAppId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Refresh applications
                await fetchApplications();
                setShowCancelModal(false);
                // If this was a long-term application, navigate back to explore so
                // the job will be visible again (backend removes applicant id)
                try {
                    if (selectedApplication && selectedApplication.job_snapshot?.type === 'longterm') {
                        // navigate to explore jobs page
                        // lazy-import navigate from react-router
                        window.location.href = '/explore-jobs';
                    }
                } catch (e) {
                    // ignore navigation errors
                }
            } else {
                alert(data.detail || 'Failed to cancel application');
            }
        } catch (error) {
            console.error('Error cancelling application:', error);
            alert('Failed to cancel application');
        } finally {
            setCancellingId(null);
            setSelectedAppId(null);
        }
    };

    const handleMarkCompleted = async () => {
        if (!selectedApplication) return;
        setIsCompleting(true);
        try {
            const response = await fetch(`http://localhost:8000/api/jobs/${selectedApplication.job_id}/applicants/${selectedApplication._id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'completed' })
            });
            if (response.ok) {
                await fetchApplications();
                await refreshSelectedApplication(selectedApplication._id);
            } else {
                const data = await response.json().catch(() => ({}));
                alert(data.detail || 'Failed to mark as completed');
            }
        } catch (err: any) {
            alert('Failed to mark as completed');
        } finally {
            setIsCompleting(false);
        }
    };

    // Filter applications by type and date
    const filteredApplications = applications.filter(app => {
        // Filter by job type
        if (isDaily && app.job_snapshot.type !== 'daily') return false;
        if (!isDaily && app.job_snapshot.type !== 'longterm') return false;
        
        // TODO: Add date filtering logic based on dateFilter
        return true;
    });

    const dateFilterOptions = [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this-week', label: 'This Week' },
        { value: 'this-month', label: 'This Month' },
        { value: 'all', label: 'All Time' }
    ];

    const normalizedStatus = (status: JobStatus) => String(status).toLowerCase();

    const getStatusBadge = (status: JobStatus) => {
        const s = normalizedStatus(status);
        switch (s) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                        <CheckCircle size={12} /> Completed
                    </span>
                );
            case 'pending':
            case 'applied':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                        <Clock3 size={12} /> Applied
                    </span>
                );
            case 'negotiating':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
                        <MessageCircle size={12} /> Negotiating
                    </span>
                );
            case 'accepted':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                        <CheckCircle size={12} /> Assigned
                    </span>
                );
            case 'rejected':
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-medium">
                        <XCircle size={12} /> {s === 'rejected' ? 'Rejected' : 'Cancelled'}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                        <Clock3 size={12} /> Applied
                    </span>
                );
        }
    };

    return (
        <div className="w-full min-h-screen relative px-4 md:px-8 pt-8 pb-10">
            <div className="relative z-10 mx-auto w-full max-w-6xl">

            {/* Header Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
                {/* Left: Title */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                        <TextType
                            key={isDaily ? 'applied-daily' : 'applied-longterm'}
                            text={isDaily ? 'Job History' : 'Applications'}
                            typingSpeed={80}
                            loop={false}
                            showCursor={false}
                        />
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1 font-medium">
                        {isDaily ? "Your completed jobs and earnings" : "Track your job applications"}
                    </p>
                </div>

                {/* Right: Control Bar */}
                <div className="flex items-center gap-3">
                    {/* Date Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border-2 border-neutral-200 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                        >
                            <Calendar size={16} />
                            {dateFilterOptions.find(o => o.value === dateFilter)?.label}
                            <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full mt-2 right-0 w-44 bg-white rounded-2xl border-2 border-neutral-200 shadow-xl overflow-hidden z-20"
                                >
                                    {dateFilterOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setDateFilter(option.value as DateFilter);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left text-sm transition-colors ${dateFilter === option.value
                                                ? 'bg-neutral-900 text-white font-semibold'
                                                : 'text-neutral-700 hover:bg-neutral-50'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* View Switcher - Segmented Control */}
                    <div className="relative flex items-center p-1 rounded-xl bg-neutral-100 border-2 border-neutral-200">
                        <motion.div
                            layoutId="appliedViewToggle"
                            className="absolute h-9 w-10 rounded-lg bg-neutral-900"
                            initial={false}
                            animate={{
                                x: viewMode === 'card' ? 0 : 44
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                        <button
                            onClick={() => setViewMode('card')}
                            className={`relative z-10 w-10 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'card' ? 'text-white' : 'text-neutral-600'
                                }`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`relative z-10 w-10 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'text-white' : 'text-neutral-600'
                                }`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Summary for Daily Wage */}
            {isDaily && filteredApplications.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
                >
                    <div className="p-4 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">Total Earned</p>
                        <p className="text-2xl font-bold text-neutral-800">
                            ₹{filteredApplications.filter(a => normalizedStatus(a.status) === 'completed').reduce((sum, app) => sum + (app.daily_meta?.final_agreed_price || 0), 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="p-4 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">Jobs Completed</p>
                        <p className="text-2xl font-bold text-neutral-800">{filteredApplications.filter(a => normalizedStatus(a.status) === 'completed').length}</p>
                    </div>
                    <div className="p-4 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-1">Applications</p>
                        <p className="text-2xl font-bold text-neutral-800">{filteredApplications.length}</p>
                    </div>
                </motion.div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-neutral-400" />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredApplications.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-neutral-600 text-lg mb-2">No applications yet</p>
                    <p className="text-neutral-500 text-sm">Start applying to jobs to see them here</p>
                </div>
            )}

            {/* Jobs Grid/List */}
            {!loading && filteredApplications.length > 0 && (
                <AnimatePresence mode="wait">
                    {viewMode === 'card' ? (
                        <motion.div
                            key="cards"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        >
                            {filteredApplications.map((app, index) => (
                                <motion.div
                                    key={app._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => openApplicationDetails(app)}
                                    className="group relative cursor-pointer p-5 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300"
                                >
                                    {/* Accent Line */}
                                    <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${normalizedStatus(app.status) === 'completed' ? 'bg-emerald-500' :
                                        normalizedStatus(app.status) === 'cancelled' || normalizedStatus(app.status) === 'rejected' ? 'bg-red-500' :
                                            'bg-amber-500'
                                        }`} />

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-neutral-800 pr-3">{app.job_snapshot.title}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">{app.job_snapshot.type === 'longterm' ? 'Long Term' : 'Daily'}</span>
                                            {getStatusBadge(app.status)}
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                                            <MapPin size={14} className="text-neutral-500" />
                                            <span>{app.job_snapshot.location}</span>
                                        </div>
                                        {isDaily && app.daily_meta && (
                                            <div className="flex items-center gap-2 text-sm text-neutral-700">
                                                <IndianRupee size={14} className="text-neutral-500" />
                                                <span className="font-semibold">₹{app.daily_meta.final_agreed_price || app.daily_meta.original_price}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between">
                                        <span className="text-xs text-neutral-500">Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                                        {(normalizedStatus(app.status) === 'pending' || normalizedStatus(app.status) === 'negotiating' || normalizedStatus(app.status) === 'applied') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedAppId(app._id);
                                                    setShowCancelModal(true);
                                                }}
                                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            {filteredApplications.map((app, index) => (
                                <motion.div
                                    key={app._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => openApplicationDetails(app)}
                                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300 transition-all"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-base font-semibold text-neutral-800">{app.job_snapshot.title}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">{app.job_snapshot.type === 'longterm' ? 'Long Term' : 'Daily'}</span>
                                            {getStatusBadge(app.status)}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-neutral-600">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={13} />
                                                <span>{app.job_snapshot.location}</span>
                                            </div>
                                            {isDaily && app.daily_meta && (
                                                <div className="flex items-center gap-1">
                                                    <IndianRupee size={13} />
                                                    <span className="font-medium">₹{app.daily_meta.final_agreed_price || app.daily_meta.original_price}</span>
                                                </div>
                                            )}
                                            <span className="text-xs text-neutral-500">Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    {(normalizedStatus(app.status) === 'pending' || normalizedStatus(app.status) === 'negotiating' || normalizedStatus(app.status) === 'applied') && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAppId(app._id);
                                                setShowCancelModal(true);
                                            }}
                                            className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Application Details + Chat Modal */}
            <AnimatePresence>
                {selectedApplication && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedApplication(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-2xl max-h-[90vh] z-[101] overflow-hidden"
                        >
                            <div className="bg-white rounded-2xl border-2 border-neutral-200 shadow-2xl h-full flex flex-col">
                                <div className="p-5 border-b border-neutral-200 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-neutral-900">{selectedApplication.job_snapshot.title}</h3>
                                        <p className="text-sm text-neutral-500 mt-1">{selectedApplication.job_snapshot.location}</p>
                                        <div className="mt-2">{getStatusBadge(selectedApplication.status)}</div>
                                    </div>
                                    <button onClick={() => setSelectedApplication(null)} className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-5 space-y-4 overflow-y-auto">
                                    {isDaily && selectedApplication.daily_meta && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider">Original Price</p>
                                                <p className="text-lg font-bold text-neutral-900">₹{selectedApplication.daily_meta.original_price}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider">Latest Offer</p>
                                                <p className="text-lg font-bold text-neutral-900">₹{selectedApplication.daily_meta.final_agreed_price || selectedApplication.daily_meta.original_price}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Chat / Negotiation</p>
                                        <div className="max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                                            {(selectedApplication.messages || []).length === 0 && (
                                                <p className="text-xs text-neutral-500">No messages yet.</p>
                                            )}
                                            {(selectedApplication.messages || []).map((msg, idx) => (
                                                <div key={idx} className={`text-xs p-2 rounded-lg ${msg.sender === 'worker' ? 'bg-neutral-900 text-white ml-8' : 'bg-white text-neutral-700 mr-8 border border-neutral-200'}`}>
                                                    <div className="font-semibold mb-1">{msg.sender_name}</div>
                                                    <div>{msg.message}</div>
                                                    {msg.offer_amount != null && <div className="mt-1 font-bold">Offer: ₹{msg.offer_amount}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {(normalizedStatus(selectedApplication.status) === 'pending' || normalizedStatus(selectedApplication.status) === 'negotiating' || normalizedStatus(selectedApplication.status) === 'applied') && (
                                    <div className="p-5 border-t border-neutral-200 space-y-3">
                                        {isDaily && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-neutral-600">Your Offer</span>
                                                <div className="flex items-center gap-1 px-3 py-2 rounded-lg border border-neutral-300 bg-white">
                                                    <IndianRupee size={14} className="text-neutral-600" />
                                                    <input
                                                        type="number"
                                                        value={offerAmount}
                                                        onChange={(e) => setOfferAmount(e.target.value)}
                                                        className="w-24 outline-none text-sm bg-transparent text-neutral-900 placeholder:text-neutral-400 caret-neutral-900"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={chatMessage}
                                                onChange={(e) => setChatMessage(e.target.value)}
                                                placeholder="Type your message to poster..."
                                                className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 caret-neutral-900"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={isSendingMessage || !chatMessage.trim()}
                                                className="px-4 py-2 rounded-lg bg-neutral-900 text-white disabled:opacity-50"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {normalizedStatus(selectedApplication.status) === 'accepted' && (
                                    <div className="p-5 border-t border-neutral-200">
                                        <button
                                            onClick={handleMarkCompleted}
                                            disabled={isCompleting}
                                            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isCompleting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                            {isCompleting ? 'Marking...' : 'Mark Job as Completed'}
                                        </button>
                                        <p className="text-center text-xs text-neutral-500 mt-2">
                                            Only mark as completed once the work is securely done and payment received. Both you and the employer must complete the job.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Cancel Confirmation Modal */}
            <AnimatePresence>
                {showCancelModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => !cancellingId && setShowCancelModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md z-[101]"
                        >
                            <div className="bg-white rounded-2xl p-6 shadow-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-neutral-900">Cancel Application?</h3>
                                    <button 
                                        onClick={() => !cancellingId && setShowCancelModal(false)}
                                        className="text-neutral-500 hover:text-neutral-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="text-neutral-600 mb-6">
                                    Are you sure you want to cancel this application? This action cannot be undone.
                                    {isDaily && <span className="block mt-2 text-sm text-red-600">Note: You can only cancel if the job starts in more than 30 minutes.</span>}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCancelModal(false)}
                                        disabled={!!cancellingId}
                                        className="flex-1 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
                                    >
                                        Keep Application
                                    </button>
                                    <button
                                        onClick={handleCancelApplication}
                                        disabled={!!cancellingId}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {cancellingId ? <><Loader2 size={16} className="animate-spin" /> Cancelling...</> : 'Cancel Application'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
        </div>
    );
};

export default AppliedJobs;
