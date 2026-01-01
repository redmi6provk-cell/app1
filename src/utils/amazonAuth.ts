/**
 * Amazon Authentication Utility
 * 
 * This utility handles Amazon authentication via cookies
 * to enable authenticated scraping requests.
 */

export interface AmazonCookie {
  domain: string;
  expirationDate?: number;
  hostOnly: boolean;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite: string | null;
  secure: boolean;
  session: boolean;
  storeId: string | null;
  value: string;
}

// Store Amazon cookies
const amazonCookies: AmazonCookie[] = [
  {
    "domain": ".amazon.in",
    "expirationDate": 1775261983.894144,
    "hostOnly": false,
    "httpOnly": false,
    "name": "ubid-acbin",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "257-4658751-0886365"
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1778285985.840042,
    "hostOnly": false,
    "httpOnly": false,
    "name": "session-id-time",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "2082787201l"
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1775278124.851754,
    "hostOnly": false,
    "httpOnly": false,
    "name": "x-acbin",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "\"32qYyl83Sc3X3HngmLppf94RXpJl2@bBSwQ1bd8WtI?kiP4hPcHWCoxjuQ?75ThN\""
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1774598769.839134,
    "hostOnly": false,
    "httpOnly": true,
    "name": "at-acbin",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "Atza|IwEBIJ2Pd2NBB2uw9O-K8Mzh0_7-TtloL25kRIgls84ZWjaGiZPM7-lI65zAF1BDQNsa0u-A4gwSPwmUHg1gyGUlpAUr-gbnF4XnHPRSGfXlGK7fvFIxCtvoVDFQCZ6PLqwevP2epTHljH_4pL3eiF0oBXbJJTO5f1l2bzHcIfZtY98P2vLvECXArM1_q0zgMwVhdibGj_ID7lsJqCZLZd2TkB9cKg_YyuVYTGdFE21zalWCZQ"
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1778285985.839805,
    "hostOnly": false,
    "httpOnly": false,
    "name": "lc-acbin",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "en_IN"
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1774598769.839246,
    "hostOnly": false,
    "httpOnly": true,
    "name": "sess-at-acbin",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "\"XS6cuW1Vn+oqvLyLS6UeV6TgJTP/acNyZaP4AGJeLmA=\""
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1778285985.839959,
    "hostOnly": false,
    "httpOnly": false,
    "name": "session-id",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "258-0228499-2876406"
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1775278124.851469,
    "hostOnly": false,
    "httpOnly": false,
    "name": "session-token",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "KLm+ljULwX2K5Yp/5VMASJoRCEVknmslBKtHHmO/ARhSeTKcAMuE1Lss/EKJVOGfE4yIiNmLwB0Zz1ht+g2lpHUG01UBaT3vBrAs9OBBOUyEUSCYjWSJFJB47is21DhgL3lMblNb2DRerOoZ6cuxa7tYUt2uf4yhwoszJ70VfAxw8N/lns5dl0jT1kMvIGXdvhWQltokQIdkqctwYk70fb67V10K8BTNECOqt0TR6YKcKY3LAiNhMZmTL0usxBFCum8Ca0iWmXmcf6EXzzWAu5bbehF1P2pmCWRM462XR0MLmZYEFjf62DEz9+xtRTqo3I5o26hxwESu/uUBhN1MPNWFfRlGHHkCKeIwCPaa1Vgu7rAOXr0Mww8sbdbWG4OF"
  },
  {
    "domain": ".amazon.in",
    "expirationDate": 1774598769.839314,
    "hostOnly": false,
    "httpOnly": true,
    "name": "sst-acbin",
    "path": "/",
    "sameSite": null,
    "secure": true,
    "session": false,
    "storeId": null,
    "value": "Sst1|PQHQjg5SdT1F_dCRnAV7fF9BCciAq5uOmISyT6bB7pv_nFYG6SWWbyTf3VoAjGL-M24WmrluD_OM6A817AUin-wODTBkW9AQjZIsUGfUSx7WlE5fkNIO_fF3MwsxEx1viQkczwpG5j_DCshOEBE8r-NamgeK8SlK2vC9C2W58I-bYF3s0DdkI4IP_AC9O8bBVqWUPx6FqmTgxdEESS0GhYhoZmraLxw-OPeoXqIGYp0GJd_vbp7gmbywR3cubj8XqHDBjz3M-JJpSlL9IVREg10k71TuTghUrXrME7TEFrs5gxM"
  }
];

/**
 * Get all Amazon cookies for authentication
 */
export const getAmazonCookies = (): AmazonCookie[] => {
  return amazonCookies;
};

/**
 * Check if Amazon cookies are valid
 * Simple validation based on expiration dates
 */
export const areAmazonCookiesValid = (): boolean => {
  const now = Date.now();
  
  // Check if any essential cookies are expired
  const criticalCookies = ['session-token', 'at-acbin', 'sst-acbin'];
  
  for (const cookie of amazonCookies) {
    if (criticalCookies.includes(cookie.name)) {
      if (cookie.expirationDate && cookie.expirationDate * 1000 < now) {
        console.warn(`Amazon cookie ${cookie.name} has expired`);
        return false;
      }
    }
  }
  
  return true;
};

// Define the interface for Puppeteer cookie format
interface PuppeteerCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Convert cookie array to puppeteer cookies format
 */
export const getPuppeteerCookies = (): PuppeteerCookie[] => {
  return amazonCookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expirationDate ? cookie.expirationDate : -1,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite === 'Strict' || cookie.sameSite === 'Lax' || cookie.sameSite === 'None' 
              ? cookie.sameSite 
              : undefined // Ensure only valid values or undefined are passed
  }));
}; 