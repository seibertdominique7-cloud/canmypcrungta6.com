export const REQUIRED_PAGE_KEYS = [
  'faq',
  'privacy',
  'terms',
  'contact',
  'about',
  'cookie-policy',
  'editorial-policy',
  'accessibility',
] as const;

export const FOOTER_GROUPS = ['Company', 'Help', 'Legal', 'Resources'] as const;

export type RequiredPageKey = (typeof REQUIRED_PAGE_KEYS)[number];
export type FooterGroup = (typeof FOOTER_GROUPS)[number];

export interface RequiredFaqSeed {
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
}

export interface RequiredPageSeed {
  key: RequiredPageKey;
  title: string;
  aliases: string[];
  excerpt: string;
  body: string;
  pageTemplate: 'standard' | 'legal' | 'contact' | 'faq';
  schemaType: 'WebPage' | 'AboutPage' | 'ContactPage' | 'FAQPage';
  footerGroup: FooterGroup;
  footerLabel: string;
  footerOrder: number;
  seoTitle: string;
  metaDescription: string;
  faqEntries?: RequiredFaqSeed[];
}

const richText = (html: string) => `<!--cms-rich-text-->\n${html.trim()}`;

const faqEntries: RequiredFaqSeed[] = [
  {
    question: 'What does the GTA VI PC checker do?',
    answer: 'It compares the CPU, GPU, RAM, storage, and Windows version you provide with this site\'s estimated minimum and recommended GTA VI PC requirements.',
    category: 'General',
    displayOrder: 10,
  },
  {
    question: 'Are the GTA VI PC requirements official?',
    answer: 'No. Rockstar Games has not published official GTA VI PC requirements. The checker uses editable estimates that may change when reliable new information becomes available.',
    category: 'Requirements',
    displayOrder: 20,
  },
  {
    question: 'How accurate is the compatibility result?',
    answer: 'The result is a practical estimate, not a performance guarantee. Actual performance can vary with laptop power limits, cooling, drivers, game settings, and future game updates.',
    category: 'Requirements',
    displayOrder: 30,
  },
  {
    question: 'What does Cannot Determine mean?',
    answer: 'The checker could not confidently identify a CPU, GPU, or RAM value. Edit the detected specs, use manual entry, or upload a clearer screenshot.',
    category: 'Troubleshooting',
    displayOrder: 40,
  },
  {
    question: 'Which screenshot should I upload?',
    answer: 'A maximized Windows System Information window is the best starting point. Task Manager Performance screenshots can help identify the GPU and storage when they are not shown there.',
    category: 'Screenshots',
    displayOrder: 50,
  },
  {
    question: 'Is my screenshot uploaded or stored?',
    answer: 'The current screenshot checker runs OCR in your browser and does not intentionally send the screenshot, raw OCR text, or full detected component list to the application database.',
    category: 'Privacy',
    displayOrder: 60,
  },
  {
    question: 'Why was my GPU or storage not detected?',
    answer: 'Windows System Information often shows the CPU and RAM but not a clear GPU or disk capacity. Use Task Manager > Performance for GPU and Disk details, then enter missing values manually.',
    category: 'Troubleshooting',
    displayOrder: 70,
  },
  {
    question: 'Can I enter my PC specs manually?',
    answer: 'Yes. Manual entry uses the same compatibility engine, requirement data, component statuses, and result design as screenshot analysis.',
    category: 'General',
    displayOrder: 80,
  },
  {
    question: 'Does unknown storage block a result?',
    answer: 'No. Missing storage remains Unknown and does not by itself force Cannot Determine. You can add storage capacity and type later to update the result.',
    category: 'Storage',
    displayOrder: 90,
  },
  {
    question: 'Are laptop and desktop GPUs treated the same?',
    answer: 'Not automatically. Laptop variants can have different power limits and performance, so the hardware database can assign them separate tiers when the model is known.',
    category: 'Hardware',
    displayOrder: 100,
  },
  {
    question: 'Can integrated graphics run GTA VI?',
    answer: 'Integrated graphics are evaluated conservatively and separately from similarly named desktop graphics cards. Many integrated GPUs fall below the current estimated minimum tier.',
    category: 'Hardware',
    displayOrder: 110,
  },
  {
    question: 'Which Windows versions are checked?',
    answer: 'The current estimates use Windows 10 for minimum and Windows 11 for recommended. Editions and builds may still matter after official requirements are published.',
    category: 'Windows',
    displayOrder: 120,
  },
  {
    question: 'How are upgrade recommendations selected?',
    answer: 'Recommendations are matched to the detected result scenario and are shown only when enabled by the site administrator. Always verify fit, power, compatibility, price, and return terms before buying.',
    category: 'Recommendations',
    displayOrder: 130,
  },
  {
    question: 'Do affiliate links change the price I pay?',
    answer: 'Using an affiliate link does not add a charge to the listed retailer price. This site may earn a commission from a qualifying purchase.',
    category: 'Recommendations',
    displayOrder: 140,
  },
];

