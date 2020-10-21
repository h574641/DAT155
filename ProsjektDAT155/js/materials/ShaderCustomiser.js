
import { ShaderChunk } from '../lib/three.module.js';

export default class ShaderCustomiser {

    static customise(code, chunks = {}) {

        for (let name in chunks) {
            const chunk = chunks[name];
            
            if (typeof chunk === 'string') {
                code = this.replace(code, name, chunk);
            } else if (chunk.prepend) {
                code = this.prepend(code, name, chunk.text);
            } else if (chunk.append) {
                code = this.append(code, name, chunk.text);
            } else {
                code = this.replace(code, name, chunk.text);
            }
        }

        return code;

    }

    static prepend(code, name, text) {

        const chunk = ShaderChunk[name];

        if (typeof chunk !== 'undefined') {
            
            return code.replace(`#include <${name}>`,
            `
            ${text}
            #include <${name}>
            `
            );

        } else {

            console.warn(`Chunk: "${name}", was not found.`);
            return code;

        }

    }

    static replace(code, name, text) {

        const chunk = ShaderChunk[name];

        if (typeof chunk !== 'undefined') {
            
            return code.replace(`#include <${name}>`, text);

        } else {

            console.warn(`Chunk: "${name}", was not found.`);
            return code;

        }

    }

    static append(code, name, text) {

        const chunk = ShaderChunk[name];

        if (typeof chunk !== 'undefined') {
            
            return code.replace(`#include <${name}>`,
            `
            #include <${name}>
            ${text}
            `
            );

        } else {

            console.warn(`Chunk: "${name}", was not found.`);
            return code;

        }

    }

};