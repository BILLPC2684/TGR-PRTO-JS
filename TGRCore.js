function hex(x,length=2) { return "0".repeat(length-(x%("0x1"+"0".repeat(length))).toString(16).length) + (x%("0x1"+"0".repeat(length))).toString(16).toUpperCase(); }
function log(str,end="\n")          { postMessage(["msg",str,end]); }
function memory_write(address,data) { postMessage(["mem","write",address,data]); CPU.wait = true; while(CPU.wait){} }
function memory_read(address,data)  { postMessage(["mem","read",address,data]); CPU.wait = true; while(CPU.wait){} }
function BNKSWP(ROMID,BANKID)       { postMessage(["bnkswp",ROMID,BANKID]); CPU.wait = true; }
function System_Error(Err, Inst, IP, ID, Name) { //static void System_Error(int Err, int Inst, int IP, int ID, char Name[]) {
 switch(Err) {
  case 0x0://Unknown Instruction
   log("*[EMU ERROR]*");
   if (ID == -1) { printf("CPU: "); } else { printf("Component \""+Name+"\"[0x"+hex(ID)+"]: ","")}
   log("Unknown Instrucion: 0x"+hex(Inst)+"...\t[at 0x"+hex(IP)+"]","\n");
   CPU.running = 0;
   break;
  case 0x1://OutOfBounds || Can't send data
   if (ID == -1) { log("*[EMU ERROR]* CPU: Index Out Of Bounds... Halting Emulation...\t[at 0x"+hex(IP)+"]\n");
   } else {        log("[EMU Nottice] Component \""+Name+"\"[0x"+hex(ID)+"]: can't send data to this device...\t[at 0x"+hex(IP)+"]\n"); }
   break;
 }
}

