"use client";

import {
  useEffect,
  useState,
} from "react";

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
  onSaveComment: (
    participantIndex: number,
    comment: string
  ) => Promise<boolean>;
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
  onSaveComment,
  onClose,
}: EditParticipantModalProps) {
  const [comment, setComment] =
    useState(participant.comment);

  const [isSavingComment, setIsSavingComment] =
    useState(false);

  const [commentMessage, setCommentMessage] =
    useState("");

  useEffect(() => {
    setComment(participant.comment);
    setCommentMessage("");
  }, [participant.comment]);

  async function handleSaveComment() {
    if (isSavingComment) {
      return;
    }

    setIsSavingComment(true);
    setCommentMessage("");

    const success = await onSaveComment(
      participantIndex,
      comment
    );

    if (success) {
      setCommentMessage(
        "コメントを保存しました"
      );
    } else {
      setCommentMessage(
        "コメントを保存できませんでした"
      );
    }

    setIsSavingComment(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {participant.name} さんの回答を編集
        </h2>

        <div className="space-y-5">
          {dates.map(
            (date, dateIndex) => (
              <div
                key={`${date}-${dateIndex}`}
              >
                <div className="mb-2 font-medium">
                  {date}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {choices.map(
                    (choice) => {
                      const selected =
                        participant.answers[
                          dateIndex
                        ] === choice;

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
                    }
                  )}
                </div>
              </div>
            )
          )}
        </div>

        <div className="mt-6 border-t pt-5">
          <label
            htmlFor="participant-comment"
            className="mb-2 block font-medium"
          >
            コメント
          </label>

          <textarea
            id="participant-comment"
            value={comment}
            onChange={(event) =>
              setComment(
                event.target.value
              )
            }
            rows={4}
            placeholder="コメントを入力"
            className="w-full resize-y rounded border border-gray-300 p-3 outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={() => {
              void handleSaveComment();
            }}
            disabled={isSavingComment}
            className="mt-3 w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSavingComment
              ? "保存中..."
              : "コメントを保存"}
          </button>

          {commentMessage && (
            <p className="mt-2 text-center text-sm text-gray-600">
              {commentMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
        >
          完了
        </button>
      </div>
    </div>
  );
}