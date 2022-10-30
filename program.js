var height, lat, long, slope;
const centerLat = -85.3272304;
const centerLong = 27.2947935;
const startHeight = 5537;
const r = 1737400;
$(document).keydown(function (){
    if (event.which == 81){
        $("#camera").attr("position",`${$("#camera").attr("position").x} ${parseFloat($("#camera").attr("position").y) + 0.5} ${$("#camera").attr("position").z}`);
    }
    if (event.which == 69){
        $("#camera").attr("position", `${$("#camera").attr("position").x} ${parseFloat($("#camera").attr("position").y) - 0.5} ${$("#camera").attr("position").z}`);
    }
    if (event.which == 80){
        let npo = prompt("Go to position? (x, y, z space-separated)");
        $("#camera").attr("position", npo);
    }
});
AFRAME.registerComponent("build", {
    init: function () {
        $.get('height25.csv',{},function(content){
            height=content.split('\r\n');
            for (var i = 0; i < height.length; i++){
                height[i] = height[i].split(",");
            }
            height.pop();
        });
        $.get('slope25.csv',{},function(content){
            slope=content.split('\r\n');
            for (var i = 0; i < slope.length; i++){    
                slope[i] = slope[i].split(",");
                
            }
            slope.pop();
        });
        $.get('lat25.csv',{},function(content){
            lat=content.split('\r\n');
            for (var i = 0; i < lat.length; i++){    
                lat[i] = lat[i].split(",");
            }
            lat.pop();
        });
        $.get('long25.csv',{},function(content){
            long=content.split('\r\n');
            for (var i = 0; i < long.length; i++){    
                long[i] = long[i].split(",");
            }
            long.pop();
        });
        for(var i=0;i<4;i++){
            for(var j=0;j<4;j++){
                tri(j+1, i);
            }
        }
    }
  });
function toRad(x){
    return x*Math.PI/180;
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
    let a = coord(parseFloat(lat[subList][index]), parseFloat(long[subList][index]), parseFloat(height[subList][index]));
    let c = coord(parseFloat(lat[subList-1][index]), parseFloat(long[subList-1][index]), parseFloat(height[subList-1][index]));
    let b = coord(parseFloat(lat[subList-1][index+1]), parseFloat(long[subList-1][index+1]), parseFloat(height[subList-1][index+1]));
    let d = coord(parseFloat(lat[subList][index+1]), parseFloat(long[subList][index+1]), parseFloat(height[subList][index+1]));
    $("#scene").append(`<a-triangle id="${subList} ${index} top" vertex-a="${a}" vertex-b="${b}" vertex-c="${c}" src="#nasa" material="side: double">
    </a-triangle><a-triangle id="${subList} ${index} bot" vertex-a="${a}" vertex-b="${b}" vertex-c="${d}" src="#nasa" material="side: double"></a-triangle>`);
}
