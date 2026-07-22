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

export default function EventPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();

  const eventId = params.eventId;

  const [seasons, setSeasons] = useState<
    SeasonListItem[]
  >([]);
  const [eventTitle, setEventTitle] =
    useState("CW 出欠調整");

  const [isAddModalOpen, setIsAddModalOpen] =
    useState(false);
  const [newSeasonTitle, setNewSeasonTitle] =
    useState("");

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadEvent = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error(
        "イベントの取得に失敗しました",
        error
      );
      return;
    }

    setEventTitle(data.title);
  }, [eventId]);

  const loadSeasons = useCallback(async () => {
    setErrorMessage("");

    const { data, error } = await supabase
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
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "シーズン一覧の取得に失敗しました",
        error
      );

      setErrorMessage(
        "シーズン一覧の読み込みに失敗しました"
      );
      return;
    }

    const rows = (data ?? []) as SeasonRow[];

    const loadedSeasons: SeasonListItem[] =
      rows.map((season) => ({
        id: season.id,
        title: season.title,
        dates: Array.isArray(season.dates)
          ? (season.dates as string[])
          : [],
        participantCount:
          season.participants?.length ?? 0,
      }));

    setSeasons(loadedSeasons);
  }, [eventId]);

  useEffect(() => {
    async function initializePage() {
      setIsLoaded(false);

      await Promise.all([
        loadEvent(),
        loadSeasons(),
      ]);

      setIsLoaded(true);
    }

    void initializePage();
  }, [loadEvent, loadSeasons]);

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

  async function addSeason(event: FormEvent) {
    event.preventDefault();

    const title = newSeasonTitle.trim();

    if (!title || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const { data, error } = await supabase
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

    closeAddModal();
    setIsSaving(false);

    router.push(
      `/events/${eventId}/seasons/${data.id}`
    );
  }

  async function deleteSeason(
    seasonId: string
  ) {
    const season = seasons.find(
      (item) => item.id === seasonId
    );

    if (!season) {
      return;
    }

    const confirmed = window.confirm(
      `「${season.title}」を削除しますか？\n\nこの操作は元に戻せません。`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");

    const { error } = await supabase
      .from("seasons")
      .delete()
      .eq("id", seasonId)
      .eq("event_id", eventId);

    if (error) {
      console.error(
        "シーズンの削除に失敗しました",
        error
      );

      setErrorMessage(
        "シーズンを削除できませんでした"
      );
      return;
    }

    setSeasons((currentSeasons) =>
      currentSeasons.filter(
        (item) => item.id !== seasonId
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
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              シーズン一覧
            </h2>

            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700"
            >
              ＋ シーズンを追加
            </button>
          </div>

          {seasons.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
              まだシーズンがありません
            </div>
          ) : (
            <div className="space-y-3">
              {seasons.map((season) => (
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
                        日付 {season.dates.length}件・
                        参加者{" "}
                        {season.participantCount}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();

                          void deleteSeason(
                            season.id
                          );
                        }}
                        className="rounded-lg px-2 py-1.5 text-red-600 transition hover:bg-red-100"
                        title="削除"
                        aria-label={`${season.title}を削除`}
                      >
                        削除
                      </button>

                      <span className="text-blue-600">
                        開く →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={closeAddModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <form onSubmit={addSeason}>
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
                  value={newSeasonTitle}
                  onChange={(event) =>
                    setNewSeasonTitle(
                      event.target.value
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
                  onClick={closeAddModal}
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