export function guessDelimiters(text: string, possibleDelimiters: string[]) {
  return possibleDelimiters.filter(weedOut);

  function weedOut(delimiter: string) {
    var cache = -1;
    return text.split('\n').every(checkLength);

    function checkLength(line: any) {
      if (!line) {
        return true;
      }

      var length = line.split(delimiter).length;
      if (cache < 0) {
        cache = length;
      }
      return cache === length && length > 1;
    }
  }
}
