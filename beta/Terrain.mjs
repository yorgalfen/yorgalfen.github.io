import {
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree,
} from "https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.6.8/+esm";
import { GenerateMeshBVHWorker } from "./GenerateMeshBVHWorker.mjs";

export let height;
export let slope;
export let route;
export let comms;
export let texts;
export let visib;
let latl;
let latr;
let longl;
let longr;

const Colorizer = Object.freeze({
    azi: colorizeAzimuth,
    ele: colorizeElevationAngle,
    hei: colorizeHeight,
    lif: null,
    slo: colorizeSlope,
});

const centerLat = -85.3974303;
const centerLong = 30.5974913;
const earthCart = new THREE.Vector3(361000000, 0, -42100000);
const earthLat = -6.6518153;
const moonRadius = 1737400;
// The "low" and "high" in these colors refers to the colorizer intensity,
// not world height.
const colorLow = new THREE.Color(0x00ff00);
const colorHigh = new THREE.Color(0xff0000);
const routeColor = new THREE.Color(0x0000ff);
const commsColor = new THREE.Color(0x00ffff);
const los = 5;
const hes = 15;

export function lat(su, ind) {
    if (ind >= 1600) {
        return latr[su][ind - 1600];
    }
    return latl[su][ind];
}

export function long(su, ind) {
    if (ind >= 1600) {
        return longr[su][ind - 1600];
    }
    return longl[su][ind];
}

export function toRad(x) {
    return (x * Math.PI) / 180;
}

