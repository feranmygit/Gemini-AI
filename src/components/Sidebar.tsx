import React from 'react';
import { Conversation } from '../types'; // Assuming types.ts defines Conversation

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full w-72 z-30 flex flex-col
          bg-slate-950
          border-r border-white/10
          transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-2.5"> {/* Using custom spacing '2.5' for 10px */}
            {/* Logo Icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white
            bg-gradient-to-br from-indigo-500 to-purple-600
            shadow-md">
              ✦
            </div>
            {/* Logo Text */}
            <span className="font-dm-serif text-[17px] text-text-header-light"> {/* Using custom font and arbitrary text size */}
              Gemini Studio
            </span>
          </div>
          {/* Close Button for mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg hover:bg-white/5 transition-colors text-text-medium"
          >
            ✕
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-4">
        <button
          onClick={onNew}
          className="
            w-full py-2.5 px-4
            bg-indigo-500/10
            border border-indigo-500/20
            rounded-xl
            text-indigo-300 text-sm font-medium
            flex items-center gap-2
            transition-all duration-200
            hover:bg-indigo-500/20
          "
        >
          <span className="text-base">+</span>
          New Conversation
        </button>
        </div>


{/* Conversations List */}
<div className="flex-1 overflow-y-auto px-3 space-y-1">
  
  {conversations.length === 0 && (
    <div className="text-slate-400 text-xs text-center py-6 px-4">
      No conversations yet
    </div>
  )}

  {conversations
    .slice()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map(conv => (
      <div
        key={conv.id}
        onClick={() => { onSelect(conv.id); onClose(); }}
        className={`
          group cursor-pointer
          px-3 py-2
          rounded-xl
          flex items-center justify-between gap-2
          transition-all duration-200
          border
          ${
            activeId === conv.id
              ? "bg-indigo-500/10 border-indigo-500/30"
              : "bg-transparent border-transparent hover:bg-white/5"
          }
        `}
      >
        <div className="flex-1 min-w-0">
          <div
            className={`
              text-sm font-medium truncate
              ${
                activeId === conv.id
                  ? "text-indigo-300"
                  : "text-slate-300"
              }
            `}
          >
            {conv.title}
          </div>

          <div className="text-xs text-slate-500 mt-0.5">
            {conv.messages.length} messages
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
          className="
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            text-slate-500
            hover:text-red-400
            p-1
            rounded-md
          "
        >
          ✕
        </button>
      </div>
  ))}
</div>

{/* Bottom Footer */}
<div className="p-4 border-t border-white/10 text-[11px] text-slate-500 text-center">
  Powered by Google Gemini
</div>

      </aside>
    </>
  );
};

export default Sidebar;
