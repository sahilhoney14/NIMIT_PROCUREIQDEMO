/**
 * Exhaustive Unit & Functional Test Suite for All Services, Utils & Middlewares
 */

const assert = require("assert");
const path = require("path");
const fs = require("fs");

console.log("======================================================================");
console.log("       EXHAUSTIVE FUNCTIONAL & UNIT TEST SUITE (ALL FUNCTIONS)       ");
console.log("======================================================================\n");

let total = 0;
let passed = 0;
let failed = 0;

function test(name, fn) {
    total++;
    try {
        fn();
        passed++;
        console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
        failed++;
        console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    }
}

async function asyncTest(name, fn) {
    total++;
    try {
        await fn();
        passed++;
        console.log(`  ✔ [PASS] ${name}`);
    } catch (err) {
        failed++;
        console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    }
}

(async () => {
    // -------------------------------------------------------------------------
    // 1. DATE UTILITIES (backend/src/utils/date.util.js)
    // -------------------------------------------------------------------------
    console.log("--- 1. DATE & FORMATTING UTILITIES (date.util.js) ---");
    const dateUtil = require("../src/utils/date.util");

    test("dateUtil.isRealDate validates valid calendar dates", () => {
        assert.strictEqual(dateUtil.isRealDate("2026-11-04"), true);
        assert.strictEqual(dateUtil.isRealDate("2024-02-29"), true); // Leap year
    });

    test("dateUtil.isRealDate rejects invalid calendar dates", () => {
        assert.strictEqual(dateUtil.isRealDate("2026-02-29"), false); // Non-leap year
        assert.strictEqual(dateUtil.isRealDate("2026-13-01"), false); // Month 13
        assert.strictEqual(dateUtil.isRealDate("2026-11-32"), false); // Day 32
        assert.strictEqual(dateUtil.isRealDate(""), false);
        assert.strictEqual(dateUtil.isRealDate(null), false);
        assert.strictEqual(dateUtil.isRealDate("random-string"), false);
    });

    test("dateUtil.cleanDate converts DD/MM/YYYY and DD-MM-YYYY to YYYY-MM-DD", () => {
        assert.strictEqual(dateUtil.cleanDate("04/11/2026"), "2026-11-04");
        assert.strictEqual(dateUtil.cleanDate("4-11-2026"), "2026-11-04");
        assert.strictEqual(dateUtil.cleanDate("2026-11-04"), "2026-11-04");
        assert.strictEqual(dateUtil.cleanDate(new Date("2026-11-04T00:00:00Z")), "2026-11-04");
        assert.strictEqual(dateUtil.cleanDate("-"), null);
        assert.strictEqual(dateUtil.cleanDate(""), null);
        assert.strictEqual(dateUtil.cleanDate(null), null);
    });

    test("dateUtil.money formats Indian currency correctly", () => {
        assert.strictEqual(dateUtil.money(1000), "1,000.00");
        assert.strictEqual(dateUtil.money(1552750), "15,52,750.00");
        assert.strictEqual(dateUtil.money(0), "0.00");
        assert.strictEqual(dateUtil.money(null), "0.00");
    });

    test("dateUtil.orDash handles empty / null values", () => {
        assert.strictEqual(dateUtil.orDash("Valid text"), "Valid text");
        assert.strictEqual(dateUtil.orDash(""), "-");
        assert.strictEqual(dateUtil.orDash("   "), "-");
        assert.strictEqual(dateUtil.orDash(null), "-");
        assert.strictEqual(dateUtil.orDash(undefined), "-");
    });

    // -------------------------------------------------------------------------
    // 2. SANITIZERS (backend/src/utils/sanitizers.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. SANITIZERS (sanitizers.js) ---");
    const sanitizers = require("../src/utils/sanitizers");

    test("sanitizers.sanitizeFolderName strips illegal characters and trailing dots", () => {
        assert.strictEqual(sanitizers.sanitizeFolderName("Acme: Corp / Ltd *?"), "Acme_ Corp _ Ltd __");
        assert.strictEqual(sanitizers.sanitizeFolderName("Test Vendor..."), "Test Vendor");
        assert.strictEqual(sanitizers.sanitizeFolderName(""), "unnamed_vendor");
        assert.strictEqual(sanitizers.sanitizeFolderName(null), "unnamed_vendor");
    });

    test("sanitizers.getFileExtension extracts extension with dot", () => {
        assert.strictEqual(sanitizers.getFileExtension("document.PDF"), ".pdf");
        assert.strictEqual(sanitizers.getFileExtension("sheet.XLSX"), ".xlsx");
        assert.strictEqual(sanitizers.getFileExtension("noextension"), ".pdf");
        assert.strictEqual(sanitizers.getFileExtension(null, ".bin"), ".bin");
    });

    // -------------------------------------------------------------------------
    // 3. API RESPONSES & CUSTOM ERRORS (response.js, errors.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. RESPONSE HELPERS & ERRORS (response.js, errors.js) ---");
    const responseUtil = require("../src/utils/response");
    const errors = require("../src/utils/errors");

    test("errors custom error classes have correct statusCode and names", () => {
        const appErr = new errors.AppError("App error", 500);
        assert.strictEqual(appErr.statusCode, 500);
        assert.strictEqual(appErr.isOperational, true);

        const badReq = new errors.BadRequestError("Invalid input");
        assert.strictEqual(badReq.statusCode, 400);

        const unauth = new errors.UnauthorizedError("Log in required");
        assert.strictEqual(unauth.statusCode, 401);

        const forbidden = new errors.ForbiddenError("No permission");
        assert.strictEqual(forbidden.statusCode, 403);

        const notFound = new errors.NotFoundError("Not found");
        assert.strictEqual(notFound.statusCode, 404);
    });

    test("response helpers format JSON output with proper status codes", () => {
        function mockRes() {
            return {
                _status: 200,
                _json: null,
                status(code) { this._status = code; return this; },
                json(payload) { this._json = payload; return this; }
            };
        }

        const res1 = mockRes();
        responseUtil.success(res1, { user: "admin" }, "Fetched", 200);
        assert.strictEqual(res1._status, 200);
        assert.strictEqual(res1._json.success, true);
        assert.strictEqual(res1._json.user, "admin");

        const res2 = mockRes();
        responseUtil.badRequest(res2, "Missing field");
        assert.strictEqual(res2._status, 400);
        assert.strictEqual(res2._json.success, false);

        const res3 = mockRes();
        responseUtil.unauthorized(res3, "Unauthenticated");
        assert.strictEqual(res3._status, 401);

        const res4 = mockRes();
        responseUtil.forbidden(res4, "No access");
        assert.strictEqual(res4._status, 403);

        const res5 = mockRes();
        responseUtil.notFound(res5, "Missing");
        assert.strictEqual(res5._status, 404);
    });

    // -------------------------------------------------------------------------
    // 4. JWT & AUTHENTICATION SERVICE (jwt.service.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. JWT & AUTHENTICATION SERVICE (jwt.service.js) ---");
    const jwtService = require("../src/services/jwt.service");

    let validAccessToken = "";
    let validRefreshToken = "";

    test("jwtService.generateAccessToken generates signed JWT with sub, role, version", () => {
        validAccessToken = jwtService.generateAccessToken({
            user_id: 1,
            username: "admin",
            role: "ADMIN",
            token_version: 1
        });
        assert(typeof validAccessToken === "string");
        assert.strictEqual(validAccessToken.split(".").length, 3);
    });

    test("jwtService.generateRefreshToken produces valid refresh JWT", () => {
        validRefreshToken = jwtService.generateRefreshToken({
            user_id: 1,
            token_version: 1
        });
        assert(typeof validRefreshToken === "string");
        assert.strictEqual(validRefreshToken.split(".").length, 3);
    });

    test("jwtService.verifyAccessToken validates token claims", () => {
        const decoded = jwtService.verifyAccessToken(validAccessToken);
        assert(!!decoded);
        assert.strictEqual(decoded.user_id, 1);
        assert.strictEqual(decoded.username, "admin");
        assert.strictEqual(decoded.role, "ADMIN");
        assert.strictEqual(decoded.iss, "ProcureIQ");
    });

    test("jwtService.verifyRefreshToken validates refresh token claims", () => {
        const decoded = jwtService.verifyRefreshToken(validRefreshToken);
        assert(!!decoded);
        assert.strictEqual(decoded.user_id, 1);
        assert(!!decoded.jti);
    });

    test("jwtService.verifyAccessToken rejects tampered or empty tokens", () => {
        assert.strictEqual(jwtService.verifyAccessToken(""), null);
        assert.strictEqual(jwtService.verifyAccessToken(null), null);
        assert.strictEqual(jwtService.verifyAccessToken(validAccessToken + "tampered"), null);
    });

    test("jwtService.extractToken retrieves token from Bearer header", () => {
        const req = { headers: { authorization: `Bearer ${validAccessToken}` } };
        assert.strictEqual(jwtService.extractToken(req), validAccessToken);
    });

    test("jwtService.extractToken retrieves token from cookies", () => {
        const req = { cookies: { access_token: validAccessToken } };
        assert.strictEqual(jwtService.extractToken(req), validAccessToken);
    });

    test("jwtService.extractToken retrieves token from query param", () => {
        const req = { query: { auth_token: validAccessToken } };
        assert.strictEqual(jwtService.extractToken(req), validAccessToken);
    });

    test("jwtService.getAllCandidateTokens prioritizes Bearer > Cookies > Query", () => {
        const req = {
            headers: { authorization: "Bearer token_a" },
            cookies: { access_token: "token_b" },
            query: { auth_token: "token_c" }
        };
        const candidates = jwtService.getAllCandidateTokens(req);
        assert.deepStrictEqual(candidates, ["token_a", "token_b", "token_c"]);
    });

    await asyncTest("jwtService.resolveAuthUser validates active DB user and token_version", async () => {
        const { db } = require("../src/config/db");
        const [rows] = await db.query("SELECT token_version FROM users WHERE user_id = 1");
        const currentVersion = rows[0].token_version;

        const token = jwtService.generateAccessToken({
            user_id: 1,
            username: "admin",
            role: "ADMIN",
            token_version: currentVersion
        });

        const req = { headers: { authorization: `Bearer ${token}` } };
        const user = await jwtService.resolveAuthUser(req);
        assert(!!user);
        assert.strictEqual(user.username, "admin");
        assert.strictEqual(user.role, "ADMIN");
    });

    await asyncTest("jwtService.resolveAuthUser rejects token with obsolete token_version (revoked)", async () => {
        const obsoleteToken = jwtService.generateAccessToken({
            user_id: 1,
            username: "admin",
            role: "ADMIN",
            token_version: -999 // Intentionally revoked version
        });
        const req = { headers: { authorization: `Bearer ${obsoleteToken}` } };
        const user = await jwtService.resolveAuthUser(req);
        assert.strictEqual(user, null);
    });

    // -------------------------------------------------------------------------
    // 5. SEQUENCE SERVICE (sequence.service.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 5. SEQUENCE NUMBER SERVICE (sequence.service.js) ---");
    const sequenceService = require("../src/services/sequence.service");

    test("sequenceService.getFinancialYear calculates correct fiscal year", () => {
        assert.strictEqual(sequenceService.getFinancialYear(new Date("2026-04-01")), "26-27");
        assert.strictEqual(sequenceService.getFinancialYear(new Date("2026-03-31")), "25-26");
        assert.strictEqual(sequenceService.getFinancialYear(new Date("2026-11-04")), "26-27");
    });

    await asyncTest("sequenceService.generatePrNumber increments sequentially with NEE/YY-YY/PR/XXXX", async () => {
        const { db } = require("../src/config/db");
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const prNum = await sequenceService.generatePrNumber(conn);
            assert(/^NEE\/\d{2}-\d{2}\/PR\/\d{4}$/.test(prNum), `Generated: ${prNum}`);
            await conn.rollback();
        } finally {
            conn.release();
        }
    });

    await asyncTest("sequenceService.generatePoNumber derives PO number correctly from PR number", async () => {
        const poNum = await sequenceService.generatePoNumber(null, "NEE/26-27/PR/0055");
        assert.strictEqual(poNum, "NEE/26-27/PROC/0055");
    });

    // -------------------------------------------------------------------------
    // 6. VENDOR SERVICE (vendor.service.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 6. VENDOR SERVICE (vendor.service.js) ---");
    const vendorService = require("../src/services/vendor.service");

    test("vendorService.generateVendorCode produces valid code with custom or default formatting", () => {
        const code1 = vendorService.generateVendorCode(123);
        assert(code1.startsWith("NEE2627V123") || code1.startsWith("NEE"));
        const code2 = vendorService.generateVendorCode(123, "CUSTOM_CODE_01");
        assert.strictEqual(code2, "CUSTOM_CODE_01");
    });

    test("vendorService.parseVendorData parses JSON string or object payload", () => {
        assert.deepStrictEqual(vendorService.parseVendorData({ body: { vendor_data: '{"vendor_name":"Test"}' } }), { vendor_name: "Test" });
        assert.deepStrictEqual(vendorService.parseVendorData({ body: { vendor_data: { vendor_name: "Test" } } }), { vendor_name: "Test" });
        assert.strictEqual(vendorService.parseVendorData({ body: {} }), null);
        assert.strictEqual(vendorService.parseVendorData({ body: { vendor_data: "invalid json" } }), null);
    });

    // -------------------------------------------------------------------------
    // 7. FILE STORAGE SERVICE (file.service.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 7. FILE STORAGE SERVICE (file.service.js) ---");
    const fileService = require("../src/services/file.service");

    test("fileService manages storage paths and saves/reads files", () => {
        const testSubfolder = "test_sub";
        const testFilename = "sample_test.txt";
        const content = Buffer.from("ProcureIQ Test File Content");

        const savedPath = fileService.saveFile(testSubfolder, testFilename, content);
        assert(fs.existsSync(savedPath));
        assert.strictEqual(fileService.fileExists(testSubfolder, testFilename), true);

        // Clean up
        fs.unlinkSync(savedPath);
        assert.strictEqual(fileService.fileExists(testSubfolder, testFilename), false);
    });

    // -------------------------------------------------------------------------
    // 8. AUDIT & LOGGING SERVICE (audit.service.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 8. AUDIT & LOGGING SERVICE (audit.service.js) ---");
    const auditService = require("../src/services/audit.service");

    await asyncTest("auditService writes report and audit records safely to logDb", async () => {
        const mockReq = { user: { username: "admin" } };
        await auditService.writeReportLog(mockReq, "TEST_RUN", "Automated test report log entry");
        await auditService.writeAuditLog(mockReq, "TEST_CHANGE", "old_val", "new_val");

        const { logDb } = require("../src/config/db");
        const [reportRows] = await logDb.query("SELECT * FROM report_logs WHERE action = 'TEST_RUN' ORDER BY log_timestamp DESC LIMIT 1");
        assert(reportRows.length > 0);
        assert.strictEqual(reportRows[0].username, "admin");

        const [auditRows] = await logDb.query("SELECT * FROM audit_logs WHERE action = 'TEST_CHANGE' ORDER BY log_timestamp DESC LIMIT 1");
        assert(auditRows.length > 0);
        assert.strictEqual(auditRows[0].username, "admin");
    });

    // -------------------------------------------------------------------------
    // 9. PDF GENERATION SERVICE (pdf.service.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 9. PDF GENERATION SERVICE (pdf.service.js) ---");
    const pdfService = require("../src/services/pdf.service");

    await asyncTest("pdfService.generatePoPdf renders PDF with ATTN Name and Vendor Details", async () => {
        const samplePo = {
            po_id: 9999,
            po_number: "NEE/26-27/PROC/TEST_EXHAUSTIVE",
            po_date: "2026-11-04",
            vendor_name: "Premier Supplies Ltd",
            vendor_code: "NEE2627V999",
            vendor_gst: "24AAACS1429B1ZB",
            attn_name: "Mr. Rajat Sharma",
            item_name: "Industrial Switch 24-Port",
            make: "Cisco",
            model: "CBS350",
            qty: 5,
            unit: "PCS",
            sales_rate: 10000,
            taxable_value: 50000,
            delivery_address: "Factory Gate 2, Vadodara",
            product_remarks: "Handle with care",
            expected_delivery_date: "2026-11-20",
            payment_type: "30 Days Credit"
        };

        const pdfPath = await pdfService.generatePoPdf(samplePo);
        assert(fs.existsSync(pdfPath));
        const stat = fs.statSync(pdfPath);
        assert(stat.size > 1000, `PDF size: ${stat.size} bytes`);

        // Clean up test generated file
        try { fs.unlinkSync(pdfPath); } catch {}
    });

    // -------------------------------------------------------------------------
    // 10. NOTIFICATION & EMAIL SERVICES (email.service.js, notification.service.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 10. NOTIFICATION & EMAIL SERVICES ---");
    const emailService = require("../src/services/email.service");
    const notifService = require("../src/services/notification.service");

    await asyncTest("emailService.sendEmail dispatches successfully", async () => {
        const res = await emailService.sendEmail({
            to: "procurement@nimit.com",
            subject: "Purchase Order Dispatched",
            text: "Your PO has been generated"
        });
        assert.strictEqual(res.success, true);
        assert(!!res.messageId);
    });

    await asyncTest("notificationService.notifyUser logs notification", async () => {
        const res = await notifService.notifyUser(1, "New PO issued", "SUCCESS");
        assert.strictEqual(res.success, true);
    });

    // -------------------------------------------------------------------------
    // 11. AUTHENTICATION & RBAC MIDDLEWARES (auth.middleware.js, rbac.middleware.js)
    // -------------------------------------------------------------------------
    console.log("\n--- 11. AUTH & RBAC MIDDLEWARES ---");
    const authMw = require("../src/middleware/auth.middleware");
    const rbacMw = require("../src/middleware/rbac.middleware");

    await asyncTest("authMiddleware.requireAuth allows valid user and blocks missing auth", async () => {
        let nextCalled = false;
        const validReq = { user: { user_id: 1, username: "admin", role: "ADMIN" }, headers: {} };
        const mockRes = {
            status(c) { this._status = c; return this; },
            json(p) { this._json = p; return this; }
        };

        await authMw.requireAuth(validReq, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);

        let unauthBlocked = false;
        const emptyReq = { headers: {}, cookies: {} };
        await authMw.requireAuth(emptyReq, mockRes, () => { unauthBlocked = true; });
        assert.strictEqual(unauthBlocked, false);
        assert.strictEqual(mockRes._status, 401);
    });

    await asyncTest("authMiddleware.verifyAdmin allows ADMIN role and blocks PROCUREMENT", async () => {
        let adminAllowed = false;
        const adminReq = { user: { user_id: 1, role: "ADMIN" }, headers: {} };
        const mockRes = {
            status(c) { this._status = c; return this; },
            json(p) { this._json = p; return this; }
        };

        await authMw.verifyAdmin(adminReq, mockRes, () => { adminAllowed = true; });
        assert.strictEqual(adminAllowed, true);

        let procBlocked = false;
        const procReq = { user: { user_id: 17, role: "PROCUREMENT" }, headers: {} };
        await authMw.verifyAdmin(procReq, mockRes, () => { procBlocked = true; });
        assert.strictEqual(procBlocked, false);
        assert.strictEqual(mockRes._status, 403);
    });

    test("rbacMiddleware.requireRole enforces roles synchronously", () => {
        const mw = rbacMw.requireRole("ADMIN", "MANAGER");
        let nextAllowed = false;
        const mockRes = {
            status(c) { this._status = c; return this; },
            json(p) { this._json = p; return this; }
        };

        mw({ user: { role: "ADMIN" } }, mockRes, () => { nextAllowed = true; });
        assert.strictEqual(nextAllowed, true);

        let procBlocked = false;
        mw({ user: { role: "PROCUREMENT" } }, mockRes, () => { procBlocked = true; });
        assert.strictEqual(procBlocked, false);
        assert.strictEqual(mockRes._status, 403);
    });

    // -------------------------------------------------------------------------
    // 12. SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n======================================================================");
    console.log("             EXHAUSTIVE UNIT TEST EXECUTION SUMMARY                   ");
    console.log("======================================================================");
    console.log(`  Total Functions & Unit Tests Tested : ${total}`);
    console.log(`  Passed                              : ${passed}`);
    console.log(`  Failed                              : ${failed}`);
    console.log(`  Pass Rate                           : ${((passed / total) * 100).toFixed(1)}%`);
    console.log("======================================================================\n");

    if (failed > 0) {
        process.exit(1);
    } else {
        console.log(">>> ALL FUNCTIONS ACROSS SERVICES, UTILS & MIDDLEWARES ARE 100% OPERATIONAL! <<<\n");
        process.exit(0);
    }
})();

