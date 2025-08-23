import React, { useState, useMemo, useEffect } from 'react';
import type { Note, UserProfile } from '../types';
import { CloseIcon, ProfileIcon, Avatar1Icon, Avatar2Icon, Avatar3Icon, Avatar4Icon, FileTextIcon, TagIcon, ImageIcon, MicIcon, ImportIcon, ExportIcon, AlertTriangleIcon, LogOutIcon } from './icons';

interface ProfileModalProps {
    notes: Note[];
    userProfile: UserProfile;
    onClose: () => void;
    onProfileUpdate: (newProfile: UserProfile) => void;
    onImportClick: () => void;
    onExport: () => void;
    onDeleteAll: () => void;
    onLogout: () => void;
}

const AVATARS = {
    'avatar1': Avatar1Icon,
    'avatar2': Avatar2Icon,
    'avatar3': Avatar3Icon,
    'avatar4': Avatar4Icon,
};

type AvatarKey = keyof typeof AVATARS;

export const ProfileModal: React.FC<ProfileModalProps> = ({ notes, userProfile, onClose, onProfileUpdate, onImportClick, onExport, onDeleteAll, onLogout }) => {
    const [name, setName] = useState(userProfile.name);
    const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>(userProfile.avatar as AvatarKey);
    
    useEffect(() => {
        setName(userProfile.name);
        setSelectedAvatar(userProfile.avatar as AvatarKey);
    }, [userProfile]);

    const stats = useMemo(() => {
        const tagSet = new Set<string>();
        let imageCount = 0;
        let audioCount = 0;

        notes.forEach(note => {
            if (note.tags) note.tags.forEach(tag => tagSet.add(tag));
            if (note.image_url) imageCount++;
            if (note.audio_url) audioCount++;
        });

        return {
            totalNotes: notes.length,
            uniqueTags: tagSet.size,
            imageNotes: imageCount,
            audioNotes: audioCount,
        };
    }, [notes]);

    const handleSave = () => {
        onProfileUpdate({ name, avatar: selectedAvatar });
        onClose();
    };

    const SelectedAvatarComponent = AVATARS[selectedAvatar] || Avatar1Icon;
    
    const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: number | string }> = ({ icon, label, value }) => (
        <div className="bg-amber-100/50 dark:bg-gray-700/60 p-3 rounded-lg flex items-center gap-3">
            <div className="bg-white/80 dark:bg-gray-800 p-2 rounded-full">{icon}</div>
            <div>
                <p className="text-xl sm:text-2xl font-bold themed-modal-text">{value}</p>
                <p className="text-sm sm:text-base text-amber-700 themed-modal-text-alt">{label}</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" aria-modal="true">
            <div className="bg-amber-50/95 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-amber-200 themed-modal-bg">
                <header className="flex justify-between items-center p-4 border-b border-amber-200 themed-modal-header flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <ProfileIcon className="w-8 h-8 text-amber-700 themed-modal-text" />
                        <h2 className="text-2xl sm:text-3xl text-amber-800 themed-modal-text">Profile & Settings</h2>
                    </div>
                    <button onClick={onClose} className="text-amber-600 hover:text-amber-900 themed-modal-text" aria-label="Close profile">
                        <CloseIcon className="w-7 h-7" />
                    </button>
                </header>
                
                <div className="flex-grow p-4 sm:p-6 overflow-y-auto thin-scrollbar space-y-6">
                    {/* Personalization Section */}
                    <section>
                        <h3 className="text-xl sm:text-2xl font-bold text-amber-800 themed-modal-text mb-3">Personalization</h3>
                        <div className="bg-amber-100/50 dark:bg-gray-700/60 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4">
                            <SelectedAvatarComponent className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex-shrink-0" />
                            <div className="w-full space-y-3">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your Name"
                                    className="w-full text-xl sm:text-2xl p-2 bg-white/80 border-2 border-amber-200 rounded-lg focus:border-amber-400 focus:ring-amber-300 themed-modal-input-bg themed-modal-text-alt"
                                />
                                <div className="flex justify-center sm:justify-start gap-3">
                                    {Object.keys(AVATARS).map(avatarKey => {
                                        const AvatarComponent = AVATARS[avatarKey as AvatarKey];
                                        return (
                                            <button key={avatarKey} onClick={() => setSelectedAvatar(avatarKey as AvatarKey)} className={`rounded-full transition-all duration-200 ${selectedAvatar === avatarKey ? 'ring-4 ring-amber-500 scale-110' : 'ring-2 ring-transparent hover:scale-105'}`}>
                                                <AvatarComponent className="w-12 h-12" />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Statistics Section */}
                    <section>
                        <h3 className="text-xl sm:text-2xl font-bold text-amber-800 themed-modal-text mb-3">Statistics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                           <StatCard icon={<FileTextIcon className="w-6 h-6 text-amber-700"/>} label="Total Notes" value={stats.totalNotes} />
                           <StatCard icon={<TagIcon className="w-6 h-6 text-sky-700"/>} label="Unique Tags" value={stats.uniqueTags} />
                           <StatCard icon={<ImageIcon className="w-6 h-6 text-rose-700"/>} label="Image Notes" value={stats.imageNotes} />
                           <StatCard icon={<MicIcon className="w-6 h-6 text-violet-700"/>} label="Audio Notes" value={stats.audioNotes} />
                        </div>
                    </section>
                    
                    {/* Data Management Section */}
                    <section>
                         <h3 className="text-xl sm:text-2xl font-bold text-amber-800 themed-modal-text mb-3">Data Management</h3>
                         <div className="grid grid-cols-2 gap-3">
                            <button onClick={onImportClick} className="w-full flex items-center justify-center gap-2 bg-sky-500 text-white text-base sm:text-lg font-bold py-2.5 px-4 rounded-lg hover:bg-sky-600 transition duration-300">
                                <ImportIcon className="w-5 h-5"/> Import Notes
                            </button>
                            <button onClick={onExport} className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white text-base sm:text-lg font-bold py-2.5 px-4 rounded-lg hover:bg-emerald-600 transition duration-300">
                                <ExportIcon className="w-5 h-5"/> Export All Notes
                            </button>
                         </div>
                    </section>
                    
                    {/* Danger Zone */}
                    <section>
                        <div className="border-2 border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg space-y-2">
                             <h3 className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400 flex items-center gap-2"><AlertTriangleIcon /> Danger Zone</h3>
                             <p className="text-red-600 dark:text-red-300">This action is irreversible. All your notes will be permanently deleted.</p>
                             <button onClick={onDeleteAll} className="bg-red-600 text-white text-sm sm:text-base font-bold py-1.5 px-3 sm:py-2 sm:px-4 rounded-lg hover:bg-red-700 transition duration-300">
                                Delete All Notes
                             </button>
                        </div>
                    </section>
                </div>

                <footer className="p-4 border-t border-amber-200 themed-modal-header flex-shrink-0 flex justify-between items-center gap-3">
                    <button type="button" onClick={onLogout} className="flex items-center gap-2 text-red-600 text-base sm:text-lg font-bold py-2.5 px-5 rounded-full hover:bg-red-100 transition duration-300 themed-modal-button">
                        <LogOutIcon className="w-5 h-5"/> Log Out
                    </button>
                    <div className="flex sm:justify-end gap-3">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto text-amber-700 text-base sm:text-lg font-bold py-2.5 px-5 rounded-full hover:bg-amber-100 transition duration-300 themed-modal-button">Cancel</button>
                        <button type="button" onClick={handleSave} className="w-full sm:w-auto bg-amber-700 text-white text-base sm:text-lg font-bold py-2.5 px-5 rounded-full hover:bg-amber-800 transition duration-300">
                            Save Profile
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};