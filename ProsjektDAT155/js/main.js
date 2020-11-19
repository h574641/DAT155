import {
    PerspectiveCamera,
    WebGLRenderer,
    PCFSoftShadowMap,
    Scene,
    Mesh,
    TextureLoader,
    RepeatWrapping,
    DirectionalLight,
    Vector3,
    AxesHelper,
    Object3D,
    AnimationMixer,
    Clock
} from './lib/three.module.js';
import * as THREE from './lib/three.module.js';
import Utilities from './lib/Utilities.js';
import MouseLookController from './controls/MouseLookController.js';

import TextureSplattingMaterial from './materials/TextureSplattingMaterial.js';
import TerrainBufferGeometry from './terrain/TerrainBufferGeometry.js';
import { GLTFLoader } from './loaders/GLTFLoader.js';
import { SimplexNoise } from './lib/SimplexNoise.js';
import { Water } from './objects/Water.js';
import {GUI} from './lib/dat.gui.module.js';
import LavaShader from "./objects/LavaShader.js";
import {RenderPass} from "./postprocessing/RenderPass.js";
import {BloomPass} from "./postprocessing/BloomPass.js";
import {FilmPass} from "./postprocessing/FilmPass.js";
import {EffectComposer} from "./postprocessing/EffectComposer.js";



