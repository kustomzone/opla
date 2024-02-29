// Copyright 2023 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use client';

import { useState, useRef } from 'react';
import {
  Check,
  Clipboard,
  Bot,
  MoreHorizontal,
  User,
  Pencil,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  File,
} from 'lucide-react';
import { getMessageContentHistoryAsString } from '@/utils/data/messages';
import useHover from '@/hooks/useHover';
import useMarkdownProcessor from '@/hooks/useMarkdownProcessor';
import { Message, MessageStatus } from '@/types';
import useTranslation from '@/hooks/useTranslation';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import OpenAI from '../../icons/OpenAI';

function ClipboardButton({
  onCopyToClipboard,
  copied,
}: {
  onCopyToClipboard: () => void;
  copied: boolean;
}) {
  return (
    <Button disabled={copied} variant="ghost" size="sm" onClick={onCopyToClipboard}>
      {copied ? (
        <Check className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <Clipboard className="h-4 w-4" strokeWidth={1.5} />
      )}
    </Button>
  );
}

function DeleteButton({ onDeleteMessage }: { onDeleteMessage: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onDeleteMessage}>
      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
    </Button>
  );
}

function Avatar({ isUser, name }: { isUser: boolean; name: string }) {
  if (isUser) {
    return <User className="h-4 w-4 text-white" />;
  }

  if (name?.toLowerCase().startsWith('gpt-')) {
    return <OpenAI className="h-4 w-4 text-white" />;
  }
  return <Bot className="h-4 w-4 text-white" />;
}
enum DisplayMessageState {
  Markdown,
  Text,
  Pending,
  Streaming,
  Edit,
  Asset,
}

type MessageComponentProps = {
  message: Message;
  disabled?: boolean;
  onResendMessage: () => void;
  onDeleteMessage: () => void;
  onDeleteAssets: () => void;
  onChangeContent: (content: string, submit: boolean) => void;
};

function MessageComponent({
  message,
  disabled = false,
  onResendMessage,
  onDeleteMessage,
  onChangeContent,
  onDeleteAssets,
}: MessageComponentProps) {
  const { t } = useTranslation();
  const [ref, isHover] = useHover();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [edit, setEdit] = useState<string | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  const { author } = message;

  /* const content = getContent(
    current > 0 && message.contentHistory ? message.contentHistory[current - 1] : message.content,
  ); */
  const content = getMessageContentHistoryAsString(message, current, edit !== undefined);
  const Content = useMarkdownProcessor(content || '');
  const isUser = author.role === 'user';

  const handleCopyToClipboard = () => {
    if (typeof content === 'string') {
      navigator.clipboard.writeText(content);
      setCopied(true);
    }
  };

  const handleEdit = () => {
    const raw = getMessageContentHistoryAsString(message, current, true);
    setEdit(raw);
  };

  const handleSave = () => {
    const newContent = inputRef.current?.value;
    if (newContent && content !== newContent) {
      onChangeContent(newContent, isUser);
    }
    setEdit(undefined);
  };

  const handleCancelEdit = () => {
    setEdit(undefined);
  };

  let state = DisplayMessageState.Markdown;
  if (message.assets) {
    state = DisplayMessageState.Asset;
  } else if (edit !== undefined) {
    state = DisplayMessageState.Edit;
  } else if (isUser) {
    state = DisplayMessageState.Text;
  } else if (message.status === MessageStatus.Pending || content === '...') {
    state = DisplayMessageState.Pending;
  } else if (message.status === MessageStatus.Stream) {
    state = DisplayMessageState.Streaming;
  }

  return (
    <div
      ref={disabled ? undefined : ref}
      className={`group relative w-full text-neutral-800 dark:text-neutral-100 hover:dark:bg-neutral-900 ${isUser ? '' : ''}`}
    >
      <div className="m-auto flex w-full gap-4 font-sans text-sm md:max-w-2xl md:gap-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
        <div className="m-auto flex w-full flex-row gap-4 p-4 md:max-w-2xl md:gap-6 md:py-6 lg:max-w-xl lg:px-0 xl:max-w-3xl">
          <div className="flex flex-col items-end">
            <div className="text-opacity-100r flex h-7 items-center justify-center rounded-md p-1 text-white">
              <Avatar isUser={isUser} name={author.name} />
            </div>
          </div>
          <div className="flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
            <div className="flex flex-grow flex-col">
              <div className="flex min-h-20 flex-col items-start whitespace-pre-wrap break-words">
                <div className="w-full break-words">
                  <p className="py-1 font-bold capitalize">{author.name}</p>
                  {state === DisplayMessageState.Asset && (
                    <div className="flex w-full select-auto flex-row items-center px-0 py-2">
                      <File className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      <span>{t('Document added')}</span>
                    </div>
                  )}
                  {state === DisplayMessageState.Pending && (
                    <div className="px-4 py-2">
                      <MoreHorizontal className="h-4 w-4 animate-pulse" />
                    </div>
                  )}
                  {(state === DisplayMessageState.Markdown ||
                    state === DisplayMessageState.Streaming) && (
                    <div className="w-full select-auto px-0 py-2">{Content}</div>
                  )}
                  {state === DisplayMessageState.Text && (
                    <div className="w-full select-auto px-0 py-2">{content}</div>
                  )}
                  {state === DisplayMessageState.Edit && (
                    <Textarea
                      autoFocus
                      ref={inputRef}
                      className="-mx-3 mb-4 mt-0 min-h-[40px] w-full resize-none text-sm"
                      value={edit !== undefined ? edit : content}
                      onChange={(e) => {
                        setEdit(e.target.value);
                      }}
                    />
                  )}
                </div>
                {state === DisplayMessageState.Asset && isHover && (
                  <div className="left-34 absolute bottom-0 flex flex-row items-center">
                    <DeleteButton onDeleteMessage={onDeleteAssets} />
                  </div>
                )}
                {(state === DisplayMessageState.Markdown || state === DisplayMessageState.Text) &&
                  isHover && (
                    <div className="left-34 absolute bottom-0 flex flex-row items-center">
                      {message.contentHistory && message.contentHistory.length > 0 && (
                        <div className="flex flex-row items-center pt-0 text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={current === message.contentHistory?.length}
                            onClick={() => {
                              setCurrent(current + 1);
                            }}
                            className="h-5 w-5 p-1"
                          >
                            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                          <span className="tabular-nums">
                            {' '}
                            {message.contentHistory.length - current + 1} /{' '}
                            {message.contentHistory.length + 1}{' '}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={current === 0}
                            onClick={() => {
                              setCurrent(current - 1);
                            }}
                            className="h-5 w-5 p-1"
                          >
                            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </div>
                      )}
                      {!isUser && (
                        <Button variant="ghost" size="sm" onClick={onResendMessage}>
                          <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      )}
                      <ClipboardButton copied={copied} onCopyToClipboard={handleCopyToClipboard} />
                      <Button variant="ghost" size="sm" onClick={handleEdit}>
                        <Pencil className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                      <DeleteButton onDeleteMessage={onDeleteMessage} />
                    </div>
                  )}
                {state === DisplayMessageState.Edit && (
                  <div className="left-30 absolute -bottom-2 flex flex-row gap-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!edit}
                      className="my-2 h-[28px] py-2"
                    >
                      {isUser ? t('Save & submit') : t('Save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="my-2 h-[28px] py-2"
                    >
                      {t('Cancel')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageComponent;