// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import crypto from 'crypto';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { createGzip, createUnzip } from 'zlib';
import { log } from './log.mjs';
import AttachInitVect from './attachInitVect.mjs';
import StringWritable from './stringWritable.mjs';

class AESFileCryptor {
    
    /**
     * Contains symmetric algorithm of @see AESFileCryptor.
     */
    algorithm = 'aes256';

    /**
     * Initializes new instance of @see AESFileCryptor.
     * 
     * @param {string} password Password for the cipher key.
     */
    constructor(password) {
        this.cipherKey = this.#getCipherKey(password);
    }

    /**
     * Encrypts readable stream to target file.
     * 
     * @param {object} readStream Object with readable stream.
     * @param {string} tgtFile Path of the target file.
     */
    encryptStreamToFile = (readStream, tgtFile) =>
        new Promise((resolve) => {
            const initVect = crypto.randomBytes(16);
            const gzip = createGzip();
            const cipher = crypto.createCipheriv(this.algorithm, this.cipherKey, initVect);
            const attachInitVect = new AttachInitVect(initVect);
            const writeStream = createWriteStream(tgtFile);
    
            readStream
                .pipe(gzip)
                .pipe(cipher)
                .pipe(attachInitVect)
                .pipe(writeStream);
    
            writeStream.on('finish', resolve);
        });

    /**
     * Encrypts source to target file.
     * 
     * @param {string} srcFile Path of the source file.
     * @param {string} tgtFile Path of the target file.
     */
    async encryptFileToFile(srcFile, tgtFile) {
        if (this.#fileExists(srcFile)) {
            const readStream = this.#getReadStream(srcFile);

            await this.encryptStreamToFile(readStream, tgtFile);
        }
    }

    /**
     * Encrypts JSON data to target file.
     * 
     * @param {object} json Object with JSON data.
     * @param {string} tgtFile Path of the target file.
     */
    async encryptJsonToFile(json, tgtFile) {
        const readStream = new Readable();

        readStream.push(JSON.stringify(json));
        readStream.push(null);

        await this.encryptStreamToFile(readStream, tgtFile);
    }

    /**
     * Decrypts source file to writeable stream.
     * 
     * @param {string} srcFile Path of the source file.
     * @param {object} writeStream Object with writeable stream.
     */
    decryptFileToStream = (srcFile, writeStream) =>
        new Promise((resolve) => {
            if (existsSync(srcFile)) {
                this.#getBytes(srcFile, { end: 15 }, initVect => {
                    const readStream = this.#getReadStream(srcFile, { start: 16 });
                    const decipher = crypto.createDecipheriv(this.algorithm, this.cipherKey, initVect);
                    const unzip = createUnzip();

                    readStream
                        .pipe(decipher)
                        .on('error', () => {
                            log('Incorrect password');
                            
                            readStream.destroy();
                        })
                        .pipe(unzip)
                        .on('error', () => {})
                        .pipe(writeStream);

                    writeStream.on('finish', resolve);
                });
            } else {
                resolve();
            }
        });

    /**
     * Decrypts source to target file.
     * 
     * @param {string} srcFile Path of the source file.
     * @param {string} tgtFile Path of the target file.
     */
    async decryptFileToFile(srcFile, tgtFile) {
        const writeStream = createWriteStream(tgtFile);

        await this.decryptFileToStream(srcFile, writeStream);
    }

    /**
     * Decrypts source file to JSON object.
     * 
     * @param {string} srcFile Path of the source file.
     * @returns Object with JSON data.
     */
    async decryptFileToJson(srcFile) {
        const writeStream = new StringWritable();

        await this.decryptFileToStream(srcFile, writeStream);

        const data = writeStream.data;

        return data && JSON.parse(data);
    }

    /**
     * Validates whether file exists.
     * 
     * @param {string} file Path of the file.
     * @returns Returns true if the path exists.
     */
    #fileExists(file) {
        if (existsSync(file)) return true;

        log(`File '${file}' not found`);
    }

    /**
     * Reads bytes of file by options and executes callback.
     * 
     * @param {string} file Path of the file.
     * @param {options} options Object with options for the readable stream.
     * @param {function} cb Callback function with data response.
     */
    #getBytes(file, options, cb) {
        let result;

        const readStream = this.#getReadStream(file, options);

        readStream.on('data', chunk => result = chunk);
        readStream.on('close', () => cb(result));
    } 

    /**
     * Gets cipher key by @see string with password.
     * 
     * @param {string} password The password for cipher key.
     * @returns Returns the final @see string as cipher key.
     */
    #getCipherKey = (password) => crypto.createHash('sha256').update(password).digest();

    /**
     * Gets readable stream of file. 
     * 
     * @param {string} file Path of the file.
     * @param {object} options Object with options for the readable stream.
     * @returns Returns @see object with readable stream.
     */
    #getReadStream = (file, options) => createReadStream(file, options);
}

/**
 * Exports @see AESFileCryptor as default class.
 */
export default AESFileCryptor;
