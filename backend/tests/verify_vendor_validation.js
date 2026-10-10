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
    console.log("=== VERIFYING VENDOR VALIDATION API ===");
    
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
    console.log("Login successful! Token acquired.");

    // 2. Submit vendor with numbers in person names and invalid phone numbers
    // In POST /vendors, vendor_data is passed either as JSON or form field
    // When using multipart/form-data or application/x-www-form-urlencoded
    const boundary = "----WebKitFormBoundaryVendorTest123";
    const invalidVendorData = {
        vendor_name: "123456", // Pure numbers
        office_address: "123 Main St",
        office_contact_name: "John123 Doe", // Contains numbers
        office_contact_number: "98765", // Not 10 digits
        legal_entity: "Private Limited",
        commercial_role: "Manufacturer",
        year_of_incorporation: "2020",
        director_or_ceo_or_management_name: "Director 99", // Contains numbers
        director_or_ceo_or_management_designation: "CEO",
        director_or_ceo_or_management_mobile_no: "1234567890",
        director_or_ceo_or_management_email: "director@test.com",
        sales_team_name: "Sales",
        sales_team_contact: "9876543210",
        sales_team_email: "sales@test.com",
        accounts_team_name: "Accounts",
        accounts_team_contact: "9876543210",
        accounts_team_email: "accounts@test.com",
        gst_number: "27AAAAA0000A1Z5",
        pan_number: "AAAAA0000A",
        bank_name: "HDFC Bank",
        bank_account_no: "123456789012",
        bank_branch: "Mumbai",
        bank_account_type: "Current",
        bank_ifsc: "HDFC0001234",
        branch_office_1_address: "Branch 1",
        turnover_year_1: "26-27",
        turnover_value_1: "1000000",
        recommended_by: "Recommender 1", // Contains numbers
        approved_by: "Approver",
        registration_date: "2024-01-01"
    };

    const postPayload = JSON.stringify(invalidVendorData);
    
    // Test multipart submission with invalid data
    const bodyParts = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="vendor_data"`,
        "",
        postPayload,
        `--${boundary}--`,
        ""
    ];
    const multipartBody = bodyParts.join("\r\n");

    const res = await req({
        hostname: "localhost",
        port: 3000,
        path: "/vendors",
        method: "POST",
        headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Authorization": `Bearer ${token}`,
            "Cookie": cookie,
            "Content-Length": Buffer.byteLength(multipartBody)
        }
    }, multipartBody);

    console.log(`Validation test result status: ${res.status}`);
    console.log(`Validation response message:`, res.data?.message);
    console.log(`Missing documents:`, res.data?.missing_documents);
    console.log(`Invalid fields:`, res.data?.invalid_fields);

    let hasNameError = (res.data?.invalid_fields || []).some(msg => msg.includes("cannot contain numbers"));
    let hasVendorNameError = (res.data?.invalid_fields || []).some(msg => msg.includes("Vendor name cannot be only numbers"));
    let hasPhoneError = (res.data?.invalid_fields || []).some(msg => msg.includes("must be a valid 10-digit number"));

    if (res.status === 400 && hasNameError && hasVendorNameError && hasPhoneError) {
        console.log("\n>>> SUCCESS: All name, number, and format rejection checks PASSED perfectly! <<<");
    } else {
        console.error("Test failed, response:", res.data);
        process.exit(1);
    }
}

run().catch(err => {
    console.error("Test error:", err);
    process.exit(1);
});
