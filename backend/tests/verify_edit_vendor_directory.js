const http = require("http");

function req(options, data) {
    return new Promise((resolve, reject) => {
        const r = http.request(options, res => {
            let body = "";
            res.on("data", c => body += c);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    cookies: res.headers["set-cookie"] || [],
                    data: parsed
                });
            });
        });
        r.on("error", reject);
        if (data) {
            r.write(typeof data === "string" ? data : JSON.stringify(data));
        }
        r.end();
    });
}

async function run() {
    console.log("=== VERIFYING EDIT VENDOR DIRECTORY & API ===");
    
    // 1. Login as admin
    const login = await req({
        hostname: "localhost",
        port: 3000,
        path: "/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
    }, { username: "admin", password: "Password@123" });

    if (login.status !== 200) {
        console.error("Login failed:", login.data);
        process.exit(1);
    }
    const token = login.data.token;
    const cookie = (login.cookies || []).map(c => c.split(";")[0]).join("; ");
    console.log("Admin logged in successfully!");

    // 2. Fetch /vendors/all
    const res = await req({
        hostname: "localhost",
        port: 3000,
        path: "/vendors/all",
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Cookie": cookie
        }
    });

    console.log(`/vendors/all Status: ${res.status}`);
    if (res.status !== 200 || !res.data.success) {
        console.error("Failed to fetch /vendors/all:", res.data);
        process.exit(1);
    }

    const vendors = res.data.vendors || [];
    console.log(`Retrieved ${vendors.length} vendors for the directory table.`);

    if (vendors.length > 0) {
        const v = vendors[0];
        console.log(`Checking vendor "${v.vendor_name}" (ID: ${v.vendor_id}, Code: ${v.vendor_code}):`);
        console.log(` - GST: ${v.gst_number || "none"}`);
        console.log(` - Role: ${v.commercial_role || "none"}`);
        console.log(` - Entity: ${v.legal_entity || "none"}`);
        console.log(` - Office Contact: ${v.office_contact_name || "none"} (${v.office_contact_number || "none"})`);
        console.log(` - Bank: ${v.bank_name || "none"} (A/C: ${v.bank_account_no || "none"})`);

        // Check required fields for table columns
        if (v.vendor_name === undefined || v.vendor_id === undefined) {
            throw new Error("Missing essential vendor properties");
        }
    }

    console.log("\n>>> SUCCESS: Edit Vendor directory API verification PASSED! <<<");
}

run().catch(err => {
    console.error("Verification error:", err);
    process.exit(1);
});
