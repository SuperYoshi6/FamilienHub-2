import React, { useState, useEffect } from 'react';
import { AppRoute, FamilyMember, CalendarEvent, ShoppingItem, MealPlan, Task, MealRequest, SavedLocation, Recipe } from './types';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import ListsPage from './pages/ListsPage';
import MealsPage from './pages/MealsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import SettingsPage from './pages/SettingsPage';
import WeatherPage from './pages/WeatherPage';
import Logo from './components/Logo';
import { Lock, X } from 'lucide-react';
import { t, Language } from './services/translations';

// Initial Data Fallback
const INITIAL_FAMILY: FamilyMember[] = [
  { id: '1', name: 'Mama', avatar: 'https://picsum.photos/100/100?random=1', color: 'bg-pink-100 text-pink-700', role: 'parent' },
  { id: '2', name: 'Papa', avatar: 'https://picsum.photos/100/100?random=2', color: 'bg-blue-100 text-blue-700', role: 'parent' },
  { id: '3', name: 'Leo', avatar: 'https://picsum.photos/100/100?random=3', color: 'bg-green-100 text-green-700', role: 'child' },
  { id: '4', name: 'Mia', avatar: 'https://picsum.photos/100/100?random=4', color: 'bg-yellow-100 text-yellow-700', role: 'child' },
];

const useStickyState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (e) {
      console.error("Error reading from localStorage", e);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
         alert("Speicher voll!");
      }
    }
  }, [key, value]);
  
  return [value, setValue];
};

