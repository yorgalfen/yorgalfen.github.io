import {
    Terrain,
    bearing,
    comms,
    coord,
    elevation,
    height,
    lat,
    long,
    route,
    slope,
    texts,
    visib,
} from "./Terrain.mjs";

let dest;
let directions;
let rcalc = [];
let rcalc20 = [];
let commcalc = [];
let commcalc20 = [];
let dataInterval;
let lang = "en";
let ah = false;
let ahTimeout;
let ahoff = 1.6;
let fdr = true;
let qu = false;
const mult = 4.375e-7; // the multiplier for distance to get it to always be less than or equal to 0.01, the step in height
const zeroCostSlope = 2.5;
const margin = 50;
const earthLat = -6.6518153;
const costFunction = {
    std: slopecost,
    dis: distancecost,
    hil: heightcost,
    ear: visibilitycost,
};
const estimators = {
    std: costestimator,
    dis: costestimator,
    hil: heightestimator,
    ear: costestimator,
};
const compOffset = 0.5346887200211221;
console.log(`jQuery version: ${$.fn.jquery.split(" ")[0]}`);

function update_data() {
    let di;
    const camera = $("#camera")[0];
    const cameraPos = camera.object3D.position;
    let rot = camera.object3D.rotation.y;
    const c = terrain.dataIndexOf(cameraPos);
    const latDeg = lat(c[0], c[1]);
    const longDeg = long(c[0], c[1]);
    const het = height[c[0]][c[1]];
    const az = (bearing(latDeg, longDeg, earthLat, 0) * 180) / Math.PI;
    const ele = (elevation(latDeg, longDeg, het) * 180) / Math.PI;
    const canvas = $("#minimap")[0];
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 3200, 3200);
    ctx.save();
    ctx.fillStyle = "rgb(0,0,0)";
    const size = $("#luna")[0].getAttribute("terrain").renderDistance;
    ctx.fillRect(c[1] - size / 2, c[0] - size / 2, size, 8);
    ctx.fillRect(c[1] - size / 2, c[0] - size / 2, 8, size);
    ctx.fillRect(c[1] + size / 2, c[0] - size / 2, 8, size + 8);
    ctx.fillRect(c[1] - size / 2, c[0] + size / 2, size, 8);
    ctx.translate(c[1], c[0]);
    ctx.rotate(Math.PI + compOffset - rot);
    const arr = $("#arrow")[0];
    ctx.drawImage(arr, -100, -163);
    ctx.restore();
    rot = Math.floor(((rot + 3 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4));
    if (directions[rot]) {
        di = directions[rot];
    } else if (-8 <= rot && -1 >= rot) {
        di = directions[rot + 8];
    } else {
        di = rot;
    }
    $("#data").html(
        `${texts[lang].da}${-lat(c[0], c[1])}° S, ${long(c[0], c[1])}${texts[lang].db}${
            height[c[0]][c[1]]
        }${texts[lang].dc}${az.toFixed(2)}${texts[lang].dd}${ele.toFixed(2)}${texts[lang].de}${
            c[0]
        }${texts[lang].df}${c[1]}${texts[lang].dg}${di}\u2003\u2003${texts[lang].dh}${
            vis(c[0], c[1]) & !qu ? texts[lang].no : texts[lang].yes
        }`,
    );
}
$(document).on("keydown", (event) => {
    const cameraPos = document.querySelector("#camera").object3D.position;
    if (event.ctrlKey || event.metaKey) {
        return;
    }
    switch (event.which) {
        case 81: // Q
            if (ah) {
                ahoff += 0.5;
            } else {
                cameraPos.y += 0.5;
            }
            break;
        case 69: // E
            if (ah) {
                ahoff -= 0.5;
            } else {
                cameraPos.y -= 0.5;
            }
            break;
        case 80: {
            clearTimeout(ahTimeout);
            // P
            if ($("#prompt").css("display") === "none") {
                showPrompt("#teleport-coordinates", "", handleP);
                $("#minimap").on("click", (event) => {
                    const dex = Math.round((event.offsetX / $("#minimap").width()) * 3200);
                    const sbl = Math.round((event.offsetY / $("#minimap").height()) * 3200);
                    $("#slla").val(sbl);
                    $("#inlo").val(dex);
                });
            } else {
                $("#prompt").hide();
                $(".telinp").val("");
                $("#minimap").off("click");
                $("#single-go").off();
            }
            break;
        }
        case 67: // C
            clearTimeout(ahTimeout);
            if ($("#prompt").css("display") === "none") {
                showPrompt("#color-select", texts[lang].c, handleC);
            } else {
                $("#prompt").hide();
                $("#single-go").off();
            }
            break;
        case 88: {
            // X
            clearTimeout(ahTimeout);
            if ($("#prompt").css("display") === "none") {
                showPrompt("#single", texts[lang].x, handleX);
            } else {
                $("#prompt").hide();
                $("#single").val("");
                $("#single-go").off();
            }
            break;
        }
        case 76: // L
            ah = !ah;
            // FIXME: use toggle prompt
            $("#route-box").hide();
            $("#prompt").show();
            $(".form").children().hide();
            $("#prompt-title").show();
            $("#prompt-title").html(texts[lang][`l${ah}`]);
            ahTimeout = setTimeout(() => $("#prompt").hide(), 2500);
            break;
        case 72: // H
            window.open(`../help-${lang}.html`, "_blank");
            break;
        case 77: {
            // M
            clearTimeout(ahTimeout);
            if ($("#prompt").css("display") === "none") {
                showPrompt("#single", texts[lang].m, handleM);
            } else {
                $("#prompt").hide();
                $("#single").val("");
                $("#single-go").off();
            }
            break;
        }
        case 78: {
            // N
            clearTimeout(ahTimeout);
            if ($("#prompt").css("display") === "none") {
                showPrompt("#single", texts[lang].n, handleN);
            } else {
                $("#prompt").hide();
                $("#single").val("");
                $("#single-go").off();
            }
            break;
        }
        case 86: {
            // V
            clearTimeout(ahTimeout);
            if ($("#prompt").css("display") === "none") {
                showPrompt("#single", texts[lang].v, handleV);
            } else {
                $("#prompt").hide();
                $("#single").val("");
                $("#single-go").off();
            }
            break;
        }
        case 82: {
            // R
            if ($("#route-box").css("display") === "none") {
                $("#prompt").hide();
                $("#route-box").show();
                $("#plan").on("click", wayfind);
                $("#draw").on("click", (event) => {
                    const dex = Math.round((event.offsetX/$("#draw").width())*3200);
                    const sbl = Math.round((event.offsetY/$("#draw").height())*3200);
                    $("#sublist").val(sbl);
                    $("#index").val(dex);
                });
                $("#route-clear").on("click", routeReset);
                $("#route-data").html(texts[lang].rd);
                if (fdr) {
                    routeReset();
                    fdr = false;
                }
            } else {
                $("#route-box").hide();
                $(".rinp").val("");
                $("#progress").empty();
            }
            break;
        }
        case 71: {
            // G
            if ($("#prompt").css("display") === "none") {
                showPrompt("#single", texts[lang].g, handleG);
            } else {
                $("#prompt").hide();
                $("#single").val("");
                $("#single-go").off();
            }
            break;
        }
        case 85: {
            // U
            qu = !qu;
            $("#route-box").hide();
            $("#prompt").show();
            $("#prompt").children().hide();
            $("#prompt-title").show();
            $("#prompt-title").html(texts[lang][`u${qu}`]);
            ahTimeout = setTimeout(() => $("#prompt").hide(), 2500);
            break;
        }
        case 89: {
            // Y
            clearTimeout(ahTimeout);
            if ($("#prompt").css("display") === "none") {
                showPrompt("#lang-select", texts[lang].y, handleY);
            } else {
                $("#prompt").hide();
                $("#single-go").off();
            }
            break;
        }
    }
});

