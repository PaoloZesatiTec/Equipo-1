class SoundManager {
    constructor() {
        this.sounds = {};
        this.currentMusic = null;
        this.musicVolume = 0.4;
        this.effectsVolume = 0.15;
        this.musicEnabled = true;
        this.effectsEnabled = true;
        this.audioContext = null;
        this.userInteracted = false;
        this.pendingMusic = null;
        
        this.loadSounds();
        this.setupUserInteraction();
    }
    
    setupUserInteraction() {
        // Listen for any user interaction to enable audio
        const enableAudio = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('🎵 Audio enabled after user interaction');
                document.removeEventListener('keydown', enableAudio);
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('touchstart', enableAudio);
                
                // Play any pending music
                if (this.pendingMusic) {
                    console.log(`🎵 Playing pending music: ${this.pendingMusic}`);
                    this.playMusic(this.pendingMusic);
                    this.pendingMusic = null;
                }
            }
        };

        document.addEventListener('keydown', enableAudio);
        document.addEventListener('click', enableAudio);
        document.addEventListener('touchstart', enableAudio);
    }
    
    loadSounds() {
        // Sound effects
        this.sounds.jump = this.createAudio('../assets/Music/jump_sound.mp3', this.effectsVolume);
        this.sounds.castFire = this.createAudio('../assets/Music/cast_fire_spell.mp3', this.effectsVolume);
        this.sounds.takingDamage = this.createAudio('../assets/Music/taking_damage.mp3', this.effectsVolume);
        this.sounds.dying = this.createAudio('../assets/Music/dying_music.mp3', this.effectsVolume);
        this.sounds.nextLevel = this.createAudio('../assets/Music/level-win-6416.mp3', this.musicVolume);
        
        // Background music (looping)
        this.sounds.level1Music = this.createAudio('../assets/Music/level_1_music.mp3', this.musicVolume, true);
        this.sounds.level2Music = this.createAudio('../assets/Music/level_2_music.mp3', this.musicVolume, true);
        this.sounds.level3Music = this.createAudio('../assets/Music/level_3_music.mp3', this.musicVolume, true);
        this.sounds.level4Music = this.createAudio('../assets/Music/level_4_music.mp3', this.musicVolume, true);
        this.sounds.shopMusic = this.createAudio('../assets/Music/shop_music.mp3', this.musicVolume, true);
        
        console.log('🎵 Sound Manager initialized with all audio files');
    }
    
    createAudio(src, volume = 0.5, loop = false) {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.loop = loop;
        audio.preload = 'auto';
        
        audio.addEventListener('error', (e) => {
            console.error(`Failed to load audio: ${src}`, e);
        });
        
        return audio;
    }
    
    // Play sound effects
    playSound(soundName) {
        if (!this.effectsEnabled) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0; // Reset to start
            sound.play().catch(e => console.error(`Error playing ${soundName}:`, e));
        } else {
            console.warn(`Sound not found: ${soundName}`);
        }
    }
    
    // Music control methods
    playMusic(musicName) {
        if (!this.musicEnabled) return;
        
        // Check if user has interacted with the page
        if (!this.userInteracted) {
            console.log(`🎵 Waiting for user interaction to play music: ${musicName}`);
            // Store the music to play once user interacts
            this.pendingMusic = musicName;
            return;
        }
        
        // Stop current music
        this.stopCurrentMusic();
        
        const music = this.sounds[musicName];
        if (music) {
            this.currentMusic = music;
            music.currentTime = 0;
            music.play().catch(e => {
                console.error(`Error playing music ${musicName}:`, e);
                // If it still fails, it might be due to autoplay policy
                if (e.name === 'NotAllowedError') {
                    console.log('🎵 Music blocked by browser autoplay policy');
                    this.pendingMusic = musicName;
                }
            });
            console.log(`🎵 Playing music: ${musicName}`);
        } else {
            console.warn(`Music not found: ${musicName}`);
        }
    }
    
    stopCurrentMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }
    
    fadeOutCurrentMusic(duration = 1000) {
        if (!this.currentMusic) return;
        
        const music = this.currentMusic;
        const startVolume = music.volume;
        const startTime = Date.now();
        
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                music.pause();
                music.currentTime = 0;
                music.volume = startVolume; // Reset volume for next play
                clearInterval(fadeInterval);
            } else {
                music.volume = startVolume * (1 - progress);
            }
        }, 50);
    }
    
    // Game-specific music methods
    playLevelMusic(levelNumber) {
        const musicMap = {
            1: 'level1Music',
            2: 'level2Music', 
            3: 'level3Music',
            4: 'level4Music'
        };
        
        const musicName = musicMap[levelNumber];
        if (musicName) {
            this.playMusic(musicName);
        }
    }
    
    playNextLevelTransition() {
        this.stopCurrentMusic();
        this.playSound('nextLevel');
    }
    
    playShopMusic() {
        this.playMusic('shopMusic');
    }
    
    playDeathSequence() {
        this.stopCurrentMusic();
        this.playSound('dying');
    }
    
    // Volume controls
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        Object.keys(this.sounds).forEach(key => {
            if (key.includes('Music') || key === 'nextLevel') {
                this.sounds[key].volume = this.musicVolume;
            }
        });
    }
    
    setEffectsVolume(volume) {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
        ['jump', 'castFire', 'takingDamage', 'dying'].forEach(key => {
            if (this.sounds[key]) {
                this.sounds[key].volume = this.effectsVolume;
            }
        });
    }
    
    // Toggle methods
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopCurrentMusic();
        }
        return this.musicEnabled;
    }
    
    toggleEffects() {
        this.effectsEnabled = !this.effectsEnabled;
        return this.effectsEnabled;
    }
}

// Create global sound manager instance
window.soundManager = new SoundManager(); 