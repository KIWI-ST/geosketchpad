# geosketchpad

A geospatial toolset for visualization.

### Example ### 
> [GeoSketchpad Globe](https://axmand.github.io/globe/)
<img width="1277" alt="9900d80da0a12819ef76d1e5b7e6e27" src="https://user-images.githubusercontent.com/5127112/147485611-a2b28ad8-18ea-4a92-9322-9232a1d88560.png">

### Build ###

> Install dependencies
```javascript
npm install

```

> CommandLine Utility
```javascript

npm install --global gulp-cli

```

### Code Style ###
>
```typescript

import { GeodeticCoordinate, Globe, TileLayer } from '../src/index';

const map = new Globe({
    width: 1600,
    height: 800,
    zoom: 3,
    canvas: "mapCanvas",
    coordinate: new GeodeticCoordinate(114.2344412, 33.23313241234342)
});


const layer = new TileLayer();
map.add(layer);

```

