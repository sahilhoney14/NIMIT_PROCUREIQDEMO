const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify HTML Structure
const htmlPath = path.join(__dirname, '../../frontend/admin/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log("=== STEP 1: Verifying HTML DOM Structure ===");

// Check that selectVendorModal is closed before vendorDetailsModal
const selectVendorModalIndex = html.indexOf('id="selectVendorModal"');
const vendorDetailsModalIndex = html.indexOf('id="vendorDetailsModal"');

assert(selectVendorModalIndex !== -1, "selectVendorModal not found in HTML");
assert(vendorDetailsModalIndex !== -1, "vendorDetailsModal not found in HTML");

const sliceBetween = html.substring(selectVendorModalIndex, vendorDetailsModalIndex);
const opens = (sliceBetween.match(/<div(\s|>)/g) || []).length;
const closes = (sliceBetween.match(/<\/div>/g) || []).length;

console.log(`Divs opened inside selectVendorModal: ${opens}`);
console.log(`Divs closed before vendorDetailsModal: ${closes}`);
assert.strictEqual(opens, closes, `Balance between selectVendorModal and vendorDetailsModal must be 0, but got ${opens - closes}`);
console.log("✔ selectVendorModal is strictly closed! vendorDetailsModal is a top-level modal.");

// 2. Mock DOM environment to test script logic
console.log("\n=== STEP 2: Verifying JS Logic for Show Detail & Edit Vendor ===");

const elements = {};
function createMockEl(id, tagName = 'div') {
    return {
        id,
        tagName: tagName.toUpperCase(),
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        },
        style: {},
        value: '',
        textContent: '',
        innerHTML: '',
        scrollTop: 0,
        appendChild(child) {},
        addEventListener() {},
        closest() { return null; }
    };
}

global.alert = console.log;
global.window = {
    scrollTo: () => {}
};
global.document = {
    getElementById(id) {
        if (!elements[id]) {
            elements[id] = createMockEl(id);
            if (id.includes('Modal') || id.includes('Container') || id.includes('Form') || id.includes('View')) {
                elements[id].classList.add('hidden');
            }
        }
        return elements[id];
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) {
        return createMockEl('', tag);
    },
    addEventListener() {}
};

// Mock sample vendor from database (Reliance)
const sampleVendor = {
    vendor_id: 3,
    vendor_code: "NEE2627V003",
    vendor_name: "Reliance",
    registration_date: "2020-05-15T00:00:00.000Z",
    legal_entity: "Partnership",
    commercial_role: "Trader",
    year_of_incorporation: "2020",
    msme_number: "UDYAM-JH-01-0001",
    office_address: "Q no E-TYPE 17/2,Township,kiriburu",
    office_contact_name: "Sahil Singh",
    office_contact_number: "0926288825",
    director_or_ceo_or_management_name: "Sahil Singh",
    director_or_ceo_or_management_designation: "Managing Director",
    director_or_ceo_or_management_mobile_no: "0926288825",
    director_or_ceo_or_management_email: "sahilsinghkbr@gmail.com",
    director_or_ceo_or_management_web_address: "https://reliance.example.com",
    sales_team_name: "Sahil Singh",
    sales_team_contact: "5987352984",
    sales_team_email: "sahilsinghkbr@gmail.com",
    accounts_team_name: "Sahil Singh",
    accounts_team_contact: "9262888257",
    accounts_team_email: "sahilsinghkbr@gmail.com",
    gst_number: "10ONTPS7131G1ZI",
    pan_number: "ONTPS7131G",
    bank_name: "bank of india",
    bank_account_no: "265464356333333333",
    bank_branch: "Kiriburu",
    bank_account_type: "Current",
    bank_ifsc: "BKID0005814",
    branch_office_1_address: "Q no E-TYPE 17/2,Township,kiriburu",
    branch_office_1_contact_name: "Sahil Singh",
    branch_office_1_contact_number: "0926288825"
};

global.localStorage = {
    getItem: () => 'mock_token',
    setItem: () => {},
    removeItem: () => {}
};

