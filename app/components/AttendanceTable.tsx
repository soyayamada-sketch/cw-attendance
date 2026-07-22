import type { Answer, Participant } from "../types";

type AttendanceTableProps = {
  dates: string[];
  participants: Participant[];
  onEditParticipant: (participantIndex: number) => void;
};

function getChoiceClass(choice: Answer) {
  if (choice === "O") {
    return "bg-green-200";
  }

  if (choice === "X") {
    return "bg-red-200";
  }

  if (choice === "前半希望" || choice === "後半希望") {
    return "bg-yellow-200";
  }

  return "bg-gray-300";
}

function getResultClass(count: number) {
  if (count <= 4) {
    return "bg-red-100";
  }

  if (count <= 6) {
    return "bg-yellow-100";
  }

  return "bg-green-100";
}

export default function AttendanceTable({
  dates,
  participants,
  onEditParticipant,
}: AttendanceTableProps) {
  function countAnswers(
    dateIndex: number,
    targets: Answer[]
  ) {
    return participants.filter((participant) =>
      targets.includes(participant.answers[dateIndex])
    ).length;
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow">
      <table className="min-w-max table-fixed border-collapse">
        <colgroup>
          <col className="w-44" />

          {dates.map((date, dateIndex) => (
            <col
              key={`${date}-${dateIndex}`}
              className="w-20"
            />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th className="sticky left-0 z-30 border bg-gray-200 p-2 text-left shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
              参加者
            </th>

            {dates.map((date, dateIndex) => (
              <th
                key={`${date}-${dateIndex}`}
                className="border bg-gray-200 p-2 text-center"
              >
                {date}
              </th>
            ))}
          </tr>

          <tr>
            <th className="sticky left-0 z-30 border bg-white p-2 text-left shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
              前半 (21:00~22:30)
            </th>

            {dates.map((date, dateIndex) => {
              const count = countAnswers(dateIndex, [
                "O",
                "前半希望",
              ]);

              return (
                <th
                  key={`${date}-first-${dateIndex}`}
                  className={`border p-2 text-center ${getResultClass(
                    count
                  )}`}
                >
                  {count}
                </th>
              );
            })}
          </tr>

          <tr>
            <th className="sticky left-0 z-30 border border-b-4 bg-white p-2 text-left shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
              後半 (22:30~24:30)
            </th>

            {dates.map((date, dateIndex) => {
              const count = countAnswers(dateIndex, [
                "O",
                "後半希望",
              ]);

              return (
                <th
                  key={`${date}-second-${dateIndex}`}
                  className={`border border-b-4 p-2 text-center ${getResultClass(
                    count
                  )}`}
                >
                  {count}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {participants.map(
            (participant, participantIndex) => (
              <tr
                key={`${participant.name}-${participantIndex}`}
              >
                <td className="sticky left-0 z-20 border bg-white p-2 shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                  <button
                    type="button"
                    onClick={() =>
                      onEditParticipant(participantIndex)
                    }
                    className="block max-w-full truncate font-medium text-blue-600 underline"
                  >
                    {participant.name}
                  </button>
                </td>

                {participant.answers.map(
                  (answer, dateIndex) => (
                    <td
                      key={dateIndex}
                      className={`whitespace-nowrap border p-2 text-center text-sm ${getChoiceClass(
                        answer
                      )}`}
                    >
                      {answer}
                    </td>
                  )
                )}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}