import { vec3, vec4, mat4 } from 'src/app/gl-matrix.js';
import { Square, Triangle, makeVec, addVec, Point, getTrianglesFromSquares } from 'src/app/math_utils';

export class Volume {
    z: Slice[] = [];

    isPt(pt: vec3): boolean {
        return this.z[pt[2]].y[pt[1]].x[pt[0]];
    }

    isPts(pts: vec3[]): boolean {
        return pts.every((pt) => {
            return this.isPt(pt);
        });
    }
}

export interface Slice {
    y: Row[];
}

export interface Row {
    x: boolean[];
}