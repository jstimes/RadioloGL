import {vec3, mat4} from 'src/app/gl-matrix.js';
import {makeVec} from 'src/app/math_utils';
import { CONTROLS, Key } from 'src/app/controls';


export class Camera {
    cameraPosition: vec3;
    target: vec3;
    up = makeVec(0, 1, 0);

    constructor() {
        this.cameraPosition = makeVec(0, 5, 5);
        this.target = makeVec(0, 0, 0);

        CONTROLS.addAssignedControl(Key.J, "camera orbit left");
        CONTROLS.addAssignedControl(Key.L, "camera orbit right");
        CONTROLS.addAssignedControl(Key.I, "camera move up");
        CONTROLS.addAssignedControl(Key.K, "camera move down");
        CONTROLS.addAssignedControl(Key.O, "camera zoom in");
        CONTROLS.addAssignedControl(Key.P, "camera zoom out");
    }

    getViewMatrix(): mat4 {
        const view = mat4.create();
        mat4.lookAt(view, this.cameraPosition, this.target, this.up);
        return view;
    }

    update(elapsedMs: number) {
        if (CONTROLS.isKeyDown(Key.J)) {
            this.orbitLeft();
        }
        if (CONTROLS.isKeyDown(Key.L)) {
            this.orbitRight();
        }
        if (CONTROLS.isKeyDown(Key.I)) {
            this.moveUp();
        }
        if (CONTROLS.isKeyDown(Key.K)) {
            this.moveDown();
        }
        if (CONTROLS.isKeyDown(Key.O)) {
            this.zoomIn();
        }
        if (CONTROLS.isKeyDown(Key.P)) {
            this.zoomOut();
        }
    }

    ORBIT_ANGLE = Math.PI / 24;
    orbitRight() {
       vec3.rotateY(
           this.cameraPosition, 
           this.cameraPosition, 
           this.target, 
           this.ORBIT_ANGLE);
    }

    orbitLeft() {
        vec3.rotateY(
            this.cameraPosition, 
            this.cameraPosition, 
            this.target, 
            -this.ORBIT_ANGLE);
    }

    MOVEMENT = 0.25;
    moveUp() {
        this.cameraPosition[1] += this.MOVEMENT;
    }

    moveDown() {
        this.cameraPosition[1] -= this.MOVEMENT;
    }

    zoomIn() {
        this.cameraPosition[2] -= this.MOVEMENT;
    }

    zoomOut() {
        this.cameraPosition[2] += this.MOVEMENT;
    }
}