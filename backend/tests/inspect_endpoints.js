const fs = require("fs");
const path = require("path");

const appContent = fs.readFileSync(path.resolve(__dirname, "../src/app.js"), "utf8");
const lines = appContent.split(/\r?\n/);

const routes = [];
const regex = /app\.(get|post|put|delete|patch)\(\s*(?:\[([^\]]+)\]|["'`]([^"'`]+)["'`])/;

lines.forEach((line, index) => {
    const match = line.match(regex);
    if (match) {
        const method = match[1].toUpperCase();
        const route = match[2] || match[3];
        // extract middleware
        routes.push({
            line: index + 1,
            method,
            route: route.trim(),
            raw: line.trim()
        });
    }
});

console.log(`Found ${routes.length} route declarations in app.js:`);
routes.forEach(r => console.log(`Line ${r.line}: [${r.method}] ${r.route} -> ${r.raw}`));
