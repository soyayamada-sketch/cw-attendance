"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@supabase/supabase-js";

type DeleteSeasonButtonProps = {
  seasonId: string;
  seasonTitle: string;
  token: string;
};

export default function DeleteSeasonButton({
  seasonId,
  seasonTitle,
  token,
}: DeleteSeasonButtonProps) {
  const router = useRouter();

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    const confirmed =
      window.confirm(
        `「${seasonTitle}」を削除しますか？\n\n参加者と回答データもすべて削除されます。`
      );

    if (!confirmed) {
      return;
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      window.alert(
        "Supabaseの設定を読み込めませんでした"
      );
      return;
    }

    setIsDeleting(true);

    const supabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey
      );

    const { error } =
      await supabase
        .from("seasons")
        .delete()
        .eq("id", seasonId);

    if (error) {
      console.error(
        "シーズンの削除に失敗しました",
        error
      );

      window.alert(
        "シーズンを削除できませんでした"
      );

      setIsDeleting(false);
      return;
    }

    router.replace(
      `/manage/${token}`
    );

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleDelete();
      }}
      disabled={isDeleting}
      className="rounded-lg border border-red-300 bg-white px-4 py-2 font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDeleting
        ? "削除中..."
        : "削除"}
    </button>
  );
}