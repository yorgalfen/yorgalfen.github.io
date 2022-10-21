AFRAME.registerComponent("build", {
    init: function () {
        s = document.getElementById("scene");
        var testBox = document.createElement("a-box");
        testBox.setAttribute("position", "-1 0.5 -3");
        testBox.setAttribute("rotation", "0 45 0");
        testBox.setAttribute("color", "#4CC3D9");
        testBox.setAttribute("material", "src: url(Lava.jpg); repeat: 60 80");
        s.appendChild(testBox);
    }
  });