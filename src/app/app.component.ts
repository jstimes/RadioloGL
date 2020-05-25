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
import { getDenseMeshFromStack, getMeshFromImage } from 'src/app/processing/image_processor';

const HEIGHT = 800;
const WIDTH = 1200;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'RadioloGL';
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  camera: Camera;

  contrastLower = .85;
  contrastUpper = .9;
  delta = .005;

  isShowingOverlay: boolean = false;
  numTextures = 0;
  textureIndex = 0;
  textureRenderables: TextureRenderable[] = [];
  standardRenderables: StandardRenderable[] = [];

  imageProcessParams = {
    sampleRate: 2,
    pixelIntensityThreshold: .85,
  };

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
    this.loadStack();

    this.gameLoop(0);
  }

  private async loadStack(): Promise<void> {
    const stackImagePaths = this.getStackImagePaths();
    this.numTextures = stackImagePaths.length;
    const useImageMesh = false;
    const useDenseMesh = false;

    const meshPromises: Promise<StandardRenderable>[] = [];
    stackImagePaths.forEach(async (imagePath: string) => {
      this.textureRenderables.push(new TextureRenderable(this.gl, loadTexture(this.gl, imagePath)));
      if (useImageMesh) {
        meshPromises.push(getMeshFromImage(this.gl, imagePath, this.imageProcessParams));
      }
    });
    if (useImageMesh) {
      const meshes = await Promise.all(meshPromises);
      meshes.forEach((mesh) => this.standardRenderables.push(mesh));
    } else if (useDenseMesh) {
      const mesh = await getDenseMeshFromStack(this.gl, stackImagePaths, this.imageProcessParams);
      this.standardRenderables.push(mesh);
    }
  }

  private gameLoop(elapsedMs: number): void {
    this.update(elapsedMs);
    this.render();
    window.requestAnimationFrame((elapsedMs) => { this.gameLoop(elapsedMs); });
  }

  update(elapsedMs: number): void {
    this.camera.update(elapsedMs);
    this.textureRenderables.forEach(tr => { tr.update(elapsedMs); });
    this.standardRenderables.forEach(tr => { tr.update(elapsedMs); });

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
      if (this.textureIndex < this.numTextures - 1) {
        this.textureIndex++;
      }
    }
    if (CONTROLS.isKeyDown(Key.S)) {
      if (this.textureIndex > 0) {
        this.textureIndex--;
      }
    }
    document.getElementById('contrast-lower').innerHTML =
      `Contrast lower: ${this.contrastLower.toPrecision(4)}`;
    document.getElementById('contrast-upper').innerHTML =
      `Contrast upper: ${this.contrastUpper.toPrecision(4)} `;
    document.getElementById('slice').innerHTML = `Slice: ${this.textureIndex} `;
    this.isShowingOverlay =
      (document.getElementById('show-overlay') as HTMLInputElement).checked;
  }

  private getStackImagePaths(): string[] {
    const imagePaths = [];
    const numTextures = 103;
    const start = 86;
    for (let i = 0; i < numTextures; i++) {
      const path = '000020_04_01';
      let pre = '';
      if (i + start < 100) {
        pre = '0';
      }
      const imagePath = `./assets/imgs/${path}/${pre}${i + start}.png`;
      imagePaths.push(imagePath);
    }
    return imagePaths;
  }

  private getProjectionMatrix(): mat4 {
    const projectionMatrix = mat4.create();
    const fieldOfView = 45 * Math.PI / 180;
    const glCanvas = this.gl.canvas as HTMLCanvasElement;
    const aspect = glCanvas.clientWidth / glCanvas.clientHeight;
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
    gl.uniform1f(TEXTURE_PROGRAM.uniformLocations.contrastLower, this.contrastLower);
    gl.uniform1f(TEXTURE_PROGRAM.uniformLocations.contrastUpper, this.contrastUpper);
    gl.uniformMatrix4fv(
      TEXTURE_PROGRAM.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
    gl.uniformMatrix4fv(
      TEXTURE_PROGRAM.uniformLocations.viewMatrix,
      false,
      viewMatrix);
    this.textureRenderables[this.textureIndex].render(gl); // .forEach(tr => { tr.render(gl); });

    gl.useProgram(STANDARD_PROGRAM.program);
    gl.uniformMatrix4fv(
      STANDARD_PROGRAM.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
    gl.uniformMatrix4fv(
      STANDARD_PROGRAM.uniformLocations.viewMatrix,
      false,
      viewMatrix);
    if (this.isShowingOverlay && this.textureIndex < this.standardRenderables.length) {
      this.standardRenderables[this.textureIndex].render(gl); //.forEach(sr => { sr.render(gl); });
    }
  }
}