const App: React.FC = () => {
  // Persistent State
  const [family, setFamily] = useStickyState<FamilyMember[]>('fh_family', INITIAL_FAMILY);
  const [events, setEvents] = useStickyState<CalendarEvent[]>('fh_events', [
    { id: '1', title: 'Fußballtraining Leo', date: new Date().toISOString().split('T')[0], time: '17:00', endTime: '18:30', assignedTo: ['3'], location: 'Sportplatz', description: 'Mitnehmen: Wasserflasche' },
  ]);
  const [shoppingList, setShoppingList] = useStickyState<ShoppingItem[]>('fh_shopping', [
    { id: '1', name: 'Milch', checked: false },
    { id: '2', name: 'Brot', checked: true },
  ]);
  
  const [householdTasks, setHouseholdTasks] = useStickyState<Task[]>('fh_household', [
    { id: '101', title: 'Müll rausbringen', done: false, assignedTo: '3', type: 'household' },
  ]);
  const [personalTasks, setPersonalTasks] = useStickyState<Task[]>('fh_personal', []);
  const [mealPlan, setMealPlan] = useStickyState<MealPlan[]>('fh_mealPlan', []);
  const [mealRequests, setMealRequests] = useStickyState<MealRequest[]>('fh_mealRequests', []);
  const [weatherFavorites, setWeatherFavorites] = useStickyState<SavedLocation[]>('fh_weather_favs', []);
  const [recipes, setRecipes] = useStickyState<Recipe[]>('fh_recipes', []);
  
  // Settings
  const [darkMode, setDarkMode] = useStickyState<boolean>('fh_darkmode', false);
  const [language, setLanguage] = useStickyState<Language>('fh_language', 'de');

  // Session State
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.DASHBOARD);

  // Login Logic State
  const [loginStep, setLoginStep] = useState<'select' | 'enter-pass' | 'set-pass'>('select');
  const [loginUser, setLoginUser] = useState<FamilyMember | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Apply Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Handlers ---
  const addEvent = (event: CalendarEvent) => setEvents([...events, event]);
  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => setEvents(events.map(e => e.id === id ? { ...e, ...updates } : e));
  const deleteEvent = (id: string) => setEvents(events.filter(e => e.id !== id));
  
  const toggleShoppingItem = (id: string) => setShoppingList(shoppingList.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  const addShoppingItem = (name: string) => setShoppingList([...shoppingList, { id: Date.now().toString(), name, checked: false }]);
  const deleteShoppingItem = (id: string) => setShoppingList(shoppingList.filter(item => item.id !== id));
  
  const addIngredientsToShopping = (ingredients: string[]) => {
      const newItems = ingredients.map(ing => ({ id: Date.now().toString() + Math.random(), name: ing, checked: false }));
      setShoppingList([...shoppingList, ...newItems]);
  };

  const addHouseholdTask = (title: string, assignedTo: string) => setHouseholdTasks([...householdTasks, { id: Date.now().toString(), title, done: false, assignedTo, type: 'household' }]);
  const addPersonalTask = (title: string) => setPersonalTasks([...personalTasks, { id: Date.now().toString(), title, done: false, type: 'personal' }]);
  const toggleTask = (id: string, type: 'household' | 'personal') => {
    if (type === 'household') setHouseholdTasks(householdTasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    else setPersonalTasks(personalTasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };
  const deleteTask = (id: string, type: 'household' | 'personal') => {
      if (type === 'household') setHouseholdTasks(householdTasks.filter(t => t.id !== id));
      else setPersonalTasks(personalTasks.filter(t => t.id !== id));
  };

  const updateMealPlan = (plan: MealPlan[]) => setMealPlan(plan);
  const addMealToPlan = (day: string, mealName: string, ingredients: string[]) => {
      const filtered = mealPlan.filter(m => m.day !== day);
      setMealPlan([...filtered, { id: Date.now().toString(), day, mealName, ingredients, recipeHint: 'Aus Rezeptlager' }]);
  };
  const addMealRequest = (dishName: string) => currentUser && setMealRequests([...mealRequests, { id: Date.now().toString(), dishName, requestedBy: currentUser.id, createdAt: new Date().toISOString() }]);
  const deleteMealRequest = (id: string) => setMealRequests(mealRequests.filter(r => r.id !== id));
  const addRecipe = (recipe: Recipe) => setRecipes([...recipes, recipe]);
  const deleteRecipe = (id: string) => setRecipes(recipes.filter(r => r.id !== id));

  const updateFamilyMember = (id: string, updates: Partial<FamilyMember>) => {
    const newFamily = family.map(member => member.id === id ? { ...member, ...updates } : member);
    setFamily(newFamily);
    if (currentUser && currentUser.id === id) setCurrentUser({ ...currentUser, ...updates });
  };

  // Password Reset Logic for Parent
  const resetMemberPassword = (id: string) => {
      // For simplicity, just clearing the password so they can set a new one
      const newFamily = family.map(member => member.id === id ? { ...member, password: undefined } : member);
      setFamily(newFamily);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRoute(AppRoute.DASHBOARD);
    setLoginStep('select');
    setLoginUser(null);
    setPasswordInput('');
  };

  const toggleWeatherFavorite = (location: SavedLocation) => {
      const exists = weatherFavorites.find(f => f.name === location.name);
      if (exists) setWeatherFavorites(weatherFavorites.filter(f => f.name !== location.name));
      else setWeatherFavorites([...weatherFavorites, location]);
  };

  // --- Login Logic ---
  const handleUserSelect = (member: FamilyMember) => {
      setLoginUser(member);
      setPasswordInput('');
      setLoginError('');
      if (member.password) setLoginStep('enter-pass');
      else setLoginStep('set-pass');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginUser || !passwordInput.trim()) return;

      if (loginStep === 'set-pass') {
          updateFamilyMember(loginUser.id, { password: passwordInput });
          setCurrentUser({ ...loginUser, password: passwordInput });
      } else {
          if (passwordInput === loginUser.password) setCurrentUser(loginUser);
          else setLoginError(t('login.wrong_pass', language));
      }
  };

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors relative">
        <div className="text-center mb-12 animate-fade-in flex flex-col items-center">
           <Logo size={100} className="mb-6 shadow-xl rounded-[25px]" />
           <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">FamilienHub</h1>
           <p className="text-gray-500 dark:text-gray-400">{t('login.welcome', language)}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-6 w-full max-w-sm animate-slide-in">
          {family.map(member => (
            <button 
              key={member.id}
              onClick={() => handleUserSelect(member)}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center hover:scale-105 active:scale-95 transition-all group relative"
            >
              <img src={member.avatar} alt={member.name} className="w-20 h-20 rounded-full mb-4 object-cover ring-4 ring-gray-50 dark:ring-gray-700 shadow-sm group-hover:ring-blue-100 dark:group-hover:ring-blue-900 transition" />
              <span className="font-bold text-lg text-gray-800 dark:text-gray-200">{member.name}</span>
              {member.password && (
                  <div className="absolute top-3 right-3 text-gray-300 dark:text-gray-600">
                      <Lock size={16} />
                  </div>
              )}
            </button>
          ))}
        </div>

        {/* Password Modal */}
        {(loginStep === 'enter-pass' || loginStep === 'set-pass') && loginUser && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs p-6 relative animate-slide-in">
                    <button 
                        onClick={() => { setLoginStep('select'); setLoginUser(null); }}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                    
                    <div className="flex flex-col items-center mb-6">
                        <img src={loginUser.avatar} className="w-16 h-16 rounded-full mb-3 ring-4 ring-gray-100 dark:ring-gray-700" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('login.hello', language)} {loginUser.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {loginStep === 'set-pass' ? t('login.create_pass', language) : t('login.enter_pass', language)}
                        </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit}>
                        <input 
                            type="password"
                            autoFocus
                            value={passwordInput}
                            onChange={(e) => { setPasswordInput(e.target.value); setLoginError(''); }}
                            placeholder={loginStep === 'set-pass' ? t('login.new_pass_placeholder', language) : t('login.pass_placeholder', language)}
                            className={`w-full bg-gray-50 dark:bg-gray-700 border ${loginError ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-xl px-4 py-3 text-center text-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                        {loginError && <p className="text-red-500 text-xs text-center mb-4 font-bold">{loginError}</p>}
                        
                        <button 
                            type="submit"
                            disabled={!passwordInput.trim()}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition disabled:opacity-50"
                        >
                            {loginStep === 'set-pass' ? t('login.set_pass_btn', language) : t('login.login_btn', language)}
                        </button>
                    </form>
                    <div className="mt-4 flex justify-center space-x-2">
                        <button onClick={() => setLanguage('de')} className={`text-xs font-bold px-2 py-1 rounded ${language === 'de' ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-400'}`}>DE</button>
                        <button onClick={() => setLanguage('en')} className={`text-xs font-bold px-2 py-1 rounded ${language === 'en' ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white' : 'text-gray-400'}`}>EN</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  const myOpenTaskCount = householdTasks.filter(t => t.assignedTo === currentUser.id && !t.done).length + personalTasks.filter(t => !t.done).length;

  const renderPage = () => {
    // Dynamic Page Content with Key for Transition
    const content = () => {
        switch (currentRoute) {
            case AppRoute.DASHBOARD:
              return <Dashboard family={family} currentUser={currentUser} events={events} shoppingCount={shoppingList.filter(i => !i.checked).length} openTaskCount={myOpenTaskCount} todayMeal={mealPlan[0]} onNavigate={setCurrentRoute} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} lang={language} />;
            case AppRoute.CALENDAR:
              return <CalendarPage events={events} family={family} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} currentUser={currentUser} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.LISTS:
              return <ListsPage shoppingItems={shoppingList} householdTasks={householdTasks} personalTasks={personalTasks} recipes={recipes} family={family} currentUser={currentUser} onToggleShopping={toggleShoppingItem} onAddShopping={addShoppingItem} onDeleteShopping={deleteShoppingItem} onAddHousehold={addHouseholdTask} onToggleTask={toggleTask} onAddPersonal={addPersonalTask} onDeleteTask={deleteTask} onAddRecipe={addRecipe} onDeleteRecipe={deleteRecipe} onAddIngredientsToShopping={addIngredientsToShopping} onAddMealToPlan={addMealToPlan} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.MEALS:
              return <MealsPage plan={mealPlan} requests={mealRequests} family={family} currentUser={currentUser} onUpdatePlan={updateMealPlan} onAddRequest={addMealRequest} onDeleteRequest={deleteMealRequest} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.ACTIVITIES:
              return <ActivitiesPage onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.WEATHER:
              return <WeatherPage onBack={() => setCurrentRoute(AppRoute.DASHBOARD)} favorites={weatherFavorites} onToggleFavorite={toggleWeatherFavorite} />;
            case AppRoute.SETTINGS:
              return <SettingsPage currentUser={currentUser} onUpdateUser={(updates) => updateFamilyMember(currentUser.id, updates)} onLogout={handleLogout} onClose={() => setCurrentRoute(AppRoute.DASHBOARD)} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} lang={language} setLang={setLanguage} family={family} onResetPassword={resetMemberPassword} />;
            default:
              return null;
          }
    };

    return (
        <div key={currentRoute} className="page-transition-wrapper">
            {content()}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-300 overflow-x-hidden">
      {renderPage()}
      <Navigation currentRoute={currentRoute} onNavigate={setCurrentRoute} lang={language} />
    </div>
  );
};

export default App;