$(document).keydown(function (){
    if (event.which == 81){
        $("#camera").attr("position", `${$("#camera").attr("position").x} ${parseFloat($("#camera").attr("position").y) + 0.5} ${$("#camera").attr("position").z}`);
    }
    if (event.which == 69){
        $("#camera").attr("position", `${$("#camera").attr("position").x} ${parseFloat($("#camera").attr("position").y) - 0.5} ${$("#camera").attr("position").z}`);
    }
});
$.get('height25.csv',{},function(content){
    let lines=content.split(',');

    console.log(`File contains ${lines.length} lines`);
    console.log(`First line : ${lines[0]}`);

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
