var Traceback = false; //for debugging
const SW = 480;
const SH = 360;
var timer = 0;
var ratio     = window.devicePixelRatio;
var display   = document.getElementById("display");
var displaySC = display.getContext("2d");
var screen    = new ImageData(SW, SH);
var bufferSC  = new ImageData(SW, SH);
//var overlaySC = displaySC.createImageData(SW, SH);

var sys_info      = document.getElementById("sys-info");
var ShowDebugLog  = document.getElementById("DebugLog");
var DebugLog      = document.getElementById("Debug_Log");
var MirrorLogs    = document.getElementById("MirrorLogs")
var ShowMemoryMap = document.getElementById("MemoryMap");
var MemoryDump    = document.getElementById("MemoryMapDump");
var MemoryMap_POS = 0x0000000;

var ROMFile   = document.getElementById("rom-file")
var SAVImport = document.getElementById("sav-file")
var StateFile = document.getElementById("rom-file")

display.font = "TGR-FONT";
displaySC.xImageSmoothingEnabled      = false;
displaySC.imageSmoothingEnabled       = false;
displaySC.mozImageSmoothingEnabled    = false;
displaySC.webkitImageSmoothingEnabled = false;
displaySC.msImageSmoothingEnabled     = false;
displaySC.imageSmoothingQuality       = "none";
var ConsoleStr = "";
async function log(string,end="\n") { DebugLog.textContent += string+end; if (MirrorLogs.checked) { ConsoleStr += string; if (end === "\n") { console[(Traceback)?"trace":"log"]('%c'+ConsoleStr, 'background: #000000; color: #7FFF40'); ConsoleStr = ""; } else {ConsoleStr += end} } DebugLog.scrollTop = DebugLog.scrollHeight; }
async function ClearLog() { DebugLog.textContent = ""; }

TGRstats = {
 Version:   "0.0.04b",
 BuildDate: "07/24/2020", 
 Status:    "offline",
 Speed:     0, //IPS
 FPS:       [0,0],
 Network: {
  //Bytes
  Upload:   0,
  Download: 0,
 },
 Usage: {
  //  [Percent|Bytes]
  RAM:      [0,0],
  VRAM:     [0,0],
  SAV:      [0,0],
 },
 pre: {
  TIPS:     0,
  Frames:   [0,0],
  UpLSpeed: 0,
  DwLSpeed: 0,
 },
}
statusUpdate()

function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function deleteCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

//setCookie("VAR","DATA",2147483647);
//var VAR=getCookie("VAR");

function Hide_SideMenu() {
 var x = document.getElementById('sidenav');
 var hm = document.getElementById('HideMenu');
 if (x.style.display === 'none') {
  x.style.display = '';
  mh.onclick = 'Hide_SideMenu(false)'
  mh.innerText = '[hide Side-Menu]';
 } else {
  x.style.display = 'none';
  mh.innerText = '[show Side-Menu]';
 }
}

function SetPlayerBtn(P,B,S) {
 if (B == "a") { B = 0; } else if (B == "b") { B = 1; } else if (B == "c") { B = 2; } else
 if (B == "x") { B = 3; } else if (B == "y") { B = 4; } else if (B == "z") { B = 5; } else
 if (B == "l") { B = 6; } else if (B == "r") { B = 7; } else
 if (B == "st" | B == "start") { B = 8; } else if (B == "sl" | B == "select") { B = 9; } else
 if (B == "up") { B = 10; } else if (B == "dw" | B == "down") { B = 11; } else if (B == "lt" | B == "left") { B = 12; } else if (B == "rt" | B == "right") { B = 13; }
 if (B  < 14) {} else { console.warn("[System] Button "+B+" does not exist!"); return -1; }
 document.getElementById("P"+((P%2)+1)+"-"+(B%0xF)).style = (S)?"color:#FF1616":"color:#161616";
}

function hex(x,length=2) {
 return "0".repeat(length-(x%("0x1"+"0".repeat(length))).toString(16).length) + (x%("0x1"+"0".repeat(length))).toString(16).toUpperCase();
}

function ArrToHex(arr) {
 console.log(arr);
 console.log(arr.length);
 var str = "[";
 for (let i=0; i<arr.length; i++) {
  str.concat("0x"+hex(arr[i])+", ");
 }
 return str+"]";
}

