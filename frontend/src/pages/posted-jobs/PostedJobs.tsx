import React, { useState, useEffect } from 'react';
import { useMode } from '../../context/ModeContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, Plus, MapPin, Clock, IndianRupee, Users, X, ChevronRight, ChevronDown, Search } from 'lucide-react';
import TextType from '../../components/ui/TextType';

// Slide-Over Drawer Component
interface PostJobDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'longterm';
}

const PostJobDrawer: React.FC<PostJobDrawerProps> = ({ isOpen, onClose, mode }) => {
    const isDaily = mode === 'daily';
    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = 4;

    const steps = isDaily
        ? ['Details', 'Description', 'Location', 'Pay & Time']
        : ['Details', 'Description', 'Requirements', 'Compensation'];

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
            setCurrentStep(0);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose} />
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed right-0 top-0 h-screen w-[500px] max-w-[90vw] bg-[#09090b] border-l border-zinc-800 z-[101] flex flex-col">
                        <div className="h-0.5 bg-zinc-800">
                            <motion.div className={`h-full ${isDaily ? 'bg-emerald-500' : 'bg-amber-500'}`} initial={{ width: 0 }} animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
                        </div>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-100">Post New Job</h2>
                                <p className="text-xs text-zinc-500 mt-0.5">{isDaily ? 'Daily Wage Position' : 'Long-term Position'}</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="px-6 py-4 border-b border-zinc-800/50">
                            <div className="flex items-center gap-2">
                                {steps.map((step, index) => (
                                    <React.Fragment key={step}>
                                        <span className={`text-xs font-medium ${index <= currentStep ? 'text-zinc-300' : 'text-zinc-600'}`}>{step}</span>
                                        {index < steps.length - 1 && <ChevronRight size={12} className="text-zinc-700" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <AnimatePresence mode="wait">
                                <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-5">
                                    {currentStep === 0 && (
                                        <>
                                            <div>
                                                <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Job Title</label>
                                                <input type="text" placeholder={isDaily ? "e.g., Plumbing Work" : "e.g., Frontend Developer"} className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Category</label>
                                                <select className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 focus:ring-1 focus:ring-zinc-600 focus:outline-none cursor-pointer">
                                                    <option value="" className="bg-zinc-900">Select Category</option>
                                                    {isDaily ? (<><option value="plumbing" className="bg-zinc-900">Plumbing</option><option value="electrical" className="bg-zinc-900">Electrical</option><option value="painting" className="bg-zinc-900">Painting</option><option value="cleaning" className="bg-zinc-900">Cleaning</option><option value="moving" className="bg-zinc-900">Moving & Labor</option></>) : (<><option value="fulltime" className="bg-zinc-900">Full-time</option><option value="parttime" className="bg-zinc-900">Part-time</option><option value="internship" className="bg-zinc-900">Internship</option><option value="contract" className="bg-zinc-900">Contract</option></>)}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    {currentStep === 1 && (<div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Description</label><textarea placeholder={isDaily ? "Describe the work..." : "Describe the role..."} rows={8} className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none resize-none" /></div>)}
                                    {currentStep === 2 && (<>{isDaily ? (<><div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Address</label><input type="text" placeholder="Enter address or landmark" className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" /></div><button className="w-full py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm flex items-center justify-center gap-2 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"><MapPin size={16} />Use current location</button></>) : (<><div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Requirements</label><textarea placeholder="List requirements (one per line)" rows={5} className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none resize-none" /></div><div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Experience</label><input type="text" placeholder="e.g., 2+ years" className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" /></div></>)}</>)}
                                    {currentStep === 3 && (<><div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">{isDaily ? 'Daily Wage (₹)' : 'Salary Range'}</label><input type="text" placeholder={isDaily ? "e.g., 800" : "e.g., 8-12 LPA"} className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" /></div>{isDaily ? (<div className="grid grid-cols-2 gap-4"><div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Start Time</label><input type="time" className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 focus:ring-1 focus:ring-zinc-600 focus:outline-none" /></div><div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">End Time</label><input type="time" className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 focus:ring-1 focus:ring-zinc-600 focus:outline-none" /></div></div>) : (<div><label className="block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Location</label><input type="text" placeholder="e.g., Bangalore / Remote" className="w-full bg-zinc-900/50 border-none rounded-lg px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none" /></div>)}</>)}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-3">
                            {currentStep > 0 && (<button onClick={handleBack} className="px-5 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors">Back</button>)}
                            <button onClick={handleNext} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentStep === totalSteps - 1 ? isDaily ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-white text-black hover:bg-zinc-200'}`}>{currentStep === totalSteps - 1 ? 'Post Job' : 'Continue'}</button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// Sparkline Component
const Sparkline: React.FC<{ trend: 'up' | 'down' | 'stable' }> = ({ trend }) => {
    const paths = { up: "M0,16 L8,14 L16,10 L24,12 L32,6 L40,8 L48,4", down: "M0,4 L8,6 L16,8 L24,5 L32,10 L40,14 L48,12", stable: "M0,10 L8,8 L16,12 L24,9 L32,11 L40,8 L48,10" };
    return (<svg width="48" height="20" viewBox="0 0 48 20" className="opacity-60"><path d={paths[trend]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
};

// Filter Sidebar Component - Simplified for Posted Jobs
interface FilterSidebarProps {
    isDaily: boolean;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    categoryFilter: string;
    setCategoryFilter: (v: string) => void;
    statusFilter: string;
    setStatusFilter: (v: string) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ isDaily, searchQuery, setSearchQuery, categoryFilter, setCategoryFilter, statusFilter, setStatusFilter }) => {
    const [expandedSections, setExpandedSections] = useState({ category: true, status: true });
    const toggleSection = (section: keyof typeof expandedSections) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    const filterBtnClass = (active: boolean) => `w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`;
    const categories = isDaily
        ? ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Gardening', 'Moving', 'Event Help', 'Construction', 'Other']
        : ['All', 'Full-time', 'Part-time', 'Contract', 'Internship'];
    const statuses = ['All', 'Active', 'Ongoing', 'Completed'];
    const sectionHeaderClass = 'flex items-center justify-between w-full py-3 px-4 rounded-xl cursor-pointer transition-all bg-neutral-50 hover:bg-neutral-100 border border-neutral-200';

    return (
        <div
            className="w-60 shrink-0 rounded-2xl p-5 h-fit sticky top-24 bg-white border-2 border-neutral-200 shadow-sm"
        >
            <div className="mb-5">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-neutral-200 bg-neutral-50">
                    <Search size={16} className="text-neutral-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search jobs..."
                        className="bg-transparent text-sm w-full outline-none placeholder:text-neutral-400 text-neutral-900 font-medium"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-neutral-700">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
                <button onClick={() => toggleSection('status')} className={sectionHeaderClass}>
                    <span className="text-sm font-bold text-neutral-900">Status</span>
                    <ChevronDown size={16} className={`transition-transform ${expandedSections.status ? 'rotate-180' : ''} text-neutral-500`} />
                </button>
                <AnimatePresence>{expandedSections.status && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="pt-2 space-y-1">{statuses.map((status) => (<button key={status} onClick={() => setStatusFilter(status.toLowerCase())} className={filterBtnClass(statusFilter === status.toLowerCase())}>{status}</button>))}</div></motion.div>)}</AnimatePresence>
            </div>

            {/* Category Filter */}
            <div>
                <button onClick={() => toggleSection('category')} className={sectionHeaderClass}>
                    <span className="text-sm font-bold text-neutral-900">Category</span>
                    <ChevronDown size={16} className={`transition-transform ${expandedSections.category ? 'rotate-180' : ''} text-neutral-500`} />
                </button>
                <AnimatePresence>{expandedSections.category && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="pt-2 space-y-1">{categories.map((cat) => (<button key={cat} onClick={() => setCategoryFilter(cat.toLowerCase())} className={filterBtnClass(categoryFilter === cat.toLowerCase())}>{cat}</button>))}</div></motion.div>)}</AnimatePresence>
            </div>
        </div>
    );
};

const formatTimeAgo = (dateStr: string): string => {
    // MongoDB returns UTC without 'Z'; append it so JS parses correctly
    const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const diff = Date.now() - new Date(utcStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
};

const formatPay = (salary: any, workHours?: string): string => {
    if (!salary) return '—';
    const { amount, currency, period } = salary;
    const sym = currency === 'INR' ? '₹' : currency;
    const periodMap: Record<string, string> = {
        daily: '/day', hourly: '/hr', monthly: '/mo', yearly: ' LPA',
    };
    const suffix = periodMap[period] ?? `/${period}`;
    return `${sym}${amount.toLocaleString('en-IN')}${suffix}`;
};

const toUiStatus = (dbStatus: string): 'active' | 'ongoing' | 'completed' => {
    if (dbStatus === 'ongoing') return 'ongoing';
    if (dbStatus === 'completed' || dbStatus === 'closed') return 'completed';
    return 'active';
};

const toDbStatus = (uiStatus: 'active' | 'ongoing' | 'completed'): 'open' | 'ongoing' | 'completed' => {
    if (uiStatus === 'active') return 'open';
    if (uiStatus === 'ongoing') return 'ongoing';
    return 'completed';
};

const statusBadgeClass = (status: string) => {
    if (status === 'ongoing') return 'bg-amber-100 text-amber-700';
    if (status === 'completed') return 'bg-neutral-200 text-neutral-700';
    return 'bg-emerald-100 text-emerald-700';
};

const PostedJobs: React.FC = () => {
    const { mode } = useMode();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [allJobs, setAllJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
    const [statusUpdateError, setStatusUpdateError] = useState('');

    const isDaily = mode === 'daily';

    // Reset filters when switching between daily / long-term mode
    useEffect(() => {
        setSearchQuery('');
        setCategoryFilter('all');
        setStatusFilter('all');
    }, [mode]);

    useEffect(() => {
        const fetchJobs = async () => {
            setIsLoading(true);
            setFetchError('');
            try {
                const res = await fetch('http://localhost:8000/api/jobs/my-jobs', {
                    credentials: 'include',
                });
                if (!res.ok) throw new Error('Failed to load jobs');
                const data = await res.json();
                setAllJobs(data.jobs || []);
            } catch (err: any) {
                setFetchError(err.message || 'Could not load jobs');
            } finally {
                setIsLoading(false);
            }
        };
        fetchJobs();
    }, []);

    // Map API job to display shape
    const mapJob = (job: any) => ({
        id: job._id,
        title: job.title,
        location: job.location?.address || '—',
        pay: formatPay(job.salary, job.work_hours),
        time: job.work_hours || '',
        applicants: job.applicants_count ?? 0,
        status: toUiStatus(job.status || 'open'),
        postedAt: job.created_at ? formatTimeAgo(job.created_at) : '—',
        trend: 'stable' as const,
        // Keep raw fields for filtering
        rawCategory: (job.category || '').toLowerCase(),
        rawWorkHours: (job.work_hours || '').toLowerCase(),
    });

    // Status mapping: sidebar label -> DB value(s)
    const statusMatch = (jobStatus: string): boolean => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return jobStatus === 'active';
        if (statusFilter === 'ongoing') return jobStatus === 'ongoing';
        if (statusFilter === 'completed') return jobStatus === 'completed';
        return true;
    };

    const currentJobs = allJobs
        .filter(j => isDaily ? j.job_type === 'daily_wage' : j.job_type === 'long_term')
        .map(mapJob)
        .filter(j => {
            // Search
            if (searchQuery && !j.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            // Status
            if (!statusMatch(j.status)) return false;
            // Category
            if (categoryFilter !== 'all') {
                if (isDaily) {
                    // daily: match against category field
                    if (!j.rawCategory.includes(categoryFilter)) return false;
                } else {
                    // long-term: employment type is stored in work_hours
                    if (!j.rawWorkHours.includes(categoryFilter)) return false;
                }
            }
            return true;
        });

    const handleJobClick = (jobId: number) => {
        if (isDaily) {
            navigate(`/job-detail/${mode}/${jobId}`);
        } else {
            navigate(`/applicants/${mode}/${jobId}`);
        }
    };

    const handleStatusChange = async (jobId: string, newStatus: 'active' | 'ongoing' | 'completed') => {
        const dbStatus = toDbStatus(newStatus);
        setStatusUpdateError('');
        setUpdatingJobId(jobId);
        try {
            const res = await fetch(`http://localhost:8000/api/jobs/${jobId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: dbStatus }),
            });

            if (!res.ok) throw new Error('Failed to update job status');

            setAllJobs(prev => prev.map(job => job._id === jobId ? { ...job, status: dbStatus } : job));
        } catch (err: any) {
            setStatusUpdateError(err.message || 'Could not update status');
        } finally {
            setUpdatingJobId(null);
        }
    };

    return (
        <div className="w-full min-h-screen relative px-4 md:px-8 pt-8 pb-10">
            <div className="mx-auto w-full max-w-6xl">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                        <TextType
                            key="posted-jobs"
                            text="Posted Jobs"
                            typingSpeed={80}
                            loop={false}
                            showCursor={false}
                        />
                    </h1>
                    <p className="text-sm mt-1 text-neutral-500 font-medium">
                        {isDaily ? "Manage your daily wage listings" : "Track your long-term job postings"}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Toggle - Icons with proper boundaries */}
                    <div className="relative flex items-center p-1 rounded-xl overflow-hidden bg-neutral-100 border-2 border-neutral-200 shadow-sm">
                        <motion.div
                            layoutId="viewTogglePill"
                            className="absolute h-9 w-10 rounded-lg bg-neutral-900"
                            initial={false}
                            animate={{ x: viewMode === 'card' ? 0 : 44 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                        <button
                            onClick={() => setViewMode('card')}
                            className={`relative z-10 w-10 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'card' ? 'text-white' : 'text-neutral-600'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`relative z-10 w-10 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'text-white' : 'text-neutral-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    {/* Post Button */}
                    <button
                        onClick={() => navigate(isDaily ? '/post-daily-job' : '/post-long-term-job')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 bg-neutral-900 text-white hover:bg-neutral-800"
                    >
                        <Plus size={18} />
                        Post Job
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex gap-8">
                <FilterSidebar isDaily={isDaily} searchQuery={searchQuery} setSearchQuery={setSearchQuery} categoryFilter={categoryFilter} setCategoryFilter={cat => { setCategoryFilter(cat.toLowerCase()); }} statusFilter={statusFilter} setStatusFilter={s => { setStatusFilter(s.toLowerCase()); }} />

                <div className="flex-1 min-w-0">
                    {statusUpdateError && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700">
                            {statusUpdateError}
                        </div>
                    )}
                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-20 text-neutral-500 font-medium">
                            Loading jobs...
                        </div>
                    )}
                    {/* Error state */}
                    {!isLoading && fetchError && (
                        <div className="flex items-center justify-center py-20 text-red-500 font-medium">
                            {fetchError}
                        </div>
                    )}
                    {/* Empty state */}
                    {!isLoading && !fetchError && currentJobs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') ? (
                                <>
                                    <p className="text-neutral-500 font-medium">No jobs match your filters.</p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); }}
                                        className="text-sm font-bold text-neutral-700 underline underline-offset-2"
                                    >
                                        Clear filters
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-neutral-500 font-medium">No jobs posted yet.</p>
                                    <button
                                        onClick={() => navigate(isDaily ? '/post-daily-job' : '/post-long-term-job')}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-neutral-900 text-white hover:bg-neutral-800"
                                    >
                                        <Plus size={18} /> Post your first job
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {viewMode === 'card' ? (
                            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {currentJobs.map((job, index) => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleJobClick(job.id)}
                                        className="group relative cursor-pointer p-6 pl-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 bg-white border-2 border-neutral-200 hover:border-neutral-300 hover:shadow-lg"
                                    >
                                        {/* Left accent line */}
                                        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-neutral-800" />
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold leading-tight mb-1.5 text-neutral-900">{job.title}</h3>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${statusBadgeClass(job.status)}`}>{job.status}</span>
                                            </div>
                                            <div onClick={e => e.stopPropagation()}>
                                                <select
                                                    value={job.status}
                                                    onChange={(e) => handleStatusChange(job.id, e.target.value as 'active' | 'ongoing' | 'completed')}
                                                    disabled={updatingJobId === job.id}
                                                    className="text-xs font-semibold px-2 py-1 rounded-lg border border-neutral-300 bg-white text-neutral-700 disabled:opacity-50"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="ongoing">Ongoing</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
                                                <MapPin size={16} className="opacity-70" /><span>{job.location}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
                                                <IndianRupee size={16} className="opacity-70" /><span className="font-bold text-neutral-900">{job.pay}</span>
                                            </div>
                                            {isDaily && 'time' in job && (
                                                <div className="flex items-center gap-3 text-sm font-medium text-neutral-600">
                                                    <Clock size={16} className="opacity-70" /><span>{job.time}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Users size={16} className="text-neutral-500" />
                                                <span className="text-sm font-bold text-neutral-900">{job.applicants} Applicants</span>
                                                <div className={`scale-75 origin-left ${isDaily ? 'text-emerald-500' : 'text-amber-500'}`}><Sparkline trend={job.trend} /></div>
                                            </div>
                                            <span className="text-xs font-medium text-neutral-400">{job.postedAt}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[11px] uppercase tracking-wider font-bold text-neutral-400">
                                    <div className="col-span-4">Job Title</div>
                                    <div className="col-span-3">Location</div>
                                    <div className="col-span-2">Pay</div>
                                    <div className="col-span-2">Applicants</div>
                                    <div className="col-span-1 text-right">Posted</div>
                                </div>
                                {currentJobs.map((job, index) => (
                                    <motion.div key={job.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} onClick={() => handleJobClick(job.id)} className="group relative grid grid-cols-12 gap-4 items-center cursor-pointer pl-8 pr-6 py-5 rounded-2xl transition-all duration-200 bg-white border-2 border-neutral-200 hover:border-neutral-300 hover:shadow-md">
                                        {/* Left accent line */}
                                        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-neutral-800" />
                                        <div className="col-span-4 flex items-center gap-4">
                                            <div className={`w-2.5 h-2.5 rounded-full ${isDaily ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            <div>
                                                <div className="text-sm font-bold text-neutral-900">{job.title}</div>
                                                <span className="text-xs font-medium capitalize text-neutral-400">{job.status}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 flex items-center gap-2 text-sm font-medium text-neutral-600">
                                            <MapPin size={14} className="opacity-70" /><span className="truncate">{job.location}</span>
                                        </div>
                                        <div className="col-span-2 text-sm font-bold text-neutral-900">{job.pay}</div>
                                        <div className="col-span-2 flex items-center gap-3">
                                            <span className="text-sm font-bold text-neutral-900">{job.applicants}</span>
                                            <div className={`scale-75 origin-left ${isDaily ? 'text-emerald-500' : 'text-amber-500'}`}><Sparkline trend={job.trend} /></div>
                                        </div>
                                        <div className="col-span-1 text-xs font-medium text-right text-neutral-400">{job.postedAt}</div>
                                        <div className="col-span-12" onClick={e => e.stopPropagation()}>
                                            <select
                                                value={job.status}
                                                onChange={(e) => handleStatusChange(job.id, e.target.value as 'active' | 'ongoing' | 'completed')}
                                                disabled={updatingJobId === job.id}
                                                className="mt-2 text-xs font-semibold px-2 py-1 rounded-lg border border-neutral-300 bg-white text-neutral-700 disabled:opacity-50"
                                            >
                                                <option value="active">Active</option>
                                                <option value="ongoing">Ongoing</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* PostJobDrawer kept but no longer used - posting goes through full form pages */}
            </div>
        </div>
    );
};

export default PostedJobs;
