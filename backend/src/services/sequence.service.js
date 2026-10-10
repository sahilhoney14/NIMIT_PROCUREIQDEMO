function getFinancialYear(date = new Date()) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    if (month >= 4) {
        return `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;
    }
    return `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
}

async function generatePrNumber(connection) {
    const financialYear = getFinancialYear();
    await connection.execute(
        `INSERT INTO pr_sequences (financial_year, last_number)
         VALUES (?, 0)
         ON DUPLICATE KEY UPDATE financial_year = financial_year`,
        [financialYear]
    );
    await connection.execute(
        `UPDATE pr_sequences
         SET last_number = LAST_INSERT_ID(last_number + 1)
         WHERE financial_year = ?`,
        [financialYear]
    );
    const [rows] = await connection.execute(`SELECT LAST_INSERT_ID() AS sequence_number`);
    const sequenceNumber = rows[0].sequence_number;
    return `NEE/${financialYear}/PR/${String(sequenceNumber).padStart(4, "0")}`;
}

async function generatePoNumber(connection, prNumber) {
    return prNumber.replace("/PR/", "/PO/");
}

module.exports = {
    getFinancialYear,
    generatePrNumber,
    generatePoNumber
};
