import React, { useState, useRef } from 'react';
import Header from '../components/Header';
import { CalendarEvent, FamilyMember, NewsItem } from '../types';
import { MapPin, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, Trash2, Plus, Edit2, Layout, FileText, Image as ImageIcon, Camera, Loader2, Link as LinkIcon, Hash, Users, User } from 'lucide-react';
import { compressImage } from '../services/imageUtils';

interface CalendarPageProps {
  events: CalendarEvent[];
  news: NewsItem[];
  family: FamilyMember[];
  currentUser: FamilyMember;
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onAddNews: (item: NewsItem) => void;
  onDeleteNews: (id: string) => void;
  onProfileClick: () => void;
}

type Tab = 'calendar' | 'news';

const CalendarPage: React.FC<CalendarPageProps> = ({ events, news, family, currentUser, onAddEvent, onUpdateEvent, onDeleteEvent, onAddNews, onDeleteNews, onProfileClick }) => {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [calendarView, setCalendarView] = useState<'family' | 'private'>('family');
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Event Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualStartTime, setManualStartTime] = useState('12:00');
  const [manualEndTime, setManualEndTime] = useState('13:00');
  const [manualLocation, setManualLocation] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualAssignedTo, setManualAssignedTo] = useState<string[]>([currentUser.id]);

  // News State
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsDesc, setNewsDesc] = useState('');
  const [newsTag, setNewsTag] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [newsImageUrlInput, setNewsImageUrlInput] = useState('');
  const newsFileInputRef = useRef<HTMLInputElement>(null);
  const [processingImage, setProcessingImage] = useState(false);

  // Filter events before grouping
  const filteredEvents = events.filter(e => {
      if (calendarView === 'private') {
          return e.assignedTo.includes(currentUser.id);
      }
      return true;
  });

  // Group events by date
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  // --- Handlers ---

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsFormOpen(false); // Start with list view
  };

  const closeModal = () => {
    setSelectedDate(null);
    setIsFormOpen(false);
    setEditingEventId(null);
  };

  const openAddFormInModal = () => {
      setEditingEventId(null);
      setManualTitle('');
      setManualDate(selectedDate || new Date().toISOString().split('T')[0]);
      setManualStartTime('12:00');
      setManualEndTime('13:00');
      setManualLocation('');
      setManualDescription('');
      setManualAssignedTo([currentUser.id]);
      setIsFormOpen(true);
  }

  const handleEditEvent = (event: CalendarEvent) => {
      setEditingEventId(event.id);
      setManualTitle(event.title);
      setManualDate(event.date);
      setManualStartTime(event.time);
      setManualEndTime(event.endTime || '');
      setManualLocation(event.location || '');
      setManualDescription(event.description || '');
      setManualAssignedTo(event.assignedTo);
      setIsFormOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    if (editingEventId) {
        onUpdateEvent(editingEventId, {
            title: manualTitle,
            date: manualDate,
            time: manualStartTime,
            endTime: manualEndTime,
            location: manualLocation,
            description: manualDescription,
            assignedTo: manualAssignedTo
        });
    } else {
        const newEvent: CalendarEvent = {
            id: Date.now().toString(),
            title: manualTitle,
            date: manualDate,
            time: manualStartTime,
            endTime: manualEndTime,
            location: manualLocation,
            description: manualDescription,
            assignedTo: manualAssignedTo
        };
        onAddEvent(newEvent);
    }
    // Go back to list view of the date we just edited/added to
    setSelectedDate(manualDate);
    setIsFormOpen(false);
    setEditingEventId(null);
  };

  const handleDelete = () => {
      if (editingEventId) {
          onDeleteEvent(editingEventId);
          setIsFormOpen(false);
          setEditingEventId(null);
      }
  };

  const toggleAssignee = (id: string) => {
      if (manualAssignedTo.includes(id)) {
          setManualAssignedTo(manualAssignedTo.filter(aid => aid !== id));
      } else {
          setManualAssignedTo([...manualAssignedTo, id]);
      }
  };

  const getMonthData = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; 
    return { year, month, daysInMonth, startOffset };
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  };

  // --- News Handlers ---
  const handleNewsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setProcessingImage(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = reader.result as string;
              const compressed = await compressImage(base64, 800, 0.7);
              setNewsImage(compressed);
              setProcessingImage(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const submitNews = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newsTitle.trim()) return;

      const finalImage = imageMode === 'url' ? newsImageUrlInput : newsImage;

      const newItem: NewsItem = {
          id: Date.now().toString(),
          title: newsTitle,
          description: newsDesc,
          tag: newsTag.startsWith('#') ? newsTag : (newsTag ? `#${newsTag}` : undefined),
          image: finalImage,
          createdAt: new Date().toISOString(),
          authorId: currentUser.id
      };

      onAddNews(newItem);
      
      // Reset
      setShowNewsForm(false);
      setNewsTitle('');
      setNewsDesc('');
      setNewsTag('');
      setNewsImage('');
      setNewsImageUrlInput('');
  };

  const renderMonthView = () => {
    const { year, month, daysInMonth, startOffset } = getMonthData(currentMonth);
    const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    const emptySlots = Array.from({ length: startOffset });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in transition-colors mb-6">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition"><ChevronLeft size={20}/></button>
          <span className="font-bold text-lg text-gray-800 dark:text-white capitalize">{monthName}</span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition"><ChevronRight size={20}/></button>
        </div>
        
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
           {weekDays.map(d => (
             <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{d}</div>
           ))}
        </div>

        {/* Updated Grid: Taller Rows to avoid squeezing */}
        <div className="grid grid-cols-7 auto-rows-[minmax(80px,auto)] divide-x divide-y divide-gray-100 dark:divide-gray-700 border-b dark:border-gray-700">
           {emptySlots.map((_, i) => <div key={`empty-${i}`} className="bg-gray-50/30 dark:bg-gray-800/30" />)}
           {days.map(day => {
             const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
             const dayEvents = groupedEvents[dateStr] || [];
             const isToday = dateStr === new Date().toISOString().split('T')[0];

             return (
               <div 
                key={day} 
                onClick={() => handleDayClick(dateStr)}
                className={`relative flex flex-col items-center justify-start pt-2 pb-1 cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/40`}
               >
                 <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 dark:text-gray-300'}`}>
                   {day}
                 </span>
                 
                 {/* Event Indicators */}
                 <div className="flex flex-col space-y-1 w-full px-1 items-center overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div 
                        key={ev.id} 
                        className="w-full max-w-[80%] h-1.5 rounded-full bg-blue-400 dark:bg-blue-500/80 transition-colors"
                        title={ev.title}
                      ></div>
                    ))}
                    {dayEvents.length > 3 && <div className="text-[9px] text-gray-400 leading-none font-bold">+ {dayEvents.length - 3}</div>}
                 </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  const renderNewsBoard = () => {
    return (
        <div className="animate-fade-in space-y-6">
            {!showNewsForm && (
                <div className="flex justify-center">
                    <button 
                        onClick={() => setShowNewsForm(true)}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg font-bold flex items-center space-x-2 hover:bg-indigo-700 transition active:scale-95"
                    >
                        <Plus size={20} /> <span>Neuigkeit erstellen</span>
                    </button>
                </div>
            )}

            {showNewsForm && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 animate-slide-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 dark:text-white">Neue Pinnwand-Notiz</h3>
                        <button onClick={() => setShowNewsForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    <form onSubmit={submitNews} className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Titel (z.B. Unser Urlaub)"
                            value={newsTitle}
                            onChange={(e) => setNewsTitle(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                        <textarea 
                            placeholder="Beschreibung..."
                            value={newsDesc}
                            onChange={(e) => setNewsDesc(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            rows={3}
                        />
                         <div className="relative">
                            <Hash size={16} className="absolute left-3 top-3.5 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Tag (optional, z.B. #Sommer)"
                                value={newsTag}
                                onChange={(e) => setNewsTag(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 pl-9 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Image Selection */}
                        <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                             <div className="flex gap-2 mb-2">
                                 <button type="button" onClick={() => setImageMode('upload')} className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${imageMode === 'upload' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}>Foto hochladen</button>
                                 <button type="button" onClick={() => setImageMode('url')} className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${imageMode === 'url' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}>Bild URL</button>
                             </div>
                             
                             {imageMode === 'upload' ? (
                                 <div className="text-center py-2">
                                     <input type="file" ref={newsFileInputRef} onChange={handleNewsFileChange} accept="image/*" className="hidden" />
                                     {newsImage ? (
                                         <div className="relative inline-block">
                                             <img src={newsImage} className="h-32 rounded-lg shadow-sm" />
                                             <button type="button" onClick={() => setNewsImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
                                         </div>
                                     ) : (
                                         <button type="button" onClick={() => newsFileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full py-4 text-gray-400 hover:text-indigo-500 transition">
                                             {processingImage ? <Loader2 className="animate-spin mb-1" size={24}/> : <Camera size={24} className="mb-1"/>}
                                             <span className="text-xs">Tippen zum Auswählen</span>
                                         </button>
                                     )}
                                 </div>
                             ) : (
                                 <input 
                                    type="text"
                                    placeholder="https://..."
                                    value={newsImageUrlInput}
                                    onChange={(e) => setNewsImageUrlInput(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-xs"
                                 />
                             )}
                        </div>

                        <button 
                            type="submit"
                            disabled={!newsTitle.trim() || processingImage}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition disabled:opacity-50"
                        >
                            Veröffentlichen
                        </button>
                    </form>
                </div>
            )}

            <div className="grid gap-4">
                {news.length === 0 && !showNewsForm && (
                    <div className="text-center py-10 opacity-50">
                        <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500">Die Pinnwand ist leer.</p>
                    </div>
                )}
                {news.map(item => {
                    const author = family.find(f => f.id === item.authorId);
                    return (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group">
                            {item.image && (
                                <div className="h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
                                    <img src={item.image} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" alt="News" />
                                </div>
                            )}
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        {item.tag && <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md mb-2 inline-block">{item.tag}</span>}
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{item.title}</h3>
                                    </div>
                                    <button onClick={() => onDeleteNews(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                </div>
                                
                                {item.description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line">{item.description}</p>}
                                
                                <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-700">
                                    <div className="flex items-center space-x-2">
                                        {author ? (
                                            <>
                                                <img src={author.avatar} className="w-6 h-6 rounded-full" />
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{author.name}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400">Unbekannt</span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <>
      <Header title="FamilienHub" currentUser={currentUser} onProfileClick={onProfileClick} />
      
      {/* Tabs */}
      <div className="px-4 mt-2 mb-2">
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all ${activeTab === 'calendar' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <CalendarIcon size={14} /> <span>Termine</span>
          </button>
          <button 
            onClick={() => setActiveTab('news')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all ${activeTab === 'news' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Layout size={14} /> <span>Pinnwand</span>
          </button>
        </div>
      </div>

      {activeTab === 'calendar' && (
          <div className="px-4 mb-2 flex justify-center">
               <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                    <button 
                        onClick={() => setCalendarView('family')}
                        className={`flex items-center px-4 py-1.5 rounded-md text-xs font-bold transition space-x-1 ${calendarView === 'family' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <Users size={12} className="mr-1"/> Familie
                    </button>
                    <button 
                        onClick={() => setCalendarView('private')}
                        className={`flex items-center px-4 py-1.5 rounded-md text-xs font-bold transition space-x-1 ${calendarView === 'private' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <User size={12} className="mr-1"/> Privat
                    </button>
               </div>
          </div>
      )}

      <div className="p-4 pb-24 relative min-h-[calc(100vh-140px)]">
        
        {activeTab === 'calendar' && renderMonthView()}
        {activeTab === 'news' && renderNewsBoard()}

        {/* --- DAY DETAIL / ADD MODAL (Only for Calendar) --- */}
        {selectedDate && activeTab === 'calendar' && (
           <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={closeModal}></div>
              <div className="bg-white dark:bg-gray-800 w-full max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl pointer-events-auto transform transition-transform duration-300 max-h-[85vh] flex flex-col animate-slide-up">
                  <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-2xl flex-shrink-0">
                      <div>
                          {isFormOpen ? (
                              <button onClick={() => setIsFormOpen(false)} className="flex items-center text-blue-600 text-sm font-bold hover:bg-blue-50 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition">
                                  <ChevronLeft size={16} className="mr-1"/> Zurück
                              </button>
                          ) : (
                              <h3 className="text-lg font-bold text-gray-800 dark:text-white capitalize">
                                  {new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </h3>
                          )}
                      </div>
                      <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      {!isFormOpen ? (
                          <div className="space-y-4">
                              {(groupedEvents[selectedDate] || []).length === 0 ? (
                                  <div className="text-center py-12 flex flex-col items-center">
                                      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-3">
                                          <CalendarIcon className="w-8 h-8 text-gray-400" />
                                      </div>
                                      <p className="text-gray-500 dark:text-gray-400 font-medium">Nichts geplant.</p>
                                      <p className="text-xs text-gray-400 mt-1">Tippe auf "+", um einen Termin zu erstellen.</p>
                                  </div>
                              ) : (
                                  (groupedEvents[selectedDate] || []).map(event => (
                                      <div key={event.id} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border-l-4 border-blue-500 relative group shadow-sm hover:shadow-md transition-all">
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-800 dark:text-white text-base">{event.title}</h4>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                                                    <Clock size={14} className="mr-1.5 text-blue-500"/> {event.time} - {event.endTime}
                                                </div>
                                                {event.location && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center">
                                                        <MapPin size={14} className="mr-1.5 text-red-500"/> {event.location}
                                                    </div>
                                                )}
                                                {event.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700">{event.description}</p>}
                                            </div>
                                            <button onClick={() => handleEditEvent(event)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                                                <Edit2 size={18} />
                                            </button>
                                          </div>
                                          <div className="flex -space-x-2 mt-3 pl-1">
                                              {event.assignedTo.map(uid => {
                                                  const mem = family.find(f => f.id === uid);
                                                  return mem ? (
                                                      <div key={uid} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white dark:ring-gray-800 shadow-sm ${mem.color.split(' ')[0].replace('bg-', 'bg-')}`}>{mem.name[0]}</div>
                                                  ) : null;
                                              })}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      ) : (
                          <form id="eventForm" onSubmit={handleManualSubmit} className="space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Titel</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Was steht an?"
                                        value={manualTitle}
                                        onChange={(e) => setManualTitle(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3.5 text-base text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Start</label>
                                        <input 
                                            type="time" 
                                            required
                                            value={manualStartTime}
                                            onChange={(e) => setManualStartTime(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-base text-gray-800 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Ende</label>
                                        <input 
                                            type="time" 
                                            required
                                            value={manualEndTime}
                                            onChange={(e) => setManualEndTime(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-base text-gray-800 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Ort</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Wo findet es statt?"
                                            value={manualLocation}
                                            onChange={(e) => setManualLocation(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 pl-10 text-base text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Notizen</label>
                                    <textarea 
                                        placeholder="Details..."
                                        value={manualDescription}
                                        onChange={(e) => setManualDescription(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-800 dark:text-white outline-none resize-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Teilnehmer</label>
                                     <div className="flex flex-wrap gap-2">
                                         {family.map(mem => (
                                             <button
                                                key={mem.id}
                                                type="button"
                                                onClick={() => toggleAssignee(mem.id)}
                                                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${manualAssignedTo.includes(mem.id) ? `${mem.color} border-transparent ring-2 ring-offset-1 ring-blue-100` : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 opacity-60'}`}
                                             >
                                                <img src={mem.avatar} className="w-5 h-5 rounded-full" />
                                                <span>{mem.name}</span>
                                             </button>
                                         ))}
                                     </div>
                                </div>
                          </form>
                      )}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-b-2xl flex-shrink-0">
                      {!isFormOpen ? (
                          <button onClick={openAddFormInModal} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition flex items-center justify-center hover:bg-blue-700">
                              <Plus size={20} className="mr-2"/> Termin hinzufügen
                          </button>
                      ) : (
                          <div className="flex space-x-3">
                              {editingEventId && (
                                  <button type="button" onClick={handleDelete} className="bg-red-50 dark:bg-red-900/20 text-red-500 p-3.5 rounded-xl hover:bg-red-100 transition">
                                      <Trash2 size={22} />
                                  </button>
                              )}
                              <button type="submit" form="eventForm" className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition hover:bg-blue-700">
                                  {editingEventId ? 'Speichern' : 'Erstellen'}
                              </button>
                          </div>
                      )}
                  </div>
              </div>
           </div>
        )}

      </div>
    </>
  );
};

export default CalendarPage;