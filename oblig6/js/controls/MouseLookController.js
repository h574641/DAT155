import {
    Quaternion,
    Vector3
} from '../lib/three.module.js';

export default class MouseLookController {

    constructor(camera) {
        
        this.camera = camera;

        this.FD = new Vector3(0, 0, 1);
        this.UD = new Vector3(0, 1, 0);
        this.LD = new Vector3(1, 0, 0);

        this.pitchQuaternion = new Quaternion();
        this.yawQuaternion = new Quaternion();

    }

    update(pitch, yaw) {
        
        this.pitchQuaternion.setFromAxisAngle(this.LD, -pitch);
        this.yawQuaternion.setFromAxisAngle(this.UD, -yaw);

        this.camera.setRotationFromQuaternion(this.yawQuaternion.multiply(this.camera.quaternion.multiply(this.pitchQuaternion)));

    }
    
}