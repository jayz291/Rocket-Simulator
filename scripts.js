import * as THREE from 'three';

class RocketSimulator {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth, window.innerHeight, 1, 1000);
        this.init();
    }
    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        this.scene.background = new THREE.Color(0x0000ff);
        this.scene.add(this.camera);
        this.animate = this.animate.bind(this);
        this.animate();
    }
    animate() {
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    }
}

const rocketSimulator = new RocketSimulator();