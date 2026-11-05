const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const poFolder = path.resolve(__dirname, "../../purchase-orders");
const headerImgPath = path.resolve(__dirname, "../../PO header.png");
const fontDir = path.resolve(__dirname, "../../fonts");

function generatePoPdf(po) {
    return new Promise((resolve, reject) => {
        try {
            fs.mkdirSync(poFolder, { recursive: true });
            const safeFileName = String(po.po_number || "PO").replace(/[\/\\:*?"<>|]/g, "_") + ".pdf";
            const outputPath = path.join(poFolder, safeFileName);
            const doc = new PDFDocument({ size: [612, 792], margin: 0 });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            doc.registerFont("Arial", path.join(fontDir, "ARIAL.TTF"));
            doc.registerFont("Arial-Bold", path.join(fontDir, "ARIALBD.TTF"));
            doc.registerFont("Calibri", path.join(fontDir, "CALIBRI.TTF"));
            doc.registerFont("Calibri-Bold", path.join(fontDir, "CALIBRIB.TTF"));

            function fmtDate(val) {
                if (!val) return "-";
                if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                    const parts = val.slice(0, 10).split("-");
                    return `${parts[2]}.${parts[1]}.${parts[0]}`;
                }
                const d = new Date(val);
                if (isNaN(d.getTime())) return String(val);
                return d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }).replace(/\//g, ".");
            }

            function fmtCur(val) {
                return Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            function line(x1, y1, x2, y2) {
                doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
            }

            function rect(x, y, w, h) {
                doc.rect(x, y, w, h).stroke();
            }

            doc.lineWidth(1);

            // 1. Company letterhead image
            if (fs.existsSync(headerImgPath)) {
                doc.image(headerImgPath, 50.4, 54, {
                    width: 504.8,
                    height: 79
                });
            }

            const ML = 85.6;
            const MR = 524;
            const MW = MR - ML;

            // 2. Title box
            const titleY = 192.2;
            const titleH = 21.9;
            rect(ML, titleY, MW, titleH);
            doc.font("Arial-Bold")
                .fontSize(15.24)
                .text("PURCHASE ORDER", ML, titleY + 3.5, {
                    width: MW,
                    align: "center",
                    lineBreak: false
                });

            // 3. Vendor block (left) and PO reference block (right)
            const vendorY = 214.1;
            const vendorH = 84;
            rect(ML, vendorY, MW, vendorH);

            const splitX = 316.3; // Matches lower table column 2 border cleanly
            const colDivider = 390; // Balanced divider giving ~74pt for labels and ~126pt for dynamic values

            line(splitX, vendorY, splitX, vendorY + vendorH);
            line(colDivider, vendorY, colDivider, vendorY + vendorH);

            // Left: Vendor details
            doc.font("Arial-Bold").fontSize(9).text("TO,", ML + 4, vendorY + 4, { lineBreak: false });
            const vendorName = String(po.vendor_name || "").trim();
            const vendorAddress = String(po.vendor_address || "").trim();
            const vendorGst = String(po.vendor_gst || po.gst_number || "").trim();

            let vendorTextY = vendorY + 16;
            if (vendorName) {
                let nameSize = 8.5;
                doc.font("Arial-Bold");
                while (nameSize > 6.5 && doc.fontSize(nameSize).widthOfString(vendorName) > splitX - ML - 8) {
                    nameSize -= 0.2;
                }
                doc.fontSize(nameSize).text(vendorName, ML + 4, vendorTextY, { width: splitX - ML - 8, lineBreak: false });
                vendorTextY += 12;
            }
            if (vendorAddress) {
                let addrSize = 8.0;
                doc.font("Arial");
                let addrH = doc.fontSize(addrSize).heightOfString(vendorAddress, { width: splitX - ML - 8, lineGap: 1 });
                while (addrH > 38 && addrSize > 6.5) {
                    addrSize -= 0.3;
                    addrH = doc.fontSize(addrSize).heightOfString(vendorAddress, { width: splitX - ML - 8, lineGap: 1 });
                }
                doc.fontSize(addrSize).text(vendorAddress, ML + 4, vendorTextY, { width: splitX - ML - 8, lineGap: 1 });
                vendorTextY += addrH + 4;
            }
            if (vendorGst) {
                doc.font("Arial-Bold").fontSize(8.5).text(`GST: ${vendorGst}`, ML + 4, Math.min(vendorTextY, vendorY + vendorH - 12), { width: splitX - ML - 8, lineBreak: false });
            }

            // Right: Order References Table (4 rows x 21pt height = 84pt)
            const companyGst = process.env.GST_NUMBER || "24AMHPS5080K1ZO";
            const rowH = 21;
            const poNumberDisplay = (po.revision_number && Number(po.revision_number) > 0)
                ? `${po.po_number || "-"} - Rev ${po.revision_number}`
                : (po.po_number || "-");
            const refRows = [
                { label: "REF. P.O. NO.", val: poNumberDisplay, boldVal: true },
                { label: "P.O. DATE",      val: fmtDate(po.po_date || po.created_at) },
                { label: "GST NO.",        val: companyGst },
                { label: "VENDOR CODE",    val: po.vendor_code || "-" }
            ];

            const availLabelWidth = colDivider - splitX - 6;
            const availValWidth = MR - colDivider - 8;

            refRows.forEach((r, idx) => {
                const currentY = vendorY + idx * rowH;
                if (idx > 0) {
                    line(splitX, currentY, MR, currentY);
                }
                const textY = currentY + 6;

                // Dynamically fit label if necessary
                let labelFontSize = 8.2;
                doc.font("Arial-Bold");
                while (labelFontSize > 6.5 && doc.fontSize(labelFontSize).widthOfString(r.label) > availLabelWidth) {
                    labelFontSize -= 0.2;
                }
                doc.fontSize(labelFontSize).text(r.label, splitX + 4, textY, { width: availLabelWidth, lineBreak: false });

                // Dynamically fit value (auto-scale font size down to ensure it NEVER wraps onto 2nd line)
                const valStr = String(r.val || "").trim();
                let valFontSize = 8.2;
                doc.font(r.boldVal ? "Arial-Bold" : "Arial");
                while (valFontSize > 6.0 && doc.fontSize(valFontSize).widthOfString(valStr) > availValWidth) {
                    valFontSize -= 0.2;
                }
                const adjustedValY = textY + (valFontSize < 8.0 ? (8.2 - valFontSize) * 0.3 : 0);
                doc.fontSize(valFontSize).text(valStr, colDivider + 4, adjustedValY, { width: availValWidth, lineBreak: false });
            });

            // 4. Attention Box
            const attnY = 298.1;
            const attnH = 21.5;
            rect(ML, attnY, MW, attnH);
            const attnPerson = String(po.attn_name || po.office_contact_name || "").trim();
            const attnText = `ATTN. : ${attnPerson}`;
            let attnSize = 9.0;
            doc.font("Arial-Bold");
            while (attnSize > 6.5 && doc.fontSize(attnSize).widthOfString(attnText) > MW - 12) {
                attnSize -= 0.2;
            }
            doc.fontSize(attnSize).text(attnText, ML, attnY + 5.5, {
                width: MW,
                align: "center",
                lineBreak: false
            });

            // 5. Item Table
            const tableHeaderY = 319.6;
            const headerH = 16;
            const x0 = 85.6;
            const x1 = 147.6;
            const x2 = 316.3;
            const x3 = 350.3;
            const x4 = 428.4;
            const x5 = 524;
            const totalY = 509.7;
            const totalH = 14;
            const tableBottom = totalY + totalH;

            rect(x0, tableHeaderY, x5 - x0, tableBottom - tableHeaderY);
            line(x1, tableHeaderY, x1, tableBottom);
            line(x2, tableHeaderY, x2, tableBottom);
            line(x3, tableHeaderY, x3, tableBottom);
            line(x4, tableHeaderY, x4, tableBottom);
            line(x0, tableHeaderY + headerH, x5, tableHeaderY + headerH);

            doc.font("Calibri-Bold").fontSize(7.56);
            doc.text("SR. NO.", x0, tableHeaderY + 4, { width: x1 - x0, align: "center", lineBreak: false });
            doc.text("Model Number", x1, tableHeaderY + 4, { width: x2 - x1, align: "center", lineBreak: false });
            doc.text("Qty", x2, tableHeaderY + 4, { width: x3 - x2, align: "center", lineBreak: false });
            doc.text("Unit Rate", x3, tableHeaderY + 4, { width: x4 - x3, align: "center", lineBreak: false });
            doc.text("Total", x4, tableHeaderY + 4, { width: x5 - x4, align: "center", lineBreak: false });

            // Item row
            const itemTop = tableHeaderY + headerH;
            doc.font("Calibri").fontSize(7.56);
            doc.text("1", x0, itemTop + 4, { width: x1 - x0, align: "center", lineBreak: false });

            // Item Name on top, next line make, and below that model no
            let currentItemY = itemTop + 4;
            const descWidth = x2 - x1 - 8;
            if (po.item_name) {
                doc.font("Calibri-Bold").fontSize(7.56).text(po.item_name, x1 + 4, currentItemY, { width: descWidth, lineGap: 1 });
                currentItemY += doc.heightOfString(po.item_name, { width: descWidth, lineGap: 1 }) + 2;
            }
            if (po.make) {
                doc.font("Calibri").fontSize(7.56).text(po.make, x1 + 4, currentItemY, { width: descWidth, lineGap: 1 });
                currentItemY += doc.heightOfString(po.make, { width: descWidth, lineGap: 1 }) + 2;
            }
            if (po.model) {
                doc.font("Calibri").fontSize(7.56).text(po.model, x1 + 4, currentItemY, { width: descWidth, lineGap: 1 });
            }

            doc.font("Calibri").fontSize(7.56);
            doc.text(Number(po.qty || 0).toFixed(2), x2, itemTop + 4, { width: x3 - x2, align: "center", lineBreak: false });
            doc.text(fmtCur(po.price_per_unit), x3, itemTop + 4, { width: x4 - x3, align: "center", lineBreak: false });
            doc.text(fmtCur(po.total_price), x4, itemTop + 4, { width: x5 - x4, align: "center", lineBreak: false });

            // Total row
            line(x0, totalY, x5, totalY);
            doc.font("Calibri-Bold").fontSize(7.56).text("TOTAL:", x0, totalY + 3.5, { width: x4 - x0, align: "center", lineBreak: false });
            doc.text(fmtCur(po.total_price), x4, totalY + 3.5, { width: x5 - x4, align: "center", lineBreak: false });

            // 6. Footer: Terms & conditions (left) and signature block (right)
            const footerY = tableBottom;
            const footerBottom = 618.9;
            rect(x0, footerY, x5 - x0, footerBottom - footerY);
            const footerSplit = x3;
            line(footerSplit, footerY, footerSplit, footerBottom);
            line(x0, footerY + 14, footerSplit, footerY + 14);
            line(x1, footerY + 14, x1, 607.5);
            line(x0, 607.5, x5, 607.5);

            doc.font("Calibri-Bold").fontSize(7.56).text("TERMS & CONDITIONS :", x0, footerY + 3.5, { width: footerSplit - x0, align: "center", lineBreak: false });

            const termWidth = footerSplit - x1 - 8;

            // Condition 1: DELIVERY
            let cleanAddr = String(po.delivery_address || "").trim();
            cleanAddr = cleanAddr
                .replace(/^delivery\s*:\s*/i, "")
                .replace(/^direct\s*to\s*site\s*[-:]*\s*/i, "")
                .replace(/\s+,/g, ",")
                .replace(/\r?\n/g, ", ")
                .replace(/\s+/g, " ")
                .trim();

            const deliveryText = (po.delivery_type === "DIRECT_SITE" && cleanAddr)
                ? `DELIVERY : ${cleanAddr}`
                : "DELIVERY : AT OUR OFFICE.";

            // Condition 3: PAYMENT TERMS (from custom remarks or quotation terms)
            const term3 = (po.payment_terms_remarks && String(po.payment_terms_remarks).trim())
                ? String(po.payment_terms_remarks).trim()
                : (function() {
                    const type = String(po.payment_type || po.viv_payment_type || "").toUpperCase();
                    const advVal = (po.advance_value !== null && po.advance_value !== undefined && po.advance_value !== "")
                        ? Number(po.advance_value)
                        : (po.viv_advance_value ? Number(po.viv_advance_value) : null);
                    const dueDays = (po.balance_due_days !== null && po.balance_due_days !== undefined && po.balance_due_days !== "")
                        ? Number(po.balance_due_days)
                        : (po.viv_balance_due_days ? Number(po.viv_balance_due_days) : null);
                    const hasAdv = advVal !== null && advVal > 0;
                    const hasDays = dueDays !== null && dueDays > 0;

                    if (type === "ADVANCE" || (hasAdv && advVal >= 100)) {
                        return advVal
                            ? `Payment will be ${advVal}% advance.`
                            : "Payment will be 100% advance.";
                    }
                    if (type === "ADVANCE_PLUS_BALANCE" || (hasAdv && hasDays)) {
                        const adv = hasAdv ? `${advVal}% advance` : "advance";
                        const bal = hasDays ? `balance payment after ${dueDays} days` : "balance on delivery";
                        return `Payment will be ${adv}, ${bal}.`;
                    }
                    if (hasDays) {
                        return `Payment will be ${dueDays} days credit.`;
                    }
                    if (po.viv_payment_terms_remarks && String(po.viv_payment_terms_remarks).trim()) {
                        return String(po.viv_payment_terms_remarks).trim();
                    }
                    if (po.viv_remarks && String(po.viv_remarks).trim()) {
                        return String(po.viv_remarks).trim();
                    }
                    return null;
                })();

            // Dynamic adjustment of font size & lineGap so all conditions fit comfortably without border collision
            let termsFontSize = 7.56;
            let lineGap = 1.5;
            doc.font("Calibri").fontSize(termsFontSize);
            let estimatedH = doc.heightOfString(deliveryText, { width: termWidth, lineGap }) + 12 + (term3 ? doc.heightOfString(term3, { width: termWidth, lineGap }) + 4 : 0);
            while (estimatedH > 58 && termsFontSize > 6.2) {
                termsFontSize -= 0.3;
                lineGap = 1.0;
                doc.fontSize(termsFontSize);
                estimatedH = doc.heightOfString(deliveryText, { width: termWidth, lineGap }) + 11 + (term3 ? doc.heightOfString(term3, { width: termWidth, lineGap }) + 3 : 0);
            }

            doc.font("Calibri").fontSize(termsFontSize);
            let currentTermY = footerY + 18;

            // Condition 1: DELIVERY
            doc.text("1", x0, currentTermY, { width: x1 - x0, align: "center", lineBreak: false });
            doc.text(deliveryText, x1 + 4, currentTermY, { width: termWidth, lineGap });
            const delivH = doc.heightOfString(deliveryText, { width: termWidth, lineGap });
            currentTermY += Math.max(delivH, 9) + 3;

            // Condition 2: TAX
            doc.text("2", x0, currentTermY, { width: x1 - x0, align: "center", lineBreak: false });
            doc.text("TAX : EXTRA", x1 + 4, currentTermY, { width: termWidth, lineBreak: false });
            currentTermY += 12;

            if (term3) {
                doc.text("3", x0, currentTermY, { width: x1 - x0, align: "center", lineBreak: false });
                doc.text(term3, x1 + 4, currentTermY, { width: termWidth, lineGap });
            }

            // Signature block
            const signX = footerSplit + 6;
            doc.font("Arial-Bold").fontSize(7).text("FOR,", signX, footerY + 2, { lineBreak: false });
            doc.text("NIMIT ELECTRONICS AND EQUIPMENTS,", signX, footerY + 13, { width: x5 - signX - 4, lineBreak: false });
            doc.text("AUTHORISED SIGNATORY", signX, 595, { width: x5 - signX - 4, lineBreak: false });

            doc.end();
            stream.on("finish", () => resolve(outputPath));
            stream.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

function resolveDocumentPath(storedPath) {
    if (!storedPath) return null;
    // Check direct path
    if (path.isAbsolute(storedPath) && fs.existsSync(storedPath)) {
        return storedPath;
    }
    // Handle paths starting with ../purchase-orders or ../vendor
    const cleanRel = storedPath.replace(/^\.\.[\/\\]/, "");
    const candidate1 = path.resolve(__dirname, "../../", cleanRel);
    if (fs.existsSync(candidate1)) return candidate1;

    // Check relative to backend/
    const candidate2 = path.resolve(__dirname, "../", storedPath);
    if (fs.existsSync(candidate2)) return candidate2;

    const candidate3 = path.resolve(__dirname, "../../", storedPath);
    if (fs.existsSync(candidate3)) return candidate3;

    return candidate1;
}

module.exports = {
    poFolder,
    generatePoPdf,
    resolveDocumentPath
};
