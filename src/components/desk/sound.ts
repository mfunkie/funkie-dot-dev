/**
 * Tiny WebAudio synth for the desk: no audio files, everything is made from
 * oscillators and filtered noise. Silent until the visitor turns sound on.
 */

let context: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null

function audio() {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
    master = context.createGain()
    master.gain.value = 0.5
    master.connect(context.destination)
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (context.state === 'suspended') void context.resume()
  return context
}

function burst(
  at: number,
  duration: number,
  filter: { type: BiquadFilterType; frequency: number; q?: number },
  volume: number,
) {
  const ctx = audio()
  if (!ctx || !noise || !master) return
  const source = ctx.createBufferSource()
  source.buffer = noise
  const biquad = ctx.createBiquadFilter()
  biquad.type = filter.type
  biquad.frequency.value = filter.frequency
  biquad.Q.value = filter.q ?? 1
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  source.connect(biquad).connect(gain).connect(master)
  source.start(at, Math.random() * 0.5)
  source.stop(at + duration + 0.02)
}

function tone(
  at: number,
  duration: number,
  frequency: number,
  volume: number,
  type: OscillatorType = 'sine',
  endFrequency?: number,
) {
  const ctx = audio()
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, at)
  if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, at + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(gain).connect(master)
  osc.start(at)
  osc.stop(at + duration + 0.02)
}

/** A voiced sound shaped by two formant filters, for cat noises. */
function voice(
  at: number,
  duration: number,
  pitch: Array<[number, number]>,
  formants: Array<Array<[number, number]>>,
  volume: number,
) {
  const ctx = audio()
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(pitch[0][1], at)
  for (const [time, hz] of pitch.slice(1)) osc.frequency.linearRampToValueAtTime(hz, at + time)
  const vibrato = ctx.createOscillator()
  vibrato.frequency.value = 6
  const vibratoDepth = ctx.createGain()
  vibratoDepth.gain.value = 9
  vibrato.connect(vibratoDepth).connect(osc.frequency)
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(volume, at + 0.05)
  envelope.gain.setValueAtTime(volume, at + duration * 0.7)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  envelope.connect(master)
  for (const path of formants) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 6
    filter.frequency.setValueAtTime(path[0][1], at)
    for (const [time, hz] of path.slice(1)) filter.frequency.linearRampToValueAtTime(hz, at + time)
    osc.connect(filter).connect(envelope)
  }
  osc.start(at)
  vibrato.start(at)
  osc.stop(at + duration + 0.05)
  vibrato.stop(at + duration + 0.05)
}

