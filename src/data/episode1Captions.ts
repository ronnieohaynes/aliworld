// ALIWORLD Episode 1 cutscene captions
// Timestamps are seconds relative to clip start (0 = video startSeconds).
// Compare against (youtubePlayer.getCurrentTime() - startSeconds).

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export const EPISODE_1_CAPTIONS: Caption[] = [
  { start: 1.55, end: 3.53, text: "Dog, you gotta check out this group I'm in, all right?" },
  { start: 3.53, end: 5.89, text: "It's like, it's like rejuvenation for your soul." },
  { start: 5.899, end: 7.72, text: "Like, it's not just some nonsense." },
  { start: 8.25, end: 10.28, text: "Dude, goat yoga?" },
  { start: 10.729, end: 11.08, text: "All right." },
  { start: 11.66, end: 13.08, text: "We like to have fun, you know?" },
  { start: 13.1, end: 15.419, text: "Like, we also got like exclusive soup recipes and-" },
  { start: 21.294, end: 24.714, text: "So, you pay to be in the cult? All right, well it's, it's not like that." },
  { start: 24.724, end: 27.804, text: "They, they don't call it… It, it's a community." },
  { start: 27.904, end: 29.374, text: "It's a philosophy" },
  { start: 42.44, end: 42.57, text: "Right?" },
  { start: 42.57, end: 46.46, text: "Like the dude who runs it, Midnight, I like the way he put it." },
  { start: 47.06, end: 49.44, text: "We're just the part of the world that stopped pretending" },
];
