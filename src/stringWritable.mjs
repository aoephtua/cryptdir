// Copyright (c) 2024, Thorsten A. Weintz. All rights reserved.
// Licensed under the MIT license. See LICENSE in the project root for license information.

import { Writable } from 'stream';
import { StringDecoder } from 'string_decoder';

class StringWritable extends Writable {

    /**
     * Initializes new instance of @see StringWritable.
     * 
     * @param {object} options Object with writable stream options.
     */
    constructor(options) {
        super(options);

        this._decoder = new StringDecoder(options && options.defaultEncoding);
        this.data = '';
    }

    /**
     * Writes chunks to data of @see StringWritable.
     * 
     * @param {*} chunk Data to be written to writable stream.
     * @param {string} encoding Type of encoding for string chunk.
     * @param {function} callback Callback function to check completion or failure.
     */
    _write(chunk, encoding, callback) {
        if (encoding === 'buffer') {
            chunk = this._decoder.write(chunk);
        }

        this.data += chunk;
        
        callback();
    }

    /**
     * Function will be called before the stream closes.
     * 
     * @param {function} callback Callback function to check completion.
     */
    _final(callback) {
        this.data += this._decoder.end();

        callback();
    }
}

/**
 * Exports @see StringWritable as default class.
 */
export default StringWritable;
