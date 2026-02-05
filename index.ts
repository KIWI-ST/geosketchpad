import { BaseEntity, CameraComponent, EarthComponent } from '@pipegpu/ecs';
import { Scene } from './src/Scene';
import './src/scene/Scene.Handler';

(async () => {
    const scene: Scene = new Scene({
        width: window.innerWidth - 30,
        height: window.innerHeight - 20,
        canvas: "mapCanvas",
    });

    await scene.init();

    // camera entity
    const cameraEntity = scene.createEntity();
    const cameraComponent: CameraComponent = new CameraComponent();
    scene.addComponent(cameraEntity.UUID, cameraComponent);

    // earth entity
    const earthEntity = scene.createEntity();
    scene.addComponent(earthEntity.UUID, new EarthComponent());

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