function gcdisu(la1, lo1, la2, lo2) {
    const dlat = toRad(la2 - la1);
    const dlon = toRad(lo2 - lo1);
    const lr1 = toRad(la1);
    const lr2 = toRad(la2);
    const a =
        Math.sin(dlat / 2) * Math.sin(dlat / 2) +
        Math.sin(dlon / 2) * Math.sin(dlon / 2) * Math.cos(lr1) * Math.cos(lr2);
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// N: 0, E: -π/2, W: π/2, S: π or -π. the negative in coord swaps E and W
export function bearing(startLat, startLng, destLat, destLng) {
    const startLat2 = toRad(startLat);
    const startLng2 = toRad(startLng);
    const destLat2 = toRad(destLat);
    const destLng2 = toRad(destLng);
    const y = Math.sin(destLng2 - startLng2) * Math.cos(destLat2);
    const x =
        Math.cos(startLat2) * Math.sin(destLat2) -
        Math.sin(startLat2) * Math.cos(destLat2) * Math.cos(destLng2 - startLng2);
    const brng = Math.atan2(y, x);
    return brng;
}

export function coord(la, lo, he) {
    const b = -bearing(centerLat, centerLong, la, lo);
    const g = gcdisu(centerLat, centerLong, la, lo);
    const sgr = Math.sin(g);
    const x = (moonRadius + he) * sgr * Math.sin(b);
    const y = he * Math.cos(g) - 2 * moonRadius * Math.sin(g / 2) ** 2;
    const z = (moonRadius + he) * sgr * Math.cos(b);
    return [x, y, z];
}

function spheToCart(la, lo, ra) {
    return new THREE.Vector3(
        ra * Math.cos(la) * Math.cos(lo),
        ra * Math.cos(la) * Math.sin(lo),
        ra * Math.sin(la),
    );
}

export function elevation(latDeg, lonDeg, he) {
    const la = toRad(latDeg);
    const lo = toRad(lonDeg);
    const ra = he + moonRadius;
    const pc = spheToCart(la, lo, ra);
    const dpos = new THREE.Vector3().subVectors(earthCart, pc);
    const rn = Math.hypot(dpos.x, dpos.y, dpos.z);
    const rz =
        dpos.x * Math.cos(la) * Math.cos(lo) +
        dpos.y * Math.cos(la) * Math.sin(lo) +
        dpos.z * Math.sin(la);
    return Math.asin(rz / rn);
}

// Map a point of sub-list and index to an intensity between 0.0 and 1.0,
// where slopes <= los return 0.0 and slopes >= hes return 1.0.
function colorizeSlope(sub, ind) {
    return Math.max(Math.min((slope[sub][ind] - los) / (hes - los), 1.0), 0.0);
}

// Map a point of sub-list and index to an number between 0.0 and 1.0,
// where 0.0 is the global greatest height and 1.0 is the lowest height.
function colorizeHeight(sub, ind) {
    return (6463.86 - height[sub][ind]) / (6463.86 - 2796.34);
}

// Map a point of sub-list and index to an intensity between 0.0 and 1.0,
// where 0.0 is the global least elevation angle and 1.0 is the greatest angle.
function colorizeElevationAngle(sub, ind) {
    const he = height[sub][ind];
    const ele = elevation(lat(sub, ind), long(sub, ind), he);
    // Scale from max values to 0.0 to 1.0
    return (ele - 0.17450426) / (0.18376232 - 0.17450426);
}

// Map a point of sub-list and index to an intensity between 0.0 and 1.0,
// where 0.0 is the global least azimuth angle and 1.0 is the greatest angle.
function colorizeAzimuth(sub, ind) {
    const az = bearing(lat(sub, ind), long(sub, ind), earthLat, 0);
    // Scale from max values to 0.0 to 1.0
    return -(az + 0.4820631) / (0.6416581 - 0.4820631);
}

class JSONAssetType {
    #tag;

    constructor() {
        this.type = "asset";
        // These assignments look unnecessary,
        // but are required to make A-Frame recognize the class methods.
        this.parse = this.parse;
        this.stringify = this.stringify;
    }
    parse(value) {
        this.#tag = value;
        // Remove initial # character
        const el = document.getElementById(value.substr(1));
        return JSON.parse(el.data);
    }
    stringify() {
        return this.#tag;
    }
}

/** Random number generator seed */
let randomSeed = 0;

/**
 * Deterministic random number generator.
 *
 * Returns the same values given the same coordinate and randomSeed.
 */
function nextRandom(i, j) {
    // Add i and j to random seed, so that an large i or j adds
    // to the x and z coordinates stored in randomSeed.
    let hash = randomSeed + ((i << 16) | j);

    // Fast integer hash function
    hash ^= hash >> 16;
    // Math.imul multiplies 32-bit numbers with overflow
    hash = Math.imul(hash, 0x21f0aaad);
    hash ^= hash >> 15;
    hash = Math.imul(hash, 0x735a2d97);
    hash ^= hash >> 15;
    // Finally, move to range [0..1]
    return hash / 2147483647.0;
}

function getRandom(i, j, min, max) {
    return nextRandom(i, j) * (max - min) + min;
}

/**
 * Average grid values at offsets from (i, j),
 * when adding the offset to (i, j) results in a point within the grid.
 *
 * If (i, j) is at the edge of grid, this method instead returns a linear
 * interpolation of the corner values.
 */
function fixed(grid, len, i, j, v, offsets) {
    // Linear interpolation of edges with the corners
    if (i === 0 || i === len - 1) {
        const edgeLeft = grid[i * len + 0];
        const edgeRight = grid[i * len + (len - 1)];
        return (j / (len - 1)) * (edgeRight - edgeLeft) + edgeLeft;
    }
    if (j === 0 || j === len - 1) {
        const edgeTop = grid[0 * len + j];
        const edgeBottom = grid[(len - 1) * len + j];
        return (i / (len - 1)) * (edgeBottom - edgeTop) + edgeTop;
    }

    let result = 0;
    let k = 0;
    for (let n = 0; n < offsets.length; n++) {
        const p = offsets[n][0];
        const q = offsets[n][1];
        const z = i + p * v;
        const x = j + q * v;
        if (0 <= z && z < len && 0 <= x && x < len) {
            result += grid[z * len + x];
            k++;
        }
    }
    return result / k;
}

/**
 * Run a single step of the diamond-square algorithm.
 *
 * Unlike the usual diamond-square algorithm, this implementation uses a
 * deterministic pseudo-random number generator, so that the same "random"
 * offsets are generated for the same points on the terrain.
 */
function singleDiamondSquareStep(grid, len, dist, roughness) {
    // Distance from a "new" cell to the corner?
    const v = dist >>> 1;

    // Offsets
    const diamond = [
        [-1, -1],
        [-1, 1],
        [1, 1],
        [1, -1],
    ];
    const square = [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1],
    ];

    // z, x are coordinates of the new cell
    // Diamond step
    for (let i = v; i < len; i += dist) {
        for (let j = v; j < len; j += dist) {
            grid[i * len + j] =
                fixed(grid, len, i, j, v, diamond) + getRandom(i, j, -roughness, roughness);
        }
    }

    // Square step, rows
    for (let i = v; i < len; i += dist) {
        for (let j = 0; j < len; j += dist) {
            grid[i * len + j] =
                fixed(grid, len, i, j, v, square) + getRandom(i, j, -roughness, roughness);
        }
    }

    // Square step, rows
    for (let i = 0; i < len; i += dist) {
        for (let j = v; j < len; j += dist) {
            grid[i * len + j] =
                fixed(grid, len, i, j, v, square) + getRandom(i, j, -roughness, roughness);
        }
    }
}

