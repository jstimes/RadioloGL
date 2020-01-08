
import {mat4, vec3, vec4} from './gl-matrix.js'
import {TEXTURE_PROGRAM} from './texture_program';
import { CONTROLS, Key } from 'src/app/controls';
import {loadTexture} from './gl_utils';

interface Buffers {
    position: WebGLBuffer;
    textureCoord: WebGLBuffer;
    normal: WebGLBuffer;
    indices: WebGLBuffer;
}

export class TextureRenderable {

    textureIndex: number = 0;
    textures: WebGLTexture[] = [];

    contrastLower = .85;
    contrastUpper = .9;
    delta = .005;

    buffers: Buffers;

    constructor(gl: WebGLRenderingContext, imagePaths: string[]) {
        imagePaths.forEach((imagePath: string) => {
            this.textures.push(loadTexture(gl, imagePath));
        });
        this.initBuffers(gl);
    }

    update(elapsedMs: number): void {
    
        if (CONTROLS.isKeyDown(Key.C)) {
          this.contrastLower -= this.delta;
        }
        if (CONTROLS.isKeyDown(Key.V)) {
          this.contrastLower += this.delta;
        }
        if (CONTROLS.isKeyDown(Key.B)) {
          this.contrastUpper -= this.delta;
        }
        if (CONTROLS.isKeyDown(Key.N)) {
          this.contrastUpper += this.delta;
        }
        if (CONTROLS.isKeyDown(Key.W)) {
          if (this.textureIndex < this.textures.length - 1) {
            this.textureIndex++;
          }
        }
        if (CONTROLS.isKeyDown(Key.S)) {
          if (this.textureIndex > 0) {
            this.textureIndex--;
          }
        }
        document.getElementById('contrast-lower').innerHTML = `Contrast lower: ${this.contrastLower}`;
        document.getElementById('contrast-upper').innerHTML = `Contrast upper: ${this.contrastUpper}`;
    
        
        document.getElementById('slice').innerHTML = `Slice: ${this.textureIndex}`;
      }

