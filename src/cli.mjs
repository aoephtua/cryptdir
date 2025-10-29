#!/usr/bin/env node

// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import { Command } from 'commander';
import { setLogger } from './log.mjs';
import CryptDir from './cryptDir.mjs';

/**
 * Contains @see Array with objects of commands.
 */
const commands = [
    { name: 'encrypt', options: [['-f, --filter <filter>', 'regular expression pattern']] },
    { name: 'decrypt' }
];

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
    .version('1.3.0', '-v, --version');

/**
 * Adds multiple instances of @see Command to Commander.js.
 */
for (const command of commands) {
    const { name: cmdName, options } = command;
    const cmd = program.command(cmdName);

    options?.forEach(option => cmd.option(...option));

    cmd.action(async (opts) => {
        const { password, srcDirectory, encDirectory } = program.opts();

        const cryptDir = new CryptDir(srcDirectory || process.cwd(), encDirectory);

        await cryptDir[cmdName](password, opts);
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
