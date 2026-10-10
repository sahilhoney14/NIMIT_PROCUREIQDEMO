const fs = require("fs");
const path = require("path");

function findRouteFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            results = results.concat(findRouteFiles(full));
        } else if (file.endsWith(".routes.js")) {
            results.push(full);
        }
    });
    return results;
}

const routeFiles = findRouteFiles(path.resolve(__dirname, "../src/modules"));
console.log(`Found ${routeFiles.length} module route files:`);

routeFiles.forEach(file => {
    const rel = path.relative(path.resolve(__dirname, "../src"), file);
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((l, idx) => {
        if (/router\.(get|post|put|delete|patch)/.test(l)) {
            console.log(`${rel}:${idx+1} -> ${l.trim()}`);
        }
    });
});
