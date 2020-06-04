import { vec3, vec4, mat4 } from 'src/app/gl-matrix.js';
import { TextureRenderable } from 'src/app/texture_renderable';
import { Square, Triangle, makeVec, addVec, Point, getTrianglesFromSquares, getCubeFacesFromVertices, makeVec4 } from 'src/app/math_utils';
import { StandardRenderable } from 'src/app/standard_renderable';
import { Volume, Slice, Row } from 'src/app/processing/volume';
import { CubeMeshRenderable } from '../cube_mesh_renderable';

// TODO - consider pre-loading images before using image processor stuff to 
// avoid all Promises/async stuff that isn't really relevant to processing.

export interface ProcessParams {
    // TODO - avg when != to 1?
    /** 
     * How many pixels to SKIP when processing an image. 
     * E.g. 1 means use every pixel, 4 means use every fourth.  
     */
    readonly sampleRate: number;

    /**
     *  The min length a voxel's RGB vector must be greater
     *  than to be considered included in the mesh. 
     */
    readonly pixelIntensityThreshold: number;
}

/** 
 * Returns a full 3D volume of the stack, where a cube is included 
 * if every corner point of the cube is above threshold.
 * Includes inner cubes, not very efficient...
 */
export async function getDenseMeshFromStack(
    gl: WebGLRenderingContext,
    stackImagePaths: string[],
    params: ProcessParams): Promise<StandardRenderable> {

    const { sampleRate, pixelIntensityThreshold } = params;
    const volume = await getVolume(stackImagePaths, params);

    console.log("Processed images, generating mesh points...");

    const triangles = [];
    const samplesWidth = volume.z[0].y[0].x.length;
    const samplesHeight = volume.z[0].y.length;
    const imageWidth = samplesWidth * sampleRate;
    const imageHeight = samplesHeight * sampleRate;

    const stackSize = volume.z.length;
    const zOffset = 1;
    const toGlPt = (volumeIndex: vec3): vec3 => {
        return makeVec(
            volumeIndex[0] * sampleRate * (2 / imageWidth) - 1,
            volumeIndex[1] * sampleRate * (2 / imageHeight) - 1,
            volumeIndex[2] * zOffset * (2 / stackSize));
    };
    for (let z = 1; z < stackSize; z++) {
        for (let y = 1; y < samplesHeight; y++) {
            for (let x = 1; x < samplesWidth; x++) {
                const rightTopFront = makeVec(x, y, z);
                const leftTopFront = makeVec(x - 1, y, z);
                const leftBottomFront = makeVec(x - 1, y - 1, z);
                const rightBottomFront = makeVec(x, y - 1, z);
                const leftTopBack = makeVec(x - 1, y, z - 1);
                const leftBottomBack = makeVec(x - 1, y - 1, z - 1);
                const rightBottomBack = makeVec(x, y - 1, z - 1);
                const rightTopBack = makeVec(x, y, z - 1);

                const allCubePts = [
                    leftTopBack,
                    leftBottomBack,
                    rightBottomBack,
                    rightTopBack,
                    leftTopFront,
                    leftBottomFront,
                    rightBottomFront,
                    rightTopFront,
                ];
                const shouldCubeBeInMesh =
                    volume.arePointsAboveThreshold(
                        allCubePts, pixelIntensityThreshold);
                if (!shouldCubeBeInMesh) {
                    continue;
                }
                const cubeFaces = getCubeFacesFromVertices({
                    leftTopFront,
                    leftBottomFront,
                    rightBottomFront,
                    rightTopFront,
                    rightTopBack,
                    rightBottomBack,
                    leftBottomBack,
                    leftTopBack,
                });

                const squares =
                    cubeFaces.map((square) => {
                        return new Square({
                            a: toGlPt(square.a),
                            b: toGlPt(square.b),
                            c: toGlPt(square.c),
                            d: toGlPt(square.d),
                        });
                    });
                getTrianglesFromSquares(squares).forEach(tri => {
                    triangles.push(tri);
                });
            }
        }
    }
    console.log("Generated mesh points, creating buffers...");

    const renderable = new StandardRenderable();
    renderable.addTriangles(triangles);
    renderable.initBuffers(gl);

    return renderable;
}

