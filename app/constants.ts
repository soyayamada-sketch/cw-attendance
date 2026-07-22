import type { Answer, Participant } from "./types";

export const initialDates = [
  "7/22",
  "7/23",
  "7/25",
  "7/26",
];

export const choices: Answer[] = [
  "O",
  "X",
  "前半希望",
  "後半希望",
  "未定",
];

export const initialParticipants: Participant[] = [
  {
    name: "BOCCHI_THE_WOWS",
    answers: ["O", "O", "O", "O"],
  },
  {
    name: "山田",
    answers: ["前半希望", "O", "X", "未定"],
  },
  {
    name: "佐藤",
    answers: ["後半希望", "X", "O", "前半希望"],
  },
];