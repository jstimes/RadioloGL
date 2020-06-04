import { initShaderProgram, loadShader } from './gl_utils';

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  attribute vec4 aVertexPosition;
  attribute vec4 aColor;
  attribute mat4 aModelMatrix;

  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec4 vColor;

  void main() {
    gl_Position = 
        uProjectionMatrix * uViewMatrix * aModelMatrix * aVertexPosition;
    vColor = aColor;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  varying vec4 vColor;

  void main() {
    gl_FragColor = vColor;
  }
`;

interface AttribLocations {
    readonly vertexPosition: number;
    readonly modelMatrix: number;
    readonly color: number;
}
interface UniformLocations {
    readonly projectionMatrix: WebGLUniformLocation;
    readonly viewMatrix: WebGLUniformLocation;
}
class InstancedProgram {

    program: WebGLProgram;
    attribLocations: AttribLocations;
    uniformLocations: UniformLocations;

    init(gl: WebGLRenderingContext) {
        const shaderProgram = initShaderProgram(
            gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
        this.program = shaderProgram;
        this.attribLocations = {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            modelMatrix: gl.getAttribLocation(shaderProgram, 'aModelMatrix'),
            color: gl.getAttribLocation(shaderProgram, 'aColor'),
        };
        this.uniformLocations = {
            projectionMatrix:
                gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
        };
    }
}

export const INSTANCED_PROGRAM = new InstancedProgram();