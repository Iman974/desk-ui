let sourceCanvas
let canvas, context;
let container, stats;
let controls;
let pathTracingScene, screenCopyScene, screenOutputScene;
let pathTracingUniforms = {};
let pathTracingUniformsGroups = [];
let screenCopyUniforms, screenOutputUniforms;
let pathTracingDefines;
let pathTracingVertexShader, pathTracingFragmentShader;
let demoFragmentShaderFileName;
let screenCopyVertexShader, screenCopyFragmentShader;
let screenOutputVertexShader, screenOutputFragmentShader;
let pathTracingGeometry, pathTracingMaterial, pathTracingMesh;
let screenCopyGeometry, screenCopyMaterial, screenCopyMesh;
let screenOutputGeometry, screenOutputMaterial, screenOutputMesh;
let pathTracingRenderTarget, screenCopyRenderTarget;
let quadCamera, worldCamera;
let renderer, clock;
let frameTime, elapsedTime;
let sceneIsDynamic = false;
let cameraFlightSpeed = 60;
let cameraRotationSpeed = 1;
let fovScale;
let storedFOV = 0;
let increaseFOV = false;
let decreaseFOV = false;
let dollyCameraIn = false;
let dollyCameraOut = false;
let apertureSize = 0.0;
let increaseAperture = false;
let decreaseAperture = false;
let apertureChangeSpeed = 1;
let focusDistance = 132.0;
let increaseFocusDist = false;
let decreaseFocusDist = false;
let pixelRatio = 0.5;
let windowIsBeingResized = false;
let TWO_PI = Math.PI * 2;
let sampleCounter = 0.0; // will get increased by 1 in animation loop before rendering
let frameCounter = 1.0; // 1 instead of 0 because it is used as a rng() seed in pathtracing shader
let cameraIsMoving = false;
let cameraRecentlyMoving = false;
let isPaused = true;
let oldYawRotation, oldPitchRotation;
let mobileJoystickControls = null;
let mobileShowButtons = true;
let mobileUseDarkButtons = false;
let oldDeltaX = 0;
let oldDeltaY = 0;
let newDeltaX = 0;
let newDeltaY = 0;
let mobileControlsMoveX = 0;
let mobileControlsMoveY = 0;
let oldPinchWidthX = 0;
let oldPinchWidthY = 0;
let pinchDeltaX = 0;
let pinchDeltaY = 0;
let fontAspect;
let useGenericInput = true;
let EPS_intersect;
let textureLoader = new THREE.TextureLoader();
let blueNoiseTexture;
let useToneMapping = true;
let canPress_O = true;
let canPress_P = true;
let allowOrthographicCamera = true;
let changeToOrthographicCamera = false;
let changeToPerspectiveCamera = false;
let pixelEdgeSharpness = 1.0;
let edgeSharpenSpeed = 0.05;
let filterDecaySpeed = 0.0002;

// let gui;
// let ableToEngagePointerLock = true;
// let pixel_ResolutionController, pixel_ResolutionObject;
// let needChangePixelResolution = false;
// let orthographicCamera_ToggleController, orthographicCamera_ToggleObject;
// let currentlyUsingOrthographicCamera = false;

// the following variables will be used to calculate rotations and directions from the camera
// let cameraDirectionVector = new THREE.Vector3(); //for moving where the camera is looking
// let cameraRightVector = new THREE.Vector3(); //for strafing the camera right and left
// let cameraUpVector = new THREE.Vector3(); //for moving camera up and down
// let cameraWorldQuaternion = new THREE.Quaternion(); //for rotating scene objects to match camera's current rotation
// let cameraControlsObject; //for positioning and moving the camera itself
// let cameraControlsYawObject; //allows access to control camera's left/right movements through mobile input
// let cameraControlsPitchObject; //allows access to control camera's up/down movements through mobile input

let PI_2 = Math.PI / 2; //used by controls below

let mouseControl = true;
let pointerlockChange;
let fileLoader = new THREE.FileLoader();
let modelLoadedCount = 0;


const { mergeGeometries } = THREE.BufferGeometryUtils;
const { BVH_Build_Iterative } = THREE.BVH_Acc_Structure_Iterative_SAH_Builder
THREE.InitCommon = {}

// scene/demo-specific variables go here
// Rendering variables
let triangleDataTexture, aabbDataTexture;

// HDR image variables
// let hdrTexture, hdrLoader
let hdrExposure = 3.0;

// Environment variables
let skyLightIntensity = 0.0, sunLightIntensity = 2.0, sunColor = [1.0, 0.98, 0.92];
let sunAngle = Math.PI / 2.5;

// Geometry variables
let meshes = [];
let triangleMaterialMarkers = [];
let pathTracingMaterialList = [];
let uniqueMaterialTextures = [];
let aabb_array;

// Model/scene variables
let modelScale = 10.0;
let modelRotationY = Math.PI; // in radians
let modelPositionOffset = new THREE.Vector3();
let sunDirection = new THREE.Vector3();

// let hdr_ExposureController, hdr_ExposureObject;
let hdrExposureChanged = false;
// let skyLight_IntensityController, skyLight_IntensityObject;
let skyLightIntensityChanged = false;
// let sun_AngleController, sun_AngleObject;
let sunAngleChanged = false;
// let sunLight_IntensityController, sunLight_IntensityObject;
let sunLightIntensityChanged = false;
// let sun_ColorController, sun_ColorObject;
let sunColorChanged = false;

