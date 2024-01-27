// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

/**
 * Gets string with characters by count.
 * 
 * @param {string} char String with the character.
 * @param {number} cnt Count of the characters. 
 * @returns Returns string with characters.
 */
const getCharsByCount = (char, cnt) => char?.repeat(cnt || 1);

/**
 * Gets string with fixed size by number.
 * 
 * @param {number} num Number for padding.
 * @param {number} size Number of charachers of the result.
 * @returns Returns string with target size.
 */
const padNumber = (num, size) => {
    const result = num + '';
    const diff = (size || 2) - result.length;

    return (diff ? getCharsByCount('0', diff) : '') + result;
};

/**
 * Exports primary functions.
 */
export {
    getCharsByCount,
    padNumber
};
