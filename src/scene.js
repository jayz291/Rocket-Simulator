import { Rocket } from "./rocket.js";
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const simulationBox = document.getElementById('simulation');

export class SceneManager {
    constructor(simulation) {
        this.scene = new THREE.Scene();
        this.startColour = new THREE.Color(0x90d5ff);
        this.endColour = new THREE.Color(0x000000);
        this.scene.background = this.startColour;
        this.scene.fog = new THREE.Fog(this.startColour, 10000, 1400000);
        this.scene.add(this.camera);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(20000, 20000, 300);
        this.scene.add(directionalLight);

        this.ground = new Ground(0x00ff00);
        this.launchPad = new LaunchPad();
        this.rocket = new Rocket(simulation.stages);
        this.scene.add(this.ground.mesh);
        this.scene.add(this.rocket.mesh);
        this.scene.add(this.launchPad.mesh);
        this.setUpRenderer();
        this.setUpCamera();
    }
    setBackgroundColor(alpha) {
        let currentColour = new THREE.Color().lerpColors(this.startColour, this.endColour, alpha);
        this.scene.background = currentColour;
        this.scene.fog.color = currentColour;
    }
    setUpCamera() {
        this.camera = new THREE.PerspectiveCamera(45, 
            simulationBox.clientWidth / simulationBox.clientHeight, 1, 10000000);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.5;
        this.controls.maxPolarAngle = Math.PI / 2;

        this.camera.far = 1200000;
        this.camera.position.set(20, 10, 20);
        this.camera.lookAt(0, 12, 0);
    }
    setUpRenderer() {
        this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true});
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setSize(simulationBox.clientWidth, simulationBox.clientHeight);
        simulationBox.appendChild(this.renderer.domElement);
    }
    resetScene(simulation) {
        this.scene.remove(this.rocket.mesh);
        this.rocket = new Rocket(simulation.stages);
        this.scene.add(this.rocket.mesh);
        this.rocket.mesh.position.y = simulation.stages[0].rocketRadius * 6 + 0.1 + simulation.currentHeight;
        this.camera.position.y = simulation.stages[0].rocketRadius * 6 + 0.1 + simulation.currentHeight;
        this.controls.target.y = this.rocket.mesh.position.y;
    }
    renderUpdate() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    updatePosition(simulation, deltaY) {
        this.rocket.mesh.position.y = simulation.stages[0].rocketRadius * 6 + 0.1 + simulation.currentHeight;
        this.rocket.mesh.updateMatrixWorld(true);
        this.camera.position.y += deltaY;
        this.controls.target.y = this.rocket.mesh.position.y;
        this.controls.maxPolarAngle = Math.PI;
    }
}

class Ground {
    constructor(color) {
        this.geometry = new THREE.PlaneGeometry(2800000, 2800000);
        this.material = new THREE.MeshLambertMaterial({ color: color});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, 0, 0);
    }
}

class LaunchPad {
    constructor() {
        this.geometry = new THREE.PlaneGeometry(10, 10);
        this.material = new THREE.MeshLambertMaterial({color: 0x808080});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, 0.1, 0);
    }
}