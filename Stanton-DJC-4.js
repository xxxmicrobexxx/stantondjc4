/**
 * Stanton DJC4 controller script v0.1 for Mixxx v1.11.0
 *
 * Written by Martin Bruset Solberg
 * 
 * Based on mc2000 script by Esteban Serrano Roloff.
 * 
 * For now, only with dual deck support
 * 
 * TODO:
 * Browser support
 * VU Meters
 * Loop control
 * Shift functions
 *
 **/

function djc4(){};

// ----------   Global variables    ----------

// MIDI Reception commands (from spec)
djc4.leds = {
	loopminus:	2,
	looplus:	3,
	loopin:		4,
	loopout:	5,
	loopon:		6,
	loopdel:	7,
	hotcue1:	8,
	hotcue2:	9,
	hotcue3:	10,
	hotcue4:	11,
	sample1:	12,
	sample2:	13,
	sample3:	14,
	sample4:	15,
	keylock:	16,
	sync:		18,
	pbendminus:	19,
	pbendplus:	20,
	scratch:	21,
	tap:		22,
	cue:		23,
	play:		24,
	highkill:	25,
	midkill:	26,
	lowkill:	27,
	pfl:		28,
	fxon:		30,
	fxexf1:		31,
	fxexf2:		32,
	fxexf3:		33,
	loadac:		34,
	loadbd:		35,
	videofx:	36,
	xflink:		37,
	keylock:	38,
	tx:			46,
	fx:			47	
};

djc4.scratchMode = [false, false];

// ----------   Functions    ----------

// Called when the MIDI device is opened & set up.
djc4.init = function(id, debug) {	

	djc4.id = id;
	djc4.debug = debug;


	// ---- Connect controls -----------

	// ---- Controls for Channel 1 and 2
	var i=0;
	for (i=1; i<=2; i++) {
		// Cue 1-4
		var j=0;
		for (j=1;j<=4;j++) {
			engine.connectControl("[Channel"+i+"]","hotcue_"+j+"_enabled","djc4.hotcueSetLed");
		}

		// Cue
		engine.connectControl("[Channel"+i+"]", "cue_default", "djc4.cueSetLed");
		// Play
		engine.connectControl("[Channel"+i+"]", "play", "djc4.playSetLed");

		// Loop in
		engine.connectControl("[Channel"+i+"]", "loop_start_position", "djc4.loopStartSetLed");
		// Loop out
		engine.connectControl("[Channel"+i+"]", "loop_end_position", "djc4.loopEndSetLed");

		// Monitor cue
		engine.connectControl("[Channel"+i+"]", "pfl", "djc4.pflSetLed");
		
		// Kills
		engine.connectControl("[Channel"+i+"]", "filterHighKill", "djc4.highkillSetLed");
		engine.connectControl("[Channel"+i+"]", "filterMidKill", "djc4.midkillSetLed");
		engine.connectControl("[Channel"+i+"]", "filterLowKill", "djc4.lowkillSetLed");
			
	}
	
	// Put all LEDs on default state.
	djc4.allLed2Default();
};

// Called when the MIDI device is closed
djc4.shutdown = function(id) {
	// Put all LEDs on default state.
	djc4.allLed2Default();
};

// === FOR MANAGING LEDS ===

djc4.allLed2Default = function () {
	// All leds OFF for deck 1 and 2
	for (var led in djc4.leds) {
		djc4.setChannelLed (1,djc4.leds[led],0);
		djc4.setChannelLed (2,djc4.leds[led],0);	
	}

	// Monitor cue leds OFF for deck 1 and 2 (use function setLed2)
	// djc4.setMixLed (1,djc4.leds["monitorcue_l"],0);
	// djc4.setMixLed (2,djc4.leds["monitorcue_r"],0);
};