input_config = [ //default config
 //0 Means Keyboard
 //1 Means NumPad
  [[ 90, 0], [ 88, 0], [  67, 0], [  65, 0], [  83, 0], [  68, 0], [  81, 0], [  87, 0], [  13, 0], [   8, 0], [  38, 0], [  40, 0], [  37, 0], [  39, 0]], //P1
  [[ 97, 1], [101, 1], [  99, 1], [ 103, 1], [ 111, 1], [ 105, 1], [  96, 1], [ 110, 1], [  13, 1], [ 107, 1], [ 104, 1], [  98, 1], [ 100, 1], [ 102, 1]], //P2
]
/*
 [ // input_config[0] // 0 inputs // Controller Disconnected //
  [], //P1
  [], //P2
 ],[ // input_config[1] // 11 inputs // 3 Button Controller
 //  [A,KN]    [B,KN]    [C,KN]     [L,KN]    [R,KN]   [ST,KN]   [SL,KN]   [UP,KN]   [DW,KN]   [LT,KN]   [RT,KN]
  [[ 90, 0], [ 88, 0], [ 67, 0],  [ 81, 0], [ 87, 0], [ 13, 0], [  8, 0], [ 38, 0], [ 40, 0], [ 37, 0], [ 39, 0]], //P1
  [[ 97, 1], [101, 1], [ 99, 1],  [ 96, 1], [110, 1], [ 13, 1], [107, 1], [104, 1], [ 98, 1], [100, 1], [102, 1]], //P2
 ],[ // input_config[2] // 14 inputs // 6 Button Controller
 //  [A,KN]    [B,KN]    [C,KN]    [X,KN]    [Y,KN]    [Z,KN]    [L,KN]    [R,KN]   [ST,KN]   [SL,KN]   [UP,KN]  [DW,KN]    [LT,KN]   [RT,KN]]
  [[ 90, 0], [ 88, 0], [ 67, 0], [ 65, 0], [ 83, 0], [ 68, 0], [ 81, 0], [ 87, 0], [ 13, 0], [  8, 0], [ 38, 0], [ 40, 0], [ 37, 0], [ 39, 0]], //P1
  [[ 97, 1], [101, 1], [ 99, 1], [103, 1], [111, 1], [105, 1], [ 96, 1], [110, 1], [ 13, 1], [107, 1], [104, 1], [ 98, 1], [100, 1], [102, 1]], //P2
 ],[// input_config[3] // 14 button HexPad Controller
 //[1-A,KN]  [2-B,KN]  [3-C,KN]  [4-D,KN]  [5-E,KN]  [6-F,KN]    [7,KN]    [8,KN]    [9,KN]    [0,KN]  [Num-Hex,KN]  [Enter,KN]  [???,KN]  [???,KN]
  [[ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1],     [ -1,-1],   [ -1,-1], [ -1,-1], [ -1,-1]], //P1
  [[ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1], [ -1,-1],     [ -1,-1],   [ -1,-1], [ -1,-1], [ -1,-1]], //P2
 ],[// input_config[4] // 19 inputs //Analog Steering Controller
 //[25%Accel,KN] [50%Accel,KN] [100%Accel,KN]  [25%Break,KN] [50%Break,KN] [100%Break,KN]     [A,KN]    [B,KN]    [C,KN] [ShiftDw,KN] [DownUp,KN] [Start,KN] [Select,KN] [25%<Wheel,KN]  [50%<Wheel,KN]  [100%<Wheel,KN] [25%Wheel>,KN]  [50%Wheel>,KN]  [100%Wheel>,KN]
  [     [ -1,-1],     [ -1,-1],      [ -1,-1],      [ -1,-1],     [ -1,-1],      [ -1,-1],  [ -1,-1], [ -1,-1], [ -1,-1],    [ -1,-1],   [ -1,-1],  [ -1,-1],   [ -1,-1],      [ -1,-1],       [ -1,-1],        [ -1,-1],      [ -1,-1],       [ -1,-1],        [ -1,-1]], //P1
  [     [ -1,-1],     [ -1,-1],      [ -1,-1],      [ -1,-1],     [ -1,-1],      [ -1,-1],  [ -1,-1], [ -1,-1], [ -1,-1],    [ -1,-1],   [ -1,-1],  [ -1,-1],   [ -1,-1],      [ -1,-1],       [ -1,-1],        [ -1,-1],      [ -1,-1],       [ -1,-1],        [ -1,-1]], //P2
 ],
];*/
/*let input_config=getCookie("input_config");
if (input_config) {
 input_config = input_config.split(',');
} else {
 input_config = { //default config
 [ 
  //0 Means Keyboard
  //1 Means NumPad
  // [A,KN]    [B,KN]     [C,KN]     [X,KN]     [Y,KN]     [Z,KN]     [L,KN]     [R,KN]    [ST,KN]    [SL,KN]    [UP,KN]    [DW,KN]    [LT,KN]    [RT,KN]]
  [[ 90, 0], [ 88, 0], [  67, 0], [  65, 0], [  83, 0], [  68, 0], [  81, 0], [  87, 0], [  13, 0], [   8, 0], [  38, 0], [  40, 0], [  37, 0], [  39, 0]], //P1
  [[ 97, 1], [101, 1], [  99, 1], [ 103, 1], [ 111, 1], [ 105, 1], [  96, 1], [ 110, 1], [  13, 1], [ 107, 1], [ 104, 1], [  98, 1], [ 100, 1], [ 102, 1]], //P2
 ]; setCookie("input_config",ArrToHex(input_config),2147483647);
} var inputs = [
 [0,0,0,0,0,0,0,0,0,0,0,0,0,0],//P1
 [0,0,0,0,0,0,0,0,0,0,0,0,0,0],//P2
];*/
var keyword = [];
window.addEventListener("keydown",
 function(e){
  let keyloc = [0,0,0,1,2,3];
  keyloc = keyloc[e.location];// log([e.keyCode,keyloc],"\n")
  if(e.key === 'r' && e.ctrlKey) { e.preventDefault(); PWR.reset(0); }
  for (let p=0; p< 2; p++) {
   for (let i=0; i<14; i++) {
    if (e.keyCode == input_config[p][i][0] && keyloc===input_config[p][i][1]) {
     inputs[p][i] = 1; e.preventDefault();
    }
   }
  }
  switch(e.keyCode){
//   case 17: //ctrl
//    e.preventDefault();
    //reset [+shift hard]
   case 37: case 39: case 38:  case 40: // Arrow keys
   case 32: e.preventDefault(); break; // Space
   default: break; // do not block other keys
  }
  keyword[e.keyCode] = true;
 },false
);
window.addEventListener('keyup',
 function(e){
  let keyloc = [0,0,0,1,2,3];
  keyloc = keyloc[e.location];// log([e.keyCode,keyloc],"\n")
  for (let p=0; p< 2; p++) {
   for (let i=0; i<14; i++) {
    if (e.keyCode == input_config[p][i][0]) {
     if (keyloc===input_config[p][i][1]) {
      inputs[p][i] = 0; e.preventDefault();
     }
    }
   }
  }
  keyword[e.keyCode] = false;
 },false);

function getOSPath() {
 var userAgent = window.navigator.userAgent,
     platform = window.navigator.platform,
     macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
     windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
     iosPlatforms = ['iPhone', 'iPad', 'iPod']
 if (macosPlatforms.indexOf(platform) !== -1) {
  return "~/Library/Application Support/tgr-js/"
 } else if (iosPlatforms.indexOf(platform) !== -1) {
  return ""
 } else if (windowsPlatforms.indexOf(platform) !== -1) {
  return "%appdata%/.tgr-js/"
 } else if (/Android/.test(userAgent)) {
  return "/storage/emulated/0/Android/data/net.GameRazerStudios.tgr-js/file";
 } else if (/Linux/.test(platform)) {
  return "~/.share/tgr-js/";
 }
}

log("TGR-JS Data Path: "+getOSPath(),"\n");

ShowDebugLog.style.display = "none";
function DebugLog_Toggle() {
 ShowMemoryMap.style.display = "none";
 if (ShowDebugLog.style.display === "none") {
  ShowDebugLog.style.display = "";
 } else {
  ShowDebugLog.style.display = "none";
 }
}

function getXY(i,W=SW,H=SH)  { return [i%4, Math.floor(i/4)%H, Math.floor((i/4)/H)] }
function getI(X,Y,W=SW,H=SH) { return ((W*4)*Y) + (4*X) }

