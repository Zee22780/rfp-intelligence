import React, { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [value, setValue] = useState("");
  const maxLength = 1500;

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value);
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-8 pt-4 bg-transparent">
      <div className="relative group bg-white rounded-2xl border border-blue-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all focus-within:shadow-[0_8px_40px_rgba(34,197,94,0.08)]">
        {/* Text Area */}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me an RFP question..."
          disabled={disabled}
          className="w-full bg-transparent p-5 pb-14 pr-14 text-gray-800 placeholder-gray-400 resize-none rounded-2xl focus:outline-none min-h-[100px]"
          rows={3}
        />

        {/* Floating Send Button */}
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className={`absolute right-4 top-4 p-2.5 rounded-xl transition-all ${
            value.trim() && !disabled
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          <Send size={18} />
        </button>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-center text-[11px] text-gray-400">
        RFP Intelligence may display inaccurate info, so please double check the
        response.{" "}
      </p>
    </div>
  );
};

export default ChatInput;
