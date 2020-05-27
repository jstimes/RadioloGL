
import { mat4, vec3, vec4 } from './gl-matrix.js'
import { TEXTURE_PROGRAM } from './texture_program';
import { CONTROLS, Key } from 'src/app/controls';
import { loadTexture } from './gl_utils';

interface Buffers {
    readonly position: WebGLBuffer;
    readonly textureCoord: WebGLBuffer;
    readonly indices: WebGLBuffer;
}

export class TextureRenderable {

    private readonly texture: WebGLTexture;
    private buffers: Buffers;

    constructor(gl: WebGLRenderingContext, texture: WebGLTexture) {
        this.texture = texture;
        this.initBuffers(gl);
    }

    render(gl: WebGLRenderingContext) {
        const modeMatrix = mat4.create();

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            // pull out 3 values per iteration
            const numComponents = 3;
            // the data in the buffer is 32bit floats
            const type = gl.FLOAT;
            // don't normalize
            const normalize = false;
            // how many bytes to get from one set of values to the next
            // 0 = use type and numComponents above
            const stride = 0;
            // how many bytes inside the buffer to start from
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
            gl.vertexAttribPointer(
                TEXTURE_PROGRAM.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                TEXTURE_PROGRAM.attribLocations.vertexPosition);
        }

        // Tell webgl how to pull out the texture coordinates from buffer
        {
            // every coordinate composed of 2 values
            const num = 2;
            // the data in the buffer is 32 bit float
            const type = gl.FLOAT;
            // don't normalize
            const normalize = false;
            // how many bytes to get from one set to the next
            const stride = 0;
            // how many bytes inside the buffer to start from
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoord);
            gl.vertexAttribPointer(
                TEXTURE_PROGRAM.attribLocations.textureCoord,
                num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(
                TEXTURE_PROGRAM.attribLocations.textureCoord);
        }

        // Tell WebGL which indices to use to index the vertices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

        // Tell WebGL we want to affect texture unit 0
        gl.activeTexture(gl.TEXTURE0);

        // Bind the texture to texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.uniformMatrix4fv(
            TEXTURE_PROGRAM.uniformLocations.modelMatrix,
            false,
            modeMatrix);

        {
            const vertexCount = 6;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    private initBuffers(gl: WebGLRenderingContext) {
        // Create a buffer for the square's positions.
        const positionBuffer = gl.createBuffer();

        // Select the positionBuffer as the one to apply buffer
        // operations to from here out
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Square at z = 1.
        // Bottom left, bottom right, top right, top left.
        const positions = [
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,
        ];

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.STATIC_DRAW);

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

        // Bottom left, bottom right, top right, top left.
        const textureCoordinates = [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
            gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // This array defines each face as two triangles, using the
        // indices into the vertex array to specify each triangle's
        // position.
        // First triangle is Bottom left - bottom right - top right
        // Second triangle is Bottom left - top right - top left.
        const indices = [
            0, 1, 2, 0, 2, 3,
        ];

        // Now send the element array to GL
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices), gl.STATIC_DRAW);

        this.buffers = {
            position: positionBuffer,
            textureCoord: textureCoordBuffer,
            indices: indexBuffer,
        };
    }
}