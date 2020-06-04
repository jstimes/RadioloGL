import { Square, makeVec, getPointsArrayFromSquares, getCubeFacesFromVertices } from './math_utils';
import { mat4, vec3, vec4 } from './gl-matrix.js';
import { INSTANCED_PROGRAM } from './instanced_program';

/** 
 * A mesh composed of instanced cubes where each component is defined by
 * it's translation and color.
 * 
 * To be rendered with the InstancedProgram.
 */
export class CubeMeshRenderable {

    private numInstances = 5;
    private numVertices: number;
    private matrices: Float32Array[];
    private modelMatrixData: Float32Array;
    private modelMatrixBuffer: WebGLBuffer;
    private colorBuffer: WebGLBuffer;
    private positionBuffer: WebGLBuffer;

    // constructor(modelMatrices: mat4[], colors: vec4[]) {

    // }

    initBuffers(gl: WebGLRenderingContext): void {
        this.modelMatrixData = new Float32Array(this.numInstances * 16);
        this.matrices = [];
        for (let i = 0; i < this.numInstances; ++i) {
            const byteOffsetToMatrix = i * 16 * 4;
            const numFloatsForView = 16;
            const newMatrix = new Float32Array(
                this.modelMatrixData.buffer,
                byteOffsetToMatrix,
                numFloatsForView);
            newMatrix[0] = newMatrix[5] = newMatrix[10] = newMatrix[15] = 1;
            this.matrices.push(newMatrix);
        }
        this.modelMatrixBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.modelMatrixBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER, this.modelMatrixData.byteLength, gl.DYNAMIC_DRAW);

        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([
                0, 1, 0, .1,
                0, 1, 1, .1,
                0, 0, 1, .1,
                1, 1, 1, .1,
                1, 1, 1, .1,
            ]),
            gl.STATIC_DRAW);

        const size = 0.5;
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
        const seconds = elapsedMs / 1000;
        this.matrices.forEach((matrix, index) => {
            mat4.translate(
                matrix,
                mat4.create(),
                makeVec(-0.5 + index * 0.25, 0, -index));
            mat4.rotateZ(matrix, matrix, seconds * (0.1 + 0.1 * index));
        });
    }

    render(gl: WebGLRenderingContext, ext: ANGLE_instanced_arrays): void {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        {
            const positionLoc = INSTANCED_PROGRAM.attribLocations.vertexPosition;
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
            ext.vertexAttribDivisorANGLE(positionLoc, 0);
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
            ext.vertexAttribDivisorANGLE(loc, 1);
        }

        // set attribute for color
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        const colorLoc = INSTANCED_PROGRAM.attribLocations.color;
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        // this line says this attribute only changes for each 1 instance
        ext.vertexAttribDivisorANGLE(colorLoc, 1);

        ext.drawArraysInstancedANGLE(
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