// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import { createHash, randomFillSync } from 'crypto';
import { createReadStream } from 'fs';
import { v4 as uuidv4, NIL as NIL_UUID } from 'uuid';

/**
 * Contains @see string with default password characters.
 */
const defaultChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!$%&?';

/**
 * Generates a fixed-size hash value of readable file stream.
 * 
 * @param {string} fileName File name for the readable stream.
 * @param {string} algorithm Cryptographic function to calculate hash.
 * @returns Returns string with calculated hash.
 */
const calcFileHash = (fileName, algorithm = 'sha256') =>
    new Promise((resolve, reject) => {
        const hashSum = createHash(algorithm);

        try {
            const stream = createReadStream(fileName);
    
            stream.on('data', data => hashSum.update(data));
            
            stream.on('end', () => resolve(hashSum.digest('hex')));
        } catch {
            reject();
        }
    });

/**
 * Generates random password by parameters.
 * 
 * @param {number} length Number with final password length.
 * @param {string} chars String with password characters.
 * @returns Returns string with generated password.
 */
const generatePwd = (length = 48, chars = defaultChars) =>
    Array.from(randomFillSync(new Uint32Array(length)))
        .map(x => chars[x % chars.length])
        .join('');

/**
 * Generates universally unique identifier.
 * 
 * @param {string} value String with static UUID.
 * @returns Returns string with generated UUID.
 */
const getUuid = (value) => (value || uuidv4())
    .replaceAll('-', '').toUpperCase();

/**
 * Gets empty UUID.
 * 
 * @returns Returns string with empty UUID.
 */
const getNilUuid = () => getUuid(NIL_UUID);

/**
 * Exports primary functions.
 */
export {
    calcFileHash,
    generatePwd,
    getUuid,
    getNilUuid
};
