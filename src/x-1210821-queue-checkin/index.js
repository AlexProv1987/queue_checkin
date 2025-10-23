//https://developer.servicenow.com/dev.do#!/reference/next-experience/yokohama/now-components/now-button/overview#slots
//https://github.com/ServiceNowDevProgram/now-experience-component-examples/blob/quebec/src/checklist-example/example-checklist/actions.js
//https://www.servicenow.com/community/next-experience-articles/component-and-data-resource-properties-in-ui-builder/ta-p/2331894
import { createCustomElement, actionTypes, declarativeOperations } from '@servicenow/ui-core';
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import '@servicenow/now-button';
import '@servicenow/now-loader';
import '@servicenow/now-alert';
import '@servicenow/now-icon';
import '@servicenow/now-card';
import '@servicenow/now-dropdown';
import styles from './styles.scss';
import { createHttpEffect } from '@servicenow/ui-effect-http';

const view = (state, { updateState, dispatch }) => {

	const { items, loadingItems, updating, message } = state;

	return (
		<main>
			<div className='page'>
				<div className='alert-wrapper'>
					{message && (
						<now-alert
							status={message.status}
							icon={message.icon}
							header={message.header}
							content={message.content}
							action={{ type: 'dismiss' }}
						/>
					)}
				</div>
				{/**error/success msgs here */}
				<div className="header">
					<div className="header__title">My Queue Capacity</div>

					<div className="header__actions">
						{updating || loadingItems ? (
							<now-loader />
						) : (
							<div>
								<now-button
									style={{ marginRight: '5px' }}
									tooltip-content="Save Changes"
									size="md"
									variant="primary"
									label="Submit"
									on-click={() => { updateState({ updating: true }), dispatch('HTTP_SUBMIT') }}
								/>
								<now-button
									style={{ marginRight: '5px' }}
									tooltip-content="Reset to default for all queues"
									size="md"
									variant="primary"
									label="Reset"
									on-click={() => { updateState({ updating: true }), dispatch('HTTP_RESET') }}
								/>
								<now-button
									style={{ marginRight: '5px' }}
									tooltip-content="Sets all queues to 0 Capacity"
									size="md"
									variant="primary"
									label="Check Out"
									on-click={() => { updateState({ updating: true }), dispatch('HTTP_CHECK_OUT') }}
								/>
							</div>
						)}
					</div>
				</div>
				<div>
					{loadingItems ? (
						<now-loader />
					) : (
						<div className="card-grid">
							{items.map((item, index) => (
								<now-card size="lg" key={index}>
									<now-card-header
										style={{ marginTop: '10px' }}
										tagline={{ icon: 'document-outline', label: 'Queue' }}
										heading={{ label: item.channel.display_value, size: 'md', }} />
									<now-card-divider full-width />
									<div
										style={{
											display: 'flex',
											justifyContent: 'center',
											alignItems: 'center',
											padding: '5px 0'
										}}
									>
										<now-dropdown
											disabled={updating ? true : false}
											id={item.sys_id}
											tooltip-content="Select Capacity"
											select="single"
											config-label={{ label: 'Capacity' }}
											config-aria={{
												trigger: { 'aria-label': 'Select an item' },
												panel: { 'aria-label': 'Assigned to' }
											}}
											items={[0, 1, 2, 3, 4, 5].map(capacity => ({ id: `${item.sys_id}|${capacity}`, label: String(capacity) }))}
											selected-items={[`${item.sys_id}|${item.max_capacity}`]}
											manage-selected-items
											style={{
												width: '80%',
												margin: '8px 0',
												'--now-dropdown-min-width': '100%'
											}}
										></now-dropdown>
									</div>
									<now-card-divider full-width />
									<now-card-footer label={{ start: 'Last Updated', end: `${item.sys_updated_on}` }} />
								</now-card>

							))}
						</div>
					)}
				</div>
			</div>
		</main>
	)
};

