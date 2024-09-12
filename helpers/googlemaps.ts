import _ from 'lodash';
import { connectTab } from '@/helpers/puppeteer';
import { Page } from 'puppeteer-core/internal/index.js';
import { distance } from 'fastest-levenshtein';
import * as cheerio from 'cheerio';
import { extractEmails } from '@/helpers/extract-emails';
import { XMLParser } from 'fast-xml-parser';
import { retry } from '@/helpers/retry';
import { flattenObject } from '@/helpers/flatten-object';
import { states } from '@/helpers/states';

const parser = new XMLParser();

async function getEmailsFromFacebook(facebookUrl: string) {
  const response = await fetch(facebookUrl, {
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      Priority: 'u=0, i',
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
    },
  });
  const html = await response.text();

  return extractEmails(html.replace(/\\u0040/g, '@'));
}

async function getSitemap(webURL: string): Promise<string[]> {
  try {
    const links = [];
    const origin = new URL(webURL).origin;
    const host = new URL(webURL).host.replace('www.', '');
    const response = await fetch(origin + '/sitemap.xml', {
      signal: AbortSignal.timeout(5000),
    });
    const xml = await response.text();
    links.push(
      ...Object.values(flattenObject(parser.parse(xml))).filter(Boolean)
    );

    const nextXMLLink = links.find(
      (l) => typeof l === 'string' && l.includes('.xml')
    );

    if (nextXMLLink) {
      const xmlLinks = links.filter((l) => {
        if (typeof l === 'string') {
          return l.endsWith('.xml');
        }

        return false;
      }) as string[];

      const xmlLinksResponse = await Promise.all(
        xmlLinks.map(async (l) => {
          try {
            const response = await fetch(l, {
              signal: AbortSignal.timeout(5000),
            });
            const xml = await response.text();
            return Object.values(flattenObject(parser.parse(xml)));
          } catch (error) {
            return '';
          }
        })
      );

      links.push(...xmlLinksResponse.flat());
    }

    return _.uniq(links).filter((l) => {
      if (typeof l !== 'string') {
        return false;
      }

      if (l.length > 110) {
        return false;
      }

      return (
        l.includes(host) &&
        !l.endsWith('.xml') &&
        !l.endsWith('.jpg') &&
        !l.endsWith('.png') &&
        !l.endsWith('.jpeg') &&
        !l.endsWith('.gif') &&
        !l.endsWith('.svg') &&
        !l.includes('.pdf') &&
        !l.includes('.mp4') &&
        !l.includes('.mp3') &&
        !l.includes('.webp')
      );
    }) as string[];
  } catch (error) {
    return [];
  }
}

const filterSocialMediaLinks = (link: string | undefined): boolean => {
  if (!link) return false;

  try {
    if (new URL(link).pathname === '/') {
      return false;
    }
  } catch (e) {
    return false;
  }

  return (
    !link.includes('share.php?u=') &&
    !link.includes('/p/') &&
    !link.includes('home?status') &&
    !link.includes('results?search_query') &&
    !link.includes('watch?') &&
    !link.includes('/videos/') &&
    !link.includes('/posts/') &&
    !link.includes('photo.php') &&
    !link.includes('/explore/')
  );
};

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
    `https://www.google.com/search?q=${companyName} Social Media`,
    {
      signal: AbortSignal.timeout(5000),
    }
  );

  const html = await response.text();

  const $ = cheerio.load(html);

  const links = $(
    'a[href*="www.instagram.com"], a[href*="www.facebook.com"], a[href*="www.twitter.com"], a[href*="www.youtube.com"], a[href*="www.linkedin.com"], a[href*="www.x.com"], a[href*="www.tiktok.com"]'
  )
    .toArray()
    .map((u) => {
      const params = new URLSearchParams(u.attribs.href);
      return params.keys().toArray().at(0);
    })
    .filter(filterSocialMediaLinks);

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
  return { ...contacts };
}

async function getCompanyDescriptionFromWebsite(aboutUsUrl: string) {
  try {
    const response = await fetch(aboutUsUrl, {
      signal: AbortSignal.timeout(5000),
    });

    const html = await response.text();

    const dom = new DOMParser().parseFromString(html, 'text/html');

    [...dom.querySelectorAll('script')].forEach((e) => e.remove());

    const tags = [...dom.body.querySelectorAll('span, p')].map(
      (e: any) => e.innerText?.trim() || ''
    );

    const possibleDescriptions = tags.filter((e) => {
      const clearedString = e.match(/[a-z]/g);

      return clearedString?.length && clearedString.length > 100;
    });

    return _.uniq(possibleDescriptions).slice(0, 2).join('\n');
  } catch (error) {
    return '';
  }
}

