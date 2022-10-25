 var txtFile = new XMLHttpRequest();
    txtFile.open("GET", "height25.csv", true);
    txtFile.onreadystatechange = function() {
      if (txtFile.readyState === 4) {  // Makes sure the document is ready to parse.
        if (txtFile.status === 200) {  // Makes sure it's found the file.
          allText = txtFile.responseText;
          lines = txtFile.responseText.split("\n"); // Will separate each line into an array
          alert(allText);
        }
      }
    }

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
