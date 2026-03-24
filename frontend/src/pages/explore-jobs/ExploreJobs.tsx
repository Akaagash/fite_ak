/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '../../context/ModeContext';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Map as MapIcon, MapPin, Clock, IndianRupee, Star, Play, Square, Loader2, Navigation, Phone, X, Briefcase, ChevronDown, Filter, RefreshCw } from 'lucide-react';
import TextType from '../../components/ui/TextType';
import { LocationMap } from '../../components/ui/expand-map';

// import { useAuth } from '../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

// Negotiation types
import FloatingChatWidget from '../../components/ui/FloatingChatWidget';
import type { NegotiationMessage } from '../../components/ui/FloatingChatWidget';


interface Job {
    id: string;
    title: string;
    location: string;
    address: string;
    pay: string;
    salaryAmount: number;
    time: string;
    employer: string;
    employerRating: number;
    employerAvatar: string;
    distance: string;
    skills: string[];
    description: string;
    postedAt: string;
    coordinates: [number, number];
    job_type?: string;
    employer_contact?: string;
    employer_id?: string;
}

interface LongTermJob {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    type: string;
    requirements: string[];
    description: string;
    postedAt: string;
    matchScore?: number;
    applicants?: unknown[];
    coordinates?: [number, number];
    employer_contact?: string;
}