function boarderColor(R,G,B) {
 document.getElementById("display").style = "border:3px solid #"+R.toString(16)+G.toString(16)+B.toString(16)+";";
}

function UpdateScreen() {
 for(let PixelAddr = 0; PixelAddr<SH*SW*4; PixelAddr++) {
  screen.data[PixelAddr] = bufferSC.data[PixelAddr];
 }
}

function Display_init() {
 log("Display Buffers Init...","\n");
 for(let PixelAddr = 0; PixelAddr<SH*SW*4; PixelAddr++) {
 screen.data[PixelAddr] = 0x00; bufferSC.data[PixelAddr] = 0x00;  PixelAddr++;
 screen.data[PixelAddr] = 0x00; bufferSC.data[PixelAddr] = 0x00;  PixelAddr++;
 screen.data[PixelAddr] = 0x00; bufferSC.data[PixelAddr] = 0x00;  PixelAddr++;
 screen.data[PixelAddr] = 0xFF; bufferSC.data[PixelAddr] = 0xFF;
 }
} 

function Screen_plot(X,Y,R,G,B,A=0xFF) {
 let PixelAddr = getI(X,Y)
 screen.data[PixelAddr] =  R;  PixelAddr++;
 screen.data[PixelAddr] =  G;  PixelAddr++;
 screen.data[PixelAddr] =  B;  PixelAddr++;
 screen.data[PixelAddr] =  A;
}

function plot(X,Y,R,G,B,A=0xFF) {
 let PixelAddr = getI(X,Y)
 bufferSC.data[PixelAddr] =  R;  PixelAddr++;
 bufferSC.data[PixelAddr] =  G;  PixelAddr++;
 bufferSC.data[PixelAddr] =  B;  PixelAddr++;
 bufferSC.data[PixelAddr] =  A;
}

