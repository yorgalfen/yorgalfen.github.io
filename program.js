var height, latl, latr, longl, longr, slope;
var n = 0;
const centerLat = -85.3611726;
const centerLong = 28.6605755;
const startHeight = 5537;
const r = 1737400;
var siz = 64;
$(document).keydown(function (){
    if (event.which == 81){ // Q
        $("#camera").attr("position",`${$("#camera").attr("position").x} ${parseFloat($("#camera").attr("position").y) + 0.5} ${$("#camera").attr("position").z}`);
    }
    if (event.which == 69){ // E
        $("#camera").attr("position", `${$("#camera").attr("position").x} ${parseFloat($("#camera").attr("position").y) - 0.5} ${$("#camera").attr("position").z}`);
    }
    if (event.which == 80){ // P
        let npo = prompt("Go to position? (row, column starting at 0, space-separated)");
        if (npo){
            clearInterval(interv);
            let f = npo.split(" ");
            n++;
            for(var z = parseInt(f[0]) - siz/2; z < parseInt(f[0]) + siz/2; z++){
                for(var x = parseInt(f[1]) - siz/2; x <= parseInt(f[1]) + siz/2; x++){
                    if($(`#${z}-${x}-top`).length){
                        $(`#${z}-${x}-top`).attr("class", n);
                        $(`#${z}-${x}-bot`).attr("class", n);
                    }else{
                        tri(z, x);
                    }
                }
            }
            $(`.${n-1}`).remove();
            $("#camera").attr("position", coord(parseFloat(lat(parseInt(f[0]),parseInt(f[1]))), parseFloat(long(parseInt(f[0]),parseInt(f[1]))), parseFloat(height[parseInt(f[0])][parseInt(f[1])])+1.6));
            interv = setInterval(function(){
                let ex = $("#camera").attr("position").x;
                let ez = $("#camera").attr("position").z;
                let f = indexes(ex, ez);
                n++;
                for(var z = f[0] - siz/2; z < f[0] + siz/2; z++){
                    for(var x = f[1] - siz/2; x <= f[1] + siz/2; x++){
                        if($(`#${z}-${x}-top`).length){
                            $(`#${z}-${x}-top`).attr("class", n);
                            $(`#${z}-${x}-bot`).attr("class", n);
                        }else{
                            tri(z, x);
                        }
                    }
                }
                $(`.${n-1}`).remove();
            }, 10000); 
        }
    }
    if (event.which == 67){ // C
        let c = indexes($("#camera").attr("position").x, $("#camera").attr("position").z);
        alert(`Your position is approximately ${lat(c[0],c[1])}, ${long(c[0],c[1])}.\nYour elevation is approximately ${height[c[0]][c[1]]}.\nYour data position is row ${c[0]}, column ${c[1]}.`);
    }
    if (event.which == 88){ // X
        let ne = prompt("Input a new rendering size. Must be a whole number, divisible by 2.");
        if (ne){
            siz = parseInt(ne);
        }
    }
});
AFRAME.registerComponent("build", {
    init: function () {
        start();
    }
  });
