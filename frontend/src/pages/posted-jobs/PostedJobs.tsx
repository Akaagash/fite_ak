import React, { useState, useEffect } from 'react';
import { useMode } from '../../context/ModeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, Plus, MapPin, Clock, IndianRupee, Users, X, ChevronDown, Search, Briefcase, FileText, Check, Loader2 } from 'lucide-react';
import TextType from '../../components/ui/TextType';
import { useAuth } from '../../context/AuthContext';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';


// ────────────────────────────────────────────────────────────────────────────
// Redesigned Slide-Over Drawer — white/neutral theme with working form
// ────────────────────────────────────────────────────────────────────────────
interface PostJobDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'longterm';
    onJobPosted?: () => void;
}

const PostJobDrawer: React.FC<PostJobDrawerProps> = ({ isOpen, onClose, mode, onJobPosted }) => {
    const isDaily = mode === 'daily';
    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = 4;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Form state
    const [jobTitle, setJobTitle] = useState('');
    const [jobCategory, setJobCategory] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [location, setLocation] = useState('');
    const [latitude, setLatitude] = useState(12.9716);
    const [longitude, setLongitude] = useState(77.5946);
    const [wage, setWage] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [workDate, setWorkDate] = useState('');
    // Long-term specific
    const [requirements, setRequirements] = useState('');
    const [skillsRequired, setSkillsRequired] = useState('');
    const [salaryPeriod, setSalaryPeriod] = useState('yearly');

    const steps = isDaily
        ? ['Details', 'Description', 'Location', 'Pay & Time']
        : ['Details', 'Description', 'Requirements', 'Compensation'];

    const stepIcons = isDaily
        ? [Briefcase, FileText, MapPin, IndianRupee]
        : [Briefcase, FileText, FileText, IndianRupee];

    const resetForm = () => {
        setCurrentStep(0);
        setJobTitle('');
        setJobCategory('');
        setJobDescription('');
        setLocation('');
        setLatitude(12.9716);
        setLongitude(77.5946);
        setWage('');
        setStartTime('');
        setEndTime('');
        setWorkDate('');
        setRequirements('');
        setSkillsRequired('');
        setSalaryPeriod('yearly');
        setSubmitError('');
        setSubmitSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude);
                    setLongitude(position.coords.longitude);
                },
                () => { }
            );
        }
    };

    const handleSubmitJob = async () => {
        setIsSubmitting(true);
        setSubmitError('');
        try {
            const parts = location.split(',').map(s => s.trim());
            const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || 'Unknown';
            const state = parts.length >= 1 ? parts[parts.length - 1] : 'Unknown';

            const payload: any = {
                title: (jobTitle.trim() || 'Untitled Job').padEnd(5, ' '),
                description: (jobDescription.trim() || 'Job posting — see details for more info').padEnd(20, '.'),
                job_type: isDaily ? 'daily_wage' : 'long_term',
                category: jobCategory || 'Other',
                location: {
                    address: location || 'Location not specified',
                    city,
                    state,
                    coordinates: { lat: latitude, lng: longitude },
                },
                salary: {
                    amount: parseFloat(wage) || 0,
                    currency: 'INR',
                    period: isDaily ? 'daily' : salaryPeriod,
                },
            };

            if (isDaily) {
                if (startTime && endTime) payload.work_hours = `${startTime} - ${endTime}`;
                if (workDate) payload.start_date = new Date(workDate).toISOString();
            } else {
                if (requirements.trim()) {
                    payload.requirements = requirements.split('\n').map((r: string) => r.trim()).filter(Boolean);
                }
                if (skillsRequired.trim()) {
                    payload.skills_required = skillsRequired.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
                if (location) payload.work_hours = location.includes('Remote') ? 'Remote' : 'Full-time';
            }

            const res = await fetch(`${API_BASE}/api/jobs/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                if (Array.isArray(err.detail)) {
                    const msgs = err.detail.map((e: any) => {
                        const field = e.loc ? e.loc[e.loc.length - 1] : 'field';
                        return `${field}: ${e.msg}`;
                    }).join(' | ');
                    throw new Error(msgs || 'Validation failed');
                }
                throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to post job');
            }

            setSubmitSuccess(true);
            onJobPosted?.();
            setTimeout(() => {
                handleClose();
            }, 1200);
        } catch (err: any) {
            setSubmitError(err.message || 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmitJob();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const dailyCategories = ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Gardening', 'Moving', 'Event Help', 'Construction', 'Other'];
    const longTermCategories = ['Web Development', 'Data Science', 'DevOps', 'Mobile', 'Backend', 'Frontend', 'Design', 'Marketing', 'Other'];

    const inputClass = "w-full px-4 py-3 rounded-xl border-2 border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none transition-colors";
    const labelClass = "block text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-2";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        onClick={handleClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-screen w-[520px] max-w-[92vw] bg-white border-l-2 border-neutral-200 z-[101] flex flex-col shadow-2xl"
                    >
                        {/* Progress bar */}
                        <div className="h-1 bg-neutral-100">
                            <motion.div
                                className="h-full bg-neutral-900 rounded-r-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900">Post New Job</h2>
                                <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                                    {isDaily ? 'Daily Wage Position' : 'Long-term Position'}
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Step Indicators */}
                        <div className="px-6 py-4 border-b border-neutral-100">
                            <div className="flex items-center justify-between">
                                {steps.map((step, index) => {
                                    const StepIcon = stepIcons[index];
                                    const isCompleted = index < currentStep;
                                    const isCurrent = index === currentStep;
                                    return (
                                        <React.Fragment key={step}>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                                                    ? 'bg-neutral-900 text-white'
                                                    : isCurrent
                                                        ? 'bg-neutral-900 text-white ring-4 ring-neutral-200'
                                                        : 'bg-neutral-100 text-neutral-400'
                                                    }`}>
                                                    {isCompleted ? <Check size={16} strokeWidth={3} /> : <StepIcon size={16} />}
                                                </div>
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${isCurrent || isCompleted ? 'text-neutral-900' : 'text-neutral-400'}`}>
                                                    {step}
                                                </span>
                                            </div>
                                            {index < steps.length - 1 && (
                                                <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${index < currentStep ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {submitError && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700">
                                    {submitError}
                                </div>
                            )}
                            {submitSuccess && (
                                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 flex items-center gap-2">
                                    <Check size={16} /> Job posted successfully!
                                </div>
                            )}

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-5"
                                >
                                    {/* Step 0: Details */}
                                    {currentStep === 0 && (
                                        <>
                                            <div className="mb-2">
                                                <h3 className="text-lg font-bold text-neutral-900">
                                                    {isDaily ? 'What kind of work do you need?' : 'What position are you hiring for?'}
                                                </h3>
                                                <p className="text-sm text-neutral-500 mt-1">Let's start by defining your job</p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Job Title</label>
                                                <input
                                                    type="text"
                                                    value={jobTitle}
                                                    onChange={(e) => setJobTitle(e.target.value)}
                                                    placeholder={isDaily ? "e.g., Plumbing Work, Event Helper" : "e.g., Frontend Developer, Data Analyst"}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Category</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(isDaily ? dailyCategories : longTermCategories).map((cat) => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setJobCategory(cat)}
                                                            className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${jobCategory === cat
                                                                ? 'bg-neutral-900 text-white shadow-md'
                                                                : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                                                                }`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Step 1: Description */}
                                    {currentStep === 1 && (
                                        <>
                                            <div className="mb-2">
                                                <h3 className="text-lg font-bold text-neutral-900">Describe the work</h3>
                                                <p className="text-sm text-neutral-500 mt-1">Provide details about the role</p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Job Description</label>
                                                <textarea
                                                    value={jobDescription}
                                                    onChange={(e) => setJobDescription(e.target.value)}
                                                    placeholder={isDaily
                                                        ? "Describe the work requirements, tools needed, etc."
                                                        : "Describe the role, responsibilities, and what you're looking for..."
                                                    }
                                                    rows={10}
                                                    className={`${inputClass} resize-none`}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Step 2: Location / Requirements */}
                                    {currentStep === 2 && (
                                        <>
                                            {isDaily ? (
                                                <>
                                                    <div className="mb-2">
                                                        <h3 className="text-lg font-bold text-neutral-900">Where is the work?</h3>
                                                        <p className="text-sm text-neutral-500 mt-1">Set the job location</p>
                                                    </div>
                                                    <div>
                                                        <label className={labelClass}>Address</label>
                                                        <input
                                                            type="text"
                                                            value={location}
                                                            onChange={(e) => setLocation(e.target.value)}
                                                            placeholder="e.g., Indiranagar, Bangalore"
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={getCurrentLocation}
                                                        className="w-full py-3 rounded-xl font-medium text-neutral-700 border-2 border-neutral-200 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        <MapPin size={16} />
                                                        Use Current Location
                                                    </button>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={labelClass}>Latitude</label>
                                                            <input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(parseFloat(e.target.value))} className={inputClass} />
                                                        </div>
                                                        <div>
                                                            <label className={labelClass}>Longitude</label>
                                                            <input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(parseFloat(e.target.value))} className={inputClass} />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="mb-2">
                                                        <h3 className="text-lg font-bold text-neutral-900">Requirements & Skills</h3>
                                                        <p className="text-sm text-neutral-500 mt-1">What should candidates know?</p>
                                                    </div>
                                                    <div>
                                                        <label className={labelClass}>Requirements (one per line)</label>
                                                        <textarea
                                                            value={requirements}
                                                            onChange={(e) => setRequirements(e.target.value)}
                                                            placeholder={"e.g., 2+ years experience\nGood communication\nTeam player"}
                                                            rows={5}
                                                            className={`${inputClass} resize-none`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={labelClass}>Skills Required (comma separated)</label>
                                                        <input
                                                            type="text"
                                                            value={skillsRequired}
                                                            onChange={(e) => setSkillsRequired(e.target.value)}
                                                            placeholder="e.g., React, Node.js, Python"
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={labelClass}>Location</label>
                                                        <input
                                                            type="text"
                                                            value={location}
                                                            onChange={(e) => setLocation(e.target.value)}
                                                            placeholder="e.g., Bangalore / Remote"
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Step 3: Pay */}
                                    {currentStep === 3 && (
                                        <>
                                            <div className="mb-2">
                                                <h3 className="text-lg font-bold text-neutral-900">
                                                    {isDaily ? 'Payment & Schedule' : 'Compensation'}
                                                </h3>
                                                <p className="text-sm text-neutral-500 mt-1">
                                                    {isDaily ? 'Set the wage and work hours' : 'Define the salary package'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className={labelClass}>{isDaily ? 'Daily Wage (₹)' : 'Salary Amount (₹)'}</label>
                                                <div className="relative">
                                                    <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                                    <input
                                                        type="number"
                                                        value={wage}
                                                        onChange={(e) => setWage(e.target.value)}
                                                        placeholder={isDaily ? "800" : "600000"}
                                                        className={`${inputClass} pl-11`}
                                                    />
                                                </div>
                                            </div>
                                            {isDaily ? (
                                                <>
                                                    <div>
                                                        <label className={labelClass}>Work Date</label>
                                                        <input
                                                            type="date"
                                                            value={workDate}
                                                            onChange={(e) => setWorkDate(e.target.value)}
                                                            className={inputClass}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={labelClass}>Start Time</label>
                                                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
                                                        </div>
                                                        <div>
                                                            <label className={labelClass}>End Time</label>
                                                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div>
                                                    <label className={labelClass}>Salary Period</label>
                                                    <div className="flex gap-2">
                                                        {['monthly', 'yearly'].map(p => (
                                                            <button
                                                                key={p}
                                                                onClick={() => setSalaryPeriod(p)}
                                                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${salaryPeriod === p
                                                                    ? 'bg-neutral-900 text-white'
                                                                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                                                                    }`}
                                                            >
                                                                {p === 'monthly' ? 'Monthly' : 'Yearly'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Buttons */}
                        <div className="px-6 py-4 border-t border-neutral-200 flex items-center gap-3 bg-neutral-50/50">
                            {currentStep > 0 && (
                                <button
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 rounded-xl bg-white border-2 border-neutral-200 text-neutral-700 text-sm font-semibold hover:bg-neutral-50 transition-colors disabled:opacity-50"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Posting...</>
                                ) : currentStep === totalSteps - 1 ? (
                                    'Post Job'
                                ) : (
                                    'Continue'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};


// ────────────────────────────────────────────────────────────────────────────
// Sparkline Component (unchanged)
// ────────────────────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ trend: 'up' | 'down' | 'stable' }> = ({ trend }) => {
    const paths = { up: "M0,16 L8,14 L16,10 L24,12 L32,6 L40,8 L48,4", down: "M0,4 L8,6 L16,8 L24,5 L32,10 L40,14 L48,12", stable: "M0,10 L8,8 L16,12 L24,9 L32,11 L40,8 L48,10" };
    return (<svg width="48" height="20" viewBox="0 0 48 20" className="opacity-60"><path d={paths[trend]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
};


// ────────────────────────────────────────────────────────────────────────────
// Filter Sidebar (unchanged)
// ────────────────────────────────────────────────────────────────────────────
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
        <div className="w-60 shrink-0 rounded-2xl p-5 h-fit sticky top-24 bg-white border-2 border-neutral-200 shadow-sm">
            <div className="mb-5">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-neutral-200 bg-neutral-50">
                    <Search size={16} className="text-neutral-400" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search jobs..." className="bg-transparent text-sm w-full outline-none placeholder:text-neutral-400 text-neutral-900 font-medium" />
                    {searchQuery && (<button onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>)}
                </div>
            </div>
            <div className="mb-4">
                <button onClick={() => toggleSection('status')} className={sectionHeaderClass}>
                    <span className="text-sm font-bold text-neutral-900">Status</span>
                    <ChevronDown size={16} className={`transition-transform ${expandedSections.status ? 'rotate-180' : ''} text-neutral-500`} />
                </button>
                <AnimatePresence>{expandedSections.status && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="pt-2 space-y-1">{statuses.map((status) => (<button key={status} onClick={() => setStatusFilter(status.toLowerCase())} className={filterBtnClass(statusFilter === status.toLowerCase())}>{status}</button>))}</div></motion.div>)}</AnimatePresence>
            </div>
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


// ────────────────────────────────────────────────────────────────────────────
// Utilities (unchanged)
// ────────────────────────────────────────────────────────────────────────────
const formatTimeAgo = (dateStr: string): string => {
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
    const periodMap: Record<string, string> = { daily: '/day', hourly: '/hr', monthly: '/mo', yearly: ' LPA' };
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

const normalizeText = (value: string) =>
    (value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const dailyCategoryAliases: Record<string, string[]> = {
    plumbing: ['plumbing', 'plumber', 'pipe', 'piping'],
    electrical: ['electrical', 'electrician', 'wiring', 'wireman'],
    carpentry: ['carpentry', 'carpenter', 'woodwork', 'joinery'],
    painting: ['painting', 'painter', 'paint'],
    cleaning: ['cleaning', 'cleaner', 'housekeeping', 'janitor'],
    gardening: ['gardening', 'gardener', 'landscaping'],
    moving: ['moving', 'loader', 'loading', 'unloading', 'shifting', 'labor'],
    'event help': ['event help', 'event', 'setup', 'stage', 'banner', 'crew'],
    construction: ['construction', 'mason', 'masonry', 'civil', 'site work', 'builder'],
    other: ['other'],
};

const longTermCategoryAliases: Record<string, string[]> = {
    'full-time': ['full-time', 'full time', 'fulltime', 'permanent'],
    'part-time': ['part-time', 'part time', 'parttime'],
    contract: ['contract', 'contractual', 'freelance'],
    internship: ['internship', 'intern'],
};

const statusBadgeClass = (status: string) => {
    if (status === 'ongoing') return 'bg-amber-100 text-amber-700';
    if (status === 'completed') return 'bg-neutral-200 text-neutral-700';
    return 'bg-emerald-100 text-emerald-700';
};


// ────────────────────────────────────────────────────────────────────────────
// Main PostedJobs Component
// ────────────────────────────────────────────────────────────────────────────
const PostedJobs: React.FC = () => {
    const { mode } = useMode();
    const navigate = useNavigate();
    const location = useLocation();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [allJobs, setAllJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
    const [statusUpdateError, setStatusUpdateError] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const auth = useAuth();
    
    const isDaily = mode === 'daily';

    // Handle deep linking from notification state
    useEffect(() => {
        if (!isLoading && location.state?.openJobId) {
            const openJobId = location.state.openJobId;
            const workerId = location.state.workerId;
            
            // Wait slightly for components to settle
            const timer = setTimeout(() => {
                handleJobClick(openJobId, workerId);
                // Clear state so it doesn't re-open on every re-render
                window.history.replaceState({}, document.title);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, location.state]);

    useEffect(() => {
        setSearchQuery('');
        setCategoryFilter('all');
        setStatusFilter('all');
    }, [mode]);

    const fetchJobs = async () => {
        setIsLoading(true);
        setFetchError('');
        try {
            const userId = auth?.user?.user_id;
            const queryParams = userId ? `&employer_id=${userId}` : '';
            const statuses = ['open', 'ongoing', 'completed'];
            const statusResponses = await Promise.all(
                statuses.map((s) =>
                    fetch(`${API_BASE}/api/jobs?status=${s}&skip=0&limit=200${queryParams}`, { credentials: 'include' })
                )
            );
            const statusPayloads = await Promise.all(
                statusResponses.map(async (r) => (r.ok ? await r.json() : { jobs: [] }))
            );
            const mergedJobs = statusPayloads.flatMap((p: any) => p.jobs || []);
            const deduped = Array.from(new Map(mergedJobs.map((j: any) => [j._id, j])).values());
            setAllJobs(deduped);
        } catch (err: any) {
            setFetchError(err.message || 'Could not load jobs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchJobs(); }, []);

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
        rawCategory: (job.category || '').toLowerCase(),
        rawWorkHours: (job.work_hours || '').toLowerCase(),
        rawTitle: (job.title || '').toLowerCase(),
        rawDescription: (job.description || '').toLowerCase(),
        rawSkills: Array.isArray(job.skills_required) ? job.skills_required.join(' ').toLowerCase() : '',
    });

    const statusMatch = (jobStatus: string): boolean => {
        if (statusFilter === 'all') return true;
        return statusFilter === jobStatus;
    };

    const currentJobs = allJobs
        .filter(j => isDaily ? j.job_type === 'daily_wage' : j.job_type === 'long_term')
        .map(mapJob)
        .filter(j => {
            if (searchQuery && !j.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (!statusMatch(j.status)) return false;
            if (categoryFilter !== 'all') {
                if (isDaily) {
                    const normalizedFilter = normalizeText(categoryFilter);
                    const aliases = dailyCategoryAliases[normalizedFilter] || [normalizedFilter];
                    const haystack = normalizeText(`${j.rawCategory} ${j.rawTitle} ${j.rawDescription} ${j.rawSkills}`);
                    if (!aliases.some((alias) => haystack.includes(normalizeText(alias)))) return false;
                } else {
                    const normalizedFilter = normalizeText(categoryFilter);
                    const aliases = longTermCategoryAliases[normalizedFilter] || [normalizedFilter];
                    const haystack = normalizeText(`${j.rawWorkHours} ${j.rawCategory} ${j.rawTitle} ${j.rawDescription}`);
                    if (!aliases.some((alias) => haystack.includes(normalizeText(alias)))) return false;
                }
            }
            return true;
        });

    const handleJobClick = (jobId: string | number, workerId?: string) => {
        if (isDaily) {
            navigate(`/job-detail/${mode}/${jobId}`, { state: { workerId } });
        } else {
            navigate(`/applicants/${mode}/${jobId}`, { state: { workerId } });
        }
    };

    const handleStatusChange = async (jobId: string, newStatus: 'active' | 'ongoing' | 'completed') => {
        const dbStatus = toDbStatus(newStatus);
        setStatusUpdateError('');
        setUpdatingJobId(jobId);
        try {
            const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
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
                            <TextType key="posted-jobs" text="Posted Jobs" typingSpeed={80} loop={false} showCursor={false} />
                        </h1>
                        <p className="text-sm mt-1 text-neutral-500 font-medium">
                            {isDaily ? "Manage your daily wage listings" : "Track your long-term job postings"}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative flex items-center p-1 rounded-xl overflow-hidden bg-neutral-100 border-2 border-neutral-200 shadow-sm">
                            <motion.div layoutId="viewTogglePill" className="absolute h-9 w-10 rounded-lg bg-neutral-900" initial={false} animate={{ x: viewMode === 'card' ? 0 : 44 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                            <button onClick={() => setViewMode('card')} className={`relative z-10 w-10 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'card' ? 'text-white' : 'text-neutral-600'}`}>
                                <LayoutGrid size={18} />
                            </button>
                            <button onClick={() => setViewMode('list')} className={`relative z-10 w-10 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'text-white' : 'text-neutral-600'}`}>
                                <List size={18} />
                            </button>
                        </div>

                        {/* Post Button — opens the redesigned slide-over drawer */}
                        <button
                            onClick={() => setIsDrawerOpen(true)}
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
                            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700">{statusUpdateError}</div>
                        )}
                        {isLoading && (
                            <div className="flex items-center justify-center py-20 text-neutral-500 font-medium gap-2">
                                <Loader2 size={20} className="animate-spin" /> Loading jobs...
                            </div>
                        )}
                        {!isLoading && fetchError && (
                            <div className="flex items-center justify-center py-20 text-red-500 font-medium">{fetchError}</div>
                        )}
                        {!isLoading && !fetchError && currentJobs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') ? (
                                    <>
                                        <p className="text-neutral-500 font-medium">No jobs match your filters.</p>
                                        <button onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); }} className="text-sm font-bold text-neutral-700 underline underline-offset-2">Clear filters</button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-neutral-500 font-medium">No jobs posted yet.</p>
                                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-neutral-900 text-white hover:bg-neutral-800">
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
                                            <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-neutral-800" />
                                            <div className="flex items-start justify-between mb-6">
                                                <div>
                                                    <h3 className="text-lg font-bold leading-tight mb-1.5 text-neutral-900">{job.title}</h3>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${statusBadgeClass(job.status)}`}>{job.status}</span>
                                                </div>
                                                <div onClick={e => e.stopPropagation()}>
                                                    <select value={job.status} onChange={(e) => handleStatusChange(job.id, e.target.value as 'active' | 'ongoing' | 'completed')} disabled={updatingJobId === job.id} className="text-xs font-semibold px-2 py-1 rounded-lg border border-neutral-300 bg-white text-neutral-700 disabled:opacity-50">
                                                        <option value="active">Active</option>
                                                        <option value="ongoing">Ongoing</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-3 mb-6">
                                                <div className="flex items-center gap-3 text-sm font-medium text-neutral-600"><MapPin size={16} className="opacity-70" /><span>{job.location}</span></div>
                                                <div className="flex items-center gap-3 text-sm font-medium text-neutral-600"><IndianRupee size={16} className="opacity-70" /><span className="font-bold text-neutral-900">{job.pay}</span></div>
                                                {isDaily && 'time' in job && job.time && (<div className="flex items-center gap-3 text-sm font-medium text-neutral-600"><Clock size={16} className="opacity-70" /><span>{job.time}</span></div>)}
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
                                            <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-neutral-800" />
                                            <div className="col-span-4 flex items-center gap-4">
                                                <div className={`w-2.5 h-2.5 rounded-full ${isDaily ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                <div>
                                                    <div className="text-sm font-bold text-neutral-900">{job.title}</div>
                                                    <span className="text-xs font-medium capitalize text-neutral-400">{job.status}</span>
                                                </div>
                                            </div>
                                            <div className="col-span-3 flex items-center gap-2 text-sm font-medium text-neutral-600"><MapPin size={14} className="opacity-70" /><span className="truncate">{job.location}</span></div>
                                            <div className="col-span-2 text-sm font-bold text-neutral-900">{job.pay}</div>
                                            <div className="col-span-2 flex items-center gap-3">
                                                <span className="text-sm font-bold text-neutral-900">{job.applicants}</span>
                                                <div className={`scale-75 origin-left ${isDaily ? 'text-emerald-500' : 'text-amber-500'}`}><Sparkline trend={job.trend} /></div>
                                            </div>
                                            <div className="col-span-1 text-xs font-medium text-right text-neutral-400">{job.postedAt}</div>
                                            <div className="col-span-12" onClick={e => e.stopPropagation()}>
                                                <select value={job.status} onChange={(e) => handleStatusChange(job.id, e.target.value as 'active' | 'ongoing' | 'completed')} disabled={updatingJobId === job.id} className="mt-2 text-xs font-semibold px-2 py-1 rounded-lg border border-neutral-300 bg-white text-neutral-700 disabled:opacity-50">
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

                {/* Post Job Drawer */}
                <PostJobDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    mode={isDaily ? 'daily' : 'longterm'}
                    onJobPosted={fetchJobs}
                />
            </div>
        </div>
    );
};

export default PostedJobs;
