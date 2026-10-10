const http = require("http");

async function runUploadSecurityTests() {
    console.log("=== TESTING FILE UPLOAD SECURITY HARDENING ===");

    // Login as Procurement
    const loginRes = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "procurement", password: "Password@123" })
    });
    const { token } = await loginRes.json();

    // 1. Attempt uploading .exe to /purchase-requests/import-preview
    const boundary = "---------------------------974767299852498929531610575";
    const bodyExe = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="payload.exe"',
        'Content-Type: application/x-msdownload',
        '',
        'MZ...dummy-binary-content...',
        `--${boundary}--`
    ].join("\r\n");

    const exeRes = await fetch("http://localhost:3000/purchase-requests/import-preview", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: bodyExe
    });

    const exeData = await exeRes.json();
    console.log("Upload .exe to PR preview -> Status:", exeRes.status, "Response:", exeData);

    if (exeRes.status === 400 && exeData.message.includes("not permitted")) {
        console.log("  [PASS] Successfully rejected dangerous .exe file extension!");
    } else {
        console.log("  [FAIL] Failed to reject .exe file!");
        process.exit(1);
    }

    // 2. Attempt uploading .php to /vendors/import-preview
    const bodyPhp = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="shell.php"',
        'Content-Type: application/x-php',
        '',
        '<?php echo "test"; ?>',
        `--${boundary}--`
    ].join("\r\n");

    const phpRes = await fetch("http://localhost:3000/vendors/import-preview", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: bodyPhp
    });

    const phpData = await phpRes.json();
    console.log("Upload .php to Vendor preview -> Status:", phpRes.status, "Response:", phpData);

    if (phpRes.status === 400 && phpData.message.includes("not permitted")) {
        console.log("  [PASS] Successfully rejected dangerous .php file extension!");
    } else {
        console.log("  [FAIL] Failed to reject .php file!");
        process.exit(1);
    }

    // 3. Attempt uploading valid Excel file to PR preview
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("PR");
    sheet.addRow(["pr_date", "party_name", "location", "territory", "product_category", "item_name", "product_remarks", "make", "model", "qty", "unit", "sales_rate"]);
    sheet.addRow(["2026-10-10", "Test Party", "Mumbai", "West", "Electronics", "Capacitor", "Urgent", "Havells", "CAP-100", 10, "PCS", 50]);
    const buffer = await workbook.xlsx.writeBuffer();

    const formData = new FormData();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    formData.append("file", blob, "test_pr.xlsx");

    const validExcelRes = await fetch("http://localhost:3000/purchase-requests/import-preview", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData
    });

    const validExcelData = await validExcelRes.json();
    console.log("Upload valid .xlsx to PR preview -> Status:", validExcelRes.status, "Success:", validExcelData.success);

    if (validExcelRes.status === 200 && validExcelData.success === true) {
        console.log("  [PASS] Successfully accepted valid .xlsx spreadsheet!");
    } else {
        console.log("  [FAIL] Valid .xlsx rejected:", validExcelData);
        process.exit(1);
    }

    console.log("\n>>> ALL FILE UPLOAD SECURITY TESTS PASSED! <<<");
}

runUploadSecurityTests().catch(err => {
    console.error("Test error:", err);
    process.exit(1);
});
