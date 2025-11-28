import { FamilyMember, CalendarEvent, ShoppingItem, Task, MealPlan, MealRequest, SavedLocation, Recipe, NewsItem, FeedbackItem } from "../types";
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- INITIAL DATA MOCKS (Fallback) ---
const INITIAL_FAMILY: FamilyMember[] = [
    {
        id: 'admin_user',
        name: 'Administrator',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff',
        color: 'bg-gray-800 text-white',
        role: 'admin',
        password: 'admin006' 
    }
];
const INITIAL_EVENTS: CalendarEvent[] = [];
const INITIAL_SHOPPING: ShoppingItem[] = [];
const INITIAL_TASKS: Task[] = [];

// --- SUPABASE CONFIGURATION ---
// BITTE HIER DEINE DATEN EINTRAGEN DAMIT SUPABASE FUNKTIONIERT
const SUPABASE_URL = ''; 
const SUPABASE_KEY = '';

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("🔌 Connected to Supabase");
    } catch (e) {
        console.error("Supabase init failed:", e);
    }
} else {
    console.log("💾 Running in LocalStorage Mode (Keys not configured)");
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
            const data = item ? JSON.parse(item) : this.defaultVal;
            console.log(`[LocalStorage] Loaded ${data.length} items from ${this.key}`);
            return data;
        } catch {
            return this.defaultVal;
        }
    }

    private setStored(data: T[]) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
            console.log(`[LocalStorage] Saved to ${this.key}`);
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
        console.log(`[LocalStorage] Added item to ${this.key}`, item);
        return newData;
    }

    async update(id: string, updates: Partial<T>): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        const newData = data.map(d => d.id === id ? { ...d, ...updates } : d);
        this.setStored(newData);
        console.log(`[LocalStorage] Updated item ${id} in ${this.key}`, updates);
        return newData;
    }

    async delete(id: string): Promise<T[]> {
        await this.delay();
        const data = this.getStored();
        const newData = data.filter(d => d.id !== id);
        this.setStored(newData);
        console.log(`[LocalStorage] Deleted item ${id} from ${this.key}`);
        return newData;
    }

    async setAll(items: T[]): Promise<T[]> {
        await this.delay();
        this.setStored(items);
        console.log(`[LocalStorage] Set all items for ${this.key} (Count: ${items.length})`);
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
            console.error(`[Supabase] Load error (${this.table}):`, error);
            return [];
        }
        console.log(`[Supabase] Loaded ${data.length} items from ${this.table}`);
        return data as T[];
    }

    async add(item: T): Promise<T[]> {
        if (!supabase) return [];
        const { error } = await supabase.from(this.table).insert(item);
        if (error) console.error(`[Supabase] Add error (${this.table}):`, error);
        else console.log(`[Supabase] Added item to ${this.table}`);
        return this.getAll();
    }

    async update(id: string, updates: Partial<T>): Promise<T[]> {
        if (!supabase) return [];
        const { error } = await supabase.from(this.table).update(updates).eq('id', id);
        if (error) console.error(`[Supabase] Update error (${this.table}):`, error);
        else console.log(`[Supabase] Updated item ${id} in ${this.table}`);
        return this.getAll();
    }

    async delete(id: string): Promise<T[]> {
        if (!supabase) return [];
        const { error } = await supabase.from(this.table).delete().eq('id', id);
        if (error) console.error(`[Supabase] Delete error (${this.table}):`, error);
        else console.log(`[Supabase] Deleted item ${id} from ${this.table}`);
        return this.getAll();
    }

    async setAll(items: T[]): Promise<T[]> {
        if (!supabase) return [];
        
        console.log(`[Supabase] Syncing all items for ${this.table}...`);
        // 1. Delete items that are NOT in the new list (Sync)
        if (items.length > 0) {
            const ids = items.map(i => i.id);
            const { error: deleteError } = await supabase.from(this.table).delete().not('id', 'in', `(${ids.join(',')})`);
            if (deleteError) console.error(`[Supabase] Sync/Delete error (${this.table}):`, deleteError);
        }

        // 2. Upsert new/updated items
        const { error: upsertError } = await supabase.from(this.table).upsert(items);
        if (upsertError) console.error(`[Supabase] Sync/Upsert error (${this.table}):`, upsertError);
        
        return this.getAll();
    }
}

// --- FACTORY ---
// Maps app keys to Supabase table names
const TABLE_MAPPING: Record<string, string> = {
    'fh_family': 'family',
    'fh_events': 'events',
    'fh_news': 'news',
    'fh_shopping': 'shopping',
    'fh_household': 'household_tasks',
    'fh_personal': 'personal_tasks',
    'fh_mealPlan': 'meal_plans',
    'fh_mealRequests': 'meal_requests',
    'fh_recipes': 'recipes',
    'fh_weather_favs': 'weather_favs',
    'fh_feedback': 'feedback'
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
    news: createCollection<NewsItem>('fh_news', []),
    shopping: createCollection<ShoppingItem>('fh_shopping', INITIAL_SHOPPING),
    householdTasks: createCollection<Task>('fh_household', INITIAL_TASKS),
    personalTasks: createCollection<Task>('fh_personal', []),
    mealPlan: createCollection<MealPlan>('fh_mealPlan', []),
    mealRequests: createCollection<MealRequest>('fh_mealRequests', []),
    recipes: createCollection<Recipe>('fh_recipes', []),
    weatherFavorites: createCollection<SavedLocation>('fh_weather_favs', []),
    feedback: createCollection<FeedbackItem>('fh_feedback', []),
};