export const REQUIRED_PAGES: RequiredPageSeed[] = [
  {
    key: 'faq',
    title: 'Frequently Asked Questions',
    aliases: ['faq', 'frequently-asked-questions'],
    excerpt: 'Clear answers about screenshot analysis, estimated GTA VI requirements, hardware results, privacy, and troubleshooting.',
    body: richText(`
      <p>Find quick answers about the PC checker and its estimated GTA VI compatibility results. Use the links on each question to share or return to a specific answer.</p>
    `),
    pageTemplate: 'faq',
    schemaType: 'FAQPage',
    footerGroup: 'Help',
    footerLabel: 'FAQ',
    footerOrder: 10,
    seoTitle: 'GTA VI PC Checker FAQ',
    metaDescription: 'Answers about GTA VI PC requirements, screenshot analysis, manual specs, hardware results, storage, privacy, and troubleshooting.',
    faqEntries,
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    aliases: ['privacy', 'privacy-policy'],
    excerpt: 'How CanMyPCRunGTA6 handles checker inputs, email subscriptions, contact messages, cookies, ads, and external links.',
    body: richText(`
      <h2>Information processed by the checker</h2>
      <p>The screenshot checker currently performs optical character recognition in your browser. It does not intentionally send the screenshot, raw OCR output, or complete detected hardware list to the application database. Manual hardware entries are also used in the browser to calculate your result. Avoid including names, account details, product keys, serial numbers, or other sensitive information in screenshots.</p>
      <h2>Email subscriptions</h2>
      <p>If you subscribe, the site stores your email address, signup source, recorded consent, subscription status, and—when signup happens after a check—the broad compatibility scenario. This supports GTA VI updates and occasional gaming hardware offers. The subscription record does not include the screenshot or full hardware list. You can unsubscribe using the link provided in an email when campaign delivery is connected.</p>
      <h2>Contact messages</h2>
      <p>When you use the contact form, the site stores your name, email address, subject, message, submission time, and workflow status so the site administrator can review and respond. Do not include passwords, payment details, product keys, or other highly sensitive information.</p>
      <h2>Administration, security, and logs</h2>
      <p>The private admin area uses a signed, HTTP-only session cookie. Hosting and security infrastructure may process routine request information such as IP address, browser details, timestamps, and error logs to operate and protect the service. The public checker does not use those logs as a hardware profile.</p>
      <h2>Advertising, affiliate links, and third parties</h2>
      <p>If Google AdSense is enabled by the administrator, Google may use cookies or similar technologies to deliver and measure ads under Google\'s own policies. Retailers may process data under their own terms after you follow an external affiliate link. The site may use hosting, database, media-storage, or email-delivery vendors when configured; those providers process only the information needed for their service.</p>
      <h2>Retention and choices</h2>
      <p>Active subscriber records are retained while subscribed. Unsubscribed or suppressed records may be retained to honor opt-out requests and document consent. Contact messages may be retained while needed to answer, maintain support history, prevent abuse, or meet legal obligations. The administrator can delete records when they are no longer needed.</p>
      <p>You may ask to access, correct, or delete information you submitted by using the <a href="/contact">contact form</a>. Some records may be retained where reasonably necessary to honor an opt-out, secure the service, resolve disputes, or meet legal obligations.</p>
      <h2>Children</h2>
      <p>This service is intended for a general gaming audience and is not directed to children under 13. Do not submit personal information if you are not permitted to do so in your location.</p>
      <h2>Policy changes</h2>
      <p>This policy may be updated as the site, vendors, or legal requirements change. The last-updated date shown on this page identifies the current CMS version.</p>
    `),
    pageTemplate: 'legal',
    schemaType: 'WebPage',
    footerGroup: 'Legal',
    footerLabel: 'Privacy Policy',
    footerOrder: 10,
    seoTitle: 'Privacy Policy | CanMyPCRunGTA6',
    metaDescription: 'Learn how CanMyPCRunGTA6 handles PC checker inputs, subscriptions, contact messages, cookies, ads, and privacy requests.',
  },
  {
    key: 'terms',
    title: 'Terms of Use',
    aliases: ['terms', 'terms-of-use', 'terms-and-conditions'],
    excerpt: 'Terms governing use of the GTA VI PC checker, estimated results, articles, recommendations, and external links.',
    body: richText(`
      <h2>Acceptance of these terms</h2>
      <p>By using CanMyPCRunGTA6, you agree to these terms. If you do not agree, do not use the site. The site operator may update these terms by publishing a revised version with a new last-updated date.</p>
      <h2>Informational service and estimated requirements</h2>
      <p>The checker, articles, and recommendations are provided for general informational purposes. Rockstar Games has not published official GTA VI PC requirements. Compatibility results are estimates and do not guarantee frame rate, image quality, stability, availability, release timing, or support for any particular configuration.</p>
      <h2>Your responsibilities</h2>
      <p>You are responsible for entering accurate hardware information, protecting sensitive data in screenshots, checking component fit and power requirements, maintaining backups, and confirming retailer details before a purchase or upgrade.</p>
      <h2>Acceptable use</h2>
      <p>Do not misuse the site, attempt unauthorized access, interfere with service operation, submit malicious code, overwhelm forms or APIs, impersonate another person, or use the service in a way that violates applicable law or third-party rights.</p>
      <h2>Affiliate links, advertising, and purchases</h2>
      <p>The site may earn commissions from qualifying purchases through affiliate links. Ads and retailer listings are controlled by third parties. Prices, availability, warranties, shipping, returns, and transactions are between you and the applicable retailer. Verify every product before purchasing.</p>
      <h2>Intellectual property</h2>
      <p>Site text, layouts, code, and original graphics are protected to the extent allowed by law. Grand Theft Auto, GTA, Rockstar Games, and related names or marks belong to their respective owners. This site is independent and is not endorsed by Rockstar Games.</p>
      <h2>Disclaimers and limitation of liability</h2>
      <p>The site is provided on an “as is” and “as available” basis to the extent permitted by law. The site operator does not promise uninterrupted operation or error-free results. To the maximum extent permitted by applicable law, the operator is not liable for indirect, incidental, special, consequential, or purchase-related losses arising from use of the site or reliance on its estimates.</p>
      <h2>Governing terms</h2>
      <p>Any governing-law, venue, business-identity, and formal notice details must be completed by the site owner and reviewed for the jurisdictions where the service is offered before relying on this page as legal advice. Nothing here limits rights that cannot legally be waived.</p>
      <h2>Contact</h2>
      <p>Questions about these terms can be sent through the <a href="/contact">contact form</a>.</p>
    `),
    pageTemplate: 'legal',
    schemaType: 'WebPage',
    footerGroup: 'Legal',
    footerLabel: 'Terms of Use',
    footerOrder: 20,
    seoTitle: 'Terms of Use | CanMyPCRunGTA6',
    metaDescription: 'Read the terms for using the CanMyPCRunGTA6 checker, estimated compatibility results, recommendations, articles, and external links.',
  },
  {
    key: 'contact',
    title: 'Contact Us',
    aliases: ['contact', 'contact-us', 'support'],
    excerpt: 'Send a question, correction, privacy request, business inquiry, or technical support message to the site administrator.',
    body: richText(`
      <p>Choose the closest subject and include enough detail for the site administrator to understand the request. For checker problems, mention whether you used screenshot analysis or manual entry and describe the displayed result.</p>
      <p>Please do not send passwords, payment details, product keys, or screenshots containing sensitive information.</p>
    `),
    pageTemplate: 'contact',
    schemaType: 'ContactPage',
    footerGroup: 'Help',
    footerLabel: 'Contact',
    footerOrder: 20,
    seoTitle: 'Contact CanMyPCRunGTA6',
    metaDescription: 'Contact CanMyPCRunGTA6 about checker support, article corrections, privacy requests, partnerships, or other questions.',
  },
  {
    key: 'about',
    title: 'About CanMyPCRunGTA6',
    aliases: ['about', 'about-us'],
    excerpt: 'Why this independent GTA VI PC checker exists and how its estimated compatibility guidance is maintained.',
    body: richText(`
      <h2>Our purpose</h2>
      <p>CanMyPCRunGTA6 helps PC players turn a list or screenshot of hardware specifications into a quick, understandable estimate of GTA VI readiness. The checker focuses on a clear overall result, component-by-component context, and practical next steps.</p>
      <h2>How the checker works</h2>
      <p>Screenshot analysis reads text in the browser, the parser identifies supported hardware fields, and the shared compatibility engine compares normalized specs with one centralized set of estimated requirements. Manual entry uses that same engine and result interface.</p>
      <h2>Independent and estimated</h2>
      <p>This site is independent and is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive. Rockstar Games has not published official GTA VI PC requirements. Estimates, hardware tiers, articles, and recommendations can be updated as better information becomes available.</p>
      <h2>Corrections and feedback</h2>
      <p>Hardware naming is complicated, especially for laptop and integrated graphics variants. If a result or article appears incorrect, please send the exact model name and context through the <a href="/contact">contact form</a>.</p>
    `),
    pageTemplate: 'standard',
    schemaType: 'AboutPage',
    footerGroup: 'Company',
    footerLabel: 'About',
    footerOrder: 10,
    seoTitle: 'About CanMyPCRunGTA6',
    metaDescription: 'Learn how CanMyPCRunGTA6 turns PC specifications into an estimated GTA VI compatibility result and maintains its guidance.',
  },
  {
    key: 'cookie-policy',
    title: 'Cookie Policy',
    aliases: ['cookie-policy', 'cookies'],
    excerpt: 'How cookies and similar technologies may be used for secure administration, ad previews, and advertising.',
    body: richText(`
      <h2>What cookies are</h2>
      <p>Cookies are small text values stored by a browser. Similar browser technologies can remember settings or help a service operate, secure, and measure its pages.</p>
      <h2>Cookies used directly by this site</h2>
      <p>The private admin area uses a signed, HTTP-only session cookie to authenticate the administrator. A short-lived preview indicator may also be used while the administrator previews an advertising placement. These controls are not used to build public hardware profiles.</p>
      <h2>Advertising cookies</h2>
      <p>If the administrator enables a valid Google AdSense configuration, Google\'s script may use cookies or similar technologies for ad delivery, frequency controls, fraud prevention, and measurement under Google\'s policies. When advertising is disabled or not configured, the AdSense script is not loaded by this application.</p>
      <h2>Affiliate links and external sites</h2>
      <p>Following a retailer or other external link takes you to a third-party site that may set its own cookies. Those cookies are controlled by the third party, not by CanMyPCRunGTA6.</p>
      <h2>Your controls</h2>
      <p>You can review, block, or delete cookies through your browser settings. Blocking essential admin cookies prevents admin login from working. Browser or advertising controls may also be available from the relevant ad provider.</p>
      <h2>Changes and questions</h2>
      <p>This policy may change when site integrations change. Use the <a href="/contact">contact form</a> if you have a cookie or privacy question.</p>
    `),
    pageTemplate: 'legal',
    schemaType: 'WebPage',
    footerGroup: 'Legal',
    footerLabel: 'Cookie Policy',
    footerOrder: 30,
    seoTitle: 'Cookie Policy | CanMyPCRunGTA6',
    metaDescription: 'Learn how CanMyPCRunGTA6 uses essential admin cookies and how advertising cookies may be used when Google AdSense is enabled.',
  },
  {
    key: 'editorial-policy',
    title: 'Editorial Policy',
    aliases: ['editorial-policy', 'editorial-standards'],
    excerpt: 'Standards for GTA VI news, requirement estimates, hardware guidance, corrections, affiliate content, and AI-assisted work.',
    body: richText(`
      <h2>Accuracy and sourcing</h2>
      <p>Articles should distinguish confirmed facts from reports, interpretation, and estimates. Important claims should be checked against primary sources where practical, including official publisher announcements, manufacturer specifications, and original documentation.</p>
      <h2>Estimated GTA VI requirements</h2>
      <p>Rockstar Games has not published official GTA VI PC requirements. Requirement data and compatibility results must be labeled as estimated until reliable official specifications exist. Updating those estimates should not erase the distinction between official and inferred information.</p>
      <h2>Hardware recommendations</h2>
      <p>Recommendations should consider the checker scenario and hardware tier rather than retailer payout alone. Readers should be reminded to verify dimensions, power supply, platform compatibility, pricing, availability, warranties, and return terms.</p>
      <h2>Affiliate and sponsored content</h2>
      <p>Monetized content must include a visible affiliate disclosure. Payment or commission potential does not guarantee a positive review. Sponsored content, if introduced, should be clearly identified rather than presented as independent reporting.</p>
      <h2>Corrections</h2>
      <p>Material factual errors should be corrected promptly after verification. Readers can report a possible error through the <a href="/contact">contact form</a>. Significant updates should preserve an accurate updated date in the CMS.</p>
      <h2>AI-assisted work</h2>
      <p>Automated tools may assist with organization, drafts, summaries, or technical checks. The site administrator controls publication and should review claims, links, disclosures, and context before publishing. AI output should not be treated as a source by itself.</p>
      <h2>Independence</h2>
      <p>CanMyPCRunGTA6 is an independent site and is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.</p>
    `),
    pageTemplate: 'standard',
    schemaType: 'WebPage',
    footerGroup: 'Company',
    footerLabel: 'Editorial Policy',
    footerOrder: 20,
    seoTitle: 'Editorial Policy | CanMyPCRunGTA6',
    metaDescription: 'Review the editorial standards for sources, estimated GTA VI requirements, hardware recommendations, corrections, affiliate content, and AI tools.',
  },
  {
    key: 'accessibility',
    title: 'Accessibility',
    aliases: ['accessibility', 'accessibility-statement'],
    excerpt: 'The accessibility approach for the checker, articles, forms, admin-managed pages, and support requests.',
    body: richText(`
      <h2>Our approach</h2>
      <p>CanMyPCRunGTA6 aims to make its public checker and content usable with a keyboard, readable at common zoom levels, understandable without relying on color alone, and compatible with modern assistive technologies where practical.</p>
      <h2>Ongoing work</h2>
      <p>Accessibility is an ongoing process. Dynamic checker results, third-party advertising, retailer content, uploaded images, and administrator-authored CMS content may not always meet every user\'s needs or every accessibility standard.</p>
      <h2>Known considerations</h2>
      <p>Some hardware model names and raw OCR diagnostics are technical by nature. Images depend on useful alternative text entered by the administrator. External retailer pages and ad experiences are controlled by their respective providers.</p>
      <h2>Requesting help or reporting a barrier</h2>
      <p>If you cannot use a page, form, or result, send the page address, device or assistive technology, and a short description through the <a href="/contact">contact form</a>. The administrator can use that information to investigate and prioritize a practical improvement.</p>
    `),
    pageTemplate: 'standard',
    schemaType: 'WebPage',
    footerGroup: 'Resources',
    footerLabel: 'Accessibility',
    footerOrder: 30,
    seoTitle: 'Accessibility | CanMyPCRunGTA6',
    metaDescription: 'Learn about the accessibility approach for CanMyPCRunGTA6 and how to report a barrier or request help.',
  },
];

export function isRequiredPageKey(value: string): value is RequiredPageKey {
  return REQUIRED_PAGE_KEYS.includes(value as RequiredPageKey);
}
