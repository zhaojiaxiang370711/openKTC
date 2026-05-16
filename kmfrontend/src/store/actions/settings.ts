import * as Sentry from '@sentry/react';
import i18next from 'i18next';
import { Dispatch } from 'react';

import { User } from '../../../../src/lib/types/user';
import { Config } from '../../../../src/types/config';
import { PublicState, Version } from '../../../../src/types/state';
import { getDayjsLocaleFromCode, langSupport, normalizeSupportedLanguage } from '../../utils/isoLanguages';
import { commandBackend } from '../../utils/socket';
import { LogoutUser } from '../types/auth';
import { Settings, SettingsFailure, SettingsSuccess } from '../types/settings';
import { logout } from './auth';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { WS_CMD } from '../../utils/ws';

export async function setSettings(
	dispatch: Dispatch<SettingsSuccess | SettingsFailure>,
	withoutProfile?: boolean,
	tryAgain = false
): Promise<void> {
	try {
		const res: {
			version: Version;
			config: Config;
			state: PublicState;
		} = await commandBackend(WS_CMD.GET_SETTINGS);
		dayjs.extend(localizedFormat);
		dayjs.extend(relativeTime);
		if (!withoutProfile) {
			try {
				if (!res.config.System) {
					res.config.System = { Repositories: await commandBackend(WS_CMD.GET_REPOS) } as Config['System'];
				}
				const user: User = await commandBackend(WS_CMD.GET_MY_ACCOUNT);
				const favorites = await commandBackend(WS_CMD.GET_FAVORITES_MICRO);
				const favoritesSet = new Set<string>();
				for (const kara of favorites) {
					favoritesSet.add(kara.kid);
				}
				const defaultLanguage = normalizeSupportedLanguage(res.config.App?.Language || langSupport);
				const newLanguage = normalizeSupportedLanguage(
					user.language && user.type < 2 ? user.language : defaultLanguage
				);
				i18next.changeLanguage(newLanguage);
				dayjs.locale(getDayjsLocaleFromCode(newLanguage));
				if (!user.language && user.type < 2) {
					user.language = defaultLanguage;
					try {
						await commandBackend(WS_CMD.EDIT_MY_ACCOUNT, user);
					} catch (_) {
						// already display
					}
				}
				setSentry(res.state, res.version, res.config, user);
				dispatch({
					type: Settings.SETTINGS_SUCCESS,
					payload: {
						state: res.state,
						config: res.config,
						user: user,
						favorites: favoritesSet,
						version: res.version,
					},
				});
			} catch (_) {
				logout(dispatch as unknown as Dispatch<SettingsSuccess | SettingsFailure | LogoutUser>);
			}
		} else {
			const defaultLanguage = normalizeSupportedLanguage(res.config.App?.Language || langSupport);
			i18next.changeLanguage(defaultLanguage);
			dayjs.locale(getDayjsLocaleFromCode(defaultLanguage));
			dispatch({
				type: Settings.SETTINGS_SUCCESS,
				payload: { state: res.state, config: res.config, user: {}, favorites: new Set(), version: res.version },
			});
		}
	} catch (error: any) {
		dispatch({
			type: Settings.SETTINGS_FAILURE,
			payload: {
				error: error,
			},
		});
		if (tryAgain) {
			throw error;
		} else {
			return setSettings(dispatch, withoutProfile, true);
		}
	}
}

function setSentry(state: PublicState, version: Version, config: Config, user: User) {
	if (!state.sentrytest && config.Online?.ErrorTracking) {
		Sentry.init({
			dsn: state.sentrydsn,
			environment: state.environment || 'release',
			release: version.number,
			ignoreErrors: [
				'Network Error',
				'Request failed with status code',
				'Request aborted',
				'ResizeObserver loop limit exceeded',
				'ResizeObserver loop completed with undelivered notifications',
				/.*[n|N]o space left on device.*/,
				'PLAYLIST_MODE_ADD_SONG_ERROR_ALREADY_ADDED',
				'PLAYLIST_MODE_ADD_SONG_ERROR_QUOTA_REACHED',
				'DELETE_PLAYLIST_ERROR_CURRENT',
				'DELETE_PLAYLIST_ERROR_PUBLIC',
				'DELETE_PLAYLIST_ERROR_WHITELIST',
				'DELETE_PLAYLIST_ERROR_BLACKLIST',
			],
		});
		Sentry.getCurrentScope().setUser({ username: user?.login });
		if (version.sha) Sentry.getCurrentScope().setTag('commit', version.sha as string);
	}
}
