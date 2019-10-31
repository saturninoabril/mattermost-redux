// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {UserTimezone} from 'types/users';
export function getUserCurrentTimezone(userTimezone?: UserTimezone): string | undefined | null {
    if (!userTimezone) {
        return null;
    }
    const {
        useAutomaticTimezone,
        automaticTimezone,
        manualTimezone,
    } = userTimezone;

    let useAutomatic = useAutomaticTimezone;
    if (typeof useAutomaticTimezone === 'string') {
        useAutomatic = useAutomaticTimezone === 'true';
    }

    if (useAutomatic) {
        return automaticTimezone;
    }
    return manualTimezone;
}

export function getTimezoneRegion(timezone: string): string {
    if (timezone) {
        const split = timezone.split('/');
        if (split.length > 1) {
            return split.pop()!.replace(/_/g, ' ');
        }
    }

    return timezone;
}

export function generateUtcLabel(text: string, offset: number, isDST: boolean): string {
    let prefix = '';

    const hour = Math.floor(offset)
    const minute = Math.abs(offset % 1);

    if (offset === 0) {
        prefix = '(UTC)';
    } else {
        let hourText;
        if (hour >= 10) {
            hourText = '+' + hour;
        } else if (hour > 0) {
            hourText = '+0' + hour;
        } else if (hour > -10) {
            hourText = '-0' + Math.abs(hour);
        } else {
            hourText = hour;
        }
    
        prefix = `(UTC${hourText}:${minute === 0 ? '00' : (minute * 60).toFixed(0)})`;
    }

    return `${prefix} ${text}${isDST ? ' - DST' : ''}`;
}
