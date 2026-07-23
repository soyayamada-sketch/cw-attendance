"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import AddParticipantForm from "../../../../components/AddParticipantForm";
import AttendanceTable from "../../../../components/AttendanceTable";
import DateManager from "../../../../components/DateManager";
import EditParticipantModal from "../../../../components/EditParticipantModal";

import { choices } from "../../../../constants";
import { supabase } from "@/lib/supabase";

import type {
  Answer,
  Participant,
} from "../../../../types";

type ParticipantWithId =
  Participant & {
    id: string;
  };

type SeasonState = {
  id: string;
  title: string;
  dates: string[];
  participants: ParticipantWithId[];
};

type SeasonRow = {
  id: string;
  title: string;
  dates: unknown;
};

type ParticipantRow = {
  id: string;
  name: string;
  attendance: unknown;
};

function getRecentSeasonsStorageKey(
  eventId: string
) {
  return `attendance:event:${eventId}:recent-seasons`;
}

function readRecentSeasonIds(
  eventId: string
): string[] {
  try {
    const saved = localStorage.getItem(
      getRecentSeasonsStorageKey(eventId)
    );

    if (!saved) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (value): value is string =>
        typeof value === "string"
    );
  } catch {
    console.error(
      "最近開いたシーズンの読み込みに失敗しました"
    );

    return [];
  }
}

function rememberSeason(
  eventId: string,
  seasonId: string
) {
  const currentIds =
    readRecentSeasonIds(eventId);

  const updatedIds = [
    seasonId,
    ...currentIds.filter(
      (currentId) =>
        currentId !== seasonId
    ),
  ].slice(0, 30);

  localStorage.setItem(
    getRecentSeasonsStorageKey(eventId),
    JSON.stringify(updatedIds)
  );
}

