// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import { padNumber } from './stringUtils.mjs';

/**
 * Gets ISO string of DateTime with locale timezone offset.
 * 
 * @param {Date} date Instance with date and time.
 * @returns Returns ISO formatted string with date, time and timezone offset.
 */
const getLocaleISOString = (date) => {
    const ofst = -date.getTimezoneOffset();
    const sign = ofst >= 0 ? '+' : '-';

    const parts = [
        { val: date.getFullYear(), pad: false },
        { val: date.getMonth() + 1, pre: '-' },
        { val: date.getDate(), pre: '-' },
        { val: date.getHours(), pre: 'T' },
        { val: date.getMinutes(), pre: ':' },
        { val: date.getSeconds(), pre: ':' },
        { val: date.getMilliseconds(), pre: '.', pad: 3 },
        { val: Math.floor(Math.abs(ofst) / 60), pre: sign },
        { val: Math.abs(ofst) % 60 }
    ];

    return parts.map(({ val, pre, pad }) => 
        (pre || '') + (pad === false ? val : padNumber(val, !isNaN(pad) ? pad : 2))
    ).join('');
};

/**
 * Exports primary functions.
 */
export {
    getLocaleISOString
};
