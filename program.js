// biome-ignore lint/style/useSingleVarDeclarator:
let height, latl, latr, longl, longr, slope, route, comms, dest, visib, texts, directions;
let rcalc = [];
let rcalc20 = [];
let commcalc = [];
let commcalc20 = [];
let dataInterval;
let lang = "en";
const frame = [1160, 1215];
let ah = false;
let ahTimeout;
let los = 5;
let hes = 15;
let siz = 200;
let ahoff = 1.6;
let fdr = true;
let rdis = false;
let qu = false;
const mult = 4.375e-7; // the multiplier for distance to get it to always be less than or equal to 0.01, the step in height
const zeroCostSlope = 2.5;
const margin = 50;
const centerLat = -85.3974303;
const centerLong = 30.5974913;
const earthLat = -6.6518153;
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
    ear: visibilitycost,
}
const estimators = {
    std: costestimator,
    dis: costestimator,
    hil: heightestimator,
    ear: costestimator,
}   
const compOffset = 0.5346887200211221;
console.log(`jQuery version: ${$.fn.jquery.split(" ")[0]}`);

function update_data() {
    let di;
    const camera = $("#camera")[0];
    const cameraPos = camera.object3D.position;
    let rot = camera.object3D.rotation.y;
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
    const canvas = $("#minimap")[0];
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,3200,3200);
    ctx.save();
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(c[1]-(siz/2),c[0]-(siz/2),siz,8);
    ctx.fillRect(c[1]-(siz/2),c[0]-(siz/2),8,siz);
    ctx.fillRect(c[1]+(siz/2),c[0]-(siz/2),8,siz+8);
    ctx.fillRect(c[1]-(siz/2),c[0]+(siz/2),siz,8);
    ctx.translate(c[1],c[0]);
    ctx.rotate(Math.PI+compOffset-rot);
    const arr = $("#arrow")[0];
    ctx.drawImage(arr,-100,-163);
    ctx.restore();
    rot = Math.floor(((rot+3*Math.PI)%(2*Math.PI))/(Math.PI/4));
    if(directions[rot]){
        di = directions[rot];
    }else{
        di = rot;
    }
    $("#data").html(
        `${texts[lang].da}${-lat(c[0], c[1])}&deg; S, ${long(
            c[0],
            c[1],
        )}${texts[lang].db}${height[c[0]][c[1]]}${texts[lang].dc}${az.toFixed(
            2,
        )}${texts[lang].dd}${ele.toFixed(2)}${texts[lang].de}${
            c[0]
        }${texts[lang].df}${c[1]}${texts[lang].dg}${di}\u2003\u2003${texts[lang].dh}${vis(c[0],c[1])&!qu?texts[lang].no:texts[lang].yes}`,
    );
}
$(document).keydown(() => {
    const cameraPos = document.querySelector("#camera").object3D.position;
    switch (event.which) {
        case 81: // Q
            if (ah) {
                ahoff+=0.5;
            }else{
                cameraPos.y += 0.5;
            }
            break;
        case 69: // E
            if (ah) {
                ahoff-=0.5;
            }else{
                cameraPos.y -= 0.5;
            }
            break;
        case 80: {
            clearTimeout(ahTimeout);
            // P
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","none");
                $("#color-select").css("display","none");
                $("#lang-select").css("display","none");
                $("#teleport-table").css("display","inline");
                $("#prompt-text").html("");
                $("#single-go").css("display","inline");
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
        clearTimeout(ahTimeout);
            if($("#prompt").css("display")==="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","none");
                $("#color-select").css("display","inline");
                $("#lang-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html(texts[lang].c);
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").css("display","inline");
                $("#single-go").attr("onclick",`handleC();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
            }
            break;
        case 88: {
            // X
            clearTimeout(ahTimeout);
            if($("#prompt").css("display")==="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#lang-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html(texts[lang].x);
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").css("display","inline");
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
            $("#route-box").css("display","none");
            $("#prompt").css("display","inline");
            $(".nonah").css("display","none");
            $("#prompt-text").css("font-size","1.7em");
            $("#prompt-text").html(texts[lang][`l${ah}`]);
            ahTimeout = setTimeout(function() {
                $("#prompt").css("display","none");
            },2500);
            break;
        case 72: // H
            window.open(`help-${lang}.html`, "_blank");
            break;
        case 77: {
            // M
            clearTimeout(ahTimeout);
            if($("#prompt").css("display")==="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#lang-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html(texts[lang].m);
                $("#prompt-text").css("font-size","1.4em");
                $("#single-go").css("display","inline");
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
            clearTimeout(ahTimeout);
            if($("#prompt").css("display")==="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#lang-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html(texts[lang].n);
                $("#prompt-text").css("font-size","1.4em");
                $("#single-go").css("display","inline");
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
            clearTimeout(ahTimeout);
            if($("#prompt").css("display")==="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#lang-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html(texts[lang].v);
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").css("display","inline");
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
            if ($("#route-box").css("display")==="none"){
                $("#route-box").css("display","block");
                $("#prompt").css("display","none");
                $("#route-data").html(texts[lang].rd);
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
        case 71: {
            // G
            if($("#prompt").css("display")==="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","inline");
                $("#color-select").css("display","none");
                $("#lang-select").css("display","none");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html(texts[lang].g);
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").css("display","inline");
                $("#single-go").attr("onclick",`handleG();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
                $("#single").val("");
            }
            break;
        }
        case 85: {
            // U
            qu = !qu;
            $("#route-box").css("display","none");
            $("#prompt").css("display","inline");
            $(".nonah").css("display","none");
            $("#prompt-text").css("font-size","1.7em");
            $("#prompt-text").html(texts[lang][`u${qu}`]);
            ahTimeout = setTimeout(function() {
                $("#prompt").css("display","none");
            },2500);
            break;
        }
        case 89: {
            // Y
            clearTimeout(ahTimeout);
            if($("#prompt").css("display")==="none"){
                $("#prompt").css("display","inline");
                $("#single").css("display","none");
                $("#lang-select").css("display","inline");
                $("#teleport-table").css("display","none");
                $("#prompt-text").html(texts[lang].y);
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").css("display","inline");
                $("#single-go").attr("onclick",`handleY();`);
                $("#single-go").css("top","65%");
                $("#invinp").css("display","none");
            }else{
                $("#prompt").css("display","none");
            }
            break;
        }
}});
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
function vis(su, ind) {
    return (visib[su][Math.floor(ind / 32)] >> (ind % 32)) & 1;
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
// N: 0, E: -π/2, W: π/2, S: π or -π. the negative in coord swaps E and W
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
    const b = -bearing(centerLat, centerLong, la, lo);
    const g = gcdisu(centerLat, centerLong, la, lo);
    const sgr = Math.sin(g);
    const x = (r + he) * sgr * Math.sin(b);
    const y = he * Math.cos(g) - 2 * r * Math.sin(g/2) ** 2;
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

// Map a point of sub-list and index to an intensity between 0.0 and 1.0,
// where slopes <= los return 0.0 and slopes >= hes return 1.0.
function colorizeSlope(sub, ind) {
    return Math.max(Math.min((slope[sub][ind] - los) / (hes - los), 1.0), 0.0);
}

// Map a point of sub-list and index to an number between 0.0 and 1.0,
// where 0.0 is the global greatest height and 1.0 is the lowest height.
function colorizeHeight(sub, ind) {
    return (6463.86 - height[sub][ind]) / (6463.86 - 2796.34);
}

// Map a point of sub-list and index to an intensity between 0.0 and 1.0,
// where 0.0 is the global least elevation angle and 1.0 is the greatest angle.
function colorizeElevationAngle(sub, ind) {
    const la = toRad(lat(sub, ind));
    const lo = toRad(long(sub, ind));
    const ra = height[sub][ind] + r;
    const pc = spheToCart(la, lo, ra);
    const dpos = { x: earthCart.x - pc.x, y: earthCart.y - pc.y, z: earthCart.z - pc.z };
    const rn = Math.hypot(dpos.x, dpos.y, dpos.z);
    const rz =
        dpos.x * Math.cos(la) * Math.cos(lo) +
        dpos.y * Math.cos(la) * Math.sin(lo) +
        dpos.z * Math.sin(la);
    const ele = Math.asin(rz / rn);
    // Scale from max values to 0.0 to 1.0
    return (ele - 0.17450426) / (0.18376232 - 0.17450426);
}

// Map a point of sub-list and index to an intensity between 0.0 and 1.0,
// where 0.0 is the global least azimuth angle and 1.0 is the greatest angle.
function colorizeAzimuth(sub, ind) {
    const az = bearing(lat(sub, ind), long(sub, ind), earthLat, 0);
    // Scale from max values to 0.0 to 1.0
    return -(az + 0.4820631) / (0.6416581 - 0.4820631);
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
            visib: new JSONAssetType(),
            texts: new JSONAssetType()
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
        visib = data.visib;
        texts = data.texts;
        dest = route[route.length-1];
        directions = texts.en.d;
        for(let i = 0; i<visib.length; i++){
            visib[i] = new Uint32Array(visib[i]);
        }
        const canvas = document.getElementById("minimap-route");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillRect(route[route.length-1][1]-20,route[route.length-1][0]-20,40,40);
        ctx.fillStyle = "rgb(19,19,209)";
        for(let i = 0; i<route.length; i++){
            ctx.fillRect(route[i][1]-10,route[i][0]-10,20,20);
        }
        ctx.fillStyle = "rgb(0,255,255)";
        for(let i = 0; i<comms.length; i++){
            ctx.fillRect(comms[i][1]-10,comms[i][0]-10,20,20);
        }
        this.redraw();

        // Ready to start drawing HUD
        dataInterval = setInterval(update_data, Math.round((siz**2)/40));
        $("#map-contain").css("display","block");

        const time = new Date() - start;
        console.log(`Spent ${time}ms in TerrainGeometry.init()`);
    }
    redraw() {
        // perf: kept as local variables to avoid slow object accesses
        const vertices = this.vertices;
        const normals = this.normals;
        const indices = this.indices;
        const colors = this.color;

        const triangle_spec = [0, 1, 2, 0, 1, 3];
        // Texture coordinates in 2 bits,
        // where the low bit is U (texture X) and the high bit is V (texture Y)
        const uv_spec = [2, 1, 0, 2, 1, 3];

        const pA = new THREE.Vector3();
        const pB = new THREE.Vector3();
        const pC = new THREE.Vector3();
        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();

        const color = new THREE.Color(0xffffff);
        const red = new THREE.Color(0xff0000);
        const green = new THREE.Color(0x00ff00);

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

                // Run colorizer
                if (this.colorizer != null) {
                    const intensity = this.colorizer(z + z_off, x + x_off);
                    // Interpolate between green and red,
                    // where an intensity closer to 1 is more red
                    color.copy(green);
                    color.lerp(red, intensity);
                }
                for (let i = 0; i < 18; i += 3) {
                    colors[at + i + 0] = color.r;
                    colors[at + i + 1] = color.g;
                    colors[at + i + 2] = color.b;
                }
            }
        }

        // Always apply route and comms coloring,
        // which overrides anything set by the colorizer
        const routeColor = new THREE.Color(0x0000ff);
        const commsColor = new THREE.Color(0x00ffff);
        for (let [z, x] of route) {
            z -= z_off;
            x -= x_off;
            if (0 <= z && z < siz && 0 <= x && x < siz) {
                const at = z * siz * 18 + x * 18;
                for (let i = 0; i < 18; i += 3) {
                    colors[at + i + 0] = routeColor.r;
                    colors[at + i + 1] = routeColor.g;
                    colors[at + i + 2] = routeColor.b;
                }
            }
        }
        for (let [z, x] of comms) {
            z -= z_off;
            x -= x_off;
            if (0 <= z && z < siz && 0 <= x && x < siz) {
                const at = z * siz * 18 + x * 18;
                for (let i = 0; i < 18; i += 3) {
                    colors[at + i + 0] = commsColor.r;
                    colors[at + i + 1] = commsColor.g;
                    colors[at + i + 2] = commsColor.b;
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
        clearInterval(dataInterval);
        dataInterval = setInterval(update_data, Math.round((siz**2)/40));
    }
    $("#prompt").css("display","none");
    $("#single").val("");
}
function handleC(){
    const scheme = $("#color-select").val();
    switch (scheme) {
    case "slo":
        geo.colorizer = colorizeSlope;
        break;
    case "lif":
        geo.colorizer = null;
        break;
    case "hei":
        geo.colorizer = colorizeHeight;
        break;
    case "ele":
        geo.colorizer = colorizeElevationAngle;
        break;
    case "azi":
        geo.colorizer = colorizeAzimuth;
        break;
    }
    geo.redraw();
    $("#prompt").css("display","none");
    $("#single").val("");
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
    let newPlace = [];
    if (pu1<0) {
        newPlace = fromLatLong(pu1,pu2);
    } else {
        newPlace = [Math.floor(pu1),Math.floor(pu2)];
    }
    if((!newPlace)||newPlace[0]>3199||newPlace[1]<0||newPlace[1]>3199||Number.isNaN(newPlace[0])||Number.isNaN(newPlace[1])){
        $("#invinp").css("display","inline");
        return false;
    }
    clearInterval(dataInterval);
    setFrame(...newPlace);
    const newPosition = coord(
        lat(newPlace[0], newPlace[1]),
        long(newPlace[0], newPlace[1]),
        height[newPlace[0]][newPlace[1]] + ahoff,
    );
    cameraPos.x = newPosition[0];
    cameraPos.y = newPosition[1];
    cameraPos.z = newPosition[2];
    geo.redraw();
    update_data();
    // Re-set intervals for redraw and data
    dataInterval = setInterval(update_data, Math.round((siz**2)/40));
    $("#prompt").css("display","none");
    $(".telinp").val("");
}
function handleG(){
    let nint = parseFloat($("#single").val());
    if(!isNaN(nint)){
        if(nint>=100){
            $("#lux").attr("intensity","0.5");
        }else if(nint<=0){
            $("#lux").attr("intensity","0");
        }else{
            $("#lux").attr("intensity",nint*0.005);
        }
    }
    $("#prompt").css("display","none");
    $("#single").val("");
}
function handleY(){
    lang = $("#lang-select").val();
    $("#prompt").css("display","none");
    $(".chy").each(function(){
        $(this).html(texts[lang][this.id]);
    });
    directions = texts[lang].d;
}
function getClick(event){
    if(!rdis){
        const dex = Math.round((event.offsetX/$("#draw").width())*3200);
        const sbl = Math.round((event.offsetY/$("#draw").height())*3200);
        $("#sublist").val(sbl);
        $("#index").val(dex);
    }
}
function minimapClick(event){
    if($("#single-go").attr("onclick")===`handleP();`){
        const dex = Math.round((event.offsetX/$("#minimap").width())*3200);
        const sbl = Math.round((event.offsetY/$("#minimap").height())*3200);
        $("#slla").val(sbl);
        $("#inlo").val(dex);
    }
}
function slopecost(sl1,in1,sl2,in2,lim){
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if (slo >= lim || slp >= lim) {
        return Infinity;
    }
    const scaleInterval = lim - zeroCostSlope;
    const slopos = slp - zeroCostSlope;
    const estim = costestimator(sl1, in1, sl2, in2);
    return Math.max(estim * (1+(slopos/scaleInterval)), estim);
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
    return Math.max(height[sl2][in2]-height[sl1][in1],0)+costestimator(sl1,in1,sl2,in2)*mult;
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
function visibilitycost(sl1,in1,sl2,in2,lim){
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if(slo>=lim || slp>=lim){
        return Infinity;
    }
    const estim = costestimator(sl1,in1,sl2,in2);
    return estim*(9*vis(sl2,in2)+1);
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
        if(it%50000 === 0){
            console.log(`Iteration: ${it}, time: ${new Date() - star}ms, current: ${extractPoint(current)}, openSet is ${openSet.length} long.`);
        }
        if (it === 10240000) {
            console.log(`Broken after ${new Date() - star}ms, openSet is ${openSet.length} long. current is ${extractPoint(current)}`);
            return false;
        }
        if (current === makePoint(esl, eind)) {
            console.log(`Reached destination after ${new Date() - star} ms and ${it} iterations, openSet is ${openSet.length} long.`);
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
function checkpoints(rout){
    const path = [];
    const points = [];
    for(let i = 0; i<rout.length; i++){
        if(vis(rout[i][0],rout[i][1])===0){
            path.push(rout[i]);
        }
    }
    const inte = path.length/11;
    for(let i = 1; i<11; i++){
        points.push(path[Math.round(i*inte)]);
    }
    return points;
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

function routeStatistics(path) {
    let distance = 0;
    let hillClimb = 0;
    let maxSlope = -Infinity;
    let totalSlope = 0;
    let visibility = 0;
    for (let i = 0, len = path.length; i < len; i++) {
        const sub = path[i][0];
        const ind = path[i][1];
        totalSlope += slope[sub][ind];
        visibility += vis(sub, ind);
        if (slope[sub][ind] > maxSlope) {
            maxSlope = slope[sub][ind];
        }
        if (i < len - 1) {
            const nextSub = path[i + 1][0];
            const nextInd = path[i + 1][1];
            const h1 = height[sub][ind];
            const h2 = height[nextSub][nextInd];
            if (h2 > h1) {
                hillClimb += h2 - h1;
            }
            distance += costestimator(sub, ind, nextSub, nextInd);
        }
    }
    return {
        averageSlope: totalSlope / path.length,
        distance: distance,
        hillClimb: hillClimb,
        maxSlope: maxSlope,
        visibility: (1 - visibility / path.length) * 100,
    };
}

function wayfind() {
    $("#route-clear").css("display","none");
    $("#progress").css("display","inline");
    $("#route-20-contain").css("display","none");
    $("#draw").css("transform","translateX(-40%)");
    const opt = $("#opt-drop").val();
    const canvas = $("#draw")[0];
    const ctx = canvas.getContext("2d");
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const map = $("#map")[0];
    $("#progress").html("Finding route...");
    let desl = parseFloat($("#sublist").val());
    let dein = parseFloat($("#index").val());
    let exi = false;
    if (desl !== undefined && dein !== undefined) {
        if (desl < 0) {
            const b = fromLatLong(desl, dein);
            if (b) {
                desl = b[0];
                dein = b[1];
            }
        } else if (!Number.isInteger(desl) || !Number.isInteger(dein)) {
            exi = true;
        }
    }
    const oms = $("#slinp").val();
    let ms = oms === "?" ? "?" : parseFloat(oms);
    // All non-number values compare as false
    if ((!(0 <= desl && desl < 3200 && 0 <= dein && dein < 3200))||slope[desl][dein]>=ms) {
        exi = true;
    }
    if (exi) {
        $("#progress").html(texts[lang].fail);
        return false;
    }

    const cameraPos = $("#camera")[0].object3D.position;
    const indic = dataIndexOf(cameraPos.x, cameraPos.z);

    rcalc = [];
    rcalc20 = undefined;

    let misl = 3200;
    let mind = 3200;
    let masl = -1;
    let mand = -1;
    if (ms === "?") {
        $("#route-applier").html(texts[lang].blue);
        $("#route-20-contain").css("display", "inline");
        $("#route-20-applier").on("click", () => {
            route = rcalc20;
            comms = commcalc20;
            applyRoute();
        });
        $("#draw").css("transform", "translate(-40%,-2%)");
        const r20 = AStar(indic[0], indic[1], desl, dein, 20, costFunction[opt], estimators[opt]);
        if (!r20) {
            $("#progress").html(texts[lang].fail);
            return false;
        }
        rcalc20 = r20.map(extractPoint);
        commcalc20 = checkpoints(rcalc20);
        for (let i = 0; i < rcalc20.length; i++){
            if (rcalc20[i][0] < misl) {
                misl = rcalc20[i][0];
            }
            if (rcalc20[i][1] < mind) {
                mind = rcalc20[i][1];
            }
            if (rcalc20[i][0] > masl) {
                masl = rcalc20[i][0];
            }
            if (rcalc20[i][1] > mand) {
                mand = rcalc20[i][1];
            }
        }
        ms = 15;
    } else {
        $("#route-applier").html(texts[lang]["route-applier"]);
    }
    $("#route-applier").on("click", () => {
        route = rcalc;
        comms = commcalc;
        applyRoute();
    });

    const nrt = AStar(indic[0], indic[1], desl, dein, ms, costFunction[opt], estimators[opt]);
    if (!nrt) {
        $("#progress").html(texts[lang].fail);
        return false;
    }
    rcalc = nrt.map(extractPoint);
    commcalc = checkpoints(rcalc);
    $("#route-clear").css("display", "inline");
    $("#progress").css("display", "none");
    for (let i = 0; i < rcalc.length; i++){
        if (rcalc[i][0] < misl) {
            misl = rcalc[i][0];
        }
        if (rcalc[i][1] < mind) {
            mind = rcalc[i][1];
        }
        if (rcalc[i][0] > masl) {
            masl = rcalc[i][0];
        }
        if (rcalc[i][1] > mand) {
            mand = rcalc[i][1];
        }
    }

    misl = Math.max(misl - margin, 0);
    mind = Math.max(mind - margin, 0);
    masl = Math.min(masl + margin, 3199);
    mand = Math.min(mand + margin, 3199);

    const wid = Math.max(mand - mind, masl - misl);
    masl = misl + wid;
    mand = mind + wid;

    ctx.drawImage(map, mind, misl, wid, wid, 0, 0, 3200, 3200);
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect((((indic[1]-mind)/wid)*canvasW)-60,(((indic[0]-misl)/wid)*canvasH)-60,120,120);
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect((((dein-mind)/wid)*canvasW)-60,(((desl-misl)/wid)*canvasH)-60,120,120);
    ctx.fillStyle = "rgb(19,19,209)";
    for (let i = 0; i < rcalc.length; i++){
        ctx.fillRect((((rcalc[i][1]-mind)/wid)*canvasW)-10,(((rcalc[i][0]-misl)/wid)*canvasH)-10,20,20);
    }
    ctx.fillStyle = "rgb(0,255,255)";
    for(let i = 0; i<commcalc.length; i++){
        ctx.fillRect((((commcalc[i]?.[1]-mind)/wid)*canvasW)-10,(((commcalc[i]?.[0]-misl)/wid)*canvasH)-10,20,20);
    }
    if (rcalc20 !== undefined) {
        ctx.fillStyle = "rgb(46,16,2)";
        for (let i = 0; i < rcalc20.length; i++) {
            ctx.fillRect((((rcalc20[i][1]-mind)/wid)*canvasW)-10,(((rcalc20[i][0]-misl)/wid)*canvasH)-10,20,20);
        }
        ctx.fillStyle = "rgb(0,255,255)";
        for(let i = 0; i<commcalc20.length; i++){
            ctx.fillRect((((commcalc20[i]?.[1]-mind)/wid)*canvasW)-10,(((commcalc20[i]?.[0]-misl)/wid)*canvasH)-10,20,20);
        }
    }
    if(mand>3199){
        ctx.clearRect(canvasW*((3200-mind)/wid),0,canvasW,canvasH);
    }
    if(masl>3199){
        ctx.clearRect(0,canvasH*((3200-misl)/wid),canvasW,canvasH);
    }
    rdis = true;
    const stats = routeStatistics(rcalc);
    const stats20 = rcalc20 === undefined ? undefined : routeStatistics(rcalc20);
    let data = `${texts[lang].re}${stats.distance.toFixed(1)}`;
    if (stats20 !== undefined) {
        data += `/${stats20.distance.toFixed(1)}`;
    }
    data += `${texts[lang].rf}${stats.maxSlope}`;
    if (stats20 !== undefined) {
        data += `/${stats20.maxSlope}`;
    }
    data += "&deg;";
    switch (opt) {
        case "std":
            data += `${texts[lang].rg}${stats.averageSlope.toFixed(1)}`;
            if (stats20 !== undefined) {
                data += `/${stats20.averageSlope.toFixed(1)}`;
            }
            data += "&deg;";
            break;
        case "dis":
            data += `${texts[lang].rg}${stats.averageSlope.toFixed(1)}`;
            if (stats20 !== undefined) {
                data += `/${stats20.averageSlope.toFixed(1)}`;
            }
            data += "&deg;";
            break;
        case "hil":
            data += `${texts[lang].rh}${stats.hillClimb.toFixed(1)}`;
            if (stats20 !== undefined) {
                data += `/${stats20.hillClimb.toFixed(1)}`;
            }
            data += texts[lang].rj;
            break;
        case "ear":
            data += `${texts[lang].ri}${stats.visibility.toFixed(1)}%`;
            if (stats20 !== undefined) {
                data += `/${stats20.visibility.toFixed(1)}%`;
            }
            data += texts[lang].rk;
            break;
    }
    $("#route-data").html(data);
}

function applyRoute() {
    const canvas = document.getElementById("minimap-route");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(route[route.length-1][1]-20,route[route.length-1][0]-20,40,40);
    ctx.fillStyle = "rgb(19,19,209)";
    for(let i = 0; i<route.length; i++){
        ctx.fillRect(route[i][1]-10,route[i][0]-10,20,20);
    }
    ctx.fillStyle = "rgb(0,255,255)";
    for(let i = 0; i<comms.length; i++){
        ctx.fillRect(comms[i][1]-10,comms[i][0]-10,20,20);
    }
    dest = route[route.length-1];
    $(".turris").attr("visible","true");
    $(".turris").attr("towers",Math.random());
    update_flag();
    geo.redraw();
}

function routeReset() {
    $("#route-20-contain").css("display","none");
    $("#route-applier").html(texts[lang]["route-applier"]);
    $("#draw").css("transform","translateX(-40%)");
    const canvas = document.getElementById("draw");
    const ctx = canvas.getContext("2d");
    const map = document.getElementById("map");
    ctx.drawImage(map,0,0,3200,3200);
    const cnv = document.getElementById("minimap-route");
    const ct = cnv.getContext("2d");
    ct.clearRect(0,0,cnv.width,cnv.height);
    route = [];
    comms = [];
    geo.redraw();
    rdis = false;
    $(".turris").attr("visible","false");
    $("#route-data").html(texts[lang].rd);
    $("#route-clear").css("display","none");
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
            const oldFrame = frame.slice();
            setFrame(...dataIndexOf(cameraPos.x, cameraPos.z));
            if (frame[0] !== oldFrame[0] || frame[1] !== oldFrame[1]) {
                geo.redraw();
            }
        }

        // Shouldn't matter, but automatic height adjustment occurs after recentering
        if (ah) {
            const d = dataIndexOf(cameraPos.x, cameraPos.z);
            cameraPos.y = coord(lat(d[0],d[1]),long(d[0],d[1]),height[d[0]][d[1]]+ahoff)[1];
        }
        // const time = new Date() - start;
        // console.log(`Spent ${time}ms in tick()`);
    },
});
AFRAME.registerComponent("flag-comp", {
    init: function () {
        const flagPos = this.el.object3D.position;
        const target = coord(lat(route[route.length-1][0],route[route.length-1][1]),long(route[route.length-1][0],route[route.length-1][1]),height[route[route.length-1][0]][route[route.length-1][1]]+15);
        flagPos.x = target[0];
        flagPos.y = target[1];
        flagPos.z = target[2];
    }
});
AFRAME.registerComponent("towers", {
    update: function () {
        const el = this.el;
        const pos = el.object3D.position;
        const num = parseInt(el.id.split("-")[1]);
        const p = comms[num];
        const nPos = coord(lat(p[0],p[1]),long(p[0],p[1]),height[p[0]][p[1]]);
        pos.x = nPos[0];
        pos.y = nPos[1];
        pos.z = nPos[2];
    }
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
function update_flag(){
    const flag3D = $("#vexillum")[0].object3D;
    const flagPos = flag3D.position;
    const nPos = coord(lat(dest[0],dest[1]),long(dest[0],dest[1]),height[dest[0]][dest[1]]+15);
    flagPos.x = nPos[0];
    flagPos.y = nPos[1];
    flagPos.z = nPos[2];
}
