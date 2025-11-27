import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { FamilyMember, CalendarEvent, MealPlan, AppRoute } from '../types';
import { Clock, ClipboardList, Utensils, ChevronRight, Sun, CheckCircle, CloudRain, Loader2, MapPinOff, Cloud, CloudSnow, CloudLightning, CloudFog, Moon } from 'lucide-react';
import { fetchWeather, getWeatherDescription } from '../services/weather';
import { t, Language } from '../services/translations';

interface DashboardProps {
  family: FamilyMember[];
  currentUser: FamilyMember;
  events: CalendarEvent[];
  shoppingCount: number;
  openTaskCount?: number;
  todayMeal?: MealPlan;
  onNavigate: (route: AppRoute) => void;
  onProfileClick: () => void;
  lang: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    family, currentUser, events, shoppingCount, openTaskCount = 0, todayMeal, onNavigate, onProfileClick, lang 
}) => {
  const today = new Date().toISOString().split('T')[0];
  const todaysEvents = events.filter(e => e.date === today).sort((a, b) => a.time.localeCompare(b.time));

  // Weather State
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [currentTemp, setCurrentTemp] = useState<string>('--');
  const [weatherDesc, setWeatherDesc] = useState<string>(t('dashboard.loading', lang));
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [isDay, setIsDay] = useState<number>(1);

  useEffect(() => {
    setWeatherDesc(t('dashboard.loading', lang));
    if (!navigator.geolocation) {
      setWeatherError(t('dashboard.location_error', lang));
      setWeatherLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const data = await fetchWeather(latitude, longitude);
        
        if (data) {
          setCurrentTemp(`${Math.round(data.current.temperature_2m)}°`);
          setWeatherDesc(getWeatherDescription(data.current.weather_code));
          setWeatherCode(data.current.weather_code);
          setIsDay(data.current.is_day);
          setWeatherError(null);
        } else {
          setWeatherError("Fehler");
        }
        setWeatherLoading(false);
      },
      (error) => {
        if (error.code === 1) {
            setWeatherError(t('dashboard.location_error', lang));
        } else {
            console.error("Geo error in Dashboard:", error.message);
            setWeatherError("Fehler");
        }
        setWeatherLoading(false);
      }
    );
  }, [lang]);

  // Determine Greeting Icon and Background based on Weather
  const getWeatherIcon = (code: number, day: number) => {
    if (code === 0) return day ? <Sun className="text-yellow-300 animate-spin-slow" size={48} /> : <Moon className="text-gray-200" size={48} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-gray-200" size={48} />;
    if (code >= 45 && code <= 48) return <CloudFog className="text-gray-300" size={48} />;
    if (code >= 51 && code <= 67) return <CloudRain className="text-blue-300" size={48} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-white" size={48} />;
    if (code >= 95) return <CloudLightning className="text-purple-300" size={48} />;
    return <Sun className="text-yellow-300" size={48} />;
  };

  const getWeatherGradient = (code: number, day: number) => {
      if (!day) return 'from-slate-800 to-indigo-900';
      if (code === 0) return 'from-blue-500 to-blue-400';
      if (code >= 1 && code <= 3) return 'from-blue-400 to-slate-400';
      if (code >= 51) return 'from-slate-500 to-gray-600';
      return 'from-blue-500 to-cyan-600';
  };

  return (
    <>
      <Header title="FamilienHub" currentUser={currentUser} onProfileClick={onProfileClick} />
      <main className="p-4 space-y-6">
        
        {/* Dynamic Greeting Section */}
        <div className={`bg-gradient-to-r ${getWeatherGradient(weatherCode, isDay)} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-colors duration-1000`}>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">{t('dashboard.greeting', lang)} {currentUser.name}!</h2>
              <p className="text-blue-50/80 text-sm font-medium mt-1">{t('dashboard.good_day', lang)}</p>
            </div>
            <div className="filter drop-shadow-md">
                {getWeatherIcon(weatherCode, isDay)}
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
        </div>

        {/* Weather Link Widget */}
        <button 
          onClick={() => onNavigate(AppRoute.WEATHER)}
          className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition"
        >
            {weatherLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 z-20 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            )}
            
            <div className="flex items-center space-x-4">
                {weatherError ? (
                   <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full"><MapPinOff className="text-gray-400" size={20} /></div>
                ) : (
                   <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full"><CloudRain className="text-blue-500" size={24} /></div>
                )}
                <div className="text-left">
                    <span className="text-2xl font-bold text-gray-800 dark:text-white block leading-none mb-1">
                      {weatherError ? '--' : currentTemp}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">
                      {weatherError ? weatherError : weatherDesc}
                    </span>
                </div>
            </div>
            <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                {t('dashboard.weather_details', lang)} <ChevronRight size={16} className="ml-1" />
            </div>
        </button>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Shopping */}
          <button 
            onClick={() => onNavigate(AppRoute.LISTS)}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start hover:bg-gray-50 dark:hover:bg-gray-750 transition"
          >
            <div className="flex justify-between w-full mb-2">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                    <ClipboardList size={20} />
                </div>
                {shoppingCount > 0 && <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full h-fit">{shoppingCount}</span>}
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t('dashboard.shopping_list', lang)}</span>
            <span className="text-xs text-gray-400 mt-0.5">{shoppingCount === 0 ? t('dashboard.all_done', lang) : `${shoppingCount} ${t('dashboard.items_open', lang)}`}</span>
          </button>

          {/* Meals */}
          <button 
            onClick={() => onNavigate(AppRoute.MEALS)}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-start hover:bg-gray-50 dark:hover:bg-gray-750 transition"
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400 mb-2">
              <Utensils size={20} />
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-1 w-full text-left">
              {todayMeal ? todayMeal.mealName : t('dashboard.nothing_planned', lang)}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">{t('dashboard.meal_plan', lang)}</span>
          </button>
        </div>
        
        {/* My Tasks Widget */}
        <button 
            onClick={() => onNavigate(AppRoute.LISTS)}
            className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition"
        >
            <div className="flex items-center space-x-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                    <CheckCircle size={20} />
                </div>
                <div className="text-left">
                    <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">{t('dashboard.my_tasks', lang)}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{openTaskCount === 0 ? t('dashboard.all_tasks_done', lang) : `${openTaskCount} ${t('dashboard.tasks_open', lang)}`}</span>
                </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
        </button>

        {/* Timeline */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('dashboard.appointments_today', lang)}</h3>
            <button 
              onClick={() => onNavigate(AppRoute.CALENDAR)}
              className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center"
            >
              {t('dashboard.all', lang)} <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            {todaysEvents.length > 0 ? (
              todaysEvents.map(event => (
                <div key={event.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{event.title}</h4>
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-1 space-x-2">
                      <span className="flex items-center"><Clock size={12} className="mr-1"/> {event.time}</span>
                      {event.location && <span>• {event.location}</span>}
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                     {event.assignedTo.map(uid => {
                        const member = family.find(f => f.id === uid);
                        return member ? (
                          <div key={uid} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white dark:ring-gray-800 ${member.color.split(' ')[0].replace('bg-', 'bg-')}`}>
                             {member.name[0]}
                          </div>
                        ) : null;
                     })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-400 text-sm">{t('dashboard.no_appointments', lang)}</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </>
  );
};

export default Dashboard;