async function scrapeWebsite(url: string, companyName: string) {
  const contacts: { [key: string]: string } = {
    Email: '',
    Description: '',
    Instagram: '',
    Facebook: '',
    Twitter: '',
    Youtube: '',
    Linkedin: '',
    Tiktok: '',
  };

  const sitemap = await getSitemap(url);
  const Email: string[] = [];

  try {
    if (!url) throw new Error('No URL provided');
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await response.text();
    const $ = await cheerio.load(html);
    const interestingUrlsToFetch = [
      ...sitemap.filter((u) => u.includes('about') || u.includes('contact')),
    ];
    await Promise.all(
      interestingUrlsToFetch.map(async (url) => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
          });
          const html = await response.text();
          const $ = await cheerio.load(html);

          Email.push(...extractEmails($('body').html() ?? ''));
        } catch (e) {}
      })
    );

    Email.push(...extractEmails($('body').html() || ''));

    contacts.Instagram =
      $('a[href*="instagram.com"]')
        .toArray()
        .map((e) => e.attribs.href)
        .filter(filterSocialMediaLinks)
        .filter(filterSocialMediaLinks)
        .at(0) || '';
    contacts.Twitter =
      $('a[href*="twitter.com"], a[href*="www.x.com"]')
        .toArray()
        .map((e) => e.attribs.href)
        .filter(filterSocialMediaLinks)
        .filter(filterSocialMediaLinks)
        .at(0) || '';
    contacts.Facebook =
      $('a[href*="facebook.com"]')
        .toArray()
        .map((e) => e.attribs.href)
        .filter(filterSocialMediaLinks)
        .at(0) || '';
    contacts.TikTok =
      $('a[href*="tiktok.com"]')
        .toArray()
        .map((e) => e.attribs.href)
        .filter(filterSocialMediaLinks)
        .at(0) || '';
    contacts.YouTube =
      $('a[href*="youtube.com"]')
        .toArray()
        .map((e) => e.attribs.href)
        .filter(filterSocialMediaLinks)
        .at(0) || '';
    contacts.LinkedIn =
      $('a[href*="linkedin.com"]')
        .toArray()
        .map((e) => e.attribs.href)
        .filter(filterSocialMediaLinks)
        .at(0) || '';
  } catch (error) {}

  contacts.Description =
    (await getCompanyDescriptionFromWebsite(
      sitemap.find((u) => u.includes('about')) || url
    )) || '';

  try {
    if (!contacts.Instagram || !contacts.Facebook) {
      const socialMediaFromGoogle = await getSocialMediaFromGoogle(companyName);
      contacts.Instagram =
        contacts.Instagram || socialMediaFromGoogle.Instagram;
      contacts.Facebook = contacts.Facebook || socialMediaFromGoogle.Facebook;
      contacts.Twitter =
        contacts.Twitter ||
        socialMediaFromGoogle.Twitter ||
        socialMediaFromGoogle.X;
      contacts.TikTok = contacts.TikTok || socialMediaFromGoogle.Tiktok;
      contacts.YouTube = contacts.YouTube || socialMediaFromGoogle.Youtube;
      contacts.LinkedIn = contacts.LinkedIn || socialMediaFromGoogle.Linkedin;
    }
  } catch (e) {}

  try {
    if (contacts.Facebook?.length > 6) {
      const emailsFromFacebook = await getEmailsFromFacebook(contacts.Facebook);
      if (emailsFromFacebook.length) {
        contacts.Email = _.uniq(emailsFromFacebook).slice(0, 3).join(', ');
      } else {
        contacts.Email = _.uniq(Email).slice(0, 3).join(', ');
      }
    }
  } catch (e) {
    console.log('Failed to get emails from facebook');
    contacts.Email = _.uniq(Email).slice(0, 3).join(', ');
  }

  return {
    ...Object.fromEntries(
      Object.entries(contacts).map(([key, value]) => [
        key,
        value?.replace('www.', ''),
      ])
    ),
  };
}

type Result = {
  Rank: '';
  'First Name': string;
  'Last Name': string;
  Company: string;
  Speciality: string;
  Address: string;
  City: string;
  'State/Province': string;
  'Zip/Postal Code': string;
  Phone: string;
  Website: string;
  'Hours of Operation - Monday': string;
  'Hours of Operation - Tuesday': string;
  'Hours of Operation - Wednesday': string;
  'Hours of Operation - Thursday': string;
  'Hours of Operation - Friday': string;
  'Hours of Operation - Saturday': string;
  'Hours of Operation - Sunday': string;
  Description: string;
  Street: string;
  'Address 2': string;
  'Address 3': string;
  Facebook: string;
  Twitter: string;
  TikTok: string;
  YouTube: string;
  LinkedIn: string;
  Instagram: string;
  Email: string;
  'Image Source': '';
  'Tournament Name': string;
  'Tournament Year': string;
  'Market Location': string;
};

