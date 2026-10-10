const fs = require("fs");
const path = require("path");

const filesToScan = [
    path.resolve(__dirname, "../src/app.js"),
    ...fs.readdirSync(path.resolve(__dirname, "../src/modules"), { recursive: true })
        .filter(f => f.endsWith(".js"))
        .map(f => path.resolve(__dirname, "../src/modules", f))
];

console.log(`Scanning ${filesToScan.length} files for SQL query safety...`);

let suspicious = [];

filesToScan.forEach(filePath => {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return;
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    
    lines.forEach((line, idx) => {
        // Look for execute or query calls
        if (/(execute|query)\s*\(\s*`[^`]*\${/.test(line)) {
            // Found a template string interpolation inside execute/query
            suspicious.push({
                file: path.relative(path.resolve(__dirname, ".."), filePath),
                line: idx + 1,
                content: line.trim()
            });
        }
    });
});

console.log(`Found ${suspicious.length} query lines with template interpolations:`);
suspicious.forEach(s => {
    console.log(`${s.file}:${s.line} -> ${s.content}`);
});
