import React, { useState, useRef } from 'react';
import Header from '../components/Header';
import { ShoppingItem, Task, FamilyMember, Recipe } from '../types';
import { Plus, CheckCircle2, Circle, ShoppingCart, Home, User, Trash2, Lock, BookOpen, Camera, Loader2, ChefHat, Calendar } from 'lucide-react';
import { analyzeRecipeImage } from '../services/gemini';
import { compressImage } from '../services/imageUtils';

interface ListsPageProps {
  shoppingItems: ShoppingItem[];
  householdTasks: Task[];
  personalTasks: Task[];
  recipes: Recipe[];
  family: FamilyMember[];
  currentUser: FamilyMember;
  onToggleShopping: (id: string) => void;
  onAddShopping: (name: string) => void;
  onDeleteShopping: (id: string) => void;
  onAddHousehold: (title: string, assignedTo: string) => void;
  onToggleTask: (id: string, type: 'household' | 'personal') => void;
  onAddPersonal: (title: string) => void;
  onDeleteTask: (id: string, type: 'household' | 'personal') => void;
  onAddRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onAddIngredientsToShopping: (ingredients: string[]) => void;
  onAddMealToPlan: (day: string, mealName: string, ingredients: string[]) => void;
  onProfileClick: () => void;
}

type TabType = 'shopping' | 'household' | 'personal' | 'recipes';