class Tile {
    // Tiles have a size of 10x10, so startX and startZ must be multiples of 10
    constructor(startX, startZ, colorizer) {
        this.startX = startX;
        this.startZ = startZ;

        // Create an array of coordinates corresponding to data points.
        // Tiles are 10 by 10, but we need 11 by 11 to get full squares on tile edges.
        this.data = new Float32Array(3 * 11 * 11);
        const data = this.data;

        for (let z = 0; z <= 10; z++) {
            for (let x = 0; x <= 10; x++) {
                const atZ = startZ + z;
                const atX = startX + x;
                const pos = coord(lat(atZ, atX), long(atZ, atX), height[atZ][atX]);
                data[z * 11 * 3 + x * 3 + 0] = pos[0];
                data[z * 11 * 3 + x * 3 + 1] = pos[1];
                data[z * 11 * 3 + x * 3 + 2] = pos[2];
            }
        }

        // The LOD distances in Terrain are distances from the camera
        // to this tile's position.
        this.position = new THREE.Vector3();
        const pos = this.position;
        const at = 5 * 11 * 3 + 5 * 3;
        pos.fromArray(data, at);

        // Make all coordinates in data relative to this.position.
        for (let i = 0, len = data.length; i < len; i += 3) {
            data[i + 0] -= pos.x;
            data[i + 1] -= pos.y;
            data[i + 2] -= pos.z;
        }

        // Calculate data points' colors in RGBA
        this.colors = new Float32Array(3 * 11 * 11);
        if (colorizer == null) {
            this.useColor = false;
            return;
        }

        this.useColor = true;
        const colors = this.colors;
        const mixed = new THREE.Color();
        for (let z = 0; z <= 10; z++) {
            for (let x = 0; x <= 10; x++) {
                const atZ = startZ + z;
                const atX = startX + x;
                const intensity = colorizer(atZ, atX);
                // Interpolate between high and low colors,
                // where an intensity closer to 0 is closer to low.
                mixed.lerpColors(colorLow, colorHigh, intensity);
                colors[z * 11 * 3 + x * 3 + 0] = mixed.r;
                colors[z * 11 * 3 + x * 3 + 1] = mixed.g;
                colors[z * 11 * 3 + x * 3 + 2] = mixed.b;
            }
        }
    }

    /**
     * @param {Number} len number of squares per tile side
     * @returns {THREE.BufferGeometry}
     */
    detail(len) {
        const geometry = this.geometry(len);

        // If len is greater than 10, we need to interpolate noise between data points.
        if (len > 10) {
            this.subdivide(geometry, len);
        } else {
            // Otherwise, we need to simplify.
            this.simplify(geometry, len);
        }

        // Add surface normals, texture coordinates, and route/comms colors.
        // Colorizer colors are set before in subdivide/simplify.
        this.finishGeometry(geometry, len);
        geometry.computeBoundingSphere();
        return geometry;
    }

    /**
     * @returns {THREE.Vector3}
     */
    center() {
        const at = 5 * 11 * 3 + 5 * 3;
        return new THREE.Vector3(this.data[at + 0], this.data[at + 1], this.data[at + 2]);
    }

    geometry(len) {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(3 * 6 * len * len);
        // Since tiles aren't reused with new vertex/normal data,
        // their attributes shouldn't be dynamic.
        const verticesAttr = new THREE.BufferAttribute(vertices, 3);
        const normals = new Float32Array(vertices.length);
        const normalAttr = new THREE.BufferAttribute(normals, 3);
        const uvs = new Float32Array(2 * 6 * len * len);
        const uvAttr = new THREE.BufferAttribute(uvs, 2);
        const color = new Float32Array(3 * 6 * len * len);
        const colorAttr = new THREE.BufferAttribute(color, 3);
        const indices = Array(6 * len * len);

        geometry.setAttribute("position", verticesAttr);
        geometry.setAttribute("normal", normalAttr);
        geometry.setAttribute("uv", uvAttr);
        geometry.setAttribute("color", colorAttr);
        geometry.setIndex(indices);

        return geometry;
    }

