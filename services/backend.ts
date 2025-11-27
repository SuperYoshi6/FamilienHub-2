import { FamilyMember, CalendarEvent, ShoppingItem, Task, MealPlan, MealRequest, SavedLocation, Recipe } from "../types";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- INITIAL DATA MOCKS (Fallback) ---
const INITIAL_FAMILY: FamilyMember[] = [
  { id: '1', name: 'Mama', avatar: 'https://picsum.photos/100/100?random=1', color: 'bg-pink-100 text-pink-700', role: 'parent' },
  { id: '2', name: 'Papa', avatar: 'https://picsum.photos/100/100?random=2', color: 'bg-blue-100 text-blue-700', role: 'parent' },
  { id: '3', name: 'Leo', avatar: 'https://picsum.photos/100/100?random=3', color: 'bg-green-100 text-green-700', role: 'child' },
  { id: '4', name: 'Mia', avatar: 'https://picsum.photos/100/100?random=4', color: 'bg-yellow-100 text-yellow-700', role: 'child' },
];

const INITIAL_EVENTS: CalendarEvent[] = [
    { id: '1', title: 'Fußballtraining Leo', date: new Date().toISOString().split('T')[0], time: '17:00', endTime: '18:30', assignedTo: ['3'], location: 'Sportplatz', description: 'Mitnehmen: Wasserflasche' },
];

const INITIAL_SHOPPING: ShoppingItem[] = [
    { id: '1', name: 'Milch', checked: false },
    { id: '2', name: 'Brot', checked: true },
];

const INITIAL_TASKS: Task[] = [
    { id: '101', title: 'Müll rausbringen', done: false, assignedTo: '3', type: 'household' },
];

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://hjkmfodzhradtkeiyele.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqa21mb2R6aHJhZHRrZWl5ZWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODIwNjEsImV4cCI6MjA2ODA1ODA2MX0.2cfezsLcT6x3KI9VqzrHntP80O-cy0JQUb7UK3Mnai8';

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("🔌 Connected to Supabase");
    } catch (e) {
        console.error("Supabase init failed:", e);
    }
} else {
    console.log("💾 Running in LocalStorage Mode (No Supabase keys found)");
}

// --- INTERFACE ---
interface ICollection<T> {
    getAll(): Promise<T[]>;
    add(item: T): Promise<T[]>;
    update(id: string, updates: Partial<T>): Promise<T[]>;
    delete(id: string): Promise<T[]>;
    setAll(items: T[]): Promise<T[]>;
}

// --- LOCAL STORAGE IMPLEMENTATION ---
class LocalStorageCollection<T extends { id: string }> implements ICollection<T> {
    constructor(private key: string, private defaultVal: T[]) {}

    private async delay(ms: number = 50) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getStored(): T[] {
        try {
            const item = localStorage.getItem(this.key);
            return item ? JSON.parse(item) : this.defaultVal;
        } catch {
            return this.defaultVal;
        }
    }

    private setStored(data: T[]) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            console.error("Storage full or error", e);
        }
    }

    async getAll(): Promise<T[]> {
        await this.delay();
        return this.getStored();
    }

    async add(item: T): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        const newData = [...data, item];
        this.setStored(newData);
        return newData;
    }

    async update(id: string, updates: Partial<T>): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        const newData = data.map(d => d.id === id ? { ...d, ...updates } : d);
        this.setStored(newData);
        return newData;
    }

    async delete(id: string): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        const newData = data.filter(d => d.id !== id);
        this.setStored(newData);
        return newData;
    }

    async setAll(items: T[]): Promise<T[]> {
        await this.delay();
        this.setStored(items);
        return items;
    }
}

// --- SUPABASE IMPLEMENTATION ---
class SupabaseCollection<T extends { id: string }> implements ICollection<T> {
    constructor(private table: string) {}

    async getAll(): Promise<T[]> {
        if (!supabase) return [];
        const { data, error } = await supabase.from(this.table).select('*');
        if (error) {
            console.error(`Supabase load error (${this.table}):`, error);
            return [];
        }
        return data as T[];
    }

    async add(item: T): Promise<T[]> {
        if (!supabase) return [];
        const { error } = await supabase.from(this.table).insert(item);
        if (error) console.error(`Supabase add error (${this.table}):`, error);
        return this.getAll();
    }

    async update(id: string, updates: Partial<T>): Promise<T[]> {
        if (!supabase) return [];
        const { error } = await supabase.from(this.table).update(updates).eq('id', id);
        if (error) console.error(`Supabase update error (${this.table}):`, error);
        return this.getAll();
    }

    async delete(id: string): Promise<T[]> {
        if (!supabase) return [];
        const { error } = await supabase.from(this.table).delete().eq('id', id);
        if (error) console.error(`Supabase delete error (${this.table}):`, error);
        return this.getAll();
    }

    async setAll(items: T[]): Promise<T[]> {
        if (!supabase) return [];
        // Using upsert to update existing or insert new items
        const { error } = await supabase.from(this.table).upsert(items);
        if (error) console.error(`Supabase setAll/upsert error (${this.table}):`, error);
        return this.getAll();
    }
}

// --- FACTORY ---
// Maps app keys to Supabase table names
const TABLE_MAPPING: Record<string, string> = {
    'fh_family': 'family',
    'fh_events': 'events',
    'fh_shopping': 'shopping',
    'fh_household': 'household_tasks',
    'fh_personal': 'personal_tasks',
    'fh_mealPlan': 'meal_plans',
    'fh_mealRequests': 'meal_requests',
    'fh_recipes': 'recipes',
    'fh_weather_favs': 'weather_favs'
};

const createCollection = <T extends { id: string }>(key: string, defaultVal: T[]) => {
    if (supabase) {
        const tableName = TABLE_MAPPING[key];
        if (tableName) {
            return new SupabaseCollection<T>(tableName);
        }
    }
    return new LocalStorageCollection<T>(key, defaultVal);
}

// --- EXPORT ---
export const Backend = {
    family: createCollection<FamilyMember>('fh_family', INITIAL_FAMILY),
    events: createCollection<CalendarEvent>('fh_events', INITIAL_EVENTS),
    shopping: createCollection<ShoppingItem>('fh_shopping', INITIAL_SHOPPING),
    householdTasks: createCollection<Task>('fh_household', INITIAL_TASKS),
    personalTasks: createCollection<Task>('fh_personal', []),
    mealPlan: createCollection<MealPlan>('fh_mealPlan', []),
    mealRequests: createCollection<MealRequest>('fh_mealRequests', []),
    recipes: createCollection<Recipe>('fh_recipes', []),
    weatherFavorites: createCollection<SavedLocation>('fh_weather_favs', []),
};