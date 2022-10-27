var height, lat, long, slope;
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
$.get('height25.csv',{},function(content){
    height=content.split('\r\n');
    for (var i = 0; i < height.length; i++){
        height[i] = height[i].split(",");
    }
    height.pop();
    console.log(height);
});
$.get('slope25.csv',{},function(content){
    slope=content.split('\r\n');
    for (var i = 0; i < slope.length; i++){    
        slope[i] = slope[i].split(",");
        
    }
    slope.pop();
    console.log(slope);
});
$.get('lat25.csv',{},function(content){
    lat=content.split('\r\n');
    for (var i = 0; i < lat.length; i++){    
        lat[i] = lat[i].split(",");
    }
    lat.pop();
    console.log(lat);
});
$.get('long25.csv',{},function(content){
    long=content.split('\r\n');
    for (var i = 0; i < long.length; i++){    
        long[i] = long[i].split(",");
    }
    long.pop();
    console.log(long);
});
AFRAME.registerComponent("build", {
    init: function () {
        s = document.getElementById("scene");
        var testBox = document.createElement("a-box");
        testBox.setAttribute("position", "-1 0.5 -3");
        testBox.setAttribute("rotation", "0 45 0");     
        testBox.setAttribute("material", "src: #lava");
        s.appendChild(testBox);
    }
  });
