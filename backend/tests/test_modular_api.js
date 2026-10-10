const http = require("http");

async function testModularApi() {
    console.log("=== TESTING MODULAR /API ROUTES ===");

    // 1. Login as Admin
    const loginRes = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "Password@123" })
    });
    const { token } = await loginRes.json();
    const headers = { "Authorization": `Bearer ${token}` };

    const routes = [
        { path: "/api/users", method: "GET", role: "ADMIN" },
        { path: "/api/vendors", method: "GET", role: "ADMIN" },
        { path: "/api/purchase-orders", method: "GET", role: "ADMIN" },
        { path: "/api/goods-received", method: "GET", role: "ADMIN" },
        { path: "/api/approvals", method: "GET", role: "ADMIN" },
        { path: "/api/inquiries", method: "GET", role: "ADMIN" },
        { path: "/api/report-logs", method: "GET", role: "ADMIN" },
        { path: "/api/pr", method: "GET", role: "ADMIN" }
    ];

    for (const r of routes) {
        try {
            const res = await fetch(`http://localhost:3000${r.path}`, {
                method: r.method,
                headers
            });
            let data = null;
            try {
                data = await res.json();
            } catch {
                data = await res.text();
            }
            console.log(`[${res.status}] ${r.method} ${r.path} -> success: ${data?.success !== undefined ? data.success : true}`);
        } catch (err) {
            console.error(`Error on ${r.path}:`, err.message);
        }
    }
}

testModularApi();
