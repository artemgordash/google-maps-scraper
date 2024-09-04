import * as cheerio from 'cheerio';

const $ = await cheerio.fromURL('https://cheerio.js.org/docs/advanced/extract');

console.log(
  $('a')
    .toArray()
    .map((e) => e.attribs.href)
);
