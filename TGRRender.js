function hex(x,length=2) { return "0".repeat(length-(x%("0x1"+"0".repeat(length))).toString(16).length) + (x%("0x1"+"0".repeat(length))).toString(16).toUpperCase(); }
function log(str,end="\n")          { postMessage(["msg",str,end]); }
function memory_write(address,data) { postMessage(["mem","write",address,data]); CPU.wait = true; while(CPU.wait){} }
function memory_read(address,data)  { postMessage(["mem","read",address,data]); CPU.wait = true; while(CPU.wait){} }
function System_Error(Err, Inst, IP, ID, Name) { //static void System_Error(int Err, int Inst, int IP, int ID, char Name[]) {
 switch(Err) {
  case 0x0://Unknown Instruction
   log("*[EMU ERROR]*");
   if (ID == -1) { printf("CPU: "); } else { printf("Component \""+Name+"\"[0x"+hex(ID)+"]: ","")}
   log("Unknown Instrucion: 0x"+hex(Inst)+"...\t[at 0x"+hex(IP)+"]","\n");
   CPU.running = 0;
   break;
  case 0x1://OutOfBounds || Can't send data
   if (ID == -1) { log("*[EMU ERROR]* GPU: Index Out Of Bounds... Halting Emulation...\t[at 0x"+hex(IP)+"]\n");
   } else {        log("[EMU Nottice] Component \""+Name+"\"[0x"+hex(ID)+"]: can't send data to this device...\t[at 0x"+hex(IP)+"]\n"); }
   break;
 }
}

var self_Running = false;
GPU = {
 REGs: new Uint16Array(8),
 PC: 0x0000000,//Program Counter / Instuction Pointer
 SL: 0x07fff10,//Stack Limit
 BP: 0x90000EF,//Base Pointer #C0: 0x90000EF | C1: 0x97FFFFF
 SP: 0x90000EF,//Stack Pointer
 wait: false,
 tick: function(data) { //GPU.tick(data)
 }
};

onmessage = function(e) {
  log("Received \""+e.data[0]+"\"","\n");
  if (e.data[0] == "init") {
  }
  
  //var workerResult = 'Result: ' + (e.data[0] * e.data[1]);
  //log("Posting message back to main script");
  //postMessage(workerResult);
}