let cameraSettings = {
	x: -16,
	y: 14,
	z: 43,
	rot_x: -0.2,
	rot_y: -0.3,
	rot_z: 0
};
let cameraSettingsChanged = false


function onWindowResize(event) {
    console.log("Resize detected")
	windowIsBeingResized = true;

	CANVAS_WIDTH = sourceCanvas.width
	CANVAS_HEIGHT = sourceCanvas.height

	renderer.setPixelRatio(pixelRatio);
	renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);

	// fontAspect = (SCREEN_WIDTH / 175) * (SCREEN_HEIGHT / 200);
	// if (fontAspect > 25) fontAspect = 25;
	// if (fontAspect < 4) fontAspect = 4;
	// fontAspect *= 2;

	pathTracingUniforms.uResolution.value.x = context.drawingBufferWidth;
	pathTracingUniforms.uResolution.value.y = context.drawingBufferHeight;

	pathTracingRenderTarget.setSize(context.drawingBufferWidth, context.drawingBufferHeight);
	screenCopyRenderTarget.setSize(context.drawingBufferWidth, context.drawingBufferHeight);

	worldCamera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
	// the following is normally used with traditional rasterized rendering, but it is not needed for our fragment shader raytraced rendering 
	///worldCamera.updateProjectionMatrix();

	// the following scales all scene objects by the worldCamera's field of view,
	// taking into account the screen aspect ratio and multiplying the uniform uULen,
	// the x-coordinate, by this ratio
	fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
	pathTracingUniforms.uVLen.value = Math.tan(fovScale);
	pathTracingUniforms.uULen.value = pathTracingUniforms.uVLen.value * worldCamera.aspect;

} // end function onWindowResize( event )

function MaterialObject(material, pathTracingMaterialList) {
	// a list of material types and their corresponding numbers are found in the 'pathTracingCommon.js' file
	this.type = material.opacity < 1 ? 2 : 1; // default is 1 = diffuse opaque, 2 = glossy transparent, 4 = glossy opaque;
	this.albedoTextureID = -1; // which diffuse map to use for model's color, '-1' = no textures are used
	this.color = material.color ? material.color.copy(material.color) : new THREE.Color(1.0, 1.0, 1.0); // takes on different meanings, depending on 'type' above
	this.roughness = material.roughness || 0.0; // 0.0 to 1.0 range, perfectly smooth to extremely rough
	this.metalness = material.metalness || 0.0; // 0.0 to 1.0 range, usually either 0 or 1, either non-metal or metal
	this.opacity = material.opacity || 1.0; // 0.0 to 1.0 range, fully transparent to fully opaque
	// this seems to be unused
	// this.refractiveIndex = this.type === 4 ? 1.0 : 1.5; // 1.0=air, 1.33=water, 1.4=clearCoat, 1.5=glass, etc.
	pathTracingMaterialList.push(this);
}

function loadMeshes(meshGroup) {
	meshes = [];
	pathTracingMaterialList = [];
	triangleMaterialMarkers = [];
	uniqueMaterialTextures = [];

	if (meshGroup.scene)
		meshGroup = meshGroup.scene;

	let matrixStack = [];
	let parent;
	matrixStack.push(new THREE.Matrix4());
	meshGroup.traverse(function (child) {
		if (child.isMesh) {
			if (parent !== undefined && parent.name !== child.parent.name) {
				matrixStack.pop();
				parent = undefined;
			}

			child.geometry.applyMatrix4(child.matrix.multiply(matrixStack[matrixStack.length - 1]));

			if (child.material.length > 0) {
				for (let i = 0; i < child.material.length; i++)
					new MaterialObject(child.material[i], pathTracingMaterialList);
			} else {
				new MaterialObject(child.material, pathTracingMaterialList);
			}

			if (child.geometry.groups.length > 0) {
				for (let i = 0; i < child.geometry.groups.length; i++) {
					triangleMaterialMarkers.push((triangleMaterialMarkers.length > 0 ? triangleMaterialMarkers[triangleMaterialMarkers.length - 1] : 0) + child.geometry.groups[i].count / 3);
				}
			} else {
				triangleMaterialMarkers.push((triangleMaterialMarkers.length > 0 ? triangleMaterialMarkers[triangleMaterialMarkers.length - 1] : 0) + child.geometry.index.count / 3);
			}

			meshes.push(child);
		} else if (child.isObject3D) {
			if (parent !== undefined)
				matrixStack.pop();

			let matrixPeek = new THREE.Matrix4().copy(matrixStack[matrixStack.length - 1]).multiply(child.matrix);
			matrixStack.push(matrixPeek);
			parent = child;
		}
	}); // end meshGroup.traverse(function (child)

	modelLoadedCount++;

	if (modelLoadedCount == 1) {
		var flattenedMeshList = [].concat.apply([], meshes);
		// Prepare geometry for path tracing
		prepareGeometryForPT(flattenedMeshList, pathTracingMaterialList, triangleMaterialMarkers);

		// // Hide loading spinning and show menu
		// loadingSpinner.classList.add("hidden");
		// gui.domElement.classList.remove("hidden");
	}

}

