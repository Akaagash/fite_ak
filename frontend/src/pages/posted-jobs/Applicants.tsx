import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Phone, Mail, MapPin, Star, Calendar, Briefcase, Download, X, FileText, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Applicant {
    id: number;
    name: string;
    avatar: string;
    rating: number;
    experience: string;
    location: string;
    phone: string;
    email: string;
    appliedAt: string;
    skills: string[];
    bio: string;
}

const Applicants: React.FC = () => {
    const navigate = useNavigate();
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    // Mock applicants data
    const applicants: Applicant[] = [
        {
            id: 1,
            name: "Rajesh Kumar",
            avatar: "https://i.pravatar.cc/150?img=12",
            rating: 4.8,
            experience: "5 years",
            location: "Indiranagar, Bangalore",
            phone: "+91 98765 43210",
            email: "rajesh.kumar@email.com",
            appliedAt: "2 hours ago",
            skills: ["React", "TypeScript", "Node.js", "MongoDB"],
            bio: "Experienced full-stack developer with a passion for building scalable web applications. Specialized in React and Node.js ecosystems with strong problem-solving skills."
        },
        {
            id: 2,
            name: "Priya Sharma",
            avatar: "https://i.pravatar.cc/150?img=5",
            rating: 4.9,
            experience: "3 years",
            location: "Koramangala, Bangalore",
            phone: "+91 98765 43211",
            email: "priya.sharma@email.com",
            appliedAt: "5 hours ago",
            skills: ["UI/UX", "Figma", "Adobe XD", "Prototyping"],
            bio: "Creative UI/UX designer focused on user-centered design principles. Expert in creating intuitive interfaces and seamless user experiences across web and mobile platforms."
        },
        {
            id: 3,
            name: "Amit Patel",
            avatar: "https://i.pravatar.cc/150?img=8",
            rating: 4.7,
            experience: "4 years",
            location: "Whitefield, Bangalore",
            phone: "+91 98765 43212",
            email: "amit.patel@email.com",
            appliedAt: "1 day ago",
            skills: ["Python", "Django", "PostgreSQL", "Docker"],
            bio: "Backend developer specializing in Python and Django. Strong experience in database optimization, API design, and cloud infrastructure deployment."
        },
        {
            id: 4,
            name: "Sneha Reddy",
            avatar: "https://i.pravatar.cc/150?img=9",
            rating: 4.6,
            experience: "2 years",
            location: "HSR Layout, Bangalore",
            phone: "+91 98765 43213",
            email: "sneha.reddy@email.com",
            appliedAt: "2 days ago",
            skills: ["Java", "Spring Boot", "Microservices", "Kafka"],
            bio: "Java developer with expertise in building microservices architecture. Passionate about clean code and modern software development practices."
        }
    ];

    return (
        <div className="w-full min-h-screen relative px-4 md:px-8 pt-8 pb-10">
            <div className="mx-auto w-full max-w-6xl">

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/posted-jobs')}
                        className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-neutral-900 text-white hover:bg-neutral-800"
                    >
                        <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span>Back to Jobs</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="relative flex items-center p-1 rounded-xl overflow-hidden bg-neutral-100 border-2 border-neutral-200 shadow-sm">
                        <motion.div
                            layoutId="applicantViewTogglePill"
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

                    {/* Download All Resumes Button */}
                    <button
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-neutral-900 text-white hover:bg-neutral-800"
                    >
                        <FileText size={18} />
                        Download All Resumes
                    </button>
                </div>
            </div>

            {/* Title Section */}
            <div className="relative z-10 mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                    Applicants
                </h1>
                <p className="text-sm mt-2 font-medium text-neutral-500">
                    {applicants.length} {applicants.length === 1 ? 'applicant' : 'applicants'} received for this position
                </p>
            </div>

            {/* Applicants View */}
            <AnimatePresence mode="wait">
                {viewMode === 'card' ? (
                    <motion.div
                        key="cards"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5"
                    >
                        {applicants.map((applicant, index) => (
                            <motion.div
                                key={applicant.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedApplicant(applicant)}
                                className="group relative cursor-pointer p-6 pl-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 bg-white border-2 border-neutral-200 shadow-sm hover:shadow-lg"
                            >
                                {/* Left Accent Line */}
                                <div className="absolute left-0 top-4 bottom-4 w-1.5 rounded-full bg-neutral-900" />
                                {/* Header with Avatar and Basic Info */}
                                <div className="flex items-start gap-4 mb-4">
                                    <img
                                        src={applicant.avatar}
                                        alt={applicant.name}
                                        className="w-16 h-16 rounded-full object-cover border-2 border-neutral-300"
                                    />
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-neutral-900">{applicant.name}</h3>
                                        <div className="flex items-center gap-2 text-sm mt-1 text-neutral-600">
                                            <Star size={14} className="fill-amber-400 text-amber-400" />
                                            <span className="font-medium">{applicant.rating}</span>
                                            <span className="mx-1">•</span>
                                            <Briefcase size={14} />
                                            <span>{applicant.experience}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-neutral-400">{applicant.appliedAt}</span>
                                </div>

                                {/* Location */}
                                <div className="flex items-center gap-2 text-sm mb-3 text-neutral-600">
                                    <MapPin size={14} className="opacity-70" />
                                    <span>{applicant.location}</span>
                                </div>

                                {/* Skills */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {applicant.skills.slice(0, 3).map((skill, i) => (
                                        <span
                                            key={i}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-100 text-neutral-900"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                    {applicant.skills.length > 3 && (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-50 text-neutral-500">
                                            +{applicant.skills.length - 3} more
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-4 border-t-2 border-neutral-100">
                                    <a
                                        href={`tel:${applicant.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                                    >
                                        <Phone size={14} />
                                        Call
                                    </a>
                                    <a
                                        href={`mailto:${applicant.email}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                                    >
                                        <Mail size={14} />
                                        Email
                                    </a>
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
                        className="relative z-10 space-y-3"
                    >
                        {/* List Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[11px] uppercase tracking-wider font-bold text-neutral-500">
                            <div className="col-span-4">Name</div>
                            <div className="col-span-2">Rating</div>
                            <div className="col-span-3">Location</div>
                            <div className="col-span-2">Experience</div>
                            <div className="col-span-1 text-right">Applied</div>
                        </div>
                        {applicants.map((applicant, index) => (
                            <motion.div
                                key={applicant.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedApplicant(applicant)}
                                className="group relative grid grid-cols-12 gap-4 items-center cursor-pointer pl-8 pr-6 py-4 rounded-xl transition-all duration-200 bg-white border-2 border-neutral-200 hover:shadow-md"
                            >
                                {/* Left Accent Line */}
                                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-neutral-900" />

                                {/* Name & Avatar */}
                                <div className="col-span-4 flex items-center gap-3">
                                    <img src={applicant.avatar} alt={applicant.name} className="w-10 h-10 rounded-full object-cover border-2 border-neutral-300" />
                                    <div>
                                        <div className="text-sm font-bold text-neutral-900">{applicant.name}</div>
                                        <div className="text-xs text-neutral-400">
                                            {applicant.skills.slice(0, 2).join(', ')}
                                        </div>
                                    </div>
                                </div>

                                {/* Rating */}
                                <div className="col-span-2 flex items-center gap-1">
                                    <Star size={14} className="fill-amber-400 text-amber-400" />
                                    <span className="text-sm font-bold text-neutral-900">{applicant.rating}</span>
                                </div>

                                {/* Location */}
                                <div className="col-span-3 flex items-center gap-2 text-sm text-neutral-600">
                                    <MapPin size={14} className="opacity-70" />
                                    <span className="truncate">{applicant.location}</span>
                                </div>

                                {/* Experience */}
                                <div className="col-span-2 text-sm font-medium text-neutral-700">
                                    {applicant.experience}
                                </div>

                                {/* Applied */}
                                <div className="col-span-1 text-xs text-right text-neutral-400">
                                    {applicant.appliedAt}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Expanded Applicant Modal */}
            <AnimatePresence>
                {selectedApplicant && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedApplicant(null)}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[90vh] z-[101] overflow-auto"
                        >
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-white border-2 border-neutral-200">
                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedApplicant(null)}
                                    className="absolute top-4 right-4 z-10 p-2 rounded-lg transition-colors bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                                >
                                    <X size={20} />
                                </button>

                                {/* Header */}
                                <div className="px-6 py-6 bg-neutral-50">
                                    <div className="flex items-start gap-4">
                                        <img
                                            src={selectedApplicant.avatar}
                                            alt={selectedApplicant.name}
                                            className="w-20 h-20 rounded-full object-cover border-2 border-neutral-300"
                                        />
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-black text-neutral-900">{selectedApplicant.name}</h3>
                                            <div className="flex items-center gap-3 text-sm mt-2 text-neutral-600">
                                                <div className="flex items-center gap-1">
                                                    <Star size={14} className="fill-amber-400 text-amber-400" />
                                                    <span className="font-medium">{selectedApplicant.rating}</span>
                                                </div>
                                                <span>•</span>
                                                <div className="flex items-center gap-1">
                                                    <Briefcase size={14} />
                                                    <span>{selectedApplicant.experience}</span>
                                                </div>
                                                <span>•</span>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>{selectedApplicant.appliedAt}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm mt-2 text-neutral-600">
                                                <MapPin size={14} />
                                                <span>{selectedApplicant.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-6">
                                    {/* Bio */}
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider mb-2 text-neutral-500">About</h4>
                                        <p className="leading-relaxed text-neutral-600">{selectedApplicant.bio}</p>
                                    </div>

                                    {/* Skills */}
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-neutral-500">Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApplicant.skills.map((skill, i) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1.5 rounded-lg text-sm font-bold bg-neutral-100 text-neutral-900 border-2 border-neutral-200"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Contact Info */}
                                    <div>
                                        <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-neutral-500">Contact Information</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 text-sm text-neutral-700">
                                                <Phone size={16} className="opacity-70" />
                                                <a href={`tel:${selectedApplicant.phone}`} className="hover:underline">
                                                    {selectedApplicant.phone}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-neutral-700">
                                                <Mail size={16} className="opacity-70" />
                                                <a href={`mailto:${selectedApplicant.email}`} className="hover:underline">
                                                    {selectedApplicant.email}
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4">
                                        <a
                                            href={`tel:${selectedApplicant.phone}`}
                                            className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                                        >
                                            <Phone size={16} />
                                            Call Applicant
                                        </a>
                                        <button
                                            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
                                        >
                                            <Download size={16} />
                                            Download Resume
                                        </button>
                                    </div>
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

export default Applicants;
