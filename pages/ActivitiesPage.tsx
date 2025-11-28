import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { suggestActivities } from '../services/gemini';
import { MapPin, Search, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { PlaceRecommendation } from '../types';

interface ActivitiesPageProps {
  onProfileClick: () => void;
}

const ActivitiesPage: React.FC<ActivitiesPageProps> = ({ onProfileClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ text: string; places: PlaceRecommendation[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
            // Non-critical: just means we use default coords
            console.log("GPS Info (Aktivitäten): Nutze Standard-Standort.", err.message);
        }
      );
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    // Use stored location or fallback (e.g. Berlin center roughly) if permission denied
    const lat = location?.lat || 52.52;
    const lng = location?.lng || 13.40;
    
    const data = await suggestActivities(query, lat, lng);
    setResults(data);
    setLoading(false);
  };

  return (
    <>
      <Header title="Orte & Aktivitäten" onProfileClick={onProfileClick} />
      <div className="p-4 pb-24 space-y-6">
        
        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Was wollt ihr unternehmen?"
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-white"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="absolute right-2 top-2 bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
          </button>
        </form>

        {/* Location Status */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <MapPin size={12} className="mr-1" />
          {location ? "Standort ermittelt" : "Verwende Standard-Standort (bitte GPS erlauben)"}
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-fade-in">
            {/* AI Text Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-900 dark:text-blue-200 leading-relaxed border border-blue-100 dark:border-blue-800">
               {results.text}
            </div>

            {/* Places List */}
            <h3 className="font-bold text-gray-800 dark:text-white">Gefundene Orte</h3>
            <div className="grid gap-4">
              {results.places.length > 0 ? (
                results.places.map((place, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-gray-900 dark:text-white text-lg">{place.title}</h4>
                           {place.rating && (
                                <span className="inline-block bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs px-2 py-0.5 rounded font-bold whitespace-nowrap ml-2">
                                    ★ {place.rating}
                                </span>
                           )}
                        </div>
                        {/* Use description here instead of address if address is redundant, but schema has both */}
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{place.description || "Keine Beschreibung verfügbar."}</p>
                        {place.address && (
                             <p className="text-gray-400 dark:text-gray-500 text-xs flex items-center"><MapPin size={10} className="mr-1"/> {place.address}</p>
                        )}
                    </div>
                    {place.uri && (
                        <a 
                            href={place.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-4 flex items-center justify-center w-full py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Auf Karte ansehen <ExternalLink size={14} className="ml-2" />
                        </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm italic">Keine Orte gefunden.</p>
              )}
            </div>
          </div>
        )}

        {!results && !loading && (
             <div className="mt-10 text-center opacity-40">
                <MapPin className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Suche nach Spielplätzen, Restaurants oder Museen in deiner Nähe.</p>
             </div>
        )}

      </div>
    </>
  );
};

export default ActivitiesPage;