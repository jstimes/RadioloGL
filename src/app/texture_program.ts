
import { loadTexture, initShaderProgram, loadShader } from './gl_utils';


const VERTEX_SHADER_SOURCE = `
  precision highp float;

  attribute vec4 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uViewMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec2 vTextureCoord;
  varying vec3 vLighting;

  void main() {
    gl_Position = 
        uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  varying vec2 vTextureCoord;

  uniform float uContrastLower;
  uniform float uContrastUpper;

  uniform sampler2D uSampler;

  void main() {
    vec4 texelColor = texture2D(uSampler, vTextureCoord);

    float value = smoothstep(
      uContrastLower, uContrastUpper, length(texelColor.rgb));
    vec3 rgb = vec3(value);

    gl_FragColor = vec4(rgb, texelColor.a);
  }
`;

interface AttribLocations {
  vertexPosition: number;
  textureCoord: number;
}
interface UniformLocations {
  projectionMatrix: WebGLUniformLocation;
  viewMatrix: WebGLUniformLocation;
  modelMatrix: WebGLUniformLocation;
  sampler: WebGLUniformLocation;
  contrastLower: WebGLUniformLocation;
  contrastUpper: WebGLUniformLocation;
}

class TextureProgram {

  program: WebGLProgram;
  attribLocations: AttribLocations;
  uniformLocations: UniformLocations;

  init(gl: WebGLRenderingContext) {
    const shaderProgram = initShaderProgram(
      gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.program = shaderProgram;
    this.attribLocations = {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    };
    this.uniformLocations = {
      projectionMatrix:
        gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
      modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
      sampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      contrastLower: gl.getUniformLocation(shaderProgram, 'uContrastLower'),
      contrastUpper: gl.getUniformLocation(shaderProgram, 'uContrastUpper'),
    };
  }
}

export const TEXTURE_PROGRAM = new TextureProgram();