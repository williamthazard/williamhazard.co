let numWords = ["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen","Twenty","Twenty one","Twenty two","Twenty three","Twenty four","Twenty five","Twenty six","Twenty seven","Twenty eight","Twenty nine","Thirty","Thirty one","Thirty two","Thirty three","Thirty four","Thirty five","Thirty six","Thirty seven","Thirty eight","Thirty nine","Forty","Forty one","Forty two","Forty three","Forty four","Forty five","Forty six","Forty seven","Forty eight","Forty nine","Fifty","Fifty one","Fifty two","Fifty three","Fifty four","Fifty five","Fifty six","Fifty seven","Fifty eight","Fifty nine","Sixty","Sixty one","Sixty two","Sixty three","Sixty four","Sixty five","Sixty six","Sixty seven","Sixty eight","Sixty nine","Seventy","Seventy one","Seventy two","Seventy three","Seventy four","Seventy five","Seventy six","Seventy seven","Seventy eight","Seventy nine","Eighty","Eighty one","Eighty two","Eighty three","Eighty four","Eighty five","Eighty six","Eighty seven","Eighty eight","Eighty nine","Ninety","Ninety one","Ninety two","Ninety three","Ninety four","Ninety five","Ninety six","Ninety seven","Ninety eight","Ninety nine","One hundred"];

let evenOdd = ["even","odd"];

let leftRight = ["right","left"];

let clicks = 0;

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.mousePressed(canvasPressed);
  textFont("Courier New");
  textSize(40);
  fill(255,255,255,100);
}

function canvasPressed() {
  clicks = clicks + 1;
  print(clicks);
}

function draw() {
  background(35,35,35);
  if (clicks <= 100) {
    text(
    numWords[clicks]+". I will send Daddy \na picture of myself each \nweek by Friday at noon. \n"+numWords[clicks]+" is an "+evenOdd[clicks%2]+" number. \nI will receive a blow to \nmy "+leftRight[clicks%2]+ " side.I am \ngrateful to receive this \nblow because it teaches me \nto obey Daddy. I will not \ndisobey Daddy again.",
    100,
    100)
  } else {
    text(
    "good girl.",
    100,
    100)
  }
}