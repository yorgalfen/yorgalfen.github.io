// biome-ignore lint/style/useSingleVarDeclarator:
let height, latl, latr, longl, longr, slope, route, comms;
let rcalc = [];
let dataInterval;
let frame = [1160, 1215];
let ah = false;
let los = 5;
let hes = 15;
let siz = 200;
let fdr = true;
let rdis = false;
const zeroCostSlope = 5;
const margin = 50;
const centerLat = -85.3974303;
const centerLong = 30.5974913;
const earthLat = -6.6518153;
const vdis = 0.0000028734334692991463;
const hdis = 0.0000028731084995076896;
const earthCart = {
    x: 361000000,
    y: 0,
    z: -42100000,
};
const r = 1737400;
const costFunction = {
    std: slopecost,
    dis: distancecost,
    hil: heightcost,
    // ear: visibilitycost,
}
const estimators = {
    std: costestimator,
    dis: costestimator,
    hil: heightestimator,
    // ear: visibilityestimator,
}

function update_data() {
    const cameraPos = document.querySelector("#camera").object3D.position;
    const c = dataIndexOf(cameraPos.x, cameraPos.z);
    const la = toRad(lat(c[0], c[1]));
    const lo = toRad(long(c[0], c[1]));
    const ra = height[c[0]][c[1]] + r;
    const az = (bearing(lat(c[0], c[1]), long(c[0], c[1]), earthLat, 0) * 180) / Math.PI;
    const pc = spheToCart(la, lo, ra);
    const dpos = { x: earthCart.x - pc.x, y: earthCart.y - pc.y, z: earthCart.z - pc.z };
    const rn = Math.hypot(dpos.x, dpos.y, dpos.z);
    const rz =
        dpos.x * Math.cos(la) * Math.cos(lo) +
        dpos.y * Math.cos(la) * Math.sin(lo) +
        dpos.z * Math.sin(la);
    const ele = (Math.asin(rz / rn) * 180) / Math.PI;
    $("#data").html(
        `Press H for help.<br>Position: ${-1 * lat(c[0], c[1])}&deg; S, ${long(
            c[0],
            c[1],
        )}&deg; E<br>Height: ${height[c[0]][c[1]]} meters<br>Azimuth to Earth: ${az.toFixed(
            2,
        )}&deg;<br>Elevation to Earth: ${ele.toFixed(2)}&deg;<br>Data indices: row ${
            c[0]
        }, column ${c[1]}.`,
    );
}
$(document).keydown(() => {
    const cameraPos = document.querySelector("#camera").object3D.position;
    switch (event.which) {
        case 81: // Q
            if (!ah) {
                cameraPos.y += 0.5;
            }
            break;
        case 69: // E
            if (!ah) {
                cameraPos.y -= 0.5;
            }
            break;
        case 80: {
            // P
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","none");
                $("#color-select").css("display","none");
                $("#teleport-table").css("display","inline");
                $("#prompt-text").html("");
                $("#single-go").attr("onclick",`handleP();`);
                $("#single-go").css("top","72%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
                $(".telinp").val("");
            }
            break;
        }
        case 67: // C
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","none");
                $("#color-select").css("display","inline");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html("Select a new terrain colorization scheme.");
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").attr("onclick",`handleC();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
            }
            break;
        case 88: {
            // X
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html("Input a new rendering size. Must be a whole number, divisible by 2.");
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").attr("onclick",`handleX();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
                $("#single").val("");
            }
            break;
        }
        case 76: // L
            ah = !ah;
            if (ah) {
                alert("Automatic height adjustment set to ON.");
            } else {
                alert("Automatic height adjustment set to OFF.");
            }
            break;
        case 72: // H
            window.open("help.html", "_blank");
            break;
        case 77: {
            // M
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html("Input a new slope, in degrees, below which slopes will be part of the gradient.");
                $("#prompt-text").css("font-size","1.4em");
                $("#single-go").attr("onclick",`handleM();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
                $("#single").val("");
            }
            break;
        }
        case 78: {
            // N
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html("Input a new slope, in degrees, above which slopes will be part of the gradient.");
                $("#prompt-text").css("font-size","1.4em");
                $("#single-go").attr("onclick",`handleN();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
                $("#single").val("");
            }
            break;
        }
        case 86: {
            // V
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html("Input a new field of view, in degrees, for the camera. Default is 80.");
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").attr("onclick",`handleV();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
                $("#single").val("");
            }
            break;
        }
        case 82: {
            // R
            if ($("#route-box").css("display")=="none"){
                $("#route-box").css("display","block");
                $("#prompt").css("display","none");
                if(fdr){
                    routeReset();
                    fdr = false;
                }
            }else{
                $("#route-box").css("display","none");
                $(".rinp").val("");
                $("#progress").empty();
            }
            break;
        }
    }
});
function toRad(x) {
    return (x * Math.PI) / 180;
}
function lat(su, ind) {
    if (ind >= 1600) {
        return latr[su][ind - 1600];
    } else {
        return latl[su][ind];
    }
}
function long(su, ind) {
    if (ind >= 1600) {
        return longr[su][ind - 1600];
    } else {
        return longl[su][ind];
    }
}
function gcdis(la1, lo1, la2, lo2) {
    const dlat = toRad(la2 - la1);
    const dlon = toRad(lo2 - lo1);
    const lr1 = toRad(la1);
    const lr2 = toRad(la2);
    const a =
        Math.sin(dlat / 2) * Math.sin(dlat / 2) +
        Math.sin(dlon / 2) * Math.sin(dlon / 2) * Math.cos(lr1) * Math.cos(lr2);
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function gcdisu(la1, lo1, la2, lo2) {
    const dlat = toRad(la2 - la1);
    const dlon = toRad(lo2 - lo1);
    const lr1 = toRad(la1);
    const lr2 = toRad(la2);
    const a =
        Math.sin(dlat / 2) * Math.sin(dlat / 2) +
        Math.sin(dlon / 2) * Math.sin(dlon / 2) * Math.cos(lr1) * Math.cos(lr2);
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function bearing(startLat, startLng, destLat, destLng) {
    const startLat2 = toRad(startLat);
    const startLng2 = toRad(startLng);
    const destLat2 = toRad(destLat);
    const destLng2 = toRad(destLng);
    const y = Math.sin(destLng2 - startLng2) * Math.cos(destLat2);
    const x =
        Math.cos(startLat2) * Math.sin(destLat2) -
        Math.sin(startLat2) * Math.cos(destLat2) * Math.cos(destLng2 - startLng2);
    const brng = Math.atan2(y, x);
    return brng;
}
function spheToCart(la, lo, ra) {
    return {
        x: ra * Math.cos(la) * Math.cos(lo),
        y: ra * Math.cos(la) * Math.sin(lo),
        z: ra * Math.sin(la),
    };
}
function coord(la, lo, he) {
    const b = bearing(centerLat, centerLong, la, lo);
    const g = gcdis(centerLat, centerLong, la, lo);
    const sgr = Math.sin(g / r);
    const x = (r + he) * sgr * Math.sin(b);
    const y = he * Math.cos(g / r) - 2 * r * Math.sin(g / (2 * r)) ** 2;
    const z = (r + he) * sgr * Math.cos(b);
    return [x, y, z];
}

// Usually, z would be subList and x would be index,
// but are named here for consistency with its caller TerrainGeometry
function rectCoord(z, x) {
    const a = coord(lat(z, x), long(z, x), height[z][x]);
    const c = coord(lat(z - 1, x), long(z - 1, x), height[z - 1][x]);
    const b = coord(lat(z - 1, x + 1), long(z - 1, x + 1), height[z - 1][x + 1]);
    const d = coord(lat(z, x + 1), long(z, x + 1), height[z][x + 1]);
    return [...a, ...b, ...c, ...d];
}

// Map slope of points in frame to a color between green and red,
// where a slope of 0 is #00ff00 and 25.5 is #ff0000
function colorizeSlope(colors) {
    const sub_off = frame[0] - siz / 2;
    const ind_off = frame[1] - siz / 2;

    const color = new THREE.Color();
    const red = new THREE.Color(0xff0000);
    const green = new THREE.Color(0x00ff00);
    for (let sub = 0; sub < siz; sub++) {
        for (let ind = 0; ind < siz; ind++) {
            const at = sub * siz * 18 + ind * 18;

            // Color slopes <= los completely green
            // and slopes >= hes completely red
            const intensity = Math.max(
                Math.min((slope[sub + sub_off][ind + ind_off] - los) / (hes - los), 1.0),
                0.0,
            );
            // Interpolate between green and red,
            // where an intensity closer to 1 is more red
            color.copy(green);
            color.lerp(red, intensity);
            for (let i = 0; i < 18; i += 3) {
                colors[at + i + 0] = color.r;
                colors[at + i + 1] = color.g;
                colors[at + i + 2] = color.b;
            }
        }
    }
}

// Returns the [subList, index] within the latitude and longitude
// corresponding to the A-Frame coordinates camx and camz.
// camx and camz must be coordinates on the mesh
// perf: this function is the slowest part of the program,
// try to avoid calls here when possible
function dataIndexOf(camx, camz) {
    const sub_off = frame[0] - siz / 2;
    const ind_off = frame[1] - siz / 2;

    for (let sub = 0; sub < siz; sub++) {
        for (let ind = 0; ind < siz; ind++) {
            const at = sub * siz * 18 + ind * 18;

            // get four corners of rectangle
            // depends on order in TerrainGeometry's triangle_spec
            const a = geo.vertices.slice(at + 0, at + 3);
            const b = geo.vertices.slice(at + 3, at + 6);
            const c = geo.vertices.slice(at + 6, at + 9);
            const d = geo.vertices.slice(at + 15, at + 18);

            const minz = Math.min(a[2], b[2], c[2], d[2]);
            const minx = Math.min(a[0], b[0], c[0], d[0]);
            const maxz = Math.max(a[2], b[2], c[2], d[2]);
            const maxx = Math.max(a[0], b[0], c[0], d[0]);

            if (camx >= minx && camx <= maxx && camz >= minz && camz <= maxz) {
                return [sub + sub_off, ind + ind_off];
            }
        }
    }
    // Off the mesh, returning a known good value
    return frame;
}

class JSONAssetType {
    #tag;

    constructor() {
        this.type = "asset";
        // These assignments look unnecessary,
        // but are required to make A-Frame recognize the class methods.
        this.parse = this.parse;
        this.stringify = this.stringify;
    }
    parse(value) {
        this.#tag = value;
        // Remove initial # character
        const el = document.getElementById(value.substr(1));
        return JSON.parse(el.data);
    }
    stringify() {
        return this.#tag;
    }
}

class TerrainGeometry {
    constructor() {
        this.geometry = new THREE.BufferGeometry();
        this.resize();

        this.colorizer = colorizeSlope;

        // Properties from HTML attributes
        this.schema = {
            latl: new JSONAssetType(),
            latr: new JSONAssetType(),
            longl: new JSONAssetType(),
            longr: new JSONAssetType(),
            height: new JSONAssetType(),
            slope: new JSONAssetType(),
            route: new JSONAssetType(),
            comms: new JSONAssetType(),
        };
        // Same reason for usually unnecessary assignment
        this.init = this.init;
        this.redraw = this.redraw;
        this.resize = this.resize;
    }
    resize() {
        this.vertices = new Float32Array(3 * 6 * siz * siz);
        this.verticesAttr = new THREE.BufferAttribute(this.vertices, 3);
        this.verticesAttr.setUsage(THREE.DynamicDrawUsage);
        this.normals = new Float32Array(this.vertices.length);
        this.normalAttr = new THREE.BufferAttribute(this.normals, 3);
        this.normalAttr.setUsage(THREE.DynamicDrawUsage);
        this.uvs = new Float32Array(2 * 6 * siz * siz);
        this.uvAttr = new THREE.BufferAttribute(this.uvs, 2);
        this.uvAttr.setUsage(THREE.DynamicDrawUsage);
        this.color = new Float32Array(this.vertices.length);
        this.colorAttr = new THREE.BufferAttribute(this.color, 3);
        this.colorAttr.setUsage(THREE.DynamicDrawUsage);
        this.indices = Array(6 * siz * siz);

        this.geometry.setAttribute("position", this.verticesAttr);
        this.geometry.setAttribute("normal", this.normalAttr);
        this.geometry.setAttribute("uv", this.uvAttr);
        this.geometry.setAttribute("color", this.colorAttr);
    }
    init(data) {
        const start = new Date();

        latl = data.latl;
        latr = data.latr;
        longl = data.longl;
        longr = data.longr;
        height = data.height;
        slope = data.slope;
        route = data.route;
        comms = data.comms;

        this.redraw();

        // Ready to start drawing HUD
        dataInterval = setInterval(update_data, 2000);

        const time = new Date() - start;
        console.log(`Spent ${time}ms in TerrainGeometry.init()`);
    }
    redraw() {
        // perf: kept as local variables to avoid slow object accesses
        const vertices = this.vertices;
        const normals = this.normals;
        const indices = this.indices;
        const color = this.color;

        const triangle_spec = [0, 1, 2, 0, 1, 3];
        // Texture coordinates in 2 bits,
        // where the low bit is U (texture X) and the high bit is V (texture Y)
        const uv_spec = [2, 1, 0, 2, 1, 3];

        const pA = new THREE.Vector3();
        const pB = new THREE.Vector3();
        const pC = new THREE.Vector3();
        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();

        // Normally, z would be called subList and x would be index,
        // however, I use z and x instead to avoid confusing index
        // with the three.js indices array
        // fixme: inverted mesh
        const z_off = frame[0] - siz / 2;
        const x_off = frame[1] - siz / 2;
        for (let z = 0; z < siz; z++) {
            for (let x = 0; x < siz; x++) {
                const at = z * siz * 18 + x * 18;

                const rect = rectCoord(z + z_off, x + x_off);
                const uvAt = z * siz * 12 + x * 12;
                for (let i = 0; i < 6; i++) {
                    for (let j = 0; j < 3; j++) {
                        vertices[at + i * 3 + j] = rect[3 * triangle_spec[i] + j];
                    }
                    this.uvs[uvAt + 2 * i + 0] = (uv_spec[i] & 0x1) >> 0;
                    this.uvs[uvAt + 2 * i + 1] = (uv_spec[i] & 0x2) >> 1;
                }

                // Calculate flat face normals for:

                // Triangle 1
                pA.set(rect[0], rect[1], rect[2]);
                pB.set(rect[3], rect[4], rect[5]);
                pC.set(rect[6], rect[7], rect[8]);

                cb.subVectors(pC, pB);
                ab.subVectors(pA, pB);
                cb.cross(ab);
                cb.normalize();
                for (let i = 0; i < 9; i += 3) {
                    normals[at + i + 0] = cb.x;
                    normals[at + i + 1] = cb.y;
                    normals[at + i + 2] = cb.z;
                }

                // Triangle 2
                pC.set(rect[9], rect[10], rect[11]);

                cb.subVectors(pC, pB);
                ab.subVectors(pA, pB);
                cb.cross(ab);
                cb.normalize();
                for (let i = 9; i < 18; i += 3) {
                    normals[at + i + 0] = cb.x;
                    normals[at + i + 1] = cb.y;
                    normals[at + i + 2] = cb.z;
                }

                // Calculate indices
                const indexStart = z * siz * 6 + x * 6;
                const indexAt = z * siz * 6 + x * 6;
                for (let i = 0; i < 6; i++) {
                    indices[indexAt + i] = indexStart + i;
                }
            }
        }
        this.colorizer(color);
        // Always apply route and comms coloring,
        // which overrides anything set by the colorizer
        const routeColor = new THREE.Color(0x0000ff);
        const commsColor = new THREE.Color(0x00ffff);
        for (const pt of route) {
            let [z, x] = [pt[0],pt[1]];
            z -= z_off;
            x -= x_off;
            if (0 <= z && z < siz && 0 <= x && x < siz) {
                const at = z * siz * 18 + x * 18;
                for (let i = 0; i < 18; i += 3) {
                    color[at + i + 0] = routeColor.r;
                    color[at + i + 1] = routeColor.g;
                    color[at + i + 2] = routeColor.b;
                }
            }
        }
        for (const pt of comms) {
            let [z, x] = [pt[0],pt[1]];
            z -= z_off;
            x -= x_off;
            if (0 <= z && z < siz && 0 <= x && x < siz) {
                const at = z * siz * 18 + x * 18;
                for (let i = 0; i < 18; i += 3) {
                    color[at + i + 0] = commsColor.r;
                    color[at + i + 1] = commsColor.g;
                    color[at + i + 2] = commsColor.b;
                }
            }
        }

        this.verticesAttr.needsUpdate = true;
        this.normalAttr.needsUpdate = true;
        this.uvAttr.needsUpdate = true;
        this.colorAttr.needsUpdate = true;

        this.geometry.setIndex(indices);
        this.geometry.computeBoundingSphere();
    }
}

function setFrame(sub, ind) {
    frame[0] = Math.min(Math.max(sub, siz / 2 + 1), 3200 - siz / 2 - 1);
    frame[1] = Math.min(Math.max(ind, siz / 2 + 1), 3200 - siz / 2 - 1);
}

function handleX(){
    const ne = $("#single").val();
    if (ne) {
        siz = parseInt(ne);
        // Make sure that the new size doesn't cause the mesh to access out of
        // bounds indices
        setFrame(...frame);
        geo.resize();
        geo.redraw();
    }
    $("#prompt").css("display","none");
    $("#single").val("");
}
function handleC(){
    // nothing yet
}
function handleV(){
    const fov = $("#single").val();
    if(fov){
        $("#camera").attr("camera", `far: 1000000000; fov: ${fov}`);
    }
    $("#prompt").css("display","none");
    $("#single").val("");
}
function handleM(){
    const sl = $("#single").val();
    if(sl){
        hes = parseInt(sl);
        geo.redraw();
    }
    $("#prompt").css("display","none");
    $("#single").val("");
}
function handleN(){
    const sl = $("#single").val();
    if(sl){
        los = parseInt(sl);
        geo.redraw();
    }
    $("#prompt").css("display","none");
    $("#single").val("");
}
function handleP(){
    const cameraPos = document.querySelector("#camera").object3D.position;
    const pu1 = parseFloat($("#slla").val());
    const pu2 = parseFloat($("#inlo").val());
    ah = false;
    clearInterval(dataInterval);
    let newPlace = [];
    if (pu1<0) {
        newPlace = fromLatLong(pu1,pu2);
    } else {
        newPlace = [Math.floor(pu1),Math.floor(pu2)];
    }
    if((!newPlace)||newPlace[0]>3199||newPlace[1]<0||newPlace[1]>3199||isNaN(newPlace[0])||isNaN(newPlace[1])){
        $("#invinp").css("display","inline");
        return false;
    }
    setFrame(...newPlace);
    const newPosition = coord(
        lat(newPlace[0], newPlace[1]),
        long(newPlace[0], newPlace[1]),
        height[newPlace[0]][newPlace[1]] + 1.6,
    );
    cameraPos.x = newPosition[0];
    cameraPos.y = newPosition[1];
    cameraPos.z = newPosition[2];
    geo.redraw();
    update_data();
    // Re-set intervals for redraw and data
    dataInterval = setInterval(update_data, 2000);
    $("#prompt").css("display","none");
    $(".telinp").val("");
}
function getClick(event){
    if(!rdis){
        const dex = Math.round((event.offsetX/$("#draw").width())*3200);
        const sbl = Math.round((event.offsetY/$("#draw").height())*3200);
        $("#sublist").val(sbl);
        $("#index").val(dex);
    }
}
function slopecost(sl1,in1,sl2,in2,lim){
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if (slo >= lim || slp >= lim) {
        return Infinity;
    }
    const x = Math.max(slo, slp);
    const five_lim = zeroCostSlope - lim;
    const m = -1 / (five_lim * five_lim * five_lim);
    const x_lim = x - lim;
    const estim = costestimator(sl1, in1, sl2, in2);
    return Math.max(estim * (2 - m * x_lim * x_lim * x_lim), estim);
}
function distancecost(sl1,in1,sl2,in2,lim){
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if(slo>=lim || slp>=lim){
        return Infinity;
    }
    return costestimator(sl1,in1,sl2,in2);
}
function heightestimator(sl1,in1,sl2,in2){
    return Math.max(height[sl2][in2]-height[sl1][in1],0);
}
function heightcost(sl1,in1,sl2,in2,lim){
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if(slo>=lim || slp>=lim){
        return Infinity;
    }
    return heightestimator(sl1,in1,sl2,in2);
}
function costestimator(sl1,in1,sl2,in2){
    const cs = coord(lat(sl1,in1),long(sl1,in1),height[sl1][in1]);
    const cd = coord(lat(sl2,in2),long(sl2,in2),height[sl2][in2]);
    // return Math.max(Math.abs(cd[0]-cs[0]),Math.abs(cd[1]-cs[1]),Math.abs(cd[2]-cs[2]));
    return Math.hypot(cs[0]-cd[0],cs[1]-cd[1],cs[2]-cd[2]);
}
function routeReset(){
    const canvas = document.getElementById("draw");
    const ctx = canvas.getContext("2d");
    const map = document.getElementById("map");
    ctx.drawImage(map,0,0,3200,3200);
    route = [];
    geo.redraw();
    rdis = false;
    $("#route-clear").css("display","none");
}
function AStar(bsl,bind,esl,eind,lim,cost,est){
    let star = new Date();
    let it = 0;
    const spoi = makePoint(bsl,bind);
    let openSet = [spoi];
    const cameFrom = new Int32Array(makePoint(3200,3200));
    cameFrom.fill(-1);
    const gScore = new Float32Array(makePoint(3200,3200));
    gScore.fill(Infinity);
    gScore[spoi] = 0;
    const fScore = new Float32Array(makePoint(3200,3200));
    fScore.fill(Infinity);
    fScore[spoi] = est(bsl,bind,esl,eind);
    while (openSet.length>0){
        let current = Infinity;
        let min = Infinity;
        for(const j of openSet){
            if (fScore[j]<min){
                current = j;
                min = fScore[current];
            }
        }
        if(it%500000 === 0){
            console.log(`Iteration: ${it}, time: ${new Date() - star}ms, current: ${extractPoint(current)}, openSet is ${openSet.length} long.`);
        }
        if (it === 10240000) {
            console.log(`Broken after ${new Date() - star}ms, openSet is ${openSet.length} long. current is ${extractPoint(current)}`);
            return false;
        }
        if (current === makePoint(esl, eind)) {
            console.log(`Reached destination after ${new Date() - star} ms and ${it} iterations.`);
            return reconstruct_path(cameFrom,current);
        }
        const inde = openSet.indexOf(current);
        openSet.splice(inde,1);
        const sl = getSubList(current);
        const de = getIndex(current);
        const neighbors = [];
        if(sl<3199){
            neighbors.push(makePoint(sl+1,de));
            if(de<3199){
                neighbors.push(makePoint(sl+1,de+1));
            }
            if (de>0){
                neighbors.push(makePoint(sl+1,de-1));
            }
        }
        if(sl>0){
            neighbors.push(makePoint(sl-1,de));
            if(de<3199){
                neighbors.push(makePoint(sl-1,de+1));
            }
            if (de>0){
                neighbors.push(makePoint(sl-1,de-1));
            }
        }
        if(de<3199){
            neighbors.push(makePoint(sl,de+1));
        }
        if(de>0){
            neighbors.push(makePoint(sl,de-1));
        }
        for(let i = 0; i<neighbors.length; i++){
            const tentative_gScore = gScore[current] + cost(sl,de,getSubList(neighbors[i]),getIndex(neighbors[i]),lim);
            if (tentative_gScore<gScore[neighbors[i]]){
                cameFrom[neighbors[i]] = current;
                gScore[neighbors[i]] = tentative_gScore;
                fScore[neighbors[i]] = tentative_gScore + est(sl,de,esl,eind);
                if(!openSet.includes(neighbors[i])){
                    openSet.push(neighbors[i]);
                }
            }
        }
        it++;
    }
    console.log("About to end due to openSet being empty.");
    return false;
}
function reconstruct_path(cameFrom,current){
    let totalPath = [current];
    while (cameFrom[current]!==-1){
        current = cameFrom[current];
        totalPath.unshift(current);
    }
    return totalPath;
}
function makePoint(subList,index){
    return subList << 12 | index;
}
function getSubList(point){
    return point >> 12;
}
function getIndex(point){
    return point & 0xfff;
}
function extractPoint(point){
    return [getSubList(point),getIndex(point)];
}
function totalRouteHillClimb(rout) {
    let total = 0;
    for (let i = 0; i < rout.length-1; i++) {
        const h1 = height[rout[i][0]][rout[i][1]];
        const h2 = height[rout[i+1][0]][rout[i+1][1]];
        if (h2 > h1) {
            total += h2 - h1;
        }
    }
    return total;
}
function wayfind(){
    $("#route-clear").css("display","none");
    $("#progress").css("display","inline");
    const opt = $("#opt-drop").val();
    const canvas = document.getElementById("draw");
    const ctx = canvas.getContext("2d");
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const map = document.getElementById("map");
    $("#progress").html("Finding route...");
    const desl = parseInt($("#sublist").val());
    const dein = parseInt($("#index").val());
    const ms = parseFloat($("#slinp").val());
    rcalc = [];
    const indic = dataIndexOf(
        document.querySelector("#camera").object3D.position.x,
        document.querySelector("#camera").object3D.position.z,
    );
    if(slope[desl][dein]>=ms){
        $("#progress").html("Route failed!");
        return false;
    }
    const nrt = AStar(indic[0],indic[1],desl,dein,ms,costFunction[opt],estimators[opt]);
    if(!nrt){
        $("#progress").html("Route failed!");
        return false;
    }
    for(const c of nrt){
        rcalc.push(extractPoint(c));
    }
    $("#route-clear").css("display","inline");
    $("#progress").css("display","none");
    let misl = 3201;
    for(let i = 0; i<rcalc.length; i++){
        if(rcalc[i][0]<misl){
            misl = rcalc[i][0];
        }
    }
    misl-=margin;
    let mind = 3200;
    for(let i = 0; i<rcalc.length; i++){
        if(rcalc[i][1]<mind){
            mind = rcalc[i][1];
        }
    }
    mind-=margin;
    let masl = -1;
    for(let i = 0; i<rcalc.length; i++){
        if(rcalc[i][0]>masl){
            masl = rcalc[i][0];
        }
    }
    masl+=margin;
    let mand = -1;
    for(let i = 0; i<rcalc.length; i++){
        if(rcalc[i][1]>mand){
            mand = rcalc[i][1];
        }
    }
    mand+=margin;
    if(misl<0){
        misl = 0;
    }
    if(mind<0){
        mind = 0;
    }
    if(masl>3199){
        masl = 3199;
    }
    if(mand>3199){
        mand = 3199;
    }
    const wid = Math.max(mand-mind,masl-misl);
    masl = misl+wid;
    mand = mind+wid;
    ctx.drawImage(map,mind,misl,wid,wid,0,0,3200,3200);
    ctx.fillStyle = "rgb(250,121,7)";
    ctx.fillRect((((indic[1]-mind)/wid)*canvasW)-60,(((indic[0]-misl)/wid)*canvasH)-60,120,120);
    ctx.fillStyle = "rgb(154,93,240)";
    ctx.fillRect((((dein-mind)/wid)*canvasW)-60,(((desl-misl)/wid)*canvasH)-60,120,120);
    ctx.fillStyle = "rgb(19,19,209)";
    for(let i = 0; i<rcalc.length; i++){
        ctx.fillRect((((rcalc[i][1]-mind)/wid)*canvasW)-10,(((rcalc[i][0]-misl)/wid)*canvasH)-10,20,20);
    }
    rdis = true;
}

function applyRoute(){
    route = rcalc;
    geo.redraw();
}

const geo = new TerrainGeometry();
AFRAME.registerGeometry("terrain", geo);

// Adjust height (if set) and check if moving the frame is necessary
AFRAME.registerComponent("frame-adjust", {
    tick: function () {
        // const start = new Date();
        const cameraPos = this.el.object3D.position;
        if (this.cameraPos?.equals(cameraPos)) {
            // position didn't change
            return;
        }
        this.cameraPos = cameraPos.clone();

        // If the camera position exceeds one-fourth the radius from the center
        // of the geometry's bounding sphere,
        // re-center the frame at the camera position.
        const view = geo.geometry.boundingSphere;
        if (view.distanceToPoint(cameraPos) >= -3 * view.radius / 4) {
            setFrame(...dataIndexOf(cameraPos.x, cameraPos.z));
            geo.redraw();
        }

        // Shouldn't matter, but automatic height adjustment occurs after recentering
        if (ah) {
            const d = dataIndexOf(cameraPos.x, cameraPos.z);
            cameraPos.y = height[d[0]][d[1]] + 1.6;
        }
        // const time = new Date() - start;
        // console.log(`Spent ${time}ms in tick()`);
    },
});
function fromLatLong(la, lo){
    const dat = new Date();
    for(let sl = 0; sl<3199; sl++){
        for(let de = 0; de<3199; de++){
            const minla = Math.min(lat(sl,de), lat(sl+1,de), lat(sl+1,de+1), lat(sl,de+1));
            const minlo = Math.min(long(sl,de), long(sl+1,de), long(sl+1,de+1), long(sl,de+1));
            const maxla = Math.max(lat(sl,de), lat(sl+1,de), lat(sl+1,de+1), lat(sl,de+1));
            const maxlo = Math.max(long(sl,de), long(sl+1,de), long(sl+1,de+1), long(sl,de+1));
            if (la >= minla && la <= maxla && lo >= minlo && lo <= maxlo) {
                console.log(`Spent ${new Date() - dat}ms in fromLatLong()`);
                return [sl,de];
            }
        }
    }
    console.log(`Spent ${new Date() - dat}ms in fromLatLong()`);
    return false;
}