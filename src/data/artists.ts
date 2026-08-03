export interface Artist {
  id: string;
  name: string;
  genre: string;
  image: string;
  bio: string;
  audio?: string;
  videoBg?: string;
  youtubeClip?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
}

export const ARTISTS_DATA: Artist[] = [
  {
    id: '1',
    name: 'NSK',
    genre: 'NEW WAVE / TRAP',
    image: '/pdp-nsk.jpg',
    bio: 'Artiste du label VØID PULSE, NSK découpe chaque prod avec une précision chirurgicale. Son énergie brute et ses flows acérés redéfinissent les codes de la scène actuelle.',
    audio: '/nsk.mp3',
    videoBg: '/nsk-protoclip.mp4',
  },
  {
    id: '2',
    name: 'MUELSA',
    genre: 'SEXYDRILL / TRAP',
    image: '/pdp-muelsa.jpg',
    bio: "BEATMAKER du label VØID PULSE, MUELSA, artiste masqué avec sac sur le dos. Il débute la drill en 2021 et aujourd'hui, il évolue dans la sexydrill.",
    audio: '/muelsa.mp3',
    videoBg: '/video_muelsa.mov',
    youtubeClip: 'https://youtu.be/embed/2DBNRN-Zre4',
    youtubeUrl: 'https://www.youtube.com/@MuelsaOfficiel',
    instagramUrl: 'https://www.instagram.com/muelsaofficiel?igsh=bW1yZjl0YWRmc2N6',
    tiktokUrl: 'https://www.tiktok.com/@muelsaofficiel?lang=fr',
  },
  {
    id: '3',
    name: 'LDN',
    genre: 'DRILL / TRAP',
    image: '/pdp-ldn.jpg',
    bio: "Artiste du label VØID PULSE, LDN s'impose comme la nouvelle référence du kickage français. Une technique incisive mise au service d'une atmosphère brute et sans compromis.",
    audio: '/ldn.mp3',
    videoBg: '/video_ldn.mp4',
    youtubeClip: 'https://www.youtube.com/embed/OxZIKHKAnIU',
    youtubeUrl: 'https://www.youtube.com/@Ldn2.7',
    instagramUrl: 'https://www.instagram.com/ldn77100/',
    tiktokUrl: 'https://www.tiktok.com/@ldn2.7?lang=fr',
  },
  {
    id: '4',
    name: 'KAYES',
    genre: 'DIGICORE / EXPERIMENTAL',
    image: '/pdp-kayes.jpg',
    bio: 'Artiste du label VØID PULSE, KAYES fusionne les textures de la musique POP, HIP HOP et RNB avec la puissance de la trap moderne pour créer une ambiance qui touche le cœur. Une vision étendue, émotionnelle et sans concession.',
    audio: '/ALONE.mp3',
    videoBg: '/loop.mp4',
    youtubeUrl: 'https://www.youtube.com/@mizzi.k',
    instagramUrl: 'https://www.instagram.com/kayes1.8/',
  },
  {
    id: '5',
    name: 'GNK',
    genre: 'UNDERGROUND TRAP',
    image: '/pdp-gnk.jpg',
    bio: 'Artiste du label VØID PULSE, GNK impose un style hybride et percutant. Entre flows techniques et ambiances sombres, il découpe chaque production avec une efficacité redoutable.',
    audio: '/gnk.mp3',
    videoBg: '/gnk-protoclip.mp4',
  },
  {
    id: '6',
    name: 'DYSKO',
    genre: 'LBL / HEAVY BASS',
    image: '/pdp-dysko.jpg',
    bio: 'Artiste incontournable du label VØID PULSE, LBL livre une performance brute à chaque apparition. Sa maîtrise du flow et son énergie incisive transforment chaque morceau en une démonstration de puissance.',
    audio: '/lbl.mp3',
    videoBg: '/lbl-protoclip.mp4',
  },
  {
    id: '7',
    name: '88',
    genre: 'NIGHT BEATS / DRILL',
    image: '/pdp-88.jpg',
    bio: "ARTISTE du label VØID PULSE, 88, artiste qui rppose un style de musique polyvalent. Il peut composer avec n'importe quelle instrumentale et apporte une touches de rimes spécifiques à son art.",
    audio: '/88.mp3',
    videoBg: '/video_muelsa.mov',
  },
];