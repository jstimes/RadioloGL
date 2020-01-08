
import {loadTexture, initShaderProgram, loadShader} from './gl_utils';


const VERTEX_SHADER_SOURCE = `
  precision highp float;

  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;
  attribute vec2 aTextureCoord;

  uniform mat4 uNormalMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec2 vTextureCoord;
  varying vec3 vLighting;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;

    // Apply lighting effect
    vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    vec3 directionalLightColor = vec3(1, 1, 1);
    vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  varying vec3 vLighting;
  varying vec2 vTextureCoord;

  uniform float uContrastLower;
  uniform float uContrastUpper;

  uniform sampler2D uSampler;

  void main() {
    vec4 texelColor = texture2D(uSampler, vTextureCoord);

    float value = smoothstep(uContrastLower, uContrastUpper, length(texelColor.rgb));
    vec3 rgb = vec3(value);

    gl_FragColor = vec4(rgb, texelColor.a);
  }
`;

interface AttribLocations {
    vertexPosition: number;
    vertexNormal: number;
    textureCoord: number;
}
interface UniformLocations {
    projectionMatrix: WebGLUniformLocation;
    viewMatrix: WebGLUniformLocation;
    modelMatrix: WebGLUniformLocation;
    normalMatrix: WebGLUniformLocation
    sampler: WebGLUniformLocation;
    contrastLower: WebGLUniformLocation;
    contrastUpper: WebGLUniformLocation;
}

class TextureProgram {

    program: WebGLProgram;
    attribLocations: AttribLocations;
    uniformLocations: UniformLocations;

    init(gl: WebGLRenderingContext) {
        const shaderProgram = initShaderProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
        this.program = shaderProgram;
        this.attribLocations = {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
          };
         this.uniformLocations = {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            sampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
            contrastLower: gl.getUniformLocation(shaderProgram, 'uContrastLower'),
            contrastUpper: gl.getUniformLocation(shaderProgram, 'uContrastUpper'),
          };
    }
}

export const TEXTURE_PROGRAM = new TextureProgram();