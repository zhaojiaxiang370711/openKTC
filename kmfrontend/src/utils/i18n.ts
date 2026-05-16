import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import zhHans from '../locales/zh-Hans.json';

i18n
	// use react-i18next
	// doc: https://react.i18next.com/
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		load: 'languageOnly',
		lng: 'zh-Hans',
		fallbackLng: ['en'],
		supportedLngs: ['zh', 'zh-Hans', 'en'],
		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		},
		resources: {
			en: {
				translation: en,
			},
			zh: {
				translation: zhHans,
			},
			'zh-Hans': {
				translation: zhHans,
			},
		},
	});

export default i18n;
