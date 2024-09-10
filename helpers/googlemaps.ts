import _, { initial } from 'lodash';
import { connectTab } from '@/helpers/puppeteer';
import { Page } from 'puppeteer-core/internal/index.js';
import { distance } from 'fastest-levenshtein';
import * as cheerio from 'cheerio';
import { extractEmails } from '@/helpers/extract-emails';
import { Email, Description } from '@mui/icons-material';

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
    !link.includes('photo.php')
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
  Email: string;
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

async function getCompanyDescriptionFromWebsite(
  companyName: string,
  websiteUrl: string
) {
  try {
    const hostname = new URL(websiteUrl).hostname;

    const response = await fetch(
      `https://www.bing.com/search?go=Search&q=about+story+${companyName}&search=&form=QBLH`
    );

    const html = await response.text();

    const $ = cheerio.load(html);

    const searchResults = $('li.b_algo')
      .toArray()
      .map((card) => {
        const cardElement = $(card);

        cardElement.remove('.algoSlug_icon');

        return {
          description: cardElement
            .find('div[role="contentinfo"]')
            .text()
            .slice(3, -1),
          url: cardElement.find('a').attr('href'),
        };
      })
      .filter((e) => {
        try {
          if (!e.url) return false;
          return new URL(e.url).hostname === hostname;
        } catch (error) {
          return false;
        }
      });

    if (!searchResults.length || !searchResults.at(0)?.description.length)
      return null;

    const websiteResponse = await fetch(searchResults?.at(0)?.url as string);

    const websiteHtml = await websiteResponse.text();

    const $website = cheerio.load(websiteHtml);
    const description = $website(
      $website('*')
        .toArray()
        .filter((e) =>
          $website(e)
            .text()
            .includes(searchResults.at(0)?.description as string)
        )
        .at(-1)
    ).text();

    return description.includes(
      searchResults.at(0)?.description.slice(0, -8) as string
    )
      ? description
      : '';
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

  try {
    if (!url) throw new Error('No URL provided');
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await response.text();
    const $ = await cheerio.load(html);
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
    contacts.Email = _.uniq(extractEmails($('body').html() || ''))
      ?.slice(0, 2)
      .map((e) => e.toLowerCase())
      .join(', ');
  } catch (error) {}

  if (url) {
    const description = await getCompanyDescriptionFromWebsite(
      companyName,
      url
    );
    console.log('🚀 ~ scrapeWebsite ~ description:', description);
    contacts.Description = description || '';
  }

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

          return distance(el?.[14]?.[11], companyName) <= 4;
        })
        .map((el: any) => el?.[14]);
    }
  })();

  const baseEntity = baseEnities?.[0];
  const addresses = baseEnities?.map((el) => el?.[2]?.[0]);

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
        const state =
          baseEntity?.[183]?.[2]?.[2]?.[0]?.split(', ').at(-2) ||
          baseEntity?.[183]?.[1]?.[5];

        console.log('🚀 ~ scrapeDetails ~ state:', state);
        return state;
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
      `${results.Company} from ${results.City}`
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
      await pageForList.goto(
        `https://google.com/maps/search/"${linkData.company}" ${location}`,
        { waitUntil: 'domcontentloaded' }
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
    await pageForList.goto(
      `https://google.com/maps/search/"${company}"+${location}`,
      { waitUntil: 'domcontentloaded' }
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
