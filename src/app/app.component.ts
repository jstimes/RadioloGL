import { Component } from '@angular/core';
import {mat4, vec3, vec4} from './gl-matrix.js'
import {loadTexture, initShaderProgram, loadShader} from './gl_utils';
import { Camera } from 'src/app/camera';

interface AttribLocations {
  vertexPosition: number;
  vertexNormal: number;
}
interface UniformLocations {
  projectionMatrix: WebGLUniformLocation;
  viewMatrix: WebGLUniformLocation;
  modelMatrix: WebGLUniformLocation;
  normalMatrix: WebGLUniformLocation;
}
interface Program {
  program: WebGLProgram;
  attribLocations: AttribLocations;
  uniformLocations: UniformLocations;
}

interface Buffers {
  position: WebGLBuffer;
  normal: WebGLBuffer;
}

interface Point {
  x: number;
  y: number;
}

const VERTEX_SHADER_SOURCE = `
  attribute vec4 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uNormalMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uModelMatrix;
  uniform mat4 uProjectionMatrix;

  varying highp vec3 vLighting;

  void main() {
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;

    // Apply lighting effect
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  varying highp vec3 vLighting;

  uniform sampler2D uSampler;

  void main() {
    highp vec4 vColor = vec4(1.0, 0.0, 0.0, 1.0);
    gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
  }
`;

const HEIGHT = 300;
const WIDTH = 400;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'CtTs';
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: Program;
  buffers: Buffers;
  camera: Camera;
  mesh: Mesh;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('width', `${WIDTH}`);
    this.canvas.setAttribute('height', `${HEIGHT}`);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    
    this.gl = this.canvas.getContext('webgl');
  
    // Only continue if WebGL is available and working
    if (this.gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
  
    // Set clear color to black, fully opaque
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    const shaderProgram = initShaderProgram(this.gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexNormal: this.gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      },
      uniformLocations: {
        projectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        viewMatrix: this.gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
        modelMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
        normalMatrix: this.gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
      },
    };
    this.camera = new Camera();
    this.mesh = new Mesh();

    this.gameLoop(0);
  }

  private gameLoop(elapsedMs: number): void {
    this.update(elapsedMs);
    this.initBuffers();
    this.render();
    window.requestAnimationFrame((elapsedMs) => {this.gameLoop(elapsedMs);});
  }

  update(elapsedMs: number): void {
    this.camera.update(elapsedMs);
  }

  private getProjectionMatrix(): mat4 {
    const projectionMatrix = mat4.create();

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
  
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
  
    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix,
                      fieldOfView,
                      aspect,
                      zNear,
                      zFar);
    return projectionMatrix;
  }

  private render() {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    const projectionMatrix = this.getProjectionMatrix();
  
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modeMatrix = mat4.create();

    const viewMatrix = this.camera.getViewMatrix();

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modeMatrix);
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
          this.program.attribLocations.vertexPosition,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
        this.program.attribLocations.vertexPosition);
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
          this.program.attribLocations.vertexNormal,
          numComponents,
          type,
          normalize,
          stride,
          offset);
      gl.enableVertexAttribArray(
          this.program.attribLocations.vertexNormal);
    }
  
    // Tell WebGL to use our program when drawing
    gl.useProgram(this.program.program);
  
    // Set the shader uniforms
    gl.uniformMatrix4fv(
        this.program.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        this.program.uniformLocations.modelMatrix,
        false,
        modeMatrix);
    gl.uniformMatrix4fv(
        this.program.uniformLocations.viewMatrix,
        false,
        viewMatrix);
    gl.uniformMatrix4fv(
        this.program.uniformLocations.normalMatrix,
        false,
        normalMatrix);
  
    {
      const vertexCount = this.mesh.positions.length / 3;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      // gl.LINE_STRIP
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    }
  }

  private initBuffers() {
    const gl = this.gl;
    this.mesh.init();

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(this.mesh.positions),
                  gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.mesh.normals),
                  gl.STATIC_DRAW);
  
    this.buffers = {
      position: positionBuffer,
      normal: normalBuffer,
    };
  }

  private onMouseDown = (e: MouseEvent) => {
    this.mesh.click(e, this.getProjectionMatrix());
  };
}

function makeVec(x: number, y: number, z: number): vec3 {
  const vector = vec3.create();
  vec3.set(vector, x, y, z);
  return vector;
}

function addVec(arr: number[], vec: vec3) {
  arr.push(vec[0]);
  arr.push(vec[1]);
  arr.push(vec[2]);
}

interface Square {
  topLeft: vec3;
  bottomLeft: vec3;
  bottomRight: vec3;
  topRight: vec3;
  midPt: vec3;
  isPartiallyElevated: boolean;
}

class Mesh {
  readonly gridSize = 32;
  readonly squareWidth = 0.5;
  readonly squareHeight = 0.5;
  readonly START_Z = -20.0;

  squares: Square[] = [];

  positions: number[] = [];
  normals: number[] = [];