    subdivide(geometry, len) {
        // Precondition: For Diamond-square, len / 10 must be 2**k, for integer k
        const width = len / 10;
        if (!Number.isInteger(Math.log2(width))) {
            throw new RangeError(`Invalid subdivision length (${len})!`);
        }

        // perf: kept as local variables to avoid slow object accesses
        const verticesAttr = geometry.getAttribute("position");
        const vertices = verticesAttr.array;
        const colorAttr = geometry.getAttribute("color");
        const colors = colorAttr.array;
        const indices = geometry.getIndex().array;
        const data = this.data;
        const dataColors = this.colors;
        const useColor = this.useColor;
        const triangleSpec = [0, 2, 1, 2, 1, 3];

        // Diamond-square requires a grid where the side lengths
        // can be expressed as 1+2**k, for integer k
        const grid = new Float32Array((width + 1) ** 2);

        const colorA = new THREE.Color();
        const colorB = new THREE.Color();
        const colorC = new THREE.Color();
        const colorD = new THREE.Color();
        const mixLeft = new THREE.Color();
        const mixRight = new THREE.Color();
        const mixed = new THREE.Color();

        // Run diamond-square every len / 10 points on the grid,
        // then transfer the grid's heights to vertices.
        const roughnessDelta = 0.5;
        const dataCoords = Array(8);
        const scaleFactors = new Float32Array(4 * (width + 1));
        const firstX = data[3 * (0 * 11 + 0) + 0];
        const firstZ = data[3 * (0 * 11 + 0) + 2];
        const lastX = data[3 * (10 * 11 + 10) + 0];
        const lastZ = data[3 * (10 * 11 + 10) + 2];
        for (let z = 0; z < 10; z++) {
            const atZ = z * width;
            for (let x = 0; x < 10; x++) {
                // Diamond-square requires known grid corners,
                // which we set to data heights
                grid[0 * (width + 1) + 0] = data[3 * (z * 11 + x) + 1];
                grid[0 * (width + 1) + width] = data[3 * (z * 11 + x + 1) + 1];
                grid[width * (width + 1) + 0] = data[3 * ((z + 1) * 11 + x) + 1];
                grid[width * (width + 1) + width] = data[3 * ((z + 1) * 11 + x + 1) + 1];

                randomSeed = (((this.startZ + z) * width) << 16) | ((this.startX + x) * width);

                // Run diamond-square on grid
                let roughness = 0.3;
                for (let dist = width; dist > 1; dist >>>= 1) {
                    singleDiamondSquareStep(grid, width + 1, dist, roughness);
                    roughness *= roughnessDelta;
                }

                // Transfer grid's heights to vertices,
                // interpolating x and z coords between data's x and z.

                // Bithack: i is 0b00 through 0b11.
                // Taking the top bit and the bottom bit,
                // gives z and x coordinates (0, 0), (0, 1), (1, 0), (1, 1).
                for (let i = 0; i < 4; i++) {
                    const dataZ = z + (i >>> 1);
                    const dataX = x + (i & 1);
                    dataCoords[2 * i + 0] = data[3 * (dataZ * 11 + dataX) + 2];
                    dataCoords[2 * i + 1] = data[3 * (dataZ * 11 + dataX) + 0];
                }

                // Create scaling factors for x and z scaling from 0 to 1
                // to an x and z coordinate evenly spaced within a square
                // bounded by the four coordinates (z, x) (z+1, x), (z, x+1), (z+1, x+1).

                // Generally, this creates vectors with equally spaced
                // origins along the line (z, x)--(z+1, x) and equally
                // spaced endpoints along the line (z, x+1)--(z+1, x+1).
                const diffStartZ = dataCoords[4] - dataCoords[0];
                const diffStartX = dataCoords[5] - dataCoords[1];
                const diffEndZ = dataCoords[6] - dataCoords[2];
                const diffEndX = dataCoords[7] - dataCoords[3];
                for (let gridZ = 0; gridZ <= width; gridZ++) {
                    const scale = gridZ / width;
                    const startZ = scale * diffStartZ + dataCoords[0];
                    const startX = scale * diffStartX + dataCoords[1];
                    const endZ = scale * diffEndZ + dataCoords[2];
                    const endX = scale * diffEndX + dataCoords[3];
                    scaleFactors[gridZ * 4 + 0] = startZ;
                    scaleFactors[gridZ * 4 + 1] = startX;
                    scaleFactors[gridZ * 4 + 2] = endZ - startZ;
                    scaleFactors[gridZ * 4 + 3] = endX - startX;
                }

                const atX = x * width;
                for (let gridZ = 0; gridZ < width; gridZ++) {
                    for (let gridX = 0; gridX < width; gridX++) {
                        colorA.fromArray(dataColors, 3 * (z * 11 + x));
                        colorB.fromArray(dataColors, 3 * (z * 11 + (x + 1)));
                        colorC.fromArray(dataColors, 3 * ((z + 1) * 11 + x));
                        colorD.fromArray(dataColors, 3 * ((z + 1) * 11 + (x + 1)));

                        const indexAt = (atZ + gridZ) * len * 6 + (atX + gridX) * 6;
                        const at = 3 * indexAt;
                        for (let i = 0; i < 6; i++) {
                            const offZ = gridZ + (triangleSpec[i] >>> 1);
                            const offX = gridX + (triangleSpec[i] & 1);
                            const startZ = scaleFactors[offZ * 4 + 0];
                            const startX = scaleFactors[offZ * 4 + 1];
                            const zScale = scaleFactors[offZ * 4 + 2];
                            const xScale = scaleFactors[offZ * 4 + 3];
                            const zFrac = (offX / width) * zScale;
                            const xFrac = (offX / width) * xScale;

                            vertices[at + 3 * i + 0] = xFrac + startX;
                            vertices[at + 3 * i + 1] = grid[offZ * (width + 1) + offX];
                            vertices[at + 3 * i + 2] = zFrac + startZ;
                            indices[indexAt + i] = indexAt + i;

                            if (!useColor) {
                                continue;
                            }
                            mixLeft.lerpColors(colorA, colorC, offZ / width);
                            mixRight.lerpColors(colorB, colorD, offZ / width);
                            mixed.lerpColors(mixLeft, mixRight, offX / width);
                            colors[3 * indexAt + 3 * i + 0] = mixed.r;
                            colors[3 * indexAt + 3 * i + 1] = mixed.g;
                            colors[3 * indexAt + 3 * i + 2] = mixed.b;
                        }
                    }
                }
            }
        }
    }

