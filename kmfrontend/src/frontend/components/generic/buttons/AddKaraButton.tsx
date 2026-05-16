import i18next from 'i18next';
import { useContext } from 'react';

import { DBKara } from '../../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../../store/context';
import { commandBackend } from '../../../../utils/socket';
import { PLCCallback } from '../../../../utils/tools';
import { WS_CMD } from '../../../../utils/ws';

interface Props {
	kara: DBKara;
	scope: 'admin' | 'public';
	className?: string;
	labelKey?: string;
	onAdded?: () => void;
}

export default function AddKaraButton(props: Props) {
	const context = useContext(GlobalContext);

	const addKara = async () => {
		let response;
		try {
			response = await commandBackend(WS_CMD.ADD_KARA_TO_PUBLIC_PLAYLIST, {
				requestedby: context.globalState.auth.data.username,
				kids: [props.kara.kid],
			});
		} catch (_) {
			// already display
		}
		PLCCallback(response, context, props.kara, props.scope);
		if (response?.plc) props.onAdded?.();
	};

	return (
		<button
			type="button"
			onClick={addKara}
			className={['btn btn-action', props.className].filter(Boolean).join(' ')}
		>
			<i className="fas fa-plus" />
			<span>{i18next.t(props.labelKey ?? 'TOOLTIP_ADDKARA')}</span>
		</button>
	);
}