const ExploreJobs: React.FC = () => {
    const { mode } = useMode();
    const navigate = useNavigate();
    const auth = useAuth();
    const authRef = useRef(auth);
    authRef.current = auth;
    const [viewMode, setViewMode] = useState<'card' | 'map'>('card');
    const [isExploring, setIsExploring] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [foundJobs, setFoundJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Filter states for daily wage mode
    const [showFilters, setShowFilters] = useState(false);
    const [distanceFilter, setDistanceFilter] = useState('all');
    const [payMin, setPayMin] = useState('');
    const [payMax, setPayMax] = useState('');
    const [showLocationPermission, setShowLocationPermission] = useState(false);
    const [dailyJobs, setDailyJobs] = useState<Job[]>([]);
    const [longTermJobs, setLongTermJobs] = useState<LongTermJob[]>([]);
    const [, setIsFetchingJobs] = useState(false);
    const [isApplying, setIsApplying] = useState<string | null>(null);
    const [cardFilterOpen, setCardFilterOpen] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Negotiation states
    const [showNegotiationModal, setShowNegotiationModal] = useState(false);
    const [negotiatingJob, setNegotiatingJob] = useState<Job | null>(null);
    const [negotiationMessages, setNegotiationMessages] = useState<NegotiationMessage[]>([]);
    const [negotiationReason, setNegotiationReason] = useState<string>('');
    const [negotiationStatus, setNegotiationStatus] = useState<'idle' | 'active' | 'waiting_employer' | 'waiting_worker' | 'accepted' | 'rejected' | 'closed'>('idle');
    const [negotiationId, setNegotiationId] = useState<string | null>(null);
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    // Location permission persistence - initialize from localStorage
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(
        typeof window !== 'undefined' ? localStorage.getItem('fite_location_permission_granted') === 'true' : false
    );

    const isDaily = mode === 'daily';

    // Auto-start exploring if permission was previously granted and in daily mode
    useEffect(() => {
        if (locationPermissionGranted && isDaily && !isExploring && dailyJobs.length > 0) {
            // Auto-start exploring with the loaded jobs
            startExploringWithLocation();
        }
    }, [locationPermissionGranted, isDaily, dailyJobs.length, isExploring]);

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return 'recently';
        const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
        const diff = Date.now() - new Date(utcStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const formatPay = (salary: any) => {
        if (!salary) return '₹0';
        const amount = Number(salary.amount || 0).toLocaleString('en-IN');
        const suffixMap: Record<string, string> = { daily: '/day', hourly: '/hr', monthly: '/mo', yearly: ' LPA' };
        return `₹${amount}${suffixMap[salary.period] ?? ''}`;
    };


    const fetchJobs = useCallback(async (isManual?: boolean) => {
        setIsFetchingJobs(true);
        if (isManual) setIsRefreshing(true);
        try {
            const dailyRes = await fetch(`${API_BASE}/api/jobs?job_type=daily_wage&status=open`, { credentials: 'include' });
            let longRes = await fetch(`${API_BASE}/api/jobs/long-term-matches`, { credentials: 'include' });

            // If long-term matches requires auth and user is not authenticated, fall back
            // to the public long-term jobs endpoint so Explore shows content to unauthenticated users.
            if (!longRes.ok && (longRes.status === 401 || longRes.status === 403)) {
                longRes = await fetch(`${API_BASE}/api/jobs?job_type=long_term&status=open`);
            }

            const dailyData = dailyRes.ok ? await dailyRes.json() : { jobs: [] };
            const longData = longRes.ok ? await longRes.json() : { jobs: [] };

            // Debug logging to help troubleshoot missing jobs in the UI
            // (visible in browser console when dev server is running)
            // Log HTTP statuses and initial payloads
            try {
                console.log('ExploreJobs fetch status:', { daily: dailyRes.status, long: longRes.status });
                console.log('ExploreJobs longData (initial):', longData);
            } catch { /* ignore if console not available */ }

            // If long-term matches returned an empty list, try the public long-term jobs endpoint
                    if ((!longData.jobs || longData.jobs.length === 0)) {
                try {
                    const publicRes = await fetch(`${API_BASE}/api/jobs?job_type=long_term&status=open`);
                    if (publicRes.ok) {
                        const pub = await publicRes.json();
                        console.log('ExploreJobs public fallback data length:', (pub.jobs || []).length);
                        // mutate jobs array inside longData object for compatibility with existing code
                        // pub may be loosely typed
                        longData.jobs = pub.jobs || [];
                    }
                } catch { /* ignore fallback errors */ }
            }

            // Filter out user's own posted jobs
            const currentUserId = authRef.current.user?.user_id;
            const filteredDailyRaw = (dailyData.jobs || []).filter((job: any) => !currentUserId || job.employer_id !== currentUserId);

            const mappedDaily: Job[] = filteredDailyRaw.map((job: any, idx: number) => ({
                id: job._id,
                title: job.title,
                location: job.location?.city || job.location?.address || 'Unknown',
                address: job.location?.address || 'Unknown',
                pay: formatPay(job.salary),
                salaryAmount: Number(job.salary?.amount || 0),
                time: job.work_hours || 'Flexible',
                employer: job.employer_name || 'Employer',
                employerRating: 4.2 + ((idx % 7) / 10),
                employerAvatar: `https://i.pravatar.cc/150?img=${(idx % 60) + 1}`,
                distance: 'N/A',
                skills: Array.isArray(job.skills_required) ? job.skills_required : [],
                description: job.description || '',
                postedAt: formatTimeAgo(job.created_at),
                coordinates: [job.location?.coordinates?.lat ?? 12.9716, job.location?.coordinates?.lng ?? 77.5946],
                employer_id: job.employer_id,
            }));

            // Filter out user's own long-term jobs too
            const filteredLongRaw = (longData.jobs || []).filter((job: any) => !currentUserId || job.employer_id !== currentUserId);

            const mappedLong: LongTermJob[] = filteredLongRaw.map((job: any) => ({
                id: job._id,
                title: job.title,
                company: job.employer_name || 'Company',
                location: job.location?.address || 'Unknown',
                salary: formatPay(job.salary),
                type: job.work_hours || 'Full-time',
                requirements: Array.isArray(job.requirements) ? job.requirements : [],
                description: job.description || '',
                postedAt: formatTimeAgo(job.created_at),
                        matchScore: job.matchScore || 0,
                applicants: Array.isArray(job.applicants) ? job.applicants : (job.applicants_count ? [] : []),
            }));

            // Deduplicate long-term jobs by title|company|salary keeping the highest matchScore
            const dedupMap = new Map<string, LongTermJob>();
            mappedLong.forEach((j) => {
                const key = `${j.title}||${j.company}||${j.salary}`;
                const existing = dedupMap.get(key);
                if (!existing || (j.matchScore || 0) > (existing.matchScore || 0)) {
                    dedupMap.set(key, j);
                }
            });
            

            setDailyJobs(mappedDaily);

            // If user is authenticated, remove jobs they've already applied to
            const userId = authRef.current.user?.user_id;
            // compute a local fallback matchScore from resume_text when backend didn't provide one
            const resumeText: string | undefined = (authRef.current.user as any)?.resume_text;

            const stopwords = new Set(['the','and','is','in','to','of','a','for','on','with','as','by','an','at','from','or','that','this','it','be','are','was','were','has','have','but','not']);

            const computeLocalScore = (resume: string | undefined, job: LongTermJob) => {
                try {
                    if (!resume) return 0;
                    const tokenize = (s = '') => (s || '').toLowerCase().match(/[a-z0-9_+#.]+/g) || [];

                    const resumeTokens = tokenize(resume).filter(t => !stopwords.has(t));
                    const resumeSet = new Set(resumeTokens);

                    // Build weighted job tokens: title (weight 3), requirements (weight 2), description (weight 1)
                    const titleTokens = tokenize(job.title || '');
                    const reqTokens = tokenize((job.requirements || []).join(' '));
                    const descTokens = tokenize(job.description || '');

                    let scoreNumerator = 0;
                    let scoreDenom = 0;

                    // Title tokens (higher weight)
                    scoreDenom += titleTokens.length * 3 || 1;
                    titleTokens.forEach(t => { if (resumeSet.has(t)) scoreNumerator += 3; });

                    // Requirements
                    scoreDenom += reqTokens.length * 2 || 1;
                    reqTokens.forEach(t => { if (resumeSet.has(t)) scoreNumerator += 2; });

                    // Description
                    scoreDenom += descTokens.length * 1 || 1;
                    descTokens.forEach(t => { if (resumeSet.has(t)) scoreNumerator += 1; });

                        const raw = scoreDenom > 0 ? (scoreNumerator / scoreDenom) : 0;
                        const pct = Math.round(Math.min(1, raw) * 100);
                        return Math.max(0, Math.min(100, pct));
                    } catch { return 0; }
            };

            // build deduped list and then apply local score to deduped items
            const dedupedLong = Array.from(dedupMap.values());

            // apply local score to any deduped job missing a backend matchScore
            dedupedLong.forEach((jl) => {
                if (!jl.matchScore || jl.matchScore === 0) {
                    const local = computeLocalScore(resumeText, jl);
                    jl.matchScore = local;
                }
            });

            // Debug: log resumeText presence and computed matchScores
            try {
                console.log('ExploreJobs: resumeText present?', !!resumeText);
                console.log('ExploreJobs: dedupedLong matchScores', dedupedLong.map(j => ({ id: j.id, title: j.title, matchScore: j.matchScore })));
            } catch { /* ignore */ }

            if (userId) {
                const filtered = dedupedLong.filter((j) => {
                    const apps = (j.applicants || []) as any[];
                    try {
                        return !apps.some((a: any) => a === userId || (a && (a.user_id === userId || a.applicant_id === userId)));
                        } catch { return true; }
                });
                setLongTermJobs(filtered);
            } else {
                setLongTermJobs(dedupedLong);
            }
        } finally {
            setIsFetchingJobs(false);
            setIsRefreshing(false);
            setLastRefreshed(new Date());
        }
    }, []);  // stable — uses authRef inside

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Auto-refresh every 5 minutes (300000ms) — no longer polling every 15s
    useEffect(() => {
        const timer = setInterval(() => {
            fetchJobs();
        }, 300000);

        return () => {
            clearInterval(timer);
        };
    }, [fetchJobs]);

    // Reset state when switching between daily and long-term modes
    useEffect(() => {
        setIsExploring(false);
        setFoundJobs([]);
        setSelectedJob(null);
        setShowNegotiationModal(false);
        setShowFilters(false);
    }, [mode]);

    useEffect(() => {
        if (isExploring) {
            setFoundJobs(dailyJobs);
        }
    }, [dailyJobs, isExploring]);

    const applyToJob = async (jobId: string, jobType: 'daily' | 'longterm', offeredPrice?: number) => {
        setIsApplying(jobId);
        try {
            const res = await fetch(`${API_BASE}/api/applications/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    job_id: jobId,
                    job_type: jobType,
                    offered_price: jobType === 'daily' ? offeredPrice : undefined,
                    cover_letter: jobType === 'longterm' ? 'Interested in this role' : undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to apply');
            alert('Application submitted successfully');
            // Refresh jobs so the applied job is removed from long-term matches
            fetchJobs();
        } catch (err: any) {
            alert(err.message || 'Could not apply to this job');
        } finally {
            setIsApplying(null);
        }
    };

    // ── WebSocket Reference ────────────────────────────────────────────────
    const wsRef = useRef<WebSocket | null>(null);

    // ── Negotiation handlers (real backend) ────────────────────────────────

    const handleNegotiateClick = async (job: Job) => {
        setNegotiatingJob(job);
        setNegotiationMessages([]);
        setNegotiationReason('');
        setNegotiationStatus('active');
        setNegotiationId(null);
        setIsSendingMessage(false);
        setShowNegotiationModal(true);
        setSelectedJob(null); // Close the detail modal
        
        // Try to fetch existing active negotiation
        try {
            const res = await fetch(`${API_BASE}/api/negotiations/my/all`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const existing = data.negotiations.find((n: any) => n.job_id === job.id && n.status === 'active');
                if (existing) {
                    setNegotiationId(existing._id);
                    connectWebSocket(existing._id);
                }
            }
        } catch { /* ignore */ }
    };

    const connectWebSocket = (negId: string) => {
        if (wsRef.current) wsRef.current.close();
        const token = localStorage.getItem('token') || '';
        const ws = new WebSocket(`${WS_BASE}/api/negotiations/ws/${negId}?token=${token}`);
        
        ws.onopen = () => console.log('Negotiation WS connected (worker)');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'history') {
                    const msgs = (data.messages || []).map(mapWsMessage);
                    setNegotiationMessages(msgs);
                    setNegotiationStatus(data.status || 'active');
                } else if (data.type === 'message') {
                    setNegotiationMessages(prev => {
                        const key = `${data.sent_at}-${data.sender_id}`;
                        if (prev.some(m => m.id === key)) return prev; // dedup
                        return [...prev, mapWsMessage(data)];
                    });
                } else if (data.type === 'accepted') {
                    setNegotiationStatus('accepted');
                } else if (data.type === 'session_ended') {
                    setNegotiationStatus(data.status || 'closed');
                }
            } catch (e) {
                console.error('WS parse error', e);
            }
        };

        ws.onerror = (err) => console.error('WS error (worker)', err);

        ws.onclose = () => console.log('Negotiation WS closed (worker)');

        wsRef.current = ws;
    };

    const mapWsMessage = (m: any): NegotiationMessage => ({
        id: m.id || `${m.sent_at}-${m.sender_id}`,
        sender: m.sender_role === 'worker' ? 'worker' : 'employer',
        senderName: m.sender_name || (m.sender_role === 'worker' ? 'You' : 'Employer'),
        message: m.message,
        timestamp: new Date(m.sent_at).toLocaleTimeString(),
        type: m.offer_amount ? 'counter_offer' : 'message',
        priceProposal: m.offer_amount || undefined,
    });

    useEffect(() => {
        return () => wsRef.current?.close();
    }, []);

    const authHeaders = () => {
        const token = localStorage.getItem('token') || '';
        return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    };

    const handleSendNegotiationMessage = async (msgText: string = negotiationReason, offerAmount?: number) => {
        if (!negotiatingJob || isSendingMessage) return;
        setIsSendingMessage(true);

        try {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                // Send via WS if connected
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    message: msgText,
                    offer_amount: offerAmount,
                }));
                setNegotiationReason('');
            } else if (!negotiationId) {
                // Start new negotiation then connect WS
                const res = await fetch(`${API_BASE}/api/negotiations/start`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({
                        job_id: negotiatingJob.id,
                        employer_id: negotiatingJob.employer_id || '',
                        employer_name: negotiatingJob.employer,
                        original_price: negotiatingJob.salaryAmount,
                        message: msgText,
                        offer_amount: offerAmount,
                    }),
                });
                if (!res.ok) throw new Error('Failed to start negotiation');
                const data = await res.json();
                setNegotiationId(data.negotiation._id);
                setNegotiationReason('');
                connectWebSocket(data.negotiation._id);
            } else {
                // Fallback REST if WS disconnected but ID exists
                const res = await fetch(`${API_BASE}/api/negotiations/${negotiationId}/message`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ message: msgText, offer_amount: offerAmount }),
                });
                if (!res.ok) throw new Error('Failed to send message');
                setNegotiationReason('');
            }
        } catch (err: any) {
            alert(err.message || 'Failed to send message');
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleAcceptNegotiatedPrice = async () => {
        if (!negotiationId) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'accept' }));
        } else {
            try {
                await fetch(`${API_BASE}/api/negotiations/${negotiationId}/accept`, { method: 'POST', headers: authHeaders() });
            } catch { /* ignore */ }
        }
        setNegotiationStatus('accepted');
    };

    const handleRejectNegotiation = async () => {
        if (!negotiationId) {
            setShowNegotiationModal(false);
            return;
        }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'reject' }));
        } else {
            try { await fetch(`${API_BASE}/api/negotiations/${negotiationId}/reject`, { method: 'POST', credentials: 'include' }); } catch { /* ignore */ }
        }
        setShowNegotiationModal(false);
        wsRef.current?.close();
    };

    const handleProceedWithJob = async () => {
        if (!negotiatingJob || !negotiationId) return;
        // Find the final agreed price from the last offer in messages
        let finalPrice = negotiatingJob.salaryAmount;
        for (let i = negotiationMessages.length - 1; i >= 0; i--) {
            if (negotiationMessages[i].priceProposal) {
                finalPrice = negotiationMessages[i].priceProposal!;
                break;
            }
        }
        await applyToJob(negotiatingJob.id, 'daily', finalPrice);
        setShowNegotiationModal(false);
    };

    const requestLocationAndStart = () => {
        // If permission was previously granted, skip the modal and start directly
        if (locationPermissionGranted) {
            startExploringWithLocation();
        } else {
            setShowLocationPermission(true);
        }
    };

    const startExploringWithLocation = () => {
        setShowLocationPermission(false);
        setIsLoadingLocation(true);

        // Get user location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Save permission to localStorage
                localStorage.setItem('fite_location_permission_granted', 'true');
                setLocationPermissionGranted(true);
                setUserLocation([position.coords.latitude, position.coords.longitude]);
                setIsExploring(true);
                setIsLoadingLocation(false);
                setFoundJobs(dailyJobs);
            },
            () => {
                // Fallback to Bangalore coordinates even on error
                localStorage.setItem('fite_location_permission_granted', 'true');
                setLocationPermissionGranted(true);
                setUserLocation([12.9716, 77.5946]);
                setIsExploring(true);
                setIsLoadingLocation(false);
                setFoundJobs(dailyJobs);
            }
        );
    };

    const startExploring = () => {
        startExploringWithLocation();
    };

    const stopExploring = () => {
        setIsExploring(false);
        setFoundJobs([]);
        setUserLocation(null);
    };

    const calculateDistance = (jobCoords: [number, number]) => {
        if (!userLocation) return "N/A";
        const R = 6371; // km
        const dLat = (jobCoords[0] - userLocation[0]) * Math.PI / 180;
        const dLon = (jobCoords[1] - userLocation[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLocation[0] * Math.PI / 180) * Math.cos(jobCoords[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1) + " km";
    };

    // Apply filters to jobs
    const getFilteredJobs = () => {
        return foundJobs.filter((job) => {
            // Distance filter
            if (distanceFilter !== 'all') {
                const distStr = calculateDistance(job.coordinates);
                const jobDistance = parseFloat(distStr);
                const maxDist = parseInt(distanceFilter);
                if (jobDistance > maxDist) return false;
            }

            // Pay range filter
            if (payMin || payMax) {
                const jobPayNum = job.salaryAmount;
                if (payMin && jobPayNum < parseInt(payMin)) return false;
                if (payMax && jobPayNum > parseInt(payMax)) return false;
            }

            return true;
        });
    };

    const filteredJobs = getFilteredJobs();

    return (
        <div className="w-full min-h-screen relative px-4 md:px-8 pt-8 pb-10">
            <div className="mx-auto w-full max-w-6xl">

            {/* Header Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
                {/* Left: Title with Typewriter */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                        <TextType
                            text="Explore Jobs"
                            typingSpeed={80}
                            loop={false}
                            showCursor={false}
                        />
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1 font-medium">
                        {isDaily ? "Find daily wage opportunities near you" : "Discover long-term career opportunities"}
                    </p>
                    {/* Last Refreshed + Manual Refresh */}
                    {lastRefreshed && (
                        <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
                            Updated {Math.round((Date.now() - lastRefreshed.getTime()) / 60000) || '<1'}m ago
                        </span>
                    )}
                    <button
                        onClick={() => fetchJobs(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white border-2 border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm disabled:opacity-50"
                        title="Refresh jobs"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>

                {/* Right: Control Bar */}
                    <div className="flex items-center gap-3">
                    {/* View Switcher - Cards/Map (only for daily wage) */}
                    {isDaily && isExploring && foundJobs.length > 0 && (
                        <div className="relative flex w-[92px] items-center rounded-xl border-2 border-neutral-200 bg-white p-1 shadow-sm">
                            <motion.div
                                layoutId="exploreViewToggle"
                                className="absolute inset-y-1 left-1 w-1/2 rounded-lg bg-neutral-900 shadow-sm"
                                initial={false}
                                animate={{ x: viewMode === 'card' ? '0%' : '100%' }}
                                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                            />
                            <button
                                onClick={() => setViewMode('card')}
                                className={`relative z-10 flex h-9 w-1/2 items-center justify-center rounded-lg transition-colors ${viewMode === 'card' ? 'text-white' : 'text-neutral-700 hover:text-neutral-900'
                                    }`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`relative z-10 flex h-9 w-1/2 items-center justify-center rounded-lg transition-colors ${viewMode === 'map' ? 'text-white' : 'text-neutral-700 hover:text-neutral-900'
                                    }`}
                            >
                                <MapIcon size={16} />
                            </button>
                        </div>
                    )}

                    {/* Explore/Stop Button */}
                    {isDaily && (
                        <button
                            onClick={isExploring ? stopExploring : requestLocationAndStart}
                            disabled={isLoadingLocation}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${isExploring
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                } ${isLoadingLocation ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoadingLocation ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Getting Location...
                                </>
                            ) : isExploring ? (
                                <>
                                    <Square size={16} />
                                    Stop Exploring
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    Start Exploring
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Status Indicator */}
            {isDaily && isExploring && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 mb-6"
                >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div
                            className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-neutral-700">Status: Active</span>
                            </div>
                            <div className="w-px h-4 bg-neutral-300" />
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                                <Navigation size={14} />
                                <span>Searching for jobs nearby...</span>
                            </div>
                            {filteredJobs.length > 0 && (
                                <>
                                    <div className="w-px h-4 bg-neutral-300" />
                                    <span className="text-sm font-semibold text-neutral-800">{filteredJobs.length} jobs found</span>
                                </>
                            )}
                        </div>

                        {/* Filter Toggle Button */}
                        {foundJobs.length > 0 && (
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${showFilters
                                    ? 'bg-neutral-900 text-white border-neutral-900'
                                    : 'bg-white text-neutral-800 border-2 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 shadow-sm'
                                    }`}
                            >
                                <Filter size={16} />
                                Filters
                                <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>

                    {/* Filter Panel */}
                    <AnimatePresence>
                        {showFilters && foundJobs.length > 0 && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div
                                    className="mt-4 p-4 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm"
                                >
                                    <div className="flex flex-wrap items-end gap-6">
                                        {/* Distance Filter */}
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                                                <Navigation size={12} className="inline mr-1" />
                                                Distance
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {['all', '2', '5', '10', '20'].map((dist) => (
                                                    <button
                                                        key={dist}
                                                        onClick={() => setDistanceFilter(dist)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${distanceFilter === dist
                                                            ? 'bg-neutral-900 text-white'
                                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                                            }`}
                                                    >
                                                        {dist === 'all' ? 'Any' : `${dist} km`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Pay Range Filter */}
                                        <div className="flex-1 min-w-[250px]">
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                                                <IndianRupee size={12} className="inline mr-1" />
                                                Pay Range (per day)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
                                                    <span className="text-xs text-neutral-400">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Min"
                                                        value={payMin}
                                                        onChange={(e) => setPayMin(e.target.value)}
                                                        className="bg-transparent text-sm w-20 outline-none text-neutral-800 placeholder:text-neutral-400"
                                                    />
                                                </div>
                                                <span className="text-neutral-400">—</span>
                                                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
                                                    <span className="text-xs text-neutral-400">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="Max"
                                                        value={payMax}
                                                        onChange={(e) => setPayMax(e.target.value)}
                                                        className="bg-transparent text-sm w-20 outline-none text-neutral-800 placeholder:text-neutral-400"
                                                    />
                                                </div>
                                            </div>
                                            {/* Quick presets */}
                                            <div className="flex gap-1.5 mt-2">
                                                <button onClick={() => { setPayMin('500'); setPayMax('800'); }} className="px-2 py-0.5 text-xs rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200">₹500-800</button>
                                                <button onClick={() => { setPayMin('800'); setPayMax('1200'); }} className="px-2 py-0.5 text-xs rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200">₹800-1.2k</button>
                                                <button onClick={() => { setPayMin('1200'); setPayMax(''); }} className="px-2 py-0.5 text-xs rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200">₹1.2k+</button>
                                            </div>
                                        </div>

                                        {/* Clear Filters */}
                                        <button
                                            onClick={() => { setDistanceFilter('all'); setPayMin(''); setPayMax(''); }}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {isDaily ? (
                    // Daily Wage Content
                    !isExploring ? (
                        // Not exploring - Show start prompt
                        <motion.div
                            key="start-prompt"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="relative z-10 flex flex-col items-center justify-center py-20"
                        >
                            <div
                                className="p-8 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm text-center max-w-md"
                            >
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                                    <MapPin size={32} className="text-neutral-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-neutral-800 mb-2">Start Exploring Jobs</h2>
                                <p className="text-neutral-600 mb-6">
                                    Click the button above to share your location and start finding daily wage jobs near you.
                                    Your profile will be visible to employers looking for workers with your skills.
                                </p>
                                <button
                                    onClick={requestLocationAndStart}
                                    className="px-6 py-3 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors"
                                >
                                    <Play size={16} className="inline mr-2" />
                                    Start Exploring
                                </button>
                            </div>
                        </motion.div>
                    ) : foundJobs.length === 0 ? (
                        // Exploring but no jobs yet
                        <motion.div
                            key="searching"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-10 flex flex-col items-center justify-center py-20"
                        >
                            <Loader2 size={48} className="text-neutral-400 animate-spin mb-4" />
                            <p className="text-neutral-600">Scanning for jobs in your area...</p>
                        </motion.div>
                    ) : filteredJobs.length === 0 ? (
                        // No jobs match the current filters
                        <motion.div
                            key="no-filtered"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-10 flex flex-col items-center justify-center py-20"
                        >
                            <Filter size={48} className="text-neutral-400 mb-4" />
                            <p className="text-neutral-600 text-center">
                                No jobs match your filters.<br/>Try adjusting your search criteria.
                            </p>
                        </motion.div>
                    ) : viewMode === 'card' ? (
                        // Cards View
                        <motion.div
                            key="cards"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        >
                            {filteredJobs.map((job, index) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group relative cursor-pointer p-5 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300"
                                >
                                    {/* Accent Line */}
                                    <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-neutral-800" />

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-neutral-800 pr-3">{job.title}</h3>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-medium">
                                                {calculateDistance(job.coordinates)}
                                            </span>
                                            {/* Filter Button */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCardFilterOpen(cardFilterOpen === job.id ? null : job.id);
                                                    }}
                                                    className="p-2 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800 transition-colors font-medium"
                                                    title="Filter options"
                                                >
                                                    <Filter size={16} />
                                                </button>

                                                {/* Filter Dropdown */}
                                                <AnimatePresence>
                                                    {cardFilterOpen === job.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -8 }}
                                                            className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border-2 border-neutral-200 shadow-lg z-50"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="p-3 space-y-3">
                                                                {/* Distance Filter */}
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                                                                        Distance
                                                                    </label>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {['2', '5', '10'].map((dist) => (
                                                                            <button
                                                                                key={dist}
                                                                                onClick={() => {
                                                                                    setDistanceFilter(dist);
                                                                                    setCardFilterOpen(null);
                                                                                }}
                                                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${distanceFilter === dist
                                                                                    ? 'bg-neutral-900 text-white'
                                                                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                                                                    }`}
                                                                            >
                                                                                {dist} km
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Pay Range Filter */}
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                                                                        Pay Range
                                                                    </label>
                                                                    <div className="space-y-1.5">
                                                                        <button
                                                                            onClick={() => {
                                                                                setPayMin(Math.floor(job.salaryAmount * 0.8).toString());
                                                                                setPayMax(Math.ceil(job.salaryAmount * 1.2).toString());
                                                                                setCardFilterOpen(null);
                                                                            }}
                                                                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                                                                        >
                                                                            <IndianRupee size={12} className="inline mr-1" />
                                                                            ±20% of {job.pay}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setPayMin('500');
                                                                                setPayMax('');
                                                                                setCardFilterOpen(null);
                                                                            }}
                                                                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                                                                        >
                                                                            Min ₹500+
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Skills Filter */}
                                                                {job.skills.length > 0 && (
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                                                                            Skills
                                                                        </label>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {job.skills.slice(0, 3).map((skill) => (
                                                                                <span
                                                                                    key={skill}
                                                                                    className="px-2.5 py-1 rounded-lg text-xs bg-neutral-100 text-neutral-600 font-medium"
                                                                                >
                                                                                    {skill}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Apply & Close */}
                                                                <button
                                                                    onClick={() => {
                                                                        setCardFilterOpen(null);
                                                                    }}
                                                                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors mt-2"
                                                                >
                                                                    Apply & Close
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Employer */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <img src={job.employerAvatar} alt={job.employer} className="w-6 h-6 rounded-full" />
                                        <span className="text-sm text-neutral-600">{job.employer}</span>
                                        <div className="flex items-center gap-1 text-xs">
                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                            <span className="text-neutral-600">{job.employerRating}</span>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="space-y-2 mb-4" onClick={() => setSelectedJob(job)}>
                                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                                            <MapPin size={14} className="text-neutral-500" />
                                            <span>{job.location}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm text-neutral-700">
                                                <IndianRupee size={14} className="text-neutral-500" />
                                                <span className="font-semibold">{job.pay}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                                                <Clock size={14} className="text-neutral-500" />
                                                <span>{job.time}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skills */}
                                    <div className="flex flex-wrap gap-1 mb-3" onClick={() => setSelectedJob(job)}>
                                        {job.skills.slice(0, 3).map((skill) => (
                                            <span key={skill} className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between" onClick={() => setSelectedJob(job)}>
                                        <span className="text-xs text-neutral-500">{job.postedAt}</span>
                                        <button className="text-xs font-medium text-neutral-700 hover:text-neutral-900">
                                            View Details →
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        // Map View - Grid of Expandable Location Cards
                        <motion.div
                            key="map"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-10"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredJobs.map((job) => (
                                    <div
                                        key={job.id}
                                        className="p-4 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm cursor-pointer hover:shadow-md hover:border-neutral-300 transition-all"
                                    >
                                        {/* Job Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h4 className="font-semibold text-neutral-800">{job.title}</h4>
                                                <p className="text-sm text-neutral-600">{job.employer}</p>
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">
                                                {calculateDistance(job.coordinates)}
                                            </span>
                                        </div>

                                        {/* Expandable Map Card */}
                                        <LocationMap
                                            location={job.location}
                                            coordinates={`${job.coordinates[0].toFixed(4)}° N, ${job.coordinates[1].toFixed(4)}° E`}
                                            isDark={false}
                                        />

                                        {/* Job Details */}
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-200">
                                            <span className="font-bold text-neutral-800">{job.pay}</span>
                                            <button
                                                onClick={() => setSelectedJob(job)}
                                                className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )
                ) : (
                    // Long Term Jobs - Simple listing
                    <motion.div
                        key="longterm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                    >
                        {longTermJobs.map((job, index) => {
                            // matchScore is a percentage (0-100) from backend
                            let matchLabel = 'Explore';
                            if ((job.matchScore || 0) >= 75) matchLabel = 'Best Suits';
                            else if ((job.matchScore || 0) >= 40) matchLabel = 'Good Suits';
                            return (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group relative cursor-pointer p-5 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300"
                                >
                                    {/* Accent Line */}
                                    <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-neutral-600" />

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-neutral-800 pr-3">{job.title}</h3>
                                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-md border border-neutral-300 text-neutral-600">
                                            {job.type}
                                        </span>
                                    </div>

                                    {/* Company */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <Briefcase size={14} className="text-neutral-500" />
                                        <span className="text-sm font-medium text-neutral-700">{job.company}</span>
                                    </div>

                                    {/* Metrics */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                                            <MapPin size={14} className="text-neutral-500" />
                                            <span>{job.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                                            <IndianRupee size={14} className="text-neutral-500" />
                                            <span className="font-medium">{job.salary}</span>
                                        </div>
                                    </div>

                                    {/* Requirements */}
                                    <div className="flex flex-wrap gap-1 mb-3">
                                                            {job.requirements.map((req, ri) => (
                                                                <span key={`${req}-${ri}`} className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                                                                    {req}
                                                                </span>
                                                            ))}
                                                        </div>

                                    {/* Footer */}
                                    <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-neutral-500">{job.postedAt}</span>
                                            <span className={`text-xs font-semibold ${job.matchScore && job.matchScore >= 75 ? 'text-amber-600' : job.matchScore && job.matchScore >= 40 ? 'text-emerald-600' : 'text-neutral-500'}`}>{matchLabel}</span>
                                        </div>

                                        <div>
                                            <button
                                                onClick={() => setSelectedJob({
                                                    id: job.id,
                                                    title: job.title,
                                                    employer: job.company || 'Company',
                                                    employerAvatar: `https://i.pravatar.cc/150?img=${(index % 60) + 1}`,
                                                    employerRating: 4.2,
                                                    coordinates: [job.coordinates?.[0] ?? 12.9716, job.coordinates?.[1] ?? 77.5946],
                                                    address: job.location || 'Remote',
                                                    location: job.location || 'Remote',
                                                    distance: calculateDistance([job.coordinates?.[0] ?? 12.9716, job.coordinates?.[1] ?? 77.5946]),
                                                    pay: job.salary || '₹0',
                                                    salaryAmount: 0,
                                                    time: job.type || 'Full-time',
                                                    description: job.description || '',
                                                    skills: Array.isArray(job.requirements) ? job.requirements : [],
                                                    postedAt: job.postedAt,
                                                    job_type: 'long_term',
                                                    employer_contact: job.employer_contact || '+919876543210'
                                                })}
                                                className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 ml-2"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Job Detail Modal */}
            <AnimatePresence>
                {selectedJob && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedJob(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[90vh] z-[101] overflow-auto"
                        >
                            <div className="rounded-2xl bg-white border-2 border-neutral-200 shadow-2xl overflow-hidden">
                                <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white border-2 border-neutral-300 hover:bg-neutral-100 transition-colors shadow-lg">
                                    <X size={20} className="text-neutral-700" />
                                </button>

                                <div className="px-6 py-6 bg-neutral-50 border-b border-neutral-200">
                                    <h3 className="text-2xl font-bold text-neutral-800 mb-2">{selectedJob.title}</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <img src={selectedJob.employerAvatar} alt={selectedJob.employer} className="w-8 h-8 rounded-full" />
                                            <span className="text-sm font-medium text-neutral-700">{selectedJob.employer}</span>
                                            <div className="flex items-center gap-1">
                                                <Star size={12} className="fill-amber-400 text-amber-400" />
                                                <span className="text-sm text-neutral-600">{selectedJob.employerRating}</span>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">{calculateDistance(selectedJob.coordinates)}</span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Pay</p>
                                            <p className="text-xl font-bold text-neutral-800">{selectedJob.pay}</p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                                            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Timing</p>
                                            <p className="text-xl font-bold text-neutral-800">{selectedJob.time}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Location</h4>
                                        <div className="flex items-start gap-2 text-neutral-600">
                                            <MapPin size={16} className="mt-0.5 shrink-0" />
                                            <span>{selectedJob.address}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Description</h4>
                                        <p className="text-neutral-600">{selectedJob.description}</p>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Skills Required</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedJob.skills || []).map((skill: string) => (
                                                <span key={skill} className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium border border-neutral-200">{skill}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Job Location</h4>
                                        <LocationMap
                                            location={selectedJob.address}
                                            coordinates={`${selectedJob.coordinates?.[0]?.toFixed?.(4) ?? 0}° N, ${selectedJob.coordinates?.[1]?.toFixed?.(4) ?? 0}° E`}
                                            isDark={false}
                                        />
                                    </div>

                                    {/* Actions: daily wages keep original buttons; long-term only Apply */}
                                    {isDaily ? (
                                        <>
                                            <div className="flex gap-3">
                                                <a href={`tel:${selectedJob.employer_contact || '+919876543210'}`} className="flex-1 py-3 rounded-lg bg-neutral-200 text-neutral-700 font-semibold text-sm hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2">
                                                    <Phone size={16} /> Call Employer
                                                </a>
                                                <button onClick={() => handleNegotiateClick(selectedJob)} className="flex-1 py-3 rounded-lg border-2 border-amber-500 text-amber-600 font-semibold text-sm hover:bg-amber-50 transition-colors">
                                                    💬 Negotiate Price
                                                </button>
                                            </div>
                                            <button onClick={() => applyToJob(selectedJob.id, 'daily', selectedJob.salaryAmount)} disabled={isApplying === selectedJob.id} className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors">
                                                {isApplying === selectedJob.id ? 'Applying...' : 'Accept Job'}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3 pt-4">
                                            <button onClick={() => navigate(`/apply/${selectedJob.id}`)} className="flex-1 py-3 rounded-lg bg-neutral-900 text-white font-semibold text-sm hover:bg-neutral-800 transition-colors">Apply Now</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Location Permission Modal */}
            <AnimatePresence>
                {showLocationPermission && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                            onClick={() => setShowLocationPermission(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-2xl shadow-2xl z-[101] p-6"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Navigation size={32} className="text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-bold text-neutral-800 mb-2">Allow Location Access</h3>
                                <p className="text-neutral-600 mb-6">
                                    To find jobs near you, we need access to your location. Your location will be used to show nearby job opportunities and calculate distances.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowLocationPermission(false)}
                                        className="flex-1 py-3 rounded-xl border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={startExploring}
                                        className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                                    >
                                        Allow & Start
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Price Negotiation Chat Modal */}
            <AnimatePresence>
                {showNegotiationModal && negotiatingJob && (
                    <FloatingChatWidget
                        isOpen={showNegotiationModal}
                        onClose={() => setShowNegotiationModal(false)}
                        jobTitle={`${negotiatingJob.title} · ${negotiatingJob.employer}`}
                        messages={negotiationMessages}
                        status={negotiationStatus as any}
                        isEmployer={false}
                        onSendMessage={(msg, offer) => handleSendNegotiationMessage(msg, offer)}
                        onAccept={(_price) => {
                            // First accept the offer
                            handleAcceptNegotiatedPrice().then(() => {
                                // Once accepted, automatically apply to the job at this final price
                                handleProceedWithJob();
                            });
                        }}
                        onReject={handleRejectNegotiation}
                    />
                )}
            </AnimatePresence>
            </div>
        </div>
    );
};

export default ExploreJobs;
