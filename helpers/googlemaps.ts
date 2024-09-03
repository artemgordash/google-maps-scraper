import axios from 'axios';
import {
  Client,
  PlaceInputType,
  PlaceType2,
} from '@googlemaps/google-maps-services-js';
import * as cheerio from 'cheerio';
import _ from 'lodash';
import { sentenceCase } from 'change-case';

const haha = 'AIzaSyCBtgEl9QsTcxrcc19tRATze5YYZjnNaag';

export async function getPlacesIdByQuery(query: string) {
  try {
    const makeReq = async (pagetoken?: string) =>
      await client.textSearch({
        params: {
          query: query,
          key: haha,
          pagetoken,
        },
      });

    const res1 = await makeReq();
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const req2 = await makeReq(res1.data.next_page_token);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const req3 = await makeReq(req2.data.next_page_token);

    return [
      ...res1.data.results,
      ...req2.data.results,
      ...req3.data.results,
    ].map((r) => r.place_id);
  } catch (error) {}
}

const client = new Client({ axiosInstance: axios });

export async function searchForPlaces(query: string) {
  try {
    const response = await client.findPlaceFromText({
      params: {
        input: query,
        key: haha,
        fields: ['name', 'place_id'],
        inputtype: PlaceInputType.textQuery,
      },
    });
    response.data.next_page_token;
    return response.data.candidates;
  } catch (error) {
    console.error(error);
  }
}

export async function getPlaceDetails(
  placeId: string,
  tournamentName: string = ''
) {
  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        key: haha,
        fields: [
          'address_components',
          'opening_hours',
          'website',
          'formatted_address',
          'formatted_phone_number',
          'name',
          'types',
        ],
      },
    });

    const place = response.data.result;
    console.log('🚀 ~ getPlaceDetails ~ place:', place);

    const operationalHours = place?.opening_hours?.weekday_text?.map((d) => {
      const [weekDay, periods] = d.split(': ');

      return `${weekDay}:[${periods}]`;
    });

    const socialMedia: {
      Instagram: string;
      Twitter: string;
      Facebook: string;
      Linkedin: string;
      Youtube: string;
      Tiktok: string;
      Email: string;
      Description: string;
    } = {
      Instagram: '*Instagram',
      Twitter: '*Twitter',
      Facebook: '*Facebook',
      Linkedin: '*Linkedin',
      Youtube: '*Youtube',
      Tiktok: '*Tiktok',
      Email: '*Email',
      Description: '*Description',
    };

    if (place.website) {
      try {
        const webResponse = await fetch(place.website, {});
        const html = await webResponse.text();
        const $ = await cheerio.load(html);
        socialMedia.Description =
          $('meta[name="description"]').attr('content') ?? 'N/A';
        socialMedia.Instagram =
          $('a[href*="instagram.com"]').attr('href') ?? 'N/A';
        socialMedia.Twitter =
          $('a[href*="twitter"], a[href*="x.com"]').attr('href') ?? 'N/A';
        socialMedia.Facebook =
          $('a[href*="facebook.com"]').attr('href') ?? 'N/A';
        socialMedia.Linkedin =
          $('a[href*="linkedin.com"]').attr('href') ?? 'N/A';
        socialMedia.Youtube = $('a[href*="youtube.com"]').attr('href') ?? 'N/A';
        socialMedia.Tiktok = $('a[href*="tiktok.com"]').attr('href') ?? 'N/A';
        socialMedia.Email =
          $('a[href*="mailto"]')
            .attr('href')
            ?.split('mailto:')
            .at(-1)
            ?.split('?')
            .at(0)
            ?.trim() ?? 'N/A';
      } catch (e) {
        if (e instanceof Error) {
          console.log('Failed to scrape website: ', e.message);
          console.log('Website: ', place?.website);
        }
      }
    }

    const localityIndex = place?.address_components?.findIndex((c) =>
      c.types.includes(PlaceType2.locality)
    );

    const street = place?.address_components
      ?.slice(0, localityIndex)
      .map((s) => s.long_name)
      .join(', ');

    return {
      Rank: '',
      'First Name': place?.name,
      'Last Name': place?.name,
      Company: place?.name,
      Address: place?.formatted_address,
      Phone: place?.formatted_phone_number ?? 'N/A',
      Website: place?.website ?? 'N/A',
      Email: socialMedia.Email,
      Description: place.editorial_summary?.overview ?? socialMedia.Description,
      Speciality: `${sentenceCase(place?.types?.at(0)!)} & ${sentenceCase(
        place?.types?.at(1)!
      )}`,
      Facebook: socialMedia.Facebook,
      Instagram: socialMedia.Instagram,
      Linkedin: socialMedia.Linkedin,
      TikTok: socialMedia.Tiktok,
      Twitter: socialMedia.Twitter,
      Youtube: socialMedia.Youtube,
      'Image Source': 'FB',
      Street: street,
      City: place?.address_components?.find((c) =>
        c?.types.includes(PlaceType2.locality)
      )?.long_name,
      'State/Province': place.address_components?.find((c) =>
        c?.types?.includes(PlaceType2.administrative_area_level_1)
      )?.long_name,
      'Zip/Postal Code': place?.address_components?.find((c) =>
        c?.types?.includes(PlaceType2.postal_code)
      )?.long_name,
      'Address 2': '*A2',
      'Address 3': '*A3',
      'Hours of Operation - Monday': operationalHours?.find((h) =>
        h.includes('Monday')
      ),
      'Hours of Operation - Tuesday': operationalHours?.find((h) =>
        h.includes('Tuesday')
      ),
      'Hours of Operation - Wednesday': operationalHours?.find((h) =>
        h.includes('Wednesday')
      ),
      'Hours of Operation - Thursday': operationalHours?.find((h) =>
        h.includes('Thursday')
      ),
      'Hours of Operation - Friday': operationalHours?.find((h) =>
        h.includes('Friday')
      ),
      'Hours of Operation - Saturday': operationalHours?.find((h) =>
        h.includes('Saturday')
      ),
      'Hours of Operation - Sunday': operationalHours?.find((h) =>
        h.includes('Sunday')
      ),
      'Tournament Year': new Date().getFullYear(),
      'Tournament Name': tournamentName,
      'Market Location': place?.address_components?.find((c) =>
        c?.types?.includes(PlaceType2.locality)
      )?.long_name,
    };
  } catch (error) {
    console.log(error);
    return {};
  }
}
