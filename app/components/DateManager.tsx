"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  CSS,
} from "@dnd-kit/utilities";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ja } from "date-fns/locale";

type DateManagerProps = {
  dates: string[];
  onAddDates: (
    dates: string[]
  ) => void;
  onDeleteDate: (
    dateIndex: number
  ) => void;
  onMoveDate: (
    fromIndex: number,
    toIndex: number
  ) => Promise<boolean>;
  onClose: () => void;
};

type SortableDateItemProps = {
  id: string;
  date: string;
  dateIndex: number;
  disabled: boolean;
  onDeleteDate: (
    dateIndex: number
  ) => void;
};

function calendarDateToMonthDay(
  value: string
) {
  const parts = value.split("-");

  if (parts.length !== 3) {
    return "";
  }

  return `${Number(
    parts[1]
  )}/${Number(parts[2])}`;
}

function normalizeManualDate(
  value: string
) {
  const normalized =
    value
      .trim()
      .replace(/[／.-]/g, "/");

  const match =
    normalized.match(
      /^(\d{1,2})\/(\d{1,2})(?:\s+(.+))?$/
    );

  if (!match) {
    return null;
  }

  const month =
    Number(match[1]);
  const day =
    Number(match[2]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const suffix =
    match[3]?.trim();

  return suffix
    ? `${month}/${day} ${suffix}`
    : `${month}/${day}`;
}

function splitManualDates(
  value: string
) {
  return value
    .split(/[,、\n]+/)
    .map(normalizeManualDate)
    .filter(
      (
        date
      ): date is string =>
        date !== null
    );
}

function formatDate(
  date: string
) {
  const isoMatch =
    date.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (isoMatch) {
    return `${Number(
      isoMatch[2]
    )}/${Number(
      isoMatch[3]
    )}`;
  }

  const monthDay =
    normalizeManualDate(date);

  return monthDay ?? date;
}

function SortableDateItem({
  id,
  date,
  dateIndex,
  disabled,
  onDeleteDate,  
}: SortableDateItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform:
      CSS.Transform.toString(
        transform
      ),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border bg-gray-50 p-3 ${
        isDragging
          ? "z-10 opacity-60 shadow-lg"
          : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="cursor-grab touch-none rounded-lg border bg-white px-3 py-2 text-lg font-bold leading-none text-gray-500 hover:bg-gray-100 active:cursor-grabbing"
        title="ドラッグして並び替え"
        aria-label={`${formatDate(
          date
        )}を並び替え`}
      >
        ☰
      </button>

      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {formatDate(date)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          const confirmed =
            window.confirm(
              `「${formatDate(
                date
              )}」を削除しますか？`
            );

          if (confirmed) {
            onDeleteDate(
              dateIndex
            );
          }
        }}
        className="shrink-0 rounded-lg px-3 py-2 text-red-600 hover:bg-red-100"
      >
        削除
      </button>
    </div>
  );
}

export default function DateManager({
  dates,
  onAddDates,
  onDeleteDate,
  onMoveDate,
  onClose,
}: DateManagerProps) {
  const [
    manualInput,
    setManualInput,
  ] = useState("");

  const [calendarInput, setCalendarInput] =
  useState<Date | null>(null);

  const [
    selectedDates,
    setSelectedDates,
  ] = useState<string[]>([]);

  const [
    inputError,
    setInputError,
  ] = useState("");

  const [
    displayedDates,
    setDisplayedDates,
  ] = useState(dates);

  const [
    isReordering,
    setIsReordering,
  ] = useState(false);

  useEffect(() => {
    if (!isReordering) {
      setDisplayedDates(dates);
    }
  }, [dates, isReordering]);

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      {
        activationConstraint: {
          distance: 5,
        },
      }
    ),
    useSensor(
      KeyboardSensor,
      {
        coordinateGetter:
          sortableKeyboardCoordinates,
      }
    )
  );

  const existingDateSet =
    useMemo(
      () => new Set(dates),
      [dates]
    );

  const sortableIds =
    displayedDates.map(
      (date) => date
    );

  function addToSelection(
    newDates: string[]
  ) {
    const uniqueDates = [
      ...selectedDates,
    ];

    for (const date of newDates) {
      if (
        !uniqueDates.includes(date) &&
        !existingDateSet.has(date)
      ) {
        uniqueDates.push(date);
      }
    }

    setSelectedDates(
      uniqueDates
    );
  }

  function handleManualSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    const parsedDates =
      splitManualDates(
        manualInput
      );

    if (
      parsedDates.length === 0
    ) {
      setInputError(
        "M/D形式で入力してください。例：7/3、7/10 NA"
      );
      return;
    }

    addToSelection(
      parsedDates
    );

    setManualInput("");
    setInputError("");
  }

