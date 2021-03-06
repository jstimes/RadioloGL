import { Component } from '@angular/core';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { loadTexture, initShaderProgram, loadShader } from './gl_utils';
import { Camera } from 'src/app/camera';
import { CONTROLS, Key } from 'src/app/controls';
import { Triangle, makeVec, addVec, Point } from './math_utils';
import { StandardRenderable } from './standard_renderable';
import { TEXTURE_PROGRAM } from 'src/app/texture_program';
import { TextureRenderable } from 'src/app/texture_renderable';
import { STANDARD_PROGRAM } from 'src/app/standard_program';
import { getDenseMeshFromStack, getMeshFromImage, getSemiTransparentMeshFromStack } from 'src/app/processing/image_processor';
import { CubeMeshRenderable } from './cube_mesh_renderable';
import { INSTANCED_PROGRAM } from './instanced_program';

enum Mode {
  /** Renders images as textures with configurable min/max pixel intensities.*/
  IMAGE_ANALYSIS,
  /** Generates and renders an opaque 3D mesh from the stack. */
  VOLUMETRIC_RECONSTRUCTION,
  /** 
   * Generates and renders a semi-transparent mesh from the stack
   * where each voxel's transparency is based on the sampled color intensity.
   */
  SEMI_TRANSPARENT_RENCONSTRUCTION,
}

/** Use only 2 slices of the stack for faster processing when testing. */
const IS_TESTING = false;


/** 
 * Whether an image mesh should be generated and rendered for each stack slice.
 * Mainly just for verifying image processing behavior.
 */
const USE_IMAGE_MESH = false;

