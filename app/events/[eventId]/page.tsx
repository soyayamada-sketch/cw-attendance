"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type SeasonListItem = {
  id: string;
  title: string;
  dates: string[];
  participantCount: number;
};

type SeasonRow = {
  id: string;
  title: string;
  dates: unknown;
  participants:
    | {
        id: string;
      }[]
    | null;
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

    const parsed: unknown = JSON.parse(saved);

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

function forgetSeason(
  eventId: string,
  seasonId: string
) {
  const updatedIds =
    readRecentSeasonIds(eventId).filter(
      (currentId) =>
        currentId !== seasonId
    );

  localStorage.setItem(
    getRecentSeasonsStorageKey(eventId),
    JSON.stringify(updatedIds)
  );
}

export default function EventPage() {
  const params =
    useParams<{ eventId: string }>();

  const router = useRouter();
  const eventId = params.eventId;

  const [seasons, setSeasons] =
    useState<SeasonListItem[]>([]);

  const [eventTitle, setEventTitle] =
    useState("CW 出欠調整");

  const [
    isAddModalOpen,
    setIsAddModalOpen,
  ] = useState(false);

  const [
    newSeasonTitle,
    setNewSeasonTitle,
  ] = useState("");

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadEvent = useCallback(
    async () => {
      const { data, error } =
        await supabase
          .from("events")
          .select("title")
          .eq("id", eventId)
          .single();

      if (error) {
        console.error(
          "イベントの取得に失敗しました",
          error
        );

        setErrorMessage(
          "イベント情報の読み込みに失敗しました"
        );

        return;
      }

      setEventTitle(data.title);
    },
    [eventId]
  );

  const loadRecentSeasons =
    useCallback(async () => {
      const recentSeasonIds =
        readRecentSeasonIds(eventId);

      if (
        recentSeasonIds.length === 0
      ) {
        setSeasons([]);
        return;
      }

      const { data, error } =
        await supabase
          .from("seasons")
          .select(`
            id,
            title,
            dates,
            participants (
              id
            )
          `)
          .eq("event_id", eventId)
          .in("id", recentSeasonIds);

      if (error) {
        console.error(
          "シーズン一覧の取得に失敗しました",
          error
        );

        setErrorMessage(
          "最近開いたシーズンの読み込みに失敗しました"
        );

        return;
      }

      const rows =
        (data ?? []) as SeasonRow[];

      const seasonMap = new Map(
        rows.map((season) => [
          season.id,
          {
            id: season.id,
            title: season.title,
            dates: Array.isArray(
              season.dates
            )
              ? (season.dates as string[])
              : [],
            participantCount:
              season.participants
                ?.length ?? 0,
          } satisfies SeasonListItem,
        ])
      );

      const loadedSeasons =
        recentSeasonIds
          .map((seasonId) =>
            seasonMap.get(seasonId)
          )
          .filter(
            (
              season
            ): season is SeasonListItem =>
              season !== undefined
          );

      setSeasons(loadedSeasons);

      const existingIds =
        loadedSeasons.map(
          (season) => season.id
        );

      localStorage.setItem(
        getRecentSeasonsStorageKey(
          eventId
        ),
        JSON.stringify(existingIds)
      );
    }, [eventId]);

  useEffect(() => {
    async function initializePage() {
      setIsLoaded(false);
      setErrorMessage("");

      await Promise.all([
        loadEvent(),
        loadRecentSeasons(),
      ]);

      setIsLoaded(true);
    }

    void initializePage();
  }, [
    loadEvent,
    loadRecentSeasons,
  ]);

  function openAddModal() {
    setNewSeasonTitle("");
    setErrorMessage("");
    setIsAddModalOpen(true);
  }

  function closeAddModal() {
    if (isSaving) {
      return;
    }

    setNewSeasonTitle("");
    setIsAddModalOpen(false);
  }

  async function addSeason(
    event: FormEvent
  ) {
    event.preventDefault();

    const title =
      newSeasonTitle.trim();

    if (!title || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const { data, error } =
      await supabase
        .from("seasons")
        .insert({
          event_id: eventId,
          title,
          dates: [],
        })
        .select("id")
        .single();

    if (error) {
      console.error(
        "シーズンの追加に失敗しました",
        error
      );

      setErrorMessage(
        "シーズンを追加できませんでした"
      );

      setIsSaving(false);
      return;
    }

    rememberSeason(
      eventId,
      data.id
    );

    setIsAddModalOpen(false);
    setNewSeasonTitle("");
    setIsSaving(false);

    router.push(
      `/events/${eventId}/seasons/${data.id}`
    );
  }

  function removeFromHistory(
    seasonId: string
  ) {
    const season = seasons.find(
      (item) =>
        item.id === seasonId
    );

    if (!season) {
      return;
    }

    const confirmed =
      window.confirm(
        `「${season.title}」をこの端末の一覧から外しますか？\n\nシーズンのデータ自体は削除されません。共有URLから再度開くと一覧に戻ります。`
      );

    if (!confirmed) {
      return;
    }

    forgetSeason(
      eventId,
      seasonId
    );

    setSeasons(
      (currentSeasons) =>
        currentSeasons.filter(
          (item) =>
            item.id !== seasonId
        )
    );
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-500">
            読み込み中...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="mb-1 text-sm text-gray-500">
            イベントID: {eventId}
          </p>

          <h1 className="text-2xl font-bold">
            {eventTitle}
          </h1>
        </header>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="rounded-xl bg-white p-4 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                最近開いたシーズン
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                この端末で開いたシーズンだけ表示されます
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
            >
              ＋ シーズンを追加
            </button>
          </div>

          {seasons.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="font-bold text-gray-600">
                最近開いたシーズンはありません
              </p>

              <p className="mt-2 text-sm text-gray-500">
                共有されたシーズンURLを開くと、ここに表示されます
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {seasons.map(
                (season) => (
                  <Link
                    key={season.id}
                    href={`/events/${eventId}/seasons/${season.id}`}
                    className="block rounded-lg border p-4 transition hover:border-blue-400 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">
                          {season.title}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          日付{" "}
                          {
                            season.dates
                              .length
                          }
                          件・参加者{" "}
                          {
                            season.participantCount
                          }
                          人
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.preventDefault();
                            event.stopPropagation();

                            removeFromHistory(
                              season.id
                            );
                          }}
                          className="rounded-lg px-2 py-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
                          title="この端末の一覧から外す"
                          aria-label={`${season.title}を一覧から外す`}
                        >
                          一覧から外す
                        </button>

                        <span className="text-blue-600">
                          開く →
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={
            closeAddModal
          }
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <form
              onSubmit={addSeason}
            >
              <div className="border-b p-5">
                <h2 className="text-xl font-bold">
                  シーズンを追加
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  新しいシーズンのタイトルを入力してください
                </p>
              </div>

              <div className="p-5">
                <label
                  htmlFor="season-title"
                  className="mb-2 block text-sm font-bold"
                >
                  シーズンタイトル
                </label>

                <input
                  id="season-title"
                  type="text"
                  value={
                    newSeasonTitle
                  }
                  onChange={(
                    event
                  ) =>
                    setNewSeasonTitle(
                      event.target
                        .value
                    )
                  }
                  placeholder="例：2026年 夏シーズン"
                  autoFocus
                  disabled={isSaving}
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2 border-t p-4">
                <button
                  type="button"
                  onClick={
                    closeAddModal
                  }
                  disabled={isSaving}
                  className="rounded-lg border px-4 py-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  キャンセル
                </button>

                <button
                  type="submit"
                  disabled={
                    !newSeasonTitle.trim() ||
                    isSaving
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving
                    ? "追加中..."
                    : "追加"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}