import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { ArrowLeft, Save, LogOut, Moon, Sun, Wand2, Loader2, Info, MessageSquare, Star, ChevronRight, Heart, X, Check, Globe, Users, KeyRound } from 'lucide-react';
import { generateAvatar } from '../services/gemini';
import { compressImage } from '../services/imageUtils';
import Logo from '../components/Logo';
import { t, Language } from '../services/translations';

interface SettingsPageProps {
  currentUser: FamilyMember;
  onUpdateUser: (updates: Partial<FamilyMember>) => void;
  onLogout: () => void;
  onClose?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  family?: FamilyMember[];
  onResetPassword?: (id: string) => void;
}

const EXPANDED_COLORS = [
  { val: 'bg-red-100 text-red-700', hex: '#fee2e2' },
  { val: 'bg-orange-100 text-orange-700', hex: '#ffedd5' },
  { val: 'bg-amber-100 text-amber-700', hex: '#fef3c7' },
  { val: 'bg-yellow-100 text-yellow-700', hex: '#fef9c3' },
  { val: 'bg-lime-100 text-lime-700', hex: '#ecfccb' },
  { val: 'bg-green-100 text-green-700', hex: '#dcfce7' },
  { val: 'bg-emerald-100 text-emerald-700', hex: '#d1fae5' },
  { val: 'bg-teal-100 text-teal-700', hex: '#ccfbf1' },
  { val: 'bg-cyan-100 text-cyan-700', hex: '#cffafe' },
  { val: 'bg-sky-100 text-sky-700', hex: '#e0f2fe' },
  { val: 'bg-blue-100 text-blue-700', hex: '#dbeafe' },
  { val: 'bg-indigo-100 text-indigo-700', hex: '#e0e7ff' },
  { val: 'bg-violet-100 text-violet-700', hex: '#ede9fe' },
  { val: 'bg-purple-100 text-purple-700', hex: '#f3e8ff' },
  { val: 'bg-fuchsia-100 text-fuchsia-700', hex: '#fae8ff' },
  { val: 'bg-pink-100 text-pink-700', hex: '#fce7f3' },
  { val: 'bg-rose-100 text-rose-700', hex: '#ffe4e6' },
  { val: 'bg-slate-100 text-slate-700', hex: '#f1f5f9' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  currentUser, onUpdateUser, onLogout, onClose, darkMode, onToggleDarkMode, lang, setLang, family, onResetPassword 
}) => {
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);
  const [selectedColor, setSelectedColor] = useState(currentUser.color);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);

  // Modal States
  const [activeModal, setActiveModal] = useState<'none' | 'about' | 'feedback' | 'reset-confirm'>('none');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [resetTarget, setResetTarget] = useState<FamilyMember | null>(null);

  const handleSave = () => {
    onUpdateUser({ name, avatar: avatarUrl, color: selectedColor });
    if (onClose) onClose();
  };

  const handleGenerateAvatar = async () => {
    setGeneratingAvatar(true);
    const newAvatar = await generateAvatar();
    if (newAvatar) {
       const compressed = await compressImage(newAvatar, 300, 0.7);
       setAvatarUrl(compressed);
    } else {
      const randomId = Math.floor(Math.random() * 1000);
      setAvatarUrl(`https://picsum.photos/200/200?random=${randomId}`);
    }
    setGeneratingAvatar(false);
  };

  const handleResetClick = (member: FamilyMember) => {
      setResetTarget(member);
      setActiveModal('reset-confirm');
  };

  const confirmReset = () => {
      if (resetTarget && onResetPassword) {
          onResetPassword(resetTarget.id);
          setActiveModal('none');
          setResetTarget(null);
          // Optional confirmation toast could go here
      }
  };

  const submitFeedback = (e: React.FormEvent) => {
      e.preventDefault();
      setTimeout(() => {
          setFeedbackSent(true);
          setTimeout(() => {
              setFeedbackSent(false);
              setFeedbackText('');
              setRating(0);
              setActiveModal('none');
          }, 2000);
      }, 500);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center shadow-sm sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="mr-4 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition"> 
          <ArrowLeft size={24} />
        </button>
        <span className="font-bold text-xl text-gray-800 dark:text-white">{t('settings.title', lang)}</span>
      </div>

      <div className="flex-1 p-6 pb-32 space-y-6 max-w-md mx-auto w-full">
        
        {/* --- Profile Section --- */}
        <section className="space-y-6">
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.profile', lang)}</h2>
            
            <div className="flex flex-col items-center space-y-4">
            <div className="relative group cursor-pointer" onClick={handleGenerateAvatar}>
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-md relative bg-gray-200">
                    {generatingAvatar ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : (
                        <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                    )}
                </div>
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-sm hover:bg-blue-700 transition">
                {generatingAvatar ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                </div>
            </div>
            <button onClick={handleGenerateAvatar} disabled={generatingAvatar} className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                {t('settings.generate_avatar', lang)}
            </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('settings.display_name', lang)}</label>
                    <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 font-semibold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('settings.your_color', lang)}</label>
                    <div className="grid grid-cols-6 gap-3">
                        {EXPANDED_COLORS.map((c) => (
                            <button
                            key={c.val}
                            onClick={() => setSelectedColor(c.val)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm hover:shadow-md relative overflow-hidden`}
                            style={{ backgroundColor: c.hex }}
                            >
                            {selectedColor === c.val && <div className="bg-black/20 w-full h-full flex items-center justify-center"><Check size={16} className="text-white drop-shadow-md" /></div>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* --- App Settings --- */}
        <section className="space-y-4">
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.app_settings', lang)}</h2>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-600 dark:text-gray-300">
                            {darkMode ? <Moon size={20}/> : <Sun size={20}/>}
                        </div>
                        <span className="font-bold text-gray-800 dark:text-white">{t('settings.dark_mode', lang)}</span>
                    </div>
                    <button 
                        onClick={onToggleDarkMode}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-full text-indigo-600 dark:text-indigo-400">
                            <Globe size={20}/>
                        </div>
                        <span className="font-bold text-gray-800 dark:text-white">{t('settings.language', lang)}</span>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button onClick={() => setLang('de')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${lang === 'de' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>DE</button>
                        <button onClick={() => setLang('en')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${lang === 'en' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}>EN</button>
                    </div>
                </div>
            </div>
        </section>

        {/* --- Family Management (Parent Only) --- */}
        {currentUser.role === 'parent' && family && (
            <section className="space-y-4">
                <div className="flex justify-between items-end px-1">
                    <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.family_management', lang)}</h2>
                    <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{t('settings.only_parents', lang)}</span>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {family.filter(f => f.id !== currentUser.id).map(member => (
                        <div key={member.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <img src={member.avatar} className="w-8 h-8 rounded-full" />
                                <span className="font-medium text-gray-800 dark:text-white">{member.name}</span>
                            </div>
                            <button 
                                onClick={() => handleResetClick(member)}
                                className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center"
                            >
                                <KeyRound size={12} className="mr-1.5" />
                                {t('settings.reset_passwords', lang).split(' ')[0]}...
                            </button>
                        </div>
                    ))}
                    {family.filter(f => f.id !== currentUser.id).length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-sm italic">Keine anderen Nutzer.</div>
                    )}
                </div>
            </section>
        )}

        {/* --- Support & Info --- */}
        <section className="space-y-4">
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.info_help', lang)}</h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                <button onClick={() => setActiveModal('about')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2 rounded-full"><Info size={18} /></div>
                        <span className="font-medium text-gray-800 dark:text-white">{t('settings.about', lang)}</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>
                <button onClick={() => setActiveModal('feedback')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <div className="flex items-center space-x-3">
                        <div className="bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 p-2 rounded-full"><MessageSquare size={18} /></div>
                        <span className="font-medium text-gray-800 dark:text-white">{t('settings.feedback', lang)}</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>
            </div>
        </section>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <button onClick={handleSave} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 active:scale-[0.98] transition hover:bg-blue-700">
            <Save size={20} /><span>{t('settings.save', lang)}</span>
          </button>
          <button onClick={onLogout} className="w-full bg-white dark:bg-gray-800 text-red-500 font-bold py-4 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 flex items-center justify-center space-x-2 active:scale-[0.98] transition hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut size={20} /><span>{t('settings.logout', lang)}</span>
          </button>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* About Modal */}
      {activeModal === 'about' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                  <button onClick={() => setActiveModal('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  <div className="flex flex-col items-center text-center space-y-4">
                      <Logo size={64} className="rounded-2xl shadow-md" />
                      <div><h3 className="text-xl font-bold text-gray-800 dark:text-white">FamilienHub</h3><p className="text-xs text-gray-500 font-mono mt-1">Version 2.0.2</p></div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">Die ultimative Organisations-App für Familien.</p>
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-700 w-full"><p className="text-xs text-gray-400">© 2024 FamilienHub Inc.</p></div>
                  </div>
              </div>
          </div>
      )}

      {/* Reset Confirmation Modal */}
      {activeModal === 'reset-confirm' && resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('settings.reset_passwords', lang)}?</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">{t('settings.reset_confirm', lang).replace('{name}', resetTarget.name)}</p>
                  <div className="flex space-x-3">
                      <button onClick={() => setActiveModal('none')} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">Abbrechen</button>
                      <button onClick={confirmReset} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg">Zurücksetzen</button>
                  </div>
              </div>
          </div>
      )}

      {/* Feedback Modal */}
      {activeModal === 'feedback' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                  <button onClick={() => setActiveModal('none')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  {!feedbackSent ? (
                      <form onSubmit={submitFeedback} className="space-y-4">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center"><MessageSquare size={20} className="mr-2 text-pink-500"/> {t('settings.feedback', lang)}</h3>
                          <div className="flex justify-center space-x-2 py-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none transition transform hover:scale-110">
                                      <Star size={32} className={`${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                  </button>
                              ))}
                          </div>
                          <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="..." rows={4} required className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-pink-500 outline-none resize-none" />
                          <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-[0.98] transition">Absenden</button>
                      </form>
                  ) : (
                      <div className="py-8 flex flex-col items-center text-center animate-fade-in">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600"><Check size={32} /></div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Danke!</h3>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default SettingsPage;