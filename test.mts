import * as cheerio from 'cheerio';
// @ts-ignore d
import lodash from 'lodash-es';
import deepdash from 'deepdash-es';
import { value } from 'jsonpath';
const _ = deepdash(lodash);

const testUrl1 =
  'https://www.google.com/maps/place/Bazaar+Meat+By+Jos%C3%A9+Andr%C3%A9s/data=!4m7!3m6!1s0x80c8c476bf6b1385:0x3525a1c57ecf84a!8m2!3d36.1432167!4d-115.1571278!16s%2Fg%2F11bbxlpwk0!19sChIJhRNrv3bEyIARSvjsVxxaUgM?authuser=0&hl=en&rclk=1';

const testUrl2 =
  'https://www.google.com/maps/place/Golden+Steer+Steakhouse+Las+Vegas/data=!4m7!3m6!1s0x80c8c475a54e00e3:0xf8755fde4cbb4d1d!8m2!3d36.1441637!4d-115.1611962!16s%2Fg%2F1tzzvsl_!19sChIJ4wBOpXXEyIARHU27TN5fdfg?authuser=0&hl=en&rclk=1';

const testUrl3 =
  'https://www.google.com/maps/place/%C3%A9+by+Jos%C3%A9+Andr%C3%A9s/@36.110304,-115.1769007,17z/data=!3m1!5s0x80c8c4304a587651:0x7edf0a3a43a53875!4m6!3m5!1s0x80c8c431a8ffb015:0x747f85df7f106007!8m2!3d36.110304!4d-115.1743258!16s%2Fm%2F0xmmwcx?authuser=0&hl=en&entry=ttu&g_ep=EgoyMDI0MDkwNC4wIKXMDSoASAFQAw%3D%3D';

const testUrl4 =
  'https://www.google.com/maps/place/Edo+Gastro+Tapas+%26+Wine/@36.1273259,-115.2267672,17z/data=!3m1!4b1!4m6!3m5!1s0x80c8c71182f68d91:0xe7bacb375f7667c5!8m2!3d36.1273216!4d-115.2241923!16s%2Fg%2F11f7pgwcwx?entry=ttu&g_ep=EgoyMDI0MDkwNC4wIKXMDSoASAFQAw%3D%3D';

const response = await fetch(
  'https://google.com/maps/search/Parlor Doughnuts las vegas'
);

const html = await response.text();

const $ = cheerio.load(html);

const script = $(
  $('script')
    .toArray()
    .find(
      (e) =>
        $(e)?.html()?.includes('Sunday') && $(e)?.html()?.includes('Monday')
    )
).text();

const getWindow = new Function(`
  const scraperWindow = {};
  ${script.replaceAll('window', 'scraperWindow')};
  return scraperWindow;
`);

const scraperWindow: any = getWindow();

const initialData: any[] = JSON.parse(
  scraperWindow.APP_INITIALIZATION_STATE.at(3).filter(Boolean).at(-1).slice(5)
);

// console.dir(initialData, { depth: null });

const result = _.eachDeep(initialData, (value, key, parent, context) => {
  if (value?.includes && value.includes('Tennessee')) {
    // console.log(value);
    // console.log(context.path); // ['0.key.1'] или ['1.2.key.2']
  }
  if (value === 'Tennessee') {
    console.log(context.path); // ['0.key.1'] или ['1.2.key.2']
  }
});

const workingHours = initialData[6][34][1].map((hours: [string, string]) => {
  const [day, [interval]] = hours;

  return [`Hours of Operation - ${day}`, interval];
});

const entity = {
  Company: initialData[6][11],
  'First Name': initialData[6][11],
  'Last Name': initialData[6][11],
  Address: initialData[6][37][0][0][17][0],
  Phone: initialData[6][178][0][1][0][0],
  Website: (() => {
    const website = initialData[6][7][0].replace('/url?q=', '');
    if (!website) return '';
    return website;
  })(),
  Speciality: `${initialData[6][13][0]}`,
  Street: (() => {
    return initialData[6][2][0];
  })(),
  City: initialData[6][183][1][3],
  'State/Province': initialData[6][183][2][2][0].split(', ').at(-2),
  'Zip/Postal Code': initialData[6][183][1][4],
  ...(initialData[6][34][1][5] && Object.fromEntries(workingHours)),
};

console.log(entity);
