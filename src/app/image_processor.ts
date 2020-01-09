import { vec3, vec4, mat4 } from './gl-matrix.js';
import { TextureRenderable } from 'src/app/texture_renderable';
import { Square, Triangle, makeVec, addVec, Point, getTrianglesFromSquares } from './math_utils';
import { StandardRenderable } from 'src/app/standard_renderable';


interface Volume {
    z: Slice[];
}

function isPt(pt: vec3, volume: Volume): boolean {
    return volume.z[pt[2]].y[pt[1]].x[pt[0]];
}

function isPts(pts: vec3[], volume: Volume): boolean {
    return pts.every((pt) => { return isPt(pt, volume); });
}

interface Slice {
    y: Row[];
}

interface Row {
    x: boolean[];
}

export class ImageProcessor {

    // TODO - avg when != to 1?
    /** 
     * How many pixels to SKIP when processing an image. 
     * E.g. 1 means use every pixel, 4 means use every fourth.  
     */
    sampleRate: number = 8;

    /**
     *  The min length a voxel's RGB vector must be greater
     *  than to be considered included in the mesh. 
     */
    pixelIntensityThreshold = .85;

    /** 
     * Returns a full 3D volume of the stack, where a cube is included if every corner point of the cube is above threshold.
     * Includes inner cubes, not very efficient...
     */
    async getDenseMeshFromStack(gl: WebGLRenderingContext, stackImagePaths: string[]): Promise<StandardRenderable> {
        const volume: Volume = {
            z: [],
        };
        const slicePromises = [];
        stackImagePaths.forEach(async (path: string) => {
            slicePromises.push(this.processImage2(gl, path));
        });
        console.log("Processed images, generating mesh points...");

        const slices = await Promise.all(slicePromises);
        slices.forEach(slice => { volume.z.push(slice) });

        const triangles = [];
        const imageWidth = volume.z[0].y[0].x.length;
        const imageHeight = volume.z[0].y.length;
        const stackSize = volume.z.length;
        const zOffset = 1;
        const toGlPt = (volumeIndex: vec3): vec3 => {
            return makeVec(
                volumeIndex[0] * this.sampleRate * (2 / imageWidth) - 1,
                volumeIndex[1] * this.sampleRate * (2 / imageHeight) - 1,
                volumeIndex[2] * zOffset * (2 / stackSize));
        };
        for (let z = 1; z < stackSize; z++) {
            for (let y = 1; y < imageHeight; y++) {
                for (let x = 1; x < imageWidth; x++) {
                    const volumePtRightTopFront = makeVec(x, y, z);
                    const volumePtLeftTopFront = makeVec(x - 1, y, z);
                    const volumePtLeftDownFront = makeVec(x - 1, y - 1, z);
                    const volumePtRightDownFront = makeVec(x, y - 1, z);
                    const volumePtLeftTopBack = makeVec(x - 1, y, z - 1);
                    const volumePtLeftDownBack = makeVec(x - 1, y - 1, z - 1);
                    const volumePtRightDownBack = makeVec(x, y - 1, z - 1);
                    const volumePtRightTopBack = makeVec(x, y, z - 1);

                    const allCubePts = [volumePtLeftTopBack, volumePtLeftDownBack, volumePtRightDownBack, volumePtRightTopBack,
                        volumePtLeftTopFront, volumePtLeftDownFront, volumePtRightDownFront, volumePtRightTopFront];
                    if (isPts(allCubePts, volume)) {
                        const glPts = allCubePts.map(toGlPt);
                        const top = new Square({ a: glPts[0], b: glPts[4], c: glPts[7], d: glPts[3] });
                        const bottom = new Square({ a: glPts[5], b: glPts[1], c: glPts[2], d: glPts[6] });
                        const back = new Square({ a: glPts[3], b: glPts[2], c: glPts[1], d: glPts[0] });
                        const left = new Square({ a: glPts[0], b: glPts[1], c: glPts[5], d: glPts[4] });
                        const front = new Square({ a: glPts[4], b: glPts[5], c: glPts[6], d: glPts[7] });
                        const right = new Square({ a: glPts[7], b: glPts[6], c: glPts[2], d: glPts[3] });

                        const squares = [top, bottom, back, left, right, front, back]
                        getTrianglesFromSquares(squares).forEach(tri => {
                            triangles.push(tri);
                        });
                    }
                }
            }
        }
        console.log("Generated mesh points, creating buffers...");

        const renderable = new StandardRenderable();
        renderable.addTriangles(triangles);
        renderable.initBuffers(gl);

        console.log("All done");

        return renderable;
    }