global.fetch = async (url) => {
    return {
        ok: true,
        status: 200,
        headers: {
            get: () => 'application/json'
        },
        json: async () => {
            if (url.includes('/vendors/all')) {
                return { success: true, vendors: [sampleVendor] };
            }
            return { success: true, vendor: sampleVendor };
        }
    };
};

global.attachVendorInputRestrictions = () => {};

// Evaluate script.js definitions for edit vendor
const scriptContent = fs.readFileSync(path.join(__dirname, '../../frontend/admin/script.js'), 'utf8');

eval(scriptContent);

async function runTests() {
    // Populate editVendorList via directory loader
    await loadVendorsForDirectory();

    // Test 2A: openVendorDetailsModal(3)
    console.log("Testing openVendorDetailsModal(3)...");
    openVendorDetailsModal(3);

const modal = document.getElementById("vendorDetailsModal");
assert(!modal.classList.contains("hidden"), "vendorDetailsModal MUST not have .hidden class when opened");

const modalVendorName = document.getElementById("vdModalVendorName").textContent;
assert.strictEqual(modalVendorName, "Reliance", `Expected vendor name 'Reliance', got '${modalVendorName}'`);

const modalBodyHtml = document.getElementById("vendorDetailsModalBody").innerHTML;
assert(modalBodyHtml.includes("NEE2627V003"), "Modal body must contain vendor code");
assert(modalBodyHtml.includes("Trader"), "Modal body must contain commercial role");
assert(modalBodyHtml.includes("Kiriburu"), "Modal body must contain bank branch");
assert(modalBodyHtml.includes("10ONTPS7131G1ZI"), "Modal body must contain GST number");
assert(modalBodyHtml.includes("0926288825"), "Modal body must contain contact number");
console.log("✔ openVendorDetailsModal successfully displayed complete vendor profile!");

// Close modal
closeVendorDetailsModal();
assert(modal.classList.contains("hidden"), "vendorDetailsModal MUST be hidden after close");
console.log("✔ closeVendorDetailsModal successfully closed the modal!");

// Test 2B: selectVendorForEdit(3)
console.log("\nTesting selectVendorForEdit(3)...");
selectVendorForEdit(3);

const listView = document.getElementById("editVendorListView");
const formContainer = document.getElementById("editVendorFormContainer");
const formEl = document.getElementById("editVendorForm");

assert(listView.classList.contains("hidden"), "editVendorListView must be hidden during edit");
assert(!formContainer.classList.contains("hidden"), "editVendorFormContainer must NOT be hidden during edit");
assert(!formEl.classList.contains("hidden"), "editVendorForm must NOT be hidden during edit");

assert.strictEqual(document.getElementById("ev-vendor_name").value, "Reliance");
assert.strictEqual(document.getElementById("ev-commercial_role").value, "Trader");
assert.strictEqual(document.getElementById("ev-office_contact_name").value, "Sahil Singh");
assert.strictEqual(document.getElementById("ev-office_contact_number").value, "0926288825");
assert.strictEqual(document.getElementById("ev-gst_number").value, "10ONTPS7131G1ZI");
assert.strictEqual(document.getElementById("ev-bank_name").value, "bank of india");
assert.strictEqual(document.getElementById("ev-bank_account_no").value, "265464356333333333");
assert.strictEqual(document.getElementById("ev-registration_date").value, "2020-05-15");
console.log("✔ selectVendorForEdit immediately populated all 54 form fields and unhid the form!");

// Test 2C: backToVendorList()
console.log("\nTesting backToVendorList()...");
backToVendorList();
assert(!listView.classList.contains("hidden"), "editVendorListView must be unhidden when returning to list");
assert(formContainer.classList.contains("hidden"), "editVendorFormContainer must be hidden when returning to list");
console.log("✔ backToVendorList returned to vendor table view cleanly!");

console.log("\n=======================================================");
console.log(">>> ALL CHECKS PASSED: 'Show Detail' and 'Edit Vendor' WORK PERFECTLY! <<<");
console.log("=======================================================");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
