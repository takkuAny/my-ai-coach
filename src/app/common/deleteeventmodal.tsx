'use client';

import Modal from '@/common/modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: {
    title: string;
    start: string;
  } | null;
  onDelete: () => Promise<void>;
};

export default function DeleteEventModal({ isOpen, onClose, selectedEvent, onDelete }: Props) {
  const handleDelete = async () => {
    await onDelete();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h3 className="font-semibold text-lg mb-2">予定の削除確認</h3>
      <p><strong>タイトル：</strong>{selectedEvent?.title}</p>
      <p><strong>日付：</strong>{selectedEvent?.start}</p>
      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={handleDelete}
          className="px-4 py-1 bg-red-500 text-white rounded"
        >
          削除
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1 bg-gray-300 text-black rounded"
        >
          キャンセル
        </button>
      </div>
    </Modal>
  );
}
