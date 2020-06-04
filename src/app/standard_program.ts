import { loadTexture, initShaderProgram, loadShader } from './gl_utils';

const VERTEX_SHADER_SOURCE = `
  precision mediump float;

  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uNormalMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec3 vNormal;
  varying vec4 vPosition;

  void main() {
    vNormal = (uNormalMatrix * vec4(aVertexNormal, 1.0)).xyz;
    vPosition = 
        uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
    gl_Position = vPosition;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  varying vec3 vNormal;
  varying vec4 vPosition;

  uniform vec3 uCameraPos;
  uniform vec4 uColor;

  vec3 calculate_directional_light(
      vec3 color, 
      vec3 normal) {
    vec4 lightColor = vec4(1, 1, 1, 1);
    float shininess = 10.0;
    float specular = 1.0;

    vec3 surfaceToLight = normalize(uCameraPos - vPosition.xyz);
    vec3 ambient = vec3(.2);

    float directionalDiffuseAmount = max(dot(normal, surfaceToLight), 0.0);
    vec3 directionalDiffuse = directionalDiffuseAmount * color;
    
    vec3 surfaceToCamera = uCameraPos - vPosition.xyz;
    vec3 directionalSpecularReflectDir = reflect(surfaceToLight, normal);
    float directionalSpecularAmount = 
        pow(max(dot(surfaceToCamera, directionalSpecularReflectDir), 0.0), shininess);
    vec4 directionalSpecular = directionalSpecularAmount * lightColor * specular;

    return ambient + directionalDiffuse;// + directionalSpecular.xyz;
  }

  void main() {
    vec3 rgb = calculate_directional_light(uColor.rgb, vNormal);
    gl_FragColor = vec4(rgb, 1.0);
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
  cameraPosition: WebGLUniformLocation;
}
class StandardProgram {

  program: WebGLProgram;
  attribLocations: AttribLocations;
  uniformLocations: UniformLocations;

  init(gl: WebGLRenderingContext) {
    const shaderProgram = initShaderProgram(
      gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.program = shaderProgram;
    this.attribLocations = {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
    };
    this.uniformLocations = {
      projectionMatrix:
        gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
      modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
      normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
      color: gl.getUniformLocation(shaderProgram, 'uColor'),
      cameraPosition: gl.getUniformLocation(shaderProgram, 'uCameraPos'),
    };
  }
}

export const STANDARD_PROGRAM = new StandardProgram();