    processImage2(gl: WebGLRenderingContext, src: string): Promise<Slice> {
        return new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                const cells = image.width / this.sampleRate;

                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height);

                const slice: Slice = {
                    y: [],
                };
                for (let y = 0; y < cells; y++) {
                    const row: Row = {
                        x: [],
                    };
                    for (let x = 0; x < cells; x++) {
                        const pt = { x: x * this.sampleRate, y: y * this.sampleRate };
                        const rgba = canvas.getContext('2d').getImageData(pt.x, pt.y, 1, 1).data;
                        const rgb = [rgba[0] / 256, rgba[1] / 256, rgba[2] / 256];
                        const isAboveThreshold = Math.sqrt(rgb[0] * rgb[0] + rgb[1] * rgb[1] + rgb[2] * rgb[2]) > this.pixelIntensityThreshold;
                        row.x.push(isAboveThreshold);
                    }
                    slice.y.push(row);
                }
                resolve(slice);
            };
            image.src = src;
        });
    }

    /** Generates a 2d mesh of a single image, only contianing points where  each corner of a square is above the threshold. */
    async getMeshFromImage(gl: WebGLRenderingContext, stackImagePath: string): Promise<StandardRenderable> {
        const triangles = await this.processImage(gl, stackImagePath);
        const renderable = new StandardRenderable();
        renderable.addTriangles(triangles);
        renderable.initBuffers(gl);
        return renderable;
    }

    private processImage(gl: WebGLRenderingContext, src: string): Promise<Triangle[]> {
        return new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                const delta = 4;
                const cells = image.width / delta;

                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height);

                const grid: boolean[][] = [];
                for (let y = 0; y < cells; y++) {
                    const row = [];
                    for (let x = 0; x < cells; x++) {
                        const pt = { x: x * delta, y: y * delta };

                        const rgba = canvas.getContext('2d').getImageData(pt.x, pt.y, 1, 1).data;
                        const rgb = [rgba[0] / 256, rgba[1] / 256, rgba[2] / 256];
                        const isAboveThreshold = Math.sqrt(rgb[0] * rgb[0] + rgb[1] * rgb[1] + rgb[2] * rgb[2]) > this.pixelIntensityThreshold;
                        row.push(isAboveThreshold);

                    }
                    grid.push(row);
                }

                const z = 1.0;
                const toGlPt = (imagePt: Point): vec3 => {
                    return makeVec(imagePt.x * (2 / image.width) - 1, imagePt.y * (2 / image.height) - 1, z);
                };
                const triangles: Triangle[] = [];
                for (let y = 1; y < cells; y++) {
                    for (let x = 1; x < cells; x++) {
                        const isPtAbove = grid[y][x];
                        const isLeftPtAbove = grid[y][x - 1];
                        const isUpPtAbove = grid[y - 1][x];
                        const isLeftUpPtAbove = grid[y - 1][x - 1];

                        const imagePt = { x: x * delta, y: y * delta };
                        const imagePtLeft = { x: (x - 1) * delta, y: y * delta };
                        const imagePtUp = { x: x * delta, y: (y - 1) * delta };
                        const imagePtLeftUp = { x: (x - 1) * delta, y: (y - 1) * delta };

                        const glPt = toGlPt(imagePt);
                        const glLeftPt = toGlPt(imagePtLeft);
                        const glUpPt = toGlPt(imagePtUp);
                        const glLeftUpPt = toGlPt(imagePtLeftUp);

                        if (!isPtAbove && !isLeftPtAbove && !isUpPtAbove && !isLeftPtAbove) {
                            continue;
                        }
                        if (isPtAbove && isLeftPtAbove && isUpPtAbove && isLeftPtAbove) {
                            const upperLeft = new Triangle(glLeftUpPt, glLeftPt, glUpPt);
                            const lowerRight = new Triangle(glLeftPt, glPt, glUpPt);
                            triangles.push(upperLeft);
                            triangles.push(lowerRight);
                        }
                    }
                }
                resolve(triangles);
                console.log("done");
            };
            image.src = src;
        });
    }
}