// Leds that belong to a channel
djc4.setChannelLed  = function(deck,led,status) {
	// if (deck == 0) {
		// hexDeck = 0x90;
	// }
	// else if (deck == 1) {
		// hexDeck = 0x91;
	// }
	// else {
		// return;
	// }
	var ledStatus = 0x00; // Default OFF
	switch (status) {
		case 0: 	ledStatus = 0x00; break; // OFF
		case false: ledStatus = 0x00; break; // OFF 
    	case 1: 	ledStatus = 0x7F; break; // ON
		case true: 	ledStatus = 0x7F; break; // ON
    	//case 2: 	ledStatus = 0x4C; break; // BLINK
    	default: 	break;
	}
	midi.sendShortMsg(0x90+(deck-1), led, ledStatus);
};

// Leds that belong to the main mixer
djc4.setMixLed  = function(deck,led,status) {
	midi.sendShortMsg(0x0B, led, status==1 ? 0x7F : 0x00);
};

// === MISC COMMON ===

djc4.group2Deck = function(group) {
	var matches = group.match(/^\[Channel(\d+)\]$/);
	if (matches == null) {
		return -1;
	} else {
		return matches[1];
	}
};

// === HOT CUES ===

// Insert script for hot cue deletion here
// Logic: Shift+hotcue signal deletes hotcue

// On load track, light up hot cues

// === JOG WHEEL ===

// Touch platter
djc4.wheelTouch = function(channel, control, value, status, group){
	var deck = channel + 1;
	
	if (djc4.scratchMode[channel] == true){ // If scratch enabled
		if (value == 0x7F) {    // If touch
	        var alpha = 1.0/8;
	        var beta = alpha/32;
	
	        var rpm = 150.0;
	
	        engine.scratchEnable(deck, 128, rpm, alpha, beta, true);
	    }
	    else {    // If button up
	        engine.scratchDisable(deck);
	    }
	}
};

// The wheel that actually controls the scratching
djc4.wheelTurn = function(channel, control, value, status, group) {
    //var deck = channel + 1;
    var deck = script.deckFromGroup(group);

    // B: For a control that centers on 0x40 (64):
    var newValue=(value-64);
    
    // See if we're scratching. If not, skip this.
    if (!engine.isScratching(deck)) {
        engine.setValue(group, "jog", newValue/4);
        return;
    } // for 1.11.0 and above
 
    // In either case, register the movement
    engine.scratchTick(deck,newValue);
};

// Shift + jog wheel will fast search


// === SET LED FUNCTIONS ===

// Hot cues

djc4.hotcueSetLed = function(value, group, control) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["hotcue"+control[7]],value);  //control?
};

// PFL

djc4.pflSetLed = function(value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["pfl"],value);
};

// Play/Cue

djc4.playSetLed = function(value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["play"],value);
};

djc4.cueSetLed = function(value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["cue"],value);
};

// Keylock

djc4.keylockSetLed = function(value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["keylock"],value);
};

// Loops

djc4.loopStartSetLed = function (value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["loopin"],value == -1 ? false: true);
};

djc4.loopEndSetLed = function (value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["loopout"],value == -1 ? false: true);
};

// Kills

djc4.highkillSetLed = function(value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["highkill"],value);
};

djc4.midkillSetLed = function(value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["midkill"],value);
};
djc4.lowkillSetLed = function(value, group) {
	djc4.setChannelLed (djc4.group2Deck(group),djc4.leds["lowkill"],value);
};

// Scratch button

djc4.scratchSetLed = function(deck) {
	if (djc4.scratchMode[deck-1] == true) {
		midi.sendShortMsg(0x90+(deck-1), djc4.leds["scratch"], 0x7F);
	}
	else if (djc4.scratchMode[deck-1] == false) {
		midi.sendShortMsg(0x90+(deck-1), djc4.leds["scratch"], 0x00);
	}
	else return;
};

// Light loop delete button

// === EQ Kills ===

// === VU Meter ===

// Insert code for lighting up VU Meter

// === Scratch control === (Could be replaced by built-in function?)

djc4.toggleScratchMode = function(channel, control, value, status, group){
	if (!value) return;
	
	var deck = djc4.group2Deck(group);
	// Toggle setting and light
	djc4.scratchMode[deck-1] = !djc4.scratchMode[deck-1];
	djc4.scratchSetLed(deck);
}
