/**
 * Threat Detection - Détection de patterns malveillants
 *
 * Détecte : SQL injection, XSS, Path Traversal, Command Injection, LDAP Injection
 */

/**
 * Patterns de détection d'attaques
 */
const ATTACK_PATTERNS = {
    // SQL Injection
    sql_injection: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|EXEC|EXECUTE)\b)/gi,
        /(--|;|\/\*|\*\/|xp_|sp_)/gi,
        /('|(\\')|(--)|(%27)|(0x27))/gi,
        /(\bOR\b.*=.*)/gi,
        /(\bAND\b.*=.*)/gi,
    ],

    // XSS (Cross-Site Scripting)
    xss: [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // onclick, onerror, etc.
        /<img[^>]+src[^>]*>/gi,
    ],

    // Path Traversal
    path_traversal: [/\.\.(\/|\\)/g, /(\.\.%2f|\.\.%5c)/gi, /(%2e%2e%2f|%2e%2e%5c)/gi],

    // Command Injection
    command_injection: [/[;&|`$()]/g, /(;|\||&&|>|<|\$\(|`)/g],

    // LDAP Injection
    ldap_injection: [/[*()\\]/g, /(\(|\)|\||&|\*)/g],
};

/**
 * Analyser une chaîne pour détecter des patterns malveillants
 * @param {string} input - La chaîne à analyser
 * @param {string} paramName - Le nom du paramètre (pour le rapport)
 * @returns {{ threats: Array, isMalicious: boolean }}
 */
function detectThreats(input, paramName = 'unknown') {
    if (!input || typeof input !== 'string') {
        return { threats: [], isMalicious: false };
    }

    const threats = [];

    for (const [type, patterns] of Object.entries(ATTACK_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(input)) {
                threats.push({
                    type,
                    pattern: pattern.toString(),
                    paramName,
                    match: input.match(pattern)?.[0],
                });
                break; // Une détection par type suffit
            }
        }
    }

    return {
        threats,
        isMalicious: threats.length > 0,
    };
}

module.exports = {
    detectThreats,
    ATTACK_PATTERNS,
};
