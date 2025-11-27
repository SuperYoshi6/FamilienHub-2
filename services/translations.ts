
import { AppRoute } from "../types";

export type Language = 'de' | 'en';

export const t = (key: string, lang: Language): string => {
  const keys = key.split('.');
  let current: any = translations[lang];
  for (const k of keys) {
    if (current[k] === undefined) return key;
    current = current[k];
  }
  return current;
};

const translations = {
  de: {
    nav: {
      dashboard: 'Home',
      weather: 'Wetter',
      calendar: 'Planer',
      meals: 'Essen',
      lists: 'Listen',
    },
    dashboard: {
      greeting: 'Hallo',
      good_day: 'Einen schönen Tag.',
      weather_details: 'DETAILS',
      shopping_list: 'Einkaufsliste',
      all_done: 'Alles erledigt',
      items_open: 'offen',
      meal_plan: 'Heute essen',
      nothing_planned: 'Nichts geplant',
      my_tasks: 'Meine Aufgaben',
      tasks_open: 'Aufgaben offen',
      all_tasks_done: 'Alles erledigt! 🎉',
      appointments_today: 'Termine heute',
      all: 'Alle',
      no_appointments: 'Keine Termine für heute.',
      location_error: 'Standort?',
      loading: 'Lade...',
    },
    settings: {
      title: 'Einstellungen',
      profile: 'MEIN PROFIL',
      display_name: 'Anzeigename',
      your_color: 'DEINE FARBE',
      generate_avatar: 'KI-Avatar generieren',
      app_settings: 'APP EINSTELLUNGEN',
      dark_mode: 'Dunkelmodus',
      language: 'Sprache',
      family_management: 'FAMILIENVERWALTUNG',
      reset_passwords: 'Passwörter zurücksetzen',
      reset_confirm: 'Passwort für {name} wirklich zurücksetzen?',
      reset_success: 'Zurückgesetzt',
      info_help: 'INFO & HILFE',
      about: 'Über die App',
      feedback: 'Feedback geben',
      save: 'Speichern',
      logout: 'Abmelden',
      only_parents: 'Nur für Eltern sichtbar',
    },
    login: {
      welcome: 'Willkommen zuhause.',
      hello: 'Hallo',
      enter_pass: 'Bitte Passwort eingeben',
      create_pass: 'Erstelle ein Passwort',
      pass_placeholder: 'Passwort',
      new_pass_placeholder: 'Neues Passwort',
      wrong_pass: 'Falsches Passwort',
      login_btn: 'Anmelden',
      set_pass_btn: 'Passwort festlegen',
    },
    header: {
      logged_in_as: 'Angemeldet als',
    }
  },
  en: {
    nav: {
      dashboard: 'Home',
      weather: 'Weather',
      calendar: 'Planner',
      meals: 'Meals',
      lists: 'Lists',
    },
    dashboard: {
      greeting: 'Hello',
      good_day: 'Have a nice day.',
      weather_details: 'DETAILS',
      shopping_list: 'Shopping List',
      all_done: 'All done',
      items_open: 'open',
      meal_plan: 'Dining today',
      nothing_planned: 'Nothing planned',
      my_tasks: 'My Tasks',
      tasks_open: 'tasks open',
      all_tasks_done: 'All done! 🎉',
      appointments_today: 'Appointments Today',
      all: 'All',
      no_appointments: 'No appointments for today.',
      location_error: 'Location?',
      loading: 'Loading...',
    },
    settings: {
      title: 'Settings',
      profile: 'MY PROFILE',
      display_name: 'Display Name',
      your_color: 'YOUR COLOR',
      generate_avatar: 'Generate AI Avatar',
      app_settings: 'APP SETTINGS',
      dark_mode: 'Dark Mode',
      language: 'Language',
      family_management: 'FAMILY MANAGEMENT',
      reset_passwords: 'Reset Passwords',
      reset_confirm: 'Reset password for {name}?',
      reset_success: 'Reset',
      info_help: 'INFO & HELP',
      about: 'About',
      feedback: 'Give Feedback',
      save: 'Save',
      logout: 'Log out',
      only_parents: 'Visible to parents only',
    },
    login: {
      welcome: 'Welcome home.',
      hello: 'Hello',
      enter_pass: 'Please enter password',
      create_pass: 'Create a password',
      pass_placeholder: 'Password',
      new_pass_placeholder: 'New Password',
      wrong_pass: 'Wrong password',
      login_btn: 'Login',
      set_pass_btn: 'Set Password',
    },
    header: {
      logged_in_as: 'Signed in as',
    }
  }
};
