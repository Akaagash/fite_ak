import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    MapPin,
    Clock,
    Users,
    Calendar,
    Briefcase,
    Phone,
    Navigation,
    Map,
    IndianRupee,
    Star,
    Check,
    X,
    Plus,
    Minus,
    MessageCircle,
    Send,
} from 'lucide-react';
import { useMode } from '../../context/ModeContext';

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

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
    // MongoDB returns UTC without 'Z'; append it so JS parses correctly
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
    return `₹${salary.amount.toLocaleString('en-IN')}${periodMap[salary.period] ?? ''}` ;
};

const JobDetail: React.FC = () => {
    const { mode, jobId } = useParams();
    const { mode: contextMode } = useMode();
    const navigate = useNavigate();
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [negotiationPrice, setNegotiationPrice] = useState(800);
    const [isMapLoading, setIsMapLoading] = useState(false);
    const [job, setJob] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [applicants, setApplicants] = useState<Worker[]>([]);
    const [isApplicantsLoading, setIsApplicantsLoading] = useState(false);
    const [applicantsError, setApplicantsError] = useState('');
    const [chatText, setChatText] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const isDaily = mode === 'daily' || contextMode === 'daily';

    useEffect(() => {
        if (!jobId) return;
        const fetchJob = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
                    credentials: 'include',
                });
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

    // Derived display values from fetched job
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
        coordinates: job.location?.coordinates
            ? `${job.location.coordinates.lat}° N, ${job.location.coordinates.lng}° E`
            : '12.9716° N, 77.5946° E',
        lat: job.location?.coordinates?.lat ?? 12.9716,
        lng: job.location?.coordinates?.lng ?? 77.5946,
    } : null;

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
                const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/applicants`, {
                    credentials: 'include',
                });
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

    const handleLocationOpen = () => {
        setIsMapLoading(true);
        setTimeout(() => {
            setIsMapLoading(false);
            navigate(`/job-responses/${mode}/${jobId}`);
        }, 1200);
    };

    const handleWorkerSelect = (worker: Worker) => {
        if (worker.status !== 'rejected') {
            setSelectedWorker(worker);
            setNegotiationPrice(worker.negotiatedPrice || Number(job?.salary?.amount || 0));
        }
    };

    const incrementPrice = (amount: number) => {
        setNegotiationPrice((prev) => Math.max(0, prev + amount));
    };

    useEffect(() => {
        if (negotiationPrice < 0) setNegotiationPrice(0);
    }, [negotiationPrice]);

    const patchWorkerLocal = (applicationId: string, update: Partial<Worker>) => {
        setApplicants(prev => prev.map(w => w.applicationId === applicationId ? { ...w, ...update } : w));
        setSelectedWorker(prev => prev && prev.applicationId === applicationId ? { ...prev, ...update } : prev);
    };

    // Auto-scroll chat to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedWorker?.messages]);

    const sendMessage = async () => {
        if (!selectedWorker || !chatText.trim() || !jobId) return;
        setIsActionLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/applicants/${selectedWorker.applicationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    message: chatText.trim(),
                    offer_amount: negotiationPrice,
                }),
            });
            if (!res.ok) throw new Error('Failed to send message');
            const data = await res.json();
            const app = data.application;
            patchWorkerLocal(selectedWorker.applicationId, {
                messages: Array.isArray(app.messages) ? app.messages : [],
                status: app.status === 'negotiating' ? 'negotiating' : selectedWorker.status,
                negotiatedPrice: app.negotiated_price,
            });
            setChatText('');
        } catch (err: any) {
            alert(err.message || 'Could not send message');
        } finally {
            setIsActionLoading(false);
        }
    };

    const updateApplicantStatus = async (newStatus: 'accepted' | 'rejected' | 'completed') => {
        if (!selectedWorker || !jobId) return;
        setIsActionLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/api/jobs/${jobId}/applicants/${selectedWorker.applicationId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    status: newStatus,
                    negotiated_price: negotiationPrice,
                }),
            });
            if (!res.ok) throw new Error('Failed to update applicant status');
            patchWorkerLocal(selectedWorker.applicationId, { status: newStatus, negotiatedPrice: negotiationPrice });
        } catch (err: any) {
            alert(err.message || 'Could not update status');
        } finally {
            setIsActionLoading(false);
        }
    };

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
                {/* Left Accent Line */}
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

                {/* Location Section */}
                <div className="mt-6 pt-6 border-t-2 border-neutral-100">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between pl-4">
                        <div className="flex-1">
                            <p className="text-[11px] uppercase tracking-wider font-bold mb-3 text-neutral-500">
                                Posted Job Location
                            </p>
                            <div className="rounded-2xl overflow-hidden border border-neutral-200 shadow-sm" style={{ height: 240 }}>
                                <iframe
                                    title="Job Location"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    src={`https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${jobData.lat},${jobData.lng}&zoom=15`}
                                />
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-1">{jobData.location}</p>
                        </div>
                        <button
                            onClick={handleLocationOpen}
                            className="self-start lg:self-end inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-neutral-900 text-white hover:bg-neutral-800"
                        >
                            <Map size={18} />
                            Open Full Map
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Description & Requirements Grid */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Description */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm"
                >
                    <h3 className="text-lg font-bold mb-3 text-neutral-900">Description</h3>
                    <p className="text-sm leading-relaxed text-neutral-600">{jobData.description}</p>
                </motion.div>

                {/* Requirements */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-6 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm"
                >
                    <h3 className="text-lg font-bold mb-3 text-neutral-900">Requirements</h3>
                    <ul className="space-y-2.5">
                        {jobData.requirements.map((req, i) => (
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
                        <span className="text-xs font-medium text-neutral-500">Click to negotiate</span>
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
                                onClick={() => handleWorkerSelect(worker)}
                                className={`relative cursor-pointer p-4 pl-6 rounded-xl border-2 transition-all ${worker.status === 'accepted'
                                    ? 'bg-emerald-50 border-emerald-300'
                                    : worker.status === 'waiting' || worker.status === 'negotiating'
                                        ? 'bg-white border-neutral-200 hover:border-neutral-400'
                                        : 'bg-neutral-50 border-neutral-200 opacity-50'
                                    }`}
                            >
                                {/* Left accent line for worker cards */}
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
                                        {worker.status === 'accepted' && (
                                            <div className="mt-2 text-xs font-bold text-neutral-900">Primary Worker</div>
                                        )}
                                        {worker.status === 'waiting' && (
                                            <div className="mt-2 text-xs font-semibold text-neutral-700">In Queue</div>
                                        )}
                                        {worker.status === 'negotiating' && (
                                            <div className="mt-2 text-xs font-semibold text-blue-700">Negotiating</div>
                                        )}
                                        {worker.status === 'completed' && (
                                            <div className="mt-2 text-xs font-semibold text-neutral-700">Completed</div>
                                        )}
                                    </div>

                                    <a
                                        href={`tel:${worker.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`w-full py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${worker.status === 'accepted'
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                            }`}
                                    >
                                        <Phone size={12} />
                                        Call
                                    </a>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    )}
                </motion.div>
            )}

            {/* Negotiation Modal */}
            <AnimatePresence>
                {selectedWorker && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedWorker(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md h-[90vh] z-[101]"
                        >
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-white border-2 border-neutral-200 h-full flex flex-col">
                                {/* Header */}
                                <div className="px-6 py-5 bg-neutral-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={selectedWorker.avatar}
                                                alt={selectedWorker.name}
                                                className="w-14 h-14 rounded-full border-2 border-neutral-300 object-cover"
                                            />
                                            <div>
                                                <h3 className="text-lg font-black text-neutral-900">{selectedWorker.name}</h3>
                                                <div className="flex items-center gap-2 text-sm mt-0.5 text-neutral-600">
                                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                                    <span>{selectedWorker.rating}</span>
                                                    <span>•</span>
                                                    <span>{selectedWorker.distance}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedWorker(null)}
                                            className="p-2 rounded-lg transition-colors hover:bg-neutral-100 text-neutral-600"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Body */}
                                <div className="p-6 space-y-6 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#a3a3a3 #f5f5f5' }}>
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-wider font-bold mb-3 text-neutral-500">
                                            Negotiate Price
                                        </label>

                                        {/* Current Price Display */}
                                        <div className="flex items-center justify-between p-4 rounded-xl mb-4 bg-neutral-100">
                                            <span className="text-sm font-medium text-neutral-600">Original Price</span>
                                            <span className="text-lg font-black text-neutral-900">₹{Number(job?.salary?.amount || 0)}</span>
                                        </div>

                                        {/* Price Input with Increment/Decrement */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-neutral-700">Your Offer</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => incrementPrice(-50)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-neutral-200 text-neutral-900 hover:bg-neutral-300"
                                                    >
                                                        <Minus size={14} />
                                                    </button>

                                                    <div className="relative flex items-center gap-1 px-4 py-2 rounded-xl border-2 border-neutral-200 bg-neutral-50">
                                                        <IndianRupee size={16} className="text-neutral-900" />
                                                        <input
                                                            type="number"
                                                            value={negotiationPrice}
                                                            onChange={(e) => setNegotiationPrice(Number(e.target.value))}
                                                            className="w-20 bg-transparent text-xl font-black text-center focus:outline-none text-neutral-900 placeholder:text-neutral-400"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => incrementPrice(50)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-neutral-200 text-neutral-900 hover:bg-neutral-300"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quick Amount Buttons */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-neutral-400">Quick:</span>
                                                {[600, 700, 800, 900, 1000].map((amount) => (
                                                    <button
                                                        key={amount}
                                                        onClick={() => setNegotiationPrice(amount)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${negotiationPrice === amount
                                                            ? 'bg-neutral-900 text-white'
                                                            : 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300'
                                                            }`}
                                                    >
                                                        ₹{amount}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Price Range Slider */}
                                            <input
                                                type="range"
                                                min={500}
                                                max={1500}
                                                step={50}
                                                value={negotiationPrice}
                                                onChange={(e) => setNegotiationPrice(Number(e.target.value))}
                                                className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-neutral-900"
                                                style={{
                                                    background: `linear-gradient(to right, #171717 0%, #171717 ${((negotiationPrice - 500) / 1000) * 100}%, rgb(212 212 212 / 0.5) ${((negotiationPrice - 500) / 1000) * 100}%, rgb(212 212 212 / 0.5) 100%)`,
                                                }}
                                            />
                                            <div className="flex justify-between text-[10px] text-neutral-400">
                                                <span>₹500</span>
                                                <span>₹1500</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chat Thread */}
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-wider font-bold mb-3 text-neutral-500">
                                            Chat / Negotiation
                                        </label>
                                        <div className="h-36 overflow-y-scroll rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2 scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: '#a3a3a3 #f5f5f5' }}>
                                            {(selectedWorker.messages || []).length === 0 && (
                                                <p className="text-xs text-neutral-500">No messages yet.</p>
                                            )}
                                            {(selectedWorker.messages || []).map((msg, idx) => (
                                                <div key={idx} className={`text-xs p-2 rounded-lg ${msg.sender === 'employer' ? 'bg-neutral-900 text-white ml-8' : 'bg-white text-neutral-700 mr-8 border border-neutral-200'}`}>
                                                    <div className="font-semibold mb-1">{msg.sender_name}</div>
                                                    <div>{msg.message}</div>
                                                    {msg.offer_amount != null && (
                                                        <div className="mt-1 font-bold">Offer: ₹{msg.offer_amount}</div>
                                                    )}
                                                </div>
                                            ))}
                                            <div ref={chatEndRef} />
                                        </div>
                                    </div>

                                    {/* Action Buttons — inside scroll so all are reachable */}
                                    <div className="grid grid-cols-2 gap-2 pb-2">
                                        <a
                                            href={`tel:${selectedWorker.phone}`}
                                            className="py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                                        >
                                            <Phone size={16} />
                                            Call Worker
                                        </a>
                                        <button
                                            onClick={sendMessage}
                                            disabled={isActionLoading}
                                            className="py-2.5 rounded-xl font-bold text-sm transition-all bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
                                        >
                                            Send Offer
                                        </button>
                                        <button
                                            onClick={() => updateApplicantStatus('accepted')}
                                            disabled={isActionLoading}
                                            className="py-2.5 rounded-xl font-bold text-sm transition-all bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            Assign Work
                                        </button>
                                        <button
                                            onClick={() => updateApplicantStatus('rejected')}
                                            disabled={isActionLoading}
                                            className="py-2.5 rounded-xl font-bold text-sm transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => updateApplicantStatus('completed')}
                                            disabled={isActionLoading}
                                            className="col-span-2 py-2.5 rounded-xl font-bold text-sm transition-all bg-neutral-800 text-white hover:bg-neutral-900 disabled:opacity-50"
                                        >
                                            Mark Completed
                                        </button>
                                    </div>
                                </div>

                                {/* Sticky Footer — chat input only, always visible */}
                                <div className="px-6 pb-4 pt-3 border-t border-neutral-100 bg-white">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={chatText}
                                            onChange={(e) => setChatText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                            placeholder="Type message to applicant..."
                                            className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 caret-neutral-900"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={isActionLoading || !chatText.trim()}
                                            className="px-3 py-2 rounded-lg bg-neutral-900 text-white disabled:opacity-50"
                                        >
                                            <Send size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Map Loading Overlay */}
            <AnimatePresence>
                {isMapLoading && (
                    <motion.div
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="rounded-2xl px-8 py-6 shadow-2xl flex flex-col items-center gap-4 bg-white border-2 border-neutral-200">
                            <div className="h-12 w-12 rounded-full border-4 border-neutral-900 border-t-transparent animate-spin" />
                            <p className="text-base font-bold text-neutral-900">Loading maps...</p>
                            <p className="text-xs text-neutral-400">Preparing full interactive map view</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
};

export default JobDetail;
