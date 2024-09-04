import _ from 'lodash';
import { connectTab } from '@/helpers/puppeteer';
import { Page } from 'puppeteer-core/internal/index.js';
import { parsePhoneNumber } from 'awesome-phonenumber';
import { distance } from 'fastest-levenshtein';
import * as cheerio from 'cheerio';

async function scrapeWebsite(url: string) {
  const baseUrl = new URL(url).origin;
  const host = new URL(url).hostname;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const html = await response.text();
  const dom = await cheerio.load(html);
  const urls = [
    url,
    ...dom('a[href]')
      .toArray()
      .map((e) => e.attribs.href),
  ]
    .filter((u) => {
      if (u?.includes(host)) return true;
      if (u?.startsWith('/')) return true;
      if (!u?.startsWith('http')) return true;

      return false;
    })
    .map((u) => {
      if (!u?.startsWith('http')) {
        return `${baseUrl}${u}`;
      }

      return u;
    });
  const Description = dom('meta[name="description"]').attr('content') ?? '';
  const contacts: { [key: string]: string } = {
    Instagram: '',
    Twitter: '',
    Facebook: '',
    TikTok: '',
    YouTube: '',
    LinkedIn: '',
  };

  const Emails: string[] = [];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url!, {
          signal: AbortSignal.timeout(5000),
        });
        const html = await response.text();
        const dom = cheerio.load(html);

        Object.keys(contacts).forEach((key) => {
          if (contacts[key] === '') {
            const href =
              dom(`a[href*="${key.toLowerCase()}"]`)
                .toArray()
                .filter((u) => {
                  try {
                    new URL(u.attribs.href);
                    return true;
                  } catch (error) {
                    return false;
                  }
                })
                .at(-1)?.attribs.href ?? '';
            contacts[key] = href.includes('chrome-extension') ? '' : href;
          }

          const emails = dom('a[href*="mailto"]')
            .toArray()
            .map(
              (e) =>
                e.attribs.href
                  ?.split(':')
                  .at(1)
                  ?.split('?')
                  .at(0)
                  ?.trim() as string
            );

          if (emails.length) {
            Emails.push(...emails);
          }
        });
      } catch (e) {}
    })
  );

  return {
    ...contacts,
    Description,
    Email: _.uniq(Emails)
      .map((e) => e.toLowerCase())
      .join(', '),
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
    Phone: r.Phone,
    Website: r.Website,
    Email: r.Email,
    Description: r.Description,
    Speciality: r.Speciality,
    Facebook: r.Facebook,
    Instagram: r.Instagram,
    Linkedin: r.LinkedIn,
    TikTok: r.TikTok,
    Twitter: r.Twitter,
    YouTube: r.YouTube,
    'Image Source': '',
    Street: r.Street,
    City: r.City,
    'State/Province': r['State/Province'],
    'Zip/Postal Code': r['Zip/Postal Code'],
    'Address 2': r['Address 2'],
    'Address 3': r['Address 3'],
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

async function scrapeDetails(page: Page) {
  // const main = await page.$('div[role="main"]');
  const results: Result = {
    Rank: '',
    Street: '',
    'First Name': '',
    'Last Name': '',
    Company: '',
    Speciality: '',
    Address: '',
    City: '',
    'State/Province': '',
    'Zip/Postal Code': '',
    Phone: '',
    Website: '',
    'Hours of Operation - Monday': '',
    'Hours of Operation - Tuesday': '',
    'Hours of Operation - Wednesday': '',
    'Hours of Operation - Thursday': '',
    'Hours of Operation - Friday': '',
    'Hours of Operation - Saturday': '',
    'Hours of Operation - Sunday': '',
    Description: '',
    'Address 2': '',
    'Address 3': '',
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
    'Market Location': '',
  };
  results['Tournament Year'] = new Date().getFullYear().toString();
  const documentTitle = await page.evaluate(() => document.title);
  const companyName = documentTitle.replace(' - Google Maps', '') ?? '';
  results.Company = companyName;
  results['First Name'] = companyName;
  results['Last Name'] = companyName;

  results.Speciality = await page.evaluate(
    () =>
      document?.body?.querySelector('*[jsaction$=".category"]')?.textContent ??
      '*Speciality'
  );

  results.Address = await page.evaluate(
    () =>
      document
        ?.querySelector('button[data-tooltip="Copy address"]')
        ?.textContent?.slice(1) ?? '*Address'
  );

  results.Street =
    results.Address !== '*Address'
      ? results.Address.split(',').at(0) ?? '*Street'
      : '*Street';

  const location = await page.evaluate(() =>
    document
      ?.querySelector('button[data-tooltip="Copy plus code"]')
      ?.textContent?.split(' ')
      ?.slice(1)
      ?.join(' ')
      ?.split(', ')
  );

  if (location?.length === 2) {
    const [state, country] = location;
    results.City = state;
    results['State/Province'] = state;
    // results.Country = country;
    results['Market Location'] = state;
  } else if (location?.length === 3) {
    const [city, state, country] = location;
    results.City = city;
    results['State/Province'] = state;
    // results.Country = country;
    results['Market Location'] = city;
  }

  results['Zip/Postal Code'] = await page.evaluate(
    () =>
      document
        ?.querySelector('button[data-tooltip="Copy address"]')
        ?.textContent?.slice(1)
        ?.split(', ')
        ?.at(-2)
        ?.split(' ')
        ?.at(-1) ?? '*Zip/Postal Code'
  );

  const tempPhone = await page.evaluate(
    () =>
      document
        ?.querySelector('button[data-tooltip="Copy phone number"]')
        ?.textContent?.slice(1) ?? '*Phone'
  );

  if (tempPhone) {
    results.Phone =
      parsePhoneNumber(tempPhone, { regionCode: 'US' })?.number?.national ??
      'Not found on Google Maps';
  }

  results.Website = await page.evaluate(
    () =>
      document?.querySelector<HTMLLinkElement>('a[data-tooltip="Open website"]')
        ?.href ?? 'N/A'
  );

  if (results.Website !== 'N/A') {
    try {
      const websiteResponse = await scrapeWebsite(results.Website);
      Object.assign(results, websiteResponse);
    } catch (error) {
      console.log('🚀 ~ scrapeDetailsWebsite ~ error:', error);
    }
  }

  const hasMoreHours = await page?.evaluate(() => {
    return (
      document.querySelectorAll('button[data-tooltip="Copy open hours"]')
        .length < 2
    );
  });

  try {
    if (hasMoreHours) {
      const seeMoreHoursButton = await page.$(
        'button[aria-label$="See more hours"]'
      );
      await seeMoreHoursButton?.click({ count: 3 });
      await page.waitForSelector('button[data-tooltip="Copy open hours"]', {
        timeout: 4000,
      });
      const ophData = await page.$$eval(
        'button[data-tooltip="Copy open hours"]',
        (elements) => {
          return elements.slice(0, 7).map((e) => e.getAttribute('data-value'));
        }
      );

      ophData?.forEach((data) => {
        const [day, interval] = (data?.split(', ') as [DayOfWeek, string]) || [
          '',
          '',
        ];
        results[`Hours of Operation - ${day}`] = `${day}:[${interval}]`;
      });
    } else {
      const ophData = await page.$$eval(
        'button[data-tooltip="Copy open hours"]',
        (elements) => {
          return elements.map((e) => e.getAttribute('data-value'));
        }
      );

      ophData?.forEach((data) => {
        const [day, interval] = (data?.split(', ') as [DayOfWeek, string]) || [
          '',
          '',
        ];
        results[`Hours of Operation - ${day}`] = `${day}:[${interval}]`;
      });
    }
  } catch (error) {
    console.log('🚀 ~ scrapeDetails ~ error:', error);
  }

  return results;
}

export async function searchByQuery(query: string, tournamentName: string) {
  const tabForList = await browser.tabs.create({
    url: `http://maps.google.com/?q=${encodeURIComponent(query)}`,
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
      .map((e) => (e as HTMLLinkElement).href);
  });
  const results = [];
  for (const link of links) {
    try {
      await browser.tabs.update(tabForList.id!, { active: true });
      await pageForList.goto(link);
      const response = await scrapeDetails(pageForList);
      console.log('🚀 ~ onSearchByQuery ~ results.length:', results.length);
      results.push(response);
    } catch (error) {
      console.error(error);
    }
  }

  await browser.tabs.remove(tabForList.id!);
  await pageForList.browser().disconnect();

  return formatResults(unifyLocations(results)).map((c) => {
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
    url: `about:blank`,
    active: true,
    pinned: true,
  });
  const pageForList = await connectTab(tabForList.id!);
  const results = [];

  for (const company of companies) {
    await pageForList.goto(
      `http://maps.google.com/?q=${encodeURIComponent(
        `${company} ${location}`
      )}`
    );
    if (await pageForList.$('a.hfpxzc')) {
      const links = await pageForList.evaluate(() =>
        [...document.querySelectorAll('a.hfpxzc')].map((e) => ({
          href: e.getAttribute('href'),
          ariaLabel: e.getAttribute('aria-label'),
        }))
      );
      const onlyCompanyLinks = links
        .filter(
          (l) =>
            distance(
              company.trim().toLowerCase(),
              l.ariaLabel?.trim().toLowerCase() as string
            ) < 4
        )
        .slice(0, 3);

      for (const link of onlyCompanyLinks) {
        try {
          await pageForList.goto(link.href as string);
          const response = await scrapeDetails(pageForList);
          results.push(response);
        } catch (error) {
          console.error(error);
        }
      }

      continue;
    }

    const response = await scrapeDetails(pageForList);
    results.push(response);
  }
  await browser.tabs.remove(tabForList.id!);
  await pageForList.browser().disconnect();

  return formatResults(
    unifyLocations(
      results.map((c) => ({ ...c, 'Tournament Name': tournamentName }))
    )
  );
}

function removeExcessDuplicates(arr: Result[]) {
  const countMap: any = {};

  return arr.filter((obj) => {
    const companyName = obj.Company;
    countMap[companyName] = (countMap[companyName] || 0) + 1;
    return countMap[companyName] <= 3;
  });
}

function unifyLocations(results: Result[]) {
  const unifiedData: Result[] = [];
  results = removeExcessDuplicates(results);
  for (const result of results) {
    if (unifiedData.some((c) => c.Company === result.Company)) continue;

    const companies = results.filter((c) => c.Company === result.Company);
    const mainCompany = companies.at(0) as Result;

    if (companies.length === 1) {
      unifiedData.push(result);
      continue;
    }
    mainCompany['Address 2'] = companies.at(1)?.['Address'] ?? '';
    mainCompany['Address 3'] = companies.at(2)?.['Address'] ?? '';
    unifiedData.push(mainCompany);
  }

  return unifiedData;
}
