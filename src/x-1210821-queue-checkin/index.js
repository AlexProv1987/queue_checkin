//https://developer.servicenow.com/dev.do#!/reference/next-experience/yokohama/now-components/now-button/overview#slots
//https://github.com/ServiceNowDevProgram/now-experience-component-examples/blob/quebec/src/checklist-example/example-checklist/actions.js

import { createCustomElement, actionTypes, declarativeOperations } from '@servicenow/ui-core';
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import '@servicenow/now-button';
import '@servicenow/now-loader';
import '@servicenow/now-alert';
import '@servicenow/now-icon';
import '@servicenow/now-card';
import styles from './styles.scss';
import { createHttpEffect } from '@servicenow/ui-effect-http';

//I am opting to not save the user in state or props currently as I dont want a re render. - i havnt found the equilivant of a ref for react yet that doesnt cause a re render.

const view = (state, { updateState, dispatch }) => {

	const { items, user, loadingItems, errors } = state;

	return (
		<main>
			<div className="header">
				<div className='header__title'>My Queue Capacity</div>
			</div>
			<div>
				{loadingItems ? (
					<now-loader />
				) : (
					<div className="card-grid">
						{items.map((item, index) => (
							<now-card size="sm" key={index}>
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
										tooltip-content="Select Capacity"
										select="single"
										config-label={{ label: 'Capacity' }}
										config-aria={{
											trigger: { 'aria-label': 'Select an item' },
											panel: { 'aria-label': 'Assigned to' }
										}}
										items={[
											{ id: '0', label: '0' },
											{ id: '1', label: '1' },
											{ id: '2', label: '2' },
											{ id: '3', label: '3' },
											{ id: '4', label: '4' },
											{ id: '5', label: '5' }
										]}
										selected-items={[String(item.max_capacity ?? 1)]}
										on-change={(e) =>
											dispatch('UPDATE_CAPACITY', {
												index,
												value: Number(e.detail.selectedItems[0])
											})
										}
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
			<div style={{paddingTop:'10px'}}>
				<now-button
					size='md'
					variant='primary'
					label='Submit'
			/*this by default calls the now_button#clicked action handler*/ />
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
		errors: null,
		items: null,
		loadingItems: true,
	},

	actionHandlers: {
		//runs on mount
		[actionTypes.COMPONENT_BOOTSTRAPPED]: ({ dispatch }) => {
			dispatch('HTTP_FETCH_USER');
		},

		'UPDATE_CAPACITY': ({ action, state, updateState }) => {
			const { index, value } = action.payload;
			const updated = state.items.map((item, i) =>
				i === index ? { ...item, max_capacity: value } : item
			);
			updateState({ items: updated });
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

		FETCH_USER_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			const msg = action.payload?.error?.message || 'Request failed';
			updateState({ loadingUsers: false, usersError: msg });
		},


		//default onclick event for now-button
		'NOW_BUTTON#CLICKED': ({ dispatch }) => {
			console.log('clicked btn')
			dispatch('HTTP_FETCH_ITEMS', {
				sysparm_limit: 10,
				sysparm_query: 'active=true'
			});
		},

		HTTP_FETCH_ITEMS: createHttpEffect('/api/now/table/awa_agent_capacity', {
			method: 'GET',
			queryParams: ['sysparm_query', 'sysparm_display_value'],
			successActionType: 'HTTP_FETCH_ITEMS_SUCCESS',
			errorActionType: 'HTTP_FETCH_ITEMS_ERROR'
		}),

		HTTP_FETCH_ITEMS_SUCCESS: ({ action, updateState }) => {
			console.log('results array:', action.payload.result)
			updateState({ items: action.payload.result, loadingItems: false });
		},

		HTTP_FETCH_ITEMS_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			//updateState({ loading: false, error: action.payload?.error?.message || 'Request failed' });
		},

		//well test this tomorrow
		HTTP_CHECK_IN: createHttpEffect('/api/x_your_scope/queues/check_in', {
			method: 'POST',
			successActionType: 'HTTP_CHECK_IN_SUCCESS',
			errorActionType: 'HTTP_CHECK_IN_ERROR'
		}),

		HTTP_CHECK_IN_SUCCESS: ({ action, updateState }) => {
			console.log('results array:', action.payload.result)
			//updateState({ items: action.payload.result });
		},

		HTTP_CHECK_IN_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			//updateState({ loading: false, error: action.payload?.error?.message || 'Request failed' });
		},

		HTTP_CHECK_OUT: createHttpEffect('/api/x_your_scope/queues/check_out', {
			method: 'POST',
			successActionType: 'HTTP_CHECK_OUT_SUCCESS',
			errorActionType: 'HTTP_CHECK_OUT_ERROR'
		}),

		HTTP_CHECK_OUT_SUCCESS: ({ action, updateState }) => {
			console.log('results array:', action.payload.result)
			//updateState({ items: action.payload.result });
		},

		HTTP_CHECK_OUT_ERROR: ({ action, updateState }) => {
			console.log(action.payload?.error?.message || 'Request failed')
			//updateState({ loading: false, error: action.payload?.error?.message || 'Request failed' });
		},
	},
});
