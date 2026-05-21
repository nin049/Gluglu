import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('fr');
  const t = translations[language] || translations.fr;

  useEffect(() => {
    AsyncStorage.getItem('app_language').then((lang) => {
      if (lang && translations[lang]) setLanguage(lang);
    });
  }, []);

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