async function main() {

    const scene = new Scene();

    const clock = new Clock();
    const clock2 = new Clock();

    const axesHelper = new AxesHelper(30);

    scene.add(axesHelper);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

    const renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(0xffffff);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;





    /**
     * Handle window resize:
     *  - update aspect ratio.
     *  - update projection matrix
     *  - update renderer size
     */


    window.addEventListener('resize', () => {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    /**
     * Add canvas element to DOM.
     */
    document.body.appendChild(renderer.domElement);

    /**
     * Add light
     */
    const directionalLight = new DirectionalLight(0xffffff);
    //const ambientLight = new AmbientLightProbe(0xffffff, 0.3);
    directionalLight.position.set(300, 400, 0);
    //ambientLight.position.set(0,0, 300);

    directionalLight.castShadow = true;

    //Set up shadow properties for the light
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 2000;

    scene.add(directionalLight);
    //scene.add(ambientLight);


    //Set direction
    directionalLight.target.position.set(0, 15, 0);
    scene.add(directionalLight.target);

    camera.position.z = 1500;
    camera.position.y = 1500;
    camera.rotation.x -= Math.PI * 0.25;


    /**
     * Add terrain:
     *
     * We have to wait for the image file to be loaded by the browser.
     * There are many ways to handle asynchronous flow in your application.
     * We are using the async/await language constructs of Javascript:
     *  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
     */
    const heightmapImage = await Utilities.loadImage('resources/images/heightmapVL2.2.png');
    const width = 3500;

    const simplex = new SimplexNoise();
    const terrainGeometry = new TerrainBufferGeometry({
        width,
        heightmapImage,
        // noiseFn: simplex.noise.bind(simplex),
        numberOfSubdivisions: 128,
        height: 1200
    });

    const grassTexture = new TextureLoader().load('resources/textures/grass_02.png');
    grassTexture.wrapS = RepeatWrapping;
    grassTexture.wrapT = RepeatWrapping;
    grassTexture.repeat.set(30000 / width, 30000 / width);

    const snowyRockTexture = new TextureLoader().load('resources/textures/rock_03.png');
    snowyRockTexture.wrapS = RepeatWrapping;
    snowyRockTexture.wrapT = RepeatWrapping;
    snowyRockTexture.repeat.set(15000 / width, 15000 / width);


    const splatMap = new TextureLoader().load('resources/images/splatmap_03.png');

    const terrainMaterial = new TextureSplattingMaterial({
        color: 0xffffff,
        shininess: 0,
        textures: [snowyRockTexture, grassTexture],
        splatMaps: [splatMap]
    });

    const terrain = new Mesh(terrainGeometry, terrainMaterial);

    terrain.castShadow = true;
    terrain.receiveShadow = true;
    
    scene.add(terrain);

    /**
     * Fog
     */

    const color = 0xFFFFFF;  // white
    const near = 10;
    const far = 6000;
    scene.fog = new THREE.Fog(color, near, far);

    /**
     * Water
     */

    const waterGeometry = new THREE.PlaneGeometry(20000, 20000);

    const water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('resources/textures/waternormals.jpg', function (texture) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            }),
            alpha: 1.0,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = -Math.PI / 2;

    water.translateZ(370);

    scene.add(water);

    /**
     * Lava
     */

        const textureLoader = new THREE.TextureLoader();

        const lavaGeometry = new THREE.SphereBufferGeometry(350, 128, 128, 10)


        let lavaMaterial = new LavaShader({
                vertexShader: LavaShader.vertexShader,
                fragmentShader: LavaShader.fragmentShader,
                uniforms: {
                    fogDensity: 0.0001,
                    fogColor: new THREE.Vector3(0, 0, 0),
                    time: 1.0,
                    uvScale: new THREE.Vector2(9, 3),
                    texture1: textureLoader.load('resources/textures/cloud.png'),
                    texture2: textureLoader.load('resources/textures/lavatile.jpg')
                }
            }
        )

        //lava movement




        const lavaPlane = new Mesh(lavaGeometry, lavaMaterial);

        lavaPlane.rotation.x = -Math.PI / 2;

        lavaPlane.translateZ(450);

        lavaPlane.layers.enable(1);
        scene.add(lavaPlane);


        //postprocessing


        const composer = new EffectComposer( renderer );


        const effectBloom = new BloomPass( 1.25 );
        const effectFilm = new FilmPass( 0.35, 0.95, 2048, false );
        const renderModel = new RenderPass( scene, camera);


            composer.addPass( effectBloom );
            composer.addPass( effectFilm );
            composer.addPass( renderModel );


    /**
     * Smoke
     */

    const particleCount = 5000;
    let points;
    createPoints();

    function createPoints() {
        const geometry = new THREE.Geometry();

        const texture = new THREE.TextureLoader().load('./resources/images/smokeparticle.png');
        let material = new THREE.PointsMaterial({
            size: 15,
            map: texture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            color: 'rgb(112,128,144)'
        });

        const range = 175;
        for (let i = 0; i < particleCount; i++) {
            const x = THREE.Math.randInt(-range, range);
            const y = THREE.Math.randInt(-range, range);
            const z = THREE.Math.randInt(-range, range);
            const point = new THREE.Vector3(x, y, z);
            point.velocityX = THREE.Math.randFloat(-0.1, 0.1);
            point.velocityY = THREE.Math.randFloat(2.0, 5.0);
            geometry.vertices.push(point);
        }

        points = new THREE.Points(geometry, material);
        points.position.y = 800;
        scene.add(points);
    }

    function pointsAnimation() {
        points.geometry.vertices.forEach(function(v) {
            v.y = v.y + v.velocityY;
            v.x = v.x + v.velocityX;

            if (v.y >= 1000) {
                v.y = 0;
            }
        });

        points.geometry.verticesNeedUpdate = true;
    }






    /**
     * GUI
     */
    const gui = new GUI();

    let uniforms = water.material.uniforms;

    const folder = gui.addFolder( 'Water' );
    folder.add( uniforms.distortionScale, 'value', 0, 8, 0.1 ).name( 'distortionScale' );
    folder.add( uniforms.size, 'value', 0.1, 10, 0.1 ).name( 'size' );
    folder.add( uniforms.alpha, 'value', 0.9, 1, .001 ).name( 'alpha' );
    folder.open();

    let lavaUniforms = lavaMaterial.uniforms;

    const lavaFolder = gui.addFolder('Lava');
    lavaFolder.add( lavaUniforms.time, 'value', 0, 100, 1).name('time');
    lavaFolder.add( lavaUniforms.fogDensity, 'value', 0, 0.007, 0.0001).name('fogDensity');
    lavaFolder.open();

    /*


    const bloomFolder = gui.addFolder('Bloom');
    bloomFolder.add(effectParams, 'bloomStrength', 0.0, 200.0).onChange( function ( value){
        effectBloom.strength = Number( value );
    });
    bloomFolder.add(effectParams, 'noiseIntensity', 0.00, 5).onChange( function (value){
        effectFilm.noiseIntensity = Number(value);
    });
    bloomFolder.add(effectParams, 'scanlinesIntensity', 0.00, 5).onChange( function (value){
        effectFilm.scanlinesIntensity = Number(value);
    })
    folder.open();
    */
    /**
     * Hus
     */
    // instantiate a GLTFLoader:
    const loader2 = new GLTFLoader();

    loader2.load(
        // resource URL
        'resources/models/Hus.glb',
        // called when resource is loaded
        (object) => {
            //for (let x = 1000; x < 1050; x += 50) {
            // for (let z = 1000; z < 1050; z += 50) {

            //const px = x + 1 + (6 * Math.random()) - 3;
            //const pz = z + 1 + (6 * Math.random()) - 3;
            const px = -1200;
            const pz = 1200;
            const height = terrainGeometry.getHeightAt(px, pz);

            //if (height > 420 /*&& height < 480*/) {
            const hus = object.scene/*.children[0].clone()*/;
            /*
            hus.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });*/

            hus.position.x = px;
            hus.position.y = height - 0.01;
            hus.position.z = pz;

            hus.rotation.y = /*Math.random() * */(2 * Math.PI);

            hus.scale.multiplyScalar(5);

            scene.add(hus);
            //}

            //}
            //}
        },
        (xhr) => {
            console.log(((xhr.loaded / xhr.total) * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading model.', error);
        }
    );


    /**
     * Sphere med Bumpmapping
     *
     */


    const loader3 = new THREE.TextureLoader();

    loader3.load( 'resources/textures/4k_sphere.jpg', function (texture){


        const geometry = new THREE.SphereGeometry(100, 200, 200);

        const material = new THREE.MeshBasicMaterial({map: texture});
        const mesh = new THREE.Mesh(geometry, material);


        mesh.position.x = 1600;
        mesh.position.y = 1900;
        mesh.position.z = 1600;

        scene.add(mesh);

    });

    /**
     * Ho Oh
     */
        // instantiate a GLTFLoader:
    const loaderBird = new GLTFLoader();
    let hooh;
    let vulkan = new Object3D();
    vulkan.position.y = 800;
    scene.add(vulkan);
    // Create an AnimationMixer, and get the list of AnimationClip instances
    let mixer;
    loaderBird.load(
        // resource URL
        'resources/models/ho_oh/scene.gltf',
        // called when resource is loaded
        (object) => {
            hooh = object.scene.children[0];
            hooh.scale.multiplyScalar(0.5);
            hooh.position.x = 700;
            hooh.rotation.z = Math.PI;
            vulkan.add(hooh);
            mixer = new AnimationMixer( hooh );
            let action = mixer.clipAction( object.animations[0] );
            action.play();
        },
        (xhr) => {
            console.log(((xhr.loaded / xhr.total) * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading model.', error);
        }
    );

    /**
     * Add trees
     */

        // instantiate a GLTFLoader:
    const loader = new GLTFLoader();

    loader.load(
        // resource URL
        'resources/models/kenney_nature_kit/tree_thin.glb',
        // called when resource is loaded
        (object) => {
            for (let x = -1400; x < 1400; x += 30) {
                for (let z = -1400; z < 1400; z += 30) {

                    const px = x + 1 + (6 * Math.random()) - 3;
                    const pz = z + 1 + (6 * Math.random()) - 3;

                    const height = terrainGeometry.getHeightAt(px, pz);

                    if (height > 370 && height < 470) {
                        const tree = object.scene.children[0].clone();

                        tree.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });

                        tree.position.x = px;
                        tree.position.y = height - 0.01;
                        tree.position.z = pz;

                        tree.rotation.y = Math.random() * (2 * Math.PI);

                        tree.scale.multiplyScalar(50 + Math.random() * 25);

                        scene.add(tree);
                    }

                }
            }
        },
        (xhr) => {
            console.log(((xhr.loaded / xhr.total) * 100) + '% loaded');
        },
        (error) => {
            console.error('Error loading model.', error);
        }
    );

    // Skybox
    const skyboxImage = 'bluecloud';
    const materialArray = createMaterialArray(skyboxImage);

    let skyboxGeo = new THREE.BoxGeometry(10000, 10000, 10000);

    let skybox = new THREE.Mesh(skyboxGeo, materialArray);

    scene.add(skybox);

    /**
     * Set up camera controller:
     */

    const mouseLookController = new MouseLookController(camera);

    // We attach a click lister to the canvas-element so that we can request a pointer lock.
    // https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
    const canvas = renderer.domElement;

    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    let yaw = 0;
    let pitch = 0;
    const mouseSensitivity = 0.001;

    function updateCamRotation(event) {
        yaw += event.movementX * mouseSensitivity;
        pitch += event.movementY * mouseSensitivity;
    }

    function createMaterialArray(filename) {

        const skyboxImagepaths = createPathStrings(filename);

        const materialArray = skyboxImagepaths.map(image => {

            let texture = new THREE.TextureLoader().load(image);

            return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }); // <---

        });

        return materialArray;

    }

    function createPathStrings(filename) {

        const basePath = "resources/images/Skybox/";

        const baseFilename = basePath + filename;

        const fileType = ".jpg";

        const sides = ["ft", "bk", "up", "dn", "rt", "lf"];

        const pathStings = sides.map(side => {

            return baseFilename + "_" + side + fileType;

        });

        return pathStings;

    }

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            canvas.addEventListener('mousemove', updateCamRotation, false);
        } else {
            canvas.removeEventListener('mousemove', updateCamRotation, false);
        }
    });

    let move = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        speed: 0.3
    };

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') {
            move.forward = true;
            e.preventDefault();
        } else if (e.code === 'KeyS') {
            move.backward = true;
            e.preventDefault();
        } else if (e.code === 'KeyA') {
            move.left = true;
            e.preventDefault();
        } else if (e.code === 'KeyD') {
            move.right = true;
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') {
            move.forward = false;
            e.preventDefault();
        } else if (e.code === 'KeyS') {
            move.backward = false;
            e.preventDefault();
        } else if (e.code === 'KeyA') {
            move.left = false;
            e.preventDefault();
        } else if (e.code === 'KeyD') {
            move.right = false;
            e.preventDefault();
        }
    });

    function animate() {
        rotateObject(vulkan, [0.0, 0.02, 0.0]);
        let delta = clock.getDelta();
        if ( mixer ) mixer.update( delta );

        skybox.rotation.x += 0.001;

        skybox.rotation.y += 0.001;

        requestAnimationFrame(animate);

        requestAnimationFrame(loop);

        pointsAnimation();

        render();

    }

    function rotateObject(object, rotation) {
        //Hjelpe-metode for å rotere et objekt
        object.rotation.x += rotation[0];
        object.rotation.y += rotation[1];
        object.rotation.z += rotation[2];
    }

    const velocity = new Vector3(0.0, 0.0, 0.0);

    let then = performance.now();

    function loop(now) {

        const delta = now - then;
        then = now;

        const moveSpeed = move.speed * delta;

        velocity.set(0.0, 0.0, 0.0);

        if (move.left) {
            velocity.x -= moveSpeed;
        }

        if (move.right) {
            velocity.x += moveSpeed;
        }

        if (move.forward) {
            velocity.z -= moveSpeed;
        }

        if (move.backward) {
            velocity.z += moveSpeed;
        }

        // update controller rotation.
        mouseLookController.update(pitch, yaw);
        yaw = 0;
        pitch = 0;

        // apply rotation to velocity vector, and translate moveNode with it.
        velocity.applyQuaternion(camera.quaternion);
        camera.position.add(velocity);


        //lava movement
        let deltaLava = 5 * clock2.getDelta();

        lavaMaterial.uniforms['time'].value += 0.1 * deltaLava;


        // water movement
        water.material.uniforms['time'].value += 1.0 / 60.0;




    }
    function render() {


        renderer.clear();
        camera.layers.set(1);
        composer.render();

        renderer.clearDepth();
        camera.layers.set(0);
        renderer.render(scene, camera);

    }


    loop(performance.now());
    animate();

}
main(); // Start application