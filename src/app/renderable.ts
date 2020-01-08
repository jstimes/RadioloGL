import {mat4, vec3, vec4} from './gl-matrix.js'
import {Triangle, makeVec, addVec} from './math_utils';
import {StandardProgram} from './programs';

export class Renderable {

    buffers: {position: WebGLBuffer; normal: WebGLBuffer};
  
    positions: number[] = [];
    normals: number[] = [];
  
    getPositions(): number[] {
        return this.positions;
    }
  
    getNormals(): number[] {
        return this.normals;
    }
  
    addTriangles(triangles: Triangle[]): void {
        for (let triangle of triangles) {
            const triNormal = triangle.getNormal();
            vec3.normalize(triNormal, triNormal);
            addVec(this.positions, triangle.a);
            addVec(this.positions, triangle.b);
            addVec(this.positions, triangle.c);
            addVec(this.normals, triNormal);
            addVec(this.normals, triNormal);
            addVec(this.normals, triNormal);
        }
    }
  
    initBuffers(gl: WebGLRenderingContext) {    
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,
                      new Float32Array(this.getPositions()),
                      gl.STATIC_DRAW);
    
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getNormals()),
                      gl.STATIC_DRAW);
      
        this.buffers = {
          position: positionBuffer,
          normal: normalBuffer,
        };
    }
  
    render(gl: WebGLRenderingContext, program: StandardProgram, modelMatrix: mat4) {
  
        // Projection & view matrices uniform is expected to be set already.
  
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
  
        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute.
        {
            const numComponents = 3;  // pull out 3 values per iteration
            const type = gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                    // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
            gl.vertexAttribPointer(
                program.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
            program.attribLocations.vertexPosition);
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
                program.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                program.attribLocations.vertexNormal);
        }
        
        // Tell WebGL to use our program when drawing
        gl.useProgram(program.program);
        
        // Set the shader uniforms
        gl.uniformMatrix4fv(
            program.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        gl.uniformMatrix4fv(
            program.uniformLocations.normalMatrix,
            false,
            normalMatrix);
        
        {
            const vertexCount = this.getPositions().length / 3;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            // gl.LINE_STRIP
            gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
        }
    }
  }