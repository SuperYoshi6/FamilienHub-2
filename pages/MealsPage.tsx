import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { MealPlan, MealRequest, FamilyMember, PlaceRecommendation } from '../types';
import { suggestMealPlan, suggestActivities } from '../services/gemini';
import { Sparkles, ChefHat, RefreshCcw, Utensils, MessageCircleHeart, Trash2, Plus, Store, Search, ExternalLink, Loader2 } from 'lucide-react';

interface MealsPageProps {
  plan: MealPlan[];
  requests: MealRequest[];
  family: FamilyMember[];
  currentUser: FamilyMember;
  onUpdatePlan: (plan: MealPlan[]) => void;
  onAddRequest: (dish: string) => void;
  onDeleteRequest: (id: string) => void;
  onProfileClick: () => void;
}

type TabType = 'plan' | 'wishes' | 'places';

const MealsPage: React.FC<MealsPageProps> = ({ plan, requests, family, currentUser, onUpdatePlan, onAddRequest, onDeleteRequest, onProfileClick }) => {
  const [activeTab, setActiveTab] = useState<TabType>('plan');
  
  // Plan State
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [preferences, setPreferences] = useState('');
  
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
            // Non-critical error, just logging for info
            console.log("GPS Info (Essen): Nutze Standard-Standort.", err.message);
        }
      );
    }
  }, []);

  const generatePlan = async () => {
    setLoadingPlan(true);
    const newPlan = await suggestMealPlan(preferences);
    if (newPlan && newPlan.length > 0) {
      onUpdatePlan(newPlan);
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

  const renderPlan = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Generator Section */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <ChefHat size={28} />
            <h2 className="text-xl font-bold">Was kochen wir?</h2>
          </div>
          <p className="text-emerald-50 text-sm mb-4">
            Lass dir von der KI einen Plan für die nächsten 3 Tage erstellen.
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
              <span>{loadingPlan ? 'Plane...' : 'Plan erstellen'}</span>
            </button>
          </div>
        </div>

        {/* Plan List */}
        <div className="space-y-4">
          {plan.map((meal, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">{meal.day}</span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{meal.mealName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">"{meal.recipeHint}"</p>
                <div className="flex flex-wrap gap-2">
                  {meal.ingredients.map((ing, i) => (
                    <span key={i} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-md">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {plan.length === 0 && !loadingPlan && (
            <div className="text-center py-10 opacity-50">
              <UtensilsIconLarge />
              <p className="mt-2 text-gray-500 dark:text-gray-400">Noch kein Plan erstellt.</p>
            </div>
          )}
        </div>
    </div>
  );

  const renderWishes = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30">
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
  );

  const renderPlaces = () => (
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
  );

  return (
    <>
      <Header title="Essen & Trinken" currentUser={currentUser} onProfileClick={onProfileClick} />
      
      {/* Tabs */}
      <div className="px-4 mt-2 mb-4">
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
          <button 
            onClick={() => setActiveTab('plan')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-1 transition-all ${activeTab === 'plan' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Utensils size={16} /> <span className="hidden sm:inline">Wochenplan</span> <span className="sm:hidden">Plan</span>
          </button>
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
         {activeTab === 'plan' && renderPlan()}
         {activeTab === 'wishes' && renderWishes()}
         {activeTab === 'places' && renderPlaces()}
      </div>
    </>
  );
};

const UtensilsIconLarge = () => (
  <svg 
    className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" 
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export default MealsPage;