function prepareGeometryForPT(meshList, pathTracingMaterialList, triangleMaterialMarkers) {
	// Gather all geometry from the mesh list that now contains loaded models
	let geoList = [];
	for (let i = 0; i < meshList.length; i++)
		geoList.push(meshList[i].geometry);

	// Merge geometry from all models into one new mesh
	let modelMesh = new THREE.Mesh(mergeGeometries(geoList));
	if (modelMesh.geometry.index)
		modelMesh.geometry = modelMesh.geometry.toNonIndexed(); // why do we need NonIndexed geometry?

	// divide by 9 because of nonIndexed geometry (each triangle has 3 floats with each float constisting of 3 components)
	let total_number_of_triangles = modelMesh.geometry.attributes.position.array.length / 9;

	// Gather all textures from materials
	for (let i = 0; i < meshList.length; i++) {
		if (meshList[i].material.length > 0) {
			for (let j = 0; j < meshList[i].material.length; j++) {
				if (meshList[i].material[j].map)
					uniqueMaterialTextures.push(meshList[i].material[j].map);
			}
		} else if (meshList[i].material.map) {
			uniqueMaterialTextures.push(meshList[i].material.map);
		}
	}

	// Remove duplicate entries
	uniqueMaterialTextures = Array.from(new Set(uniqueMaterialTextures));

	// Assign textures to the path tracing material with the correct id
	for (let i = 0; i < meshList.length; i++) {
		if (meshList[i].material.length > 0) {
			for (let j = 0; j < meshList[i].material.length; j++) {
				if (meshList[i].material[j].map) {
					for (let k = 0; k < uniqueMaterialTextures.length; k++) {
						if (meshList[i].material[j].map.image.src === uniqueMaterialTextures[k].image.src) {
							pathTracingMaterialList[i].albedoTextureID = k;
						}
					}
				}
			}
		} else if (meshList[i].material.map) {
			for (let j = 0; j < uniqueMaterialTextures.length; j++) {
				if (meshList[i].material.map.image.src === uniqueMaterialTextures[j].image.src) {
					pathTracingMaterialList[i].albedoTextureID = j;
				}
			}
		}
	}

	console.log(`Loaded model consisting of ${total_number_of_triangles} total triangles that are using ${uniqueMaterialTextures.length} textures.`);

// 	console.timeEnd("LoadingGltf");



	modelMesh.geometry.rotateY(modelRotationY);

	let totalWork = new Uint32Array(total_number_of_triangles);

	// Initialize triangle and aabb arrays where 2048 = width and height of texture and 4 are the r, g, b and a components
	let triangle_array = new Float32Array(2048 * 2048 * 4);
	aabb_array = new Float32Array(2048 * 2048 * 4);

	var triangle_b_box_min = new THREE.Vector3();
	var triangle_b_box_max = new THREE.Vector3();
	var triangle_b_box_centroid = new THREE.Vector3();

	var vpa = new Float32Array(modelMesh.geometry.attributes.position.array);
	if (modelMesh.geometry.attributes.normal === undefined)
		modelMesh.geometry.computeVertexNormals();
	var vna = new Float32Array(modelMesh.geometry.attributes.normal.array);

	var modelHasUVs = false;
	if (modelMesh.geometry.attributes.uv !== undefined) {
		var vta = new Float32Array(modelMesh.geometry.attributes.uv.array);
		modelHasUVs = true;
	}

	let materialNumber = 0;
	for (let i = 0; i < total_number_of_triangles; i++) {

		triangle_b_box_min.set(Infinity, Infinity, Infinity);
		triangle_b_box_max.set(-Infinity, -Infinity, -Infinity);

		let vt0 = new THREE.Vector3();
		let vt1 = new THREE.Vector3();
		let vt2 = new THREE.Vector3();
		// record vertex texture coordinates (UVs)
		if (modelHasUVs) {
			vt0.set(vta[6 * i + 0], vta[6 * i + 1]);
			vt1.set(vta[6 * i + 2], vta[6 * i + 3]);
			vt2.set(vta[6 * i + 4], vta[6 * i + 5]);
		} else {
			vt0.set(-1, -1);
			vt1.set(-1, -1);
			vt2.set(-1, -1);
		}

		// record vertex normals
		let vn0 = new THREE.Vector3(vna[9 * i + 0], vna[9 * i + 1], vna[9 * i + 2]).normalize();
		let vn1 = new THREE.Vector3(vna[9 * i + 3], vna[9 * i + 4], vna[9 * i + 5]).normalize();
		let vn2 = new THREE.Vector3(vna[9 * i + 6], vna[9 * i + 7], vna[9 * i + 8]).normalize();

		// record vertex positions
		let vp0 = new THREE.Vector3(vpa[9 * i + 0], vpa[9 * i + 1], vpa[9 * i + 2]);
		let vp1 = new THREE.Vector3(vpa[9 * i + 3], vpa[9 * i + 4], vpa[9 * i + 5]);
		let vp2 = new THREE.Vector3(vpa[9 * i + 6], vpa[9 * i + 7], vpa[9 * i + 8]);

		vp0.multiplyScalar(modelScale);
		vp1.multiplyScalar(modelScale);
		vp2.multiplyScalar(modelScale);

		vp0.add(modelPositionOffset);
		vp1.add(modelPositionOffset);
		vp2.add(modelPositionOffset);

		//slot 0
		triangle_array[32 * i + 0] = vp0.x; // r or x
		triangle_array[32 * i + 1] = vp0.y; // g or y
		triangle_array[32 * i + 2] = vp0.z; // b or z
		triangle_array[32 * i + 3] = vp1.x; // a or w

		//slot 1
		triangle_array[32 * i + 4] = vp1.y; // r or x
		triangle_array[32 * i + 5] = vp1.z; // g or y
		triangle_array[32 * i + 6] = vp2.x; // b or z
		triangle_array[32 * i + 7] = vp2.y; // a or w

		//slot 2
		triangle_array[32 * i + 8] = vp2.z; // r or x
		triangle_array[32 * i + 9] = vn0.x; // g or y
		triangle_array[32 * i + 10] = vn0.y; // b or z
		triangle_array[32 * i + 11] = vn0.z; // a or w

		//slot 3
		triangle_array[32 * i + 12] = vn1.x; // r or x
		triangle_array[32 * i + 13] = vn1.y; // g or y
		triangle_array[32 * i + 14] = vn1.z; // b or z
		triangle_array[32 * i + 15] = vn2.x; // a or w

		//slot 4
		triangle_array[32 * i + 16] = vn2.y; // r or x
		triangle_array[32 * i + 17] = vn2.z; // g or y
		triangle_array[32 * i + 18] = vt0.x; // b or z
		triangle_array[32 * i + 19] = vt0.y; // a or w

		//slot 5
		triangle_array[32 * i + 20] = vt1.x; // r or x
		triangle_array[32 * i + 21] = vt1.y; // g or y
		triangle_array[32 * i + 22] = vt2.x; // b or z
		triangle_array[32 * i + 23] = vt2.y; // a or w

		// the remaining slots are used for PBR material properties

		if (i >= triangleMaterialMarkers[materialNumber])
			materialNumber++;

		//slot 6
		triangle_array[32 * i + 24] = pathTracingMaterialList[materialNumber].type; // r or x
		triangle_array[32 * i + 25] = pathTracingMaterialList[materialNumber].color.r; // g or y
		triangle_array[32 * i + 26] = pathTracingMaterialList[materialNumber].color.g; // b or z
		triangle_array[32 * i + 27] = pathTracingMaterialList[materialNumber].color.b; // a or w

		//slot 7
		triangle_array[32 * i + 28] = pathTracingMaterialList[materialNumber].albedoTextureID; // r or x
		triangle_array[32 * i + 29] = pathTracingMaterialList[materialNumber].opacity; // g or y
		triangle_array[32 * i + 30] = 0; // b or z
		triangle_array[32 * i + 31] = 0; // a or w

		triangle_b_box_min.copy(triangle_b_box_min.min(vp0));
		triangle_b_box_max.copy(triangle_b_box_max.max(vp0));
		triangle_b_box_min.copy(triangle_b_box_min.min(vp1));
		triangle_b_box_max.copy(triangle_b_box_max.max(vp1));
		triangle_b_box_min.copy(triangle_b_box_min.min(vp2));
		triangle_b_box_max.copy(triangle_b_box_max.max(vp2));

		triangle_b_box_centroid.copy(triangle_b_box_min).add(triangle_b_box_max).multiplyScalar(0.5);
		//triangle_b_box_centroid.copy(vp0).add(vp1).add(vp2).multiplyScalar(0.3333);

		aabb_array[9 * i + 0] = triangle_b_box_min.x;
		aabb_array[9 * i + 1] = triangle_b_box_min.y;
		aabb_array[9 * i + 2] = triangle_b_box_min.z;
		aabb_array[9 * i + 3] = triangle_b_box_max.x;
		aabb_array[9 * i + 4] = triangle_b_box_max.y;
		aabb_array[9 * i + 5] = triangle_b_box_max.z;
		aabb_array[9 * i + 6] = triangle_b_box_centroid.x;
		aabb_array[9 * i + 7] = triangle_b_box_centroid.y;
		aabb_array[9 * i + 8] = triangle_b_box_centroid.z;

		totalWork[i] = i;

	} // end for (let i = 0; i < total_number_of_triangles; i++)

	console.time("BvhGeneration");
	console.log("BvhGeneration...");

	// Build the BVH acceleration structure, which places a bounding box ('root' of the tree) around all of the
	// triangles of the entire mesh, then subdivides each box into 2 smaller boxes.  It continues until it reaches 1 triangle,
	// which it then designates as a 'leaf'
	BVH_Build_Iterative(totalWork, aabb_array);
	//console.log(buildnodes);

	console.timeEnd("BvhGeneration");

	triangleDataTexture = new THREE.DataTexture(triangle_array,
		2048,
		2048,
		THREE.RGBAFormat,
		THREE.FloatType,
		THREE.Texture.DEFAULT_MAPPING,
		THREE.ClampToEdgeWrapping,
		THREE.ClampToEdgeWrapping,
		THREE.NearestFilter,
		THREE.NearestFilter,
		1,
		THREE.NoColorSpace
	);

	triangleDataTexture.flipY = false;
	triangleDataTexture.generateMipmaps = false;
	triangleDataTexture.needsUpdate = true;

	aabbDataTexture = new THREE.DataTexture(aabb_array,
		2048,
		2048,
		THREE.RGBAFormat,
		THREE.FloatType,
		THREE.Texture.DEFAULT_MAPPING,
		THREE.ClampToEdgeWrapping,
		THREE.ClampToEdgeWrapping,
		THREE.NearestFilter,
		THREE.NearestFilter,
		1,
		THREE.NoColorSpace
	);

	aabbDataTexture.flipY = false;
	aabbDataTexture.generateMipmaps = false;
	aabbDataTexture.needsUpdate = true;


} // end function prepareGeometryForPT(meshList, pathTracingMaterialList, triangleMaterialMarkers)

