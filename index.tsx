/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/Chatbuttons";
import { definePlugin } from "@utils/plugins";
import { definePluginSettings } from "@api/Settings";
import { IconComponent } from "@utils/types";
import { ComponentDispatch, DraftStore, DraftType, SelectedChannelStore, showToast, Toasts } from "webpack/common";

interface MentionMatch {
  fullMatch: string;
  userId: string;
  index: number;
}

// Options between splitting 2000-4000 characters
const settings = definePluginSettings({
  messageLimit: {
    type: OptionType.BOOLEAN,
    default: true,
    description: "Automatically split pings into groups when over the character limit"
  },
  messageLimitLength: {
    type: OptionType.SELECT,
    description: "Switch between 2000-4000 Character word limit for nitro and non-nitro users",
    option: [
      { label: "2000 Characters", value: 2000 },
      { label: "4000 Characters", value: 4000 }
    ],
    default: 2000
  }
});

// Add a visual FilterIcon to next to chatbar
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

function deduplicatePings(text: string): { result: string; removedCount: number } {
  const matches = extractMentions(text);

  if (matches.length === 0) {
    return { return: text, removedCount: 0 };
  }

  const firstMentionIndex = matches[0].index;
  const prefix = text.substring(0, firstMentionIndex).trim();

  const seenUsers = new Map<string, string>();
  const unqiueMentions: string[] = [];

  for (const match of matches) {
    if (!seenUsers.has(match.userId)) {
      seenUsers.set(match.userId, match.fullMatch);
      unqiueMentions.push(match.fullMatch);
    }
  }
  const removedCount = matches.length - unqiueMentions.size;
  const result = prefix + (prefix ? "\n\n" : "" + uniqueMentions.join(" ");

  return { result, removedCount };
}

function splitPingsIntoGroups(text: string): string {
  const matches = extractMentions(text);

  if (matches.length < 2) {
    return text;
  }

  const FirstMentionIndex = matches[0].index;
  const prefix = text.substring(0, FirstMentionIndex).trim();
  const seenUsers = new Map<string, string>();
  const uniqueMentions: string[] = [];

  for (const match of matches) {
    if (!seenUsers.has(match.userId)) {
      seenUsers.set(match.userId, match.fullMatch);
      uniqueMentions.push(match.fullMatch);
    }
  }

  const half = Math.ceil(uniqueMentions.length / 2);
  const firstGroup = uniqueMentions.slice(0, half);
  const secondGroup = uniqueMentions.slice(half);

  let result = "";
  if (prefix) result += prefix + "\n\n";
  result += firstGroup.join(" ");
  if (secondGroup.length > 0) {
    result += "\n\n" + secondGroup.join(" ");
  }
  return result;
}

function setTextInChatBox(channelId: string, text: string) {
  ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
  ComponentDispatch.dispatchToLastSubscribed("SELECT_ALL");
  ComponentDispatch.dispatchToLastSubscribed("DELETE");

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

  // Check if  splitting should be necessary
  const charLimit = settings.store.characterLimit;
  const shouldAutoSplit = settings.store.enableAutoSplit;

  if (shouldAutoSplit && filteredText.length > charLimit) {
    const splitText = splitPingsIntoGroups(filteredText);
    setTextInChatBox(channelId, splitText);
    showToast(
           `Removed ${removedCount} duplicate${removedCount !== 1 ? "s" : ""} & split (${filteredText.length} > ${charLimit} chars)`,
           Toasts.Type.SUCCESS
       );
       return;
  }

  showToast(
          `Removed ${removedCount} duplicate ping${removedCount !== 1 ? "s" : ""}!`,
          Toasts.Type.SUCCESS
      );
}
export default definePlugin({
  name: "FilterDuplicatePings",
  description: "Add a button to the chatbox for removing duplicate pings and splitting pings into groups",
  author: [{ name: "aorer", id: "188165041336483842n" }],

  settings,

  ChatBarButton: {
    icon: PingToolsIcon,
    render: PingToolsButton
  }
});
