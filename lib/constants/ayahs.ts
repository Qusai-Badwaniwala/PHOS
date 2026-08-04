/**
 * Inspirational Ayahs for the Dashboard
 * AD-17: The Dashboard always begins with an inspirational ayah.
 * These are presented for psychological priming before statistics.
 */

export interface InspirationalAyah {
  id: number;
  arabic: string;
  translation: string;
  surah: string;
  reference: string;
}

export const inspirationalAyahs: InspirationalAyah[] = [
  {
    id: 1,
    arabic: "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ",
    translation: "Indeed, it is We who sent down the Qur'an and indeed, We will be its guardian.",
    surah: "Al-Hijr",
    reference: "15:9",
  },
  {
    id: 2,
    arabic: "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ",
    translation:
      "And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?",
    surah: "Al-Qamar",
    reference: "54:17",
  },
  {
    id: 3,
    arabic:
      "الَّذِينَ آتَيْنَاهُمُ الْكِتَابَ يَتْلُونَهُ حَقَّ تِلَاوَتِهِ أُولَٰئِكَ يُؤْمِنُونَ بِهِ",
    translation:
      "Those to whom We have given the Book recite it with its true recital. They [are the ones who] believe in it.",
    surah: "Al-Baqarah",
    reference: "2:121",
  },
  {
    id: 4,
    arabic: "وَاذْكُر رَّبَّكَ فِي نَفْسِكَ تَضَرُّعًا وَخِيفَةً",
    translation: "And remember your Lord within yourself in humility and in fear.",
    surah: "Al-A'raf",
    reference: "7:205",
  },
  {
    id: 5,
    arabic: "قُلْ هُوَ لِلَّذِينَ آمَنُوا هُدًى وَشِفَاءٌ",
    translation: "Say, 'It is, for those who believe, a guidance and a cure.'",
    surah: "Fussilat",
    reference: "41:44",
  },
];
