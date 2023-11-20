console.log(`jQuery version: ${$.fn.jquery.split(" ")[0]}`);
$(document).ready(function(){
    $("#scheme").on("change", function(){
        let sch = $("#scheme").val();
        switch(sch){
            case "slo": {
                $(".nolif").css("display","block");
                $("#gris").css("display","none");
                $("#red-exp").html("Slopes near the high end of the gradient or above the gradient's maximum value.");
                $("#gre-exp").html("Slopes near the low end of the gradient or below the gradient's minimum value.");
                $("#yel-exp").html("Slopes near the middle of the gradient.");
                break;
            }
            case "lif": {
                $(".nolif").css("display","none");
                $("#gris").css("display","inline");
                break;
            }
            case "hei": {
                $(".nolif").css("display","block");
                $("#gris").css("display","none");
                $("#red-exp").html("Squares near the region's minimum elevation of 2796.34 meters.");
                $("#gre-exp").html("Squares near the region's maximum elevation of 6463.86 meters.");
                $("#yel-exp").html("Elevations near the middle of the gradient.");
                break;
            }
            case "ele": {
                $(".nolif").css("display","block");
                $("#gris").css("display","none");
                $("#gre-exp").html("Squares near the region's minimum elevation angle to Earth of 9.998&deg;");
                $("#red-exp").html("Squares near the region's maximum elevation angle to Earth of 10.529&deg;");
                $("#yel-exp").html("Elevation angles to Earth near the middle of the gradient.");
                break;
            }
            case "azi": {
                $(".nolif").css("display","block");
                $("#gris").css("display","none");
                $("#red-exp").html("Squares near the region's maximum azimuth angle to Earth of 36.764&deg;");
                $("#gre-exp").html("Squares near the region's minimum azimuth angle to Earth of 27.620&deg;");
                $("#yel-exp").html("Azimuth angles to Earth near the middle of the gradient.");
                break;
            }
        }
})});