async function getChar(Letter="", x, y, R=0, G=0, B=0, A=0xFF, shadow=true) {
// console.log("Drawing string: "+Letter);
 for (let i=0;i<Letter.length;i++) {
  var j; for (j=0;j<98;j++) { if (Letter[i] === chars[j]) { break; } }
  for (let ix=0;ix<8;ix++) {
   for (let iy=0;iy<8;iy++) {
    if (font[j][iy][ix] == '1' && (i*8)+x+ix >= 0 && (i*8)+x+ix < SW && y+iy >= 0 && y+iy < SH) {
     let PixelAddr = getI((i*8)+x+ix+1,y+iy+1);
     if (shadow == true) { plot((i*8)+x+ix+1,y+iy+1,0,0,0,A); }
     plot((i*8)+x+ix,y+iy,R,G,B,A);
    }
   }
  }
 }
}
// `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-+_=[]{}\|;:'".,<>/?~abcdefghijklmnopqrstuvwxyz
var chars = " `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-+_=[]{}\\|;:'\".,<>/?~abcdefghijklmnopqrstuvwxyz";
var  font = [
 ["00000000","00000000","00000000","00000000","00000000","00000000","00000000","00000000"],//   00
 ["11111111","11111111","11111111","11111111","11111111","11111111","11111111","11111111"],// `█01
 ["00111100","01000010","01000010","01111110","01000010","01000010","01000010","00000000"],// A 02
 ["01111100","01000010","01000010","01111100","01000010","01000010","01111100","00000000"],// B 03
 ["00111100","01000010","01000000","01000000","01000000","01000010","00111100","00000000"],// C 04
 ["01111100","01000010","01000010","01000010","01000010","01000010","01111100","00000000"],// D 05
 ["01111110","01000000","01000000","01111100","01000000","01000000","01111110","00000000"],// E 06
 ["01111110","01000000","01000000","01111100","01000000","01000000","01000000","00000000"],// F 07
 ["00111100","01000010","01000000","01001110","01000010","01000010","00111100","00000000"],// G 08
 ["01000010","01000010","01000010","01111110","01000010","01000010","01000010","00000000"],// H 09
 ["01111110","00011000","00011000","00011000","00011000","00011000","01111110","00000000"],// I 10
 ["01111110","00000100","00000100","00000100","00000100","01000100","00111000","00000000"],// J 11
 ["01000100","01001000","01010000","01100000","01010000","01001000","01000100","00000000"],// K 12
 ["01000000","01000000","01000000","01000000","01000000","01000000","01111110","00000000"],// L 13
 ["01000010","01100110","01100110","01011010","01011010","01000010","01000010","00000000"],// M 14
 ["01000010","01100010","01010010","01001010","01000110","01000010","01000010","00000000"],// N 15
 ["00111100","01000010","01000010","01000010","01000010","01000010","00111100","00000000"],// O 16
 ["01111100","01000010","01000010","01111100","01000000","01000000","01000000","00000000"],// P 17
 ["00111100","01000010","01000010","01000010","01001010","01000110","00111110","00000000"],// Q 18
 ["01111100","01000010","01000010","01111100","01010000","01001000","01000100","00000000"],// R 19
 ["00111100","01000010","00100000","00011000","00000100","01000010","00111100","00000000"],// S 20
 ["01111110","00011000","00011000","00011000","00011000","00011000","00011000","00000000"],// T 21
 ["01000010","01000010","01000010","01000010","01000010","01000010","00111100","00000000"],// U 22
 ["01000010","01000010","01000010","01000010","00100100","00100100","00011000","00000000"],// V 23
 ["01010100","01010100","01010100","01010100","01010100","01010100","00101000","00000000"],// W 24
 ["01000010","01000010","00100100","00011000","00011000","00100100","01000010","00000000"],// X 25
 ["01000010","01000010","00100100","00011000","00011000","00011000","00011000","00000000"],// Y 26
 ["01111110","00000100","00001000","00010000","00100000","01000000","01111110","00000000"],// Z 27
 ["00111100","01000010","01100010","01011010","01000110","01000010","00111100","00000000"],// 0 28
 ["00001000","00011000","00001000","00001000","00001000","00001000","00001000","00000000"],// 1 29
 ["00111100","01000010","00000100","00001000","00010000","00100000","01111110","00000000"],// 2 30
 ["00111100","01000010","00000010","00001100","00000010","01000010","00111100","00000000"],// 3 31
 ["00000100","00001100","00010100","00100100","01111110","00000100","00000100","00000000"],// 4 32
 ["01111110","01000000","01000000","01111100","00000010","01000010","00111100","00000000"],// 5 33
 ["00111100","01000010","01000000","01111100","01000010","01000010","00111100","00000000"],// 6 34
 ["01111110","00000010","00000100","00000100","00001000","00001000","00010000","00000000"],// 7 35
 ["00111100","01000010","01000010","00111100","01000010","01000010","00111100","00000000"],// 8 36
 ["00111100","01000010","01000010","00111110","00000010","00000010","00111100","00000000"],// 9 37
 ["00001000","00001000","00001000","00001000","00001000","00000000","00001000","00000000"],// ! 38
 ["00111100","01000010","01110010","01101010","01110010","01011100","00111110","00000000"],// @ 39
 ["00000000","00100100","01111110","00100100","00100100","01111110","00100100","00000000"],// # 40
 ["00011000","00111100","01011010","00111000","00011100","01011010","00111100","00011000"],// $ 41
 ["01100001","10010010","10010100","01101000","00010110","00101001","01001001","10000110"],// % 42
 ["00011000","00100100","01000010","00000000","00000000","00000000","00000000","00000000"],// ^ 43
 ["00011000","00100100","00100100","00111010","01000100","01000100","00111010","00000000"],// & 44
 ["00101010","00011100","00111110","00011100","00101010","00000000","00000000","00000000"],// * 45
 ["00001100","00010000","00010000","00010000","00010000","00010000","00001100","00000000"],// ( 46
 ["00110000","00001000","00001000","00001000","00001000","00001000","00110000","00000000"],// ) 47
 ["00000000","00000000","00000000","01111110","01111110","00000000","00000000","00000000"],// - 48
 ["00000000","00011000","00011000","01111110","01111110","00011000","00011000","00000000"],// + 49
 ["00000000","00000000","00000000","00000000","00000000","00000000","00000000","11111111"],// _ 50
 ["00000000","00000000","01111110","00000000","00000000","01111110","00000000","00000000"],// = 51
 ["00011100","00010000","00010000","00010000","00010000","00010000","00011100","00000000"],// [ 52
 ["00111000","00001000","00001000","00001000","00001000","00001000","00111000","00000000"],// ] 53
 ["00011100","00010000","00010000","00100000","00010000","00010000","00011100","00000000"],// { 54
 ["00111000","00001000","00001000","00000100","00001000","00001000","00111000","00000000"],// } 55
 ["10000000","01000000","00100000","00010000","00001000","00000100","00000010","00000001"],// \ 56 /
 ["00011000","00011000","00011000","00011000","00011000","00011000","00011000","00011000"],// | 57
 ["00000000","00000000","00001000","00000000","00000000","00001000","00010000","00000000"],// ; 58
 ["00000000","00000000","00001000","00000000","00000000","00001000","00000000","00000000"],// : 59
 ["00001000","00001000","00000000","00000000","00000000","00000000","00000000","00000000"],// ' 60
 ["00100100","00100100","00000000","00000000","00000000","00000000","00000000","00000000"],// " 61
 ["00000000","00000000","00000000","00000000","00000000","00000000","00001000","00000000"],// . 62
 ["00000000","00000000","00000000","00000000","00000000","00000000","00001000","00010000"],// , 63
 ["00000000","00000110","00011000","01100000","00011000","00000110","00000000","00000000"],// < 64
 ["00000000","01100000","00011000","00000110","00011000","01100000","00000000","00000000"],// > 65
 ["00000001","00000010","00000100","00001000","00010000","00100000","01000000","10000000"],// / 66
 ["00111100","01000010","01000010","00001100","00001000","00000000","00001000","00000000"],// ? 67
 ["00000000","00000000","00000000","00110010","01001100","00000000","00000000","00000000"],// ~ 68
 ["00111100","01000010","01000010","01111110","01000010","01000010","01000010","00000000"],// A 69
 ["01111100","01000010","01000010","01111100","01000010","01000010","01111100","00000000"],// B 70
 ["00111100","01000010","01000000","01000000","01000000","01000010","00111100","00000000"],// C 71
 ["01111100","01000010","01000010","01000010","01000010","01000010","01111100","00000000"],// D 72
 ["01111110","01000000","01000000","01111100","01000000","01000000","01111110","00000000"],// E 73
 ["01111110","01000000","01000000","01111100","01000000","01000000","01000000","00000000"],// F 74
 ["00111100","01000010","01000000","01001110","01000010","01000010","00111100","00000000"],// G 75
 ["01000010","01000010","01000010","01111110","01000010","01000010","01000010","00000000"],// H 76
 ["01111110","00011000","00011000","00011000","00011000","00011000","01111110","00000000"],// I 77
 ["01111110","00000100","00000100","00000100","00000100","01000100","00111000","00000000"],// J 78
 ["01000100","01001000","01010000","01100000","01010000","01001000","01000100","00000000"],// K 79
 ["01000000","01000000","01000000","01000000","01000000","01000000","01111110","00000000"],// L 80
 ["01000010","01100110","01100110","01011010","01011010","01000010","01000010","00000000"],// M 81
 ["01000010","01100010","01010010","01001010","01000110","01000010","01000010","00000000"],// N 82
 ["00111100","01000010","01000010","01000010","01000010","01000010","00111100","00000000"],// O 83
 ["01111100","01000010","01000010","01111100","01000000","01000000","01000000","00000000"],// P 84
 ["00111100","01000010","01000010","01000010","01001010","01000110","00111110","00000000"],// Q 85
 ["01111100","01000010","01000010","01111100","01010000","01001000","01000100","00000000"],// R 86
 ["00111100","01000010","00100000","00011000","00000100","01000010","00111100","00000000"],// S 87
 ["01111110","00011000","00011000","00011000","00011000","00011000","00011000","00000000"],// T 88
 ["00000000","01000010","01000010","01000010","01000010","01000010","00111100","00000000"],// U 89
 ["00000000","01000010","01000010","01000010","00100100","00100100","00011000","00000000"],// V 90
 ["00000000","01010100","01010100","01010100","01010100","01010100","00101000","00000000"],// W 91
 ["00000000","01000010","00100100","00011000","00011000","00100100","01000010","00000000"],// X 92
 ["01000010","01000010","00100100","00011000","00011000","00011000","00011000","00000000"],// Y 93
 ["01111110","00000100","00001000","00010000","00100000","01000000","01111110","00000000"],// Z 94
];


async function backChar(Length,X,Y,R,G,B) {
 for(let y=0; y<8; y++) {
  for(let x=0; x<Length*8; x++) {
   plot(X+x,Y+y,R,G,B);
  }
 }
}

