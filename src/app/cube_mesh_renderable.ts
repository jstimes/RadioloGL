import { Square, makeVec, getPointsArrayFromSquares, getCubeFacesFromVertices } from './math_utils';
import { mat4, vec3, vec4 } from './gl-matrix.js';
import { INSTANCED_PROGRAM } from './instanced_program';

const ENTRIES_PER_COLOR = 4;
const ENTRIES_PER_MATRIX = 16;
const BYTES_PER_FLOAT = 4;

/** 
 * A mesh composed of instanced cubes where each component is defined by
 * it's translation and color.
 * 
 * To be rendered with the InstancedProgram.
 */
export class CubeMeshRenderable {

    private readonly numInstances;
    private numVertices: number;
    private matrices: Float32Array[];
    private modelMatrixData: Float32Array;
    private modelMatrixBuffer: WebGLBuffer;
    private colorBuffer: WebGLBuffer;
    private positionBuffer: WebGLBuffer;

    constructor(gl: WebGLRenderingContext, modelMatrices: mat4[], colors: vec4[]) {
        if (modelMatrices.length !== colors.length) {
            throw new Error(`Expected same number of models and colors`);
        }
        this.numInstances = modelMatrices.length;

        this.modelMatrixData = new Float32Array(
            this.numInstances * ENTRIES_PER_MATRIX);
        this.matrices = [];
        for (let i = 0; i < this.numInstances; ++i) {
            const byteOffsetToMatrix = i * ENTRIES_PER_MATRIX * BYTES_PER_FLOAT;
            const numFloatsForView = ENTRIES_PER_MATRIX;
            const newMatrix = new Float32Array(
                this.modelMatrixData.buffer,
                byteOffsetToMatrix,
                numFloatsForView);

            const modelMatrix = modelMatrices[i];
            for (let j = 0; j < ENTRIES_PER_MATRIX; j++) {
                newMatrix[j] = modelMatrix[j];
            }
            this.matrices.push(newMatrix);
        }
        this.modelMatrixBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.modelMatrixBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER, this.modelMatrixData.byteLength, gl.DYNAMIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        const colorData = new Float32Array(
            this.numInstances * ENTRIES_PER_COLOR);
        for (let i = 0; i < this.numInstances; i++) {
            const color = colors[i];
            for (let j = 0; j < ENTRIES_PER_COLOR; j++) {
                colorData[i + j] = color[j];
            }
        }
        gl.bufferData(gl.ARRAY_BUFFER,
            colorData,
            gl.STATIC_DRAW);

        const size = 1;
        const leftTopFront = makeVec(-size, size, size);
        const leftBottomFront = makeVec(-size, -size, size);
        const rightBottomFront = makeVec(size, -size, size);
        const rightTopFront = makeVec(size, size, size);
        const rightTopBack = makeVec(size, size, -size);
        const rightBottomBack = makeVec(size, -size, -size);
        const leftBottomBack = makeVec(-size, -size, -size);
        const leftTopBack = makeVec(-size, size, -size);
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
        const cubePoints = getPointsArrayFromSquares(cubeFaces);
        this.numVertices = cubePoints.length / 3;
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cubePoints, gl.STATIC_DRAW);
    }

    update(elapsedMs: number): void {
        // No-op.
    }

    render(gl: WebGL2RenderingContext): void {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        {
            const positionLoc = INSTANCED_PROGRAM.attribLocations.vertexPosition;
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(positionLoc, 0);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.modelMatrixBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.modelMatrixData);

        const bytesPerMatrix = 4 * 16;
        for (let i = 0; i < 4; ++i) {
            const loc = INSTANCED_PROGRAM.attribLocations.modelMatrix + i;
            gl.enableVertexAttribArray(loc);
            // note the stride and offset
            // 4 floats per row, 4 bytes per float
            const offset = i * 16;
            gl.vertexAttribPointer(
                // location
                loc,
                // size (num values to pull from buffer per iteration)
                4,
                // type of data in buffer
                gl.FLOAT,
                // normalize
                false,
                // stride, num bytes to advance to get to next set of values
                bytesPerMatrix,
                // offset in buffer
                offset,
            );
            // this line says this attribute only changes for each 1 instance
            gl.vertexAttribDivisor(loc, 1);
        }

        // set attribute for color
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        const colorLoc = INSTANCED_PROGRAM.attribLocations.color;
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        // this line says this attribute only changes for each 1 instance
        gl.vertexAttribDivisor(colorLoc, 1);

        gl.drawArraysInstanced(
            gl.TRIANGLES,
            // offset
            0,
            // num vertices per instance
            this.numVertices,
            // num instances
            this.numInstances,
        );
    }

}