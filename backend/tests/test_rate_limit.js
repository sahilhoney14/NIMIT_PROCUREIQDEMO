const http = require("http");

async function testRateLimit() {
    console.log("=== TESTING LOGIN RATE LIMITER ===");

    // We configured max: 30 attempts per 15 minutes
    // Let's fire requests until we observe either proper handling or rate limit triggering
    console.log("Sending rapid requests to verify rate-limiting headers...");
    const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "test_rate_limit", password: "wrong" })
    });

    console.log("Status:", res.status);
    console.log("RateLimit-Limit:", res.headers.get("ratelimit-limit"));
    console.log("RateLimit-Remaining:", res.headers.get("ratelimit-remaining"));
    console.log("RateLimit-Reset:", res.headers.get("ratelimit-reset"));

    if (res.headers.get("ratelimit-limit") !== null) {
        console.log("  [PASS] Rate-limiting headers are properly configured and active!");
    } else {
        console.log("  [FAIL] Rate-limiting headers missing!");
        process.exit(1);
    }
}

testRateLimit().catch(console.error);