THREE.InitCommon.init = async function (meshes, canvas, sourceViewer) {
	sourceViewer.getWindow().addListener('resize', onWindowResize);
	sourceCanvas = sourceViewer.getCanvas().getContentElement().getCanvas();

	loadMeshes(meshes)
	
	const textureLoadAsync = url => new Promise(resolve => {
	        blueNoiseTexture = textureLoader.load(url, resolve)
	})

// 	// load a resource
// 	blueNoiseTexture = textureLoader.load(
// 		// resource URL
// 		'/code/raytracer_v2/textures/BlueNoise_RGBA256.png',

// 		// onLoad callback
// 		function (texture) {
// 		    console.log(blueNoiseTexture === texture)
		    
// 			texture.wrapS = THREE.RepeatWrapping;
//         	texture.wrapT = THREE.RepeatWrapping;
//         	texture.flipY = false;
//         	texture.minFilter = THREE.NearestFilter;
//         	texture.magFilter = THREE.NearestFilter;
//         	texture.generateMipmaps = false;
        	
//         	initTHREEjs(canvas);
//         	callback();
// 		}
// 	);
	
	const texture = await textureLoadAsync('/code/raytracer_v2/textures/BlueNoise_RGBA256.png')
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.flipY = false;
	texture.minFilter = THREE.NearestFilter;
	texture.magFilter = THREE.NearestFilter;
	texture.generateMipmaps = false;
// 	console.log("blue noise texture loaded");
	
// 	boilerplate: init necessary three.js items and scene/demo-specific objects
    initTHREEjs(canvas); 

} // end function init()