    simplify(geometry, len) {
        // perf: kept as local variables to avoid slow object accesses
        const verticesAttr = geometry.getAttribute("position");
        const vertices = verticesAttr.array;
        const colorAttr = geometry.getAttribute("color");
        const colors = colorAttr.array;
        const indices = geometry.getIndex().array;
        const data = this.data;
        const dataColors = this.colors;
        const useColor = this.useColor;

        const triangleSpec = [0, 2, 1, 2, 1, 3];

        // Normally, z would be called subList and x would be index,
        // however, I use z and x instead to avoid confusing index
        // with the three.js indices array.
        const skip = Math.floor(10 / len);
        for (let z = 0; z < len; z++) {
            for (let x = 0; x < len; x++) {
                // Create a rectangle from data points
                const indexAt = z * len * 6 + x * 6;
                const at = 3 * indexAt;
                for (let i = 0; i < 6; i++) {
                    const pZ = z + (triangleSpec[i] >>> 1);
                    const pX = x + (triangleSpec[i] & 1);
                    const dataAt = skip * (pZ * 11 + pX);
                    vertices[at + 3 * i + 0] = data[3 * dataAt + 0];
                    vertices[at + 3 * i + 1] = data[3 * dataAt + 1];
                    vertices[at + 3 * i + 2] = data[3 * dataAt + 2];
                    indices[indexAt + i] = indexAt + i;

                    if (!useColor) {
                        continue;
                    }
                    colors[3 * indexAt + 3 * i + 0] = dataColors[3 * dataAt + 0];
                    colors[3 * indexAt + 3 * i + 1] = dataColors[3 * dataAt + 1];
                    colors[3 * indexAt + 3 * i + 2] = dataColors[3 * dataAt + 2];
                }
            }
        }
    }

    finishGeometry(geometry, len) {
        // Texture coordinates in 2 bits,
        // where the low bit is U (texture X) and the high bit is V (texture Y)
        const uvSpec = [0, 2, 1, 2, 1, 3];

        const pA = new THREE.Vector3();
        const pB = new THREE.Vector3();
        const pC = new THREE.Vector3();
        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();

        const verticesAttr = geometry.getAttribute("position");
        const vertices = verticesAttr.array;
        const normalAttr = geometry.getAttribute("normal");
        const normals = normalAttr.array;
        const uvAttr = geometry.getAttribute("uv");
        const uvs = uvAttr.array;

        for (let z = 0; z < len; z++) {
            for (let x = 0; x < len; x++) {
                const at = z * len * 18 + x * 18;
                // Calculate flat face normals for:

                // Triangle 1
                pA.set(vertices[at + 0], vertices[at + 1], vertices[at + 2]);
                pB.set(vertices[at + 3], vertices[at + 4], vertices[at + 5]);
                pC.set(vertices[at + 6], vertices[at + 7], vertices[at + 8]);

                cb.subVectors(pC, pB);
                ab.subVectors(pA, pB);
                cb.cross(ab);
                cb.normalize();
                for (let i = 0; i < 9; i += 3) {
                    normals[at + i + 0] = cb.x;
                    normals[at + i + 1] = cb.y;
                    normals[at + i + 2] = cb.z;
                }

                // Triangle 2
                pA.copy(pB);
                pB.copy(pC);
                pC.set(vertices[at + 15], vertices[at + 16], vertices[at + 17]);

                cb.subVectors(pC, pB);
                ab.subVectors(pA, pB);
                cb.cross(ab);
                cb.normalize();
                for (let i = 9; i < 18; i += 3) {
                    normals[at + i + 0] = cb.x;
                    normals[at + i + 1] = cb.y;
                    normals[at + i + 2] = cb.z;
                }

                // Generate texture coordinates,
                // such that the texture repeats twice each tile
                const uvAt = z * len * 12 + x * 12;
                for (let i = 0; i < 6; i++) {
                    // [0..=len] => [0..=1]
                    uvs[uvAt + 2 * i + 0] = (2 * (((uvSpec[i] & 1) >> 0) + x)) / len;
                    uvs[uvAt + 2 * i + 1] = (2 * (((uvSpec[i] & 2) >> 1) + z)) / len;
                }
            }
        }

        // Always apply route and comms coloring,
        // which overrides anything set by the colorizer.
        // Note: This colors entire simplified tiles a solid color,
        // which can produce a strange effect.
        const colorAttr = geometry.getAttribute("color");
        const colors = colorAttr.array;
        const width = len / 10;
        if (!this.useColor) {
            colors.fill(1);
        }

        for (let [routeZ, routeX] of route) {
            routeZ -= this.startZ;
            routeX -= this.startX;
            if (!(0 <= routeZ && routeZ < 10 && 0 <= routeX && routeX < 10)) {
                continue;
            }

            // Color all squares containing the routeZ and routeX
            const startAtZ = Math.floor(routeZ * width);
            const startAtX = Math.floor(routeX * width);
            for (let z = startAtZ; z < (routeZ + 1) * width; z++) {
                for (let x = startAtX; x < (routeX + 1) * width; x++) {
                    const at = z * len * 6 + x * 6;
                    for (let i = 0; i < 6; i++) {
                        colors[3 * at + 3 * i + 0] = routeColor.r;
                        colors[3 * at + 3 * i + 1] = routeColor.g;
                        colors[3 * at + 3 * i + 2] = routeColor.b;
                    }
                }
            }
        }
        for (let [commsZ, commsX] of comms) {
            commsZ -= this.startZ;
            commsX -= this.startX;
            if (!(0 <= commsZ && commsZ < 10 && 0 <= commsX && commsX < 10)) {
                continue;
            }

            // Color all squares containing the routeZ and routeX
            const startAtZ = Math.floor(commsZ * width);
            const startAtX = Math.floor(commsX * width);
            for (let z = startAtZ; z < (commsZ + 1) * width; z++) {
                for (let x = startAtX; x < (commsX + 1) * width; x++) {
                    const at = z * len * 6 + x * 6;
                    for (let i = 0; i < 6; i++) {
                        colors[3 * at + 3 * i + 0] = commsColor.r;
                        colors[3 * at + 3 * i + 1] = commsColor.g;
                        colors[3 * at + 3 * i + 2] = commsColor.b;
                    }
                }
            }
        }
    }
}

