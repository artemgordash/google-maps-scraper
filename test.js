import Sitemapper from 'sitemapper';

const sitemap = new Sitemapper();

console.log(new URL('https://instagram.com/sitemap.xml'));
sitemap.fetch('https://instagram.com/sitemap.xml').then(function (sites) {
  console.log(sites);
});
