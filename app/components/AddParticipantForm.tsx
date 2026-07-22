type AddParticipantFormProps = {
  newName: string;
  onNameChange: (name: string) => void;
  onAdd: () => void;
};

export default function AddParticipantForm({
  newName,
  onNameChange,
  onAdd,
}: AddParticipantFormProps) {
  return (
    <div className="mt-6 w-full rounded-lg bg-white p-4 shadow md:w-1/2">
      <h2 className="mb-3 font-bold">参加者を追加</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(event) =>
            onNameChange(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onAdd();
            }
          }}
          placeholder="名前を入力"
          className="min-w-0 flex-1 rounded border px-3 py-2"
        />

        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          追加
        </button>
      </div>
    </div>
  );
}