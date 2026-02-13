/**
 * AI Study Assistant — floating chat widget accessible from anywhere.
 * Full conversational AI that replaces the need for external ChatGPT.
 * Features: multi-session, chat history, markdown rendering, auto-scroll.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService } from '@/lib/services';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Bot, X, Send, Loader2, Plus, Trash2, MessageSquare, ChevronLeft,
  Sparkles, GraduationCap, Minimize2, Maximize2,
} from 'lucide-react';
import type { ChatMessageItem, ChatSessionItem } from '@/types';

export default function StudyAssistant() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showSessions, setShowSessions] = useState(false);

  // Messages
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load sessions list
  const loadSessions = async () => {
    try {
      const res = await chatService.sessions();
      const data = res.data;
      setSessions(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  };

  // Load messages for a session
  const loadSession = async (id: number) => {
    setLoadingSession(true);
    setActiveSessionId(id);
    setShowSessions(false);
    try {
      const res = await chatService.sessionDetail(id);
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingSession(false);
    }
  };

  // Create new session
  const createSession = async () => {
    try {
      const res = await chatService.createSession();
      setActiveSessionId(res.data.id);
      setMessages([]);
      setShowSessions(false);
      await loadSessions();
    } catch { /* silent */ }
  };

  // Delete session
  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatService.deleteSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch { /* silent */ }
  };

  // Send message
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending) return;

    // If no active session, create one first
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const res = await chatService.createSession();
        sessionId = res.data.id;
        setActiveSessionId(sessionId);
        await loadSessions();
      } catch { return; }
    }

    // Optimistically add user message
    const tempUserMsg: ChatMessageItem = {
      id: Date.now(),
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await chatService.sendMessage(sessionId!, msg);
      // Replace temp message with real ones
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id);
        return [...withoutTemp, res.data.user_message, res.data.assistant_message];
      });
      // Update session title in sidebar
      loadSessions();
    } catch {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // Open chat
  const handleOpen = () => {
    setOpen(true);
    if (isAuthenticated) {
      loadSessions();
    }
  };

  // Format message content with basic markdown
  const formatContent = (content: string) => {
    // Code blocks
    let html = content.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (_match, lang, code) =>
        `<pre class="bg-muted rounded-md p-3 my-2 overflow-x-auto text-xs"><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`
    );
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Line breaks
    html = html.replace(/\n/g, '<br/>');
    return html;
  };

  const escapeHtml = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (!isAuthenticated) {
    return null; // Only show for logged-in users
  }

  // Floating button
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        title="AI Study Assistant"
      >
        <Bot className="h-6 w-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
      </button>
    );
  }

  const panelWidth = expanded ? 'w-[700px]' : 'w-[420px]';
  const panelHeight = expanded ? 'h-[85vh]' : 'h-[600px]';

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${panelWidth} ${panelHeight} max-h-[90vh] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2">
          {showSessions && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setShowSessions(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Study Assistant</h3>
            <p className="text-[10px] text-white/70">AI-powered • Ask anything</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setShowSessions(!showSessions)}
            title="Chat history"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
            onClick={createSession}
            title="New chat"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setOpen(false)}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Session list sidebar */}
      {showSessions ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Chat History</p>
            {sessions.length > 0 && (
              <Button
                variant="ghost" size="sm"
                className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                onClick={async () => {
                  await chatService.clearAll();
                  setSessions([]);
                  setActiveSessionId(null);
                  setMessages([]);
                }}
              >
                <Trash2 className="h-2.5 w-2.5 mr-1" /> Clear All
              </Button>
            )}
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No chats yet</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 group ${
                  activeSessionId === s.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {s.message_count} message{s.message_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => deleteSession(s.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </button>
            ))
          )}
          <Button
            variant="outline" size="sm"
            className="w-full mt-2 gap-1.5 text-xs"
            onClick={createSession}
          >
            <Plus className="h-3 w-3" /> New Chat
          </Button>
        </div>
      ) : (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loadingSession ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              /* Welcome screen */
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="font-semibold text-base mb-1">Hi{user ? `, ${user.first_name || user.username}` : ''}!</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-[280px]">
                  I'm your AI Study Assistant. Ask me anything — homework help, concept explanations, code debugging, exam prep, and more.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
                  {[
                    'Explain polymorphism in OOP',
                    'Write a Python sorting algorithm',
                    'What is normalization in DBMS?',
                    'Tips for acing my viva',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                      className="text-[11px] text-left p-2.5 rounded-lg border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={user?.avatar || undefined} />
                      <AvatarFallback className="text-[10px]">{user ? initials(user.full_name || user.username) : 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none [&_pre]:my-2 [&_code]:text-xs [&_p]:my-1 [&_br]:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {sending && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={1}
                className="resize-none text-sm min-h-[40px] max-h-[120px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                onClick={handleSend}
                disabled={sending || !input.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Enter to send • Shift+Enter for new line • Powered by AI
            </p>
          </div>
        </>
      )}
    </div>
  );
}
