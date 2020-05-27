import { vec3, vec4, mat4 } from './gl-matrix.js';

export const EPSILON: number = .001;

/** Creates a gl-matrix vec3 object. */
export function makeVec(x: number, y: number, z: number): vec3 {
    const vector = vec3.create();
    vec3.set(vector, x, y, z);
    return vector;
}

/** Creates a gl-matrix vec4 object. */
export function makeVec4(x: number, y: number, z: number, w: number): vec4 {
    const vector = vec4.create();
    vec4.set(vector, x, y, z, w);
    return vector;
}

/** A thing with an x and a y. */
export interface Point {
    readonly x: number;
    readonly y: number;
}

// TODO - rename to pushVec?
/** Appends a vec3 to an array of numbers. */
export function addVec(arr: number[], vec: vec3) {
    arr.push(vec[0]);
    arr.push(vec[1]);
    arr.push(vec[2]);
}

export function hasSignChange(a: number, b: number) {
    return a >= 0 && b < 0 || a < 0 && b >= 0;
}

export function sign(num: number) {
    return num > 0.0 ? 1.0 : -1.0;
}

/** Returns the triangles that make up a list of squares (2 per square). */
export function getTrianglesFromSquares(squares: Square[]): Triangle[] {
    const triangles: Triangle[] = [];
    for (let square of squares) {
        const triA = new Triangle(square.a, square.b, square.d);
        const triB = new Triangle(square.b, square.c, square.d);
        triangles.push(triA);
        triangles.push(triB);
    }
    return triangles;
}

/** Mutable representation of a triangle (three points). */
export class Triangle {
    constructor(
        public a: vec3,
        public b: vec3,
        public c: vec3) { }

    getNormal(): vec3 {
        const u = vec3.create();
        const v = vec3.create();
        vec3.sub(u, this.b, this.a);
        vec3.sub(v, this.c, this.a);
        return makeVec(
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]);
    }

    clone() {
        return new Triangle(
            vec3.clone(this.a), vec3.clone(this.b), vec3.clone(this.c));
    }

    translate(trans: vec3): Triangle {
        vec3.add(this.a, this.a, trans);
        vec3.add(this.b, this.b, trans);
        vec3.add(this.c, this.c, trans);
        return this;
    }

    flip(): Triangle {
        const copy = this.clone();
        this.a = copy.c;
        this.b = copy.b;
        this.c = copy.a;
        return this;
    }
}

/** Mutable representation of a square (four points). */
export class Square {
    // Note that while the reference is readonly, the values are not...
    readonly a: vec3;
    readonly b: vec3;
    readonly c: vec3;
    readonly d: vec3;

    constructor({ a, b, c, d }: { a: vec3; b: vec3; c: vec3; d: vec3 }) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }

    clone(): Square {
        return new Square({
            a: vec3.clone(this.a),
            b: vec3.clone(this.b),
            c: vec3.clone(this.c),
            d: vec3.clone(this.d),
        });
    }

    translate(vec: vec3): Square {
        vec3.add(this.a, this.a, vec);
        vec3.add(this.b, this.b, vec);
        vec3.add(this.c, this.c, vec);
        vec3.add(this.d, this.d, vec);
        return this;
    }

    getCenter(): vec3 {
        const bToA = vec3.sub(vec3.create(), this.a, this.b);
        const bToC = vec3.sub(vec3.create(), this.c, this.b);
        vec3.scale(bToA, bToA, .5); vec3.scale(bToC, bToC, .5);
        const center = vec3.add(vec3.create(), bToA, bToC);
        return center;
    }
}
