export default defineUnlistedScript(async () => {
  let elements = [...document.querySelectorAll('.hfpxzc')];

  while (
    !document.body.textContent.includes("You've reached the end of the list.")
  ) {
    elements = [...document.querySelectorAll('.hfpxzc')];
    document
      .querySelector('div[aria-label*="Results for"]')
      .scrollBy({ top: 200, behaviour: 'smooth', left: 0 });
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const links = elements.map((element) => element.href);

  return links;
});
