// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import fs from 'fs';
import path from 'path';
import AESFileCryptor from './aesFileCryptor.mjs';
import FSDirectory from './fsDirectory.mjs';
import { log } from './log.mjs';
import { calcFileHash, generatePwd, getUuid } from './cryptoUtils.mjs';

class CryptDir {

    /**
     * Default target directory for encryption data of @see CryptDir.
     */
    defaultEncDir = '.cryptdir';

    /**
     * Default array with dirent name filters of @see CryptDir.
     */
    defaultNameFilters = ['.~lock.'];

    /**
     * Instance of @see FSDirectory.
     */
    fsDirectory = new FSDirectory();

    /**
     * Initializes new instance of @see CryptDir.
     * 
     * @param {string} srcDir Full path of source directory.
     * @param {string} encDir Object with additional options.
     */
    constructor(srcDir, encDir) {
        this.srcDir = srcDir;
        this.encDir = encDir || path.join(srcDir, this.defaultEncDir);
    }

    /**
     * Processes encryption of @see CryptDir.
     * 
     * @param {string} masterPwd String with the master password.
     */
    async encrypt(masterPwd) {
        const currDirectory = new FSDirectory();
        const entries = await this.#loadDecEntries(masterPwd, currDirectory);
        const srcDirents = this.#getSrcDirents();

        if (srcDirents) {
            const encDir = this.encDir;

            if (srcDirents.length) {
                this.#mkdirSyncWithCheck(encDir);
    
                for (const dirent of srcDirents) {
                    await this.#encryptDirent(dirent, currDirectory);
                }
    
                this.#removeObsoleteDirents(currDirectory);
    
                if (!this.fsDirectory.equals(entries.dirents)) {
                    await this.fsDirectory.saveToFile(encDir, masterPwd);
                }
            } else if (this.#rmSyncRecWithCheck(encDir)) {
                log(`Removed directory '${encDir}'`);
            }
        } else {
            log(`Invalid source directory '${this.srcDir}'`);
        }
    }

    /**
     * Processes decryption of @see CryptDir.
     * 
     * @param {string} masterPwd String with the master password.
     */
    async decrypt(masterPwd) {
        const { dirents } = await this.#loadDecEntries(masterPwd);

        for (const dirent of dirents) {
            const { path: direntPath, fileId } = dirent;
            const fullName = path.join(this.srcDir, direntPath);
            const relativePath = this.#getRelativePath(fullName);
            const exists = fs.existsSync(fullName);

            if (fileId) {
                const file = this.fsDirectory.findFileById(fileId);

                if (file) {
                    await this.#decryptFile(file, exists, fullName, relativePath);
                }
            } else if (!exists) {
                fs.mkdirSync(fullName);

                log(`Created directory '${relativePath}'`);
            }
        }
    }

    /**
     * Encrypts dirent of source directory.
     * 
     * @param {object} dirent Object with dirent data.
     * @param {FSDirectory} currDirectory Instance of current directory.
     */
    async #encryptDirent(dirent, currDirectory) {
        const { name, path: direntPath } = dirent;
        const fullName = path.join(direntPath, name);
        const relativePath = this.#getRelativePath(fullName);
        const isDirectory = dirent.isDirectory();

        let fileParams = [];

        if (!isDirectory) {
            fileParams = await this.#encryptFile(fullName, currDirectory);
        }

        this.fsDirectory.addEntry(relativePath, ...fileParams);

