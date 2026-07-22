"use client";

import { useState } from "react";

type DateManagerProps = {
  dates: string[];
  onAddDate: (date: string) => void;
  onDeleteDate: (dateIndex: number) => void;
  onClose: () => void;
};

export default function DateManager({
  dates,
  onAddDate,
  onDeleteDate,
  onClose,
}: DateManagerProps) {
  const [newDate, setNewDate] = useState("");

  function handleAddDate() {
    const date = newDate.trim();

    if (!date) {
      return;
    }

    onAddDate(date);
    setNewDate("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">

        {/* ウィンドウ上部 */}
        <div className="border-b bg-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold">
            日付の管理
          </h2>
        </div>

        {/* ウィンドウ中央 */}
        <div className="overflow-y-auto p-6">
          <div className="mb-5 flex gap-2">
            <input
              type="text"
              value={newDate}
              onChange={(event) =>
                setNewDate(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAddDate();
                }
              }}
              placeholder="例：7/30"
              className="min-w-0 flex-1 rounded border px-3 py-2"
            />

            <button
              type="button"
              onClick={handleAddDate}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              追加
            </button>
          </div>

          <div className="space-y-2">
            {dates.length === 0 && (
              <div className="rounded border border-dashed p-4 text-center text-gray-500">
                日付が登録されていません
              </div>
            )}

            {dates.map((date, dateIndex) => (
              <div
                key={`${date}-${dateIndex}`}
                className="flex items-center justify-between rounded border bg-gray-50 px-4 py-3"
              >
                <span className="font-medium">
                  {date}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const confirmed =
                      window.confirm(
                        `${date} を削除しますか？`
                      );

                    if (confirmed) {
                      onDeleteDate(dateIndex);
                    }
                  }}
                  className="rounded px-3 py-1 text-sm font-bold text-red-600 hover:bg-red-100"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ウィンドウ下部 */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}