// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {combineReducers} from 'redux';

import {generateUtcLabel} from 'utils/timezone_utils';

import {GeneralTypes, UserTypes} from 'action_types';

function config(state = {}, action) {
    switch (action.type) {
    case GeneralTypes.CLIENT_CONFIG_RECEIVED:
        return Object.assign({}, state, action.data);
    case GeneralTypes.CLIENT_CONFIG_RESET:
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function appState(state = false, action) {
    switch (action.type) {
    case GeneralTypes.RECEIVED_APP_STATE:
        return action.data;

    default:
        return state;
    }
}

function credentials(state = {}, action) {
    switch (action.type) {
    case GeneralTypes.RECEIVED_APP_CREDENTIALS:
        return Object.assign({}, state, action.data);

    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function dataRetentionPolicy(state = {}, action) {
    switch (action.type) {
    case GeneralTypes.RECEIVED_DATA_RETENTION_POLICY:
        return action.data;
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function deviceToken(state = '', action) {
    switch (action.type) {
    case GeneralTypes.RECEIVED_APP_DEVICE_TOKEN:
        return action.data;
    default:
        return state;
    }
}

function license(state = {}, action) {
    switch (action.type) {
    case GeneralTypes.CLIENT_LICENSE_RECEIVED:
        return action.data;
    case GeneralTypes.CLIENT_LICENSE_RESET:
    case UserTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function timezones(state = [], action) {
    switch (action.type) {
    case GeneralTypes.SUPPORTED_TIMEZONES_RECEIVED:
        return prepareTimezones(action.data).sort(sortTimezones);
    case UserTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}

type Timezone = {
    offset: number;
    is_dst: boolean;
    group: string;
    utc: string[];
    label?: string;
}

function prepareTimezones(data: Timezone[]): Timezone[] {
    console.log('!!!prepareTimezones!!!')
    return data.map((timezone) => {
        const tz = moment.tz(timezone.utc[0]);
        const offset = tz.utcOffset() / 60;
        const isDST = tz.isDST();

        return {
            ...timezone,
            offset: tz.utcOffset() / 60,
            is_dst: tz.isDST(),
            label: generateUtcLabel(timezone.group, offset, isDST),
        };
    });
}

function sortTimezones(a, b) {
    if (a.offset != b.offset) {
        return a.offset - b.offset
    } else {
        var groupA = a.group.toLowerCase();
        var groupB = b.group.toLowerCase();
        if (groupA < groupB) {
            return -1;
        }
        if (groupA > groupB) {
            return 1;
        }
    
        return 0;
    }
};

function serverVersion(state = '', action) {
    switch (action.type) {
    case GeneralTypes.RECEIVED_SERVER_VERSION:
        return action.data;
    case UserTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

export default combineReducers({
    appState,
    credentials,
    config,
    dataRetentionPolicy,
    deviceToken,
    license,
    serverVersion,
    timezones,
});