function initTHREEjs(canvas) {

	renderer = new THREE.WebGLRenderer({ canvas: canvas, context: canvas.getContext('webgl2') });
	//suggestion: set to false for production
	renderer.debug.checkShaderErrors = true;

	renderer.autoClear = false;

	renderer.toneMapping = THREE.ReinhardToneMapping;

	//required by WebGL 2.0 for rendering to FLOAT textures
	context = renderer.getContext();
	context.getExtension('EXT_color_buffer_float');

// 	container = document.getElementById('container');
// 	container.appendChild(renderer.domElement);

	// stats = new Stats();
	// stats.domElement.style.position = 'absolute';
	// stats.domElement.style.top = '0px';
	// stats.domElement.style.cursor = "default";
	// stats.domElement.style.userSelect = "none";
	// stats.domElement.style.MozUserSelect = "none";
	// container.appendChild(stats.domElement);


	clock = new THREE.Clock();

	pathTracingScene = new THREE.Scene();
	screenCopyScene = new THREE.Scene();
	screenOutputScene = new THREE.Scene();

	// quadCamera is simply the camera to help render the full screen quad (2 triangles),
	// hence the name.  It is an Orthographic camera that sits facing the view plane, which serves as
	// the window into our 3d world. This camera will not move or rotate for the duration of the app.
	quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	screenCopyScene.add(quadCamera);
	screenOutputScene.add(quadCamera);

	// worldCamera is the dynamic camera 3d object that will be positioned, oriented and 
	// constantly updated inside the 3d scene.  Its view will ultimately get passed back to the 
	// stationary quadCamera, which renders the scene to a fullscreen quad (made up of 2 large triangles).
	worldCamera = new THREE.PerspectiveCamera(60, document.body.clientWidth / document.body.clientHeight, 1, 1000);
	pathTracingScene.add(worldCamera);

	// controls = new FirstPersonCameraControls(worldCamera);

	// cameraControlsObject = controls.getObject();
	// cameraControlsYawObject = controls.getYawObject();
	// cameraControlsPitchObject = controls.getPitchObject();

	// pathTracingScene.add(cameraControlsObject);


	// setup render targets...
	pathTracingRenderTarget = new THREE.WebGLRenderTarget(context.drawingBufferWidth, context.drawingBufferHeight, {
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
		depthBuffer: false,
		stencilBuffer: false
	});
	pathTracingRenderTarget.texture.generateMipmaps = false;

	screenCopyRenderTarget = new THREE.WebGLRenderTarget(context.drawingBufferWidth, context.drawingBufferHeight, {
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
		depthBuffer: false,
		stencilBuffer: false
	});
	screenCopyRenderTarget.texture.generateMipmaps = false;

	// blueNoise texture used in all demos
	/* blueNoiseTexture = new THREE.TextureLoader().load('textures/BlueNoise_RGBA256.png');
	blueNoiseTexture.wrapS = THREE.RepeatWrapping;
	blueNoiseTexture.wrapT = THREE.RepeatWrapping;
	blueNoiseTexture.flipY = false;
	blueNoiseTexture.minFilter = THREE.NearestFilter;
	blueNoiseTexture.magFilter = THREE.NearestFilter;
	blueNoiseTexture.generateMipmaps = false; */



	// setup scene/demo-specific objects, variables, GUI elements, and data
	initSceneData();


	// if ( !mouseControl ) 
	// {
	// 	mobileJoystickControls = new MobileJoystickControls({
	// 		//showJoystick: true,
	// 		showButtons: mobileShowButtons,
	// 		useDarkButtons: mobileUseDarkButtons
	// 	});
	// }

	// pixel_ResolutionController.setValue(pixelRatio);
	// if (!allowOrthographicCamera && !mouseControl) {
	// 	orthographicCamera_ToggleController.domElement.hidden = true;
	// 	orthographicCamera_ToggleController.domElement.remove();
	// }



	// setup screen-size quad geometry and shaders....

	// this full-screen quad mesh performs the path tracing operations and produces a screen-sized image
	pathTracingGeometry = new THREE.PlaneGeometry(2, 2);

	pathTracingUniforms.tPreviousTexture = { type: "t", value: screenCopyRenderTarget.texture };
	pathTracingUniforms.tBlueNoiseTexture = { type: "t", value: blueNoiseTexture };

	pathTracingUniforms.uCameraMatrix = { type: "m4", value: new THREE.Matrix4() };

	pathTracingUniforms.uResolution = { type: "v2", value: new THREE.Vector2() };
	pathTracingUniforms.uRandomVec2 = { type: "v2", value: new THREE.Vector2() };

	pathTracingUniforms.uEPS_intersect = { type: "f", value: EPS_intersect };
	pathTracingUniforms.uTime = { type: "f", value: 0.0 };
	pathTracingUniforms.uSampleCounter = { type: "f", value: 0.0 }; //0.0
	pathTracingUniforms.uPreviousSampleCount = { type: "f", value: 1.0 };
	pathTracingUniforms.uFrameCounter = { type: "f", value: 1.0 }; //1.0
	pathTracingUniforms.uULen = { type: "f", value: 1.0 };
	pathTracingUniforms.uVLen = { type: "f", value: 1.0 };
	pathTracingUniforms.uApertureSize = { type: "f", value: apertureSize };
	pathTracingUniforms.uFocusDistance = { type: "f", value: focusDistance };

	pathTracingUniforms.uCameraIsMoving = { type: "b1", value: false };
	pathTracingUniforms.uUseOrthographicCamera = { type: "b1", value: false };


	pathTracingDefines = {
		//NUMBER_OF_TRIANGLES: total_number_of_triangles
	};

	// load vertex and fragment shader files that are used in the pathTracing material, mesh and scene
	fileLoader.load("/code/raytracer_v2/shaders/common_PathTracing_Vertex.glsl", function (vertexShaderText) {
		pathTracingVertexShader = vertexShaderText;

		fileLoader.load('/code/raytracer_v2/shaders/' + demoFragmentShaderFileName, function (fragmentShaderText) {

			pathTracingFragmentShader = fragmentShaderText;

			pathTracingMaterial = new THREE.ShaderMaterial({
				uniforms: pathTracingUniforms,
				uniformsGroups: pathTracingUniformsGroups,
				defines: pathTracingDefines,
				vertexShader: pathTracingVertexShader,
				fragmentShader: pathTracingFragmentShader,
				depthTest: false,
				depthWrite: false
			});

			pathTracingMesh = new THREE.Mesh(pathTracingGeometry, pathTracingMaterial);
			pathTracingScene.add(pathTracingMesh);

			// the following keeps the large scene ShaderMaterial quad right in front 
			//   of the camera at all times. This is necessary because without it, the scene 
			//   quad will fall out of view and get clipped when the camera rotates past 180 degrees.
			worldCamera.add(pathTracingMesh);

		});
	});


	// this full-screen quad mesh copies the image output of the pathtracing shader and feeds it back in to that shader as a 'previousTexture'
	screenCopyGeometry = new THREE.PlaneGeometry(2, 2);

	screenCopyUniforms = {
		tPathTracedImageTexture: { type: "t", value: pathTracingRenderTarget.texture }
	};

	fileLoader.load('/code/raytracer_v2/shaders/ScreenCopy_Fragment.glsl', function (shaderText) {

		screenCopyFragmentShader = shaderText;

		screenCopyMaterial = new THREE.ShaderMaterial({
			uniforms: screenCopyUniforms,
			vertexShader: pathTracingVertexShader,
			fragmentShader: screenCopyFragmentShader,
			depthWrite: false,
			depthTest: false
		});

		screenCopyMesh = new THREE.Mesh(screenCopyGeometry, screenCopyMaterial);
		screenCopyScene.add(screenCopyMesh);
	});


	// this full-screen quad mesh takes the image output of the path tracing shader (which is a continuous blend of the previous frame and current frame),
	// and applies gamma correction (which brightens the entire image), and then displays the final accumulated rendering to the screen
	screenOutputGeometry = new THREE.PlaneGeometry(2, 2);

	screenOutputUniforms = {
		tPathTracedImageTexture: { type: "t", value: pathTracingRenderTarget.texture },
		uSampleCounter: { type: "f", value: 0.0 },
		uOneOverSampleCounter: { type: "f", value: 0.0 },
		uPixelEdgeSharpness: { type: "f", value: pixelEdgeSharpness },
		uEdgeSharpenSpeed: { type: "f", value: edgeSharpenSpeed },
		uFilterDecaySpeed: { type: "f", value: filterDecaySpeed },
		uSceneIsDynamic: { type: "b1", value: sceneIsDynamic },
		uUseToneMapping: { type: "b1", value: useToneMapping }
	};

	fileLoader.load('/code/raytracer_v2/shaders/ScreenOutput_Fragment.glsl', function (shaderText) {

		screenOutputFragmentShader = shaderText;

		screenOutputMaterial = new THREE.ShaderMaterial({
			uniforms: screenOutputUniforms,
			vertexShader: pathTracingVertexShader,
			fragmentShader: screenOutputFragmentShader,
			depthWrite: false,
			depthTest: false
		});

		screenOutputMesh = new THREE.Mesh(screenOutputGeometry, screenOutputMaterial);
		screenOutputScene.add(screenOutputMesh);
	});

	// // everything is set up, now we can start animating
	// animate();

} // end function initTHREEjs()


