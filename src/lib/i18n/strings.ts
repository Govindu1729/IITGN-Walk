// Internationalisation strings for the IITGN Walk app.
//
// Only user-facing labels are translated. Data values (location names, route
// reason text, etc.) are not — those come from the routing engine / DB.
//
// To add a new language: add a key to `Lang` and a matching record below.

export type Lang = "en" | "hi" | "gu";

export type TranslationKey =
  // Greetings
  | "greeting.morning"
  | "greeting.afternoon"
  | "greeting.evening"
  // Planner labels
  | "label.from"
  | "label.to"
  | "label.findRoutes"
  | "label.startJourney"
  | "label.walkingMode"
  | "label.relaxed"
  | "label.normal"
  | "label.hurry"
  // Route objectives
  | "label.fastest"
  | "label.shortest"
  | "label.easiest"
  | "label.alternative"
  // Tabs
  | "tab.navigate"
  | "tab.history"
  | "tab.analytics"
  | "tab.tours"
  | "tab.events"
  // Toasts / status
  | "toast.routesComputed"
  | "toast.journeyStarted"
  | "toast.arrived"
  // Misc UI
  | "label.settings"
  | "label.about"
  | "label.bookmarks"
  | "label.recentSearches"
  // Analytics headings
  | "label.totalJourneys"
  | "label.gpsSamples"
  | "label.popularRoutes";

export type Dict = Record<TranslationKey, string>;

const en: Dict = {
  "greeting.morning": "Good morning",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening": "Good evening",

  "label.from": "From",
  "label.to": "To",
  "label.findRoutes": "Find Routes",
  "label.startJourney": "Start Journey",
  "label.walkingMode": "Walking Mode",
  "label.relaxed": "Relaxed",
  "label.normal": "Normal",
  "label.hurry": "Hurry",

  "label.fastest": "Fastest",
  "label.shortest": "Shortest",
  "label.easiest": "Easiest",
  "label.alternative": "Alternative",

  "tab.navigate": "Navigate",
  "tab.history": "History",
  "tab.analytics": "Analytics",
  "tab.tours": "Tours",
  "tab.events": "Events",

  "toast.routesComputed": "Routes computed — pick the one that suits you",
  "toast.journeyStarted": "Journey started — follow the highlighted route",
  "toast.arrived": "Journey recorded — thank you, predictions improved.",

  "label.settings": "Settings",
  "label.about": "About",
  "label.bookmarks": "Bookmarks",
  "label.recentSearches": "Recent Searches",

  "label.totalJourneys": "Total journeys",
  "label.gpsSamples": "GPS samples",
  "label.popularRoutes": "Popular routes",
};

const hi: Dict = {
  "greeting.morning": "सुप्रभात",
  "greeting.afternoon": "नमस्कार",
  "greeting.evening": "शुभ संध्या",

  "label.from": "से",
  "label.to": "तक",
  "label.findRoutes": "मार्ग खोजें",
  "label.startJourney": "यात्रा शुरू करें",
  "label.walkingMode": "चलने की गति",
  "label.relaxed": "धीमी",
  "label.normal": "सामान्य",
  "label.hurry": "जल्दी",

  "label.fastest": "सबसे तेज़",
  "label.shortest": "सबसे छोटा",
  "label.easiest": "सबसे आसान",
  "label.alternative": "वैकल्पिक",

  "tab.navigate": "नेविगेट",
  "tab.history": "इतिहास",
  "tab.analytics": "विश्लेषण",
  "tab.tours": "टूर",
  "tab.events": "कार्यक्रम",

  "toast.routesComputed": "मार्ग गणना हो गई — अपनी पसंद का मार्ग चुनें",
  "toast.journeyStarted": "यात्रा शुरू — हाइलाइट किए गए मार्ग पर चलें",
  "toast.arrived": "यात्रा दर्ज हुई — धन्यवाद, पूर्वानुमान में सुधार हुआ।",

  "label.settings": "सेटिंग्स",
  "label.about": "परिचय",
  "label.bookmarks": "बुकमार्क",
  "label.recentSearches": "हाल की खोजें",

  "label.totalJourneys": "कुल यात्राएँ",
  "label.gpsSamples": "जीपीएस नमूने",
  "label.popularRoutes": "लोकप्रिय मार्ग",
};

// Gujarati (ગુજરાતી) — third language of the IITGN Walk app. Spoken locally
// by IITGN support staff and many Gandhinagar residents. Translations favour
// natural campus phrasing over literal transliteration. The script is
// Unicode Gujarati (U+0A80–U+0AFF).
const gu: Dict = {
  "greeting.morning": "સુપ્રભાત",
  "greeting.afternoon": "નમસ્કાર",
  "greeting.evening": "શુભ સંધ્યા",

  "label.from": "થી",
  "label.to": "સુધી",
  "label.findRoutes": "માર્ગ શોધો",
  "label.startJourney": "મુસાફરી શરૂ કરો",
  "label.walkingMode": "ચાલવાની ગતિ",
  "label.relaxed": "આરામથી",
  "label.normal": "સામાન્ય",
  "label.hurry": "ઉતાવળ",

  "label.fastest": "સૌથી ઝડપી",
  "label.shortest": "સૌથી ટૂંકો",
  "label.easiest": "સૌથી સરળ",
  "label.alternative": "વૈકલ્પિક",

  "tab.navigate": "શોધો",
  "tab.history": "ઇતિહાસ",
  "tab.analytics": "વિશ્લેષણ",
  "tab.tours": "પ્રવાસ",
  "tab.events": "કાર્યક્રમો",

  "toast.routesComputed": "માર્ગ ગણાઈ ગયા — તમને ગમતો માર્ગ પસંદ કરો",
  "toast.journeyStarted": "મુસાફરી શરૂ — હાઇલાઇટ થયેલ માર્ગ પર ચાલો",
  "toast.arrived":
    "મુસાફરી નોંધાઈ — આભાર, અનુમાનમાં સુધારો થયો.",

  "label.settings": "સેટિંગ્સ",
  "label.about": "વિશે",
  "label.bookmarks": "બુકમાર્ક",
  "label.recentSearches": "તાજા શોધ",

  "label.totalJourneys": "કુલ મુસાફરીઓ",
  "label.gpsSamples": "GPS નમૂના",
  "label.popularRoutes": "લોકપ્રિય માર્ગો",
};

export const translations: Record<Lang, Dict> = { en, hi, gu };

/** Look up a translation, falling back to English then to the key itself. */
export function translate(lang: Lang, key: TranslationKey): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}
