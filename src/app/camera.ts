import { vec3, mat4 } from 'gl-matrix';
import { makeVec } from 'src/app/math_utils';
import { CONTROLS, Key } from 'src/app/controls';

const PAN_DELTA = 0.025;
const ORBIT_ANGLE = Math.PI / 24;
const ZOOM_DELTA = 0.2;

export class Camera {
    cameraPosition: vec3;
    target: vec3;
    readonly up = makeVec(0, 1, 0);

    constructor() {
        this.cameraPosition = makeVec(0, 0, 5);
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
            this.panLeft();
        }
        if (CONTROLS.isKeyDown(Key.L)) {
            this.panRight();
        }
        if (CONTROLS.isKeyDown(Key.I)) {
            this.panUp();
        }
        if (CONTROLS.isKeyDown(Key.K)) {
            this.panDown();
        }
        if (CONTROLS.isKeyDown(Key.O)) {
            this.zoomIn();
        }
        if (CONTROLS.isKeyDown(Key.P)) {
            this.zoomOut();
        }
    }

    orbitRight() {
        vec3.rotateY(
            this.cameraPosition,
            this.cameraPosition,
            this.target,
            ORBIT_ANGLE);
    }

    orbitLeft() {
        vec3.rotateY(
            this.cameraPosition,
            this.cameraPosition,
            this.target,
            -ORBIT_ANGLE);
    }

    panUp() {
        this.cameraPosition[1] += PAN_DELTA;
        this.target[1] += PAN_DELTA;
    }

    panDown() {
        this.cameraPosition[1] -= PAN_DELTA;
        this.target[1] -= PAN_DELTA;
    }

    panLeft() {
        this.cameraPosition[0] -= PAN_DELTA;
        this.target[0] -= PAN_DELTA;
    }

    panRight() {
        this.cameraPosition[0] += PAN_DELTA;
        this.target[0] += PAN_DELTA;
    }

    zoomIn() {
        if (this.cameraPosition[2] <= 2) {
            return;
        }
        this.cameraPosition[2] -= ZOOM_DELTA;
    }

    zoomOut() {
        this.cameraPosition[2] += ZOOM_DELTA;
    }
}