// called automatically from within initTHREEjs() function
function initSceneData() {
	demoFragmentShaderFileName = 'model_viewer.glsl';

	// scene/demo-specific three.js objects setup goes here
	sceneIsDynamic = false;

	cameraFlightSpeed = 60;

	// pixelRatio is resolution - range: 0.5(half resolution) to 1.0(full resolution)
	pixelRatio = mouseControl ? 0.5 : 0.5; // less demanding on battery-powered mobile devices

	EPS_intersect = 0.001;

	// set camera's field of view
	worldCamera.fov = 60;
	focusDistance = 100.0;

	// position and orient camera
	// cameraControlsObject.position.set(-100, 120, 0);
	// // turn right
	// cameraControlsPitchObject.rotation.x = -0.95;
	// // look downward
	// cameraControlsYawObject.rotation.y = Math.PI / -1.333;


	// add this demo's custom menu items to the GUI
	// init_GUI();


	// scene/demo-specific uniforms go here
	pathTracingUniforms.tTriangleTexture = { value: triangleDataTexture };
	pathTracingUniforms.tAABBTexture = { value: aabbDataTexture };
	// pathTracingUniforms.tHDRTexture = { value: hdrTexture };
	pathTracingUniforms.tAlbedoTextures = { value: uniqueMaterialTextures };
	pathTracingUniforms.uSkyLightIntensity = { value: skyLightIntensity };
	pathTracingUniforms.uSunLightIntensity = { value: sunLightIntensity };
	pathTracingUniforms.uSunColor = { value: new THREE.Color().fromArray(sunColor.map(x => x)) };
	pathTracingUniforms.uSunDirection = { value: new THREE.Vector3() };

	// jumpstart the gui variables so that when the demo starts, all the uniforms are up to date
	hdrExposureChanged = skyLightIntensityChanged = sunAngleChanged =
		sunLightIntensityChanged = sunColorChanged = cameraSettingsChanged = true;

} // end function initSceneData()

