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
import { Lock, X, Loader2, ArrowRight } from 'lucide-react';
import { t, Language } from './services/translations';
import { Backend } from './services/backend';

// Helper for local settings (Darkmode/Language) - keep this synchronous/local for best UX
const useLocalSetting = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  return [value, setValue];
};

const App: React.FC = () => {
  // --- Data State (Managed by Backend) ---
  const [loadingData, setLoadingData] = useState(true);
  
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [householdTasks, setHouseholdTasks] = useState<Task[]>([]);
  const [personalTasks, setPersonalTasks] = useState<Task[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [mealRequests, setMealRequests] = useState<MealRequest[]>([]);
  const [weatherFavorites, setWeatherFavorites] = useState<SavedLocation[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  // --- Local Settings ---
  const [darkMode, setDarkMode] = useLocalSetting<boolean>('fh_darkmode', false);
  const [language, setLanguage] = useLocalSetting<Language>('fh_language', 'de');

  // --- Session State ---
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.DASHBOARD);

  // Login Logic State
  const [loginStep, setLoginStep] = useState<'select' | 'enter-pass' | 'set-pass'>('select');
  const [loginUser, setLoginUser] = useState<FamilyMember | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Setup State (for fresh DB)
  const [newMemberName, setNewMemberName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Initial Data Load
  useEffect(() => {
      const loadAll = async () => {
          try {
              const [fam, ev, shop, house, pers, meals, reqs, weath, rec] = await Promise.all([
                  Backend.family.getAll(),
                  Backend.events.getAll(),
                  Backend.shopping.getAll(),
                  Backend.householdTasks.getAll(),
                  Backend.personalTasks.getAll(),
                  Backend.mealPlan.getAll(),
                  Backend.mealRequests.getAll(),
                  Backend.weatherFavorites.getAll(),
                  Backend.recipes.getAll()
              ]);
              
              setFamily(fam);
              setEvents(ev);
              setShoppingList(shop);
              setHouseholdTasks(house);
              setPersonalTasks(pers);
              setMealPlan(meals);
              setMealRequests(reqs);
              setWeatherFavorites(weath);
              setRecipes(rec);
          } catch (e) {
              console.error("Failed to load backend data", e);
          } finally {
              setLoadingData(false);
          }
      };
      loadAll();
  }, []);

  // Apply Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Handlers (Optimistic Updates + Backend Sync) ---
  
  const addEvent = async (event: CalendarEvent) => {
      setEvents(prev => [...prev, event]); // Optimistic
      await Backend.events.add(event);
  };
  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      await Backend.events.update(id, updates);
  };
  const deleteEvent = async (id: string) => {
      setEvents(prev => prev.filter(e => e.id !== id));
      await Backend.events.delete(id);
  };
  
  const toggleShoppingItem = async (id: string) => {
      const item = shoppingList.find(i => i.id === id);
      if (item) {
          const newItem = { ...item, checked: !item.checked };
          setShoppingList(prev => prev.map(i => i.id === id ? newItem : i));
          await Backend.shopping.update(id, { checked: newItem.checked });
      }
  };
  const addShoppingItem = async (name: string) => {
      const newItem = { id: Date.now().toString(), name, checked: false };
      setShoppingList(prev => [...prev, newItem]);
      await Backend.shopping.add(newItem);
  };
  const deleteShoppingItem = async (id: string) => {
      setShoppingList(prev => prev.filter(i => i.id !== id));
      await Backend.shopping.delete(id);
  };
  const addIngredientsToShopping = async (ingredients: string[]) => {
      const newItems = ingredients.map(ing => ({ id: Date.now().toString() + Math.random(), name: ing, checked: false }));
      setShoppingList(prev => [...prev, ...newItems]);
      const fullList = await Backend.shopping.getAll();
      await Backend.shopping.setAll([...fullList, ...newItems]);
  };

  const addHouseholdTask = async (title: string, assignedTo: string) => {
      const task: Task = { id: Date.now().toString(), title, done: false, assignedTo, type: 'household' };
      setHouseholdTasks(prev => [...prev, task]);
      await Backend.householdTasks.add(task);
  };
  const addPersonalTask = async (title: string) => {
      const task: Task = { id: Date.now().toString(), title, done: false, type: 'personal' };
      setPersonalTasks(prev => [...prev, task]);
      await Backend.personalTasks.add(task);
  };
  const toggleTask = async (id: string, type: 'household' | 'personal') => {
      if (type === 'household') {
          const task = householdTasks.find(t => t.id === id);
          if (task) {
              setHouseholdTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
              await Backend.householdTasks.update(id, { done: !task.done });
          }
      } else {
          const task = personalTasks.find(t => t.id === id);
          if (task) {
              setPersonalTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
              await Backend.personalTasks.update(id, { done: !task.done });
          }
      }
  };
  const deleteTask = async (id: string, type: 'household' | 'personal') => {
      if (type === 'household') {
          setHouseholdTasks(prev => prev.filter(t => t.id !== id));
          await Backend.householdTasks.delete(id);
      } else {
          setPersonalTasks(prev => prev.filter(t => t.id !== id));
          await Backend.personalTasks.delete(id);
      }
  };

  const updateMealPlan = async (plan: MealPlan[]) => {
      setMealPlan(plan);
      await Backend.mealPlan.setAll(plan);
  };
  const addMealToPlan = async (day: string, mealName: string, ingredients: string[]) => {
      const filtered = mealPlan.filter(m => m.day !== day);
      const newMeal = { id: Date.now().toString(), day, mealName, ingredients, recipeHint: 'Aus Rezeptlager' };
      const newPlan = [...filtered, newMeal];
      setMealPlan(newPlan);
      await Backend.mealPlan.setAll(newPlan);
  };
  const addMealRequest = async (dishName: string) => {
      if (currentUser) {
          const req: MealRequest = { id: Date.now().toString(), dishName, requestedBy: currentUser.id, createdAt: new Date().toISOString() };
          setMealRequests(prev => [...prev, req]);
          await Backend.mealRequests.add(req);
      }
  };
  const deleteMealRequest = async (id: string) => {
      setMealRequests(prev => prev.filter(r => r.id !== id));
      await Backend.mealRequests.delete(id);
  };
  const addRecipe = async (recipe: Recipe) => {
      setRecipes(prev => [...prev, recipe]);
      await Backend.recipes.add(recipe);
  };
  const deleteRecipe = async (id: string) => {
      setRecipes(prev => prev.filter(r => r.id !== id));
      await Backend.recipes.delete(id);
  };

  const updateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
    setFamily(prev => prev.map(member => member.id === id ? { ...member, ...updates } : member));
    if (currentUser && currentUser.id === id) setCurrentUser({ ...currentUser, ...updates });
    await Backend.family.update(id, updates);
  };

  const resetMemberPassword = async (id: string) => {
      const updates = { password: undefined };
      setFamily(prev => prev.map(member => member.id === id ? { ...member, ...updates } : member));
      await Backend.family.update(id, updates);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRoute(AppRoute.DASHBOARD);
    setLoginStep('select');
    setLoginUser(null);
    setPasswordInput('');
  };

  const toggleWeatherFavorite = async (location: SavedLocation) => {
      const exists = weatherFavorites.find(f => f.name === location.name);
      if (exists) {
          setWeatherFavorites(prev => prev.filter(f => f.name !== location.name));
          await Backend.weatherFavorites.delete(exists.id);
      } else {
          setWeatherFavorites(prev => [...prev, location]);
          await Backend.weatherFavorites.add(location);
      }
  };

  // --- Login & Setup Logic ---
  const handleUserSelect = (member: FamilyMember) => {
      setLoginUser(member);
      setPasswordInput('');
      setLoginError('');
      if (member.password) setLoginStep('enter-pass');
      else setLoginStep('set-pass');
  };

  const handleCreateFirstMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemberName.trim()) return;
      setCreatingUser(true);

      const randomId = Math.floor(Math.random() * 1000);
      const newMember: FamilyMember = {
          id: Date.now().toString(),
          name: newMemberName.trim(),
          avatar: `https://picsum.photos/200/200?random=${randomId}`,
          color: 'bg-blue-100 text-blue-700',
          role: 'parent'
      };

      try {
          await Backend.family.add(newMember);
          const updatedFamily = await Backend.family.getAll();
          setFamily(updatedFamily);
          // Auto login new user
          const createdUser = updatedFamily.find(u => u.id === newMember.id) || newMember;
          setCurrentUser(createdUser);
      } catch (err) {
          console.error("Setup failed", err);
      } finally {
          setCreatingUser(false);
      }
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

  // Initial Loading Screen
  if (loadingData) {
      return (
          <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
              <Logo size={80} className="animate-pulse mb-4" />
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="mt-4 text-gray-500 font-medium">Lade Familiendaten...</p>
          </div>
      );
  }

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors relative">
        <div className="text-center mb-12 animate-fade-in flex flex-col items-center">
           <Logo size={100} className="mb-6 shadow-xl rounded-[25px]" />
           <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">FamilienHub</h1>
           <p className="text-gray-500 dark:text-gray-400">{t('login.welcome', language)}</p>
        </div>
        
        {family.length > 0 ? (
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
        ) : (
            // Empty State / Setup View
            <div className="w-full max-w-xs animate-fade-in">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Neu hier?</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Erstelle das erste Profil für deine Familie.</p>
                    <form onSubmit={handleCreateFirstMember}>
                        <input 
                            type="text"
                            placeholder="Dein Name (z.B. Mama)"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-center text-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            autoFocus
                        />
                        <button 
                            type="submit"
                            disabled={!newMemberName.trim() || creatingUser}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition disabled:opacity-50 flex justify-center items-center"
                        >
                            {creatingUser ? <Loader2 className="animate-spin" size={20}/> : <span className="flex items-center">Los geht's <ArrowRight size={18} className="ml-2"/></span>}
                        </button>
                    </form>
                </div>
            </div>
        )}

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