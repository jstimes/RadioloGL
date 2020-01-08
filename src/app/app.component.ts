import { Component } from '@angular/core';
import { mat4, vec3, vec4 } from './gl-matrix.js'
import { loadTexture, initShaderProgram, loadShader } from './gl_utils';
import { Camera } from 'src/app/camera';
import { CONTROLS, Key } from 'src/app/controls';
import { Triangle, makeVec, addVec, Point } from './math_utils';
import { StandardRenderable } from './standard_renderable';
import { TEXTURE_PROGRAM } from 'src/app/texture_program';
import { TextureRenderable } from 'src/app/texture_renderable';
import { STANDARD_PROGRAM } from 'src/app/standard_program';
import { ImageProcessor } from './image_processor';

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
  camera: Camera;

  textureRenderables: TextureRenderable[] = [];
  standardRenderables: StandardRenderable[] = [];

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

    TEXTURE_PROGRAM.init(this.gl);
    STANDARD_PROGRAM.init(this.gl);

    this.camera = new Camera();

    const stackImagePaths = this.getStackImagePaths();
    const imageProcessor = new ImageProcessor();
    imageProcessor.getMeshFromStack(this.gl, stackImagePaths).then(mesh => { this.standardRenderables.push(mesh); });

    this.textureRenderables.push(new TextureRenderable(this.gl, stackImagePaths));

    this.gameLoop(0);
  }

  private gameLoop(elapsedMs: number): void {
    this.update(elapsedMs);
    this.render();
    window.requestAnimationFrame((elapsedMs) => { this.gameLoop(elapsedMs); });
  }

  update(elapsedMs: number): void {
    this.camera.update(elapsedMs);

    this.textureRenderables.forEach(tr => { tr.update(elapsedMs); });
  }


  private getStackImagePaths(): string[] {
    const imagePaths = [];
    const numTextures = 103;
    const start = 86;
    // for (let i=0; i< numTextures; i++) {
    let i = 0;
    const path = '000020_04_01';
    let pre = '';
    if (i + start < 100) {
      pre = '0';
    }
    const imagePath = `/assets/imgs/${path}/${pre}${i + start}.png`;
    imagePaths.push(imagePath);

    // }
    return imagePaths;
  }

  private getProjectionMatrix(): mat4 {
    const projectionMatrix = mat4.create();
    const fieldOfView = 45 * Math.PI / 180;
    const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
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
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projectionMatrix = this.getProjectionMatrix();
    const viewMatrix = this.camera.getViewMatrix();

    gl.useProgram(TEXTURE_PROGRAM.program);

    gl.uniformMatrix4fv(
      TEXTURE_PROGRAM.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
    gl.uniformMatrix4fv(
      TEXTURE_PROGRAM.uniformLocations.viewMatrix,
      false,
      viewMatrix);
    this.textureRenderables.forEach(tr => { tr.render(gl); });

    gl.useProgram(STANDARD_PROGRAM.program);
    gl.uniformMatrix4fv(
      STANDARD_PROGRAM.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
    gl.uniformMatrix4fv(
      STANDARD_PROGRAM.uniformLocations.viewMatrix,
      false,
      viewMatrix);
    this.standardRenderables.forEach(sr => { sr.render(gl); });
  }
}
