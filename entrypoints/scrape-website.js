export default defineUnlistedScript(async () => {
  window.scrollTo(0, document.body.scrollHeight);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const Instagram =
    document.body.querySelector('a[href*="instagram"]')?.href ?? '';

  const Twitter =
    document.body.querySelector('a[href*="twitter"], a[href*="x.com"]')?.href ??
    '';

  const Facebook =
    document.body.querySelector('a[href*="facebook"]')?.href ?? '';

  const Linkedin =
    document.body.querySelector('a[href*="linkedin"]')?.href ?? '';

  const Youtube = document.body.querySelector('a[href*="youtube"]')?.href ?? '';

  const Tiktok = document.body.querySelector('a[href*="tiktok"]')?.href ?? '';

  const Description =
    document.querySelector('meta[name="description"]')?.content ?? '';

  return {
    Description,
    Instagram,
    Twitter,
    Facebook,
    Linkedin,
    Youtube,
    Tiktok,
  };
});
