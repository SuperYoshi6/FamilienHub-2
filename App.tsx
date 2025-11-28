import React, { useState, useEffect } from 'react';
import { AppRoute, FamilyMember, CalendarEvent, ShoppingItem, MealPlan, Task, MealRequest, SavedLocation, Recipe, NewsItem, TaskPriority, FeedbackItem } from './types';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/CalendarPage';
import ListsPage from './pages/ListsPage';
import MealsPage from './pages/MealsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import SettingsPage from './pages/SettingsPage';
import WeatherPage from './pages/WeatherPage';
import Logo from './components/Logo';
import { Lock, X, Loader2, ArrowRight, UserPlus, Users } from 'lucide-react';
import { t, Language } from './services/translations';
import { Backend } from './services/backend';

// Helper for local settings (Darkmode) - Language is now hardcoded DE
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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [householdTasks, setHouseholdTasks] = useState<Task[]>([]);
  const [personalTasks, setPersonalTasks] = useState<Task[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [mealRequests, setMealRequests] = useState<MealRequest[]>([]);
  const [weatherFavorites, setWeatherFavorites] = useState<SavedLocation[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  
  // --- Local Settings ---
  const [darkMode, setDarkMode] = useLocalSetting<boolean>('fh_darkmode', false);
  const language: Language = 'de'; // Hardcode German

  // --- Session State ---
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.DASHBOARD);

  // --- Global Weather State (Persist across navigation) ---
  const [currentWeatherLocation, setCurrentWeatherLocation] = useState<{lat: number, lng: number, name: string} | null>(null);

  // Login Logic State
  const [loginStep, setLoginStep] = useState<'select' | 'enter-pass' | 'set-pass'>('select');
  const [loginUser, setLoginUser] = useState<FamilyMember | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Setup State (for fresh DB)
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'parent' | 'child'>('parent');
  const [creatingUser, setCreatingUser] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false); // For adding users when family exists

  // Initial Data Load
  useEffect(() => {
      const loadAll = async () => {
          try {
              const [fam, ev, newsData, shop, house, pers, meals, reqs, weath, rec, fbs] = await Promise.all([
                  Backend.family.getAll(),
                  Backend.events.getAll(),
                  Backend.news.getAll(),
                  Backend.shopping.getAll(),
                  Backend.householdTasks.getAll(),
                  Backend.personalTasks.getAll(),
                  Backend.mealPlan.getAll(),
                  Backend.mealRequests.getAll(),
                  Backend.weatherFavorites.getAll(),
                  Backend.recipes.getAll(),
                  Backend.feedback.getAll()
              ]);
              
              setFamily(fam);
              setEvents(ev);
              setNews(newsData);
              setShoppingList(shop);
              setHouseholdTasks(house);
              setPersonalTasks(pers);
              setMealPlan(meals);
              setMealRequests(reqs);
              setWeatherFavorites(weath);
              setRecipes(rec);
              setFeedbacks(fbs);
          } catch (e) {
              console.error("Failed to load backend data", e);
          } finally {
              setLoadingData(false);
          }
      };
      loadAll();
  }, []);

  // --- PERSISTENT SESSION RESTORE ---
  useEffect(() => {
      // Run this only when loading is done and we have family data
      if (!loadingData && family.length > 0 && !currentUser) {
          const storedUserId = localStorage.getItem('fh_session_user');
          if (storedUserId) {
              const foundUser = family.find(f => f.id === storedUserId);
              if (foundUser) {
                  setCurrentUser(foundUser);
              }
          }
      }
  }, [loadingData, family, currentUser]);

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

  const addNews = async (item: NewsItem) => {
      setNews(prev => [item, ...prev]);
      await Backend.news.add(item);
  };
  const deleteNews = async (id: string) => {
      setNews(prev => prev.filter(n => n.id !== id));
      await Backend.news.delete(id);
  };
  
  const toggleShoppingItem = async (id: string) => {
      const item = shoppingList.find(i => i.id === id);
      if (item) {
          const newItem = { ...item, checked: !item.checked };
          setShoppingList(prev => prev.map(i => i.id === id ? newItem : i));
          await Backend.shopping.update(id, { checked: newItem.checked });
      }
  };
  const addShoppingItem = async (name: string, note?: string) => {
      const newItem: ShoppingItem = { id: Date.now().toString(), name, checked: false, note };
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

  const addHouseholdTask = async (title: string, assignedTo: string, priority: TaskPriority = 'medium', note?: string) => {
      const task: Task = { id: Date.now().toString(), title, done: false, assignedTo, type: 'household', priority, note };
      setHouseholdTasks(prev => [...prev, task]);
      await Backend.householdTasks.add(task);
  };
  const addPersonalTask = async (title: string, priority: TaskPriority = 'medium', note?: string) => {
      const task: Task = { id: Date.now().toString(), title, done: false, type: 'personal', priority, note };
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
      // FIX: Reuse existing ID for the day if it exists to prevent churn/conflicts
      const existingMeal = mealPlan.find(m => m.day === day);
      const id = existingMeal ? existingMeal.id : Date.now().toString() + Math.random().toString().slice(2,5);

      const filtered = mealPlan.filter(m => m.day !== day);
      const newMeal: MealPlan = { 
          id, 
          day, 
          mealName, 
          ingredients, 
          recipeHint: 'Aus Rezeptlager',
          // Preserve manual entries if they exist
          breakfast: existingMeal?.breakfast || '',
          lunch: existingMeal?.lunch || ''
      };
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
  
  const addFeedback = async (item: FeedbackItem) => {
      setFeedbacks(prev => [...prev, item]);
      await Backend.feedback.add(item);
  };

  const markFeedbacksRead = async (ids: string[]) => {
      setFeedbacks(prev => prev.map(f => ids.includes(f.id) ? { ...f, read: true } : f));
      // Process updates sequentially to simple backend logic
      for (const id of ids) {
          await Backend.feedback.update(id, { read: true });
      }
  };

  const handleLogout = () => {
    localStorage.removeItem('fh_session_user'); // Clear session
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

  const handleCreateMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemberName.trim()) return;
      setCreatingUser(true);

      const randomId = Math.floor(Math.random() * 1000);
      const newMember: FamilyMember = {
          id: Date.now().toString(),
          name: newMemberName.trim(),
          avatar: `https://picsum.photos/200/200?random=${randomId}`,
          color: newMemberRole === 'parent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700',
          role: newMemberRole
      };

      try {
          await Backend.family.add(newMember);
          const updatedFamily = await Backend.family.getAll();
          setFamily(updatedFamily);
          
          if (!currentUser) {
              // Auto login if first user
              const createdUser = updatedFamily.find(u => u.id === newMember.id) || newMember;
              setCurrentUser(createdUser);
              localStorage.setItem('fh_session_user', createdUser.id);
          } else {
              setShowNewUserForm(false);
          }
          setNewMemberName('');
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
          localStorage.setItem('fh_session_user', loginUser.id);
      } else {
          if (passwordInput === loginUser.password) {
              setCurrentUser(loginUser);
              localStorage.setItem('fh_session_user', loginUser.id);
          }
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

  // --- REDESIGNED LOGIN SCREEN ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex flex-col items-center justify-center p-6 transition-colors relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="text-center mb-10 animate-fade-in flex flex-col items-center z-10">
           <div className="bg-white dark:bg-gray-800 p-4 rounded-[30px] shadow-xl mb-6 ring-1 ring-black/5 dark:ring-white/10">
               <Logo size={80} />
           </div>
           <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2 tracking-tight">FamilienHub</h1>
           <p className="text-gray-500 dark:text-gray-400 font-medium">{t('login.welcome', language)}</p>
        </div>
        
        {family.length > 0 && !showNewUserForm ? (
            <div className="w-full max-w-md z-10">
                <div className="grid grid-cols-2 gap-4 animate-slide-in">
                  {family.map(member => (
                    <button 
                      key={member.id}
                      onClick={() => handleUserSelect(member)}
                      className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center hover:scale-105 hover:shadow-md active:scale-95 transition-all group relative"
                    >
                      <div className="relative mb-3">
                          <img src={member.avatar} alt={member.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-700 group-hover:ring-blue-50 dark:group-hover:ring-blue-900/50 transition-all" />
                          {member.password && (
                              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-100 dark:border-gray-700 text-gray-400">
                                  <Lock size={12} />
                              </div>
                          )}
                      </div>
                      <span className="font-bold text-base text-gray-800 dark:text-gray-200">{member.name}</span>
                    </button>
                  ))}
                  
                  {/* Add User Button */}
                  <button 
                      onClick={() => setShowNewUserForm(true)}
                      className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center hover:bg-white dark:hover:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all group text-gray-400 hover:text-blue-500"
                  >
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                          <UserPlus size={24} />
                      </div>
                      <span className="font-bold text-sm">Neu</span>
                  </button>
                </div>
            </div>
        ) : (
            // Setup / New User Form
            <div className="w-full max-w-xs animate-fade-in z-10 relative">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700">
                    {family.length > 0 && (
                        <button onClick={() => setShowNewUserForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    )}
                    
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                            {family.length === 0 ? "Neu hier?" : "Neues Mitglied"}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {family.length === 0 ? "Erstelle das erste Profil für deine Familie." : "Füge jemanden zur Familie hinzu."}
                        </p>
                    </div>

                    <form onSubmit={handleCreateMember}>
                        <div className="mb-4">
                            <input 
                                type="text"
                                placeholder="Name (z.B. Mama)"
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-400 transition-all"
                                autoFocus
                            />
                        </div>

                        {/* Role Selection */}
                        <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setNewMemberRole('parent')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1 ${newMemberRole === 'parent' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                            >
                                <span>Elternteil</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewMemberRole('child')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1 ${newMemberRole === 'child' ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-300 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
                            >
                                <span>Kind</span>
                            </button>
                        </div>

                        <button 
                            type="submit"
                            disabled={!newMemberName.trim() || creatingUser}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 transition disabled:opacity-50 flex justify-center items-center"
                        >
                            {creatingUser ? <Loader2 className="animate-spin" size={20}/> : <span className="flex items-center">Erstellen <ArrowRight size={18} className="ml-2"/></span>}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Password Modal */}
        {(loginStep === 'enter-pass' || loginStep === 'set-pass') && loginUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xs p-8 relative animate-slide-up ring-1 ring-white/20">
                    <button 
                        onClick={() => { setLoginStep('select'); setLoginUser(null); }}
                        className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-700 rounded-full p-1 transition"
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative">
                            <img src={loginUser.avatar} className="w-20 h-20 rounded-full mb-4 ring-4 ring-white dark:ring-gray-700 shadow-md" />
                            <div className={`absolute bottom-4 right-0 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 ${loginUser.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">{t('login.hello', language)} {loginUser.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {loginStep === 'set-pass' ? t('login.create_pass', language) : t('login.enter_pass', language)}
                        </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit}>
                        <div className="relative">
                            <input 
                                type="password"
                                autoFocus
                                value={passwordInput}
                                onChange={(e) => { setPasswordInput(e.target.value); setLoginError(''); }}
                                placeholder={loginStep === 'set-pass' ? t('login.new_pass_placeholder', language) : t('login.pass_placeholder', language)}
                                className={`w-full bg-gray-50 dark:bg-gray-700 border ${loginError ? 'border-red-500 text-red-500' : 'border-gray-200 dark:border-gray-600'} rounded-2xl px-4 py-4 text-center text-xl tracking-widest mb-6 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all dark:text-white`}
                            />
                            {loginError && <div className="absolute -bottom-5 left-0 right-0 text-red-500 text-xs text-center font-bold animate-pulse">{loginError}</div>}
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={!passwordInput.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition disabled:opacity-50 disabled:shadow-none"
                        >
                            {loginStep === 'set-pass' ? t('login.set_pass_btn', language) : t('login.login_btn', language)}
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>
    );
  }

  const myOpenTaskCount = householdTasks.filter(t => t.assignedTo === currentUser.id && !t.done).length + personalTasks.filter(t => !t.done).length;

  // Filter regular family members for assignments (exclude Admin)
  const regularFamily = family.filter(f => f.role !== 'admin');

  const renderPage = () => {
    // Dynamic Page Content with Key for Transition
    const content = () => {
        switch (currentRoute) {
            case AppRoute.DASHBOARD:
              return <Dashboard 
                        family={regularFamily} 
                        currentUser={currentUser} 
                        events={events} 
                        shoppingCount={shoppingList.filter(i => !i.checked).length} 
                        openTaskCount={myOpenTaskCount} 
                        todayMeal={mealPlan[0]} 
                        onNavigate={setCurrentRoute} 
                        onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} 
                        lang={language} 
                        weatherFavorites={weatherFavorites}
                        currentWeatherLocation={currentWeatherLocation}
                        onUpdateWeatherLocation={setCurrentWeatherLocation}
                     />;
            case AppRoute.CALENDAR:
              return <CalendarPage events={events} news={news} family={regularFamily} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onAddNews={addNews} onDeleteNews={deleteNews} currentUser={currentUser} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.LISTS:
              return <ListsPage shoppingItems={shoppingList} householdTasks={householdTasks} personalTasks={personalTasks} recipes={recipes} family={regularFamily} currentUser={currentUser} onToggleShopping={toggleShoppingItem} onAddShopping={addShoppingItem} onDeleteShopping={deleteShoppingItem} onAddHousehold={addHouseholdTask} onToggleTask={toggleTask} onAddPersonal={addPersonalTask} onDeleteTask={deleteTask} onAddRecipe={addRecipe} onDeleteRecipe={deleteRecipe} onAddIngredientsToShopping={addIngredientsToShopping} onAddMealToPlan={addMealToPlan} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.MEALS:
              return <MealsPage plan={mealPlan} requests={mealRequests} family={regularFamily} currentUser={currentUser} onUpdatePlan={updateMealPlan} onAddRequest={addMealRequest} onDeleteRequest={deleteMealRequest} onAddIngredientsToShopping={addIngredientsToShopping} onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.ACTIVITIES:
              return <ActivitiesPage onProfileClick={() => setCurrentRoute(AppRoute.SETTINGS)} />;
            case AppRoute.WEATHER:
              return <WeatherPage onBack={() => setCurrentRoute(AppRoute.DASHBOARD)} favorites={weatherFavorites} onToggleFavorite={toggleWeatherFavorite} initialLocation={currentWeatherLocation} />;
            case AppRoute.SETTINGS:
              return <SettingsPage currentUser={currentUser} onUpdateUser={(updates) => updateFamilyMember(currentUser.id, updates)} onLogout={handleLogout} onClose={() => setCurrentRoute(AppRoute.DASHBOARD)} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} lang={language} setLang={() => {}} family={regularFamily} onResetPassword={resetMemberPassword} onSendFeedback={addFeedback} allFeedbacks={feedbacks} onMarkFeedbackRead={markFeedbacksRead} />;
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