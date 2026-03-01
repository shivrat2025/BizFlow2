// Maps bank/card names to real logo URLs via Clearbit Logo API (high quality)
// SBI CARD must come before SBI so the more-specific match wins
const BANK_DOMAIN_MAP: { keywords: string[]; domain: string }[] = [
    // Credit cards (more specific — must come before parent banks)
    { keywords: ['sbi card', 'sbicard', 'sbi credit'], domain: 'sbicard.com' },
    { keywords: ['hdfc credit', 'hdfc card'], domain: 'hdfcbank.com' },
    { keywords: ['icici credit', 'icici card'], domain: 'icicibank.com' },
    { keywords: ['axis credit', 'axis card'], domain: 'axisbank.com' },

    // Banks
    { keywords: ['idfc first', 'idfcfirst', 'idfc bank', 'idfc'], domain: 'idfcfirstbank.com' },
    { keywords: ['indusind', 'indus ind'], domain: 'indusind.com' },
    { keywords: ['icici'], domain: 'icicibank.com' },
    { keywords: ['sbi', 'state bank of india', 'state bank'], domain: 'sbi.co.in' },
    { keywords: ['hdfc'], domain: 'hdfcbank.com' },
    { keywords: ['axis'], domain: 'axisbank.com' },
    { keywords: ['kotak'], domain: 'kotak.com' },
    { keywords: ['yes bank', 'yesbank'], domain: 'yesbank.in' },
    { keywords: ['pnb', 'punjab national'], domain: 'pnbindia.in' },
    { keywords: ['bank of baroda', 'bob bank'], domain: 'bankofbaroda.in' },
    { keywords: ['canara'], domain: 'canarabank.com' },
    { keywords: ['federal bank'], domain: 'federalbank.co.in' },
    { keywords: ['rbl'], domain: 'rblbank.com' },
    { keywords: ['au bank', 'au small'], domain: 'aubank.in' },
    { keywords: ['paytm'], domain: 'paytm.com' },
    { keywords: ['razorpay'], domain: 'razorpay.com' },
    { keywords: ['amazon pay', 'amazonpay'], domain: 'amazon.in' },
];

// Use Clearbit Logo API (high quality, proper logos)
const CLEARBIT = 'https://logo.clearbit.com';

export function getBankLogo(accountName: string): string | null {
    if (!accountName) return null;
    const lower = accountName.toLowerCase();
    for (const entry of BANK_DOMAIN_MAP) {
        if (entry.keywords.some(k => lower.includes(k))) {
            return `${CLEARBIT}/${entry.domain}?size=64`;
        }
    }
    return null;
}