function handleCalendarSelect(
  date: Date | null
) {
  setCalendarInput(date);

  if (!date) {
    return;
  }

  const monthDay = `${
    date.getMonth() + 1
  }/${date.getDate()}`;

  addToSelection([monthDay]);

  setInputError("");
  setCalendarInput(null);
}

  function handleAddSelectedDates() {
    if (
      selectedDates.length === 0
    ) {
      return;
    }

    onAddDates(selectedDates);
    setSelectedDates([]);
  }

  async function handleDragEnd(
    event: DragEndEvent
  ) {
    if (isReordering) {
      return;
    }

    const {
      active,
      over,
    } = event;

    if (
      !over ||
      active.id === over.id
    ) {
      return;
    }

    const fromIndex =
      displayedDates.indexOf(
        String(active.id)
      );

    const toIndex =
      displayedDates.indexOf(
        String(over.id)
      );

    if (
      fromIndex === -1 ||
      toIndex === -1
    ) {
      return;
    }

    const previousDates = [
      ...displayedDates,
    ];

    const nextDates =
      arrayMove(
        displayedDates,
        fromIndex,
        toIndex
      );

    setDisplayedDates(
      nextDates
    );
    setIsReordering(true);

    const saved =
      await onMoveDate(
        fromIndex,
        toIndex
      );

    if (!saved) {
      setDisplayedDates(
        previousDates
      );
    }

    setIsReordering(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="border-b p-5">
          <h2 className="text-xl font-bold">
            日付の管理
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            手入力・カレンダー・ドラッグ操作に対応しています
          </p>
        </div>

        <div className="overflow-y-auto p-5">
          <section className="rounded-xl border bg-gray-50 p-4">
            <h3 className="font-bold">
              日付を追加
            </h3>

            <form
              onSubmit={
                handleManualSubmit
              }
              className="mt-3"
            >
              <label className="text-sm font-medium">
                手入力
              </label>

              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={
                    manualInput
                  }
                  onChange={(
                    event
                  ) =>
                    setManualInput(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="例：7/3、7/10 NA"
                  className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />

                <button
                  type="submit"
                  className="rounded-lg border bg-white px-4 py-2 font-bold hover:bg-gray-100"
                >
                  候補に追加
                </button>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                複数日はカンマ・読点・改行で区切れます
              </p>
            </form>

            <div className="mt-4">
              <label className="text-sm font-medium">
                カレンダーから選択
              </label>

<DatePicker
  selected={calendarInput}
  onChange={handleCalendarSelect}
  locale={ja}
  dateFormat="M/d"
  shouldCloseOnSelect={false}
  className="mt-1 w-full rounded-lg border bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
/>

              <p className="mt-1 text-xs text-gray-500">
                日付を選ぶたびに候補へ追加されます
              </p>
            </div>

            {inputError && (
              <p className="mt-3 text-sm text-red-600">
                {inputError}
              </p>
            )}

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">
                  追加候補
                </p>

                {selectedDates.length >
                  0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDates(
                        []
                      )
                    }
                    className="text-sm text-gray-500 hover:underline"
                  >
                    すべて解除
                  </button>
                )}
              </div>

              {selectedDates.length ===
              0 ? (
                <div className="mt-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                  日付を選択してください
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDates.map(
                    (date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() =>
                          setSelectedDates(
                            (
                              current
                            ) =>
                              current.filter(
                                (
                                  currentDate
                                ) =>
                                  currentDate !==
                                  date
                              )
                          )
                        }
                        className="rounded-full border bg-white px-3 py-1.5 text-sm font-bold hover:bg-red-50 hover:text-red-600"
                        title="クリックで候補から削除"
                      >
                        {date} ×
                      </button>
                    )
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={
                  selectedDates.length ===
                  0
                }
                onClick={
                  handleAddSelectedDates
                }
                className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                選択した
                {selectedDates.length}
                件をまとめて追加
              </button>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="font-bold">
              登録済みの日付
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {isReordering
                ? "並び順を保存しています..."
                : "左の「☰」をドラッグして並び替えます"}
            </p>

            {displayedDates.length ===
            0 ? (
              <div className="mt-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">
                日付がまだありません
              </div>
            ) : (
              <DndContext
  sensors={sensors}
  collisionDetection={
    closestCenter
  }
  onDragEnd={
    handleDragEnd
  }
>
                <SortableContext
                  items={
                    sortableIds
                  }
                  strategy={
                    verticalListSortingStrategy
                  }
                >
                  <div className="mt-2 space-y-2">
                    {displayedDates.map(
                      (
                        date,
                        dateIndex
                      ) => (
                        <SortableDateItem
  key={date}
  id={date}
  date={date}
  dateIndex={
    dateIndex
  }
  disabled={
    isReordering
  }
  onDeleteDate={
    onDeleteDate
  }
/>
                      )
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-5 py-2 font-bold text-white hover:bg-gray-800"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
}