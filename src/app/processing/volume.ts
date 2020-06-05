import { vec3, vec4, mat4 } from 'gl-matrix';
import { Square, Triangle, makeVec, addVec, Point, getTrianglesFromSquares } from 'src/app/math_utils';

// TODO - don't just store a boolean! Fist just store average or interpolation 
// or something more specific, and decide what to do with it when converting to 
// a mesh.

/** Collection of all sampled images in a stack. */
export class Volume {
    readonly z: Slice[] = [];

    isPointAboveThreshold(point: vec3, threshold: number): boolean {
        return this.z[point[2]].y[point[1]].x[point[0]] > threshold;
    }

    arePointsAboveThreshold(points: vec3[], threshold: number): boolean {
        return points.every((point) => {
            return this.isPointAboveThreshold(point, threshold);
        });
    }
}

/** Collection of all sampled rows of an entire image. */
export interface Slice {
    readonly y: Row[];
}

/** Represents a row of samplings of a single image. */
export interface Row {
    /** 
     * Each element represents the color intesity at a certain point of the row.
     * 
     * The corresponding image coordinate is the index * sampleRate.
     */
    readonly x: number[];
}