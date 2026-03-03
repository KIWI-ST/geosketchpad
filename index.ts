import { vec3d } from "wgpu-matrix";
import { OrbitCameraComponent, Scene } from "./src";
import { PerspectiveCamera } from "@pipegpu/camera";
import { CartoPosition, webMercatorTileSchema, WGS84 } from "@pipegpu/geography";
import { EllipsoidComponent } from "./src/ecs/component/EllipsoidComponent";
import { HardwareDenseMeshFriendlyComponent } from "./src/ecs/component/HardwareDenseMeshFriendlyComponent";

(async () => {

    // const W = window.innerWidth - 30;
    // const H = window.innerHeight - 20;

    const W = 600;
    const H = 600;

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
    const camera = new PerspectiveCamera(60.0, W, H, 0.1, 10000000000.0, false);
    camera.Position = vec3d.create(-2178205.929902805, 4388519.719950141, 4071608.1284322627);

    // camera entity
    const cameraEntity = scene.createEntity();
    {
        const cameraComponent: OrbitCameraComponent = new OrbitCameraComponent(camera);
        cameraComponent.IsMainCamera = true;
        await cameraComponent.enable(true);
        scene.setComponent(cameraEntity, cameraComponent);
    }

    // earth entity
    // earth entity with geoschema indexed source.
    const earthEntity = scene.createEntity();
    {
        // earth component.
        const earthComponent: EllipsoidComponent = new EllipsoidComponent(WGS84, webMercatorTileSchema);
        await earthComponent.enable(true);
        scene.setComponent(earthEntity, earthComponent);

        // hdmf component.
        const hdmfComponent: HardwareDenseMeshFriendlyComponent = new HardwareDenseMeshFriendlyComponent(`http://127.0.0.1/service/DamagedHelmet/`, WGS84, new CartoPosition(116.397128, 39.917527));
        await hdmfComponent.enable(true);
        scene.setComponent(earthEntity, hdmfComponent);
    }
})();