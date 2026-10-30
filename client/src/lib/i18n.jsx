import { createContext, useContext, useState } from 'react';

const HI = {
  'Overview': 'अवलोकन', 'Institutions': 'संस्थान', 'Flags': 'चेतावनियाँ', 'Reports': 'रिपोर्ट', 'Audit trail': 'ऑडिट ट्रेल',
  'Verify': 'सत्यापन', 'Dashboard': 'डैशबोर्ड', 'Upload data': 'डेटा अपलोड', 'Students': 'विद्यार्थी', 'Inbox': 'इनबॉक्स',
  'Developers': 'डेवलपर', 'My record': 'मेरा रिकॉर्ड', 'Sign in': 'साइन इन', 'Sign out': 'साइन आउट', 'Email': 'ईमेल', 'Password': 'पासवर्ड',
  'Verified students. Honest seats.': 'सत्यापित विद्यार्थी। ईमानदार सीटें।',
  'One national student record, linked to APAAR ID, that catches errors before they become violations.': 'APAAR ID से जुड़ा एक राष्ट्रीय विद्यार्थी रिकॉर्ड, जो गलतियों को उल्लंघन बनने से पहले पकड़ता है।',
  'Open platform': 'प्लेटफ़ॉर्म खोलें', 'How it works': 'यह कैसे काम करता है', 'Total enrolled': 'कुल नामांकन', 'Approved intake': 'स्वीकृत प्रवेश क्षमता',
  'Open flags': 'खुली चेतावनियाँ', 'Seat headroom': 'सीट उपलब्धता', 'Upload': 'अपलोड', 'Commit': 'जमा करें', 'Download': 'डाउनलोड',
  'Last updated': 'अंतिम अद्यतन', 'Consent': 'सहमति', 'Who checked me': 'किसने मेरा रिकॉर्ड देखा', 'Verified': 'सत्यापित',
};

const Ctx = createContext({ lang: 'en', t: (s) => s, toggle: () => {} });
export function I18n({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('praman_lang') || 'en'; } catch { return 'en'; } });
  const toggle = () => {
    const n = lang === 'en' ? 'hi' : 'en';
    setLang(n);
    try { localStorage.setItem('praman_lang', n); } catch { /* ignore */ }
    document.documentElement.lang = n;
  };
  return <Ctx.Provider value={{ lang, toggle, t: (s) => (lang === 'hi' && HI[s]) || s }}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);
