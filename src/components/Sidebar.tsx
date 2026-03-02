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
        // Conditional transform for mobile sidebar open/close animation
        className={`
          fixed left-0 top-0 h-full w-72 z-30 flex flex-col
          bg-gradient-to-b from-dark-bg-start to-dark-bg-end
          border-r border-sidebar-border-light
          transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <div className="flex items-center gap-2.5"> {/* Using custom spacing '2.5' for 10px */}
            {/* Logo Icon */}
            <div className="w-7 h-7 bg-gradient-to-br from-brand-purple-primary to-brand-purple-secondary rounded-lg flex items-center justify-center text-sm">
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
            className={`
              w-full py-2.5 px-4
              bg-gradient-to-br from-[#7c6bff26] to-[#b06bff26]
              border border-btn-new-chat-border rounded-xl
              text-btn-new-chat-text text-[13px] font-medium
              cursor-pointer flex items-center gap-2
              transition-all duration-200 font-dm-sans
              hover:from-[#7c6bff40] hover:to-[#b06bff40] hover:border-[#7c6bff80]
              hover:bg-gradient-to-br
            `}
          >
            <span className="text-base">+</span>
            New Conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {conversations.length === 0 && (
            <div className="text-text-placeholder text-xs text-center py-6 px-4">
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
                  group py-[9px] px-3 rounded-10 cursor-pointer
                  flex items-center justify-between gap-2
                  transition-all duration-150
                  ${activeId === conv.id
                    ? 'bg-conv-active-bg border border-conv-active-border'
                    : 'bg-transparent border border-transparent hover:bg-white/10'
                  }
                `}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className={`
                      text-[13px] font-medium whitespace-nowrap overflow-hidden text-ellipsis
                      ${activeId === conv.id ? 'text-conv-active-text' : 'text-conv-inactive-text'}
                    `}
                  >
                    {conv.title}
                  </div>
                  <div className="text-[11px] text-text-placeholder mt-0.5">
                    {conv.messages.length} messages
                  </div>
                </div>
                {/* Delete Button - hidden by default, visible on group hover */}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                  className={`
                    bg-none border-none text-text-placeholder cursor-pointer
                    p-0.5 px-1 rounded text-xs flex-shrink-0
                    opacity-0 transition-opacity duration-150
                    group-hover:opacity-100 hover:text-delete-red
                  `}
                >
                  ✕
                </button>
              </div>
            ))}
        </div>

        {/* Bottom Footer */}
        <div className="p-4 border-t border-[#7864ff14] text-[11px] text-footer-text-dark text-center">
          Powered by Google Gemini
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