function toRad(x){
    return x*Math.PI/180;
}
function lat(su, ind){
    if (ind >= 1600){
        return latr[su][ind-1600];
    }else{
        return latl[su][ind];
    }
}
function long(su, ind){
    if (ind >= 1600){
        return longr[su][ind-1600];
    }else{
        return longl[su][ind];
    }
}
function gcdis(la1, lo1, la2, lo2){
    let dlat = toRad((la2-la1));
    let dlon = toRad((lo2-lo1));
    let lr1 = toRad(la1);
    let lr2 = toRad(la2);
    let a = Math.sin(dlat/2)*Math.sin(dlat/2)+Math.sin(dlon/2)*Math.sin(dlon/2)*Math.cos(lr1)*Math.cos(lr2);
    return r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function bearing(startLat, startLng, destLat, destLng){
    startLat = toRad(startLat);
    startLng = toRad(startLng);
    destLat = toRad(destLat);
    destLng = toRad(destLng);
    y = Math.sin(destLng - startLng) * Math.cos(destLat);
    x = Math.cos(startLat) * Math.sin(destLat) -
          Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let brng = Math.atan2(y, x);
    return brng;
}
function coord(la,lo,he){
    let b = bearing(centerLat, centerLong, la, lo);
    let g = gcdis(centerLat, centerLong, la, lo);
    let sgr = Math.sin(g/r);
    let x = (r+he)*sgr*Math.sin(b);
    let y = he*Math.sqrt(1-sgr*sgr)-2*r*Math.pow(Math.sin(g/(2*r)),2);
    let z = (r+he)*sgr*Math.cos(b);
    return `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`;
}
function tri(subList, index){
    let a = coord(parseFloat(lat(subList,index)), parseFloat(long(subList,index)), parseFloat(height[subList][index]));
    let c = coord(parseFloat(lat(subList-1,index)), parseFloat(long(subList-1,index)), parseFloat(height[subList-1][index]));
    let b = coord(parseFloat(lat(subList-1,index+1)), parseFloat(long(subList-1,index+1)), parseFloat(height[subList-1][index+1]));
    let d = coord(parseFloat(lat(subList,index+1)), parseFloat(long(subList,index+1)), parseFloat(height[subList][index+1]));
    $("#scene").append(`<a-triangle id="${subList}-${index}-top" class="${n}" vertex-a="${a}" vertex-b="${b}" vertex-c="${c}" src="#reddit" material="side: double">
    </a-triangle><a-triangle id="${subList}-${index}-bot" class="${n}" vertex-a="${a}" vertex-b="${b}" vertex-c="${d}" src="#reddit" material="side: double"></a-triangle>`);
}
function indexes(camx, camz){
    if ($("a-triangle[id*=top]").length){
        let sub, ind;
        $("a-triangle[id*=top]").each(function(){
            id = $(this).attr('id');
            sub = parseInt(id.slice(0,id.indexOf("-")));
            ind = parseInt(id.slice(id.indexOf("-")+1,id.lastIndexOf("-")));
            let a = $(this).attr("vertex-a").split(" ");
            let b = $(this).attr("vertex-b").split(" ");
            let c = $(this).attr("vertex-c").split(" ");
            let d = $(`#${sub}-${ind}-bot`).attr("vertex-c").split(" ");
            if ((parseFloat(a[2])<parseFloat(b[2])&&parseFloat(a[2])<parseFloat(c[2]))&&parseFloat(a[2])<parseFloat(d[2])){
                var minz = parseFloat(a[2]);
            }else if ((parseFloat(b[2])<parseFloat(a[2])&&parseFloat(b[2])<parseFloat(c[2]))&&parseFloat(b[2])<parseFloat(d[2])){
                var minz = parseFloat(b[2]);
            }else if ((parseFloat(c[2])<parseFloat(a[2])&&parseFloat(c[2])<parseFloat(b[2]))&&parseFloat(c[2])<parseFloat(d[2])){
                var minz = parseFloat(c[2]);
            }else{
                var minz = parseFloat(d[2]);
            }
            if ((parseFloat(a[0])<parseFloat(b[0])&&parseFloat(a[0])<parseFloat(c[0]))&&parseFloat(a[0])<parseFloat(d[0])){
                var minx = parseFloat(a[0]);
            }else if ((parseFloat(b[0])<parseFloat(a[0])&&parseFloat(b[0])<parseFloat(c[0]))&&parseFloat(b[0])<parseFloat(d[0])){
                var minx = parseFloat(b[0]);
            }else if ((parseFloat(c[0])<parseFloat(a[0])&&parseFloat(c[0])<parseFloat(b[0]))&&parseFloat(c[0])<parseFloat(d[0])){
                var minx = parseFloat(c[0]);
            }else{
                var minx = parseFloat(d[0]);
            }
            if ((parseFloat(a[2])>parseFloat(b[2])&&parseFloat(a[2])>parseFloat(c[2]))&&parseFloat(a[2])>parseFloat(d[2])){
                var maxz = parseFloat(a[2]);
            }else if ((parseFloat(b[2])>parseFloat(a[2])&&parseFloat(b[2])>parseFloat(c[2]))&&parseFloat(b[2])>parseFloat(d[2])){
                var maxz = parseFloat(b[2]);
            }else if ((parseFloat(c[2])>parseFloat(a[2])&&parseFloat(c[2])>parseFloat(b[2]))&&parseFloat(c[2])>parseFloat(d[2])){
                var maxz = parseFloat(c[2]);
            }else{
                var maxz = parseFloat(d[2]);
            }
            if ((parseFloat(a[0])>parseFloat(b[0])&&parseFloat(a[0])>parseFloat(c[0]))&&parseFloat(a[0])>parseFloat(d[0])){
                var maxx = parseFloat(a[0]);
            }else if ((parseFloat(b[0])>parseFloat(a[0])&&parseFloat(b[0])>parseFloat(c[0]))&&parseFloat(b[0])>parseFloat(d[0])){
                var maxx = parseFloat(b[0]);
            }else if ((parseFloat(c[0])>parseFloat(a[0])&&parseFloat(c[0])>parseFloat(b[0]))&&parseFloat(c[0])>parseFloat(d[0])){
                var maxx = parseFloat(c[0]);
            }else{
                var maxx = parseFloat(d[0]);
            }
            if ((camx>minx&&camx<maxx)&&(camz>minz&&camz<maxz)){
                return false;
            }
        });
        return [sub, ind];
    }else{
        return [500, 500];
    }
}
async function start(){
    let hepro = new Promise(function(resolve, reject){
        $.get('height.csv',{},function(content){
            height=content.split('\n');
            for (var i = 0; i < height.length; i++){
                height[i] = height[i].split(",");
            }
            resolve(true);
        });});
    let slopro = new Promise(function(resolve, reject){
        $.get('slope25.csv',{},function(content){
            slope=content.split('\n');
            for (var i = 0; i < slope.length; i++){    
                slope[i] = slope[i].split(",");
            }
            slope.pop();
            resolve(true);
        });});
    let lapro1 = new Promise(function(resolve, reject){
        $.get('latleft.csv',{},function(content){
            latl=content.split('\n');
            for (var i = 0; i < latl.length; i++){    
                latl[i] = latl[i].split(",");
            }
            resolve(true);
        });});
    let lapro2 = new Promise(function(resolve, reject){
        $.get('latright.csv',{},function(content){
        latr=content.split('\n');
        for (var i = 0; i < latr.length; i++){    
            latr[i] = latr[i].split(",");
        }
            resolve(true);
        });});
    let lopro1 = new Promise(function(resolve, reject){
        $.get('longleft.csv',{},function(content){
            longl=content.split('\n');
            for (var i = 0; i < longl.length; i++){    
                longl[i] = longl[i].split(",");
            }
            resolve(true);
        });});
    let lopro2 = new Promise(function(resolve, reject){
        $.get('longright.csv',{},function(content){
            longr=content.split('\n');
            for (var i = 0; i < longr.length; i++){    
                longr[i] = longr[i].split(",");
            }
            resolve(true);
        });});
    await hepro;
    await slopro;
    await lapro1;
    await lapro2;
    await lopro1;
    await lopro2;
    interv = setInterval(function(){
        let ex = $("#camera").attr("position").x;
        let ez = $("#camera").attr("position").z;
        let f = indexes(ex, ez);
        n++;
        for(var z = f[0] - siz/2; z < f[0] + siz/2; z++){
            for(var x = f[1] - siz/2; x <= f[1] + siz/2; x++){
                if($(`#${z}-${x}-top`).length){
                    $(`#${z}-${x}-top`).attr("class", n);
                    $(`#${z}-${x}-bot`).attr("class", n);
                }else{
                    tri(z, x);
                }
            }
        }
        $(`.${n-1}`).remove();
    }, 10000);
}
