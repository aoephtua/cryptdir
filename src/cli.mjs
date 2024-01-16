#!/usr/bin/env node

// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import { Command } from 'commander';
import { setLogger } from './log.mjs';
import CryptDir from './cryptDir.mjs';

/**
 * Contains command names as @see string values.
 */
const cmdNames = ['encrypt', 'decrypt'];

/**
 * Creates new instance of @see Command.
 */
const program = new Command();

/**
 * Sets global logger for current runtime environment.
 */
setLogger(console);

/**
 * Sets the program version to @see Command instance.
 */
program
    .version('1.0.0', '-v, --version');

/**
 * Adds multiple instances of @see Command to Commander.js.
 */
for (const cmdName of cmdNames) {
    const cmd = program.command(cmdName);

    cmd.action(async () => {
        const { password, srcDirectory, encDirectory } = program.opts();

        const cryptDir = new CryptDir(srcDirectory || process.cwd(), encDirectory);

        await cryptDir[cmdName](password);
    });
}

/**
 * Adds default options to @see Command instance.
 */
program
    .requiredOption('-p, --password <password>', 'password for encryption or decryption')
    .option('-s, --src-directory <dir>', 'directory of source files')
    .option('-e, --enc-directory <dir>', 'directory of encrypted files');

/**
 * Instance of @see Command parses command-line arguments.
 */
program.parse(process.argv);
