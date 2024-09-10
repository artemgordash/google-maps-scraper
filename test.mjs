import { distance } from 'fastest-levenshtein';
import * as cheerio from 'cheerio';
import { diceCoefficient } from 'dice-coefficient';

async function getCompanyDescriptionFromWebsite(companyName, websiteUrl) {
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
        return new URL(e.url).hostname === hostname;
      } catch (error) {
        return false;
      }
    });

  const websiteResponse = await fetch(searchResults.at(0).url);

  const websiteHtml = await websiteResponse.text();

  const $website = cheerio.load(websiteHtml);

  return $website(
    $website('*')
      .toArray()
      .filter((e) =>
        $website(e).text().includes(searchResults.at(0).description)
      )
      .at(-1)
  ).text();
}

console.log(
  await getCompanyDescriptionFromWebsite(
    '8oz las vegas',
    'https://8ozkbbq.com/'
  )
);
// console.log(diceCoefficient(strin1, strin2));
