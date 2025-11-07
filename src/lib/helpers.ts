/**
 * Shuffle an array in place
 * https://stackoverflow.com/a/2450976/10805855
 * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 */
export function shuffle(array: any[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}
