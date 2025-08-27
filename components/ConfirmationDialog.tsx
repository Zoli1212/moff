import React from 'react';
import { Button } from './ui/button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-gray-600 mt-2 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Mégse</Button>
          <Button variant="destructive" onClick={onConfirm}>Törlés</Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
