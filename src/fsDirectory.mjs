// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import path from 'path';
import AESFileCryptor from './aesFileCryptor.mjs';
import { getNilUuid } from './cryptoUtils.mjs';

class FSDirectory {

    /**
     * Default file name of @see FSDirectory.
     */
    defaultFileName = getNilUuid();

    /**
     * Array with dirents of @see FSDirectory.
     */
    dirents = [];

    /**
     * Array with files of @see FSDirectory.
     */
    files = [];

    /**
     * Gets object with dirents and files of @see FSDirectory.
     * 
     * @returns Object with dirents and files.
     */
    getEntries = () => ({
        dirents: this.dirents,
        files: this.files
    });

    /**
     * Gets array with obsolete dirents of @see FSDirectory.
     * 
     * @param {FSDirectory} directory Instance of @see FSDirectory.
     * @returns Returns array with obsolete dirents.
     */
    getObsoleteDirents = (directory) => directory.dirents
        .filter(dirent => !this.dirents.some(e => 
            e.path === dirent.path && e.fileId === dirent.fileId
        ));

    /**
     * Compares whether two arrays with dirents are equal.
     *
     * @param {Array} dirents Array with objects of dirents.
     * @returns Returns whether dirents are equal.
     */
    equals = (dirents) =>
        JSON.stringify(dirents) === JSON.stringify(this.dirents);

    /**
     * Finds dirents by path.
     * 
     * @param {string} path String with dirent path.
     * @returns Returns instance of dirent.
     */
    findDirent = (path) => this.dirents.find(dirent => dirent.path === path);

    /**
     * Adds dirent to list of @see FSDirectory.
     * 
     * @param {string} path String with relative path of dirent.
     * @param {string} fileId String with identifier of file.
     * @param {object} file Object with metadata of file.
     */
    addEntry(path, fileId, file) {
        this.dirents.push({ path, ...(fileId ? { fileId } : {}) });

        if (file) {
            this.files.push(file);
        }
    }

    /**
     * Finds file by object key.
     * 
     * @param {string} key String with the object key.
     * @param {string} value String with the value for comparison.
     * @returns Returns instance of file.
     */
    findFileByKey = (key, value) =>
        this.files.find(file => file[key] === value);

    /**
     * Finds file by identifier.
     * 
     * @param {string} fileId String with identifier of file.
     * @returns Returns instance of file.
     */
    findFileById = (fileId) =>
        this.findFileByKey('fileId', fileId);

    /**
     * Finds file by hash.
     * 
     * @param {string} fileHash String with the file hash.
     * @returns Returns instance of file.
     */
    findFileByHash = (fileHash) =>
        this.findFileByKey('fileHash', fileHash);

    /**
     * Loads dirents and files of @see FSDirectory.
     * 
     * @param {string} encDir String with encryption directory.
     * @param {string} pwd String with password for decryption.
     * @returns Returns object with dirents and files.
     */
    async loadEntries(encDir, pwd) {
        const [aesFileCryptor, srcFile] =
            this.#getAesFileCryptorAndFile(encDir, pwd);

        const entries = await aesFileCryptor.decryptFileToJson(srcFile);

        for (const key in entries) {
            this[key] = entries[key];
        }

        return this.getEntries();
    }

    /**
     * Saves dirents and files to file.
     * 
     * @param {string} encDir String with encryption directory.
     * @param {string} pwd String with password for encryption.
     */
    async saveToFile(encDir, pwd) {
        if (this.dirents.length) {
            const [aesFileCryptor, tgtFile] =
            this.#getAesFileCryptorAndFile(encDir, pwd);

            await aesFileCryptor.encryptJsonToFile(this.getEntries(), tgtFile);
        }
    }

    /**
     * Gets instance of @see AESFileCryptor and master file name.
     * 
     * @param {string} encDir String with encryption directory.
     * @param {string} pwd String with password for encryption or decryption.
     * @returns Returns array with two values.
     */
    #getAesFileCryptorAndFile = (encDir, pwd) =>
        [new AESFileCryptor(pwd), path.join(encDir, this.defaultFileName)];
}

/**
 * Exports @see FSDirectory as default class.
 */
export default FSDirectory;
