import { vec3, vec4, mat4 } from 'src/app/gl-matrix.js';
import { Square, Triangle, makeVec, addVec, Point, getTrianglesFromSquares } from 'src/app/math_utils';

// TODO - don't just store a boolean! Fist just store average or interpolation 
// or something more specific, and decide what to do with it when converting to 
// a mesh.

/** Collection of all sampled images in a stack. */
export class Volume {
    readonly z: Slice[] = [];

    isPt(pt: vec3): boolean {
        return this.z[pt[2]].y[pt[1]].x[pt[0]];
    }

    isPts(pts: vec3[]): boolean {
        return pts.every((pt) => {
            return this.isPt(pt);
        });
    }
}

/** Collection of all sampling rows of an entire image. */
export interface Slice {
    readonly y: Row[];
}

/** Represents a row of samplings of a single image. */
export interface Row {
    /** 
     * Each element represents whether that sampled section of the row  is 
     * above the rendering threshold.
     */
    readonly x: boolean[];
}