function statusUpdate() {
 let str;
 str  = "#############################\n";
 str += "# ###### TGR-PRTO-JS ###### #\n";
 str += "# #### version "+TGRstats.Version+" #### #\n";
 str += "# $$$ Build  "+TGRstats.BuildDate+" $$$ #\n";
 str += "#############################\n";
 str += "# Status: "+(" ".repeat(17-TGRstats.Status.length))+TGRstats.Status+" #\n";
 //"+TGRstats.+"
 str += "# Speed:"+(" ".repeat(15-TGRstats.Speed.toString().length))+TGRstats.Speed+" IPS #\n";
 
 str += "# FPS/UPS: "+(" ".repeat(16-(TGRstats.FPS[0]+"/"+TGRstats.FPS[1]).length))+(TGRstats.FPS[0]+"/"+TGRstats.FPS[1])+" #\n";
 str += "#############################\n";
 str += "# Network                   #\n";
 str += "# \\Upload:           0 BT/S #\n";
 str += "# \\Download:         0 BT/S #\n";
 str += "#############################\n";
 str += "#  |RAM Usage:     0%|      #\n";
 str += "#  |\\     0 BT/128 MB|_.    #\n";
 str += "#  '\"|VRAM Usage:    0%|    #\n";
 str += "#    |\\     0 BT/ 64 MB|_.  #\n";
 str += "#    '\"|SAV Usage:     0%|  #\n";
 str += "#      |\\     0 BT/  8 MB|  #\n";
 str += "#############################\n";
 str += "# ROM NAME:        -------- #\n";
 str += "# Author           -------- #\n";
 str += "#############################\n";
 str += "#[CPU[0]Offline]-PC:#0000000#\n";
 str += "# \\SP:#0000000 \\BP:#0000000 #\n";
 str += "# AB:#00000000 CD:#00000000 #\n";
 str += "# EF:#00000000 GH:#00000000 #\n";
 str += "#############################\n";
 str += "#[CPU[1]Offline]-PC:#0000000#\n";
 str += "# \\SP:#0000000 \\BP:#0000000 #\n";
 str += "# AB:#00000000 CD:#00000000 #\n";
 str += "# EF:#00000000 GH:#00000000 #\n";
 str += "#############################";
 sys_info.textContent = str
}

var saveByteArray = (function () {
 var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
 return function (data, name) {
  var blob = new Blob(data, {type: "octet/stream"}),
   url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
 };
}());

async function load(file, local=true) {
 if (local == true) {
  if (file.files.length > 0) {
   let array = await file.files[0].arrayBuffer();
   return new Uint8Array(array);
  }
 } else {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = async function() {
   if (this.readyState == 4 && this.status == 200) {
    // Typical action to be performed when the document is ready:
    console.log(xhttp.responseText);
    return xhttp.responseText;
   }
  }; await xhttp.open("GET", "/BIOS.tgr", true); await xhttp.send();
 }
 return new Uint8Array(0);
}

function ClearMemory(start="ROM0", end="VRAM") {
  log("[System] Clearing Memory... [ "+hex(MemoryMap.ADDR[start][0],8)+" to "+hex(MemoryMap.ADDR[end][1],8)+" ]","\n");
  for(let i=0; i<MemoryMap.ADDR[end][1]-MemoryMap.ADDR[start][0]+1; i++) {
   memory[MemoryMap.ADDR[start][0]+i] = 0x00;
  }
  log("[System] Memory Clear Done!","\n");
}
var ROMBank = {
 data: [],
 select: [0,0],
};
function SwitchBank(X,ID=0) {
 // # Loading BANK into Memory #
 for(let i=0; i<MemoryMap.ADDR["ROM"+ID][1]-MemoryMap.ADDR["ROM"+ID][0]+1; i++) {
  memory[MemoryMap.ADDR["ROM"+ID][0]+i] = ROMBank[ID][i] | 0x00;
 }
}
//pwr-btn
PWR = {
 start: async function() {
  log("[System] Powering on Emulation...\n[System] Loading BIOS...","\n");
  let BIOSData = await load("/BIOS.tgr",false);
  console.log(ArrToHex(BIOSData))
  for (let i=0; i<32; i++) {
   ROMBank.data[32] = BIOSData;
  }


  boarderColor(0xFF,0x16,0x16)
  TGRstats.Status = "online";
  if (ROMFile.files.length == 0) { //NO ROM
   log("[System] Warn: No ROM provided! Please provide a ROM(.tgr) file...","\n");
   ROMFilename = "";
   let ROMLength = 0;
   var ROMData = []
  } else {
   ROMFilename = ROMFile.files[0].name;
   log("[System] Loading ROM \""+ROMFilename+"\"...","\n");
   var ROMData = await load(ROMFile);
   let ROMLength = 0;
   let i=0;
   while (i<32) {
    ROMBank.data[i] = ROMData.slice(ROMLength,ROMLength+(MemoryMap.ADDR.ROM0[1]-MemoryMap.ADDR.ROM0[0]+1));
    ROMLength += ROMBank.data[i].length;
    i++;
   }
   console.log(ROMBank)
//  console.info("["+ROMData+"]");
//  for(let i=ROMBank[0]; i<ROMBank[0]+MemoryMap.ADDR.ROM0[1]-MemoryMap.ADDR.ROM0[0]+1; i++) {
//   memory[MemoryMap.ADDR.ROM0[0]+i] = ROMData[i];
//  }
   log("[System] ROM Loaded... ["+ROMData.length+" Bytes]","\n");
  }
  CPU[0].postMessage(["start",MemoryMap.ADDR.ROM1]);  
 },
 pause: function() {
  if (TGRstats.Status == "online") {
   TGRstats.Status = "paused";
   boarderColor(0xF1,0xF5,0x20)
  } else if (TGRstats.Status == "paused") {
   
  }
 },
 tick: function() {
  
  
 },
 reset: function(hard) {
  
  
 },
 stop: function() {
  log("[System] Shutting down Emulation...","\n");
  TGRstats.Status = "offline";
  ROMFilename = "";
  ClearMemory()
 },
}