export default function SeasonPage() {
  const params =
    useParams<{
      eventId: string;
      seasonId: string;
    }>();

  const eventId = params.eventId;
  const seasonId = params.seasonId;

  const [season, setSeason] =
    useState<SeasonState | null>(
      null
    );

  const [newName, setNewName] =
    useState("");

  const [
    editingIndex,
    setEditingIndex,
  ] = useState<number | null>(
    null
  );

  const [
    isDateManagerOpen,
    setIsDateManagerOpen,
  ] = useState(false);

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const normalizeAnswers =
    useCallback(
      (
        attendance: unknown,
        dateCount: number
      ): Answer[] => {
        const validAnswers: Answer[] =
          [
            "O",
            "X",
            "前半希望",
            "後半希望",
            "未定",
          ];

        const sourceAnswers =
          Array.isArray(attendance)
            ? attendance
            : [];

        return Array.from(
          {
            length: dateCount,
          },
          (_, index) => {
            const answer =
              sourceAnswers[index];

            return validAnswers.includes(
              answer as Answer
            )
              ? (answer as Answer)
              : "未定";
          }
        );
      },
      []
    );

  const loadSeason =
    useCallback(async () => {
      setIsLoaded(false);
      setErrorMessage("");

      const [
        seasonResult,
        participantsResult,
      ] = await Promise.all([
        supabase
          .from("seasons")
          .select(
            "id, title, dates"
          )
          .eq("id", seasonId)
          .eq("event_id", eventId)
          .maybeSingle(),

        supabase
          .from("participants")
          .select(
            "id, name, attendance"
          )
          .eq(
            "season_id",
            seasonId
          )
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (seasonResult.error) {
        console.error(
          "シーズンの取得に失敗しました",
          seasonResult.error
        );

        setErrorMessage(
          "シーズンの読み込みに失敗しました"
        );

        setIsLoaded(true);
        return;
      }

      if (!seasonResult.data) {
        setSeason(null);
        setIsLoaded(true);
        return;
      }

      if (
        participantsResult.error
      ) {
        console.error(
          "参加者の取得に失敗しました",
          participantsResult.error
        );

        setErrorMessage(
          "参加者の読み込みに失敗しました"
        );

        setIsLoaded(true);
        return;
      }

      const seasonRow =
        seasonResult.data as SeasonRow;

      const dates =
        Array.isArray(
          seasonRow.dates
        )
          ? (seasonRow.dates as string[])
          : [];

      const participantRows =
        (participantsResult.data ??
          []) as ParticipantRow[];

      const participants:
        ParticipantWithId[] =
        participantRows.map(
          (participant) => ({
            id: participant.id,
            name: participant.name,
            answers:
              normalizeAnswers(
                participant.attendance,
                dates.length
              ),
          })
        );

      setSeason({
        id: seasonRow.id,
        title: seasonRow.title,
        dates,
        participants,
      });

      rememberSeason(
        eventId,
        seasonId
      );

      setIsLoaded(true);
    }, [
      eventId,
      normalizeAnswers,
      seasonId,
    ]);

  useEffect(() => {
    void loadSeason();
  }, [loadSeason]);

  async function addParticipant() {
    if (!season || isSaving) {
      return;
    }

    const name = newName.trim();

    if (!name) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const answers: Answer[] =
      season.dates.map(
        () => "未定"
      );

    const { data, error } =
      await supabase
        .from("participants")
        .insert({
          season_id: season.id,
          name,
          attendance: answers,
        })
        .select(
          "id, name, attendance"
        )
        .single();

    if (error) {
      console.error(
        "参加者の追加に失敗しました",
        error
      );

      setErrorMessage(
        "参加者を追加できませんでした"
      );

      setIsSaving(false);
      return;
    }

    const participant =
      data as ParticipantRow;

    setSeason({
      ...season,
      participants: [
        ...season.participants,
        {
          id: participant.id,
          name: participant.name,
          answers:
            normalizeAnswers(
              participant.attendance,
              season.dates.length
            ),
        },
      ],
    });

    setNewName("");
    setIsSaving(false);
  }

  async function addDates(
    datesToAdd: string[]
  ) {
    if (
      !season ||
      isSaving ||
      datesToAdd.length === 0
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const normalizedDates =
      datesToAdd
        .map((date) => date.trim())
        .filter(Boolean);

    const uniqueDates =
      normalizedDates.filter(
        (date, index, array) =>
          array.indexOf(date) ===
            index &&
          !season.dates.includes(date)
      );

    if (uniqueDates.length === 0) {
      setErrorMessage(
        "追加できる新しい日付がありません"
      );
      setIsSaving(false);
      return;
    }

    const updatedDates = [
      ...season.dates,
      ...uniqueDates,
    ];

    const updatedParticipants =
      season.participants.map(
        (participant) => ({
          ...participant,
          answers: [
            ...participant.answers,
            ...uniqueDates.map(
              () => "未定" as Answer
            ),
          ],
        })
      );

    const {
      error: seasonError,
    } = await supabase
      .from("seasons")
      .update({
        dates: updatedDates,
      })
      .eq("id", season.id)
      .eq("event_id", eventId);

    if (seasonError) {
      console.error(
        "日付の追加に失敗しました",
        seasonError
      );

      setErrorMessage(
        "日付を追加できませんでした"
      );

      setIsSaving(false);
      return;
    }

    const updateResults =
      await Promise.all(
        updatedParticipants.map(
          (participant) =>
            supabase
              .from("participants")
              .update({
                attendance:
                  participant.answers,
              })
              .eq(
                "id",
                participant.id
              )
              .eq(
                "season_id",
                season.id
              )
        )
      );

    const participantError =
      updateResults.find(
        (result) =>
          result.error
      )?.error;

    if (participantError) {
      console.error(
        "参加者の回答更新に失敗しました",
        participantError
      );

      setErrorMessage(
        "回答データの更新に失敗しました"
      );

      await loadSeason();
      setIsSaving(false);
      return;
    }

    setSeason({
      ...season,
      dates: updatedDates,
      participants:
        updatedParticipants,
    });

    setIsSaving(false);
  }

  async function deleteDate(
    dateIndex: number
  ) {
    if (!season || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const updatedDates =
      season.dates.filter(
        (_, currentIndex) =>
          currentIndex !==
          dateIndex
      );

    const updatedParticipants =
      season.participants.map(
        (participant) => ({
          ...participant,
          answers:
            participant.answers.filter(
              (_, currentIndex) =>
                currentIndex !==
                dateIndex
            ),
        })
      );

    const {
      error: seasonError,
    } = await supabase
      .from("seasons")
      .update({
        dates: updatedDates,
      })
      .eq("id", season.id)
      .eq("event_id", eventId);

    if (seasonError) {
      console.error(
        "日付の削除に失敗しました",
        seasonError
      );

      setErrorMessage(
        "日付を削除できませんでした"
      );

      setIsSaving(false);
      return;
    }

    const updateResults =
      await Promise.all(
        updatedParticipants.map(
          (participant) =>
            supabase
              .from("participants")
              .update({
                attendance:
                  participant.answers,
              })
              .eq(
                "id",
                participant.id
              )
              .eq(
                "season_id",
                season.id
              )
        )
      );

    const participantError =
      updateResults.find(
        (result) =>
          result.error
      )?.error;

    if (participantError) {
      console.error(
        "参加者の回答更新に失敗しました",
        participantError
      );

      setErrorMessage(
        "回答データの更新に失敗しました"
      );

      await loadSeason();
      setIsSaving(false);
      return;
    }

    setSeason({
      ...season,
      dates: updatedDates,
      participants:
        updatedParticipants,
    });

    setIsSaving(false);
  }

  async function moveDate(
    fromIndex: number,
    toIndex: number
  ): Promise<boolean> {
    if (!season || isSaving) {
      return false;
    }

    if (
      fromIndex < 0 ||
      fromIndex >=
        season.dates.length ||
      toIndex < 0 ||
      toIndex >=
        season.dates.length ||
      fromIndex === toIndex
    ) {
      return false;
    }

    setIsSaving(true);
    setErrorMessage("");

    function moveItem<T>(
      items: T[]
    ) {
      const updatedItems = [
        ...items,
      ];

      const [movedItem] =
        updatedItems.splice(
          fromIndex,
          1
        );

      updatedItems.splice(
        toIndex,
        0,
        movedItem
      );

      return updatedItems;
    }

    const previousDates = [
      ...season.dates,
    ];

    const previousParticipants =
      season.participants.map(
        (participant) => ({
          ...participant,
          answers: [
            ...participant.answers,
          ],
        })
      );

    const updatedDates =
      moveItem(season.dates);

    const updatedParticipants =
      season.participants.map(
        (participant) => ({
          ...participant,
          answers: moveItem(
            participant.answers
          ),
        })
      );

    try {
      const {
        error: seasonError,
      } = await supabase
        .from("seasons")
        .update({
          dates: updatedDates,
        })
        .eq("id", season.id)
        .eq("event_id", eventId);

      if (seasonError) {
        throw seasonError;
      }

      const updateResults =
        await Promise.all(
          updatedParticipants.map(
            (participant) =>
              supabase
                .from("participants")
                .update({
                  attendance:
                    participant.answers,
                })
                .eq(
                  "id",
                  participant.id
                )
                .eq(
                  "season_id",
                  season.id
                )
          )
        );

      const participantError =
        updateResults.find(
          (result) =>
            result.error
        )?.error;

      if (participantError) {
        await supabase
          .from("seasons")
          .update({
            dates: previousDates,
          })
          .eq("id", season.id)
          .eq(
            "event_id",
            eventId
          );

        await Promise.all(
          previousParticipants.map(
            (participant) =>
              supabase
                .from("participants")
                .update({
                  attendance:
                    participant.answers,
                })
                .eq(
                  "id",
                  participant.id
                )
                .eq(
                  "season_id",
                  season.id
                )
          )
        );

        throw participantError;
      }

      setSeason({
        ...season,
        dates: updatedDates,
        participants:
          updatedParticipants,
      });

      return true;
    } catch (error) {
      console.error(
        "日付の並び替えに失敗しました",
        error
      );

      setErrorMessage(
        "日付を並び替えられませんでした"
      );

      await loadSeason();
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function changeAnswer(
    participantIndex: number,
    dateIndex: number,
    answer: Answer
  ) {
    if (!season) {
      return;
    }

    const participant =
      season.participants[
        participantIndex
      ];

    if (!participant) {
      return;
    }

    const updatedAnswers = [
      ...participant.answers,
    ];

    updatedAnswers[dateIndex] =
      answer;

    const { error } =
      await supabase
        .from("participants")
        .update({
          attendance:
            updatedAnswers,
        })
        .eq("id", participant.id)
        .eq(
          "season_id",
          season.id
        );

    if (error) {
      console.error(
        "回答の更新に失敗しました",
        error
      );

      setErrorMessage(
        "回答を保存できませんでした"
      );

      return;
    }

    const updatedParticipants =
      season.participants.map(
        (
          currentParticipant,
          currentIndex
        ) =>
          currentIndex ===
          participantIndex
            ? {
                ...currentParticipant,
                answers:
                  updatedAnswers,
              }
            : currentParticipant
      );

    setSeason({
      ...season,
      participants:
        updatedParticipants,
    });
  }

  function changeTitle(
    title: string
  ) {
    if (!season) {
      return;
    }

    setSeason({
      ...season,
      title,
    });
  }

  async function saveTitle() {
    if (!season) {
      return;
    }

    const title =
      season.title.trim();

    if (!title) {
      setErrorMessage(
        "シーズン名を入力してください"
      );

      await loadSeason();
      return;
    }

    setErrorMessage("");

    const { error } =
      await supabase
        .from("seasons")
        .update({
          title,
        })
        .eq("id", season.id)
        .eq(
          "event_id",
          eventId
        );

    if (error) {
      console.error(
        "タイトルの更新に失敗しました",
        error
      );

      setErrorMessage(
        "タイトルを保存できませんでした"
      );

      await loadSeason();
      return;
    }

    setSeason({
      ...season,
      title,
    });
  }

  function handleTitleKeyDown(
    event:
      KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key === "Enter"
    ) {
      event.currentTarget.blur();
    }
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-500">
            読み込み中...
          </p>
        </div>
      </main>
    );
  }

  if (!season) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-white p-6 shadow">
            <h1 className="text-xl font-bold">
              シーズンが見つかりません
            </h1>

            {errorMessage && (
              <p className="mt-3 text-red-600">
                {errorMessage}
              </p>
            )}

            <Link
              href={`/events/${eventId}`}
              className="mt-4 inline-block text-blue-600 underline"
            >
              シーズン一覧へ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5">
          <Link
            href={`/events/${eventId}`}
            className="mb-3 inline-block text-sm text-blue-600 hover:underline"
          >
            ← シーズン一覧へ戻る
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={season.title}
              onChange={(event) =>
                changeTitle(
                  event.target.value
                )
              }
              onBlur={() => {
                void saveTitle();
              }}
              onKeyDown={
                handleTitleKeyDown
              }
              className="min-w-0 flex-1 border-b-2 border-transparent bg-transparent text-2xl font-bold outline-none focus:border-blue-500"
              placeholder="シーズン名"
            />

            <button
              type="button"
              onClick={() =>
                setIsDateManagerOpen(
                  true
                )
              }
              className="rounded-lg bg-gray-700 px-4 py-2 font-bold text-white hover:bg-gray-800"
            >
              日付の管理
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
            {errorMessage}
          </div>
        )}

        <AttendanceTable
          dates={season.dates}
          participants={
            season.participants
          }
          onEditParticipant={
            setEditingIndex
          }
        />

        <AddParticipantForm
          newName={newName}
          onNameChange={
            setNewName
          }
          onAdd={() => {
            void addParticipant();
          }}
        />

        {isSaving && (
          <p className="mt-3 text-sm text-gray-500">
            保存中...
          </p>
        )}
      </div>

      {isDateManagerOpen && (
        <DateManager
          dates={season.dates}
          onAddDates={(dates) => {
            void addDates(dates);
          }}
          onDeleteDate={(
            dateIndex
          ) => {
            void deleteDate(
              dateIndex
            );
          }}
          onMoveDate={(
            fromIndex,
            toIndex
          ) =>
            moveDate(
              fromIndex,
              toIndex
            )
          }
          onClose={() =>
            setIsDateManagerOpen(
              false
            )
          }
        />
      )}

      {editingIndex !== null &&
        season.participants[
          editingIndex
        ] && (
          <EditParticipantModal
            participant={
              season.participants[
                editingIndex
              ]
            }
            participantIndex={
              editingIndex
            }
            dates={season.dates}
            choices={choices}
            onChangeAnswer={(
              participantIndex,
              dateIndex,
              answer
            ) => {
              void changeAnswer(
                participantIndex,
                dateIndex,
                answer
              );
            }}
            onClose={() =>
              setEditingIndex(
                null
              )
            }
          />
        )}
    </main>
  );
}