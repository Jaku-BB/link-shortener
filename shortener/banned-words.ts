export const BANNED_WORDS = [
  'spam',
  'scam',
  'phishing',
  'malware',
  'virus',
  'hack',
  'illegal',
  'drugs',
  'weapons',
  'violence',
  'hate',
  'terrorism',
  'fraud',
  'fake',
  'adult',
  'porn',
  'xxx',
  'gambling',
  'casino',
  'bet',
  'piracy',
  'torrent',
  'warez',
  'crack',
  'keygen'
];

export interface BannedWordDetection {
  url: string;
  bannedWord: string;
  timestamp: Date;
}

export function checkForBannedWords(url: string): BannedWordDetection | null {
  const urlLower = url.toLowerCase();
  
  for (const word of BANNED_WORDS) {
    if (urlLower.includes(word)) {
      return {
        url,
        bannedWord: word,
        timestamp: new Date()
      };
    }
  }
  
  return null;
} 