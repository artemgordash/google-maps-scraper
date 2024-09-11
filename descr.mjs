import { JSDOM } from 'jsdom';
import _ from 'lodash';

const response = await fetch('https://8ozkbbq.com/');

const html = await response.text();

const dom = new JSDOM(html);

const tags = [...dom.window.document.body.querySelectorAll('span, p')].map(
  (e) => e.textContent?.trim() || ''
);

const possibleDescriptions = tags.filter((e) => {
  const clearedString = e.match(/[a-z]/g);

  return clearedString?.length > 100;
});

console.log(_.uniq(possibleDescriptions).slice(0, 2).join('\n'));

// const delimiter = '**********';
// const text = new Readability(dom.window.document, {
//   serializer: (e) => {
//     console.log(e);

//     return e.textContent;
//   },
// }).parse();
// console.log(text.content);
// console.log(
//   _.uniq(
//     text.content
//       ?.split('\n')
//       .map((e) => e.trim())
//       .filter((e) => {
//         const trimmed = e.match(/[a-z]/g);
//         return trimmed?.length && trimmed?.length > 100;
//       })
//   ).join('\n\n')
// );

// async function getCompanyDescriptionFromWebsite(companyName, websiteUrl) {
//   const hostname = new URL(websiteUrl).hostname;

//   const response = await fetch(
//     `https://www.bing.com/search?go=Search&q=about+story+${companyName}&search=&form=QBLH`
//   );

//   const html = await response.text();

//   const $ = cheerio.load(html);

//   const searchResults = $('li.b_algo')
//     .toArray()
//     .map((card) => {
//       const cardElement = $(card);

//       cardElement.remove('.algoSlug_icon');

//       return {
//         description: cardElement
//           .find('div[role="contentinfo"]')
//           .text()
//           .slice(3, -1),
//         url: cardElement.find('a').attr('href'),
//       };
//     })
//     .filter((e) => {
//       try {
//         return new URL(e.url).hostname === hostname;
//       } catch (error) {
//         return false;
//       }
//     });

//   const websiteResponse = await fetch(searchResults.at(0).url);

//   const websiteHtml = await websiteResponse.text();

//   const $website = cheerio.load(websiteHtml);

//   return $website(
//     $website('*')
//       .toArray()
//       .filter((e) =>
//         $website(e).text().includes(searchResults.at(0).description)
//       )
//       .at(-1)
//   ).text();
// }

// console.log(
//   await getCompanyDescriptionFromWebsite(
//     '8oz las vegas',
//     'https://8ozkbbq.com/'
//   )
// );
// console.log(diceCoefficient(strin1, strin2));