State = {
 SAVe: function() {
  saveByteArray([memory+CPU.REGs+CPU.PC+CPU.BP+CPU.SP], (ROMFilename === "")?'ROMName.sav':ROMFilename.substr(0,ROMFilename.length-3)+".sav");
 },
 Load: async function() {
  log("[System] Loading State file into Memory...","\n");
  const sav = await load(SAVImport);
  for(let i=0; i<MemoryMap.ADDR.SAV[1]-MemoryMap.ADDR.SAV[0]+1; i++) {
   memory[MemoryMap.ADDR.SAV[0]+i] = sav[i];
  }
  log("[System] Import Done!","\n");
 },
}
SAV = {
 Export: function() {
  log("[System] Exporting SAV From Memory...","\n")
  saveByteArray([memory.subarray(MemoryMap.ADDR.SAV[0],MemoryMap.ADDR.SAV[1]+1)], (ROMFilename === "")?'ROMName.sav':ROMFilename.substr(0,ROMFilename.length-3)+".sav");
 },
 Delete: function() {
  log("[System] Clearing SAV Memory...","\n")
  for(let i=0; i<MemoryMap.ADDR.SAV[1]-MemoryMap.ADDR.SAV[0]+1; i++) {
   memory[MemoryMap.ADDR.SAV[0]+i] = 0x00;
  }
  log("[System] SAV Cleared!","\n")
 },
 Import: async function() {
  log("[System] Importing SAV file into Memory...","\n")
  const sav = await load(SAVImport);
  for(let i=0; i<MemoryMap.ADDR.SAV[1]-MemoryMap.ADDR.SAV[0]+1; i++) {
   memory[MemoryMap.ADDR.SAV[0]+i] = sav[i];
  }
  log("[System] Import Done!","\n");
 },
}

ShowMemoryMap.style.display = "none";
MemoryMap = {
 ADDR: { //MemoryMap.ADDR
  ROM0: [0x0000000, 0x07FFFFF],//MemoryMap.ADDR.ROM0
  ROM1: [0x0800000, 0x0FFFFFF],//MemoryMap.ADDR.ROM1
  SAV : [0x1000000, 0x17FFFFF],//MemoryMap.ADDR.SAV
  WRAM: [0x1800000, 0x87FFFFF],//MemoryMap.ADDR.WRAM
  SRAM: [0x8800000, 0x97FFFFF],//MemoryMap.ADDR.SRAM
  VRAM: [0x9800000, 0xD7FFFFF],//MemoryMap.ADDR.VRAM
 },
 Jump: function() { //MemoryMap.Jump()
  var JumpTo = document.getElementById("MemoryMap_Jump");
  if (JumpTo.selectedIndex == 0) { return -1; }
  MemoryMap_POS = MemoryMap.ADDR[JumpTo.selectedOptions[0].value][0];
  JumpTo.selectedIndex = 0
 },
 Update: function() { // MemoryMap.Update()
  let bytes = ["R0-0", "R0-1", "R0-2", "R0-3", "R0-4", "R0-5", "R0-6", "R0-7", "R0-8", "R0-9", "R0-A", "R0-B", "R0-C", "R0-D", "R0-E", "R0-F", "R1-0", "R1-1", "R1-2", "R1-3", "R1-4", "R1-5", "R1-6", "R1-7", "R1-8", "R1-9", "R1-A", "R1-B", "R1-C", "R1-D", "R1-E", "R1-F", "R2-0", "R2-1", "R2-2", "R2-3", "R2-4", "R2-5", "R2-6", "R2-7", "R2-8", "R2-9", "R2-A", "R2-B", "R2-C", "R2-D", "R2-E", "R2-F", "R3-0", "R3-1", "R3-2", "R3-3", "R3-4", "R3-5", "R3-6", "R3-7", "R3-8", "R3-9", "R3-A", "R3-B", "R3-C", "R3-D", "R3-E", "R3-F", "R4-0", "R4-1", "R4-2", "R4-3", "R4-4", "R4-5", "R4-6", "R4-7", "R4-8", "R4-9", "R4-A", "R4-B", "R4-C", "R4-D", "R4-E", "R4-F", "R5-0", "R5-1", "R5-2", "R5-3", "R5-4", "R5-5", "R5-6", "R5-7", "R5-8", "R5-9", "R5-A", "R5-B", "R5-C", "R5-D", "R5-E", "R5-F", "R6-0", "R6-1", "R6-2", "R6-3", "R6-4", "R6-5", "R6-6", "R6-7", "R6-8", "R6-9", "R6-A", "R6-B", "R6-C", "R6-D", "R6-E", "R6-F", "R7-0", "R7-1", "R7-2", "R7-3", "R7-4", "R7-5", "R7-6", "R7-7", "R7-8", "R7-9", "R7-A", "R7-B", "R7-C", "R7-D", "R7-E", "R7-F", "R8-0", "R8-1", "R8-2", "R8-3", "R8-4", "R8-5", "R8-6", "R8-7", "R8-8", "R8-9", "R8-A", "R8-B", "R8-C", "R8-D", "R8-E", "R8-F", "R9-0", "R9-1", "R9-2", "R9-3", "R9-4", "R9-5", "R9-6", "R9-7", "R9-8", "R9-9", "R9-A", "R9-B", "R9-C", "R9-D", "R9-E", "R9-F", "RA-0", "RA-1", "RA-2", "RA-3", "RA-4", "RA-5", "RA-6", "RA-7", "RA-8", "RA-9", "RA-A", "RA-B", "RA-C", "RA-D", "RA-E", "RA-F"];
  for (let i=0; i<0xB0; i++) {
   if (i%0x10 == 0) { document.getElementById("R"+hex(i/0x10,1)+"-ADDR").textContent = "0x"+hex(MemoryMap_POS+i,7); }
   document.getElementById(bytes[i]).textContent = hex(memory[MemoryMap_POS+i],2);
  }
 },
 ScrollUp: function(x) { // MemoryMap.Scroll(x)
  MemoryMap_POS = (MemoryMap_POS-x<0)?0:MemoryMap_POS-x;
 },
 ScrollDown: function(x) { // MemoryMap.ScrollDown(x)
  MemoryMap_POS = (MemoryMap_POS+x>0xD7FFF50)?0xD7FFF50:MemoryMap_POS+x;
 },
 Toggle: function() {
  ShowDebugLog.style.display = "none";
  if (ShowMemoryMap.style.display === "none") {
   ShowMemoryMap.style.display = "";
  } else {
   ShowMemoryMap.style.display = "none";
  }
 },
}
var memory = new Uint8Array(0xD800000)
log("MemoryMap allowcated: 0x"+hex(memory.length,7) +" ("+memory.length/1024/1024+" MB)\n\\0x"+hex(MemoryMap.ADDR.SRAM[1]-MemoryMap.ADDR.WRAM[0]+1,7)+"\\"+(MemoryMap.ADDR.SRAM[1]-MemoryMap.ADDR.WRAM[0]+1)+" Bytes("+((MemoryMap.ADDR.SRAM[1]-MemoryMap.ADDR.WRAM[0]+1)/1024/1024)+" MB) of RAM was allocated...\n\\0x"+hex(MemoryMap.ADDR.VRAM[1]-MemoryMap.ADDR.VRAM[0]+1,7)+"\\"+(MemoryMap.ADDR.VRAM[1]-MemoryMap.ADDR.VRAM[0]+1)+" Bytes("+((MemoryMap.ADDR.VRAM[1]-MemoryMap.ADDR.VRAM[0]+1)/1024/1024)+" MB) of VideoRAM was allocated...","\n");

