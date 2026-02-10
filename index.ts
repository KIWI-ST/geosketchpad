import { vec3 } from "wgpu-matrix";
import { OrbitCameraComponent, Scene } from "./src";
import { PerspectiveCamera } from "@pipegpu/camera";
import { PSEUDOMERCATOR } from "@pipegpu/geography";

(async () => {

    const W = window.innerWidth - 30;
    const H = window.innerHeight - 20;
    const scene: Scene = new Scene({
        width: W,
        height: H,
        canvas: "mapCanvas",
        devicePixelRatio: devicePixelRatio,
    });
    await scene.init();

    // const lng: number = 116.397128;
    // const lat: number = 39.917527;
    // const alt: number = 1000;
    const camera = new PerspectiveCamera(60, W / H, 0.1, 10000000000, false);
    camera.Position = vec3.create(-2178205.929902805, 4388519.719950141, 4071608.1284322627);

    // Ellipsoid
    const ellipsoid = PSEUDOMERCATOR;

    // camera entity
    const cameraEntity = scene.createEntity();
    {
        const cameraComponent: OrbitCameraComponent = new OrbitCameraComponent(camera, ellipsoid);
        cameraComponent.IsMainCamera = true;
        cameraComponent.enable(true);
        scene.addComponent(cameraEntity.UUID, cameraComponent);
    }

    // earth entity
    // const earthEntity = scene.createEntity();
    // {
    //     scene.addComponent(earthEntity.UUID, new EarthComponent());
    // }


    // coordinate: new GeodeticCoordinate(116.3958, 39.828)
    // const earthEntity = scene.createEntity();
})();






// const geometryLayer = new GeometryLayer();
// map.add(geometryLayer);

// const g0 = new Hemisphere(new GeodeticCoordinate(114, 30.5), 1000000);
// geometryLayer.add(g0);



// map.on('frameend', (performance) => {
//     document.getElementById('frameLabel')!.textContent = `帧率:${(+performance).toFixed(2)}`;
// });

// // setTimeout(() => {
// //     map.flyTo(new GeodeticCoordinate(114, 30.5), 10, 1000);
// // }, 1000);