createCustomElement('x-1210821-queue-checkin', {
	renderer: { type: snabbdom },
	view,
	styles,
	initialState: {
		user: null,
		message: null,
		items: null,
		loadingItems: true,
		updating: false,
	},
	actionHandlers: {

		[actionTypes.COMPONENT_BOOTSTRAPPED]: ({ dispatch }) => {
			dispatch('HTTP_FETCH_USER');
		},

		'NOW_ALERT#ACTION_CLICKED': ({ action, updateState }) => {
			updateState({ message: null })
		},

		HTTP_FETCH_USER: createHttpEffect('api/now/ui/user/current_user', {
			method: 'GET',
			successActionType: 'FETCH_USER_SUCCESS',
			errorActionType: 'FETCH_USER_ERROR'
		}),

		FETCH_USER_SUCCESS: ({ action, dispatch, updateState }) => {
			console.log('users result:', action.payload);
			/**
			 * {result: {
				"user_avatar": "a5d3c898c3222010ae17dd981840dd8b.iix?t=small",
				"user_sys_id": "6816f79cc0a8016401c5a33be04be441",
				"user_name": "admin",
				"user_display_name": "System Administrator",
				"user_initials": "SA"
				}}
			 */
			//operation required to set shouldRender to false per docs
			updateState({
				user: action.payload.result,
				operation: declarativeOperations.ASSIGN,
				shouldRender: false
			})

			dispatch('HTTP_FETCH_ITEMS', {
				sysparm_query: `user=${action.payload.result.user_sys_id}`,
				sysparm_display_value: true,
			})
		},

		FETCH_USER_ERROR: ({ action, updateState, }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			const msg = action.payload?.error?.message || 'Request failed';
			updateState({ loadingUsers: false, message: { status: 'critical', icon: 'circle-exclamation-fill', content: 'Error Occured During Fetch User' } });
		},

		'NOW_DROPDOWN#SELECTED_ITEMS_SET': ({ action, updateState, state }) => {
			const payload = action.payload?.value?.[0];

			if (!payload)
				return

			const [sys_id, valueStr] = payload.split('|');
			const value = valueStr;

			if (!sys_id || !value)
				return;

			const items = state.items.map((item) =>
				item.sys_id === sys_id ? { ...item, max_capacity: value } : item
			);

			updateState({ items });
		},

		HTTP_FETCH_ITEMS: createHttpEffect('/api/now/table/awa_agent_capacity', {
			method: 'GET',
			queryParams: ['sysparm_query', 'sysparm_display_value'],
			successActionType: 'HTTP_FETCH_ITEMS_SUCCESS',
			errorActionType: 'HTTP_FETCH_ITEMS_ERROR'
		}),

		HTTP_FETCH_ITEMS_SUCCESS: ({ action, updateState }) => {
			updateState({ items: action.payload.result, loadingItems: false });
		},

		HTTP_FETCH_ITEMS_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			updateState({ message: { status: 'critical', icon: 'circle-exclamation-fill', content: 'Error Occured During Fetch Items' } })
		},

		HTTP_SUBMIT: createHttpEffect('/api/1210821/queue_management/update_capacity', {
			method: 'POST',
			successActionType: 'HTTP_SUBMIT_SUCCESS',
			errorActionType: 'HTTP_SUBMIT_ERROR'
		}),

		HTTP_SUBMIT_SUCCESS: ({ action, updateState }) => {
			console.log('results array:', action.payload.result)
			updateState({ updating: false, message: { status: 'positive', icon: 'check-fill', content: 'Updated Succesfully!' } })
			//updateState({ items: action.payload.result });
		},

		HTTP_SUBMIT_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			updateState({ updating: false, message: { status: 'critical', icon: 'circle-exclamation-fill', content: 'Error Occured During Submit' } })
			//updateState({ loading: false, error: action.payload?.error?.message || 'Request failed' });
		},

		HTTP_CHECK_OUT: createHttpEffect('/api/x_your_scope/queues/check_out', {
			method: 'POST',
			successActionType: 'HTTP_CHECK_OUT_SUCCESS',
			errorActionType: 'HTTP_CHECK_OUT_ERROR'
		}),

		HTTP_CHECK_OUT_SUCCESS: ({ action, updateState }) => {
			console.log('results array:', action.payload.result)
			updateState({ updating: false, message: { status: 'positive', icon: 'check-fill', content: 'Updated Succesfully!' } })
			//updateState({ items: action.payload.result });
		},

		HTTP_CHECK_OUT_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			updateState({ updating: false, message: { status: 'critical', icon: 'circle-exclamation-fill', content: 'Error Occured During Check Out' } })
			//updateState({ loading: false, error: action.payload?.error?.message || 'Request failed' });
		},

		HTTP_RESET: createHttpEffect('/api/x_your_scope/queues/check_out', {
			method: 'POST',
			successActionType: 'HTTP_RESET_SUCCESS',
			errorActionType: 'HTTP_RESET_ERROR'
		}),

		HTTP_RESET_SUCCESS: ({ action, updateState }) => {
			console.log('results array:', action.payload.result)
			updateState({ updating: false, message: { status: 'positive', icon: 'check-fill', content: 'Updated Succesfully!' } })
			//updateState({ items: action.payload.result });
		},

		HTTP_RESET_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			updateState({ updating: false, message: { status: 'critical', icon: 'circle-exclamation-fill', content: 'Error Occured During Reset' } })
			//updateState({ loading: false, error: action.payload?.error?.message || 'Request failed' });
		},
	},
});