VideoOutput = {
 Change: function() { // VideoOutput.Change()
  var ChangeTo = document.getElementById("VideoOutput");
  log(ChangeTo.selectedIndex,"\n");
  if   (ChangeTo.selectedIndex ==  0) { // 1:1 Normal
   display.width=SW*1; display.height=SH*1;
  } if (ChangeTo.selectedIndex ==  1) { // 1:2 Wide
   display.width=SW*2; display.height=SH*1;
  } if (ChangeTo.selectedIndex ==  2) { // 2x Double (Normal)
   display.width=SW*2; display.height=SH*2;
  } if (ChangeTo.selectedIndex ==  3) { // 2x Scanlines (50%)
   display.width=SW*2; display.height=SH*2;
  } if (ChangeTo.selectedIndex ==  4) { // 2x LCD Pixelate (50%)
   display.width=SW*2; display.height=SH*2;
  } if (ChangeTo.selectedIndex ==  5) { // 3x Triple (Normal) 
   display.width=SW*3; display.height=SH*3;
  } if (ChangeTo.selectedIndex ==  6) { // 3x Scanlines (25%)
   display.width=SW*3; display.height=SH*3;
  } if (ChangeTo.selectedIndex ==  7) { // 3x Scanlines (75%)
   display.width=SW*3; display.height=SH*3;
  } if (ChangeTo.selectedIndex ==  8) { // 3x LCD Pixelate (25%)
   display.width=SW*3; display.height=SH*3;
  } if (ChangeTo.selectedIndex ==  9) { // 3x LCD Pixelate (75%)
   display.width=SW*3; display.height=SH*3;
  } if (ChangeTo.selectedIndex == 10) { // 4x Quadruple (Normal) 
   display.width=SW*4; display.height=SH*4;
  } if (ChangeTo.selectedIndex == 11) { // 4x Scanlines (25%)
   display.width=SW*4; display.height=SH*4;
  } if (ChangeTo.selectedIndex == 12) { // 4x Scanlines (50%)
   display.width=SW*4; display.height=SH*4;
  } if (ChangeTo.selectedIndex == 13) { // 4x Scanlines (75%)
   display.width=SW*4; display.height=SH*4;
  } if (ChangeTo.selectedIndex == 14) { // 4x LCD Pixelate (25%)
   display.width=SW*4; display.height=SH*4;
  } if (ChangeTo.selectedIndex == 15) { // 4x LCD Pixelate (50%)
   display.width=SW*4; display.height=SH*4;
  } if (ChangeTo.selectedIndex == 16) { // 4x LCD Pixelate (75%)
   display.width=SW*4; display.height=SH*4;
  }
 }
}

//### COMPONENT FUNCTIONS ###//
//Each Component have 32 bytes of SRAM(+Free space [overusage of stack could interfear])
//end of Component RAM: 0x88001E0
components = [
 {//GPU
  init: function () { log("GPU init","\n");
  //SRAM[$8800000]: InUseByCoreID[0:None, 1:Thread0, 2:Thread1]
  //SRAM[$8800001]: Operation[0:none, 1:plot, 2:line, 3:rectangle, 4:circle, 0xFX:sprite mode]
  //SRAM[$8800002]: X [0xXX00]
  //SRAM[$8800003]: X [0x00XX]
  //SRAM[$8800004]: Y [0xXX00]
  //SRAM[$8800005]: Y [0x00XX]
  //SRAM[$8800006]: X2/ScalingWidth/Radius [0xXX00]
  //SRAM[$8800007]: X2 [0x00XX]
  //SRAM[$8800008]: Y2/ScalingHeight [0xXX00]
  //SRAM[$8800009]: Y2 [0x00XX]
  //SRAM[$880000A]: R [0xXX]
  //SRAM[$880000B]: G [0xXX]
  //SRAM[$880000C]: B [0xXX]
  //SRAM[$880000D]: SpriteMemoryMap.Address [0xX000000]
  //SRAM[$880000E]: SpriteMemoryMap.Address [0x0XX0000]
  //SRAM[$880000F]: SpriteMemoryMap.Address [0x000XX00]
  //SRAM[$8800010]: SpriteMemoryMap.Address [0x00000XX]
  //SRAM[$8800011]: SpriteWidth/  [0xXX]
  //SRAM[$8800012]: SpriteHeight/ [0xXX]
  //SRAM[$8800013]: SpriteFlip[Normal,Reversed,UpsideDown,UpsideDown-Reversed]  [0x0X]
  //SRAM[$8800014]: Rotation [0xXX00]
  //SRAM[$8800015]: Rotation [0x00XX]
  //SRAM[$8800016]: C
  //SRAM[$8800017]: 
  //SRAM[$8800018]: 
  //SRAM[$8800019]: 
  //SRAM[$880001A]: 
  //SRAM[$880001B]: 
  //SRAM[$880001C]: 
  //SRAM[$880001D]: 
  //SRAM[$880001E]: 
  //SRAM[$880001F]: 
  },
  tick: function () { log("GPU tick","\n");
  
   
  }
 },
 {//INPUT
  init: function () { log("INPUT init","\n");
  //SRAM[$8800020]: InUseByCoreID[0:None, 1:Thread0, 2:Thread1]
  ///////////////////Player1
  //SRAM[$8800021]: Connected
  //SRAM[$8800022]: Type
  //SRAM[$8800023]: LED Color
  //SRAM[$8800024]: 
  //SRAM[$8800025]: 
  //SRAM[$8800026]: 
  //SRAM[$8800027]: 
  //SRAM[$8800028]: 
  //SRAM[$8800029]: 
  //SRAM[$880002A]: 
  //SRAM[$880002B]: 
  //SRAM[$880002C]: 
  //SRAM[$880002D]: 
  //SRAM[$880002E]: 
  //SRAM[$880002F]: 
  //SRAM[$8800030]: 
  //SRAM[$8800031]: 
  //SRAM[$8800032]: 
  //SRAM[$8800033]: 
  //SRAM[$8800034]: 
  //SRAM[$8800035]: 
  //SRAM[$8800036]: 
  //SRAM[$8800037]: 
  //SRAM[$8800038]: 
  //SRAM[$8800039]: 
  //SRAM[$880003A]: 
  //SRAM[$880003B]: 
  //SRAM[$880003C]: 
  //SRAM[$880003D]: 
  //SRAM[$880003E]: 
  //SRAM[$880003F]: 
  },
  tick: function () {log("INPUT tick","\n");
   
  }
 },
  //SRAM[$8800030]: 
]



