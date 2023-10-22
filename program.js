// rome-ignore lint/style/useSingleVarDeclarator:
// rome-ignore lint/style/noVar: needed for window access when parsing JSONs
var height, latl, latr, longl, longr, slope, route, comms;
var rcalc = [];
let ah = false;
let n = 0;
let los = 5;
let hes = 15;
let siz = 64;
const margin = 50;
const mult = 9.5/5; // The slope-based multiplier for great circle distance for the cost estimator
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
// perf: 50-70ms idles, up to 300ms
// Ideal: <16ms
function update_data() {
    const c = indexes(
        document.querySelector("#camera").object3D.position.x,
        document.querySelector("#camera").object3D.position.z,
    );
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
function update_scene() {
    const start = new Date();
    const ex = document.querySelector("#camera").object3D.position.x;
    const ez = document.querySelector("#camera").object3D.position.z;
    const f = indexes(ex, ez);
    n++;
    for (let z = f[0] - siz / 2; z < f[0] + siz / 2; z++) {
        for (let x = f[1] - siz / 2; x <= f[1] + siz / 2; x++) {
            if ($(`#${z}-${x}-top`).length) {
                update(z, x);
            } else {
                tri(z, x);
            }
        }
    }
    $(`.${n - 1}`).remove();
    const time = new Date() - start;
    console.log(`Spent ${time}ms in update_scene`);
}
$(document).keydown(function () {
    switch (event.which) {
        case 81: // Q
            if (!ah) {
                document.querySelector("#camera").object3D.position.y += 0.5;
            }
            break;
        case 69: // E
            if (!ah) {
                document.querySelector("#camera").object3D.position.y -= 0.5;
            }
            break;
        case 80: {
            // P
            const npo = prompt("Go to position? View help page for info.");
            if (npo) {
                ah = false;
                clearInterval(interv);
                clearInterval(interv1);
                if (npo.charAt(0) === "-") {
                    const f = npo.split(" ");
                    const dela = parseFloat(f[0]);
                    const delo = parseFloat(f[1]);
                    let q;
                    const c = gcdisu(centerLat, centerLong, dela, delo);
                    let ab = bearing(centerLat, centerLong, dela, delo);
                    if (ab >= 0 && ab < Math.PI / 2) {
                        q = 1;
                    } else if (ab >= Math.PI / 2) {
                        ab = Math.PI - ab;
                        q = 4;
                    } else if (ab > -1 * (Math.PI / 2) && ab < 0) {
                        ab = -1 * ab;
                        q = 2;
                    } else {
                        ab += Math.PI;
                        q = 3;
                    }
                    let a = Math.atan(Math.cos(ab) * Math.tan(c));
                    let b = Math.atan(Math.tan(ab) * Math.sin(a));
                    switch (q) {
                        case 1:
                            a = -1 * Math.abs(a);
                            b = Math.abs(b);
                            break;
                        case 2:
                            a = -1 * Math.abs(a);
                            b = -1 * Math.abs(b);
                            break;
                        case 3:
                            a = Math.abs(a);
                            b = -1 * Math.abs(b);
                            break;
                        case 4:
                            a = Math.abs(a);
                            b = Math.abs(b);
                            break;
                    }
                    const nsu = 1160 + Math.round(a / vdis);
                    const nind = 1215 + Math.round(b / hdis);
                    const g = [nsu, nind];
                    n++;
                    for (let z = g[0] - siz / 2; z < g[0] + siz / 2; z++) {
                        for (let x = g[1] - siz / 2; x <= g[1] + siz / 2; x++) {
                            if ($(`#${z}-${x}-top`).length) {
                                $(`#${z}-${x}-top`).attr("class", n);
                                $(`#${z}-${x}-bot`).attr("class", n);
                            } else {
                                tri(z, x);
                            }
                        }
                    }
                    $(`.${n - 1}`).remove();
                    $("#camera").attr(
                        "position",
                        coord(
                            parseFloat(lat(parseInt(g[0]), parseInt(g[1]))),
                            parseFloat(long(parseInt(g[0]), parseInt(g[1]))),
                            parseFloat(height[parseInt(g[0])][parseInt(g[1])]) + 1.6,
                        ),
                    );
                } else {
                    const f = npo.split(" ");
                    n++;
                    for (let z = parseInt(f[0]) - siz / 2; z < parseInt(f[0]) + siz / 2; z++) {
                        for (let x = parseInt(f[1]) - siz / 2; x <= parseInt(f[1]) + siz / 2; x++) {
                            if ($(`#${z}-${x}-top`).length) {
                                $(`#${z}-${x}-top`).attr("class", n);
                                $(`#${z}-${x}-bot`).attr("class", n);
                            } else {
                                tri(z, x);
                            }
                        }
                    }
                    $(`.${n - 1}`).remove();
                    $("#camera").attr(
                        "position",
                        coord(
                            parseFloat(lat(parseInt(f[0]), parseInt(f[1]))),
                            parseFloat(long(parseInt(f[0]), parseInt(f[1]))),
                            parseFloat(height[parseInt(f[0])][parseInt(f[1])]) + 1.6,
                        ),
                    );
                }
                interv = setInterval(update_scene, 10000);
                interv1 = setInterval(update_data, 2000);
            }
            break;
        }
        case 67: // C
            // nothing yet
            break;
        case 88: {
            // X
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#prompt-text").html("Input a new rendering size. Must be a whole number, divisible by 2.");
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").attr("onclick",`handleX();`);
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
            const me = prompt("Input a new slope above which squares will be marked in red.");
            if (me) {
                hes = parseFloat(me);
            }
            break;
        }
        case 78: {
            // N
            const mv = prompt("Input a new slope below which squares will be marked in green.");
            if (mv) {
                los = parseFloat(mv);
            }
            break;
        }
        case 86: {
            // V
            if($("#prompt").css("display")=="none"){
                $("#prompt").css("display","inline");
                $("#prompt-text").html("Input a new field of view, in degrees, for the camera. Default is 80.");
                $("#prompt-text").css("font-size","1.55em");
                $("#single-go").attr("onclick",`handleV();`);
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
                const canvas = document.getElementById("draw");
                const ctx = canvas.getContext("2d");
                const map = document.getElementById("map");
                ctx.drawImage(map,0,0,3200,3200);
            }else{
                $("#route-box").css("display","none");
                $(".rinp").val("");
            }
            break;
        }
        default: // W, A, S, D
            if (
                (event.which === 65 ||
                    event.which === 87 ||
                    event.which === 83 ||
                    event.which === 68) &&
                ah
            ) {
                const d = indexes(
                    document.querySelector("#camera").object3D.position.x,
                    document.querySelector("#camera").object3D.position.z,
                );
                document.querySelector("#camera").object3D.position.y =
                    parseFloat($(`#${d[0]}-${d[1]}-bot`).attr("vertex-c").split(" ")[1]) + 1.6;
            }
            break;
    }
});
AFRAME.registerComponent("build", {
    init: function () {
        start();
    },
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
    y = Math.sin(destLng2 - startLng2) * Math.cos(destLat2);
    x =
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
    const y = he * Math.cos(g/r) - 2 * r * Math.pow(Math.sin(g / (2 * r)), 2);
    const z = (r + he) * sgr * Math.cos(b);
    return `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`;
}
function tri(subList, index) {
    let col;
    const a = coord(lat(subList, index), long(subList, index), height[subList][index]);
    const c = coord(lat(subList - 1, index), long(subList - 1, index), height[subList - 1][index]);
    const b = coord(
        lat(subList - 1, index + 1),
        long(subList - 1, index + 1),
        height[subList - 1][index + 1],
    );
    const d = coord(lat(subList, index + 1), long(subList, index + 1), height[subList][index + 1]);
    if (slope[subList][index] >= hes) {
        col = "red";
    } else {
        if (route.includes(`${subList}-${index}`)) {
            if (comms.includes(`${subList}-${index}`)) {
                col = "blue";
            } else {
                col = "yellow";
            }
        } else if (slope[subList][index] <= los) {
            col = "green";
        } else {
            col = "big";
        }
    }
    $("#scene")
        .append(`<a-triangle id="${subList}-${index}-top" class="${n}" vertex-a="${a}" vertex-b="${b}" vertex-c="${c}" material="side: double; roughness: 1" src="#home-${col}">
    </a-triangle><a-triangle id="${subList}-${index}-bot" class="${n}" vertex-a="${a}" vertex-b="${b}" vertex-c="${d}" material="side: double; roughness: 1" src="#home-${col}"></a-triangle>`);
}
function update(z, x) {
    const fid = `${z}-${x}`;
    const slo = slope[z][x];
    $(`#${fid}-top`).attr("class", n);
    $(`#${fid}-bot`).attr("class", n);
    if (!route.includes(fid)) {
        if (slo >= hes && $(`#${fid}-top`).attr("src") !== "#home-red") {
            $(`#${fid}-top`).attr("src", "#home-red");
            $(`#${fid}-bot`).attr("src", "#home-red");
        } else if (slo <= los && $(`#${fid}-top`).attr("src") !== "#home-green") {
            $(`#${fid}-top`).attr("src", "#home-green");
            $(`#${fid}-bot`).attr("src", "#home-green");
        } else if (slo > los && slo < hes && $(`#${fid}-top`).attr("src") !== "#home-big") {
            $(`#${fid}-top`).attr("src", "#home-big");
            $(`#${fid}-bot`).attr("src", "#home-big");
        }
    }
}
function indexes(camx, camz) {
    if ($("a-triangle[id*=top]").length) {
        let sub;
        let ind;
        $("a-triangle[id*=top]").each(function () {
            id = $(this).attr("id");
            sub = parseInt(id.slice(0, id.indexOf("-")));
            ind = parseInt(id.slice(id.indexOf("-") + 1, id.lastIndexOf("-")));
            const a = $(this).attr("vertex-a").split(" ").map(parseFloat);
            const b = $(this).attr("vertex-b").split(" ").map(parseFloat);
            const c = $(this).attr("vertex-c").split(" ").map(parseFloat);
            const d = $(`#${sub}-${ind}-bot`).attr("vertex-c").split(" ").map(parseFloat);
            const minz = Math.min(a[2], b[2], c[2], d[2]);
            const minx = Math.min(a[0], b[0], c[0], d[0]);
            const maxz = Math.max(a[2], b[2], c[2], d[2]);
            const maxx = Math.max(a[0], b[0], c[0], d[0]);
            if (camx >= minx && camx <= maxx && camz >= minz && camz <= maxz) {
                return false;
            }
        });
        return [sub, ind];
    } else {
        return [1160, 1215];
    }
}

async function start() {
    const start = new Date();

    const assets = [
        ["height.json", "height"],
        ["latleft.json", "latl"],
        ["latright.json", "latr"],
        ["longleft.json", "longl"],
        ["longright.json", "longr"],
        ["routen.json", "route"],
        ["comms.json", "comms"],
        ["slope.json", "slope"],
    ];
    const promises = assets.map((item) =>
        fetch(item[0])
            .then((response) => response.json())
            .then((content) => {
                window[item[1]] = content;
            }),
    );

    await Promise.all(promises).catch((error) => {
        console.error(error.message);
    });

    const time = new Date() - start;
    console.log(`Spent ${time}ms in init()`);
    interv = setInterval(update_scene, 10000);
    interv1 = setInterval(update_data, 2000);
}

function handleX(){
    const ne = $("#single").val();
    if (ne) {
        siz = parseInt(ne);
    }
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
function slopecost(sl1,in1,sl2,in2,lim){
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if(slo>=lim||slp>=lim){
        return Infinity;
    }
    return (slo+slp)/2;
}
function costestimator(sl1,in1,sl2,in2){
    return gcdis(lat(sl1,in1),long(sl1,in1),lat(sl2,in2),long(sl2,in2))*mult;
}
function AStar(bsl,bind,esl,eind,lim){
    let star = new Date();
    let it = 0;
    const spoi = makePoint(bsl,bind);
    let openSet = [spoi];
    let cameFrom = Array(makePoint(3200,3200));
    let gScore = Array(makePoint(3200,3200));
    gScore.fill(Infinity);
    gScore[spoi] = 0;
    let fScore = Array(makePoint(3200,3200));
    fScore.fill(Infinity);
    fScore[spoi] = costestimator(bsl,bind,esl,eind);
    while (openSet.length>0){
        let current = Infinity;
        let min = Infinity;
        for(const j of openSet){
            if (fScore[j]<min){
                current = j;
                min = fScore[current];
            }
        }
        if(it%1000000==0){
            console.log(`Iteration: ${it}, time: ${new Date() - star}ms`);
        }
        if(current==makePoint(esl,eind)){
            console.log(`Reached destination after ${new Date() - star} ms and ${it} iterations.`);
            return reconstruct_path(cameFrom,current);
        }
        const inde = openSet.indexOf(current);
        openSet.splice(inde,1);
        const sl = getSubList(current);
        const de = getIndex(current);
        neighbors = [makePoint(sl-1,de-1),makePoint(sl-1,de),makePoint(sl-1,de+1),
        makePoint(sl,de-1),makePoint(sl,de+1),makePoint(sl+1,de-1),makePoint(sl+1,de),
        makePoint(sl+1,de-1)];
        for(let i = 0; i<8; i++){
            tentative_gScore = gScore[current] + slopecost(sl,de,getSubList(neighbors[i]),getIndex(neighbors[i]),lim);
            if (tentative_gScore<gScore[neighbors[i]]){
                cameFrom[neighbors[i]] = current;
                gScore[neighbors[i]] = tentative_gScore;
                fScore[neighbors[i]] = tentative_gScore + costestimator(sl,de,esl,eind);
                if(!openSet.includes(neighbors[i])){
                    openSet.push(neighbors[i]);
                }
            }
        }
        it++;
    }
    return false;
}
function reconstruct_path(cameFrom,current){
    let totalPath = [current];
    while (cameFrom[current]!=null){
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
function wayfind(){
    const canvas = document.getElementById("draw");
    const ctx = canvas.getContext("2d");
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    console.log(`width: ${canvasW}, height: ${canvasH}`);
    const map = document.getElementById("map");
    $("#progress").html("Finding route...");
    const desl = parseInt($("#sublist").val());
    const dein = parseInt($("#index").val());
    const ms = parseInt($("#slope").val());
    rcalc = [];
    const indic = indexes(
        document.querySelector("#camera").object3D.position.x,
        document.querySelector("#camera").object3D.position.z,
    );
    if(slope[desl][dein]>=ms){
        $("#progress").html("Route failed!");
        return false;
    }
    const nrt = AStar(indic[0],indic[1],desl,dein,ms);
    if(nrt==false){
        $("#progress").html("Route failed!");
        return false;
    }
    for(const c of nrt){
        rcalc.push(extractPoint(c));
    }
    $("#progress").html("Route found!");
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
    ctx.fillStyle = "rgb(56,242,96)";
    for(let i = 0; i<rcalc.length; i++){
        ctx.fillRect((((rcalc[i][1]-mind)/wid)*canvasW)-10,(((rcalc[i][0]-misl)/wid)*canvasH)-10,20,20);
    }
}