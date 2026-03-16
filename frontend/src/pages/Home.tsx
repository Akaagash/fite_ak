import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '../context/ModeContext';
import { motion } from 'framer-motion';
import { Briefcase, Clock, TrendingUp, Users, ChevronRight, MapPin, ArrowUpRight } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { mode } = useMode();

    const isDaily = mode === 'daily';

    const stats = [
        { label: 'Active Jobs', value: '24', icon: Briefcase, trend: '+12%' },
        { label: 'Applications', value: '156', icon: Users, trend: '+8%' },
        { label: 'Response Rate', value: '89%', icon: TrendingUp, trend: '+5%' },
        { label: 'Avg. Time', value: '2.4h', icon: Clock, trend: '-15%' },
    ];

    const quickActions = isDaily
        ? [
            { title: 'Post a Quick Job', desc: 'Get workers in minutes', path: '/posted-jobs' },
            { title: 'View Posted Jobs', desc: 'Track your active jobs', path: '/posted-jobs' },
            { title: 'Explore Workers', desc: 'Find nearby workers', path: '/explore-jobs' },
        ]
        : [
            { title: 'Post a Position', desc: 'Find the perfect candidate', path: '/posted-jobs' },
            { title: 'View Posted Jobs', desc: 'Manage applications', path: '/posted-jobs' },
            { title: 'Browse Candidates', desc: 'Discover talent', path: '/explore-jobs' },
        ];

    const recentJobs = [
        { title: isDaily ? 'Plumbing Work' : 'Frontend Developer', location: 'Koramangala, Bangalore', applicants: 5, time: '2h ago' },
        { title: isDaily ? 'Electrical Repairs' : 'Backend Engineer', location: 'HSR Layout, Bangalore', applicants: 8, time: '4h ago' },
        { title: isDaily ? 'House Cleaning' : 'UI/UX Designer', location: 'Indiranagar, Bangalore', applicants: 3, time: '1d ago' },
    ];

    return (
        <div className="w-full min-h-screen relative px-4 md:px-8 pt-8 pb-10">
            <div className="mx-auto w-full max-w-6xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                        Dashboard
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1 font-medium">
                        {isDaily ? "Manage your daily wage postings" : "Track your long-term positions"}
                    </p>
                </div>
            </div>

            {/* Welcome Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 mb-10"
            >
                <div className="relative overflow-hidden rounded-2xl p-8 border-2 border-neutral-200 bg-white shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${isDaily ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isDaily ? 'Daily Wage Mode' : 'Long-Term Mode'}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
                                Welcome to <span className={isDaily ? 'text-emerald-600' : 'text-amber-600'}>FITE</span>
                            </h2>
                            <p className="text-neutral-600 max-w-xl leading-relaxed">
                                {isDaily
                                    ? 'Connect with skilled workers instantly. Post jobs and get responses within minutes.'
                                    : 'Build your team with top talent. Find qualified candidates for long-term positions.'
                                }
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/posted-jobs')}
                            className={`shrink-0 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isDaily
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-amber-600 text-white hover:bg-amber-700'
                                }`}
                        >
                            Post a Job
                            <ArrowUpRight size={18} />
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="p-5 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${isDaily ? 'bg-emerald-50' : 'bg-amber-50'} flex items-center justify-center`}>
                                <stat.icon size={20} className={isDaily ? 'text-emerald-600' : 'text-amber-600'} />
                            </div>
                            <span className={`text-xs font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-neutral-900">{stat.value}</div>
                        <div className="text-sm text-neutral-500 font-medium">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="relative z-10 mb-10">
                <h2 className="text-lg font-bold text-neutral-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {quickActions.map((action, index) => (
                        <motion.div
                            key={action.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + 0.1 * index }}
                            whileHover={{ y: -4 }}
                            onClick={() => navigate(action.path)}
                            className="group cursor-pointer p-6 rounded-2xl border-2 border-neutral-200 bg-white shadow-sm hover:shadow-md hover:border-neutral-300 transition-all"
                        >
                            <h3 className="text-lg font-bold text-neutral-900 mb-1">{action.title}</h3>
                            <p className="text-sm text-neutral-500 mb-4">{action.desc}</p>
                            <div className="flex items-center text-sm font-semibold text-neutral-600 group-hover:text-neutral-900 transition-colors">
                                Get Started
                                <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Recent Jobs */}
            <div className="relative z-10">
                <h2 className="text-lg font-bold text-neutral-900 mb-4">Recent Activity</h2>
                <div
                    className="rounded-2xl border-2 border-neutral-200 bg-white overflow-hidden shadow-sm"
                >
                    {recentJobs.map((job, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + 0.1 * index }}
                            className={`flex items-center gap-4 p-5 cursor-pointer hover:bg-neutral-50 transition-colors ${index !== recentJobs.length - 1 ? 'border-b border-neutral-100' : ''}`}
                        >
                            <div className={`w-12 h-12 rounded-xl ${isDaily ? 'bg-emerald-50' : 'bg-amber-50'} flex items-center justify-center shrink-0`}>
                                <Briefcase size={20} className={isDaily ? 'text-emerald-600' : 'text-amber-600'} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-neutral-900 truncate">{job.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-neutral-500">
                                    <MapPin size={12} />
                                    <span className="truncate">{job.location}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 text-sm font-bold text-neutral-700">
                                    <Users size={14} />
                                    {job.applicants} applicants
                                </div>
                                <div className="text-xs text-neutral-400 font-medium">{job.time}</div>
                            </div>
                            <ChevronRight size={20} className="text-neutral-300" />
                        </motion.div>
                    ))}
                </div>
            </div>
            </div>
        </div>
    );
};

export default Home;