THREE.InitCommon.startRendering = function () {
	// this 'jumpstarts' the initial dimensions and parameters for the window and renderer
	onWindowResize();
	renderer.setAnimationLoop(animate)
}

function animate() {

	frameTime = clock.getDelta();

	elapsedTime = clock.getElapsedTime() % 1000;

	// reset flags
	cameraIsMoving = false;

	if (doResetRender) {
		cameraIsMoving = true;
		doResetRender = false;
	}

	// // if GUI has been used, update
	// if (needChangePixelResolution) {
	// 	pixelRatio = pixel_ResolutionController.getValue();
	// 	onWindowResize();
	// 	needChangePixelResolution = false;
	// }

	if (windowIsBeingResized) {
		cameraIsMoving = true;
		windowIsBeingResized = false;
	}

	// // update scene/demo-specific input(if custom), variables and uniforms every animation frame
	updateVariablesAndUniforms();


	// if (increaseFOV)
	// {
	// 	worldCamera.fov++;
	// 	if (worldCamera.fov > 179)
	// 		worldCamera.fov = 179;
	// 	fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
	// 	pathTracingUniforms.uVLen.value = Math.tan(fovScale);
	// 	pathTracingUniforms.uULen.value = pathTracingUniforms.uVLen.value * worldCamera.aspect;

	// 	cameraIsMoving = true;
	// 	increaseFOV = false;
	// }
	// if (decreaseFOV)
	// {
	// 	worldCamera.fov--;
	// 	if (worldCamera.fov < 1)
	// 		worldCamera.fov = 1;
	// 	fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
	// 	pathTracingUniforms.uVLen.value = Math.tan(fovScale);
	// 	pathTracingUniforms.uULen.value = pathTracingUniforms.uVLen.value * worldCamera.aspect;

	// 	cameraIsMoving = true;
	// 	decreaseFOV = false;
	// }

	// if (increaseFocusDist)
	// {
	// 	focusDistance += 1;
	// 	pathTracingUniforms.uFocusDistance.value = focusDistance;
	// 	cameraIsMoving = true;
	// 	increaseFocusDist = false;
	// }
	// if (decreaseFocusDist)
	// {
	// 	focusDistance -= 1;
	// 	if (focusDistance < 1)
	// 		focusDistance = 1;
	// 	pathTracingUniforms.uFocusDistance.value = focusDistance;
	// 	cameraIsMoving = true;
	// 	decreaseFocusDist = false;
	// }

	// if (increaseAperture)
	// {
	// 	apertureSize += (0.1 * apertureChangeSpeed);
	// 	if (apertureSize > 10000.0)
	// 		apertureSize = 10000.0;
	// 	pathTracingUniforms.uApertureSize.value = apertureSize;
	// 	cameraIsMoving = true;
	// 	increaseAperture = false;
	// }
	// if (decreaseAperture)
	// {
	// 	apertureSize -= (0.1 * apertureChangeSpeed);
	// 	if (apertureSize < 0.0)
	// 		apertureSize = 0.0;
	// 	pathTracingUniforms.uApertureSize.value = apertureSize;
	// 	cameraIsMoving = true;
	// 	decreaseAperture = false;
	// }
	// if (allowOrthographicCamera && changeToOrthographicCamera)
	// {
	// 	storedFOV = worldCamera.fov; // save current perspective camera's FOV

	// 	worldCamera.fov = 90; // good default for Ortho camera - lets user see most of the scene
	// 	fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
	// 	pathTracingUniforms.uVLen.value = Math.tan(fovScale);
	// 	pathTracingUniforms.uULen.value = pathTracingUniforms.uVLen.value * worldCamera.aspect;

	// 	pathTracingUniforms.uUseOrthographicCamera.value = true;
	// 	cameraIsMoving = true;
	// 	changeToOrthographicCamera = false;
	// }
	// if (allowOrthographicCamera && changeToPerspectiveCamera)
	// {
	// 	worldCamera.fov = storedFOV; // return to prior perspective camera's FOV
	// 	fovScale = worldCamera.fov * 0.5 * (Math.PI / 180.0);
	// 	pathTracingUniforms.uVLen.value = Math.tan(fovScale);
	// 	pathTracingUniforms.uULen.value = pathTracingUniforms.uVLen.value * worldCamera.aspect;

	// 	pathTracingUniforms.uUseOrthographicCamera.value = false;
	// 	cameraIsMoving = true;
	// 	changeToPerspectiveCamera = false;
	// }

	// now update uniforms that are common to all scenes
	if (!cameraIsMoving) {
		if (sceneIsDynamic)
			sampleCounter = 1.0; // reset for continuous updating of image
		else sampleCounter += 1.0; // for progressive refinement of image

		frameCounter += 1.0;

		cameraRecentlyMoving = false;
	}

	if (cameraIsMoving) {
		frameCounter += 1.0;

		if (!cameraRecentlyMoving) {
			// record current sampleCounter before it gets set to 1.0 below
			pathTracingUniforms.uPreviousSampleCount.value = sampleCounter;
			frameCounter = 1.0;
			cameraRecentlyMoving = true;
		}

		sampleCounter = 1.0;
	}

	pathTracingUniforms.uTime.value = elapsedTime;
	pathTracingUniforms.uCameraIsMoving.value = cameraIsMoving;
	pathTracingUniforms.uSampleCounter.value = sampleCounter;
	pathTracingUniforms.uFrameCounter.value = frameCounter;
	pathTracingUniforms.uRandomVec2.value.set(Math.random(), Math.random());

	// CAMERA
	// cameraControlsObject.updateMatrixWorld(true);
	worldCamera.updateMatrixWorld(true);
	pathTracingUniforms.uCameraMatrix.value.copy(worldCamera.matrixWorld);

	screenOutputUniforms.uSampleCounter.value = sampleCounter;
	// PROGRESSIVE SAMPLE WEIGHT (reduces intensity of each successive animation frame's image)
	screenOutputUniforms.uOneOverSampleCounter.value = 1.0 / sampleCounter;


	// RENDERING in 3 steps

	// STEP 1
	// Perform PathTracing and Render(save) into pathTracingRenderTarget, a full-screen texture.
	// Read previous screenCopyRenderTarget(via texelFetch inside fragment shader) to use as a new starting point to blend with
	renderer.setRenderTarget(pathTracingRenderTarget);
	renderer.render(pathTracingScene, worldCamera);

	// STEP 2
	// Render(copy) the pathTracingScene output(pathTracingRenderTarget above) into screenCopyRenderTarget.
	// This will be used as a new starting point for Step 1 above (essentially creating ping-pong buffers)
	renderer.setRenderTarget(screenCopyRenderTarget);
	renderer.render(screenCopyScene, quadCamera);

	// STEP 3
	// Render full screen quad with generated pathTracingRenderTarget in STEP 1 above.
	// After applying tonemapping and gamma-correction to the image, it will be shown on the screen as the final accumulated output
	renderer.setRenderTarget(null);
	renderer.render(screenOutputScene, quadCamera);

	// stats.update();
	
} // end function animate()

