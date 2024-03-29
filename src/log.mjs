// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import { getLocaleISOString } from './dateTimeUtils.mjs';
import { getCharsByCount } from './stringUtils.mjs';

/**
 * Writes output message to the global logger.
 * 
 * @param {string} message String with the output message.
 */
const log = (message) => {
    const localeIsoDate = getLocaleISOString(new Date());
    const prefix = localeIsoDate + getCharsByCount(' ', 4);

    global.logger?.log(prefix + message);
};

/**
 * Sets logger to global scope.
 * 
 * @param {object} logger Instance of the logger.
 */
const setLogger = (logger) => {
    global.logger = logger;
};

/**
 * Exports primary functions.
 */
export {
    log,
    setLogger
};
