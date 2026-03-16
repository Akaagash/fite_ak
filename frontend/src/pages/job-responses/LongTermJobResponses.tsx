import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, X, FileText, User, GraduationCap, Calendar, Mail, Phone, MapPin, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Applicant {
    id: number;
    name: string;
    age: number;
    education: string;
    email: string;
    phone: string;
    location: string;
    experience: string;
    skills: string[];
    appliedAt: string;
    resumeUrl: string;
    avatar: string;
}

const LongTermJobResponses: React.FC = () => {
    const { jobId: _jobId } = useParams();
    const navigate = useNavigate();
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

    // Dummy applicant data
    const applicants: Applicant[] = [
        {
            id: 1,
            name: "Rahul Kumar",
            age: 24,
            education: "B.Tech in Computer Science",
            email: "rahul.kumar@email.com",
            phone: "+91 98765 43210",
            location: "HSR Layout, Bangalore",
            experience: "2 years",
            skills: ["React", "TypeScript", "Node.js", "MongoDB"],
            appliedAt: "2 hours ago",
            resumeUrl: "/resumes/rahul-kumar.pdf",
            avatar: "https://i.pravatar.cc/150?img=12"
        },
        {
            id: 2,
            name: "Priya Sharma",
            age: 26,
            education: "M.Tech in Software Engineering",
            email: "priya.sharma@email.com",
            phone: "+91 98765 43211",
            location: "Koramangala, Bangalore",
            experience: "3 years",
            skills: ["React", "Vue.js", "Python", "AWS"],
            appliedAt: "5 hours ago",
            resumeUrl: "/resumes/priya-sharma.pdf",
            avatar: "https://i.pravatar.cc/150?img=5"
        },
        {
            id: 3,
            name: "Arjun Patel",
            age: 23,
            education: "B.E in Information Technology",
            email: "arjun.patel@email.com",
            phone: "+91 98765 43212",
            location: "Whitefield, Bangalore",
            experience: "1 year",
            skills: ["JavaScript", "React", "CSS", "Figma"],
            appliedAt: "1 day ago",
            resumeUrl: "/resumes/arjun-patel.pdf",
            avatar: "https://i.pravatar.cc/150?img=8"
        },
        {
            id: 4,
            name: "Sneha Reddy",
            age: 25,
            education: "B.Tech in Electronics",
            email: "sneha.reddy@email.com",
            phone: "+91 98765 43213",
            location: "Indiranagar, Bangalore",
            experience: "2 years",
            skills: ["React Native", "Flutter", "Firebase"],
            appliedAt: "2 days ago",
            resumeUrl: "/resumes/sneha-reddy.pdf",
            avatar: "https://i.pravatar.cc/150?img=9"
        },
    ];

    const handleDownloadAll = () => {
        // In a real app, this would create a zip file of all resumes
        alert('Downloading all resumes as ZIP...');
    };

    const handleDownloadResume = (applicant: Applicant) => {
        alert(`Downloading resume for ${applicant.name}...`);
    };

    return (
        <div className="w-full h-full flex flex-col gap-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/posted-jobs')}
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <ChevronLeft size={24} className="text-neutral-700 dark:text-neutral-300" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                            Job Applicants
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Software Development Intern • {applicants.length} applicants
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white bg-yellow-500 hover:bg-yellow-600 transition-all hover:scale-105 shadow-lg"
                >
                    <Download size={20} />
                    Download All Resumes
                </button>
            </div>

            {/* Applicants List */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                    {applicants.map((applicant) => (
                        <motion.div
                            key={applicant.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setSelectedApplicant(applicant)}
                            className="group cursor-pointer p-6 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 hover:shadow-xl transition-all hover:scale-[1.02]"
                        >
                            <div className="flex items-center gap-6">
                                <img
                                    src={applicant.avatar}
                                    alt={applicant.name}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                                            {applicant.name}
                                        </h3>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                            {applicant.age} years
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap size={16} />
                                            {applicant.education}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} />
                                            Applied {applicant.appliedAt}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadResume(applicant);
                                        }}
                                        className="px-4 py-2 rounded-lg font-medium text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                    >
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Applicant Detail Modal */}
            <AnimatePresence>
                {selectedApplicant && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedApplicant(null)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-white/10 p-6 flex items-center justify-between z-10">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={selectedApplicant.avatar}
                                        alt={selectedApplicant.name}
                                        className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500"
                                    />
                                    <div>
                                        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                                            {selectedApplicant.name}
                                        </h2>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                            {selectedApplicant.age} years • {selectedApplicant.experience} experience
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedApplicant(null)}
                                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    <X size={24} className="text-neutral-700 dark:text-neutral-300" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                {/* Education */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <GraduationCap size={20} className="text-yellow-600 dark:text-yellow-400" />
                                        <h3 className="font-bold text-neutral-800 dark:text-neutral-200">Education</h3>
                                    </div>
                                    <p className="text-neutral-600 dark:text-neutral-400 ml-7">
                                        {selectedApplicant.education}
                                    </p>
                                </div>

                                {/* Contact Information */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <User size={20} className="text-yellow-600 dark:text-yellow-400" />
                                        <h3 className="font-bold text-neutral-800 dark:text-neutral-200">Contact Information</h3>
                                    </div>
                                    <div className="ml-7 space-y-2">
                                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                                            <Mail size={16} />
                                            {selectedApplicant.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                                            <Phone size={16} />
                                            {selectedApplicant.phone}
                                        </div>
                                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                                            <MapPin size={16} />
                                            {selectedApplicant.location}
                                        </div>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText size={20} className="text-yellow-600 dark:text-yellow-400" />
                                        <h3 className="font-bold text-neutral-800 dark:text-neutral-200">Skills</h3>
                                    </div>
                                    <div className="ml-7 flex flex-wrap gap-2">
                                        {selectedApplicant.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => handleDownloadResume(selectedApplicant)}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-white bg-yellow-500 hover:bg-yellow-600 transition-all hover:scale-105 shadow-lg"
                                    >
                                        <Download size={20} />
                                        Download Resume
                                    </button>
                                    <button className="flex-1 px-6 py-3 rounded-full font-bold text-yellow-600 dark:text-yellow-400 border-2 border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all">
                                        Contact Applicant
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LongTermJobResponses;
