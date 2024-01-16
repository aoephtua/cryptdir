// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import { Transform } from 'stream';

class AttachInitVect extends Transform {

    /**
     * Initializes new instance of @see AttachInitVect.
     * 
     * @param {Buffer} initVect Buffer object with initialization vector.
     * @param {object} opts Object with transform options.
     */
    constructor(initVect, opts) {
        super(opts);

        this.initVect = initVect;
        this.attached = false;
    }

    /**
     * Attaches initialization vector to instance of stream.
     * 
     * @param {Buffer} chunk Buffer object to be transformed and passed to stream.
     * @param {*} _ 
     * @param {function} cb Callback function to be called after the chunk has been processed.
     */
    _transform(chunk, _, cb) {
        if (!this.attached) {
            this.push(this.initVect);
            this.attached = true;
        }

        this.push(chunk);

        cb();
    }
}

/**
 * Exports @see AttachInitVect as default class.
 */
export default AttachInitVect;
