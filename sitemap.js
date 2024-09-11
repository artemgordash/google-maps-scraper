import { XMLParser } from 'fast-xml-parser';
import _ from 'lodash';

const parser = new XMLParser();

async function getSitemap(webURL) {
  const links = [];
  const origin = new URL(webURL).origin;
  const host = new URL(webURL).host.replace('www.', '');
  const response = await fetch(origin + '/sitemap.xml');
  const xml = await response.text();
  links.push(
    ...Object.values(flattenObject(parser.parse(xml))).filter(Boolean)
  );

  const nextXMLLink = links.find(
    (l) => typeof l === 'string' && l.includes('.xml')
  );

  if (nextXMLLink) {
    const xmlLinks = links.filter((l) => l.endsWith('.xml'));

    const xmlLinksResponse = await Promise.all(
      xmlLinks.map(async (l) => {
        try {
          const response = await fetch(l);
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
  });
}

const websites = [
  'http://www.8ozkbbq.com/',
  'http://alsolito.com/',
  'https://www.amarilv.com/',
  'https://animabyedo.com/',
  'https://www.baguettecafelv.com/',
  'http://www.bigbztexasbbq.com/',
  'http://www.bobtaylorsranchhouse.com/',
  'http://www.calabashafricankitchen.com/',
  'http://carsonkitchen.com/',
  'https://www.casadonjuanlv.com/',
  'http://www.cleaverlasvegas.com/',
  'http://www.districtonelv.com/',
  'https://www.domdemarcos.com/',
  'http://dwbistro.com/',
  'https://eatdtlv.chefnatalieyoung.com/',
];

for (const website of websites) {
  try {
    console.log(await getSitemap(website));
  } catch (e) {
    console.log('error ', website);
    console.log(e);
  }
}

function flattenObject(ob) {
  var toReturn = {};

  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if (typeof ob[i] == 'object' && ob[i] !== null) {
      var flatObject = flattenObject(ob[i]);
      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;

        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}