const formatResults = (results: Result[]) => {
  return results.map((r) => ({
    Rank: '',
    'First Name': r['First Name'],
    'Last Name': r['Last Name'],
    Company: r.Company,
    Address: r.Address,
    Phone: r.Phone || '*Phone',
    Website: r.Website || '*Website',
    Email: r.Email || '*Email',
    Description: r.Description || '*Description',
    Speciality: r.Speciality || '*Speciality',
    Facebook: r.Facebook || '*Fb',
    Instagram: r.Instagram || '*Ig',
    Linkedin: r.LinkedIn || '*Li',
    TikTok: r.TikTok || '*Tt',
    Twitter: r.Twitter || '*X',
    YouTube: r.YouTube || '*Yt',
    'Image Source': '',
    Street: r.Street || '*Street',
    City: r.City || '*City',
    'State/Province': r['State/Province'] || '*State',
    'Zip/Postal Code': r['Zip/Postal Code'] || '*Zip',
    'Address 2': r['Address 2'] || '*Address 2',
    'Address 3': r['Address 3'] || '*Address 3',
    'Hours of Operation - Monday': r['Hours of Operation - Monday'],
    'Hours of Operation - Tuesday': r['Hours of Operation - Tuesday'],
    'Hours of Operation - Wednesday': r['Hours of Operation - Wednesday'],
    'Hours of Operation - Thursday': r['Hours of Operation - Thursday'],
    'Hours of Operation - Friday': r['Hours of Operation - Friday'],
    'Hours of Operation - Saturday': r['Hours of Operation - Saturday'],
    'Hours of Operation - Sunday': r['Hours of Operation - Sunday'],
    'Tournament Year': r['Tournament Year'],
    'Tournament Name': r['Tournament Name'],
    'Market Location': r['Market Location'],
  }));
};

type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

async function scrapeDetails(page: Page, companyName: string) {
  const initialData = await page.evaluate(() => {
    return JSON.parse(
      // @ts-ignore
      window!.APP_INITIALIZATION_STATE.at(3).filter(Boolean).at(-1).slice(5)
    );
  });

  const baseEnities: any[] = (() => {
    const isPrefetched = initialData?.[0]?.[6];
    const isNotFoundAndPrefetchedDetails = initialData?.[0]?.[1]?.[0]?.[14];
    // const isNotFoundAndPrefetchedList = !initialData?.[0]?.[1]?.[1];
    if (isPrefetched) {
      return [initialData?.[0]?.[6]];
    }
    if (isNotFoundAndPrefetchedDetails) {
      return [initialData?.[0]?.[1]?.[0]?.[14]];
    } else {
      return initialData[0][1]
        .filter((el: any[]) => {
          if (!el[14]?.[11]) {
            return false;
          }

          return (
            distance(
              el?.[14]?.[11]?.toLowerCase(),
              companyName.toLowerCase()
            ) <= 4 ||
            el?.[14]?.[11]?.toLowerCase().includes(companyName.toLowerCase())
          );
        })
        .map((el: any) => el?.[14]);
    }
  })();

  const baseEntity = baseEnities?.[0];
  const addresses = baseEnities?.map((el) => el?.[37]?.[0]?.[0]?.[17]?.[0]);

  const workingHours = (() => {
    try {
      const wh = baseEntity?.[34]?.[1];
      const whs = wh.map((hours: [string, string]) => {
        const [day, [interval]] = hours;

        return [`Hours of Operation - ${day}`, interval];
      });

      return whs;
    } catch (e) {
      console.log('Working hours not found');
      return [];
    }
  })();

  const name = (() => {
    try {
      const name = baseEntity?.[11];
      return name;
    } catch (e) {
      console.log('Name not found');
      return '';
    }
  })();

  const results: Result = {
    Rank: '',
    Street: (() => {
      try {
        const firstStreet = baseEntity?.[2]?.[0];
        return firstStreet;
      } catch (e) {
        return '';
      }
    })(),
    'First Name': name,
    'Last Name': name,
    Company: name,
    Speciality: (() => {
      try {
        const speciality = baseEntity?.[13]?.[0];
        return speciality;
      } catch (e) {
        console.log('Speciality not found');
        return '';
      }
    })(),
    Address: (() => {
      try {
        const address = baseEntity?.[37]?.[0]?.[0]?.[17]?.[0];
        return address;
      } catch (e) {
        console.log('Address not found');
        return '';
      }
    })(),
    City: (() => {
      try {
        const city = baseEntity?.[183]?.[1]?.[3];
        return city;
      } catch (e) {
        console.log('City not found');
        return '';
      }
    })(),
    'State/Province': (() => {
      try {
        const stateKey = baseEntity?.[166]?.split(', ').at(1);

        return states[stateKey];
      } catch (e) {
        return '';
      }
    })(),
    'Zip/Postal Code': (() => {
      try {
        const zip = baseEntity?.[183]?.[1]?.[4];
        return zip;
      } catch (e) {
        console.log('Zip/Postal Code not found');
        return '';
      }
    })(),
    Phone: (() => {
      try {
        const phone = baseEntity?.[178]?.[0]?.[1]?.[0]?.[0];
        return phone;
      } catch (e) {
        console.log('Phone not found');
        return '';
      }
    })(),
    Website: (() => {
      try {
        const website = baseEntity?.[7]?.[0].replace('/url?q=', '');
        return website;
      } catch (e) {
        console.log('Website not found');
        return '';
      }
    })(),
    'Hours of Operation - Monday': '',
    'Hours of Operation - Tuesday': '',
    'Hours of Operation - Wednesday': '',
    'Hours of Operation - Thursday': '',
    'Hours of Operation - Friday': '',
    'Hours of Operation - Saturday': '',
    'Hours of Operation - Sunday': '',
    Description: '',
    'Address 2': addresses.at(1) || '',
    'Address 3': addresses.at(2) || '',
    Facebook: '',
    Twitter: '',
    LinkedIn: '',
    TikTok: '',
    YouTube: '',
    Instagram: '',
    Email: '',
    'Image Source': '',
    'Tournament Name': '',
    'Tournament Year': '',
    'Market Location': baseEntity?.[183]?.[1]?.[3],
  };

  if (workingHours?.length) {
    Object.assign(results, Object.fromEntries(workingHours));
  }

  results['Tournament Year'] = new Date().getFullYear().toString();

  try {
    const contacts = await scrapeWebsite(
      results.Website,
      `${results.Company} ${results.City}`
    );
    console.log('🚀 ~ scrapeDetails ~ contacts:', contacts);
    Object.assign(results, contacts);
  } catch (e) {
    console.log(e);
  }
  return results;
}

