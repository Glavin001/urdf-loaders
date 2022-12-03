import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene,
    Mesh,
    PlaneBufferGeometry,
    ShadowMaterial,
    DirectionalLight,
    PCFSoftShadowMap,
    sRGBEncoding,
    Color,
    AmbientLight,
    Box3,
    LoadingManager,
    MathUtils,
} from 'three';
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from '../../src/URDFLoader.js';

let scene, camera, renderer, robot, controls, world, mesh, body;

init();
render();

function init() {

    scene = new Scene();
    scene.background = new Color(0x263238);

    camera = new PerspectiveCamera();
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    renderer = new WebGLRenderer({ antialias: true });
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
    });

    const geometry = new THREE.BoxBufferGeometry(2, 2, 2)
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })

    mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 1))
    body = new CANNON.Body({
      mass: 1,
    })
    body.addShape(shape)
    body.angularVelocity.set(0, 10, 0)
    body.angularDamping = 0.5
    world.addBody(body)

    const directionalLight = new DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(5, 30, 5);
    scene.add(directionalLight);

    const ambientLight = new AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const ground = new Mesh(new PlaneBufferGeometry(), new ShadowMaterial({ opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    scene.add(ground);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 4;
    controls.target.y = 1;
    controls.update();

    // Load robot
    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    loader.load('../../../urdf/T12/urdf/T12_flipped.URDF', result => {

        robot = result;

    });

    // wait until all the geometry has loaded to add the model to the scene
    manager.onLoad = () => {

        robot.rotation.x = Math.PI / 2;
        robot.traverse(c => {
            c.castShadow = true;
        });
        for (let i = 1; i <= 6; i++) {

            robot.joints[`HP${ i }`].setJointValue(MathUtils.degToRad(30));
            robot.joints[`KP${ i }`].setJointValue(MathUtils.degToRad(120));
            robot.joints[`AP${ i }`].setJointValue(MathUtils.degToRad(-60));

        }
        robot.updateMatrixWorld(true);

        const bb = new Box3();
        bb.setFromObject(robot);

        robot.position.y -= bb.min.y;
        scene.add(robot);

    };

    onResize();
    window.addEventListener('resize', onResize);

}

function onResize() {

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

}

const timeStep = 1 / 60; // seconds
let lastCallTime;
function render() {

    requestAnimationFrame(render);

    const time = performance.now() / 1000 // seconds
    if (!lastCallTime) {
      world.step(timeStep)
    } else {
      const dt = time - lastCallTime
      world.step(timeStep, dt)
    }
    lastCallTime = time;  

    // Copy coordinates from cannon.js to three.js
    mesh.position.copy(body.position)
    mesh.quaternion.copy(body.quaternion)

    console.log('body', body.position);
    
    renderer.render(scene, camera);

}
