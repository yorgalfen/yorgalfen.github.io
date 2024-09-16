const UT_OFFSET = 0;
const ER = 6378.137; // Earth's radius in km
function ephLineToObj(lin,body){
    let data = {};
    let y = parseFloat(lin.slice(1,5));
    let monWord = lin.slice(6,9);
    let mo;
    if(monWord=="Jan"){
        mo = 1;
    }else if(monWord=="Feb"){
        mo = 2;
    }else if(monWord=="Mar"){
        mo = 3;
    }else if(monWord=="Apr"){
        mo = 4;
    }else if(monWord=="May"){
        mo = 5;
    }else if(monWord=="Jun"){
        mo = 6;
    }else if(monWord=="Jul"){
        mo = 7;
    }else if(monWord=="Aug"){
        mo = 8;
    }else if(monWord=="Sep"){
        mo = 9;
    }else if(monWord=="Oct"){
        mo = 10;
    }else if(monWord=="Nov"){
        mo = 11;
    }else if(monWord=="Dec"){
        mo = 12;
    }
    let d = parseFloat(lin.slice(10,12));
    let h = parseFloat(lin.slice(13,15)); 
    let m = parseFloat(lin.slice(16,18));
    let s = parseFloat(lin.slice(19,25));
    let datStart;
    if(Number.isNaN(s)){ // Case if Horizons didn't specify the second value
        datStart = 23;
        s = 0;
    }else if(lin.indexOf(".")<25){ // Case if Horizons specified digits after the decimal point for the seconds
        datStart = 30;
    }else{ // Case if Horizons specified an integer second value with two digits
        datStart = 26;
    }
    let vals = lin.slice(datStart).split(" ").filter(ele => ele!="").map(parseFloat);
    let ra = HMStoRad(vals[0],vals[1],vals[2]);
    let dec = DMStoRad(vals[3],vals[4],vals[5]);
    if(body=="Sun"){
        data.gast = HMStoRad(vals[6],vals[7],vals[8]);
        data.dis = vals[9]*149597870.7;
    }else if(body=="Moon"){
        data.subLon = vals[6]*(Math.PI/180);
        data.subLat = vals[7]*(Math.PI/180);
        data.dis = vals[8]*149597870.7;
    }
    return {
        y: y,
        mo: mo,
        d: d,
        h: h,
        m: m,
        s: s,
        ra: ra,
        dec: dec,
        data: data
    };
}
function commence(){
    const time = new Date();
    $.ajax(
            {
                url: `https://corsproxy.io/?https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='10'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='coord@399'&COORD_TYPE='GEODETIC'&SITE_COORD='0,0,-6378.137'&START_TIME='2024-01-01%2006:00:30%20UT'&STOP_TIME='2024-12-31%2006:00:30'&STEP_SIZE='12%20h'&QUANTITIES='2,7,20'&EXTRA_PREC='YES'`,
                method: "GET",
                success: function(result, status, xhr){
                    let fistr = "";
                    console.log(result);
                    let out = result.slice(result.indexOf("$$SOE")+5,result.indexOf("$$EOE"));
                    console.log(out);
                    out = out.split("\n");
                    console.log(out);
                    for(let i = 0; i<out.length; i++){
                        let ar = Array.from(out[i].substring(23)).filter(char => char.charCodeAt(0)<58).join('');
                        if(i==2){
                            console.log(ar);
                        }
                        ar = ar.split(" ").filter(ele => ele!="").map(parseFloat);
                        let ra = HMStoRad(ar[0],ar[1],ar[2]);
                        let dec = DMStoRad(ar[3],ar[4],ar[5]);
                        let gast = HMStoRad(ar[6],ar[7],ar[8]);
                        let UT = parseFloat(out[i].substring(13,15))*(Math.PI/24);
                        console.log("UT: " + UT);
                        console.log("GAST: " + gast);
                        console.log("RA: " + ra);
                        let EOT = gast - ra - UT + Math.PI;
                        EOT-= Math.round(EOT/(Math.PI/12))*(Math.PI/12);
                        fistr+=","+(EOT*(720/Math.PI));
                    }
                    console.log(fistr.split(",").map(parseFloat));
                },
                complete: function(){
                }
            }
        );
}
function HMStoRad(h,m,s){
    return (h*3600 + m*60 + s)*(Math.PI/43200);
}
function DMStoRad(d,m,s){
    return (d+m/60+s/3600)*(Math.PI/180);
}
function coordObs(la,lo,r){
    let b = ER*Math.cos(la)*Math.cos(lo);
    let rho = b + Math.sqrt(b*b-ER*ER+r*r);
    return {
        x: rho*Math.cos(la)*Math.cos(lo),
        y: rho*Math.sin(la),
        z: rho*Math.cos(la)*Math.sin(lo)
    }
}
function coord(la,lo,rho){
    return {
        x: rho*Math.cos(la)*Math.cos(lo),
        y: rho*Math.sin(la),
        z: rho*Math.cos(la)*Math.sin(lo)
    }
}
$(document).keydown(() => {
    switch(event.which){
        case 84:{
            
            let nTime = prompt("Enter a new time in the format YYYY MM DD HH MM SS. It will be taken as UTC.");
            let comps = nTime.split(" ").map(parseFloat);
            let GAST = 0;
            let UT = 0;
            $.ajax(
                {
                    url: `https://corsproxy.io/?https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='10'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='coord@399'&COORD_TYPE='GEODETIC'&SITE_COORD='0,0,0'&TLIST='${comps[0]}-${comps[1]}-${comps[2]}%20${comps[3]}:${comps[4]}:${comps[5]}'&QUANTITIES='2,7,20'&EXTRA_PREC='YES'`,
                    method: "GET",
                    success: function(result, status, xhr){
                        let start = new Date();
                        let out = result.slice(result.indexOf("$$SOE")+5,result.indexOf("$$EOE"));
                        out = out.split("\n").filter(ele => ele!="");
                        out = ephLineToObj(out[0],"Sun");
                        UT = HMStoRad(out.h,out.m,out.s);
                        GAST = out.data.gast;
                        let subSolLong = GAST - out.ra;
                        console.log("Lat: " + out.dec*(180/Math.PI));
                        console.log("Long: " + (subSolLong*(180/Math.PI))%360);
                        let cord = coordObs(out.dec,subSolLong,out.data.dis);
                        console.log(cord);
                        // $("#sol").attr("position",`${cord.x} ${cord.y} ${cord.z}`);
                        // $("#lux").attr("position",`${cord.x/2} ${cord.y/2} ${cord.z/2}`);
                        $("#caelum").attr("rotation", `0 ${GAST*(-180/Math.PI)} 0`);
                        $("#sol")[0].getObject3D("mesh").position.set(cord.x,cord.y,cord.z);
                        $("#lux")[0].getObject3D("light").position.set(cord.x/2,cord.y/2,cord.z/2);
                        // const Pos = $("#sol")[0].object3D.position;
                        // Pos.x = cord.x;
                        // Pos.y = cord.y;
                        // Pos.z = cord.z;
                        // const Po = $("#lux")[0].object3D.position;
                        // Po.x = cord.x/2;
                        // Po.y = cord.y/2;
                        // Po.z = cord.y/2;
                        console.log("Took " + (new Date() - start) + "ms to do the Sun.");
                    },
                    complete: function(){
                        $.ajax(
                            {
                                url: `https://corsproxy.io/?https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='301'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&TLIST='${comps[0]}-${comps[1]}-${comps[2]}%20${comps[3]}:${comps[4]}:${comps[5]}'&QUANTITIES='2,14,20'&EXTRA_PREC='YES'`,
                                method: "GET",
                                success: function(resul, status, xhr){
                                    let start = new Date();
                                    let out = resul.slice(resul.indexOf("$$SOE")+5,resul.indexOf("$$EOE"));
                                    out = out.split("\n").filter(ele => ele!="");
                                    out = ephLineToObj(out[0],"Moon");
                                    let subLunLong = GAST - out.ra;
                                    console.log("Lat: " + out.dec*(180/Math.PI));
                                    console.log("Long: " + subLunLong*(180/Math.PI));
                                    let cord = coord(out.dec,subLunLong,out.data.dis);
                                    console.log(cord);
                                    // $("#luna").attr("position",`${cord.x} ${cord.y} ${cord.z}`);
                                    $("#luna")[0].getObject3D("mesh").position.set(cord.x,cord.y,cord.z);
                                    // const Pos = $("#luna")[0].object3D.position;
                                    // Pos.x = cord.x;
                                    // Pos.y = cord.y;
                                    // Pos.z = cord.z;
                                    console.log("Took " + (new Date() - start) + "ms to do the Moon.");
                                },
                                complete: function(){
                                    // $(".cull").each(function(){
                                    //     const mesh = this.getObject3D("mesh");
                                    //     console.log(mesh);
                                    //     this.getObject3D("mesh").frustumCulled = false;
                                    //     console.log("Run on " + this.id);
                                    // });
                                }
                            }
                        );
                    }
                }
            );
        }

    }
});