/** 
 * Returns a full 3D volume of the stack using instanced cubes where each cube's
 * transparency is based on its color intensity.
 */
export async function getSemiTransparentMeshFromStack(
    gl: WebGLRenderingContext,
    stackImagePaths: string[],
    params: ProcessParams): Promise<CubeMeshRenderable[]> {

    const { sampleRate, pixelIntensityThreshold } = params;
    const volume = await getVolume(stackImagePaths, params);

    console.log("Processed images, generating mesh points...");

    const samplesWidth = volume.z[0].y[0].x.length;
    const samplesHeight = volume.z[0].y.length;
    const imageWidth = samplesWidth * sampleRate;
    const imageHeight = samplesHeight * sampleRate;
    const stackSize = volume.z.length;
    const zOffset = .5;

    let models = [];
    let colors = [];
    const renderables: CubeMeshRenderable[] = [];
    for (let z = 1; z < stackSize; z++) {
        for (let y = 1; y < samplesHeight; y++) {
            for (let x = 1; x < samplesWidth; x++) {
                const volumePtRightTopFront = makeVec(x, y, z);
                const volumePtLeftTopFront = makeVec(x - 1, y, z);
                const volumePtLeftDownFront = makeVec(x - 1, y - 1, z);
                const volumePtRightDownFront = makeVec(x, y - 1, z);
                const volumePtLeftTopBack = makeVec(x - 1, y, z - 1);
                const volumePtLeftDownBack = makeVec(x - 1, y - 1, z - 1);
                const volumePtRightDownBack = makeVec(x, y - 1, z - 1);
                const volumePtRightTopBack = makeVec(x, y, z - 1);

                const allCubePts = [
                    volumePtLeftTopBack,
                    volumePtLeftDownBack,
                    volumePtRightDownBack,
                    volumePtRightTopBack,
                    volumePtLeftTopFront,
                    volumePtLeftDownFront,
                    volumePtRightDownFront,
                    volumePtRightTopFront,
                ];
                const shouldCubeBeInMesh =
                    volume.arePointsAboveThreshold(
                        allCubePts, pixelIntensityThreshold);
                if (!shouldCubeBeInMesh) {
                    continue;
                }
                const halfSampleRate = sampleRate / 2;
                const maxDepth = stackSize * zOffset;
                // Cube's center position in image coordinates.
                const cubeCenterStackCoords =
                    makeVec(
                        x * sampleRate - halfSampleRate,
                        y * sampleRate - halfSampleRate,
                        z * zOffset - zOffset / 2);
                // Cube's center translated to the region:
                //    x: [-1, 1]
                //    y: [-1, 1]
                //    z: [0, <maxDepth>]
                const cubeCenterGlCoords =
                    makeVec(
                        cubeCenterStackCoords[0] * (2 / imageWidth) - 1,
                        cubeCenterStackCoords[1] * (2 / imageHeight) - 1,
                        cubeCenterStackCoords[2] * -1);

                const model = mat4.create();
                mat4.translate(model, model, cubeCenterGlCoords);
                const xScale = (2 / samplesWidth);
                const yScale = (2 / samplesHeight);
                const zScale = 1;
                mat4.scale(model, model, makeVec(xScale, yScale, zScale));
                models.push(model);

                const averageColorIntensity =
                    allCubePts.map((volumeIndex) => {
                        return volume.z[volumeIndex[2]]
                            .y[volumeIndex[1]]
                            .x[volumeIndex[0]];
                    })
                        .reduce((totalIntensity: number, currentIntensity: number) => {
                            return totalIntensity + currentIntensity;
                        })
                    / allCubePts.length;
                const color = makeVec4(
                    averageColorIntensity,
                    averageColorIntensity,
                    averageColorIntensity,
                    averageColorIntensity);
                colors.push(color);
            }
        }
        const cubeMesh = new CubeMeshRenderable(gl, models, colors);
        renderables.push(cubeMesh);
        models = [];
        colors = [];
    }

    return renderables;
}

