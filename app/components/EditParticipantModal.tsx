import type {
  Answer,
  Participant,
} from "../types";

type EditParticipantModalProps = {
  participant: Participant;
  participantIndex: number;
  dates: string[];
  choices: Answer[];
  onChangeAnswer: (
    participantIndex: number,
    dateIndex: number,
    answer: Answer
  ) => void;
  onClose: () => void;
};

function getChoiceClass(
  choice: Answer,
  selected: boolean
) {
  if (!selected) {
    return "bg-white hover:bg-gray-100";
  }

  if (choice === "O") {
    return "bg-green-200 border-green-500";
  }

  if (choice === "X") {
    return "bg-red-200 border-red-500";
  }

  if (
    choice === "前半希望" ||
    choice === "後半希望"
  ) {
    return "bg-yellow-200 border-yellow-500";
  }

  return "bg-gray-300 border-gray-500";
}

export default function EditParticipantModal({
  participant,
  participantIndex,
  dates,
  choices,
  onChangeAnswer,
  onClose,
}: EditParticipantModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {participant.name} さんの回答を編集
        </h2>

        <div className="space-y-5">
          {dates.map((date, dateIndex) => (
            <div key={date}>
              <div className="mb-2 font-medium">
                {date}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {choices.map((choice) => {
                  const selected =
                    participant.answers[dateIndex] ===
                    choice;

                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() =>
                        onChangeAnswer(
                          participantIndex,
                          dateIndex,
                          choice
                        )
                      }
                      className={`rounded border px-3 py-2 ${getChoiceClass(
                        choice,
                        selected
                      )}`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
        >
          完了
        </button>
      </div>
    </div>
  );
}