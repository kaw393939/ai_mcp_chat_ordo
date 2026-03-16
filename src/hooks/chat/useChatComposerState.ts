import { useCallback, useMemo, useState } from "react";

interface ChatComposerState {
  canSend: boolean;
  clearComposer: () => void;
  input: string;
  mentionIndex: number;
  pendingFiles: File[];
  setInput: (value: string) => void;
  setMentionIndex: (index: number) => void;
  updateInput: (value: string) => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileRemove: (index: number) => void;
}

export function useChatComposerState(isSending: boolean): ChatComposerState {
  const [input, setInput] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const canSend = useMemo(
    () => (input.trim().length > 0 || pendingFiles.length > 0) && !isSending,
    [input, isSending, pendingFiles.length],
  );

  const clearComposer = useCallback(() => {
    setInput("");
    setMentionIndex(0);
    setPendingFiles([]);
  }, []);

  const updateInput = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFiles = Array.from(event.target.files ?? []);
      if (nextFiles.length === 0) {
        return;
      }

      setPendingFiles((currentFiles) => [...currentFiles, ...nextFiles]);
      event.target.value = "";
    },
    [],
  );

  const handleFileRemove = useCallback((index: number) => {
    setPendingFiles((currentFiles) =>
      currentFiles.filter((_, currentIndex) => currentIndex !== index),
    );
  }, []);

  return {
    canSend,
    clearComposer,
    input,
    mentionIndex,
    pendingFiles,
    setInput,
    setMentionIndex,
    updateInput,
    handleFileSelect,
    handleFileRemove,
  };
}