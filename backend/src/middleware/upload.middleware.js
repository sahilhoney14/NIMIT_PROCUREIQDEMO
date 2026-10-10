const multer = require("multer");
const path = require("path");

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".xls",
    ".xlsx",
    ".doc",
    ".docx"
]);

const ALLOWED_EXCEL_EXTENSIONS = new Set([
    ".xls",
    ".xlsx"
]);

function documentFileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ext || !ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
        const err = new Error(`File type '${ext || "unknown"}' is not permitted. Allowed extensions: PDF, PNG, JPG, JPEG, XLS, XLSX, DOC, DOCX`);
        err.statusCode = 400;
        return cb(err);
    }
    cb(null, true);
}

function excelFileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ext || !ALLOWED_EXCEL_EXTENSIONS.has(ext)) {
        const err = new Error(`File type '${ext || "unknown"}' is not permitted. Only Excel files (.xls, .xlsx) are allowed.`);
        err.statusCode = 400;
        return cb(err);
    }
    cb(null, true);
}

const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: documentFileFilter
});

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: excelFileFilter
});

function getVendorDocuments() {
    return memoryUpload.fields([
        { name: "gst_document", maxCount: 1 },
        { name: "pan_document", maxCount: 1 },
        { name: "msme_document", maxCount: 1 },
        { name: "itr_last_year_document", maxCount: 1 },
        { name: "itr_second_last_year_document", maxCount: 1 },
        { name: "itr_third_last_year_document", maxCount: 1 }
    ]);
}

const uploadExcel = excelUpload.single("file");

module.exports = {
    ALLOWED_DOCUMENT_EXTENSIONS,
    ALLOWED_EXCEL_EXTENSIONS,
    documentFileFilter,
    excelFileFilter,
    memoryUpload,
    excelUpload,
    getVendorDocuments,
    uploadExcel
};
