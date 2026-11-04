"""Original synthesized vocalise and action sounds. No external recordings.
Run python3 scripts/choir-audio.py. Requires ffmpeg on PATH.
"""
from array import array
from pathlib import Path
import math
import wave
import subprocess

RATE = 22050
OUT = Path(__file__).resolve().parent.parent / 'public' / 'audio'

def write(name, samples):
    with wave.open(str(OUT / name), 'wb') as wav:
        wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        wav.writeframes(array('h', (int(max(-.98, min(.98, value)) * 32767) for value in samples)).tobytes())

def vocalise():
    samples = [0.0] * (66 * RATE)
    chords = [(50,57,62,65), (46,53,58,62), (48,55,60,64), (45,52,57,61),
              (50,57,62,65), (43,50,58,62), (45,52,57,64), (50,57,62,65)]
    for chord_index in range(16):
        chord = chords[chord_index % len(chords)]
        start = 3 + chord_index * 3.75
        for part, note in enumerate(chord):
            frequency = 440 * 2 ** ((note - 69) / 12)
            onset = int((start + part * .04) * RATE)
            harmonics = []
            for harmonic in range(1, 15):
                hz = frequency * harmonic
                weight = (.36 * math.exp(-((hz-720)/230)**2)
                          + .22 * math.exp(-((hz-1150)/300)**2)
                          + .12 * math.exp(-((hz-2450)/500)**2)
                          + .24 / harmonic) / harmonic**.35
                harmonics.append((harmonic, weight))
            for offset in range(min(int(4.7 * RATE), len(samples)-onset)):
                t = offset / RATE
                envelope = min(1, t/.48) * max(0, min(1, (4.6-t)/1.05))
                phase = math.tau * frequency * t + .017 * math.sin(t*math.tau*4.8+part)
                value = sum(weight * math.sin(phase*harmonic) for harmonic, weight in harmonics)
                samples[onset+offset] += value * envelope * .067
    dry = samples.copy()
    for delay, amount in [(.083,.16),(.171,.13),(.293,.1),(.421,.07)]:
        distance = int(delay*RATE)
        for index in range(distance,len(samples)):
            samples[index] += dry[index-distance]*amount
    for index in range(len(samples)):
        samples[index] *= min(1, (len(samples)-index)/(RATE*2))
    write('choir.wav', samples)

def effect(name, frequency, length):
    samples=[]
    for index in range(int(length*RATE)):
        t=index/RATE
        envelope=math.exp(-t*7)*min(1,t/.015)
        samples.append((math.sin(math.tau*frequency*t)+.18*math.sin(math.tau*frequency*2.01*t))*envelope*.16)
    write(name+'.wav',samples)

if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    vocalise()
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(OUT/'choir.wav'),'-codec:a','libmp3lame','-q:a','4',str(OUT/'choir.mp3')],check=True)
    (OUT/'choir.wav').unlink()
    for name,frequency,length in [('candle',1050,.5),('sit',180,.3),('door',330,.5),('release',660,1.1)]:
        effect(name,frequency,length)
