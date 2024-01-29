"use strict";

const { THREE, qx, desk } = window;
const { init, startRendering, stopRendering } = THREE.InitCommon

// const resolutionScale = 0.7
// const pixelRatio = window.devicePixelRatio

window.rayTrace = async function (sourceViewer) {

    // Create window with canvas for the raytracer output
    const THREEContainer = new desk.THREE.Container();
    const tracerQxCanvas = THREEContainer.getCanvas();
    tracerQxCanvas.set({ syncDimension: true, zIndex: 0 });
    const tracerHtmlCanvas = tracerQxCanvas.getContentElement().getCanvas();
    const tracerWindow = new qx.ui.window.Window();
    tracerWindow.set({ layout: new qx.ui.layout.Canvas(), resizable: false });
    tracerWindow.add(tracerQxCanvas);
    tracerWindow.open();
    tracerWindow.center();
    
    const sceneToTrace = sourceViewer.getScene();

    // TODO: adapt for several meshes because load meshes msut be called a single time
    const meshes = []
    sceneToTrace.children.forEach(child => {
        if (child.isMesh) {
            meshes.push(child)
            console.info("Mesh found:", child);
        }
    })
    if (meshes.length > 1) {
        console.error("Loading more than 1 mesh is not implemented yet.")
    }
    
    tracerWindow.addListener("resize", onWindowResize);
    sourceViewer.addListener("resize", onWindowResize);
    
    await init(meshes[0], tracerHtmlCanvas, sourceViewer);

    // const w = qxCanvas.getCanvasWidth(), h = qxCanvas.getCanvasHeight();
    // renderer.setSize(w, h);
    // renderer.setPixelRatio(pixelRatio * resolutionScale);
    // renderer.setClearColor(0xffffff);
    // renderer.setClearAlpha(1)

    startRendering()
    // renderer.setAnimationLoop(animate)

    async function onWindowResize() {
        // await new Promise(res => setTimeout(res, 1000));
        const size = sourceViewer.getCanvas().getInnerSize();
        tracerQxCanvas.set(size);
        // const width = tracerQxCanvas.getCanvasWidth();
        // const height = tracerQxCanvas.getCanvasHeight();
        // renderer.setSize(width, height, false);
    }

    tracerWindow.addListener("close", () => {
        // Stop rendering
        // renderer.setAnimationLoop(null)
        stopRendering()

        // winClosed = true;
        // renderer.setAnimationLoop(null)
        THREEContainer.destroy();
        tracerWindow.destroy();
    });
};
