
import { GeodeticCoordinate, GeometryLayer, Globe, Hemisphere, TiandituTileLayer } from '../src/index';

const map = new Globe({
    width: window.innerWidth - 30,
    height: window.innerHeight - 20,
    zoom: 3,
    canvas: "mapCanvas",
    coordinate: new GeodeticCoordinate(116.3958, 39.828)
});


const layer = new TiandituTileLayer();
map.add(layer);


const geometryLayer = new GeometryLayer();
map.add(geometryLayer);

const g0 = new Hemisphere(new GeodeticCoordinate(114, 30.5), 1000000);
geometryLayer.add(g0);



map.on('frameend', (performance) => {
    document.getElementById('frameLabel').textContent = `帧率:${(+performance).toFixed(2)}`;
});

// setTimeout(() => {
//     map.flyTo(new GeodeticCoordinate(114, 30.5), 10, 1000);
// }, 1000);