export async function searchByQuery(
  query: string,
  location: string,
  tournamentName: string
) {
  const tabForList = await browser.tabs.create({
    url: `https://google.com/maps/search/${query}+${location}`,
    active: true,
    pinned: true,
  });
  const pageForList = await connectTab(tabForList.id!);
  await pageForList.waitForNavigation();
  while (
    await pageForList.evaluate(() => {
      return !document.body?.textContent?.includes(
        "You've reached the end of the list."
      );
    })
  ) {
    await pageForList.$eval('div[aria-label*="Results for"]', (scrollBlock) => {
      scrollBlock.scrollBy({ top: 200, left: 0, behavior: 'smooth' });
    });
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const links = await pageForList.$$eval('.hfpxzc', (elements) => {
    return elements
      .filter((e) => !e.parentElement?.textContent?.includes('Sponsored'))
      .map((e) => {
        const event = e as HTMLLinkElement;

        return {
          href: event.href,
          company: event.ariaLabel?.split(' · ').at(0),
        };
      });
  });
  const results = [];
  for (const linkData of links) {
    try {
      await retry(
        async () =>
          await pageForList.goto(
            `https://google.com/maps/search/"${linkData.company}" ${location}`,
            { waitUntil: 'domcontentloaded', timeout: 5000 }
          ),
        3
      );
      const response = await scrapeDetails(pageForList, linkData.company!);
      results.push(response);
    } catch (error) {
      console.error(error);
    }
  }

  await browser.tabs.remove(tabForList.id!);
  await pageForList.browser().disconnect();

  return formatResults(results).map((c) => {
    return {
      ...c,
      'Tournament Name': tournamentName,
    };
  });
}

export async function searchByCompanyName(
  companies: string[],
  location: string,
  tournamentName: string
) {
  const tabForList = await browser.tabs.create({
    url: `https://www.google.com/maps`,
    active: true,
    pinned: true,
  });
  const pageForList = await connectTab(tabForList.id!);
  const results = [];

  for (const company of companies) {
    await retry(
      async () =>
        await pageForList.goto(
          `https://google.com/maps/search/"${company}"+${location}`,
          { waitUntil: 'domcontentloaded', timeout: 5000 }
        ),
      3
    );

    const response = await scrapeDetails(pageForList, company);
    results.push(response);
  }
  await browser.tabs.remove(tabForList.id!);
  await pageForList.browser().disconnect();

  return formatResults(
    results.map((c) => ({ ...c, 'Tournament Name': tournamentName }))
  );
}
