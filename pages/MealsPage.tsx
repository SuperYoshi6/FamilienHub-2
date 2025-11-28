import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { MealPlan, MealRequest, FamilyMember, PlaceRecommendation } from '../types';
import { suggestMealPlan, suggestActivities } from '../services/gemini';
import { Sparkles, ChefHat, RefreshCcw, Utensils, MessageCircleHeart, Trash2, Plus, Store, Search, ExternalLink, Loader2, ShoppingCart, Edit3, Coffee, Sun, Moon, Save, X, Lock } from 'lucide-react';

interface MealsPageProps {
  plan: MealPlan[];
  requests: MealRequest[];
  family: FamilyMember[];
  currentUser: FamilyMember;
  onUpdatePlan: (plan: MealPlan[]) => void;
  onAddRequest: (dish: string) => void;
  onDeleteRequest: (id: string) => void;
  onAddIngredientsToShopping?: (ingredients: string[]) => void;
  onProfileClick: () => void;
}

type TabType = 'plan' | 'wishes' | 'places';

const MealsPage: React.FC<MealsPageProps> = ({ plan, requests, family, currentUser, onUpdatePlan, onAddRequest, onDeleteRequest, onAddIngredientsToShopping, onProfileClick }) => {
  const isChild = currentUser.role === 'child';
  
  // Default to wishes for children, otherwise plan
  const [activeTab, setActiveTab] = useState<TabType>(isChild ? 'wishes' : 'plan');
  
  // Plan State
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [preferences, setPreferences] = useState('');
  
  // Edit State
  const [editingDay, setEditingDay] = useState<string | null>(null);

  // Wish State
  const [newWish, setNewWish] = useState('');

  // Places State
  const [placeQuery, setPlaceQuery] = useState('Restaurants in der Nähe');
  const [placeResults, setPlaceResults] = useState<{ text: string; places: PlaceRecommendation[] } | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
            console.log("GPS Info (Essen): Nutze Standard-Standort.", err.message);
        }
      );
    }
  }, []);

  // Generate the current cycle starting from the MOST RECENT Friday (or today if it is Friday)
  // And shows 8 days (Friday to Friday inclusive)
  const getCurrentFridayCycle = () => {
      const days = [];
      const today = new Date();
      
      // Calculate days passed since last Friday
      // Sun=0, Mon=1, ..., Fri=5, Sat=6
      // If Today Fri(5) -> diff 0.
      // If Today Sat(6) -> diff 1.
      // If Today Sun(0) -> diff 2.
      // If Today Thu(4) -> diff 6.
      // Formula: (day + 2) % 7
      const daysSinceFriday = (today.getDay() + 2) % 7;
      
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysSinceFriday);

      // Generate 8 days (Fri -> Next Fri)
      for (let i = 0; i < 8; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          days.push({
              dateObj: d,
              dayName: d.toLocaleDateString('de-DE', { weekday: 'long' }),
              dateStr: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
              isToday: d.toDateString() === today.toDateString()
          });
      }
      return days;
  };

  const displayDays = getCurrentFridayCycle();

  const generatePlan = async () => {
    setLoadingPlan(true);
    // Suggest plan
    const newPlan = await suggestMealPlan(preferences);
    if (newPlan && newPlan.length > 0) {
       // Map the generated meals to our Friday-Friday cycle dates
       const mappedPlan = newPlan.slice(0, 8).map((item, index) => {
           if (index < displayDays.length) {
               return { ...item, day: displayDays[index].dayName }; // Force correct day name sync
           }
           return item;
       });

       onUpdatePlan(mappedPlan);
    }
    setLoadingPlan(false);
  };

  const handleWishSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newWish.trim()) {
          onAddRequest(newWish.trim());
          setNewWish('');
      }
  };

  const handlePlaceSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!placeQuery.trim()) return;
      setLoadingPlaces(true);
      const lat = location?.lat || 52.52;
      const lng = location?.lng || 13.40;
      const data = await suggestActivities(placeQuery, lat, lng);
      setPlaceResults(data);
      setLoadingPlaces(false);
  };

  const updateMealEntry = (dayName: string, field: 'breakfast' | 'lunch' | 'mealName', value: string) => {
      const existingMeal = plan.find(p => p.day === dayName);
      let newPlan = [...plan];

      if (existingMeal) {
          newPlan = newPlan.map(p => p.day === dayName ? { ...p, [field]: value } : p);
      } else {
          // Create new entry if missing for this day
          const newEntry: MealPlan = {
              id: Date.now().toString() + Math.random(),
              day: dayName,
              mealName: field === 'mealName' ? value : '',
              breakfast: field === 'breakfast' ? value : '',
              lunch: field === 'lunch' ? value : '',
              ingredients: [],
              recipeHint: 'Manuell hinzugefügt'
          };
          newPlan.push(newEntry);
      }
      onUpdatePlan(newPlan);
  };

  const renderPlan = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Generator Section - Admin/Parent Only */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <ChefHat size={28} />
            <h2 className="text-xl font-bold">Wochenplaner</h2>
          </div>
          <p className="text-emerald-50 text-sm mb-4">
            Lass dir von der KI einen Plan für die aktuelle Woche erstellen (Freitag bis Freitag).
          </p>
          <div className="space-y-3">
            <input 
              type="text" 
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="z.B. Vegetarisch, Italienisch..."
              className="w-full rounded-lg px-4 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <button 
              onClick={generatePlan}
              disabled={loadingPlan}
              className="w-full bg-white text-emerald-600 font-bold py-2 rounded-lg shadow flex items-center justify-center space-x-2 hover:bg-gray-50 disabled:opacity-70"
            >
              {loadingPlan ? (
                <RefreshCcw className="animate-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              <span>{loadingPlan ? 'Plane Woche...' : 'Plan erstellen'}</span>
            </button>
          </div>
        </div>

        {/* Plan List - Friday to Friday */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
              {displayDays[0].dateStr} bis {displayDays[7].dateStr} (8 Tage)
          </h3>
          
          {displayDays.map((dayObj, index) => {
            const meal = plan.find(p => p.day === dayObj.dayName);
            const isEditing = editingDay === dayObj.dayName;
            
            return (
                <div key={index} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden relative transition-all ${dayObj.isToday ? 'border-emerald-400 dark:border-emerald-500 ring-1 ring-emerald-400 dark:ring-emerald-500' : 'border-gray-100 dark:border-gray-700'}`}>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <span className="font-bold text-emerald-800 dark:text-emerald-300">{dayObj.dayName}</span>
                             {dayObj.isToday && <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Heute</span>}
                        </div>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">{dayObj.dateStr}</span>
                    </div>
                    
                    <div className="p-4 relative">
                        {/* Edit Toggle Button */}
                        <button 
                            onClick={() => setEditingDay(isEditing ? null : dayObj.dayName)}
                            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                        >
                            {isEditing ? <X size={18}/> : <Edit3 size={18} />}
                        </button>

                        {!isEditing ? (
                            // VIEW MODE
                            <div>
                                {meal && (meal.breakfast || meal.lunch || meal.mealName) ? (
                                    <div className="space-y-3">
                                        {meal.breakfast && (
                                            <div className="flex items-start text-sm">
                                                <Coffee size={14} className="mt-0.5 mr-2 text-orange-400" />
                                                <span className="text-gray-700 dark:text-gray-200">{meal.breakfast}</span>
                                            </div>
                                        )}
                                        {meal.lunch && (
                                            <div className="flex items-start text-sm">
                                                <Sun size={14} className="mt-0.5 mr-2 text-yellow-500" />
                                                <span className="text-gray-700 dark:text-gray-200">{meal.lunch}</span>
                                            </div>
                                        )}
                                        {meal.mealName && (
                                            <div>
                                                <div className="flex items-start text-sm font-medium">
                                                    <Moon size={14} className="mt-0.5 mr-2 text-indigo-500" />
                                                    <span className="text-gray-900 dark:text-white">{meal.mealName}</span>
                                                </div>
                                                {meal.ingredients.length > 0 && (
                                                     <div className="ml-6 mt-1.5 flex flex-wrap gap-1">
                                                        {meal.ingredients.map((ing, i) => (
                                                            <span key={i} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">{ing}</span>
                                                        ))}
                                                        {onAddIngredientsToShopping && (
                                                            <button 
                                                                onClick={() => onAddIngredientsToShopping(meal.ingredients)}
                                                                className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-100 flex items-center ml-1"
                                                            >
                                                                <Plus size={8} className="mr-0.5"/> Liste
                                                            </button>
                                                        )}
                                                     </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-2">
                                        <p className="text-sm text-gray-400 italic">Nichts geplant</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // EDIT MODE
                            <div className="space-y-3 animate-fade-in">
                                <div>
                                    <label className="flex items-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                        <Coffee size={10} className="mr-1"/> Frühstück
                                    </label>
                                    <input 
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                                        value={meal?.breakfast || ''}
                                        onChange={(e) => updateMealEntry(dayObj.dayName, 'breakfast', e.target.value)}
                                        placeholder="..."
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                        <Sun size={10} className="mr-1"/> Mittag
                                    </label>
                                    <input 
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                                        value={meal?.lunch || ''}
                                        onChange={(e) => updateMealEntry(dayObj.dayName, 'lunch', e.target.value)}
                                        placeholder="..."
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                        <Moon size={10} className="mr-1"/> Abend
                                    </label>
                                    <input 
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                                        value={meal?.mealName || ''}
                                        onChange={(e) => updateMealEntry(dayObj.dayName, 'mealName', e.target.value)}
                                        placeholder="..."
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={() => setEditingDay(null)}
                                        className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center hover:bg-emerald-600 transition"
                                    >
                                        <Save size={12} className="mr-1"/> Fertig
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
          })}
        </div>
    </div>
  );

  return (
    <>
      <Header title="Essen & Trinken" currentUser={currentUser} onProfileClick={onProfileClick} />
      
      {/* Tabs */}
      <div className="px-4 mt-2 mb-4">
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
          {/* Plan Tab - Only for Parents/Admin */}
          {!isChild && (
              <button 
                onClick={() => setActiveTab('plan')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-1 transition-all ${activeTab === 'plan' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <Utensils size={16} /> <span className="hidden sm:inline">Woche</span> <span className="sm:hidden">Woche</span>
              </button>
          )}
          <button 
            onClick={() => setActiveTab('wishes')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-1 transition-all ${activeTab === 'wishes' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <MessageCircleHeart size={16} /> <span className="hidden sm:inline">Wünsche</span> <span className="sm:hidden">Wünsche</span>
          </button>
          <button 
            onClick={() => setActiveTab('places')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-1 transition-all ${activeTab === 'places' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Store size={16} /> <span className="hidden sm:inline">Orte</span> <span className="sm:hidden">Orte</span>
          </button>
        </div>
      </div>

      <div className="p-4 pb-24">
         {!isChild && activeTab === 'plan' && renderPlan()}
         {activeTab === 'wishes' && (
             <div className="animate-fade-in">
                 <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30 mb-6">
                      <h3 className="text-lg font-bold text-orange-900 dark:text-orange-300 mb-2">Worauf hast du Hunger, {currentUser.name}?</h3>
                      <form onSubmit={handleWishSubmit} className="flex gap-2">
                          <input 
                            type="text"
                            value={newWish}
                            onChange={(e) => setNewWish(e.target.value)}
                            placeholder="z.B. Pfannkuchen"
                            className="flex-1 rounded-xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 dark:text-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                          />
                          <button type="submit" className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 shadow-md">
                              <Plus size={20} />
                          </button>
                      </form>
                  </div>

                  <div className="space-y-3">
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 ml-1">Wunschliste der Familie</h4>
                      {requests.length === 0 ? (
                          <p className="text-gray-400 text-center py-8 italic">Noch keine Wünsche offen.</p>
                      ) : (
                          requests.map(req => {
                              const requester = family.find(f => f.id === req.requestedBy);
                              return (
                                  <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                      <div className="flex items-center space-x-3">
                                          {requester && (
                                              <div className="relative">
                                                <img src={requester.avatar} className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-700" />
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${requester.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                              </div>
                                          )}
                                          <div>
                                              <p className="font-bold text-gray-800 dark:text-white">{req.dishName}</p>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">gewünscht von {requester?.name || 'Unbekannt'}</p>
                                          </div>
                                      </div>
                                      <button onClick={() => onDeleteRequest(req.id)} className="text-gray-300 hover:text-red-400 p-2">
                                          <Trash2 size={18} />
                                      </button>
                                  </div>
                              );
                          })
                      )}
                  </div>
             </div>
         )}
         {activeTab === 'places' && (
             <div className="space-y-6 animate-fade-in">
                  <div className="relative">
                     <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                     <form onSubmit={handlePlaceSearch}>
                         <input 
                            type="text"
                            value={placeQuery}
                            onChange={(e) => setPlaceQuery(e.target.value)}
                            placeholder="Suche Orte..."
                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-12 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-800 dark:text-white"
                         />
                         <button 
                            type="submit" 
                            className="absolute right-2 top-2 bg-emerald-600 text-white p-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            disabled={loadingPlaces}
                         >
                            {loadingPlaces ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                         </button>
                     </form>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {['Restaurants', 'Supermarkt', 'Bäckerei', 'Eisdiele'].map(term => (
                          <button 
                            key={term}
                            onClick={() => { setPlaceQuery(term); }}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium whitespace-nowrap hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                          >
                              {term}
                          </button>
                      ))}
                  </div>

                  {placeResults && (
                      <div className="space-y-4">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-sm text-emerald-900 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-800/50">
                            {placeResults.text}
                          </div>
                          <div className="grid gap-4">
                              {placeResults.places.map((place, idx) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between hover:shadow-md transition">
                                     <div className="flex justify-between items-start">
                                         <div>
                                             <h4 className="font-bold text-gray-900 dark:text-white text-lg">{place.title}</h4>
                                             <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{place.address}</p>
                                         </div>
                                         {place.rating && (
                                             <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs px-2 py-1 rounded font-bold">
                                                 ★ {place.rating}
                                             </span>
                                         )}
                                     </div>
                                     {place.uri && (
                                         <a 
                                            href={place.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="mt-4 flex items-center justify-center w-full py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                         >
                                             Ansehen <ExternalLink size={14} className="ml-2" />
                                         </a>
                                     )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
             </div>
         )}
      </div>
    </>
  );
};

export default MealsPage;