const HEIGHT = 600;
const WIDTH = 800;
const COLOR_INTENSITY_DELTA = .005;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly title = 'RadioloGL';
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private camera: Camera;

  /** 
   * Color intensities of the image are clamped between these bounds. 
   * Color intensity = ||rgb||.
   */
  private colorIntensityLowerBound = .85;
  private colorIntensityUpperBound = .9;

  private numTextures = 0;
  private textureIndex = 0;
  private textureRenderables: TextureRenderable[] = [];
  private standardRenderables: StandardRenderable[] = [];
  private cubeMeshRenderables: CubeMeshRenderable[] = [];

  private imageProcessParams = {
    sampleRate: 4,
    pixelIntensityThreshold: .85,
  };

  /** Exported for template checks. */
  readonly Mode = Mode;
  mode: Mode = Mode.IMAGE_ANALYSIS;
  isLoading: boolean = true;


  ngOnInit() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('width', `${WIDTH}`);
    this.canvas.setAttribute('height', `${HEIGHT}`);

    // `alpha: false` asks WebGL to use a backbuffer with no alpha (RGB only).
    this.gl = this.canvas.getContext('webgl2', { alpha: false });

    // Only continue if WebGL is available and working
    if (this.gl === null) {
      alert(
        `Unable to initialize WebGL. Your browser or machine may not support` +
        ` it.`);
      return;
    }

    TEXTURE_PROGRAM.init(this.gl);
    STANDARD_PROGRAM.init(this.gl);
    INSTANCED_PROGRAM.init(this.gl);

    this.camera = new Camera();
    this.initMode();

    this.gameLoop(0);
  }

  async initMode(): Promise<void> {
    this.isLoading = true;
    const stackImagePaths = this.getStackImagePaths();
    this.numTextures = stackImagePaths.length;

    switch (this.mode) {
      case Mode.IMAGE_ANALYSIS:
        stackImagePaths.forEach(async (imagePath: string) => {
          this.textureRenderables.push(
            new TextureRenderable(this.gl, loadTexture(this.gl, imagePath)));
          if (!USE_IMAGE_MESH) {
            return;
          }
          const meshPromises: Promise<StandardRenderable>[] = [];
          const imageMesh = await getMeshFromImage(
            this.gl, imagePath, this.imageProcessParams);
          this.standardRenderables.push(imageMesh);
        });
        break;

      case Mode.VOLUMETRIC_RECONSTRUCTION:
        if (this.standardRenderables.length > 0) {
          // Don't regenerate.
          break;
        }
        this.standardRenderables = await getDenseMeshFromStack(
          this.gl, stackImagePaths, this.imageProcessParams);
        break;

      case Mode.SEMI_TRANSPARENT_RENCONSTRUCTION:
        if (this.cubeMeshRenderables.length > 0) {
          // Don't regenerate.
          break;
        }
        const renderables = await getSemiTransparentMeshFromStack(
          this.gl, stackImagePaths, this.imageProcessParams);
        this.cubeMeshRenderables = renderables;
        break;
    }
    this.isLoading = false;
  }

  private gameLoop(elapsedMs: number): void {
    this.update(elapsedMs);
    this.render();
    requestAnimationFrame((elapsedMs) => { this.gameLoop(elapsedMs); });
  }

  private update(elapsedMs: number): void {
    this.camera.update(elapsedMs);
    this.standardRenderables.forEach((renderable) => {
      renderable.update(elapsedMs);
    });
    this.cubeMeshRenderables.forEach((renderable) => {
      renderable.update(elapsedMs);
    })

    if (CONTROLS.isKeyDown(Key.C)) {
      this.colorIntensityLowerBound -= COLOR_INTENSITY_DELTA;
    }
    if (CONTROLS.isKeyDown(Key.V)) {
      this.colorIntensityLowerBound += COLOR_INTENSITY_DELTA;
    }
    if (CONTROLS.isKeyDown(Key.B)) {
      this.colorIntensityUpperBound -= COLOR_INTENSITY_DELTA;
    }
    if (CONTROLS.isKeyDown(Key.N)) {
      this.colorIntensityUpperBound += COLOR_INTENSITY_DELTA;
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
  }

  private getStackImagePaths(): string[] {
    const imagePaths = [];
    const numTextures = 103;
    const start = 86;
    for (let i = 0; i < numTextures; i++) {
      const path = '000020_04_01';
      let prefix = '';
      if (i + start < 100) {
        prefix = '0';
      }
      const imagePath = `./assets/imgs/${path}/${prefix}${i + start}.png`;
      imagePaths.push(imagePath);
    }

    // TESTING
    if (IS_TESTING) {
      const testImages = 2;
      imagePaths.splice(testImages, imagePaths.length - testImages);
    }
    // TESTING

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

    // Allow semi-transparent rendering & blending.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    // Near things obscure far things      
    gl.depthFunc(gl.LEQUAL);
    // Don't draw back facing triangles.
    gl.enable(gl.CULL_FACE);
    // Clear to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear everything
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projectionMatrix = this.getProjectionMatrix();
    const viewMatrix = this.camera.getViewMatrix();

    if (this.mode === Mode.IMAGE_ANALYSIS) {
      const projectionMatrix = this.getProjectionMatrix();
      const viewMatrix = this.camera.getViewMatrix();
      gl.useProgram(TEXTURE_PROGRAM.program);
      gl.uniform1f(
        TEXTURE_PROGRAM.uniformLocations.colorIntensityLowerBound,
        this.colorIntensityLowerBound);
      gl.uniform1f(
        TEXTURE_PROGRAM.uniformLocations.colorIntensityUpperBound,
        this.colorIntensityUpperBound);
      gl.uniformMatrix4fv(
        TEXTURE_PROGRAM.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
      gl.uniformMatrix4fv(
        TEXTURE_PROGRAM.uniformLocations.viewMatrix,
        false,
        viewMatrix);
      this.textureRenderables[this.textureIndex].render(gl);
      if (USE_IMAGE_MESH
        && this.textureIndex < this.standardRenderables.length) {
        this.prepareStandardProgram(gl, projectionMatrix, viewMatrix);
        this.standardRenderables[this.textureIndex].render(gl);
      }
    }

    if (this.mode === Mode.VOLUMETRIC_RECONSTRUCTION) {
      this.prepareStandardProgram(gl, projectionMatrix, viewMatrix);
      for (const renderable of this.standardRenderables) {
        renderable.render(gl);
      }
    }

    if (this.mode === Mode.SEMI_TRANSPARENT_RENCONSTRUCTION) {
      gl.useProgram(INSTANCED_PROGRAM.program);
      gl.uniformMatrix4fv(
        INSTANCED_PROGRAM.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
      gl.uniformMatrix4fv(
        INSTANCED_PROGRAM.uniformLocations.viewMatrix,
        false,
        viewMatrix);
      // Render in reverse order assuming the furthest away slices are at the
      // end as WebGL alpha rendering requires furthest objects to be rendered
      // first.
      for (let i = this.cubeMeshRenderables.length - 1; i >= 0; i--) {
        this.cubeMeshRenderables[i].render(gl);
      }
    }
  }

  private prepareStandardProgram(
    gl: WebGL2RenderingContext, projectionMatrix: mat4, viewMatrix: mat4): void {

    gl.useProgram(STANDARD_PROGRAM.program);
    gl.uniformMatrix4fv(
      STANDARD_PROGRAM.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
    gl.uniformMatrix4fv(
      STANDARD_PROGRAM.uniformLocations.viewMatrix,
      false,
      viewMatrix);
    gl.uniform3fv(
      STANDARD_PROGRAM.uniformLocations.cameraPosition,
      this.camera.cameraPosition);
  }

  // TEMPLATE METHODS ----------------------------------------------------------

  setMode(mode: Mode): void {
    if (mode === this.mode) {
      return;
    }
    this.mode = mode;
    this.initMode();
  }

  getColorIntensityLowerBoundUi(): string {
    return `${this.colorIntensityLowerBound.toPrecision(4)}`;
  }

  getColorIntensityUpperBoundUi(): string {
    return `${this.colorIntensityUpperBound.toPrecision(4)}`;
  }

  getSliceIndexUi(): string {
    return `${this.textureIndex}`;
  }
}
