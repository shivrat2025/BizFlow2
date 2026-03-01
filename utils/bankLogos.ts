// Bank logo mapping — keywords match account name (case-insensitive)
// More specific entries (e.g. SBI CARD) must come before general ones (SBI)
const BANK_MAP: { keywords: string[]; domain: string; bg: string; color: string }[] = [
    // Credit Cards (specific first)
    { keywords: ['sbi card', 'sbicard', 'sbi credit card'], domain: 'sbicard.com', bg: '#22409A', color: '#fff' },
    { keywords: ['hdfc credit', 'hdfc card'], domain: 'hdfcbank.com', bg: '#004C8F', color: '#fff' },
    { keywords: ['icici credit', 'icici card'], domain: 'icicibank.com', bg: '#F17B21', color: '#fff' },
    { keywords: ['axis credit', 'axis card'], domain: 'axisbank.com', bg: '#97144D', color: '#fff' },

    // Banks
    { keywords: ['idfc first', 'idfcfirst', 'idfc bank', 'idfc'], domain: 'idfcfirstbank.com', bg: '#E8001C', color: '#fff' },
    { keywords: ['indusind', 'indus ind'], domain: 'indusind.com', bg: '#1B4D8E', color: '#fff' },
    { keywords: ['icici'], domain: 'icicibank.com', bg: '#F17B21', color: '#fff' },
    { keywords: ['sbi', 'state bank'], domain: 'sbi.co.in', bg: '#22409A', color: '#fff' },
    { keywords: ['hdfc'], domain: 'hdfcbank.com', bg: '#004C8F', color: '#fff' },
    { keywords: ['axis'], domain: 'axisbank.com', bg: '#97144D', color: '#fff' },
    { keywords: ['kotak'], domain: 'kotak.com', bg: '#E31837', color: '#fff' },
    { keywords: ['yes bank', 'yesbank'], domain: 'yesbank.in', bg: '#00529F', color: '#fff' },
    { keywords: ['pnb', 'punjab national'], domain: 'pnbindia.in', bg: '#EC1C24', color: '#fff' },
    { keywords: ['bank of baroda'], domain: 'bankofbaroda.in', bg: '#F58220', color: '#fff' },
    { keywords: ['canara'], domain: 'canarabank.com', bg: '#003087', color: '#fff' },
    { keywords: ['federal bank'], domain: 'federalbank.co.in', bg: '#003087', color: '#fff' },
    { keywords: ['rbl'], domain: 'rblbank.com', bg: '#004B87', color: '#fff' },
    { keywords: ['au bank', 'au small'], domain: 'aubank.in', bg: '#E31837', color: '#fff' },
    { keywords: ['paytm'], domain: 'paytm.com', bg: '#00B9F1', color: '#fff' },
    { keywords: ['razorpay'], domain: 'razorpay.com', bg: '#2D81F7', color: '#fff' },
];

export interface BankLogoInfo {
    // Google Favicon — always resolves, never 404
    url: string;
    bg: string;
    color: string;
    initials: string;
}

export function getBankLogo(accountName: string): BankLogoInfo | null {
    if (!accountName) return null;
    const lower = accountName.toLowerCase().trim();

    for (const entry of BANK_MAP) {
        if (entry.keywords.some(k => lower.includes(k))) {
            return {
                // sz=128 gives a crisp 64px display; Google always returns something
                url: `https://www.google.com/s2/favicons?sz=128&domain_url=https://${entry.domain}`,
                bg: entry.bg,
                color: entry.color,
                initials: accountName.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
            };
        }
    }
    return null;
}
