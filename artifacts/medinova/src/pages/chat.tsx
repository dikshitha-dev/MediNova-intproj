import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { useVoiceRecorder } from "@workspace/integrations-openai-ai-react/audio";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Mic, MicOff, Send, Trash2, MessageSquare, Globe, Bot, User
} from "lucide-react";
import { format } from "date-fns";

const LANG_LABELS: Record<string, string> = {
  en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", ml: "Malayalam",
  es: "Spanish", fr: "French", de: "German", zh: "Chinese", ar: "Arabic",
};

function detectLanguage(text: string): string | null {
  const devanagari = /[\u0900-\u097F]/;
  const telugu = /[\u0C00-\u0C7F]/;
  const tamil = /[\u0B80-\u0BFF]/;
  const malayalam = /[\u0D00-\u0D7F]/;
  if (devanagari.test(text)) return "hi";
  if (telugu.test(text)) return "te";
  if (tamil.test(text)) return "ta";
  if (malayalam.test(text)) return "ml";
  return null;
}

type Message = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  pending?: boolean;
  streaming?: boolean;
};

export default function Chat() {
  const { data: conversations, isLoading: isLoadingConvs } = useListOpenaiConversations();
  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { startRecording, stopRecording } = useVoiceRecorder();

  const { data: convData, isLoading: isLoadingMsgs } = useGetOpenaiConversation(
    selectedId ?? 0,
    { query: { enabled: !!selectedId, queryKey: getGetOpenaiConversationQueryKey(selectedId ?? 0) } }
  );

  useEffect(() => {
    if (convData?.messages) {
      setMessages(convData.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt,
      })));
    }
  }, [convData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      const conv = await createConv.mutateAsync({ data: { title: "New Chat" } });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      setSelectedId(conv.id);
      setMessages([]);
      setDetectedLang(null);
    } catch {
      toast({ title: "Error", description: "Could not create conversation.", variant: "destructive" });
    }
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConv.mutateAsync({ params: { id } });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      if (selectedId === id) {
        setSelectedId(null);
        setMessages([]);
      }
    } catch {
      toast({ title: "Error", description: "Could not delete conversation.", variant: "destructive" });
    }
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    let convId = selectedId;
    if (!convId) {
      try {
        const conv = await createConv.mutateAsync({ data: { title: text.slice(0, 40) } });
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        convId = conv.id;
        setSelectedId(conv.id);
      } catch {
        toast({ title: "Error", description: "Could not create conversation.", variant: "destructive" });
        return;
      }
    }

    const lang = detectLanguage(text);
    if (lang) setDetectedLang(lang);

    const userMsg: Message = { role: "user", content: text, createdAt: new Date().toISOString() };
    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputText("");
    setIsStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: abort.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.streaming) {
                      updated[updated.length - 1] = { ...last, content: fullContent };
                    }
                    return updated;
                  });
                }
                if (data.done) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.streaming) {
                      updated[updated.length - 1] = { ...last, streaming: false, content: fullContent };
                    }
                    return updated;
                  });
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(convId) });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [inputText, isStreaming, selectedId, createConv, queryClient, toast]);

  const handleVoice = async () => {
    if (isRecording) {
      setIsRecording(false);
      const blob = await stopRecording();
      if (!blob || blob.size === 0) return;

      let convId = selectedId;
      if (!convId) {
        try {
          const conv = await createConv.mutateAsync({ data: { title: "Voice Chat" } });
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          convId = conv.id;
          setSelectedId(conv.id);
        } catch {
          toast({ title: "Error", description: "Could not create conversation.", variant: "destructive" });
          return;
        }
      }

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const voiceMsg: Message = { role: "user", content: "[ Voice message ]", streaming: true };
        const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
        setMessages((prev) => [...prev, voiceMsg, assistantMsg]);
        setIsStreaming(true);

        try {
          const response = await fetch(`/api/openai/conversations/${convId}/voice-messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64 }),
          });

          const reader2 = response.body?.getReader();
          const dec = new TextDecoder();
          let transcript = "";

          if (reader2) {
            while (true) {
              const { done, value } = await reader2.read();
              if (done) break;
              const chunk = dec.decode(value);
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === "transcript") {
                      transcript += data.data;
                      setMessages((prev) => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.streaming) updated[updated.length - 1] = { ...last, content: transcript };
                        return updated;
                      });
                    }
                    if (data.type === "user_transcript") {
                      setMessages((prev) => {
                        const updated = [...prev];
                        const secondLast = updated[updated.length - 2];
                        if (secondLast?.streaming) updated[updated.length - 2] = { ...secondLast, content: data.data, streaming: false };
                        return updated;
                      });
                    }
                    if (data.done) {
                      setMessages((prev) => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
                        return updated;
                      });
                    }
                  } catch { /* ignore */ }
                }
              }
            }
          }
          queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(convId!) });
        } catch {
          toast({ title: "Error", description: "Voice processing failed.", variant: "destructive" });
          setMessages((prev) => prev.slice(0, -2));
        } finally {
          setIsStreaming(false);
        }
      };
    } else {
      setIsRecording(true);
      await startRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col shrink-0 bg-card/30">
        <div className="p-4 border-b border-border">
          <Button onClick={handleNewConversation} className="w-full" size="sm" data-testid="button-new-conversation">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoadingConvs ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="text-center py-8 px-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setSelectedId(conv.id); setDetectedLang(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between group ${selectedId === conv.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                  data-testid={`button-conversation-${conv.id}`}
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                    data-testid={`button-delete-conv-${conv.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-border px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">MediNova Assistant</span>
          </div>
          {detectedLang && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-detected-language">
              <Globe className="h-3 w-3" />
              {LANG_LABELS[detectedLang] ?? detectedLang}
            </Badge>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4 max-w-3xl mx-auto">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">MediNova Assistant</h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Your multilingual AI medical companion. Ask about medications, symptoms, or general health guidance in English, Hindi, Telugu, Tamil, Malayalam, or any language.
                </p>
                <div className="flex gap-2 mt-4 flex-wrap justify-center">
                  {["English", "Hindi", "Telugu", "Tamil", "Malayalam"].map((lang) => (
                    <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                  ))}
                </div>
              </div>
            ) : isLoadingMsgs ? (
              <div className="space-y-4">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-3/4" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">Start the conversation by typing a message below.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`message-${idx}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                  }`}>
                    {msg.content || (msg.streaming ? (
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : "")}
                    {msg.streaming && msg.content && <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Input
                placeholder="Type a message... (supports English, Hindi, Telugu, Tamil, Malayalam)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                className="pr-4"
                data-testid="input-chat-message"
              />
            </div>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={handleVoice}
              disabled={isStreaming}
              className={isRecording ? "animate-pulse" : ""}
              data-testid="button-voice"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputText.trim() || isStreaming}
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="text-xs text-center text-muted-foreground mt-2 animate-pulse">
              Recording... Click the mic button again to stop and send.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