//if 
var regs = "ABCDEFGH********";
var RomFilename = "";
var self_Running = false;
CPU = {
 ID = -1,
 running: false,
 REGs: new Uint16Array(8),
 PC: 0x0000000,//Program Counter / Instuction Pointer
 SL: 0x07fff10,//Stack Limit
 BP: 0x90000EF,//Base Pointer #C0: 0x90000EF | C1: 0x97FFFFF
 SP: 0x90000EF,//Stack Pointer
 wait: false,
 tick: function(snip) { //CPU.tick(snip)
  if (CPU.ID == -1) { log("CPU Error: Cannot process data until Initialized!"); return -1; }
  //Fetch
  let Inst =  snip[0];
  let A    =  snip[1] >> 4 ;       //4 \.
  let B    =  snip[1] & 0xF;       //4 |-> A/B/C = 1.5 bytes
  let C    =  snip[2] >> 4 ;       //4 /'
  let IMM  = (snip[2] & 0xF) << 8; //4 \.
      IMM |=  snip[3] << 8;        //8 |->  IMM  = 3.5 bytes
      IMM |=  snip[4] << 8;        //8 |
      IMM |=  snip[5];             //8 /'
  //Parse + Exec
  switch(Inst) {
   case 0x00:
    if (CPU.debug == true) { log("LOAD","\n"); }     //|+|-|-|0x---XXXX|REG[A] = IMM                                                                               |
    CPU.REGs[A] = IMM % (0x10000);
    break;
   case 0x01:
    if (CPU.debug == true) { log("ADD","\n"); }      //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A + B/IMM                                       |
    if (IMM == 0) {
     CPU.REGs[C] = (CPU.REGs[A] + CPU.REGs[B]) % 0x10000;
     if ((CPU.REGs[A] + CPU.REGs[B]) > 0xFFFF) { CPU.flag[0] = 1; } else { CPU.flag[0] = 0; }
    } else {
     CPU.REGs[C] = (CPU.REGs[A] + (IMM % 0x10000)) % 0x10000;
     if ((CPU.REGs[A] + (IMM % 0x10000)) > 0xFFFF) { CPU.flag[0] = 1; } else { CPU.flag[0] = 0; }
    } CPU.flag[1] = 0;
    break;
   case 0x02:
    if (CPU.debug == true) { log("SUB","\n"); }      //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A - B/IMM                                       |
    if (IMM == 0) {
     CPU.REGs[C] = (CPU.REGs[A] - CPU.REGs[B]) % 0x10000;
     if ((CPU.REGs[A] - CPU.REGs[B]) < 0) { CPU.flag[1] = 1; } else { CPU.flag[1] = 0; }
    } else {
     CPU.REGs[C] = (CPU.REGs[A] - (IMM % 0x10000)) % 0x10000;
     if ((CPU.REGs[A] - (IMM % 0x10000)) < 0) { CPU.flag[1] = 1; } else { CPU.flag[1] = 0; }
    } CPU.flag[0] = 0;
    break;
   case 0x03:
    if (CPU.debug == true) { log("MUL","\n"); }      //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A * B/IMM                                       |
    if (IMM == 0) {
     CPU.REGs[C] = (CPU.REGs[A] * CPU.REGs[B]) % 0x10000;
     if ((CPU.REGs[A] * CPU.REGs[B]) > 0xFFFF) { CPU.flag[0] = 1; } else { CPU.flag[0] = 0; }
    } else {
     CPU.REGs[C] = (CPU.REGs[A] * (IMM % 0x10000)) % 0x10000;
     if ((CPU.REGs[A] * (IMM % 0x10000)) > 0xFFFF) { CPU.flag[0] = 1; } else { CPU.flag[0] = 0; }
    } CPU.flag[1] = 0;
    break;
   case 0x04:
    if (CPU.debug == true) { log("DIV","\n"); }      //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A / B/IMM                                       |
    if (IMM == 0) {
     if (CPU.REGs[B] == 0) {
      log("EMU Error: try'd to divide by 0...\n");
      CPU.REGs[C] = 0; CPU.flag[4] = 1;
     } else {
      CPU.REGs[C] = Math.floor(CPU.REGs[A] / CPU.REGs[B]);
      CPU.flag[4] = 0;
     }
    } else {
     if (IMM == 0) {
      log("EMU Error: try'd to divide by 0...\n");
      CPU.REGs[C] = 0; CPU.flag[4] = 1;
     } else {
      CPU.REGs[C] = CPU.REGs[A] / (IMM % 0x10000);
      CPU.flag[4] = 0;
     }
    } CPU.flag[0] = 0; CPU.flag[1] = 0;
    break;
   case 0x05:
    if (CPU.debug == true) { log("REM","\n"); }      //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A / B/IMM                                       |
    if (IMM == 0) {
     if (CPU.REGs[B] == 0) {
      log("EMU Error: try'd to divide by 0...\n");
      CPU.REGs[C] = 0; CPU.flag[4] = 1;
     } else {
      CPU.REGs[C] = Math.floor(Math.floor(CPU.REGs[A] / CPU.REGs[B])-(CPU.REGs[A] / CPU.REGs[B])*10000);
      CPU.flag[4] = 0;
     }
    } else {
     if (IMM == 0) {
      log("EMU Error: try'd to divide by 0...\n");
      CPU.REGs[C] = 0; CPU.flag[4] = 1;
     } else {
      CPU.REGs[C] = CPU.REGs[A] / (IMM % 0x10000);
      CPU.flag[4] = 0;
     }
    } CPU.flag[0] = 0; CPU.flag[1] = 0;
    break;
   case 0x06:
    if (CPU.debug == true) { log("AND","\n"); }     //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A &AND B/IMM                                     |
    if (IMM == 0) {
     CPU.REGs[C] = CPU.REGs[A] & CPU.REGs[B];
    } else {
     CPU.REGs[C] = CPU.REGs[A] & (IMM % 0x10000);
    }
    break;
   case 0x07:
    if (CPU.debug == true) { log("OR","\n"); }      //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A |OR  B/IMM                                     |
    if (IMM == 0) {
     CPU.REGs[C] = CPU.REGs[A] | CPU.REGs[B];
    } else {
     CPU.REGs[C] = CPU.REGs[A] | (IMM % 0x10000);
    }
    break;
   case 0x08:
    if (CPU.debug == true) { log("XOR","\n"); }     //|+|+|+|0x---XXXX|if IMM > 0 then replace B with IMM  |  C = A ^XOR B/IMM                                     |
    if (IMM == 0) {
     CPU.REGs[C] = CPU.REGs[A] ^ CPU.REGs[B];
    } else {
     CPU.REGs[C] = CPU.REGs[A] ^ (IMM % 0x10000);
    }
    break;
   case 0x09:
    if (CPU.debug == true) { log("BSL","\n"); }     //|+|-|-|0x------X|if IMM > 0 then replace B with IMM  |  A = A << IMM                                         |
    CPU.REGs[A] = CPU.REGs[A] << (IMM % 0x10);
    break;
   case 0x0A:
    if (CPU.debug == true) { log("BSR","\n"); }     //|+|-|-|0x------X|if IMM > 0 then replace B with IMM  |  A = A >> IMM                                         |
    CPU.REGs[A] = CPU.REGs[A] >> (IMM % 0x10);
    break;
   case 0x0B:
    if (CPU.debug == true) { log("NOT","\n"); }     //|+|+|-|0x-------|B = NOT A                                                                                   |
    CPU.REGs[B] = ~CPU.REGs[A];
    break;
   case 0x0C:
    if (CPU.debug == true) { log("SPLIT","\n"); }   //|+|+|+|0x------X|B,C = A splitted | if IMM == 0: 8-bit split else 4-bit split                                |
    //log(">>>>>>  A:0x%x >> ",CPU.REGs[A]);
    if ((IMM % 0x2) == 0) {
     CPU.REGs[B] = CPU.REGs[A] & 0xFF;
     CPU.REGs[C] = CPU.REGs[A] >> 8;
    } else {
     CPU.REGs[B] = CPU.REGs[A] & 0xF;
     CPU.REGs[C] = CPU.REGs[A] >> 4;
    }
    //log("B:0x%x, C:0x%x (SPLITED)  <<<<<<\n",CPU.REGs[A],CPU.REGs[B],CPU.REGs[C]);
    break;
   case 0x0D:
    if (CPU.debug == true) { log("COMBINE","\n"); } //|+|+|+|0x------X|C = A combined with B | IMM rules same as SPLIT                                             |
    if ((IMM % 0x2) == 0) {
     CPU.REGs[C] = (CPU.REGs[A] << 8) | (CPU.REGs[B] & 0xFF);
    } else {
     CPU.REGs[C] = (CPU.REGs[A] << 4) | (CPU.REGs[B] & 0xF);
    }
 //    log(">>>>>>  A:0x%x, B:0x%x >> C:0x%x (COMBINE)  <<<<<<\n",CPU.REGs[A],CPU.REGs[B],CPU.REGs[C]);
    break;
   case 0x0E:
    if (C == 0) {
     if (CPU.debug == true) { log("JMP\n","\n"); }     //|+|+|/|0xXXXXXXX|if C == 1 then IC = A..B else IC = IMM                                                     |
     CPU.PC = ((CPU.REGs[A] << 16) | CPU.REGs[B])-6;
    } else {
     if (CPU.debug == true) { log("JMPIMM\n","\n"); }
     CPU.PC = IMM-6;
    } break;
   case 0x0F:
    if (CPU.debug == true) { log("LED\n\n");        //|/|-|-|0x-XXXXXX|if C == 1 then IC = A..B else IC = IMM                                                     |
     log("Adjusting System LED to GPU's current color: [0x%x, 0x%x, 0x%x]\n", GPU.r,GPU.g,GPU.b); }
    if (A == 0) {
     LED[0] = GPU.r;
     LED[1] = GPU.g;
     LED[2] = GPU.b;
    } else {
     LED[0] = IMM&0xFF0000;
     LED[1] = IMM&0x00FF00;
     LED[2] = IMM&0x0000FF;
    } break;
   case 0x10:
    if (CPU.debug == true) { log("CMP=: "); }    //|+|+|/|0x---XXXX|if A == B: IC=IC+1(expected JMP) else IC=IC+2                                               |
    if (C == 0) { if (CPU.REGs[A] == CPU.REGs[B]) { if (CPU.debug == true) {  log("True\n"); } } else { if (CPU.debug == true) { log("False\n"); } CPU.PC += 6; }
    } else {      if (CPU.REGs[A] == IMM%0x10000) { if (CPU.debug == true) {  log("True\n"); } } else { if (CPU.debug == true) { log("False\n"); } CPU.PC += 6; }
    } break;
   case 0x11:
    if (CPU.debug == true) { log("CMP<: "); }    //|+|+|/|0x-------|if A < B: IC=IC+1(expected JMP) else IC=IC+2                                                |
    if (C == 0) { if (CPU.REGs[A] <  CPU.REGs[B]) { if (CPU.debug == true) {  log("True\n"); } } else { if (CPU.debug == true) { log("False\n"); } CPU.PC = 6; }
    } else {      if (CPU.REGs[A] <  IMM%0x10000) { if (CPU.debug == true) {  log("True\n"); } } else { if (CPU.debug == true) { log("False\n"); } CPU.PC = 6; }
    //if (CPU.REGs[A] < CPU.REGs[B]) { if (CPU.debug == true) {  log("True\n");} } else { if (CPU.debug == true) { log("False\n");} CPU.PC = 6; }
    } break;
   case 0x12:
    if (CPU.debug == true) { log("CMP>: "); }    //|+|+|/|0x-------|if A > B: IC=IC+1(expected JMP) else IC=IC+2                                                |
    if (C == 0) { if (CPU.REGs[A]  > CPU.REGs[B]) { if (CPU.debug == true) {  log("True\n"); } } else { if (CPU.debug == true) { log("False\n"); } CPU.PC = 6; }
    } else {      if (CPU.REGs[A]  > IMM%0x10000) { if (CPU.debug == true) {  log("True\n"); } } else { if (CPU.debug == true) { log("False\n"); } CPU.PC = 6; }
    } break;
   case 0x13:
    if (CPU.debug == true) { log("RMEM","\n"); }    //|+|+|/|0xXXXXXXX|if B == 1 then use VRAM instead of RAM / if C == 1 then IMM will replace with RAMPointer    |
    if (regs[B] === "*") {
     if (CPU.debug == true) { log("[CPU0] Requesting MEMORY READ: [0x"+hex(IMM % 0xD7FFFFF,7)+"] to REG:"+REG[A]); }
     memory_read(IMM % 0xD7FFFFF,A);
    } else {
     if (CPU.debug == true) { log("[CPU0] Requesting MEMORY READ: [0x"+hex(((CPU.REGs[B] << 16) | CPU.REGs[C]) % 0xD7FFFFF,7)+"] to REG:"+REG[A]); }
     memory_read(((CPU.REGs[B] << 16) | CPU.REGs[C]) % 0xD7FFFFF,A);
    } break;
   case 0x14:
    if (CPU.debug == true) { log("WMEM","\n"); }    //|+|/|/|0xXXXXXXX|if B == 1 then index VRAM else RAM / if C == 1 then IMM will replace with RAMPointer        |
    if (regs[B] === "*") {
     if (CPU.debug == true) { log("[CPU0] Reqesting MEMORY WRITE: REG:"+REG[A]+" to RAM[0x"+hex(IMM % 0xD7FFFFF,7)+"]\n"); }
     memory_write(IMM % 0xD7FFFFF,A);
    } else {
     if (CPU.debug == true) { log("[CPU0] Reqesting MEMORY WRITE: REG:"+REG[A]+" to RAM[0x"+hex(((CPU.REGs[B] << 16) | CPU.REGs[C]) % 0xD7FFFFF,7)+"]\n"); }
     memory_write(((CPU.REGs[B] << 16) | CPU.REGs[C]) % 0xD7FFFFF,A);
    } break;
   case 0x15:
    if (CPU.debug == true) { log("BNKSWP","\n")
     log("[CPU0] Reqesting BANKSWAP for ROM"+(A%2)+" at BANK ID: "+(IMM%32)); }
    CPU.PC = ((CPU.REGs[B] << 16) | CPU.REGs[C])-6;
    BNKSWP(A%2,IMM%33);
   case 0x16:
    if (CPU.debug == true) { log("HALT","\n"); }    //|-|-|-|0x------X|halts index IMM located in [[HALT-INFO]]                                                    |
    CPU.flag[3] = IMM;
    switch(IMM) {
     case 0x0: //|nothing                                 |N/A        |
      break;
     case 0x1: //|halt(stop)                              |CPU        |
      log("[CPU0] HATLTED...","\n");
 //     getChar("```````````````", SW/2-7*8, SH/2-8, 255,  16,  16, true,false);
 //     getChar("```````````````", SW/2-7*8, SH/2,   255,  16,  16, true,false);
 //     getChar("```````````````", SW/2-7*8, SH/2+8, 255,  16,  16, true,false);
 //     getChar("+----[EMU]----+", SW/2-7*8, SH/2-8, 255, 128, 128, true, true);
 //     getChar("|CPU HALTED...|", SW/2-7*8, SH/2,   255, 128, 128, true, true);
 //     getChar("+-------------+", SW/2-7*8, SH/2+8, 255, 128, 128, true, true);
      CPU.running = 0;
      break;
     case 0x5: //|halts and prints traceback              |CPU        |
      log("EMU: CPU HATLTED at 0x"+hex(CPU.PC,7)"/"+CPU.PC+"...","\n");
      CPU.running = 0;
     case 0xF: //|resets everything(restarts the emu)     |EMU        |
      CPU.IS  = BIOS.data;
      CPU.ISz = BIOS.size;
      CPU.PC  = 0; CPU.PCC = 0; CPU.TI  = 0;
      break;
    } break;
   case 0x1C:
    if (CPU.debug == true) { log("PRINT","\n"); }   //|+|+|+|0x------X|prints A in emulator terminal(for debugging ROMs only)                                      |
    if (noPrint == false) {
     char *space = "";
     if        (IMM == 0) {
      if      (CPU.REGs[A] > 0xFFFFFFFFFFFF) { space = "  "; }
      else if (CPU.REGs[A] > 0xFFFFFFFFFF) { space = "    "; }
      else if (CPU.REGs[A] > 0xFFFFFFFF) { space = "      "; }
      else if (CPU.REGs[A] > 0xFFFFFF) { space = "        "; }
      else if (CPU.REGs[A] > 0xFFFF) { space = "          "; }
      else if (CPU.REGs[A] > 0xFF)  {space = "            "; }
      else {                       space = "              "; }
      log(">> 0x"+hex(CPU.REGs[A])+space+"("+CPU.REGs[A]+")","\n");
     } else if (IMM == 1) {
      if      ((CPU.REGs[A]<<16)|CPU.REGs[B] > 0xFFFFFFFFFFFF) { space = "  "; }
      else if ((CPU.REGs[A]<<16)|CPU.REGs[B] > 0xFFFFFFFFFF) { space = "    "; }
      else if ((CPU.REGs[A]<<16)|CPU.REGs[B] > 0xFFFFFFFF) { space = "      "; }
      else if ((CPU.REGs[A]<<16)|CPU.REGs[B] > 0xFFFFFF) { space = "        "; }
      else if ((CPU.REGs[A]<<16)|CPU.REGs[B] > 0xFFFF) { space = "          "; }
      else if ((CPU.REGs[A]<<16)|CPU.REGs[B] > 0xFF)  {space = "            "; }
      else {                                         space = "              "; }
      log(">> 0x"+hex((CPU.REGs[A]<<16)|CPU.REGs[B])+space+"("+(CPU.REGs[A]<<16)|CPU.REGs[B]+")","\n");
     } else if (IMM == 2) {
      if      ((((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C] > 0xFFFFFFFFFFFF) { space = "  "; }
      else if ((((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C] > 0xFFFFFFFFFF) { space = "    "; }
      else if ((((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C] > 0xFFFFFFFF) { space = "      "; }
      else if ((((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C] > 0xFFFFFF) { space = "        "; }
      else if ((((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C] > 0xFFFF) { space = "          "; }
      else if ((((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C] > 0xFF)  {space = "            "; }
      else {                                                             space = "              "; }
      log(">> 0x"+hex((((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C])+space+"("+(((CPU.REGs[A]<<16)|CPU.REGs[B])<<16)|CPU.REGs[C]+")","\n");
     }
    } break;
   case 0x1D:
    if (CPU.debug == true) { log("FLAGS","\n"); }   //|+|-|-|0x------X|A = Flags[IMM]                                                                              |
    CPU.REGs[A] = CPU.flag[IMM];
    break;
   case 0x1E:
    if (CPU.debug == true) { log("DVCSEND","\n"); } //|+|-|-|0x----XXX|send message to device IMM[3], IMM[1-2] are for device Instruction                          |
    //Component[(IMM >> 8) % 0x10].recv(IMM & 0xFF, CPU.REGs[A])
    switch ((IMM >> 8) % 0x10) {
     case 0x0: //GPU
//      GPU_send(IMM & 0xFF, CPU.REGs[A]);
      break;
     case 0x1: //INPUT
//      INPUT_send(IMM & 0xFF, CPU.REGs[A]);
      break;
     case 0x2: //SOUND
      //_send(IMM & 0xFF, A);
      break;
     case 0x3: //NETWORK
      //_send(IMM & 0xFF, A);
      break;
     case 0x4: //
      //_send(IMM & 0xFF, A);
      break;
     case 0x5: //
      //_send(IMM & 0xFF, A);
      break;
     case 0x6: //
      //_send(IMM & 0xFF, A);
      break;
     case 0x7: //
      //_send(IMM & 0xFF, A);
      break;
     case 0x8: //
      //_send(IMM & 0xFF, A);
      break;
     case 0x9: //
      //_send(IMM & 0xFF, A);
      break;
     case 0xA: //
      //_send(IMM & 0xFF, A);
      break;
     case 0xB: //
      //_send(IMM & 0xFF, A);
      break;
     case 0xC: //
      //_send(IMM & 0xFF, A);
      break;
     case 0xD: //
      //_send(IMM & 0xFF, A);
      break;
     case 0xE: //
      //_send(IMM & 0xFF, A);
      break;
     case 0xF: //
      //_send(IMM & 0xFF, A);
      break;
    }
    break;
   case 0x1F:
    if (CPU.debug == true) { log("DVCRECV","\n"); } //|+|-|-|0x----XXX|same as DVCSEND but recive then send                                                        |
    //CPU.REGs[A] = Component[(IMM >> 8) % 0x10].recv(IMM & 0xFF)
 /    log("nom:%x\n8>>:%x\n",IMM,IMM >> 8);
    switch ((IMM >> 8) % 0x10) {
     case 0x0: //GPU
      CPU.REGs[A] = GPU_recv(IMM & 0xFF);
      break;
     case 0x1: //INPUT
      CPU.REGs[A] = INPUT_recv(IMM & 0xFF);
      break;
     case 0x2: //SOUND
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0x3: //NETWORK
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0x4: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0x5: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0x6: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0x7: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0x8: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0x9: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0xA: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0xB: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0xC: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0xD: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0xE: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
     case 0xF: //
      //CPU.REGs[A] = _recv(IMM & 0xFF, A);
      break;
    }
    break;
   case 0x20:
    if (CPU.debug == true) { log("ICOUT","\n"); }   //|+|+|-|0x-------|A,B = IC(32-bit for 24-bit)                                                                 |
    CPU.REGs[A] = CPU.PC & 0xFF;
    CPU.REGs[B] = CPU.PC >> 16;
    break;
   case 0x21:
    if (CPU.debug == true) { log("COPY","\n"); }    //|+|+|-|0x-------|A = B                                                                                       |
    CPU.REGs[B] = CPU.REGs[A];
    break;
   case 0x22:
    if (CPU.debug == true) { log("EXECUTE","\n"); } //|+|-|-|0xXXXXXXX|execute location = IMM[6] and IMM[0-5]                                                      |
    CPU.PC = IMM-6;
    log("[EMU] NOTICE: ");
    switch(A) {
     case 0x0: //executes BIOS
      log("Switching to BIOS execute");
      CPU.IS  = BIOS.data;
      CPU.ISz = BIOS.size;
      break;
     case 0x1: //executes ROM
      if (stopatloadrom == true) {
       //log("**press enter**\n");//EMU: DebugMode Enabled...\n
       CPU.running = false;
       //CPU.debug = true, 
       //stopatloadrom = false;
       //getchar();
      }
      log("Switching to ROM execute");
      CPU.IS  = ROM.data;
      CPU.ISz = ROM.size;
      break;
     case 0x2: //executes RAM
      log("Switching to RAM execute");
      CPU.IS  = RAM;
      CPU.ISz = sizeof(RAM);
      break;
    }
    log("... [PC:0x%x]\n",CPU.PC+6);
    //if (CPU.debug == true) { log(" at 0x%x/%x...\n",CPU.PC+6,CPU.ISz); } else { log("...","\n"); }
    break;
   case 0x23:
    if (CPU.debug == true) { log("RBIOS","\n"); }    //|+|+|+|0x-------|C = BIOS.data[A..B]                                                                         |
    CPU.REGs[C] = BIOS.data[(CPU.REGs[A] << 16) | CPU.REGs[B]];
    break;
   case 0x24:
    if (CPU.debug == true) { log("IRBIOS","\n"); }   //|+|-|-|0xXXXXXXX|C = BIOS.data[IMM]                                                                          |
    CPU.REGs[A] = IMM & CPU.ISz;
    break;
   case 0x25:
    if (CPU.debug == true) { log("POP "); }       //|+|-|-|0x-------|Pushes A into stack                                                                         |
    if (CPU.SP+1 < CPU.BP){
     CPU.SP+=2;
    } else {
     log("PANIC! stack empty\n");
     CPU.running = false;
    }
    CPU.REGs[A] = (uint16_t)RAM[CPU.SP] | (((uint16_t)RAM[CPU.SP-1])<<8);
    if (CPU.debug == true) { log("%i\n",CPU.REGs[A]);}
    break;
   case 0x26:
    if (CPU.debug == true) { log("PUSH "); }      //|+|/|-|0x---XXXX|Pops A from stack                                                                           |
    if (B == 1) {
     RAM[CPU.SP--] = (uint8_t)(IMM & 0xff);
     RAM[CPU.SP--] = (uint8_t)((IMM >> 8)&0xff);
     if (CPU.debug == true) { log("%i\n",IMM&0x10000); }
    } else {
     RAM[CPU.SP--] = (uint8_t)(CPU.REGs[A] & 0xff);
     RAM[CPU.SP--] = (uint8_t)(CPU.REGs[A] >> 8);
     if (CPU.debug == true) { log("%i\n",CPU.REGs[A]); }
    }
    break;
   case 0x27:
    if (CPU.debug == true) { log("CALL "); }      //|+|+|/|0xXXXXXXX|Jumps to address as a Function via storing current address in stack                       |
    if (C == 0) {
 /     log("CALLING FUNCTION AT: PC:0x%x | TO:0x%x\n",CPU.PC,IMM % 0x1000000);
     RAM[CPU.SP--] = (uint8_t)(CPU.PC      );// CPU.SP--;
     RAM[CPU.SP--] = (uint8_t)(CPU.PC >>  8);// CPU.SP--;
     RAM[CPU.SP--] = (uint8_t)(CPU.PC >> 16);// CPU.SP--;
     RAM[CPU.SP--] = (uint8_t)(CPU.PC >> 32);// CPU.SP--;
     if (CPU.debug == true) { log("%i\n",CPU.PC);}
     CPU.PC = (IMM % 0x1000000)-6;
    } else {
 /     log("CALLING FUNCTION AT: PC:0x%x | TO:0x%x\n",CPU.PC,(((A<<16)|B) % 0x1000000));
     RAM[CPU.SP--] = (uint8_t)((((A<<16)|B) % 0x1000000)      );
     RAM[CPU.SP--] = (uint8_t)((((A<<16)|B) % 0x1000000) >>  8);
     RAM[CPU.SP--] = (uint8_t)((((A<<16)|B) % 0x1000000) >> 16);
     RAM[CPU.SP--] = (uint8_t)((((A<<16)|B) % 0x1000000) >> 32);
     if (CPU.debug == true) { log("%i\n",CPU.PC);}
     CPU.PC = (IMM % 0x1000000)-6;
    }
    /*log("StackData:[");
    for (int i = CPU.SP+1; i <= CPU.BP; ++i) {
     log(" 0x%02x",RAM[i]);
     if(i%16==0 && i != 0){
      log("\n");
     }
    } log("]\n[AB:0x%x%x]\n",CPU.REGs[0],CPU.REGs[1]);*/
    break;
   case 0x28:
    if (CPU.debug == true) { log("RET "); }       //|-|-|-|0x-------|Returns from function via going to prev. address stored in stack                            |
    if (CPU.SP+3 < CPU.BP) {
     CPU.SP+=4;
    } else {
     log("EMU: PANIC! stack empty\n");
     Exit = true;
    }
    CPU.PC = RAM[CPU.SP] | ((RAM[CPU.SP-1])<<8) | ((RAM[CPU.SP-2])<<16) | ((RAM[CPU.SP-3])<<32);
   /*log("RETURNING FROM FUNCTION AT: PC:0x%x | TO:0x%x\n",CPU.PC,RAM[CPU.SP] | ((RAM[CPU.SP-1])<<8) | ((RAM[CPU.SP-2])<<16) | ((RAM[CPU.SP-3])<<32));
    if (CPU.debug == true) { log("%i\n",CPU.PC);}
    log("StackData:[");
    for (int i = CPU.SP+1; i <= CPU.BP; ++i){
     log(" 0x%02x",RAM[i]);
     if(i%16==0 && i != 0) {
      log("\n");
     }
    } log("]\n[AB:0x%x%x]\n",CPU.REGs[0],CPU.REGs[1]);*/
    break;
   case 0x29:
    if (CPU.debug == true) { log("SWAPTOP "); } //|-|-|-|0x-------|Swaps the top 2 slots in swap                                                               |
    if (CPU.SP+1 < CPU.BP){
     CPU.SP+=2;
    } else {
     log("EMU: PANIC! stack empty\n");
     Exit = true;
    }
    uint16_t tmp1 = (uint16_t)RAM[CPU.SP] | (((uint16_t)RAM[CPU.SP-1])<<8);
    if (CPU.SP+1 < CPU.BP) {
     CPU.SP+=2;
    } else {
     log("EMU: PANIC! stack empty\n");
     Exit = true;
    }
    uint16_t tmp2 = (uint16_t)RAM[CPU.SP] | (((uint16_t)RAM[CPU.SP-1])<<8);
    RAM[CPU.SP--] = (uint8_t)(tmp1 & 0xff);
    RAM[CPU.SP--] = (uint8_t)(tmp1 >> 8);
    RAM[CPU.SP--] = (uint8_t)(tmp2 & 0xff);
    RAM[CPU.SP--] = (uint8_t)(tmp2 >> 8);
    break;
   case 0x2A:                                        //|+|/|-|0x-------|Sets A as CPU Clock | B(2-bit) if true[1] will reset the CPU clock                          |
    if (B == 0) {
     if (CPU.debug == true) { log("GCLK: %d\n",CPU.time); }
    } else {
     if (CPU.debug == true) { log("GCLK: resetting...","\n"); }
     CPU.time = 0;// Tick_clock = time(0);
    } CPU.REGs[A] = CPU.time;
    break;
   case 0x2B:                                        //|-|-|-|0xXXXXXXX|Sets A as CPU Clock | B(2-bit) if true[1] will reset the CPU clock                          |
    if (CPU.debug == true || devInfo == true) {
     log("Debug Delay: %dms.\n",IMM);
     if (IMM == 0) {
      if (devInfo == true) {
       log("\DevInfo: TotalRan: %ld\n",CPU.TI);
      }
      if (CPU.debug == true || devInfo == true) {
       log("/**press enter**\n");
       getchar();
      }
     } else {
      SDL_Delay(IMM);
     }
    }
    break;
 /*  case 0x2C:
 
    break;
   case 0x2D:
 
    break;
   case 0x2E:
 
    break;
   case 0x2F:
 
    break;
   case 0x30:
 
    break;
   case 0x31:
 
    break;
   case 0x32:
 
    break;
   case 0x33:
 
    break;
   case 0x34:
 
    break;
   case 0x35:
 
    break;
   case 0x36:
 
    break;
   case 0x37:
 
    break;
   case 0x38:
 
    break;
   case 0x39:
 
    break;
   case 0x3A:
 
    break;
   case 0x3B:
 
    break;
   case 0x3C:
 
    break;
   case 0x3D:
 
    break;
   case 0x3E:
 
    break;
   case 0x3F: //end of a 6-bit value
 
    break;*/
   case 0xFF:
    if (CPU.debug == true) { log("NOP","\n"); }  //
    break;
   default:
    if (CPU.debug == true) { log("UNKNOWN\n  \\"); }
    CPU.running = 0; System_Error( 0, CPU.IS[CPU.PC], CPU.PC, -1, "CPU");
  }
  //WriteBack
  CPU.PC += 6;
  return WBack
 }
};

onmessage = function(e) {
  log("Received \""+e.data[0]+"\"","\n");
  if (e.data[0] == "init") {
   CPU.ID = e.data[1]%2;
   CPU.PC = 0x0000000,//Program Counter / Instuction Pointer
   CPU.SL = 0x07fff10,//Stack Limit
   CPU.BP = [0x90000EF,0x97FFFFF][CPU.ID],//Base Pointer
   CPU.SP = (CPU.BP),//Stack Pointer
  } else if (e.data[0] == "") {
   
  } else if (e.data[0] == "") {
  } else if (e.data[0] == "") {
  } else if (e.data[0] == "") {
  } else if (e.data[0] == "") {
  }
  
  //var workerResult = 'Result: ' + (e.data[0] * e.data[1]);
  //log("Posting message back to main script");
  //postMessage(workerResult);
}
