export default defineUnlistedScript(async () => {
  const results = {};

  results.company = document.title.replace(' - Google Maps', '');

  results.category = document.body.querySelector(
    '*[jsaction$=".category"]'
  ).textContent;

  results.address = document
    .querySelector('button[data-tooltip="Copy address"]')
    .textContent.slice(1);

  const location = document
    .querySelector('button[data-tooltip="Copy plus code"]')
    .textContent.split(' ')
    .slice(1)
    .join(' ')
    .split(', ');

  if (location.length === 2) {
    const [state, country] = location;
    results.city = state;
    results.state = state;
    results.country = country;
  } else {
    const [city, state, country] = location;
    results.city = city;
    results.state = state;
    results.country = country;
  }

  results.postalCode = document
    .querySelector('button[data-tooltip="Copy address"]')
    .textContent.slice(1)
    .split(', ')
    .at(-2)
    .split(' ')
    .at(-1);

  results.phoneNumber = document
    .querySelector('button[data-tooltip="Copy phone number"]')
    .textContent.slice(1);

  results.website = document.querySelector(
    'a[data-tooltip="Open website"]'
  ).href;

  const hasMoreHours =
    document.querySelectorAll('button[data-tooltip="Copy open hours"]').length <
    2;

  results.workingHours = {};

  if (hasMoreHours) {
    document.querySelector('button[aria-label$="See more hours"]').click();
    await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (document.querySelector('button[data-tooltip="Copy open hours"]')) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
    [...document.querySelectorAll('button[data-tooltip="Copy open hours"]')]
      .slice(0, 7)
      .forEach((e) => {
        const [day, interval] = e.getAttribute('data-value').split(', ');

        results.workingHours[
          `Hours of Operation - ${day}`
        ] = `${day}:[${interval}]`;
      });
  } else {
    [
      ...document.querySelectorAll('button[data-tooltip="Copy open hours"]'),
    ]?.forEach((e) => {
      const [day, interval] = e.getAttribute('data-value').split(', ');

      results.workingHours[
        `Hours of Operation - ${day}`
      ] = `${day}:[${interval}]`;
    });
  }

  if (Object.keys(results.workingHours).length > 2) {
    results.workingHours = {
      'Hours of Operation - Monday':
        results.workingHours['Hours of Operation - Monday'],
      'Hours of Operation - Tuesday':
        results.workingHours['Hours of Operation - Tuesday'],
      'Hours of Operation - Wednesday':
        results.workingHours['Hours of Operation - Wednesday'],
      'Hours of Operation - Thursday':
        results.workingHours['Hours of Operation - Thursday'],
      'Hours of Operation - Friday':
        results.workingHours['Hours of Operation - Friday'],
      'Hours of Operation - Saturday':
        results.workingHours['Hours of Operation - Saturday'],
      'Hours of Operation - Sunday':
        results.workingHours['Hours of Operation - Sunday'],
    };
  }

  return results;
});