// called automatically from within the animate() function
function updateVariablesAndUniforms() {
	if (hdrExposureChanged) {
		// renderer.toneMappingExposure = hdr_ExposureController.getValue();
		renderer.toneMappingExposure = hdrExposure
		cameraIsMoving = true;
		hdrExposureChanged = false;
	}

	if (skyLightIntensityChanged) {
		// pathTracingUniforms.uSkyLightIntensity.value = skyLight_IntensityController.getValue();
		pathTracingUniforms.uSkyLightIntensity.value = skyLightIntensity
		cameraIsMoving = true;
		skyLightIntensityChanged = false;
	}

	if (sunAngleChanged) {
		// sunAngle = sun_AngleController.getValue();
		sunDirection.set(Math.cos(sunAngle) * 1.2, Math.sin(sunAngle), -Math.cos(sunAngle) * 3.0);
		sunDirection.normalize();
		pathTracingUniforms.uSunDirection.value.copy(sunDirection);
		cameraIsMoving = true;
		sunAngleChanged = false;
	}

	if (sunLightIntensityChanged) {
		// pathTracingUniforms.uSunLightIntensity.value = sunLight_IntensityController.getValue();
		pathTracingUniforms.uSunLightIntensity.value = sunLightIntensity
		cameraIsMoving = true;
		sunLightIntensityChanged = false;
	}

	if (sunColorChanged) {
		// sunColor = sun_ColorController.getValue();
		pathTracingUniforms.uSunColor.value.setRGB(sunColor[0], sunColor[1], sunColor[2]);

		cameraIsMoving = true;
		sunColorChanged = false;
	}

	if (cameraSettingsChanged) {
		worldCamera.position.set(cameraSettings.x, cameraSettings.y, cameraSettings.z)
		worldCamera.setRotationFromEuler(new THREE.Euler(cameraSettings.rot_x, cameraSettings.rot_y, cameraSettings.rot_z))
		cameraSettingsChanged = false;
		resetRender()
	}

	// INFO
// 	cameraInfoElement.innerHTML = "FOV: " + worldCamera.fov + " / Aperture: " + apertureSize.toFixed(2) + " / FocusDistance: " + focusDistance + "<br>" + "Samples: " + sampleCounter;


} // end function updateVariablesAndUniforms()

THREE.InitCommon.stopRendering = function () {
	renderer.setAnimationLoop(null)
}

let doResetRender = false;

function resetRender() {
	doResetRender = true;
}
