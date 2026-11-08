import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { mr } from './mr';
import { en } from './en';

const savedLanguage = localStorage.getItem('hk_language') || 'mr';

i18n.use(initReactI18next).init({
  resources: {
    mr: { translation: mr },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'mr',
  interpolation: {
    escapeValue: false, // React handles XSS
  },
});

export default i18n;
