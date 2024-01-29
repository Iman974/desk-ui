async function loadVtkAsync() {
    const vtkLoader = new THREE.VTKLoader()
    const vtkFilePath = "data/hand_cut_20k.vtk"
    const vtkUrl = desk.FileSystem.getFileURL(vtkFilePath)
    
    return new Promise((resolve) => {
        vtkLoader.load(vtkUrl, resolve);
    })
}

async function start() {
    const viewer = new desk.THREE.Viewer()
    viewer.addGeometry(await loadVtkAsync())

    window.rayTrace(viewer)
}

start()