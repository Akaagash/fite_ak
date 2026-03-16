import React, { useEffect, useState } from 'react';
import { useMode } from '../../context/ModeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Map, MapPin, Clock, IndianRupee, Star, Play, Square, Loader2, Navigation, Phone, X, Briefcase, ChevronDown, Filter } from 'lucide-react';
import TextType from '../../components/ui/TextType';
import { LocationMap } from '../../components/ui/expand-map';

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
}

const ExploreJobs: React.FC = () => {
    const { mode } = useMode();
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
    const [isFetchingJobs, setIsFetchingJobs] = useState(false);
    const [isApplying, setIsApplying] = useState<string | null>(null);

    const isDaily = mode === 'daily';

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

    const fetchJobs = async () => {
        setIsFetchingJobs(true);
        try {
            const [dailyRes, longRes] = await Promise.all([
                fetch('http://localhost:8000/api/jobs?job_type=daily_wage&status=open', { credentials: 'include' }),
                fetch('http://localhost:8000/api/jobs?job_type=long_term&status=open', { credentials: 'include' }),
            ]);

            const dailyData = dailyRes.ok ? await dailyRes.json() : { jobs: [] };
            const longData = longRes.ok ? await longRes.json() : { jobs: [] };

            const mappedDaily: Job[] = (dailyData.jobs || []).map((job: any, idx: number) => ({
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
            }));

            const mappedLong: LongTermJob[] = (longData.jobs || []).map((job: any) => ({
                id: job._id,
                title: job.title,
                company: job.employer_name || 'Company',
                location: job.location?.address || 'Unknown',
                salary: formatPay(job.salary),
                type: job.work_hours || 'Full-time',
                requirements: Array.isArray(job.requirements) ? job.requirements : [],
                description: job.description || '',
                postedAt: formatTimeAgo(job.created_at),
            }));

            setDailyJobs(mappedDaily);
            setLongTermJobs(mappedLong);
        } finally {
            setIsFetchingJobs(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            fetchJobs();
        }, 15000);

        const onFocus = () => fetchJobs();
        window.addEventListener('focus', onFocus);

        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    useEffect(() => {
        if (isExploring) {
            setFoundJobs(dailyJobs);
        }
    }, [dailyJobs, isExploring]);

    const applyToJob = async (jobId: string, jobType: 'daily' | 'longterm', offeredPrice?: number) => {
        setIsApplying(jobId);
        try {
            const res = await fetch('http://localhost:8000/api/applications/apply', {
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
        } catch (err: any) {
            alert(err.message || 'Could not apply to this job');
        } finally {
            setIsApplying(null);
        }
    };

    const requestLocationAndStart = () => {
        setShowLocationPermission(true);
    };

    const startExploring = () => {
        setShowLocationPermission(false);
        setIsLoadingLocation(true);

        // Get user location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation([position.coords.latitude, position.coords.longitude]);
                setIsExploring(true);
                setIsLoadingLocation(false);
                setFoundJobs(dailyJobs);
            },
            () => {
                // Fallback to Bangalore coordinates
                setUserLocation([12.9716, 77.5946]);
                setIsExploring(true);
                setIsLoadingLocation(false);
                setFoundJobs(dailyJobs);
            }
        );
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
                                <Map size={16} />
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
                            {foundJobs.length > 0 && (
                                <>
                                    <div className="w-px h-4 bg-neutral-300" />
                                    <span className="text-sm font-semibold text-neutral-800">{foundJobs.length} jobs found</span>
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
                    ) : viewMode === 'card' ? (
                        // Cards View
                        <motion.div
                            key="cards"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        >
                            {foundJobs.map((job, index) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => setSelectedJob(job)}
                                    className="group relative cursor-pointer p-5 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300"
                                >
                                    {/* Accent Line */}
                                    <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-neutral-800" />

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-neutral-800 pr-3">{job.title}</h3>
                                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-medium">
                                            {calculateDistance(job.coordinates)}
                                        </span>
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
                                    <div className="space-y-2 mb-4">
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
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {job.skills.slice(0, 3).map((skill) => (
                                            <span key={skill} className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between">
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
                                {foundJobs.map((job) => (
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
                        {longTermJobs.map((job, index) => (
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
                                    {job.requirements.map((req) => (
                                        <span key={req} className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                                            {req}
                                        </span>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-between">
                                    <span className="text-xs text-neutral-500">{job.postedAt}</span>
                                    <button
                                        onClick={() => applyToJob(job.id, 'longterm')}
                                        disabled={isApplying === job.id}
                                        className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors disabled:opacity-60"
                                    >
                                        Apply Now
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Job Detail Modal */}
            <AnimatePresence>
                {selectedJob && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedJob(null)}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[90vh] z-[101] overflow-auto"
                        >
                            <div className="rounded-2xl bg-white border-2 border-neutral-200 shadow-2xl overflow-hidden">
                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white border-2 border-neutral-300 hover:bg-neutral-100 transition-colors shadow-lg"
                                >
                                    <X size={20} className="text-neutral-700" />
                                </button>

                                {/* Header */}
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
                                        <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                                            {calculateDistance(selectedJob.coordinates)}
                                        </span>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-6">
                                    {/* Pay & Time */}
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

                                    {/* Location */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Location</h4>
                                        <div className="flex items-start gap-2 text-neutral-600">
                                            <MapPin size={16} className="mt-0.5 shrink-0" />
                                            <span>{selectedJob.address}</span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Description</h4>
                                        <p className="text-neutral-600">{selectedJob.description}</p>
                                    </div>

                                    {/* Skills Required */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Skills Required</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedJob.skills.map((skill) => (
                                                <span key={skill} className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium border border-neutral-200">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Map Preview - Expandable Card */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-neutral-700 mb-2 uppercase tracking-wider">Job Location</h4>
                                        <LocationMap
                                            location={selectedJob.address}
                                            coordinates={`${selectedJob.coordinates[0].toFixed(4)}° N, ${selectedJob.coordinates[1].toFixed(4)}° E`}
                                            isDark={false}
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-3 pt-4">
                                        <div className="flex gap-3">
                                            <a
                                                href={`tel:+919876543210`}
                                                className="flex-1 py-3 rounded-lg bg-neutral-200 text-neutral-700 font-semibold text-sm hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Phone size={16} />
                                                Call Employer
                                            </a>
                                            <button
                                                className="flex-1 py-3 rounded-lg border-2 border-amber-500 text-amber-600 font-semibold text-sm hover:bg-amber-50 transition-colors"
                                            >
                                                💬 Negotiate Price
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => applyToJob(selectedJob.id, 'daily', selectedJob.salaryAmount)}
                                            disabled={isApplying === selectedJob.id}
                                            className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
                                        >
                                            {isApplying === selectedJob.id ? 'Applying...' : 'Accept Job'}
                                        </button>
                                    </div>
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
            </div>
        </div>
    );
};

export default ExploreJobs;
