import { haptic } from './haptics';

let successPlayer: any = null;

export async function initSounds() {
  try {
    const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
    successPlayer = createAudioPlayer(require('../../assets/success.wav'));
  } catch (e) {
    console.log('Failed to load sounds (native module might be missing):', e);
  }
}

export async function playSuccessSound() {
  if (successPlayer) {
    try {
      await successPlayer.seekTo(0);
      successPlayer.play();
      return;
    } catch (e) {
      console.log('Failed to play sound', e);
    }
  }
  // Fallback to a nice success vibration if sound isn't available
  haptic.success();
}
