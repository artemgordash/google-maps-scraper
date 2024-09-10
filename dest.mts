import * as cheerio from 'cheerio';
import _ from 'lodash';

async function getSocialMediaFromGoogle(companyName: string): Promise<{
  Instagram: string;
  Facebook: string;
  Twitter: string;
  Youtube: string;
  Linkedin: string;
  X: string;
  Tiktok: string;
}> {
  const response = await fetch(
    `https://www.google.com/search?q=${companyName} Social Media`
  );

  const html = await response.text();

  const $ = cheerio.load(html);

  const links = $(
    'a[href*="www.instagram.com"], a[href*="www.facebook.com"], a[href*="www.twitter.com"], a[href*="www.youtube.com"], a[href*="www.linkedin.com"], a[href*="www.x.com"], a[href*="www.tiktok.com"]'
  )
    .toArray()
    .map((u) => {
      const params = new URLSearchParams(u.attribs.href.replace('/url?q=', ''));
      return params.keys().toArray().at(0);
    });

  const contacts = {};

  for (const link of links) {
    if (typeof link !== 'string') continue;
    const key = _.capitalize(new URL(link).host.split('.').at(1));
    if (!(key in contacts)) {
      // @ts-ignore
      contacts[key] = link;
    }
  }
  // @ts-ignore
  return contacts;
}

const data = await getSocialMediaFromGoogle('8oz las vegas');
console.log('🚀 ~ data:', data);
