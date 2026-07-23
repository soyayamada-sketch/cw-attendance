import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import DeleteSeasonButton from "./DeleteSeasonButton";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

type SeasonRow = {
  id: string;
  event_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  title: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function isOlderThanTwoMonths(
  value: string
) {
  const updatedAt = new Date(value);

  const limit = new Date();
  limit.setMonth(limit.getMonth() - 2);

  return updatedAt < limit;
}

export default async function ManagePage({
  params,
}: Props) {
  const { token } = await params;

  if (
    token !==
    process.env.ADMIN_PAGE_TOKEN
  ) {
    notFound();
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    throw new Error(
      "Supabaseの環境変数が設定されていません"
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
  );

  const [
    seasonsResult,
    eventsResult,
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select(
        "id, event_id, title, created_at, updated_at"
      )
      .order("updated_at", {
        ascending: false,
      }),

    supabase
      .from("events")
      .select("id, title"),
  ]);

  if (seasonsResult.error) {
    console.error(
      "シーズン一覧の取得に失敗しました",
      seasonsResult.error
    );
  }

  if (eventsResult.error) {
    console.error(
      "イベント一覧の取得に失敗しました",
      eventsResult.error
    );
  }

  const seasons =
    (seasonsResult.data ??
      []) as SeasonRow[];

  const events =
    (eventsResult.data ??
      []) as EventRow[];

  const eventTitleMap = new Map(
    events.map((event) => [
      event.id,
      event.title,
    ])
  );

  const oldSeasonCount =
    seasons.filter((season) =>
      isOlderThanTwoMonths(
        season.updated_at
      )
    ).length;

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-3xl font-bold">
            管理ページ
          </h1>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <div className="rounded-lg bg-gray-100 px-4 py-2">
              全シーズン：
              <span className="font-bold">
                {seasons.length}
              </span>
              件
            </div>

            <div className="rounded-lg bg-yellow-100 px-4 py-2 text-yellow-900">
              2か月以上更新なし：
              <span className="font-bold">
                {oldSeasonCount}
              </span>
              件
            </div>
          </div>
        </header>

        {seasonsResult.error ? (
          <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-5 text-red-700">
            シーズン一覧を読み込めませんでした。
          </div>
        ) : seasons.length === 0 ? (
          <div className="mt-5 rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            シーズンがありません。
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {seasons.map((season) => {
              const isOld =
                isOlderThanTwoMonths(
                  season.updated_at
                );

              const eventTitle =
                eventTitleMap.get(
                  season.event_id
                ) ?? season.event_id;

              return (
                <section
                  key={season.id}
                  className={`rounded-xl border bg-white p-5 shadow ${
                    isOld
                      ? "border-yellow-400"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500">
                        {eventTitle}
                      </p>

                      <h2 className="mt-1 break-words text-xl font-bold">
                        {season.title}
                      </h2>

                      <p className="mt-2 text-sm text-gray-600">
                        最終更新：
                        {formatDateTime(
                          season.updated_at
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        作成：
                        {formatDateTime(
                          season.created_at
                        )}
                      </p>

                      {isOld && (
                        <p className="mt-3 inline-block rounded-lg bg-yellow-100 px-3 py-1.5 text-sm font-bold text-yellow-900">
                          2か月以上更新されていません
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/events/${season.event_id}/seasons/${season.id}`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-center font-bold text-white hover:bg-blue-700"
                      >
                        開く
                      </Link>

                      <DeleteSeasonButton
                        seasonId={
                          season.id
                        }
                        seasonTitle={
                          season.title
                        }
                        token={token}
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}