  constructor() {
    const normal = makeVec(0, 0, 1.0);
    const xStart = -(this.gridSize / 2 * this.squareWidth);
    const yStart = -(this.gridSize / 2 * this.squareHeight);

    for (let y=0; y<this.gridSize; y++) {
      for (let x=0; x<this.gridSize; x++) {
        const topLeft = makeVec(
          x * this.squareWidth + xStart, 
          y * this.squareHeight + this.squareHeight + yStart, 
          this.START_Z);
        const bottomLeft = makeVec(
          x * this.squareWidth + xStart, 
          y * this.squareHeight + yStart, 
          this.START_Z);
        const topRight = makeVec(
          x * this.squareWidth + this.squareWidth + xStart, 
          y * this.squareHeight + this.squareHeight + yStart, 
          this.START_Z);
        const bottomRight = makeVec(
          x * this.squareWidth + this.squareWidth + xStart,
          y * this.squareHeight + yStart, 
          this.START_Z);
        const midPt = makeVec(
          bottomLeft[0] + this.squareWidth / 2, 
          bottomLeft[1] + this.squareHeight / 2, 
          this.START_Z);

        const square: Square = {
          topLeft, 
          bottomLeft, 
          bottomRight, 
          topRight, 
          midPt,
          isPartiallyElevated: false,
        };
        this.squares.push(square);
      }
    }
  }

  // Thanks Anton
  // http://antongerdelan.net/opengl/raycasting.html
  click(e: MouseEvent, projectionMatrix: mat4) {
    // Mouse event is in viewport coordinates.
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // First, get Normalized device coordinates ([-1:1], [-1:1], [-1:1])
    const x = (2.0 * mouseX) / WIDTH - 1.0;
    const y = 1.0 - (2.0 * mouseY) / HEIGHT;
    const z = 1.0;
    const ndcRay = makeVec(x, y, z);
    console.log("NDC Ray: " + vec3.str(ndcRay));

    // Convert to homogeneous clip coordinates:
    const rayClip = vec4.create();
    rayClip[0] = x;
    rayClip[1] = y;
    rayClip[2] = -1.0;
    rayClip[3] = 1.0;

    // Then camera coordinates:
    const inverseProjection = mat4.create();
    mat4.invert(inverseProjection, projectionMatrix);
    const rayEye = vec4.create();
    vec4.transformMat4(rayEye, rayClip, inverseProjection);

    // Finally, world coords.
    // rayWorld = inverse(viewMatrix) * rayEye
    const rayWorld = makeVec(rayEye[0], rayEye[1], rayEye[3]);
    vec3.normalize(rayWorld, rayWorld);

    console.log("Ray world: " + vec3.str(rayWorld));

    const randomSquareIndex = Math.floor(Math.random() * this.squares.length);
    this.elevateSquareAtIndex(randomSquareIndex);
  }

  ELEVATION_DELTA = .5;
  elevateSquareAtIndex(index: number) {
    const square = this.squares[index];
    square.topLeft[2] += this.ELEVATION_DELTA;
    square.bottomLeft[2] += this.ELEVATION_DELTA;
    square.bottomRight[2] += this.ELEVATION_DELTA;
    square.topRight[2] += this.ELEVATION_DELTA;
    square.midPt[2] += this.ELEVATION_DELTA;

    const rightSquare = this.squares[index + 1];
    rightSquare.bottomLeft[2] += this.ELEVATION_DELTA;
    rightSquare.topLeft[2] += this.ELEVATION_DELTA;
    rightSquare.midPt[2] += this.ELEVATION_DELTA / 2;

    const leftSquare = this.squares[index - 1];
    leftSquare.topRight[2] += this.ELEVATION_DELTA;
    leftSquare.bottomRight[2] += this.ELEVATION_DELTA;
    leftSquare.midPt[2] += this.ELEVATION_DELTA / 2;

    const topSquare = this.squares[index + this.gridSize];
    topSquare.bottomLeft[2] += this.ELEVATION_DELTA;
    topSquare.bottomRight[2] += this.ELEVATION_DELTA;
    topSquare.midPt[2] += this.ELEVATION_DELTA / 2;

    const bottomSquare = this.squares[index - this.gridSize];
    bottomSquare.topLeft[2] += this.ELEVATION_DELTA;
    bottomSquare.topRight[2] += this.ELEVATION_DELTA;
    bottomSquare.midPt[2] += this.ELEVATION_DELTA / 2;

    const topLeftSquare = this.squares[index + this.gridSize - 1];
    topLeftSquare.bottomRight[2] += this.ELEVATION_DELTA;

    const topRightSquare = this.squares[index + this.gridSize + 1];
    topRightSquare.bottomLeft[2] += this.ELEVATION_DELTA;

    const bottomLeftSquare = this.squares[index - this.gridSize - 1];
    bottomLeftSquare.topRight[2] += this.ELEVATION_DELTA;

    const bottomRightSquare = this.squares[index - this.gridSize + 1];
    bottomRightSquare.topLeft[2] += this.ELEVATION_DELTA;
  }

  init() {
    this.positions = [];
    this.normals = [];
    const triangles: Triangle[] = [];
    for (let square of this.squares) {
      const triTop = new Triangle(square.topLeft, square.midPt, square.topRight);
      const triLeft = new Triangle(square.topLeft, square.bottomLeft, square.midPt);
      const triBottom = new Triangle(square.bottomLeft, square.bottomRight, square.midPt);
      const triRight = new Triangle(square.midPt, square.bottomRight, square.topRight);
      triangles.push(triTop);
      triangles.push(triLeft);
      triangles.push(triBottom);
      triangles.push(triRight);
    }
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
}

class Triangle {
  constructor(
    public a: vec3, 
    public b: vec3, 
    public c: vec3) {}

  getNormal(): vec3 {
    const u = vec3.create();
    vec3.sub(u, this.b, this.a);
    const v = vec3.create();
    vec3.sub(v, this.c, this.a);
    return makeVec(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]);
  }
}

