// Maps known bank/card account names to real logo domains
const BANK_DOMAIN_MAP: { keywords: string[]; domain: string; color: string }[] = [
    { keywords: ['idfc', 'idfc first', 'idfcfirst'], domain: 'idfcfirstbank.com', color: '#E8001C' },
    { keywords: ['indusind', 'indus ind'], domain: 'indusind.com', color: '#1B4D8E' },
    { keywords: ['icici'], domain: 'icicibank.com', color: '#F17B21' },
    { keywords: ['sbi', 'state bank'], domain: 'sbi.co.in', color: '#22409A' },
    { keywords: ['hdfc'], domain: 'hdfcbank.com', color: '#004C8F' },
    { keywords: ['axis'], domain: 'axisbank.com', color: '#97144D' },
    { keywords: ['kotak'], domain: 'kotak.com', color: '#E31837' },
    { keywords: ['yes bank'], domain: 'yesbank.in', color: '#00529F' },
    { keywords: ['pnb', 'punjab national'], domain: 'pnbindia.in', color: '#EC1C24' },
    { keywords: ['bank of baroda', 'bob'], domain: 'bankofbaroda.in', color: '#F58220' },
    { keywords: ['canara'], domain: 'canarabank.com', color: '#003087' },
    { keywords: ['federal bank'], domain: 'federalbank.co.in', color: '#003087' },
    { keywords: ['rbl', 'ratnakar'], domain: 'rblbank.com', color: '#004B87' },
    { keywords: ['au bank', 'au small'], domain: 'aubank.in', color: '#E31837' },
    { keywords: ['paytm'], domain: 'paytm.com', color: '#00B9F1' },
    { keywords: ['razorpay'], domain: 'razorpay.com', color: '#2D81F7' },
    { keywords: ['amazon pay'], domain: 'amazon.in', color: '#FF9900' },
];

export function getBankLogo(accountName: string): { url: string; color: string } | null {
    if (!accountName) return null;
    const lower = accountName.toLowerCase();
    for (const entry of BANK_DOMAIN_MAP) {
        if (entry.keywords.some(k => lower.includes(k))) {
            return {
                url: `https://www.google.com/s2/favicons?sz=64&domain=${entry.domain}`,
                color: entry.color,
            };
        }
    }
    return null;
}

export function getBankColor(accountName: string): string {
    if (!accountName) return '#64748b';
    const lower = accountName.toLowerCase();
    for (const entry of BANK_DOMAIN_MAP) {
        if (entry.keywords.some(k => lower.includes(k))) return entry.color;
    }
    return '#64748b';
}
