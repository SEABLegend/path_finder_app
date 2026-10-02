import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'he';

const translations = {
  en: {
    'app.title': 'PathFinder Pro',
    'app.importCsv': 'Import Network (CSV)',
    'app.start': 'Start',
    'app.destination': 'Destination',
    'app.requiredWaypoints': 'Required Waypoints',
    'app.selectPoint': 'Select point...',
    'app.calculationParameters': 'Calculation Parameters',
    'app.maxRoutes': 'Max Routes to Find',
    'app.calculate': 'Calculate Optimal Routes',
    'app.newTab': 'New Tab',
    'app.newTabClear': 'New Tab (Clear State)',
    'app.newTabDuplicate': 'New Tab (Duplicate Edits)',
    'app.mainMap': 'Main Map',
    'app.isolatedRouteView': 'Isolated Route View',
    'app.legend': 'Legend',
    'app.optimalRoute': 'Optimal Route',
    'app.alternativeRoute': 'Alternative Route',
    'app.emptyState': 'Calculate routes to see details here.',
    'map.showingRoute': 'Showing Route',
    'map.likelyFiber': 'Likely Fiber',
    'map.likelyRF': 'Likely RF',
    'map.canceled': 'Canceled',
    'isolated.showing': 'Showing',
    'isolated.of': 'of',
    'isolated.optimalRoutes': 'Optimal Routes',
    'isolated.route': 'Route',
    'isolated.cost': 'Cost',
    'columnMapper.title': 'Map Your Data',
    'columnMapper.helper': 'Tell us where to find your data! Just enter the column numbers for your starting locations, destinations, and route costs to get started.',
    'columnMapper.startCol': 'Start Location Column',
    'columnMapper.endCol': 'End Location Column',
    'columnMapper.costCol': 'Route Cost Column',
    'columnMapper.unknown': 'Unknown',
    'columnMapper.cancel': 'Cancel',
    'columnMapper.apply': 'Apply & Render Graph',
    'sidepanel.results': 'Route Results',
    'sidepanel.route': 'Route',
    'sidepanel.totalCost': 'Total Cost',
    'sidepanel.hops': 'Hops',
    'sidepanel.pathDetails': 'Path Details',
    'sidepanel.emptyState': 'Calculate routes to see details here.',
    'sidepanel.networkControls': 'Network Controls',
    'sidepanel.importFirst': 'Import a CSV first to unlock pathfinding and edge management tools.',
    'sidepanel.compareMap': 'Compare Map',
    'sidepanel.pathfinding': 'Pathfinding',
    'sidepanel.sourceNode': 'Source Node',
    'sidepanel.destNode': 'Destination Node',
    'sidepanel.calcRoute': 'Calculate Route',
    'sidepanel.cancellationLedger': 'Cancellation Ledger',
    'sidepanel.cancelSelected': 'Cancel Selected Edges',
    'sidepanel.noCancelled': 'No edges cancelled.',
    'sidepanel.manualEdges': 'Manual Edges',
    'sidepanel.addEdge': 'Add Edge',
    'sidepanel.cost': 'Cost',
    'sidepanel.from': 'From',
    'sidepanel.to': 'To',
    'sidepanel.disableEdge': 'Disable Edge',
    'sidepanel.compareTooltip': 'Upload a second CSV to view a detailed log of structural differences.',
    'sidepanel.pathfindingTooltip': 'Select a starting point and destination to compute optimal network routes.',
    'sidepanel.ledgerTooltip': 'Disables edges to force routing detours. Click edges on the map or use (+) to cancel them.',
    'sidepanel.manualTooltip': 'Creates custom connections to simulate network upgrades.',
    'isolated.totalCost': 'Total Cost',
    'isolated.minHops': 'Minimum Hops',
    'isolated.hopsCount': 'hops',
    'sidepanel.foundRoutes': 'Found {count} optimal routes',
    'sidepanel.routesTooltip': 'More than 3 optimal routes were found. You can select which ones to view in the isolated map\'s dropdown.',

    'app.mapBRouteView': 'Map B Route View',
    'app.noPathFound': 'No Path Found',
    'app.noPathDesc': 'There is no valid directional path between the selected nodes.',
    'app.noPathMapB': 'No Path Found in Map B',
    'app.keepMapA': 'Delete this map',
    'app.keepMapB': 'Delete Map A (Keep this map)',

    'diffLog.title': 'Network Difference Log',
    'diffLog.desc': 'Comparison complete. Here are the structural differences between Map A and Map B.',
    'diffLog.onlyInA': 'Only in Map A',
    'diffLog.onlyInB': 'Only in Map B',
    'diffLog.cost': 'Cost',
    'diffLog.none': 'None',
    'diffLog.close': 'Close',
    'diffLog.showOnMap': 'Show on Map',

    'app.mapA': 'Map A',
    'app.mapB': 'Map B',
    'app.mapBoth': 'Map A & B',
    'legend.title': 'Legend',
    'legend.mapAOnly': 'Only in Map A',
    'legend.mapBOnly': 'Only in Map B',
    'legend.bothMaps': 'In Both Maps',
    'legend.mapAFile': 'Map A: {file}',
    'legend.mapBFile': 'Map B: {file}'
  },
  he: {
    'app.title': 'PathFinder Pro',
    'app.importCsv': '(CSV) ייבוא רשת',
    'app.start': 'נקודת מוצא',
    'app.destination': 'נקודת יעד',
    'app.requiredWaypoints': 'תחנות מעבר',
    'app.selectPoint': 'בחר נקודה...',
    'app.calculationParameters': 'הגדרות חישוב',
    'app.maxRoutes': 'הגבלת מסלולים',
    'app.calculate': 'מצא מסלולים',
    'app.newTab': 'מפה חדשה',
    'app.newTabClear': 'מפה חדשה (איפוס נתונים)',
    'app.newTabDuplicate': 'מפה חדשה (שמירת נתונים)',
    'app.mainMap': 'מפה ראשית',
    'app.isolatedRouteView': 'תצוגת מסלול בודד',
    'app.mapBRouteView': 'תצוגת מסלול - מפה ב׳',
    'app.noPathFound': 'לא נמצא מסלול',
    'app.noPathDesc': 'לא נמצא חיבור זמין בין הנקודות שנבחרו.',
    'app.noPathMapB': 'לא נמצא מסלול במפה ב׳',
    'app.legend': 'מקרא',
    'app.optimalRoute': 'מסלול אופטימלי',
    'app.alternativeRoute': 'מסלול חלופי',
    'app.emptyState': 'יש לחשב מסלולים כדי לראות את התוצאות.',
    'map.showingRoute': 'מסלול מוצג',
    'map.likelyFiber': 'ככה"נ סיב',
    'map.likelyRF': 'ככה"נ RF',
    'map.canceled': 'נותק',
    'isolated.showing': 'מציג',
    'isolated.of': 'מתוך',
    'isolated.optimalRoutes': 'מסלולים אופטימליים',
    'isolated.route': 'מסלול',
    'isolated.cost': 'עלות',
    'isolated.totalCost': 'עלות כוללת',
    'isolated.minHops': 'מינימום קפיצות',
    'isolated.hopsCount': 'קפיצות',
    'sidepanel.foundRoutes': 'נמצאו {count} מסלולים אפשריים',
    'sidepanel.routesTooltip': 'נמצאו למעלה מ-3 מסלולים. ניתן לברור ביניהם בתפריט שעל גבי המפה.',
    'columnMapper.title': 'הגדרת עמודות',
    'columnMapper.helper': 'נא להגדיר את מספרי העמודות בקובץ שהועלה, כדי שהמערכת תדע היכן לחפש את הנתונים.',
    'columnMapper.startCol': 'עמודת מוצא',
    'columnMapper.endCol': 'עמודת יעד',
    'columnMapper.costCol': 'עמודת עלות',
    'columnMapper.unknown': 'לא ידוע',
    'columnMapper.cancel': 'ביטול',
    'columnMapper.apply': 'החל והצג רשת',
    'sidepanel.results': 'תוצאות החישוב',
    'sidepanel.route': 'מסלול',
    'sidepanel.totalCost': 'עלות כוללת',
    'sidepanel.hops': 'קפיצות',
    'sidepanel.pathDetails': 'פירוט מסלול',
    'sidepanel.emptyState': 'יש לחשב מסלולים כדי לראות את התוצאות.',
    'sidepanel.networkControls': 'ניהול רשת',
    'sidepanel.importFirst': 'יש לייבא קובץ רשת (CSV) כדי להשתמש בכלי ניהול הרשת.',
    'sidepanel.compareMap': 'השוואת רשתות',
    'sidepanel.pathfinding': 'איתור מסלולים',
    'sidepanel.sourceNode': 'נקודת מוצא',
    'sidepanel.destNode': 'נקודת יעד',
    'sidepanel.calcRoute': 'מצא מסלול',
    'sidepanel.cancellationLedger': 'ניתוקי קווים',
    'sidepanel.cancelSelected': 'נתק קווים מסומנים',
    'sidepanel.noCancelled': 'אין קווים מנותקים.',
    'sidepanel.manualEdges': 'חיבורים יזומים',
    'sidepanel.addEdge': 'הוסף חיבור',
    'sidepanel.cost': 'עלות',
    'sidepanel.from': 'מ-',
    'sidepanel.to': 'ל-',
    'sidepanel.disableEdge': 'נתק קו',
    'sidepanel.compareTooltip': 'העלה קובץ CSV נוסף על מנת לצפות בהבדלים מבניים בין הרשתות.',
    'sidepanel.pathfindingTooltip': 'בחר נקודות מוצא ויעד על מנת לחשב מסלולים אופטימליים.',
    'sidepanel.ledgerTooltip': 'מאפשר ניתוק קווים כדי לאלץ עיקופים במסלול. לחץ על קו במפה או על כפתור (+) כדי לנתק אותו.',
    'sidepanel.manualTooltip': 'מאפשר יצירת קווים חדשים על מנת לדמות שדרוגים עתידיים ברשת.',
    'app.keepMapA': 'מחק מפה זו',
    'app.keepMapB': 'מחק את מפה א׳ (השאר מפה זו)',

    'diffLog.title': 'דוח השוואת רשתות',
    'diffLog.desc': 'ההשוואה הושלמה. להלן ההבדלים המבניים בין מפה א׳ למפה ב׳.',
    'diffLog.onlyInA': 'רק במפה א׳',
    'diffLog.onlyInB': 'רק במפה ב׳',
    'diffLog.cost': 'עלות',
    'diffLog.none': 'אין',
    'diffLog.close': 'סגור',
    'diffLog.showOnMap': 'הצג על המפה',

    'app.mapA': 'מפה א׳',
    'app.mapB': 'מפה ב׳',
    'app.mapBoth': 'מפה א׳ ו-ב׳',
    'legend.title': 'מקרא',
    'legend.mapAOnly': 'רק במפה א׳',
    'legend.mapBOnly': 'רק במפה ב׳',
    'legend.bothMaps': 'בשתי המפות',
    'legend.mapAFile': 'מפה א׳: {file}',
    'legend.mapBFile': 'מפה ב׳: {file}'
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('he');

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
