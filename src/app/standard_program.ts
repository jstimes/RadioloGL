
import {loadTexture, initShaderProgram, loadShader} from './gl_utils';

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec3 vNormal;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  varying vec3 vNormal;

  uniform vec4 uColor;

  void main() {
    gl_FragColor = uColor;
  }
`;

interface AttribLocations {
    vertexPosition: number;
    vertexNormal: number;
}
interface UniformLocations {
    projectionMatrix: WebGLUniformLocation;
    viewMatrix: WebGLUniformLocation;
    modelMatrix: WebGLUniformLocation;
    normalMatrix: WebGLUniformLocation;
    color: WebGLUniformLocation;
}
class StandardProgram {

    program: WebGLProgram;
    attribLocations: AttribLocations;
    uniformLocations: UniformLocations;

    init(gl: WebGLRenderingContext) {
        const shaderProgram = initShaderProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
        this.program = shaderProgram;
        this.attribLocations = {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
          };
         this.uniformLocations = {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            color: gl.getUniformLocation(shaderProgram, 'uColor'),
          };
    }
}

export const STANDARD_PROGRAM = new StandardProgram();