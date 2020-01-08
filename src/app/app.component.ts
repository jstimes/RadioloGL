import { Component } from '@angular/core';
import {mat4, vec3, vec4} from './gl-matrix.js'
import {loadTexture, initShaderProgram, loadShader} from './gl_utils';
import { Camera } from 'src/app/camera';
import { CONTROLS, Key } from 'src/app/controls';
import {Triangle, makeVec, addVec} from './math_utils';
import {Renderable} from './renderable';
import { TEXTURE_PROGRAM } from 'src/app/programs';

interface Buffers {
  position: WebGLBuffer;
  textureCoord: WebGLBuffer;
  normal: WebGLBuffer;
  indices: WebGLBuffer;
}

interface Point {
  x: number;
  y: number;
}

const HEIGHT = 800;
const WIDTH = 1200;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'CtTs';
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  buffers: Buffers;
  camera: Camera;

  textureIndex: number = 0;
  textures: WebGLTexture[] = [];
  renderables: Renderable[] = [];

  contrastLower = .85;
  contrastUpper = .9;
  delta = .005;

  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('width', `${WIDTH}`);
    this.canvas.setAttribute('height', `${HEIGHT}`);
    
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

    TEXTURE_PROGRAM.init(this.gl);

    this.camera = new Camera();
    const numTextures = 103;
    const start = 86;
    // for (let i=0; i< numTextures; i++) {
      let i =0;
      const path = '000020_04_01';
      let pre = '';
      if (i + start < 100) {
        pre = '0';
      }
      const imagePath = `/assets/imgs/${path}/${pre}${i+start}.png`;
      this.processImage(imagePath);
      this.textures.push(loadTexture(this.gl, imagePath));
    // }

    this.gameLoop(0);
  }

  processImage(src: string) {
    const gl = this.gl;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const delta = 4;
      const cells = image.width / delta;

      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height);

      const grid: boolean[][] = [];
      for (let y=0; y<cells; y++) {
        const row = [];
        for (let x=0; x<cells; x++) {
          const pt = {x: x * delta, y: y * delta};

          const rgba = canvas.getContext('2d').getImageData(pt.x, pt.y, 1, 1).data;
          const rgb = [rgba[0] / 256, rgba[1] / 256, rgba[2] / 256];
          const isAboveThreshold = Math.sqrt(rgb[0] * rgb[0] + rgb[1] * rgb[1] + rgb[2] * rgb[2]) > .85;
          row.push(isAboveThreshold);
          
        }
        grid.push(row);
      }

      const z = 1.0;
      const toGlPt = (imagePt: Point): vec3 => {
        return makeVec(imagePt.x * (2 / image.width) - 1, imagePt.y * (2 / image.height), z);
      };
      const triangles: Triangle[] = [];
      for (let y=1; y<cells; y++) {
        for (let x=1; x<cells; x++) {
          const isPtAbove = grid[y][x];
          const isLeftPtAbove = grid[y][x-1];
          const isUpPtAbove = grid[y-1][x];
          const isLeftUpPtAbove = grid[y-1][x-1];

          const imagePt = {x: x * delta, y: y * delta};
          const imagePtLeft = {x: (x-1)*delta, y: y * delta};
          const imagePtUp = {x: x*delta, y: (y-1) * delta};
          const imagePtLeftUp = {x: (x-1)*delta, y: (y-1) * delta};

          const glPt = toGlPt(imagePt);
          const glLeftPt = toGlPt(imagePtLeft);
          const glUpPt = toGlPt(imagePtUp);
          const glLeftUpPt = toGlPt(imagePtLeftUp);

          if (!isPtAbove && !isLeftPtAbove && !isUpPtAbove && !isLeftPtAbove) {
            continue;
          }
          if (isPtAbove && isLeftPtAbove && isUpPtAbove && isLeftPtAbove) {
            const upperLeft = new Triangle(glLeftUpPt, glLeftPt, glUpPt);
            const lowerRight = new Triangle(glLeftPt, glPt, glUpPt);
            triangles.push(upperLeft);
            triangles.push(lowerRight);
          }
        }
      }
      const renderable = new Renderable();
      renderable.addTriangles(triangles);
      renderable.initBuffers(this.gl);
      this.renderables.push(renderable);

      const div = document.createElement("div");
      const rows = grid.map((row: boolean[]) => {
        return row.map(b => b ? '1' : '0').join('');
      });
      const str = rows.join('\n');
      div.innerHTML = str;
      document.body.appendChild(div);
      console.log("done");
    };

    image.src = src;
  }

  private gameLoop(elapsedMs: number): void {
    this.update(elapsedMs);
    this.initBuffers();
    this.render();
    window.requestAnimationFrame((elapsedMs) => {this.gameLoop(elapsedMs);});
  }

  update(elapsedMs: number): void {
    this.camera.update(elapsedMs);

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
    document.getElementById('contrast-lower').innerHTML = `Contrast lower: ${this.contrastLower}`;
    document.getElementById('contrast-upper').innerHTML = `Contrast upper: ${this.contrastUpper}`;

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
    document.getElementById('slice').innerHTML = `Slice: ${this.textureIndex}`;
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
  
    // Tell WebGL to use our program when drawing
    gl.useProgram(TEXTURE_PROGRAM.program);
  
    // Set the shader uniforms
    gl.uniformMatrix4fv(
      TEXTURE_PROGRAM.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
      TEXTURE_PROGRAM.uniformLocations.modelMatrix,
        false,
        modeMatrix);
    gl.uniformMatrix4fv(
      TEXTURE_PROGRAM.uniformLocations.viewMatrix,
        false,
        viewMatrix);
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

    // this.renderables.forEach((r) => { r.render(this.gl, this.program, mat4.create()); });
  }

  private initBuffers() {
    const gl = this.gl;
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
