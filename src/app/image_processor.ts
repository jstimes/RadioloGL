import { vec3, vec4, mat4 } from './gl-matrix.js';
import { TextureRenderable } from 'src/app/texture_renderable';
import { Triangle, makeVec, addVec, Point } from './math_utils';
import { StandardRenderable } from 'src/app/standard_renderable';

export class ImageProcessor {

    constructor() {

    }

    async getMeshFromImage(gl: WebGLRenderingContext, stackImagePath: string): Promise<StandardRenderable> {
        const triangles = await this.processImage(gl, stackImagePath);
        const renderable = new StandardRenderable();
        renderable.addTriangles(triangles);
        renderable.initBuffers(gl);
        return renderable;
    }

    processImage(gl: WebGLRenderingContext, src: string): Promise<Triangle[]> {
        return new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                // document.getElementById('canvas').width = '' + image.width;
                // document.getElementById('canvas').height = '' + image.height;
                const delta = 4;
                const cells = image.width / delta;

                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height);

                const grid: boolean[][] = [];
                for (let y = 0; y < cells; y++) {
                    const row = [];
                    for (let x = 0; x < cells; x++) {
                        const pt = { x: x * delta, y: y * delta };

                        const rgba = canvas.getContext('2d').getImageData(pt.x, pt.y, 1, 1).data;
                        const rgb = [rgba[0] / 256, rgba[1] / 256, rgba[2] / 256];
                        const isAboveThreshold = Math.sqrt(rgb[0] * rgb[0] + rgb[1] * rgb[1] + rgb[2] * rgb[2]) > .85;
                        row.push(isAboveThreshold);

                    }
                    grid.push(row);
                }

                const z = 1.0;
                const toGlPt = (imagePt: Point): vec3 => {
                    return makeVec(imagePt.x * (2 / image.width) - 1, imagePt.y * (2 / image.height) - 1, z);
                };
                const triangles: Triangle[] = [];
                for (let y = 1; y < cells; y++) {
                    for (let x = 1; x < cells; x++) {
                        const isPtAbove = grid[y][x];
                        const isLeftPtAbove = grid[y][x - 1];
                        const isUpPtAbove = grid[y - 1][x];
                        const isLeftUpPtAbove = grid[y - 1][x - 1];

                        const imagePt = { x: x * delta, y: y * delta };
                        const imagePtLeft = { x: (x - 1) * delta, y: y * delta };
                        const imagePtUp = { x: x * delta, y: (y - 1) * delta };
                        const imagePtLeftUp = { x: (x - 1) * delta, y: (y - 1) * delta };

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
                resolve(triangles);

                // const div = document.createElement("div");
                // const rows = grid.map((row: boolean[]) => {
                //   return row.map(b => b ? '1' : '0').join('');
                // });
                // const str = rows.join('\n');
                // div.innerHTML = str;
                // document.body.appendChild(div);
                console.log("done");
            };

            image.src = src;
        });
    }
}