function vis(su, ind) {
    return (visib[su][Math.floor(ind / 32)] >> ind % 32) & 1;
}

function handleX() {
    const ne = $("#single").val();
    if (ne) {
        clearInterval(dataInterval);
        const size = parseInt(ne);
        if (size !== undefined) {
            $("#luna")[0].setAttribute("terrain", { renderDistance: size });
            dataInterval = setInterval(update_data, Math.round(size ** 2 / 40));
        }
    }
    $("#prompt").hide();
    $("#single").val("");
}
function handleC() {
    const scheme = $("#color-select").val();
    $("#luna")[0].setAttribute("terrain", { colorizer: scheme });
    $("#prompt").hide();
    $("#single").val("");
}
function handleV() {
    const fov = $("#single").val();
    if (fov) {
        $("#camera")[0].setAttribute("camera", { fov: fov });
    }
    $("#prompt").hide();
    $("#single").val("");
}
function handleM() {
    const sl = $("#single").val();
    if (sl) {
        hes = parseInt(sl);
        // Force a terrain redraw by writing to a property,
        // causing A-Frame to call the terrain's .update() method.
        const luna = $("#luna")[0];
        const size = luna.getAttribute("terrain").renderDistance;
        luna.setAttribute("terrain", { renderDistance: size });
    }
    $("#prompt").hide();
    $("#single").val("");
}
function handleN() {
    const sl = $("#single").val();
    if (sl) {
        los = parseInt(sl);
        // Force a terrain redraw by writing to a property,
        // causing A-Frame to call the terrain's .update() method.
        const luna = $("#luna")[0];
        const size = luna.getAttribute("terrain").renderDistance;
        luna.setAttribute("terrain", { renderDistance: size });
    }
    $("#prompt").hide();
    $("#single").val("");
}
function handleP() {
    const cameraPos = document.querySelector("#camera").object3D.position;
    const pu1 = parseFloat($("#slla").val());
    const pu2 = parseFloat($("#inlo").val());
    ah = false;
    let newPlace = [];
    if (pu1 < 0) {
        newPlace = fromLatLong(pu1, pu2);
    } else {
        newPlace = [Math.floor(pu1), Math.floor(pu2)];
    }
    if (
        !newPlace ||
        newPlace[0] > 3199 ||
        newPlace[1] < 0 ||
        newPlace[1] > 3199 ||
        Number.isNaN(newPlace[0]) ||
        Number.isNaN(newPlace[1])
    ) {
        $("#invinp").css("visibility", "initial");
        return false;
    }
    clearInterval(dataInterval);
    $("#luna")[0].setAttribute("terrain", { frame: newPlace.join(" ") });
    const newPosition = coord(
        lat(newPlace[0], newPlace[1]),
        long(newPlace[0], newPlace[1]),
        height[newPlace[0]][newPlace[1]] + ahoff,
    );
    cameraPos.x = newPosition[0];
    cameraPos.y = newPosition[1];
    cameraPos.z = newPosition[2];
    update_data();
    // Re-set intervals for redraw and data
    const size = $("#luna")[0].getAttribute("terrain").renderDistance;
    dataInterval = setInterval(update_data, Math.round(size ** 2 / 40));
    $("#prompt").hide();
    $(".telinp").val("");
}
function handleG() {
    const nint = parseFloat($("#single").val());
    if (Number.isInteger(nint)) {
        const lux = $("#lux")[0];
        if (nint >= 100) {
            lux.setAttribute("intensity", 0.5);
        } else if (nint <= 0) {
            lux.setAttribute("intensity", 0);
        } else {
            lux.setAttribute("intensity", nint * 0.005);
        }
    }
    $("#prompt").hide();
    $("#single").val("");
}
function handleY() {
    lang = $("#lang-select").val();
    $("#prompt").hide();
    $(".chy").each(function () {
        $(this).html(texts[lang][this.id]);
    });
    directions = texts[lang].d;
}
function slopecost(sl1, in1, sl2, in2, lim) {
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if (slo >= lim || slp >= lim) {
        return Infinity;
    }
    const scaleInterval = lim - zeroCostSlope;
    const slopos = slp - zeroCostSlope;
    const estim = costestimator(sl1, in1, sl2, in2);
    return Math.max(estim * (1 + slopos / scaleInterval), estim);
}
function distancecost(sl1, in1, sl2, in2, lim) {
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if (slo >= lim || slp >= lim) {
        return Infinity;
    }
    return costestimator(sl1, in1, sl2, in2);
}
function heightestimator(sl1, in1, sl2, in2) {
    return (
        Math.max(height[sl2][in2] - height[sl1][in1], 0) + costestimator(sl1, in1, sl2, in2) * mult
    );
}
function heightcost(sl1, in1, sl2, in2, lim) {
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if (slo >= lim || slp >= lim) {
        return Infinity;
    }
    return heightestimator(sl1, in1, sl2, in2);
}
function costestimator(sl1, in1, sl2, in2) {
    const cs = coord(lat(sl1, in1), long(sl1, in1), height[sl1][in1]);
    const cd = coord(lat(sl2, in2), long(sl2, in2), height[sl2][in2]);
    // return Math.max(Math.abs(cd[0]-cs[0]),Math.abs(cd[1]-cs[1]),Math.abs(cd[2]-cs[2]));
    return Math.hypot(cs[0] - cd[0], cs[1] - cd[1], cs[2] - cd[2]);
}
function visibilitycost(sl1, in1, sl2, in2, lim) {
    const slo = slope[sl1][in1];
    const slp = slope[sl2][in2];
    if (slo >= lim || slp >= lim) {
        return Infinity;
    }
    const estim = costestimator(sl1, in1, sl2, in2);
    return estim * (9 * vis(sl2, in2) + 1);
}
function AStar(bsl, bind, esl, eind, lim, cost, est) {
    const star = new Date();
    let it = 0;
    const spoi = makePoint(bsl, bind);
    const openSet = [spoi];
    const cameFrom = new Int32Array(makePoint(3200, 3200));
    cameFrom.fill(-1);
    const gScore = new Float32Array(makePoint(3200, 3200));
    gScore.fill(Infinity);
    gScore[spoi] = 0;
    const fScore = new Float32Array(makePoint(3200, 3200));
    fScore.fill(Infinity);
    fScore[spoi] = est(bsl, bind, esl, eind);
    while (openSet.length > 0) {
        let current = Infinity;
        let min = Infinity;
        for (const j of openSet) {
            if (fScore[j] < min) {
                current = j;
                min = fScore[current];
            }
        }
        if (it % 50000 === 0) {
            console.log(
                `Iteration: ${it}, time: ${new Date() - star}ms, current: ${extractPoint(
                    current,
                )}, openSet is ${openSet.length} long.`,
            );
        }
        if (it === 10240000) {
            console.log(
                `Broken after ${new Date() - star}ms, openSet is ${
                    openSet.length
                } long. current is ${extractPoint(current)}`,
            );
            return false;
        }
        if (current === makePoint(esl, eind)) {
            console.log(
                `Reached destination after ${
                    new Date() - star
                } ms and ${it} iterations, openSet is ${openSet.length} long.`,
            );
            return reconstruct_path(cameFrom, current);
        }
        const inde = openSet.indexOf(current);
        openSet.splice(inde, 1);
        const sl = getSubList(current);
        const de = getIndex(current);
        const neighbors = [];
        if (sl < 3199) {
            neighbors.push(makePoint(sl + 1, de));
            if (de < 3199) {
                neighbors.push(makePoint(sl + 1, de + 1));
            }
            if (de > 0) {
                neighbors.push(makePoint(sl + 1, de - 1));
            }
        }
        if (sl > 0) {
            neighbors.push(makePoint(sl - 1, de));
            if (de < 3199) {
                neighbors.push(makePoint(sl - 1, de + 1));
            }
            if (de > 0) {
                neighbors.push(makePoint(sl - 1, de - 1));
            }
        }
        if (de < 3199) {
            neighbors.push(makePoint(sl, de + 1));
        }
        if (de > 0) {
            neighbors.push(makePoint(sl, de - 1));
        }
        for (let i = 0; i < neighbors.length; i++) {
            const tentative_gScore =
                gScore[current] +
                cost(sl, de, getSubList(neighbors[i]), getIndex(neighbors[i]), lim);
            if (tentative_gScore < gScore[neighbors[i]]) {
                cameFrom[neighbors[i]] = current;
                gScore[neighbors[i]] = tentative_gScore;
                fScore[neighbors[i]] = tentative_gScore + est(sl, de, esl, eind);
                if (!openSet.includes(neighbors[i])) {
                    openSet.push(neighbors[i]);
                }
            }
        }
        it++;
    }
    console.log("About to end due to openSet being empty.");
    return false;
}
function reconstruct_path(cameFrom, start) {
    let current = start;
    const totalPath = [current];
    while (cameFrom[current] !== -1) {
        current = cameFrom[current];
        totalPath.unshift(current);
    }
    return totalPath;
}
function checkpoints(rout) {
    const path = [];
    const points = [];
    for (let i = 0; i < rout.length; i++) {
        if (vis(rout[i][0], rout[i][1]) === 0) {
            path.push(rout[i]);
        }
    }
    const inte = path.length / 11;
    for (let i = 1; i < 11; i++) {
        points.push(path[Math.round(i * inte)]);
    }
    return points;
}
function makePoint(subList, index) {
    return (subList << 12) | index;
}
function getSubList(point) {
    return point >> 12;
}
function getIndex(point) {
    return point & 0xfff;
}
function extractPoint(point) {
    return [getSubList(point), getIndex(point)];
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
    $("#route-clear").hide();
    $("#route-20-contain").hide();
    $("#route-20-applier").hide();
    const opt = $("#opt-drop").val();
    const canvas = $("#draw")[0];
    const ctx = canvas.getContext("2d");
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const map = $("#map")[0];
    $("#progress").html(texts[lang].progress);
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
    if (!(0 <= desl && desl < 3200 && 0 <= dein && dein < 3200) || slope[desl][dein] >= ms) {
        exi = true;
    }
    if (exi) {
        $("#progress").html(texts[lang].fail);
        return false;
    }

    const cameraPos = $("#camera")[0].object3D.position;
    const indic = terrain.dataIndexOf(cameraPos, false);

    rcalc = [];
    rcalc20 = undefined;

    let misl = 3200;
    let mind = 3200;
    let masl = -1;
    let mand = -1;
    if (ms === "?") {
        $("#route-applier").html(texts[lang].blue);
        $("#route-20-contain").show();
        $("#route-20-applier").show();
        $("#route-20-applier").on("click", () => {
            route.length = 0;
            for (let i = 0, len = rcalc20.length; i < len; i++) {
                route[i] = rcalc20[i];
            }
            comms.length = 0;
            for (let i = 0, len = commcalc20.length; i < len; i++) {
                comms[i] = commcalc20[i];
            }
            applyRoute();
        });
        const r20 = AStar(indic[0], indic[1], desl, dein, 20, costFunction[opt], estimators[opt]);
        if (!r20) {
            $("#progress").html(texts[lang].fail);
            return false;
        }
        rcalc20 = r20.map(extractPoint);
        commcalc20 = checkpoints(rcalc20);
        for (let i = 0; i < rcalc20.length; i++) {
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
        route.length = 0;
        for (let i = 0, len = rcalc.length; i < len; i++) {
            route[i] = rcalc[i];
        }
        comms.length = 0;
        for (let i = 0, len = commcalc.length; i < len; i++) {
            comms[i] = commcalc[i];
        }
        applyRoute();
    });

    const nrt = AStar(indic[0], indic[1], desl, dein, ms, costFunction[opt], estimators[opt]);
    if (!nrt) {
        $("#progress").html(texts[lang].fail);
        return false;
    }
    rcalc = nrt.map(extractPoint);
    commcalc = checkpoints(rcalc);
    $("#route-clear").show();
    $("#progress").html("");
    for (let i = 0; i < rcalc.length; i++) {
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
    ctx.fillRect(
        ((indic[1] - mind) / wid) * canvasW - 60,
        ((indic[0] - misl) / wid) * canvasH - 60,
        120,
        120,
    );
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(
        ((dein - mind) / wid) * canvasW - 60,
        ((desl - misl) / wid) * canvasH - 60,
        120,
        120,
    );
    ctx.fillStyle = "rgb(19,19,209)";
    for (let i = 0; i < rcalc.length; i++) {
        ctx.fillRect(
            ((rcalc[i][1] - mind) / wid) * canvasW - 10,
            ((rcalc[i][0] - misl) / wid) * canvasH - 10,
            20,
            20,
        );
    }
    ctx.fillStyle = "rgb(0,255,255)";
    for (let i = 0; i < commcalc.length; i++) {
        ctx.fillRect(
            ((commcalc[i]?.[1] - mind) / wid) * canvasW - 10,
            ((commcalc[i]?.[0] - misl) / wid) * canvasH - 10,
            20,
            20,
        );
    }
    if (rcalc20 !== undefined) {
        ctx.fillStyle = "rgb(46,16,2)";
        for (let i = 0; i < rcalc20.length; i++) {
            ctx.fillRect(
                ((rcalc20[i][1] - mind) / wid) * canvasW - 10,
                ((rcalc20[i][0] - misl) / wid) * canvasH - 10,
                20,
                20,
            );
        }
        ctx.fillStyle = "rgb(0,255,255)";
        for (let i = 0; i < commcalc20.length; i++) {
            ctx.fillRect(
                ((commcalc20[i]?.[1] - mind) / wid) * canvasW - 10,
                ((commcalc20[i]?.[0] - misl) / wid) * canvasH - 10,
                20,
                20,
            );
        }
    }
    if (mand > 3199) {
        ctx.clearRect(canvasW * ((3200 - mind) / wid), 0, canvasW, canvasH);
    }
    if (masl > 3199) {
        ctx.clearRect(0, canvasH * ((3200 - misl) / wid), canvasW, canvasH);
    }
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
    data += "°";
    switch (opt) {
        case "std":
            data += `${texts[lang].rg}${stats.averageSlope.toFixed(1)}`;
            if (stats20 !== undefined) {
                data += `/${stats20.averageSlope.toFixed(1)}`;
            }
            data += "°";
            break;
        case "dis":
            data += `${texts[lang].rg}${stats.averageSlope.toFixed(1)}`;
            if (stats20 !== undefined) {
                data += `/${stats20.averageSlope.toFixed(1)}`;
            }
            data += "°";
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(route[route.length - 1][1] - 20, route[route.length - 1][0] - 20, 40, 40);
    ctx.fillStyle = "rgb(19,19,209)";
    for (let i = 0; i < route.length; i++) {
        ctx.fillRect(route[i][1] - 10, route[i][0] - 10, 20, 20);
    }
    ctx.fillStyle = "rgb(0,255,255)";
    for (let i = 0; i < comms.length; i++) {
        ctx.fillRect(comms[i][1] - 10, comms[i][0] - 10, 20, 20);
    }
    dest = route[route.length - 1];
    $(".turris").attr("visible", "true");
    $(".turris").attr("towers", Math.random());
    update_flag();
    // Force a terrain redraw by writing to a property,
    // causing A-Frame to call the terrain's .update() method.
    const luna = $("#luna")[0];
    const size = luna.getAttribute("terrain").renderDistance;
    luna.setAttribute("terrain", { renderDistance: size });
}

function routeReset() {
    $("#route-20-contain").css("display", "none");
    $("#route-applier").html(texts[lang]["route-applier"]);
    const canvas = document.getElementById("draw");
    const ctx = canvas.getContext("2d");
    const map = document.getElementById("map");
    ctx.drawImage(map, 0, 0, 3200, 3200);
    const cnv = document.getElementById("minimap-route");
    const ct = cnv.getContext("2d");
    ct.clearRect(0, 0, cnv.width, cnv.height);
    route.length = 0;
    comms.length = 0;
    // Force a terrain redraw by writing to a property,
    // causing A-Frame to call the terrain's .update() method.
    const luna = $("#luna")[0];
    const size = luna.getAttribute("terrain").renderDistance;
    luna.setAttribute("terrain", { renderDistance: size });
    $(".turris").attr("visible", "false");
    $("#route-data").html(texts[lang].rd);
    $("#route-clear").css("display", "none");
}

const terrain = new Terrain();
AFRAME.registerComponent("terrain", terrain);

// Handle minimap and HUD
AFRAME.registerComponent("minimap", {
    init: () => {
        dest = route[route.length - 1];
        const canvas = document.getElementById("minimap-route");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgb(0,0,0)";
        ctx.fillRect(route[route.length - 1][1] - 20, route[route.length - 1][0] - 20, 40, 40);
        ctx.fillStyle = "rgb(19,19,209)";
        for (let i = 0; i < route.length; i++) {
            ctx.fillRect(route[i][1] - 10, route[i][0] - 10, 20, 20);
        }
        ctx.fillStyle = "rgb(0,255,255)";
        for (let i = 0; i < comms.length; i++) {
            ctx.fillRect(comms[i][1] - 10, comms[i][0] - 10, 20, 20);
        }
        $("#map-contain").show();

        directions = texts.en.d;
        // Ready to start drawing HUD
        const size = $("#luna")[0].getAttribute("terrain").renderDistance;
        dataInterval = setInterval(update_data, Math.round(size ** 2 / 40));
    },
});

// Adjust height (if set) and check if moving the frame is necessary
AFRAME.registerComponent("frame-adjust", {
    init: function () {
        this.cameraPos = new THREE.Vector3();
    },
    tick: function () {
        const start = new Date();
        const cameraPos = this.el.object3D.position;
        if (this.cameraPos.equals(cameraPos)) {
            // position didn't change
            return;
        }
        this.cameraPos.copy(cameraPos);
        // Remove tiles too far from camera position and load in new tiles.
        terrain.redraw(cameraPos);

        // Shouldn't matter, but automatic height adjustment occurs after recentering
        if (ah) {
            const intersections = terrain.raycast(cameraPos);
            if (intersections.length > 0) {
                cameraPos.y = intersections[0].point.y + ahoff;
            }
        }
        const time = new Date() - start;
        if (time > 17) {
            console.warn(`Spent ${time}ms in tick()`);
        }
    },
});
AFRAME.registerComponent("flag-comp", {
    init: function () {
        const flagPos = this.el.object3D.position;
        const target = coord(
            lat(route[route.length - 1][0], route[route.length - 1][1]),
            long(route[route.length - 1][0], route[route.length - 1][1]),
            height[route[route.length - 1][0]][route[route.length - 1][1]] + 15,
        );
        flagPos.x = target[0];
        flagPos.y = target[1];
        flagPos.z = target[2];
    },
});
AFRAME.registerComponent("towers", {
    update: function () {
        const el = this.el;
        const pos = el.object3D.position;
        const num = parseInt(el.id.split("-")[1]);
        const p = comms[num];
        const nPos = coord(lat(p[0], p[1]), long(p[0], p[1]), height[p[0]][p[1]]);
        pos.x = nPos[0];
        pos.y = nPos[1];
        pos.z = nPos[2];
    },
});
function fromLatLong(la, lo) {
    const dat = new Date();
    for (let sl = 0; sl < 3199; sl++) {
        for (let de = 0; de < 3199; de++) {
            const minla = Math.min(
                lat(sl, de),
                lat(sl + 1, de),
                lat(sl + 1, de + 1),
                lat(sl, de + 1),
            );
            const minlo = Math.min(
                long(sl, de),
                long(sl + 1, de),
                long(sl + 1, de + 1),
                long(sl, de + 1),
            );
            const maxla = Math.max(
                lat(sl, de),
                lat(sl + 1, de),
                lat(sl + 1, de + 1),
                lat(sl, de + 1),
            );
            const maxlo = Math.max(
                long(sl, de),
                long(sl + 1, de),
                long(sl + 1, de + 1),
                long(sl, de + 1),
            );
            if (la >= minla && la <= maxla && lo >= minlo && lo <= maxlo) {
                console.log(`Spent ${new Date() - dat}ms in fromLatLong()`);
                return [sl, de];
            }
        }
    }
    console.log(`Spent ${new Date() - dat}ms in fromLatLong()`);
    return false;
}
function update_flag() {
    const flag3D = $("#vexillum")[0].object3D;
    const flagPos = flag3D.position;
    const nPos = coord(
        lat(dest[0], dest[1]),
        long(dest[0], dest[1]),
        height[dest[0]][dest[1]] + 15,
    );
    flagPos.x = nPos[0];
    flagPos.y = nPos[1];
    flagPos.z = nPos[2];
}
function showPrompt(type, title, handler) {
    $("#route-box").hide();
    $("#prompt").show();
    $("#invinp").css("visibility", "hidden");
    $(".form").children().hide();
    $(type).show();
    $("#prompt-title").show();
    $("#prompt-title").html(title);
    $("#single-go").show();
    $("#single-go").one("click", handler);
}