    render(gl: WebGLRenderingContext) {
        const modeMatrix = mat4.create();


        const normalMatrix = mat4.create();
        // TODO - modelView?
        mat4.invert(normalMatrix, modeMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3;  // pull out 2 values per iteration
            const type = gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                    // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
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

        // Tell WebGL how to pull out the normals from
        // the normal buffer into the vertexNormal attribute.
        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
            gl.vertexAttribPointer(
            TEXTURE_PROGRAM.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
            TEXTURE_PROGRAM.attribLocations.vertexNormal);
        }

        // tell webgl how to pull out the texture coordinates from buffer
        {
            const num = 2; // every coordinate composed of 2 values
            const type = gl.FLOAT; // the data in the buffer is 32 bit float
            const normalize = false; // don't normalize
            const stride = 0; // how many bytes to get from one set to the next
            const offset = 0; // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.textureCoord);
            gl.vertexAttribPointer(TEXTURE_PROGRAM.attribLocations.textureCoord, num, type, normalize, stride, offset);
            gl.enableVertexAttribArray(TEXTURE_PROGRAM.attribLocations.textureCoord);
        }

        // Tell WebGL which indices to use to index the vertices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

        // Tell WebGL we want to affect texture unit 0
        gl.activeTexture(gl.TEXTURE0);

        // Bind the texture to texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.textureIndex]);
    
        gl.uniformMatrix4fv(
        TEXTURE_PROGRAM.uniformLocations.modelMatrix,
            false,
            modeMatrix);
        gl.uniformMatrix4fv(
        TEXTURE_PROGRAM.uniformLocations.normalMatrix,
            false,
            normalMatrix);

        gl.uniform1f(TEXTURE_PROGRAM.uniformLocations.contrastLower, this.contrastLower);
        gl.uniform1f(TEXTURE_PROGRAM.uniformLocations.contrastUpper, this.contrastUpper);
    
        {
            const vertexCount = 6; //36
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            // gl.LINE_STRIP
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    private initBuffers(gl: WebGLRenderingContext) {
        // Create a buffer for the square's positions.
        const positionBuffer = gl.createBuffer();
      
        // Select the positionBuffer as the one to apply buffer
        // operations to from here out
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      
        // Cube
        const positions = [
          // Front face
          -1.0, -1.0,  1.0,
           1.0, -1.0,  1.0,
           1.0,  1.0,  1.0,
          -1.0,  1.0,  1.0,
          
          // Back face
          // -1.0, -1.0, -1.0,
          // -1.0,  1.0, -1.0,
          //  1.0,  1.0, -1.0,
          //  1.0, -1.0, -1.0,
          
          // // Top face
          // -1.0,  1.0, -1.0,
          // -1.0,  1.0,  1.0,
          //  1.0,  1.0,  1.0,
          //  1.0,  1.0, -1.0,
          
          // // Bottom face
          // -1.0, -1.0, -1.0,
          //  1.0, -1.0, -1.0,
          //  1.0, -1.0,  1.0,
          // -1.0, -1.0,  1.0,
          
          // // Right face
          //  1.0, -1.0, -1.0,
          //  1.0,  1.0, -1.0,
          //  1.0,  1.0,  1.0,
          //  1.0, -1.0,  1.0,
          
          // // Left face
          // -1.0, -1.0, -1.0,
          // -1.0, -1.0,  1.0,
          // -1.0,  1.0,  1.0,
          // -1.0,  1.0, -1.0,
        ];
      
        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(gl.ARRAY_BUFFER,
                      new Float32Array(positions),
                      gl.STATIC_DRAW);
    
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      
        const vertexNormals = [
          // Front
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
            0.0,  0.0,  1.0,
      
          // Back
          //   0.0,  0.0, -1.0,
          //   0.0,  0.0, -1.0,
          //   0.0,  0.0, -1.0,
          //   0.0,  0.0, -1.0,
      
          // // Top
          //   0.0,  1.0,  0.0,
          //   0.0,  1.0,  0.0,
          //   0.0,  1.0,  0.0,
          //   0.0,  1.0,  0.0,
      
          // // Bottom
          //   0.0, -1.0,  0.0,
          //   0.0, -1.0,  0.0,
          //   0.0, -1.0,  0.0,
          //   0.0, -1.0,  0.0,
      
          // // Right
          //   1.0,  0.0,  0.0,
          //   1.0,  0.0,  0.0,
          //   1.0,  0.0,  0.0,
          //   1.0,  0.0,  0.0,
      
          // // Left
          // -1.0,  0.0,  0.0,
          // -1.0,  0.0,  0.0,
          // -1.0,  0.0,  0.0,
          // -1.0,  0.0,  0.0
        ];
      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals),
                      gl.STATIC_DRAW);
    
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
      
        const textureCoordinates = [
          // Front
          0.0,  0.0,
          1.0,  0.0,
          1.0,  1.0,
          0.0,  1.0,
          // Back
          // 0.0,  0.0,
          // 1.0,  0.0,
          // 1.0,  1.0,
          // 0.0,  1.0,
          // // Top
          // 0.0,  0.0,
          // 1.0,  0.0,
          // 1.0,  1.0,
          // 0.0,  1.0,
          // // Bottom
          // 0.0,  0.0,
          // 1.0,  0.0,
          // 1.0,  1.0,
          // 0.0,  1.0,
          // // Right
          // 0.0,  0.0,
          // 1.0,  0.0,
          // 1.0,  1.0,
          // 0.0,  1.0,
          // // Left
          // 0.0,  0.0,
          // 1.0,  0.0,
          // 1.0,  1.0,
          // 0.0,  1.0,
        ];
      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                      gl.STATIC_DRAW);
    
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    
        // This array defines each face as two triangles, using the
        // indices into the vertex array to specify each triangle's
        // position.
        const indices = [
          0,  1,  2,      0,  2,  3,    // front
          // 4,  5,  6,      4,  6,  7,    // back
          // 8,  9,  10,     8,  10, 11,   // top
          // 12, 13, 14,     12, 14, 15,   // bottom
          // 16, 17, 18,     16, 18, 19,   // right
          // 20, 21, 22,     20, 22, 23,   // left
        ];
    
        // Now send the element array to GL
    
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices), gl.STATIC_DRAW);
      
        this.buffers =  {
          position: positionBuffer,
          normal: normalBuffer,
          textureCoord: textureCoordBuffer,
          indices: indexBuffer,
        };
      }
}