export class Terrain {
    constructor() {
        // Properties from HTML attributes
        this.schema = {
            colorizer: { type: "string" },
            frame: { type: "vec2" },
            renderDistance: { type: "int" },
            timesDetail: { type: "int" },
            latl: new JSONAssetType(),
            latr: new JSONAssetType(),
            longl: new JSONAssetType(),
            longr: new JSONAssetType(),
            height: new JSONAssetType(),
            slope: new JSONAssetType(),
            route: new JSONAssetType(),
            comms: new JSONAssetType(),
            visib: new JSONAssetType(),
            texts: new JSONAssetType(),
            texture: { type: "asset" },
        };
        this.attrs = {};
        this.bvhWorker = new GenerateMeshBVHWorker();
        this.frame = [0, 0];
        this.materials = [];
        this.raycaster = new THREE.Raycaster();
        // Allow the raycaster to return a result more quickly.
        this.raycaster.firstHitOnly = true;
        this.rayDirection = new THREE.Vector3(0, -1, 0);
        // 6500 is a value above and close to the maximum terrain height,
        // which is needed so that the raycaster can always hit a terrain mesh.
        this.rayOrigin = new THREE.Vector3(0, 6500, 0);
        this.root = new THREE.Group();
        this.tileMeshes = [];
        // Map of THREE.Mesh ids from this.tileMeshes to Tile instances
        this.tiles = {};

        // Same reason for usually unnecessary assignment
        this.init = this.init;
        this.setFrame = this.setFrame;
        this.update = this.update;
    }

