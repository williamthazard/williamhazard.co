function preload() {
  let myData = loadStrings('textfile.txt',handler);
}
let lines = [];
function handler(arg) {
  for (let x = 0; x < arg.length; x+= 1) {
    let splat = splitTokens(
      arg[x],
      ['"',".",",",";"," ",',"']
    );
    for (let y = 0; y < splat.length; y+= 1) {
      append(lines,splat[y])
    }};
}