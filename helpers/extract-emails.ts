export function extractEmails(text: string) {
  return (
    text
      .match(
        /(?:[a-z0-9+!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi
      )
      ?.filter((e) => {
        try {
          if (e!.split('@')!.at(1)!.split('.')!.length > 2) {
            return false;
          }

          return (
            e.length < 35 &&
            !e.includes('.png') &&
            !e.includes('.jpg') &&
            !e.includes('.jpeg') &&
            !e.includes('.gif') &&
            !e.includes('.svg')
          );
        } catch (error) {
          return false;
        }
      })
      .map((e) => e.trim().toLowerCase()) || []
  );
}