function SecClear() {
 TGRstats.Speed            = TGRstats.pre.TIPS;
 TGRstats.pre.TIPS         = 0;
 TGRstats.FPS              = TGRstats.pre.Frames;
 TGRstats.pre.Frames       = [0,0];
 TGRstats.Network.Upload   = TGRstats.pre.UpLSpeed;
 TGRstats.pre.UpLSpeed     = 0;
 TGRstats.Network.Download = TGRstats.pre.DwLSpeed;
 TGRstats.pre.DwLSpeed     = 0;
 Z=(Z+1)%0x100
}

function Update_Thread() {
 timer++;
// console.log("Update Tick");
 statusUpdate();
 MemoryMap.Update();
//>> for (let B=0; B<14; B++) { SetPlayerBtn(0,B,inputs[0][B]); SetPlayerBtn(1,B,inputs[1][B]); }
// for (let i=0; i<0xF; i++) { components[i].tick() }
// TGRstats.pre.TIPS++; //Wait! this is suppost to be in the tick loop!
 EMU_Render();
}

function DrawWhiteNoise() {
 for (var y=0; y <= SH; y++) {
  for (var x=0; x <= SW; x++) {
   let a = Math.floor(Math.random()*255);
   plot(x,y,a,a,a);
  }
 }
}


function Scale(ImgData,width,height) {
 if (width %SW!=0 || height%SH!=0) { log("[System] ERROR RENDERING SCALE!!! "+[width,height]+" is not alined with "+[SW,SH],"\n"); }
 let output = new ImageData(width,height);
 let X2 = 0; let Y2 = 0; let i; let pixel;
 for  (let y=0; y<SH; y++) {
  for (let x=0; x<SW; x++) {
   i = getI(x,y);
   pixel = [ImgData.data[i],ImgData.data[i+1],ImgData.data[i+2],ImgData.data[i]];
   for  (let y2=0; y2<height/SH; y2++) {
    for (let x2=0; x2<width /SW; x2++) {
     i = getI(X2+x2,Y2+y2,width,height);
     output.data[i  ] = pixel[0];
     output.data[i+1] = pixel[1];
     output.data[i+2] = pixel[2];
     output.data[i+3] = 0xFF;
    }
   }
   X2+=width/SW;
  }
  Y2+=height/SH-1;
 }
 return output;
}
var Z = 0;
async function EMU_Render() {
 //if not running then just make white noise every frame

 if (TGRstats.Status == "offline") {
  await DrawWhiteNoise(); //Simulate a CRT TV with no signal
 for (let i=0; i<SW; i++) { plot(i,i,0xFF,0x7F,0x7F); plot(i,i+1,0x16,0x16,0x16); }
 for (let i=0; i<SW; i++) { plot(SW-i,i,0x7F,0xFF,0x7F); plot(SW-i,i+1,0x16,0x16,0x16); }
 backChar(12,4*8,4*8,0x16,0x16,0xFF);
 getChar("0".repeat(8-Z.toString(2).length)+Z.toString(2)+"["+hex(Z,2)+"]",4*8,4*8,0xFF,0xFF,0xFF);
  backChar(4,SW-(8*8),4*8,0x16,0x16,0xFF);
  getChar("CH 3",SW-(8*8),4*8,0xFF,0xFF,0xFF);
 } else {
  
  
  
  
  
 }
 //push frame and render
 await UpdateScreen(); displaySC.putImageData(Scale(screen,display.width,display.height),0,0);
 TGRstats.pre.Frames[1]++;
}

Display_init()
window.setInterval(SecClear, 1000);
window.setInterval(Update_Thread);
//window.setInterval(CPU_Catch);

var CPU = [
 new Worker("TGRCore.js"), //CPU[0]
 new Worker("TGRCore.js"), //CPU[1]
]
CPU[0].postMessage(["init",0]);
CPU[1].postMessage(["init",1]);

GPU = new Worker("TGRRender.js");
GPU.postMessage(["init"]);

function CPU_Catch(data,ID) {
 if (data[0] == "msg") { log("[CPU"+ID+"] "+data[1],data[2]|"\n"); } else
 if (data[0] == "mem") {
  if (data[1] == "read") { CPU[ID].postMessage(["mem","return",memory[data[2]]]); }
  if (data[1] == "write") { memory[data[2]] = data[3]; CPU[ID].postMessage(["ok"]); }
 } else
 if (data[0] == "bnkswp") { ROMID,BANKID = data[1],data[2]; CPU[ID].postMessage(["ok"]); } else
 {
 
 }
}

function GPU_Catch(data) {
 if (data[0] == "msg") { log("[Component] GPU: "+data[1],data[2]|"\n"); } else
 if (data[0] == "mem") {
  if (data[1] == "read") { CPU[ID].postMessage(["mem","return",memory[data[2]]]); }
  if (data[1] == "write") { memory[data[2]] = data[3]; CPU[ID].postMessage(["ok"]); }
 } else
 if (data[0] == "bnkswp") { ROMID,BANKID = data[1],data[2]; CPU[ID].postMessage(["ok"]); } else
 if (data[0] == "") {
 
 }
}

CPU[0].onmessage = function(e) { console.log("CPU[0]: "+e); CPU_Catch(e.data,0); }
CPU[1].onmessage = function(e) { console.log("CPU[1]: "+e); CPU_Catch(e.data,1); }
GPU.onmessage    = function(e) { console.log("GPU: "   +e); GPU_Catch(e.data);   }