    init() {
        const data = this.data;
        latl = data.latl;
        latr = data.latr;
        longl = data.longl;
        longr = data.longr;
        height = data.height;
        slope = data.slope;
        route = data.route;
        comms = data.comms;
        visib = data.visib;
        for (let i = 0; i < visib.length; i++) {
            visib[i] = new Uint32Array(visib[i]);
        }
        texts = data.texts;

        this.attrs.colorizer = Colorizer[data.colorizer];
        this.attrs.renderDistance = data.renderDistance;
        this.attrs.timesDetail = data.timesDetail;
        this.frame[0] = data.frame[0];
        this.frame[1] = data.frame[1];

        // Set frame after initializing other attributes
        this.setFrame(data.frame);

        this.el.setObject3D("mesh", this.root);

        const texture = new THREE.TextureLoader().load(this.data.texture.src);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        this.materials[0] = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 1.0,
            side: THREE.DoubleSide,
            vertexColors: true,
        });
    }

    /**
     * Find the pair [subList, index] within the latitude and longitude data
     * corresponding to the A-Frame coordinates camx and camz.
     *
     * @param {THREE.Vector3} cameraPos A-Frame coordinates on the mesh.
     * @param {boolean} [fallback=true] Return a known good value on failure.
     * @returns {Array<Number>} Pair of sublist and index on the data files.
     */
    dataIndexOf(cameraPos, fallback = true) {
        this.rayOrigin.x = cameraPos.x;
        this.rayOrigin.z = cameraPos.z;
        this.raycaster.set(this.rayOrigin, this.rayDirection);
        const intersections = this.raycaster.intersectObjects(this.tileMeshes);
        if (intersections.length === 0) {
            if (fallback) {
                // Off the mesh, return a known good value
                return this.frame;
            }
            throw new RangeError(`Coordinates ${cameraPos} are off the mesh!`);
        }

        const object = intersections[0].object;
        const tile = this.tiles[object.id];
        // Tile has startX and startZ, find z and x offsets
        // within the tile from the intersection face.
        const at = Math.floor(intersections[0].face.a / 6);
        const timesDetail = this.attrs.timesDetail;
        const highDetailLen = timesDetail * 10;
        const tileZ = Math.round(at / highDetailLen / timesDetail);
        const tileX = Math.round((at % highDetailLen) / timesDetail);
        return [tile.startZ + tileZ, tile.startX + tileX];
    }

    /** Add new tiles as they come into view and expire tiles that leave view. */
    redraw(cameraPos) {
        if (!this.setFrame(this.dataIndexOf(cameraPos))) {
            // Frame didn't change, so no tiles need to be added or removed.
            return;
        }

        const bvhWorker = this.bvhWorker;
        const colorizer = this.attrs.colorizer;
        const highDetailLen = this.attrs.timesDetail * 10;
        const material = this.materials[0];
        const root = this.root;
        const size = this.attrs.renderDistance;
        const startLen = this.tileMeshes.length;
        const tileMeshes = this.tileMeshes;
        const tiles = this.tiles;

        // tile positions as z << 12 | x
        const tilePositions = {};

        // Iterate backwards to avoid breaking the for loop as tiles expire.
        for (let i = startLen - 1; i >= 0; i--) {
            // Expire tiles that are slightly farther than the distance from the
            // center to the terrain's corners, so that tiles aren't repeatedly
            // expired and readded as the camera moves.
            const mesh = tileMeshes[i];
            const lod = mesh.parent;
            if (cameraPos.distanceTo(lod.position) > 3.75 * size) {
                // Remove the tile from this.tiles and delete it from the root
                // THREE.Group.
                delete tiles[mesh.id];
                for (let i = 0, len = lod.children.len; i < len; i++) {
                    lod.children[i].dispose();
                }
                lod.removeFromParent();
                tileMeshes.splice(i, 1);
            } else {
                const tile = tiles[mesh.id];
                tilePositions[(tile.startZ << 12) | tile.startX] = true;
            }
        }

        const start = new Date();
        let ntiles = 0;
        const startZ = this.frame[0] - size / 2;
        const startX = this.frame[1] - size / 2;
        for (let z = startZ; z < startZ + size; z += 10) {
            for (let x = startX; x < startX + size; x += 10) {
                if (tilePositions[(z << 12) | x] === true) {
                    // Tile at (z, x) already exists
                    continue;
                }

                ntiles++;
                // Add new tile for (z, x)
                // Copied from update()
                const tile = new Tile(x, z, colorizer);
                const lod = new THREE.LOD();
                lod.position.copy(tile.position);
                lod.updateMatrix();
                lod.matrixAutoUpdate = false;
                lod.updateMatrixWorld();

                // High detail mesh
                let mesh = new THREE.Mesh(tile.detail(highDetailLen), material);
                mesh.updateMatrix();
                mesh.matrixAutoUpdate = false;
                lod.addLevel(mesh, 40);
                mesh.updateMatrixWorld();
                // Unlike update(), asynchronously generate high detail mesh's
                // bounds tree, since bvh generation is slow and the tiles being
                // loaded in are far from the camera.
                // Only the high detail mesh is raytraced, so only it needs a bvh.
                bvhWorker.generate(mesh.geometry).then((bvh) => {
                    mesh.geometry.boundsTree = bvh;
                    // Once a bounds tree is generated, add the high detail mesh
                    // to tileMeshes so that raycasting uses the most precise
                    // mesh. The mesh can't be added to tileMeshes any sooner or
                    // raycast() would raise an error.
                    tileMeshes.push(mesh);
                });
                tiles[mesh.id] = tile;
                // Medium detail
                mesh = new THREE.Mesh(tile.detail(10), material);
                mesh.updateMatrix();
                mesh.matrixAutoUpdate = false;
                lod.addLevel(mesh, 300);
                mesh.updateMatrixWorld();
                // Low detail
                mesh = new THREE.Mesh(tile.detail(1), material);
                mesh.updateMatrix();
                mesh.matrixAutoUpdate = false;
                lod.addLevel(mesh, 600);
                mesh.updateMatrixWorld();

                root.add(lod);
            }
        }
        const elapsed = new Date() - start;
        console.log(`Took ${elapsed}ms in redraw() to draw ${ntiles} tiles`);
    }

    /**
     * Set center of tile's draw to the specified data coordinates.
     *
     * @param {Array<Number>} where The data coordinates used to draw the terrain, sublist first,
     * then index
     * @returns {boolean} True if the frame changed, otherwise false
     */
    setFrame(where) {
        const size = this.attrs.renderDistance;
        const oldFrameZ = this.frame[0];
        const oldFrameX = this.frame[1];
        // -1 since frame indicates an index into the latitude and longitude arrays
        const maxFrame = 3200 - 1 - size;
        // Round max frame index down to the nearest multiple of 10.
        const alignedMaxFrame = maxFrame - (maxFrame % 10);
        // Clamp frame so that it always generates indices in range.
        const clampedZ = Math.min(Math.max(where[0] - size / 2, 0), alignedMaxFrame);
        const clampedX = Math.min(Math.max(where[1] - size / 2, 0), alignedMaxFrame);
        // Round z and x up to the nearest multiple of 10,
        // so that startZ and startX are multiples of 10,
        // which prevents any tile from being duplicated in redraw()
        // as the frame changes.
        // Since we clamp to an aligned max, this is never out of bounds.
        const alignedZ = clampedZ - 1 - ((clampedZ - 1) % 10) + 10;
        const alignedX = clampedX - 1 - ((clampedX - 1) % 10) + 10;
        this.frame[0] = alignedZ + size / 2;
        this.frame[1] = alignedX + size / 2;
        return oldFrameZ !== this.frame[0] || oldFrameX !== this.frame[1];
    }

    /**
     * Called by A-Frame when initializing and when the properties are updated.
     * Never call directly.
     */
    update() {
        // Update attributes from data
        this.attrs.colorizer = Colorizer[this.data.colorizer];
        this.attrs.renderDistance = this.data.renderDistance;
        this.attrs.timesDetail = this.data.timesDetail;
        const newPlace = [this.data.frame.x, this.data.frame.y];
        this.setFrame(newPlace);

        const colorizer = this.attrs.colorizer;
        const highDetailLen = this.attrs.timesDetail * 10;
        const material = this.materials[0];
        const root = this.root;
        const size = this.attrs.renderDistance;
        const tileMeshes = this.tileMeshes;
        const tiles = this.tiles;
        // Cancel any pending bvh calculations.
        this.bvhWorker.worker.terminate();
        // Remove all old tiles and entities.
        tileMeshes.length = 0;
        for (let i = root.children.length - 1; i >= 0; i--) {
            const lod = root.children[i];
            for (let j = 0, len = lod.children.len; j < len; j++) {
                const mesh = lod.children[j];
                delete tiles[mesh.id];
                mesh.dispose();
            }
            lod.removeFromParent();
        }

        // Add new tiles.
        const startZ = this.frame[0] - size / 2;
        const startX = this.frame[1] - size / 2;
        for (let z = 0; z < size; z += 10) {
            for (let x = 0; x < size; x += 10) {
                const tile = new Tile(startX + x, startZ + z, colorizer);
                const lod = new THREE.LOD();
                lod.position.copy(tile.position);
                lod.updateMatrix();
                lod.matrixAutoUpdate = false;
                lod.updateMatrixWorld();

                // LODs:
                // - 2x2 tiles to 1 data
                // - 1-to-1 data
                // - min triangles
                // High detail mesh
                let mesh = new THREE.Mesh(tile.detail(highDetailLen), material);
                mesh.updateMatrix();
                mesh.matrixAutoUpdate = false;
                lod.addLevel(mesh, 40);
                mesh.updateMatrixWorld();
                // Synchronously generate high detail mesh's bounds tree,
                // since we can't make any strong guarantees about the camera
                // position.
                // Only the high detail mesh is raytraced, so only it needs a bvh.
                mesh.geometry.computeBoundsTree();
                // Add high detail mesh to tileMeshes so that raycasting uses
                // the most precise mesh.
                tileMeshes.push(mesh);
                tiles[mesh.id] = tile;
                // Medium detail
                mesh = new THREE.Mesh(tile.detail(20), material);
                mesh.updateMatrix();
                mesh.matrixAutoUpdate = false;
                lod.addLevel(mesh, 300);
                mesh.updateMatrixWorld();
                // Low detail
                mesh = new THREE.Mesh(tile.detail(10), material);
                mesh.updateMatrix();
                mesh.matrixAutoUpdate = false;
                lod.addLevel(mesh, 500);
                mesh.updateMatrixWorld();

                root.add(lod);
            }
        }
    }
}

// Add extension functions from three-mesh-bvh,
// which improve the performance of raycast() to a usable level.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