/** 
 * Generates a 2d mesh of a single image, only contianing points where each 
 * corner of a square is above the threshold. 
 */
export async function getMeshFromImage(
    gl: WebGLRenderingContext, sliceImagePath: string, params: ProcessParams):
    Promise<StandardRenderable> {

    const slice = await processSlice(sliceImagePath, params);

    const triangles: Triangle[] = [];
    const { sampleRate } = params;
    const samplesWidth = slice.y[0].x.length;
    const samplesHeight = slice.y.length;
    const width = samplesWidth * sampleRate;
    const height = samplesHeight * sampleRate;
    const z = 1.0;
    const toGlPt = (imagePt: Point): vec3 => {
        return makeVec(
            imagePt.x * (2 / width) - 1, imagePt.y * (2 / height) - 1, z);
    };
    for (let y = 1; y < samplesHeight; y++) {
        for (let x = 1; x < samplesWidth; x++) {
            const isPtAbove = slice.y[y].x[x];
            const isLeftPtAbove = slice.y[y].x[x - 1];
            const isUpPtAbove = slice.y[y - 1].x[x];
            const isLeftUpPtAbove = slice.y[y - 1].x[x - 1];

            const imagePt = { x: x * sampleRate, y: y * sampleRate };
            const imagePtLeft = { x: (x - 1) * sampleRate, y: y * sampleRate };
            const imagePtUp = { x: x * sampleRate, y: (y - 1) * sampleRate };
            const imagePtLeftUp =
                { x: (x - 1) * sampleRate, y: (y - 1) * sampleRate };

            const glPt = toGlPt(imagePt);
            const glLeftPt = toGlPt(imagePtLeft);
            const glUpPt = toGlPt(imagePtUp);
            const glLeftUpPt = toGlPt(imagePtLeftUp);

            if (!isPtAbove && !isLeftPtAbove
                && !isUpPtAbove && !isLeftPtAbove) {
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
    const renderable = new StandardRenderable();
    renderable.addTriangles(triangles);
    renderable.initBuffers(gl);
    return renderable;
}

async function getVolume(stackImagePaths: string[], params: ProcessParams):
    Promise<Volume> {

    const volume = new Volume();
    const slicePromises = [];
    stackImagePaths.forEach((path: string) => {
        slicePromises.push(processSlice(path, params));
    });
    const slices = await Promise.all(slicePromises);
    slices.forEach((slice: Slice) => {
        volume.z.push(slice);
    });
    return volume;
}

/** 
 * Samples a single image, specified by `src`, according to `params`, returning
 * a 2D grid of the results of each sample section.
 */
function processSlice(src: string, params: ProcessParams): Promise<Slice> {
    const { sampleRate } = params;
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const cells = image.width / sampleRate;

            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            canvas.getContext('2d').drawImage(
                image, 0, 0, image.width, image.height);

            const slice: Slice = {
                y: [],
            };
            for (let y = 0; y < cells; y++) {
                const row: Row = {
                    x: [],
                };
                for (let x = 0; x < cells; x++) {
                    const pt = { x: x * sampleRate, y: y * sampleRate };
                    const rgba =
                        canvas.getContext('2d')
                            .getImageData(pt.x, pt.y, 1, 1).data;
                    const rgb = [rgba[0] / 255, rgba[1] / 255, rgba[2] / 255];
                    const rgbLength =
                        Math.sqrt(rgb[0] * rgb[0] + rgb[1] * rgb[1] + rgb[2] * rgb[2]);
                    row.x.push(rgbLength);
                }
                slice.y.push(row);
            }
            resolve(slice);
        };
        image.src = src;
    });
}