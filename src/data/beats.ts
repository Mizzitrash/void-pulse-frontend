export type BeatStatus = 'available' | 'coming_soon' | 'sold';

export interface Beat {
  id: string;
  title: string;
  producer: string;
  bpm: number;
  key: string;
  tags: string[];
  audioUrl: string;
  coverUrl: string;
  price?: string;
  status: BeatStatus; // NOUVEAU STATUT FLEXIBLE
}

export const BEATS_DATA: Beat[] = [
  {
    id: 'b1',
    title: 'HØLLØW',
    producer: 'VØID PULSE ft. KNZ & Noadecowcow',
    bpm: 140,
    key: 'C Minor',
    tags: ['DARK TRAP', 'HEAVY 808', 'INDUSTRIAL'],
    audioUrl: '/hollow-vb.mp3',
    coverUrl: '/cover1.jpg',
    price: '19.99 €',
    status: 'available',
  },
  {
    id: 'b2',
    title: 'MØRE.',
    producer: 'VØID PULSE ft. KNZ & Noadecowcow',
    bpm: 144,
    key: 'F# Minor',
    tags: ['DRILL', 'ATMOSPHERIC', 'SYNTH'],
    audioUrl: '/more-vb.mp3',
    coverUrl: '/cover2.jpg',
    price: '34.99 €',
    status: 'coming_soon', // SORT BIENTÔT
  },
  {
    id: 'b3',
    title: 'THRØNE..',
    producer: 'Kayes',
    bpm: 130,
    key: 'G Minor',
    tags: ['LBL', 'PLUGG', 'DARK'],
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    coverUrl: '/cover3.jpg',
    price: '29.99 €',
    status: 'coming_soon', // VENDU / INDISPONIBLE
  },
];