/**
 * Terrain geometry based on PlaneBufferGeometry.
 */

import Utilities from '../lib/Utilities.js';
import { PlaneBufferGeometry } from '../lib/three.module.js';

export default class TerrainBufferGeometry extends PlaneBufferGeometry {

    constructor({ heightmapImage, noiseFn = null, width = 100, numberOfSubdivisions = 128, height = 20 }) {

        super(width, width, numberOfSubdivisions, numberOfSubdivisions);

        this.rotateX(-Math.PI / 2);
        this.apply

        this.numberOfSubdivisions = numberOfSubdivisions;

        this.width = width;
        this.height = height;

        if (heightmapImage) {

            // get heightmap data
            this.heightmap = Utilities.getHeightmapData(heightmapImage, numberOfSubdivisions + 1);

            // assign Y-values
            for (let i = 0; i < this.heightmap.length; i++) {
                this.attributes.position.setY(i, this.heightmap[i] * this.height);
            }

        } else if (noiseFn !== null) {

            const smoothing = 30;
            let noise = [];
            for (var i = 0; i < this.attributes.position.count; i++) {
                noise.push(noiseFn(
                    this.attributes.position.getX(i) / smoothing,
                    this.attributes.position.getZ(i) / smoothing
                ));
            }

            let min = Math.min(...noise);
            let max = Math.max(...noise);

            for (var i = 0; i <= this.attributes.position.count; i++) {
                this.attributes.position.setY(i, height * ((noise[i] - min) / (max - min)));
            }

        } else {
            throw Error('Unable to create TerrainBufferGeometry, must receive heightmapImage or noise function.');
        }

        // recompute normals.
        this.computeVertexNormals();
    }

    /**
     * Get the Y-value at the exact integral (x, z) coordinates.
     * @param {Integer} x
     * @param {Integer} z
     */
    getY(x, z) {
        return this.attributes.position.getY((Math.trunc(z) * (this.numberOfSubdivisions + 1)) + Math.trunc(x));
    }

    /**
     * Get the height of the terrain at the given (x, z) coordinates. Useful for placing objects on the terrain.
     * @param {Number} x
     * @param {Number} z
     */
    getHeightAt(x, z) {

        // Account for origo being at the center of the terrain geometry:
        const px = x + (this.width / 2);
        const pz = z + (this.width / 2);

        // If the position is outside the bounds of the terrain return zero.
        if (0 >= px || px >= this.width || 0 >= pz || pz >= this.width) {
            return 0;
        }

        let factor = this.numberOfSubdivisions / this.width;

        const fX = (px * factor) % 1;
        const fZ = (pz * factor) % 1;

        let x_min = Math.floor(px * factor);
        let x_max = Math.ceil(px * factor);
        let z_min = Math.floor(pz * factor);
        let z_max = Math.ceil(pz * factor);

        let h1 = this.getY(x_min, z_min);
        let h2 = this.getY(x_max, z_min);
        let h3 = this.getY(x_min, z_max);
        let h4 = this.getY(x_max, z_max);

        // Bilinear interpolation:
        return (h1 * (1.0 - fX) + h2 * fX) * (1.0 - fZ) + (h3 * (1.0 - fX) + h4 * fX) * (fZ);
    }
}