const ListsPage: React.FC<ListsPageProps> = ({ 
  shoppingItems, 
  householdTasks, 
  personalTasks, 
  recipes,
  family,
  currentUser,
  onToggleShopping, 
  onAddShopping,
  onDeleteShopping,
  onAddHousehold,
  onToggleTask,
  onAddPersonal,
  onDeleteTask,
  onAddRecipe,
  onDeleteRecipe,
  onAddIngredientsToShopping,
  onAddMealToPlan,
  onProfileClick
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('household');
  const [newItem, setNewItem] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>(family[0].id);
  
  // Recipe State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    if (activeTab === 'shopping') {
      onAddShopping(newItem.trim());
    } else if (activeTab === 'household') {
      onAddHousehold(newItem.trim(), selectedAssignee);
    } else if (activeTab === 'personal') {
      onAddPersonal(newItem.trim());
    }
    setNewItem('');
  };

  const handleCameraClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setScanning(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = reader.result as string;
              
              // Compress before sending to API or Saving to avoid LocalStorage limits
              const compressedBase64 = await compressImage(base64, 800, 0.7);

              const recipe = await analyzeRecipeImage(compressedBase64);
              if (recipe) {
                  onAddRecipe({ ...recipe, image: compressedBase64 });
              } else {
                  alert("Konnte Rezept nicht erkennen.");
              }
              setScanning(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddToPlan = (recipe: Recipe) => {
     // Defaulting to "Morgen" for demo
     onAddMealToPlan('Morgen', recipe.name, recipe.ingredients);
     alert(`${recipe.name} wurde für Morgen eingeplant!`);
  };

  const renderShoppingList = () => {
    const sorted = [...shoppingItems].sort((a, b) => Number(a.checked) - Number(b.checked));
    return (
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((item) => (
          <div 
            key={item.id} 
            className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${item.checked ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'}`}
            onClick={() => onToggleShopping(item.id)}
          >
            <div className="flex items-center overflow-hidden">
                {item.checked ? (
                  <CheckCircle2 className="text-gray-400 mr-2 flex-shrink-0" size={20} />
                ) : (
                  <Circle className="text-orange-500 mr-2 flex-shrink-0" size={20} />
                )}
                <span className={`text-sm font-medium line-clamp-2 leading-tight ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                  {item.name}
                </span>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onDeleteShopping(item.id); }}
                className="text-gray-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition -mr-1"
            >
                <Trash2 size={16} />
            </button>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-center text-gray-400 mt-8 col-span-full">Liste ist leer</p>}
      </div>
    );
  };

  const renderTaskList = (tasks: Task[], type: 'household' | 'personal') => {
    let visibleTasks = tasks;
    if (type === 'household' && currentUser.role === 'child') {
        visibleTasks = tasks.filter(t => t.assignedTo === currentUser.id);
    }
    const sorted = [...visibleTasks].sort((a, b) => Number(a.done) - Number(b.done));
    
    return (
      <div className="grid grid-cols-2 gap-3">
        {sorted.map((task) => {
          const assignee = family.find(f => f.id === task.assignedTo);
          return (
            <div 
              key={task.id} 
              className={`flex flex-col p-3 rounded-xl border relative overflow-hidden transition-all ${task.done ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'}`}
            >
              <div className="flex items-start justify-between mb-2">
                 <div className="flex items-center cursor-pointer" onClick={() => onToggleTask(task.id, type)}>
                    {task.done ? (
                      <CheckCircle2 className="text-green-500 mr-2 flex-shrink-0" size={20} />
                    ) : (
                      <Circle className={`mr-2 flex-shrink-0 ${type === 'household' ? 'text-blue-500' : 'text-purple-500'}`} size={20} />
                    )}
                 </div>
                 {(type === 'personal' || currentUser.role === 'parent') && (
                     <button onClick={() => onDeleteTask(task.id, type)} className="text-gray-300 hover:text-red-400 p-1 -mr-1 -mt-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                         <Trash2 size={16} />
                     </button>
                 )}
              </div>
              
              <div className="flex-1 cursor-pointer" onClick={() => onToggleTask(task.id, type)}>
                  <span className={`text-sm font-medium line-clamp-2 leading-tight ${task.done ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                    {task.title}
                  </span>
                  
                  {type === 'household' && assignee && !task.done && (
                     <div className="flex items-center mt-2 pt-2 border-t border-gray-50 dark:border-gray-700">
                        <img src={assignee.avatar} alt={assignee.name} className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700 mr-1.5" />
                        <span className={`text-[10px] font-bold ${assignee.color.replace('bg-', 'text-').split(' ')[1]}`}>{assignee.name}</span>
                     </div>
                  )}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
            <div className="text-center py-8 col-span-full">
                <p className="text-gray-400">Keine Aufgaben vorhanden.</p>
            </div>
        )}
      </div>
    );
  };

  const renderRecipes = () => (
      <div className="space-y-4">
          {/* Header Action */}
          <div className="flex justify-center mb-2">
            <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <button 
                onClick={handleCameraClick}
                disabled={scanning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-bold shadow-md active:scale-95 transition flex items-center space-x-2 disabled:opacity-70 text-sm"
            >
                {scanning ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                <span>Neues Rezept scannen</span>
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-2 gap-3">
              {recipes.map(recipe => (
                  <div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                      {recipe.image && (
                          <div className="h-24 w-full overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
                              <img src={recipe.image} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => onDeleteRecipe(recipe.id)}
                                className="absolute top-1 right-1 bg-black/40 text-white p-1 rounded-full hover:bg-red-500 transition"
                              >
                                <Trash2 size={12} />
                              </button>
                          </div>
                      )}
                      <div className="p-3 flex-1 flex flex-col">
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 mb-1">{recipe.name}</h3>
                          
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{recipe.description || 'Keine Beschreibung'}</p>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{recipe.ingredients.length} Zutaten</p>
                          </div>

                          <div className="flex gap-1 mt-2">
                              <button 
                                onClick={() => {
                                    onAddIngredientsToShopping(recipe.ingredients);
                                    alert("Zutaten auf Einkaufsliste!");
                                }}
                                className="flex-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center border border-orange-100 dark:border-orange-800/30"
                              >
                                  <ShoppingCart size={12} />
                              </button>
                              <button 
                                onClick={() => handleAddToPlan(recipe)}
                                className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center border border-emerald-100 dark:border-emerald-800/30"
                              >
                                  <Calendar size={12} />
                              </button>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
          {recipes.length === 0 && !scanning && (
              <div className="text-center text-gray-400 py-8 italic flex flex-col items-center">
                  <BookOpen size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">Deine Galerie ist leer.</p>
              </div>
          )}
      </div>
  );

  const canAddHousehold = activeTab === 'household' && currentUser.role === 'parent';
  const showAddForm = (activeTab !== 'household' && activeTab !== 'recipes') || canAddHousehold;

  return (
    <>
      <Header title="Listen" currentUser={currentUser} onProfileClick={onProfileClick} />
      
      {/* Tabs - UPDATED for full width evenly distributed */}
      <div className="px-4 mt-2">
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl w-full shadow-inner">
          <button 
            onClick={() => setActiveTab('shopping')}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center space-x-1 transition-all uppercase tracking-wide ${activeTab === 'shopping' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <ShoppingCart size={14} className="flex-shrink-0" /> <span className="truncate">Einkauf</span>
          </button>
          <button 
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center space-x-1 transition-all uppercase tracking-wide ${activeTab === 'recipes' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <BookOpen size={14} className="flex-shrink-0" /> <span className="truncate">Rezepte</span>
          </button>
          <button 
            onClick={() => setActiveTab('household')}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center space-x-1 transition-all uppercase tracking-wide ${activeTab === 'household' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <Home size={14} className="flex-shrink-0" /> <span className="truncate">Haushalt</span>
          </button>
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center space-x-1 transition-all uppercase tracking-wide ${activeTab === 'personal' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            <User size={14} className="flex-shrink-0" /> <span className="truncate">Privat</span>
          </button>
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* Input Area */}
        {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder={activeTab === 'shopping' ? "Was fehlt?" : "Neue Aufgabe..."}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white placeholder-gray-400 px-2"
                    />
                    <button 
                        type="submit"
                        className={`p-2 rounded-xl text-white transition shadow-sm ${newItem.trim() ? (activeTab === 'shopping' ? 'bg-orange-500' : activeTab === 'household' ? 'bg-blue-500' : 'bg-purple-500') : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <Plus size={20} />
                    </button>
                </div>
                {/* User Selection for Household (Only Parent sees this) */}
                {activeTab === 'household' && (
                    <div className="flex space-x-2 pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 overflow-x-auto px-1">
                        {family.map(member => (
                            <button
                                key={member.id}
                                type="button"
                                onClick={() => setSelectedAssignee(member.id)}
                                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold border transition ${selectedAssignee === member.id ? `${member.color} border-transparent ring-1 ring-offset-1 ring-gray-300 dark:ring-gray-600` : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                            >
                                <img src={member.avatar} className="w-4 h-4 rounded-full" />
                                <span>{member.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </form>
        )}

        {!showAddForm && activeTab !== 'recipes' && (
            <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 text-sm">
                <Lock size={16} className="mr-2" />
                Nur Eltern können Hausarbeiten hinzufügen.
            </div>
        )}

        {/* Content */}
        <div className="animate-fade-in">
          {activeTab === 'shopping' && renderShoppingList()}
          {activeTab === 'recipes' && renderRecipes()}
          {activeTab === 'household' && renderTaskList(householdTasks, 'household')}
          {activeTab === 'personal' && renderTaskList(personalTasks, 'personal')}
        </div>
      </div>
    </>
  );
};

export default ListsPage;