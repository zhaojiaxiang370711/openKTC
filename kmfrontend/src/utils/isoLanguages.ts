import { alpha2ToAlpha3B, getAlpha3BCode, getName, getNames, registerLocale } from '@karaokemugen/i18n-iso-languages';
import en from '@karaokemugen/i18n-iso-languages/langs/en.json';
import zh from '@karaokemugen/i18n-iso-languages/langs/zh.json';
import countries from 'i18n-iso-countries';
import countries_en from 'i18n-iso-countries/langs/en.json';
import countries_zh from 'i18n-iso-countries/langs/zh.json';

import i18next from 'i18next';

import { nonLatinLanguages } from '../../../src/lib/utils/langs';

countries.registerLocale(countries_en);
countries.registerLocale(countries_zh);

registerLocale(en);
registerLocale(zh);

export const supportedLanguages = ['zh-Hans', 'en'];

export function normalizeSupportedLanguage(code?: string): string {
	const normalized = code?.replace('_', '-').toLowerCase();
	if (!normalized) return 'zh-Hans';
	if (normalized.startsWith('zh')) return 'zh-Hans';
	const shortCode = normalized.substring(0, 2);
	return supportedLanguages.includes(shortCode) ? shortCode : 'zh-Hans';
}

function toIsoLocale(code?: string): string {
	return normalizeSupportedLanguage(code) === 'zh-Hans' ? 'zh' : normalizeSupportedLanguage(code);
}

const navigatorLanguage: string = navigator.languages?.[0] || navigator.language;
export const langSupport = normalizeSupportedLanguage(navigatorLanguage);

export const langWithRomanization = nonLatinLanguages;

export function getListLanguagesInLocale(userLang: string): { value: string; label: string }[] {
	const result = [];
	const isoLocale = toIsoLocale(userLang);
	const langs = Object.values(getNames(isoLocale));
	for (const langInLocale of langs) {
		result.push({ value: getAlpha3BCode(langInLocale, isoLocale), label: langInLocale });
	}
	result.push({ value: 'qro', label: i18next.t('LANGUAGES.QRO') });
	return result;
}

export function getLanguagesInLocaleFromCode(code: string, userLang: string) {
	if (code === 'qro') return i18next.t('LANGUAGES.QRO');
	if (code === 'zh-Hans') return getName('zh', toIsoLocale(userLang));
	return getName(code, toIsoLocale(userLang));
}

export function getLanguagesInLangFromCode(code: string) {
	if (code === 'zh-Hans') return getName('zh', 'zh');
	return getName(code, code);
}

export function getLanguageIn3B(code) {
	const normalized = normalizeSupportedLanguage(code);
	return normalized === 'zh-Hans' ? alpha2ToAlpha3B('zh') : alpha2ToAlpha3B(normalized);
}

export function getDayjsLocaleFromCode(code?: string): string {
	const normalized = normalizeSupportedLanguage(code);
	return normalized === 'zh-Hans' ? 'zh-cn' : normalized;
}

export function listCountries(userLang: string): { value: string; label: string }[] {
	const listCountries = [];
	for (const [key, value] of Object.entries(countries.getNames(toIsoLocale(userLang)))) {
		listCountries.push({ value: key, label: value });
	}
	return listCountries;
}

export function getCountryName(code: string, userLang: string): string | undefined {
	for (const [key, value] of Object.entries(countries.getNames(toIsoLocale(userLang || langSupport)))) {
		if (key === code) {
			return value as string;
		}
	}
	return undefined;
}
