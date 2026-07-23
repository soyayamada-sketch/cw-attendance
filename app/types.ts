export type Answer =
  | "O"
  | "X"
  | "前半希望"
  | "後半希望"
  | "未定";

export type Participant = {
  name: string;
  answers: Answer[];
  comment: string;
};

export type Season = {
  id: string;
  title: string;
  dates: string[];
  participants: Participant[];
};

export type EventData = {
  id: string;
  title: string;
  seasonIds: string[];
};