export const sounds = {
  /** Buckling-spring keyboard click. */
  key() {
    const ctx = audio()
    if (!ctx) return
    const t = ctx.currentTime
    burst(t, 0.03, { type: 'bandpass', frequency: 3200, q: 2 }, 0.5)
    burst(t + 0.012, 0.04, { type: 'lowpass', frequency: 900 }, 0.3)
  },

  /** Desk lamp switch. */
  lamp() {
    const ctx = audio()
    if (!ctx) return
    const t = ctx.currentTime
    burst(t, 0.02, { type: 'highpass', frequency: 2500 }, 0.6)
    tone(t, 0.05, 140, 0.15, 'triangle', 80)
  },

  /** Disk clunks into the drive, then the head seeks. */
  floppy() {
    const ctx = audio()
    if (!ctx) return
    const t = ctx.currentTime
    burst(t, 0.08, { type: 'lowpass', frequency: 600 }, 0.8)
    tone(t, 0.09, 90, 0.3, 'triangle', 50)
    let at = t + 0.25
    for (let i = 0; i < 14; i++) {
      tone(at, 0.025, i % 2 ? 210 : 180, 0.12, 'square')
      at += i % 5 === 4 ? 0.12 : 0.035
    }
    tone(t + 0.25, 1.1, 60, 0.05, 'sawtooth')
  },

  /** Waking the monitor: relay thunk and the faint whine of the flyback. */
  wake() {
    const ctx = audio()
    if (!ctx) return
    const t = ctx.currentTime
    tone(t, 0.25, 70, 0.35, 'sine', 40)
    burst(t, 0.12, { type: 'lowpass', frequency: 400 }, 0.4)
    tone(t + 0.05, 0.7, 7800, 0.012, 'sine')
  },

  /** Soft key press, for paws on the keyboard. */
  tap() {
    const ctx = audio()
    if (!ctx) return
    burst(ctx.currentTime, 0.02, { type: 'bandpass', frequency: 2600, q: 2 }, 0.22)
  },

  /** Four paws landing. */
  thump() {
    const ctx = audio()
    if (!ctx) return
    const t = ctx.currentTime
    tone(t, 0.12, 85, 0.25, 'sine', 50)
    burst(t, 0.06, { type: 'lowpass', frequency: 500 }, 0.2)
  },

  /** "Mrrp?" A rolled, rising chirp. */
  trill() {
    const ctx = audio()
    if (!ctx || !master) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(380, t)
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.25)
    const roll = ctx.createGain()
    roll.gain.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 28
    const depth = ctx.createGain()
    depth.gain.value = 0.5
    lfo.connect(depth).connect(roll.gain)
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, t)
    envelope.gain.exponentialRampToValueAtTime(0.35, t + 0.04)
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
    osc.connect(roll).connect(envelope).connect(master)
    osc.start(t)
    lfo.start(t)
    osc.stop(t + 0.35)
    lfo.stop(t + 0.35)
  },

  /** "Mee-ow." */
  meow() {
    const ctx = audio()
    if (!ctx) return
    voice(
      ctx.currentTime,
      0.7,
      [[0, 520], [0.16, 760], [0.7, 470]],
      [
        [[0, 900], [0.2, 1150], [0.7, 650]],
        [[0, 2000], [0.2, 1500], [0.7, 1050]],
      ],
      0.2,
    )
  },

  /** Too many pets. */
  hiss() {
    const ctx = audio()
    if (!ctx || !noise || !master) return
    const t = ctx.currentTime
    const source = ctx.createBufferSource()
    source.buffer = noise
    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.value = 2600
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, t)
    envelope.gain.exponentialRampToValueAtTime(0.35, t + 0.04)
    envelope.gain.setValueAtTime(0.35, t + 0.35)
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
    source.connect(high).connect(envelope).connect(master)
    source.start(t, Math.random() * 0.2)
    source.stop(t + 0.75)
  },

  /** The "ek-ek-ek" a cat makes at birds it can't reach. */
  chatter() {
    const ctx = audio()
    if (!ctx) return
    const t = ctx.currentTime
    for (let i = 0; i < 7; i++) {
      tone(t + i * 0.09, 0.05, i % 2 ? 1250 : 1100, 0.08, 'triangle', 900)
    }
  },

  /** A mug meeting the floor. */
  crash() {
    const ctx = audio()
    if (!ctx) return
    const t = ctx.currentTime
    burst(t, 0.35, { type: 'highpass', frequency: 1500 }, 0.7)
    burst(t + 0.05, 0.2, { type: 'bandpass', frequency: 3500, q: 3 }, 0.4)
    for (const [hz, length] of [[2350, 0.45], [3170, 0.35], [4400, 0.3], [5900, 0.22]] as const) {
      tone(t, length, hz, 0.06, 'sine')
    }
    tone(t, 0.1, 120, 0.3, 'sine', 60)
  },

  /** Rumbly purr: lowpassed noise pulsing ~24 times a second. */
  purr() {
    const ctx = audio()
    if (!ctx || !noise || !master) return
    const t = ctx.currentTime
    const source = ctx.createBufferSource()
    source.buffer = noise
    source.loop = true
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 260
    const pulse = ctx.createGain()
    pulse.gain.value = 0
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 24
    const depth = ctx.createGain()
    depth.gain.value = 0.5
    lfo.connect(depth).connect(pulse.gain)
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, t)
    envelope.gain.exponentialRampToValueAtTime(1.4, t + 0.2)
    envelope.gain.setValueAtTime(1.4, t + 1.2)
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + 1.8)
    source.connect(low).connect(pulse).connect(envelope).connect(master)
    source.start(t)
    lfo.start(t)
    source.stop(t + 1.9)
    lfo.stop(t + 1.9)
  },
}

export type SoundName = keyof typeof sounds
