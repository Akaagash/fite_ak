import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, IndianRupee, Clock, Phone, Navigation, Plus, Minus, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JobMap from '../../components/shared/JobMap';

type JobStatus = 'searching' | 'negotiating' | 'confirmed' | 'in-progress';

interface Worker {
    id: number;
    name: string;
    rating: number;
    distance: string;
    phone: string;
    avatar: string;
    currentLat: number;
    currentLng: number;
}

const DailyWageJobResponses: React.FC = () => {
    const { jobId: _jobId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<JobStatus>('searching');
    const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
    const [proposedPrice] = useState(800);
    const [negotiationPrice, setNegotiationPrice] = useState(800);

    // Unused variables removed
    const canvasRef = useRef<HTMLDivElement>(null);

    const incrementPrice = (amount: number) => {
        setNegotiationPrice((prev) => Math.max(0, prev + amount));
    };

    const jobLocation = { lat: 12.9716, lng: 77.5946 };

    useEffect(() => {
        if (status === 'searching') {
            const timer = setTimeout(() => {
                const worker: Worker = {
                    id: 1,
                    name: 'Rajesh Kumar',
                    rating: 4.8,
                    distance: '2.3 km',
                    phone: '+91 98765 43210',
                    avatar: 'https://i.pravatar.cc/150?img=15',
                    currentLat: 12.9616,
                    currentLng: 77.5846,
                };
                setSelectedWorker(worker);
                setStatus('negotiating');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const mapJobs = useMemo(() => {
        if (selectedWorker && status !== 'searching') {
            return [
                { lat: jobLocation.lat, lng: jobLocation.lng, price: `₹${proposedPrice}`, icon: '⚒', isActive: true, variant: 'job' as const },
                { lat: selectedWorker.currentLat, lng: selectedWorker.currentLng, price: '', icon: '•', isActive: false, variant: 'worker' as const },
            ];
        }
        return [{ lat: jobLocation.lat, lng: jobLocation.lng, price: `₹${proposedPrice}`, icon: '⚒', isActive: true, variant: 'job' as const }];
    }, [jobLocation.lat, jobLocation.lng, proposedPrice, selectedWorker, status]);



    return (
        <div ref={canvasRef} className="fixed inset-0 w-screen h-screen bg-slate-50">
            {/* Full Screen Map */}
            <div className="absolute inset-0">
                <JobMap jobs={mapJobs} center={[jobLocation.lat, jobLocation.lng]} zoom={13.5} showControls />
            </div>

            {/* Back Button - Updated Style */}
            <div className="fixed top-6 left-6 z-20">
                <button
                    onClick={() => navigate(-1)}
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-neutral-300 text-neutral-700 text-sm font-semibold hover:bg-neutral-50 transition-all shadow-lg"
                >
                    <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back</span>
                </button>
            </div>

            {/* Status Pill (when not negotiating) */}
            <AnimatePresence>
                {status !== 'negotiating' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-20"
                    >
                        <div className="px-6 py-3 rounded-full bg-white border-2 border-neutral-200 shadow-sm flex items-center gap-3">
                            {status === 'searching' && (
                                <>
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-neutral-700">Finding nearby workers...</span>
                                </>
                            )}
                            {status === 'confirmed' && (
                                <>
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    <span className="text-sm font-medium text-neutral-700">Worker Confirmed</span>
                                </>
                            )}
                            {status === 'in-progress' && (
                                <>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-neutral-700">Job in Progress</span>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Negotiation Modal */}
            <AnimatePresence>
                {status === 'negotiating' && selectedWorker && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md z-[101]"
                        >
                            <div className="rounded-2xl bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 shadow-2xl overflow-hidden">
                                {/* Header */}
                                <div className="px-6 py-5 bg-emerald-500/10 dark:bg-emerald-500/20">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={selectedWorker.avatar}
                                                alt={selectedWorker.name}
                                                className="w-14 h-14 rounded-full border-2 border-emerald-500 object-cover"
                                            />
                                            <div>
                                                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{selectedWorker.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                                    <span>{selectedWorker.rating}</span>
                                                    <span>•</span>
                                                    <span>{selectedWorker.distance}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
                                            Negotiate Price
                                        </label>

                                        {/* Current Price Display */}
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-100 dark:bg-neutral-700/50 mb-4">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-400">Original Price</span>
                                            <span className="text-lg font-bold text-neutral-800 dark:text-neutral-200">₹{proposedPrice}</span>
                                        </div>

                                        {/* Price Input with Increment/Decrement */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Your Offer</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => incrementPrice(-50)}
                                                        className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 flex items-center justify-center transition-colors"
                                                    >
                                                        <Minus size={14} />
                                                    </button>

                                                    <div className="relative flex items-center gap-1 px-4 py-2 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
                                                        <IndianRupee size={16} className="text-emerald-600 dark:text-emerald-400" />
                                                        <input
                                                            type="number"
                                                            value={negotiationPrice}
                                                            onChange={(e) => setNegotiationPrice(Number(e.target.value))}
                                                            className="w-20 bg-transparent text-xl font-black text-center focus:outline-none text-emerald-600 dark:text-emerald-400"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={() => incrementPrice(50)}
                                                        className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 flex items-center justify-center transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Quick Amount Buttons */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">Quick:</span>
                                                {[600, 700, 800, 900, 1000].map((amount) => (
                                                    <button
                                                        key={amount}
                                                        onClick={() => setNegotiationPrice(amount)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${negotiationPrice === amount
                                                            ? 'bg-emerald-500 text-white'
                                                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600'
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
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                                style={{
                                                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${((negotiationPrice - 500) / 1000) * 100}%, rgb(212 212 212 / 0.3) ${((negotiationPrice - 500) / 1000) * 100}%, rgb(212 212 212 / 0.3) 100%)`
                                                }}
                                            />
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={() => setStatus('searching')}
                                                className="py-3 rounded-xl font-semibold text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                            >
                                                Find Another
                                            </button>
                                            <button
                                                onClick={() => setStatus('confirmed')}
                                                className="py-3 rounded-xl font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                                            >
                                                Accept & Confirm
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Confirmed/In-Progress Bottom Panel */}
            <AnimatePresence>
                {(status === 'confirmed' || status === 'in-progress') && selectedWorker && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-30"
                    >
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                            <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        {status === 'confirmed' ? <Clock size={20} /> : <Navigation size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                                            {status === 'confirmed' ? 'Worker Confirmed' : 'Job In Progress'}
                                        </h3>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {status === 'confirmed' ? 'Arriving in 15 mins' : 'Live tracking enabled'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <img src={selectedWorker.avatar} alt={selectedWorker.name} className="w-12 h-12 rounded-full object-cover" />
                                    <div className="flex-1">
                                        <h4 className="font-medium text-neutral-900 dark:text-white">{selectedWorker.name}</h4>
                                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                                            <Star size={12} className="fill-amber-400 text-amber-400" />
                                            <span>{selectedWorker.rating}</span>
                                        </div>
                                    </div>
                                    <a href={`tel:${selectedWorker.phone}`} className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors">
                                        <Phone size={20} />
                                    </a>
                                </div>
                                <div className="flex gap-2">
                                    {status === 'confirmed' ? (
                                        <button
                                            onClick={() => setStatus('in-progress')}
                                            className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors"
                                        >
                                            Start Job
                                        </button>
                                    ) : (
                                        <button className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors">
                                            Mark Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DailyWageJobResponses;
