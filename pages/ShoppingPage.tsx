import React, { useState } from 'react';
import Header from '../components/Header';
import { ShoppingItem } from '../types';
import { Plus, CheckCircle2, Circle } from 'lucide-react';

interface ShoppingPageProps {
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onAdd: (name: string) => void;
}

const ShoppingPage: React.FC<ShoppingPageProps> = ({ items, onToggle, onAdd }) => {
  const [newItem, setNewItem] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  const sortedItems = [...items].sort((a, b) => Number(a.checked) - Number(b.checked));

  return (
    <>
      <Header title="Einkaufsliste" />
      <div className="p-4 pb-24">
        <form onSubmit={handleSubmit} className="relative mb-6">
          <input 
            type="text" 
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Artikel hinzufügen..." 
            className="w-full bg-white border border-gray-200 rounded-full py-3 px-5 pr-12 shadow-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <button 
            type="submit"
            className="absolute right-1 top-1 bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition"
          >
            <Plus size={20} />
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {sortedItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Liste ist leer</div>
          ) : (
            <ul>
              {sortedItems.map((item) => (
                <li 
                  key={item.id} 
                  className={`flex items-center p-4 border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${item.checked ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                  onClick={() => onToggle(item.id)}
                >
                  {item.checked ? (
                    <CheckCircle2 className="text-gray-400 mr-3 flex-shrink-0" size={24} />
                  ) : (
                    <Circle className="text-orange-500 mr-3 flex-shrink-0" size={24} />
                  )}
                  <span className={`text-lg ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default ShoppingPage;