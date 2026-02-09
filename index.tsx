/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { ComponentDispatch, DraftStore, DraftType, SelectedChannelStore, showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
  enableAutoSplit: {
    type: OptionType.BOOLEAN,
    default: true,
    description: "Automatically split pings into groups when over the character limit"
  },
  characterLimit: {
    type: OptionType.SELECT,
    description: "Switch between 2000-4000 Character word limit for nitro and non-nitro users",
    options: [
      { label: "Non-Nitro (2000 Characters)", value: 2000 },
      { label: "Nitro (4000 Characters)", value: 4000 }
    ],
    default: 2000
  }
});

const PingToolsIcon: IconComponent = ({ height = 24, width = 24, className }) => (
    <svg
        width={width}
        height={height}
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
    </svg>
);

function extractMentions(text: string): MentionMatch[] {
  const mentionRegex = /<@!?(\d+)>/g;
  const matches: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      userId: match[1],
      index: match.index
    });
  }
  return matches;
}

interface MentionMatch {
  fullMatch: string;
  userId: string;
  index: number;
}

function deduplicatePings(text: string): { result: string; removedCount: number } {
  const matches = extractMentions(text);

  if (matches.length === 0) {
    return { result: text, removedCount: 0 };
  }

  const firstMentionIndex = matches[0].index;
  const prefix = text.substring(0, firstMentionIndex).trim();

  const seenUsers = new Map<string, string>();
  const uniqueMentions: string[] = [];

  for (const match of matches) {
    if (!seenUsers.has(match.userId)) {
      seenUsers.set(match.userId, match.fullMatch);
      uniqueMentions.push(match.fullMatch);
    }
  }

     const removedCount = matches.length - uniqueMentions.length;
     const result = prefix + (prefix ? "\n\n" : "") + uniqueMentions.join(" ");

     return { result, removedCount };
 }

function splitPingsIntoGroups(text: string, limit: number): string {
  const matches = extractMentions(text);

  if (matches.length < 2) {
    return text;
  }

  const firstMentionIndex = matches[0].index;
  const prefix = text.substring(0, firstMentionIndex).trim();
  const seenUsers = new Map<string, string>();
  const uniqueMentions: string[] = [];

  for (const match of matches) {
    if (!seenUsers.has(match.userId)) {
      seenUsers.set(match.userId, match.fullMatch);
      uniqueMentions.push(match.fullMatch);
    }
  }

  const groups: string[][] = [];
  let currentGroup: string[] = [];
  let currentLength = prefix.length + (prefix ? 2 : 0);

  for (const mention of uniqueMentions) {
    const mentionLength = mention.length + 1;

    if (currentLength + mentionLength > limit && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [mention];
      currentLength = mentionLength;
    } else {
      currentGroup.push(mention);
      currentLength += mentionLength;
    }
  }

  if (currentGroup.length) groups.push(currentGroup);

  return groups.map((g, i) =>
    (i === 0 && prefix ? prefix + "\n\n" : "") + g.join(" ")
  ).join("\n\n");
}

function setTextInChatBox(channelId: string, text: string) {
  ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
  ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT");

  setTimeout(() => {
    insertTextIntoChatInputBox(text);
  }, 10);
}

function filterDuplicatePingsInChat() {
  const channelId = SelectedChannelStore.getChannelId();
  const currentDraft = DraftStore.getDraft(channelId, DraftType.ChannelMessage);

  if (!currentDraft || currentDraft.trim().length === 0) {
    showToast("No message to filter!", Toasts.Type.FAILURE);
    return;
  }

  const mentions = extractMentions(currentDraft);
  if (mentions.length === 0) {
    showToast("No user mentions found in message!", Toasts.Type.FAILURE);
    return;
  }

  const { result: filteredText, removedCount } = deduplicatePings(currentDraft);

  if (removedCount === 0) {
    showToast("No duplicate pings found.", Toasts.Type.MESSAGE);
    return;
  }

  const charLimit = settings.store.characterLimit;
  const shouldAutoSplit = settings.store.enableAutoSplit;

  if (shouldAutoSplit && filteredText.length > charLimit) {
    const splitText = splitPingsIntoGroups(filteredText, charLimit);
    setTextInChatBox(channelId, splitText);
    showToast(
      `Removed ${removedCount} duplicate${removedCount !== 1 ? "s" : ""} & split (${filteredText.length} > ${charLimit} chars)`,
      Toasts.Type.SUCCESS
    );
    return;
  }

  // Just deduplicate without splitting
  setTextInChatBox(channelId, filteredText);
  showToast(
    `Removed ${removedCount} duplicate ping${removedCount !== 1 ? "s" : ""}!`,
    Toasts.Type.SUCCESS
  );
}

const PingToolsButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Remove Duplicate Pings"
            onClick={filterDuplicatePingsInChat}
        >
            <PingToolsIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
  name: "FilterDuplicatePings",
  description: "Add a button to the chatbox for removing duplicate pings and splitting pings into groups",
  authors: [{ name: "aorer", id: 188165041336483842n }],

  settings,

  chatBarButton: {
    icon: PingToolsIcon,
    render: PingToolsButton
  }
});
