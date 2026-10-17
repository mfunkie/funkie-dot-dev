/*
 * The sound driver, in 6502 assembly. INIT (A = song, from 0) points each
 * channel at its order list; PLAY, called 60 times a second, counts down
 * each channel's wait, reads its next events, steps the volume envelope and
 * vibrato, and writes the APU.
 *
 * Stream format (per channel, in chunks of one bar each):
 *   $00-$6F  note: period-table index (MIDI 21 + n; the triangle's index is an
 *            octave up, since it sounds an octave below a pulse at the same
 *            period). On the noise channel the byte is the drum's instrument.
 *            Lasts `dur` frames.
 *   $70      wait `dur` frames (a rest, or a note carried over a bar line)
 *   $71 d    dur = d frames (sticky)
 *   $72 i    instrument = i (sticky)
 *   $73 g    the next note lets go after g frames, not dur * gate
 *   $74      end of chunk: take the next one from the order list
 * An order list is chunk addresses, then $0000 and the address to loop to
 * ($0000: the song ends and the channel falls silent).
 *
 * Data tables come from encode.ts and are passed in as external symbols.
 */
export const DRIVER = `
; ---- zero page
ptr      = $00   ; read pointer (2)
tptr     = $02   ; scratch pointer (2)
m1       = $05
m2       = $06
vo       = $08   ; vibrato offset (2)
plo      = $0a
phi      = $0b
tmpv     = $0c
sgn      = $0d
ma       = $0e   ; mul16 operands and result
mb       = $10
mr       = $12   ; 4 bytes
song4    = $16
; per-channel arrays, four bytes each (X = channel: 0 pulse 1, 1 pulse 2, 2 triangle, 3 noise)
chLo     = $20
chHi     = $24
ordLo    = $28
ordHi    = $2c
wait     = $30
dur      = $34
inst     = $38
gateOv   = $3c
vol      = $40
volPos   = $44
rel      = $48
relCnt   = $4c
perLo    = $50
perHi    = $54
lastHi   = $58
vibPh    = $5c
vibDly   = $60
vibDep   = $64
halted   = $68
nper     = $6c
gate     = $70
vibRate  = $74
vibDelay = $78
vibFacLo = $7c
vibFacHi = $80

INIT:
    asl a
    asl a
    sta song4
    lda #$0f
    sta $4015
    lda #$40
    sta $4017
    lda #$08          ; sweep off, negate set: low notes aren't muted
    sta $4001
    sta $4005
    lda #$30
    sta $4000
    sta $4004
    sta $400c
    lda #$80
    sta $4008
    ldx #0
initCh:
    txa
    clc
    adc song4
    tay
    lda songOrdLo,y
    sta ordLo,x
    lda songOrdHi,y
    sta ordHi,x
    lda songGate,y
    sta gate,x
    lda songVibRate,y
    sta vibRate,x
    lda songVibDelay,y
    sta vibDelay,x
    lda songVibFacLo,y
    sta vibFacLo,x
    lda songVibFacHi,y
    sta vibFacHi,x
    lda #1
    sta wait,x
    lda #0
    sta halted,x
    sta vol,x
    sta rel,x
    sta relCnt,x
    sta gateOv,x
    sta vibDep,x
    sta inst,x
    sta volPos,x
    sta perLo,x
    sta perHi,x
    lda #$fe
    sta lastHi,x
    jsr orderNext
    inx
    cpx #4
    bne initCh
    rts

PLAY:
    ldx #0
plLoop:
    lda halted,x
    bne plNext
    dec wait,x
    bne plEnv
    jsr readEvents
    lda halted,x
    bne plNext
plEnv:
    jsr doEnv
    jsr writeRegs
plNext:
    inx
    cpx #4
    bne plLoop
    rts

; ---- the next chunk from channel X's order list (or loop, or stop)
orderNext:
    lda ordLo,x
    sta tptr
    lda ordHi,x
    sta tptr+1
onRead:
    ldy #0
    lda (tptr),y
    sta chLo,x
    iny
    lda (tptr),y
    sta chHi,x
    ora chLo,x
    bne onOk
    iny
    lda (tptr),y
    pha
    iny
    lda (tptr),y
    sta tptr+1
    pla
    sta tptr
    ora tptr+1
    bne onRead
    lda #1
    sta halted,x
    jmp silence
onOk:
    clc
    lda tptr
    adc #2
    sta ordLo,x
    lda tptr+1
    adc #0
    sta ordHi,x
    rts

; ---- read channel X's events up to the next one that takes time
readEvents:
    lda chLo,x
    sta ptr
    lda chHi,x
    sta ptr+1
rd:
    jsr fetch
    cmp #$70
    bcc rdNote
    beq rdWait
    cmp #$71
    beq rdDur
    cmp #$72
    beq rdInst
    cmp #$73
    beq rdGate
    jsr orderNext       ; $74: end of chunk
    lda halted,x
    bne rdOut
    lda chLo,x
    sta ptr
    lda chHi,x
    sta ptr+1
    jmp rd
rdDur:
    jsr fetch
    sta dur,x
    jmp rd
rdInst:
    jsr fetch
    sta inst,x
    jmp rd
rdGate:
    jsr fetch
    sta gateOv,x
    jmp rd
rdNote:
    jsr noteOn
rdWait:
    lda dur,x
    sta wait,x
    lda ptr
    sta chLo,x
    lda ptr+1
    sta chHi,x
rdOut:
    rts

fetch:
    ldy #0
    lda (ptr),y
    inc ptr
    bne fetched
    inc ptr+1
fetched:
    rts

; ---- start a note (A = note byte) on channel X
noteOn:
    cpx #3
    beq noNoise
    tay
    lda perTabLo,y
    sta perLo,x
    lda perTabHi,y
    sta perHi,x
    lda vibFacLo,x      ; vibrato depth in period units: period * factor / 65536
    ora vibFacHi,x
    beq noVib
    lda perLo,x
    sta ma
    lda perHi,x
    sta ma+1
    lda vibFacLo,x
    sta mb
    lda vibFacHi,x
    sta mb+1
    jsr mul16
    lda mr+2
noVib:
    sta vibDep,x
    lda vibDelay,x
    sta vibDly,x
    lda #0
    sta vibPh,x
    jmp noStart
noNoise:
    sta inst,x
noStart:
    lda #$ff            ; retrigger: rewrite the period and length counter
    sta lastHi,x
    lda #0
    sta volPos,x
    sta rel,x
    lda gateOv,x
    beq noGate
    sta relCnt,x
    lda #0
    sta gateOv,x
    rts
noGate:
    lda dur,x           ; let go after dur * gate / 256 frames (at least one)
    sta m1
    lda gate,x
    sta m2
    jsr mul8
    cmp #0              ; (mul8 leaves Z from its loop counter)
    bne noGateOk
    lda #1
noGateOk:
    sta relCnt,x
    rts

; ---- one frame of channel X's envelope
doEnv:
    lda rel,x
    bne envRel
    lda relCnt,x
    bne envSeq
    lda #1
    sta rel,x
    jmp envRel
envSeq:
    dec relCnt,x
    cpx #3
    bne envVol
    ldy inst,x          ; the drum's noise period runs alongside its volume
    lda instNoiLo,y
    sta tptr
    lda instNoiHi,y
    sta tptr+1
    ldy volPos,x
    lda (tptr),y
    sta nper,x
envVol:
    ldy inst,x
    lda instVolLo,y
    sta tptr
    lda instVolHi,y
    sta tptr+1
    ldy volPos,x
    lda (tptr),y
    sta vol,x
    iny
    lda (tptr),y        ; $ff after the last volume: hold it
    cmp #$ff
    beq envDone
    inc volPos,x
envDone:
    rts
envRel:
    lda vol,x
    beq envDone
    sta m1
    ldy inst,x
    lda instRel,y
    sta m2
    jsr mul8            ; vol * rel / 16 (vol * rel < 256)
    lda m1
    lsr a
    lsr a
    lsr a
    lsr a
    sta vol,x
    rts

; ---- vibrato offset for pulse channel X into vo (signed 16-bit)
vibOffset:
    lda #0
    sta vo
    sta vo+1
    lda vibDep,x
    beq vibDone
    lda vibDly,x
    beq vibRun
    dec vibDly,x
    rts
vibRun:
    lda vibPh,x
    clc
    adc vibRate,x
    sta vibPh,x
    lsr a
    lsr a
    tay
    lda sinTab,y
    sta sgn
    bpl vibPos
    eor #$ff
    clc
    adc #1
vibPos:
    sta m1
    lda vibDep,x
    sta m2
    jsr mul8            ; |sin| * depth / 128
    asl m1
    rol a
    beq vibStore
    bit sgn
    bpl vibStore
    eor #$ff
    clc
    adc #1
    sta vo
    lda #$ff
    sta vo+1
    rts
vibStore:
    sta vo
vibDone:
    rts

; ---- write channel X's registers
writeRegs:
    cpx #2
    beq wTri
    bcs wNoise
    jsr vibOffset
    clc
    lda perLo,x
    adc vo
    sta plo
    lda perHi,x
    adc vo+1
    sta phi
    ldy inst,x
    lda instDuty,y
    ora vol,x
    sta tmpv
    txa
    asl a
    asl a
    tay
    lda tmpv
    sta $4000,y
    lda plo
    sta $4002,y
    lda phi
    cmp lastHi,x
    beq wDone
    sta lastHi,x
    ora #$08
    sta $4003,y
wDone:
    rts
wTri:
    lda vol,x
    beq wTriOff
    lda lastHi,x
    cmp #$ff
    bne wDone
    lda #$ff
    sta $4008
    lda perLo,x
    sta $400a
    lda perHi,x
    sta lastHi,x
    ora #$08
    sta $400b
    rts
wTriOff:
    lda lastHi,x
    cmp #$fe
    beq wDone
    lda #$80
    sta $4008
    lda perHi,x
    ora #$08
    sta $400b
    lda #$fe
    sta lastHi,x
    rts
wNoise:
    lda vol,x
    ora #$30
    sta $400c
    lda nper,x
    sta $400e
    lda lastHi,x
    cmp #$ff
    bne wDone
    lda #$08
    sta $400f
    lda #0
    sta lastHi,x
    rts

; ---- silence channel X (its song has ended)
silence:
    lda #0
    sta vol,x
    cpx #2
    beq sTri
    bcs sNoise
    txa
    asl a
    asl a
    tay
    lda #$30
    sta $4000,y
    rts
sTri:
    lda #$80
    sta $4008
    lda perHi,x
    ora #$08
    sta $400b
    rts
sNoise:
    lda #$30
    sta $400c
    rts

; ---- m1 * m2 -> A (high byte), m1 (low byte)
mul8:
    lda #0
    ldy #8
    lsr m1
m8Loop:
    bcc m8Skip
    clc
    adc m2
m8Skip:
    ror a
    ror m1
    dey
    bne m8Loop
    rts

; ---- ma * mb (16-bit) -> mr (32-bit)
mul16:
    lda #0
    sta mr+2
    sta mr+3
    ldy #16
m16Loop:
    lsr mb+1
    ror mb
    bcc m16Skip
    clc
    lda mr+2
    adc ma
    sta mr+2
    lda mr+3
    adc ma+1
    sta mr+3
m16Skip:
    ror mr+3
    ror mr+2
    ror mr+1
    ror mr
    dey
    bne m16Loop
    rts
`;

/* External symbols the driver expects from the data. */
export const DRIVER_TABLES = [
  'perTabLo', 'perTabHi', 'sinTab',
  'instDuty', 'instRel', 'instVolLo', 'instVolHi', 'instNoiLo', 'instNoiHi',
  'songOrdLo', 'songOrdHi', 'songGate', 'songVibRate', 'songVibDelay', 'songVibFacLo', 'songVibFacHi',
];