        this.#logDirentEncryption(relativePath, isDirectory, fileParams, currDirectory);
    }

    /**
     * Encrypts file of source directory.
     * 
     * @param {string} fullName String with full name of source file.
     * @param {FSDirectory} currDirectory Instance of current directory.
     * @returns Returns array with file identifier and object with metadata.
     */
    async #encryptFile(fullName, currDirectory) {
        const fileHash = await calcFileHash(fullName);
        const file = this.fsDirectory.findFileByHash(fileHash);

        if (!file) {
            const { exists, fileId, pwd } = this.#getFileData(currDirectory, fileHash);

            if (!exists) {
                const aesFileCryptor = this.#getAesFileCryptorByPwd(pwd);

                await aesFileCryptor.encryptFileToFile(fullName, this.#getEncFilePath(fileId));
            }            

            return [fileId, { fileId, fileHash, pwd }];
        }

        return [file.fileId];
    }

    /**
     * Logs message of dirent encryption.
     * 
     * @param {string} path String with the dirent path.
     * @param {boolean} isDir Contains whether dirent is directory.
     * @param {Array} fileParams Array with file parameters.
     * @param {FSDirectory} currDirectory Instance of current directory.
     */
    #logDirentEncryption(path, isDir, fileParams, currDirectory) {
        const fileId = fileParams[0];
        const dirent = currDirectory.findDirent(path);

        if (!dirent || dirent.fileId !== fileId) {
            this.#logDirentProc(path, isDir, !dirent ? 'Added' : 'Updated');
        }
    }

    /**
     * Removes obsolete dirents of current directory.
     * 
     * @param {FSDirectory} currDirectory Instance of current directory.
     */
    #removeObsoleteDirents(currDirectory) {
        const dirents = this.fsDirectory.getObsoleteDirents(currDirectory);

        for (const dirent of dirents) {
            const { path, fileId } = dirent;
            const isDir = !fileId;

            if (fileId && !this.fsDirectory.findFileById(fileId)) {
                const fullName = this.#getEncFilePath(fileId);

                this.#rmSyncWithCheck(fullName);
            }

            if (isDir || !this.fsDirectory.findDirent(path)) {
                this.#logDirentProc(path, isDir, 'Removed');
            }
        }
    }

    /**
     * Decrypts file of encrypted directory.
     * 
     * @param {object} file Object with metadata of file.
     * @param {boolean} exists Contains whether file exists.
     * @param {string} fullName String with full name of target file.
     * @param {string} relativePath String with relative path of file.
     */
    async #decryptFile(file, exists, fullName, relativePath) {
        const { fileId, pwd, fileHash } = file;

        if (!exists || fileHash !== await calcFileHash(fullName)) {
            const aesFileCryptor = this.#getAesFileCryptorByPwd(pwd);

            await aesFileCryptor.decryptFileToFile(this.#getEncFilePath(fileId), fullName);

            log(`Decrypted file '${relativePath}'`);
        }
    }

    /**
     * Gets identifier and password for file encryption.
     * 
     * @param {FSDirectory} currDirectory Instance of current directory.
     * @param {string} fileHash String with calculated file hash.
     * @returns Returns object with file data.
     */
    #getFileData(currDirectory, fileHash) {
        const file = currDirectory?.findFileByHash(fileHash);

        if (file) {
            return { exists: true, ...file };
        }

        return { fileId: getUuid(), pwd: generatePwd() };
    }

    /**
     * Loads dirents and files of @see FSDirectory.
     * 
     * @param {string} masterPwd String with the master password of the directory file.
     * @param {FSDirectory} fsDirectory Instance of current directory.
     * @returns Returns object with dirents and files.
     */
    #loadDecEntries = async (masterPwd, fsDirectory) =>
        (fsDirectory || this.fsDirectory).loadEntries(this.encDir, masterPwd);

    /**
     * Gets string with full path of encrypted file by identifier.
     * 
     * @param {string} fileId String with file identifier.
     * @returns Returns string with full path.
     */
    #getEncFilePath = (fileId) => path.join(this.encDir, fileId);

    /**
     * Gets string with relative path by source directory and full name of dirent.
     * 
     * @param {string} fullName String with full name of dirent.
     * @returns Returns string with relative path.
     */
    #getRelativePath = (fullName) => fullName.replace(this.srcDir + '\\', '');

    /**
     * Gets string with full name of dirent by path and name.
     * 
     * @param {object} dirent Object with dirent values.
     * @returns Returns string with full name of dirent.
     */
    #getDirentFullName = ({ path: direntPath, name }) => path.join(direntPath, name);

    /**
     * Validates whether dirent name is valid.
     * 
     * @param {object} dirent Object with dirent values.
     * @returns Returns true if name is valid.
     */
    #filterDirentByName = (dirent) => {
        const { name } = dirent;

        for (const nameFilter of this.defaultNameFilters) {
            if (name.startsWith(nameFilter)) {
                return true;
            }
        }
    };

    /**
     * Gets dirents of source directory.
     * 
     * @returns Returns array with dirents of source directory.
     */
    #getSrcDirents() {
        const getName = this.#getDirentFullName;

        if (fs.existsSync(this.srcDir)) {
            const dirents = fs.readdirSync(this.srcDir, { recursive: true, withFileTypes: true })
                .sort((a, b) => getName(a).localeCompare(getName(b), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                }));

            return dirents.filter(dirent =>
                !getName(dirent).startsWith(this.encDir) &&
                !this.#filterDirentByName(dirent));
        }
    }

    /**
     * Creates a folder if it does not exists.
     * 
     * @param {string} path String with the full path.
     * @returns Returns whether creation succeeded.
     */
    #mkdirSyncWithCheck(path) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);

            return true;
        }
    }

    /**
     * Removes file or directory by path and options.
     * 
     * @param {string} path String with the full path.
     * @param {object} options Object with additional options.
     * @returns 
     */
    #rmSync = (path, options) =>
        fs.rmSync(path, options);

    /**
     * Removes file or directory by path and options after validation.
     * 
     * @param {string} path String with the full path.
     * @param {object} options Object with additional options.
     * @returns Returns true if removal succeeded.
     */
    #rmSyncWithCheck = (path, options) => {
        if (fs.existsSync(path)) {
            this.#rmSync(path, options);

            return true;
        }
    }

    /**
     * Removes directory and children by path after validation.
     * 
     * @param {string} path String with the full path.
     * @returns Returns true if removal succeeded.
     */
    #rmSyncRecWithCheck = (path) =>
        this.#rmSyncWithCheck(path, { recursive: true, force: true });

    /**
     * Gets instance of @see AESFileCryptor by password.
     * 
     * @param {string} pwd String with password for encryption or decryption.
     * @returns Returns instance of @see AESFileCryptor.
     */
    #getAesFileCryptorByPwd = (pwd) => new AESFileCryptor(pwd);

    /**
     * Outputs message of dirent process to logger.
     * 
     * @param {string} path String with relative path of dirent.
     * @param {boolean} isDir Contains whether dirent is directory.
     * @param {string} proc String with name of process.
     */
    #logDirentProc = (path, isDir, proc) => {
        log(`${proc} ${isDir ? 'directory' : 'file'} '${path}'`);
    };
}

/**
 * Exports @see CryptDir as default class.
 */
export default CryptDir;
