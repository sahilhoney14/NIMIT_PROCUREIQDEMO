const ExcelJS = require('exceljs');

const BASE_URL = 'http://localhost:3000';

async function runVendorExportTests() {
    console.log('======================================================');
    console.log('   VENDOR DIRECTORY EXPORT (EXCEL & PDF) TEST SUITE   ');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            console.log(`  [PASS] ${msg}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${msg}`);
            failed++;
        }
    }

    // 1. Unauthenticated test (expect 401)
    try {
        const res = await fetch(`${BASE_URL}/vendors/export/excel`);
        assert(res.status === 401, 'Unauthenticated GET /vendors/export/excel rejected with 401');
    } catch (e) {
        assert(false, `Unauthenticated test failed: ${e.message}`);
    }

    try {
        const res = await fetch(`${BASE_URL}/vendors/export/pdf`);
        assert(res.status === 401, 'Unauthenticated GET /vendors/export/pdf rejected with 401');
    } catch (e) {
        assert(false, `Unauthenticated PDF test failed: ${e.message}`);
    }

    // 2. Login as Admin
    let token = '';
    try {
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'Password@123' })
        });
        const data = await loginRes.json();
        token = data.token;
        assert(loginRes.ok && token, 'Logged in as Admin and obtained JWT token');
    } catch (e) {
        assert(false, `Login failed: ${e.message}`);
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 3. Export Excel (All vendors)
    try {
        const res = await fetch(`${BASE_URL}/vendors/export/excel`, { headers: authHeaders });
        assert(res.status === 200, 'GET /vendors/export/excel returned 200 OK');
        assert(
            res.headers.get('content-type')?.includes('spreadsheetml.sheet'),
            'Excel response has proper OpenXML Content-Type'
        );
        assert(
            res.headers.get('content-disposition')?.includes('Vendor_Directory_') &&
            res.headers.get('content-disposition')?.endsWith('.xlsx"'),
            'Excel response has Content-Disposition attachment with .xlsx filename'
        );

        const arrayBuf = await res.arrayBuffer();
        assert(arrayBuf.byteLength > 2000, `Excel file received with valid payload (${arrayBuf.byteLength} bytes)`);

        // Inspect workbook structure with ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Buffer.from(arrayBuf));
        const sheet = workbook.getWorksheet('Vendor Master');
        assert(!!sheet, 'Workbook contains "Vendor Master" worksheet');

        const titleVal = sheet.getCell('A1').value;
        assert(
            typeof titleVal === 'string' && titleVal.includes('VENDOR MASTER & DIRECTORY REPORT'),
            `Sheet A1 title correctly formatted: "${titleVal}"`
        );

        const colHeaderVendorName = sheet.getCell('C4').value;
        assert(colHeaderVendorName === 'Vendor Name', `Header row contains "Vendor Name" at column C: "${colHeaderVendorName}"`);

        const vendorCount = sheet.rowCount - 4; // Minus 4 header/meta rows
        assert(vendorCount >= 3, `Exported sheet contains vendor data rows (found ${vendorCount} data rows)`);
    } catch (e) {
        assert(false, `Excel export test failed: ${e.message}`);
    }

    // 4. Export PDF (All vendors)
    try {
        const res = await fetch(`${BASE_URL}/vendors/export/pdf`, { headers: authHeaders });
        assert(res.status === 200, 'GET /vendors/export/pdf returned 200 OK');
        assert(
            res.headers.get('content-type') === 'application/pdf',
            'PDF response has "application/pdf" Content-Type'
        );
        assert(
            res.headers.get('content-disposition')?.includes('Vendor_Directory_') &&
            res.headers.get('content-disposition')?.endsWith('.pdf"'),
            'PDF response has Content-Disposition attachment with .pdf filename'
        );

        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const isPdfMagic = buf.slice(0, 4).toString() === '%PDF';
        assert(isPdfMagic, 'PDF payload has valid %PDF- magic signature header');
        assert(arrayBuf.byteLength > 1000, `PDF file received with valid payload (${arrayBuf.byteLength} bytes)`);
    } catch (e) {
        assert(false, `PDF export test failed: ${e.message}`);
    }

    // 5. Filtered Excel export (role=Trader)
    try {
        const res = await fetch(`${BASE_URL}/vendors/export/excel?role=Trader`, { headers: authHeaders });
        assert(res.status === 200, 'Filtered GET /vendors/export/excel?role=Trader returned 200');
        const arrayBuf = await res.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Buffer.from(arrayBuf));
        const sheet = workbook.getWorksheet('Vendor Master');
        const rows = sheet.rowCount - 4;
        assert(rows >= 1, `Filtered Excel export produced matching rows (found ${rows} vendors)`);
    } catch (e) {
        assert(false, `Filtered Excel test failed: ${e.message}`);
    }

    // 6. Filtered PDF export (search=Reliance)
    try {
        const res = await fetch(`${BASE_URL}/vendors/export/pdf?search=Reliance`, { headers: authHeaders });
        assert(res.status === 200, 'Filtered GET /vendors/export/pdf?search=Reliance returned 200');
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        assert(buf.slice(0, 4).toString() === '%PDF', 'Filtered PDF has valid %PDF signature');
    } catch (e) {
        assert(false, `Filtered PDF test failed: ${e.message}`);
    }

    console.log('\n======================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================');

    if (failed > 0) process.exit(1);
}

runVendorExportTests().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
});
