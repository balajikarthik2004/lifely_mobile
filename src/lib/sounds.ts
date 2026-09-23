import { haptic } from './haptics';

let successSound: any = null;

export async function initSounds() {
  try {
    const { Audio } = require('expo-av');
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync(require('../../assets/success.wav'));
    successSound = sound;
  } catch (e) {
    console.log('Failed to load sounds (native module might be missing):', e);
  }
}

export async function playSuccessSound() {
  if (successSound) {
    try {
      await successSound.replayAsync();
    } catch (e) {
      console.log('Failed to play sound', e);
    }
  } else {
    // Fallback to a nice success vibration if sound isn't available
    haptic.success();
  }
}
