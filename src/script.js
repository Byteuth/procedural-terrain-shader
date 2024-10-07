import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import GUI from "lil-gui";
import { SUBTRACTION, Evaluator, Brush } from "three-bvh-csg";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import terrainVertexShader from "./shaders/terrain/vertex.glsl";
import terrainFragmentShader from "./shaders/terrain/fragment.glsl";

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 325 });
const debugObject = {};

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const rgbeLoader = new RGBELoader();

/**
 * Environment map
 */
rgbeLoader.load("/spruit_sunrise.hdr", (environmentMap) => {
	environmentMap.mapping = THREE.EquirectangularReflectionMapping;

	scene.background = environmentMap;
	scene.backgroundBlurriness = 0.5;
	scene.environment = environmentMap;
});

//terrain
const geometry = new THREE.PlaneGeometry(10, 10, 500, 500);
geometry.deleteAttribute("uv");
geometry.deleteAttribute("normal");
geometry.rotateX(-Math.PI * 0.5);

debugObject.colorWaterDeep = "#002b3d";
debugObject.colorWaterSurface = "#66a8ff";
debugObject.colorSand = "#ffe894";
debugObject.colorGrass = "#85d534";
debugObject.colorSnow = "#ffffff";
debugObject.colorRock = "#bfbd8d";

const uniforms = {
	uTime: new THREE.Uniform(0),
	uPositionFrequency: new THREE.Uniform(0.2),
	uStrength: new THREE.Uniform(2.0),
	uWarpFrequency: new THREE.Uniform(5),
	uWarpStrength: new THREE.Uniform(0.5),
	uColorWaterDeep: new THREE.Uniform(
		new THREE.Color(debugObject.colorWaterDeep)
	),
	uColorWaterSurface: new THREE.Uniform(
		new THREE.Color(debugObject.colorWaterSurface)
	),
	uColorSand: new THREE.Uniform(new THREE.Color(debugObject.colorSand)),
	uColorGrass: new THREE.Uniform(new THREE.Color(debugObject.colorGrass)),
	uColorSnow: new THREE.Uniform(new THREE.Color(debugObject.colorSnow)),
	uColorRock: new THREE.Uniform(new THREE.Color(debugObject.colorRock)),
};
gui
	.add({ togglePause: false }, "togglePause")
	.name("Pause Time")
	.onChange((value) => {
		paused = value;
		if (paused) {
			lastElapsedTime = uniforms.uTime.value;
		}
	});
gui
	.add(uniforms.uPositionFrequency, "value")
	.min(0)
	.max(1)
	.step(0.001)
	.name("uPositionFrequency");
gui
	.add(uniforms.uStrength, "value")
	.min(0)
	.max(10)
	.step(0.001)
	.name("uStrength");
gui
	.add(uniforms.uWarpFrequency, "value")
	.min(0)
	.max(10)
	.step(0.001)
	.name("uWarpFrequency");
gui
	.add(uniforms.uWarpStrength, "value")
	.min(0)
	.max(1)
	.step(0.001)
	.name("uWarpStrength");

let paused = false;
let lastElapsedTime = 0;

gui
	.addColor(debugObject, "colorWaterDeep")
	.onChange(() =>
		uniforms.uColorWaterDeep.value.set(debugObject.colorWaterDeep)
	);
gui
	.addColor(debugObject, "colorWaterSurface")
	.onChange(() =>
		uniforms.uColorWaterSurface.value.set(debugObject.colorWaterSurface)
	);
gui
	.addColor(debugObject, "colorSand")
	.onChange(() => uniforms.uColorSand.value.set(debugObject.colorSand));
gui
	.addColor(debugObject, "colorGrass")
	.onChange(() => uniforms.uColorGrass.value.set(debugObject.colorGrass));
gui
	.addColor(debugObject, "colorSnow")
	.onChange(() => uniforms.uColorSnow.value.set(debugObject.colorSnow));
gui
	.addColor(debugObject, "colorRock")
	.onChange(() => uniforms.uColorRock.value.set(debugObject.colorRock));

const material = new CustomShaderMaterial({
	// csm
	baseMaterial: THREE.MeshStandardMaterial,
	silent: true,
	vertexShader: terrainVertexShader,
	fragmentShader: terrainFragmentShader,
	uniforms: uniforms,

	// native,
	metalness: 0,
	roughness: 0.5,
	color: "#85d534",
});

const depthMaterial = new CustomShaderMaterial({
	// csm
	baseMaterial: THREE.MeshDepthMaterial,
	silent: true,
	vertexShader: terrainVertexShader,
	uniforms: uniforms,

	// native
	depthPacking: THREE.RGBADepthPacking,
});

const terrain = new THREE.Mesh(geometry, material);
terrain.customDepthMaterial = depthMaterial;
terrain.position.set(0, 0, 0);
terrain.receiveShadow = true;
scene.add(terrain);

const water = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 1, 1),
    new THREE.MeshPhysicalMaterial({
        transmission: 1,
        roughness: 0.1,
        // color: 0x66a8ff
    })
)
water.rotation.x = -Math.PI * 0.5
water.position.set(0, -0.1, 0)
scene.add(water)

//Board Area
const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11));
const hole = new Brush(new THREE.BoxGeometry(10, 2.1, 10));
// hole.position.y = 0.2
// hole.updateMatrixWorld()

const evaluator = new Evaluator();
const board = evaluator.evaluate(boardFill, hole, SUBTRACTION);
board.geometry.clearGroups();
board.material = new THREE.MeshStandardMaterial({
	color: 0xffffff,
	metalness: 0,
	roughness: 0.3,
});

board.castShadow = true;
board.receiveShadow = true;
scene.add(board);
/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 2);
directionalLight.position.set(6.25, 3, 4);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.bottom = -8;
directionalLight.shadow.camera.left = -8;
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
	pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
	35,
	sizes.width / sizes.height,
	0.1,
	100
);
camera.position.set(-10, 6, -2);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
	antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
	const elapsedTime = clock.getElapsedTime();

	if (!paused) {
		uniforms.uTime.value = elapsedTime;
	} else {
		uniforms.uTime.value = lastElapsedTime;
	}

	// Update controls
	controls.update();

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();
