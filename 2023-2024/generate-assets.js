const fs = require("fs");

const DATA_FILES = {
    height: "height.csv",
    latl: "latleft.csv",
    latr: "latright.csv",
    longl: "longleft.csv",
    longr: "longright.csv",
    route: "routen.csv",
    comms: "comms.csv",
    slope: "slope.csv",
};

var content = "";

for (let [key, value] of Object.entries(DATA_FILES)) {
    try {
        const data = fs.readFileSync(value, "utf8");

        let entries = data.split("\n");
        let result = [];
        for (let i = 0; i < entries.length; i++) {
            // Skip empty lines
            if (entries[i].length === 0) {
                continue;
            }

            let obj = entries[i].split(",").map((entry) => {
                // Parse entry as a float if it is a valid float (as in height.csv)
                if (!isNaN(entry) && entry.toString().indexOf(".") != -1) {
                    return parseFloat(entry);
                } else {
                    // Otherwise, leave it as a string
                    return entry;
                }
            });
            result.push(obj);
        }
        // Convert an 2D array of length one to a 1D array
        if (result.length === 1) {
            result = result[0];
        }

        // Write result encoded as JSON
        let jsonPath = value.replace(/\.csv/, ".json");
        let table = JSON.stringify(result);
        fs.writeFileSync(jsonPath, table);
    } catch (err) {
        console.error(err);
    }
}
