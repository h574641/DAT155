"use strict";

/**
 * Collection of general purpose utilities.
 * oskarbraten
 */
export default class Utilities {
	/**
	 * Loads image from url.
	 * @param  {String} url Location of image to load.
	 * @return {Promise} A Promise-object that resolves with the Image-object.
	 */
    static loadImage(url) {
        return new Promise((resolve, reject) => {

            if (!url) {
                reject('No URL was specified.');
            }

            let image = new Image();
            image.src = url;

            image.addEventListener('load', () => {
                resolve(image);
            });

            image.addEventListener('error', () => {
                reject('Unable to load image. Make sure the URL is correct (' + image.src + ').');
            });
        });
    }

	/**
	 * Loads heightmap data from an image.
	 * The image must be completely loaded before using this method.
	 * @param  {Image} image Image to load.
	 * @return {Array} A Uint8Array containing the heightmap data.
	 */
    static getHeightmapData(image, size) {
        let canvas = document.createElement('canvas');

        // assume texture is a square
        canvas.width = size;
        canvas.height = size;

        let context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        let data = new Float32Array(size * size);

        context.drawImage(image, 0, 0, size, size);

        let imageData = context.getImageData(0, 0, size, size).data;

        imageData.forEach((a, i) => {
            if (i % 4 === 0) { // only extract the first component of (r,g,b,a).
                data[Math.floor(i / 4)] = a / 255;
            }
        });

        return data;
    }
}