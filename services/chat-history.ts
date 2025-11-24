import { setItem, getItem, removeItem } from './storage';
import * as SQLite from 'expo-sqlite';

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

export interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  citations: string[];
  followUpSuggestions?: string[];
  timestamp?: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface SavedNote {
  id: string;
  title: string;
  content: string;
  sourceMessageId?: number;
  conversationId?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

// Initialize chat history database
export const initChatHistoryDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync('atomiq.db');
    
    await db.execAsync(`
      -- Chat Conversations
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        is_pinned INTEGER DEFAULT 0,
        message_count INTEGER DEFAULT 0
      );

      -- Chat Messages
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        citations TEXT,
        follow_up_suggestions TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      );

      -- Saved Notes
      CREATE TABLE IF NOT EXISTS saved_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source_message_id INTEGER,
        conversation_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        tags TEXT,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_updated ON chat_conversations(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_notes_updated ON saved_notes(updated_at DESC);
    `);
  } catch (error) {
    console.error('Error initializing chat history DB:', error);
    throw error;
  }
};

// Conversation Management
export const createConversation = async (title: string = 'New Conversation'): Promise<string> => {
  if (!db) await initChatHistoryDB();
  
  const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  const finalTitle = title.trim() || 'New Conversation';
  
  await db!.runAsync(
    `INSERT INTO chat_conversations (id, title, created_at, updated_at, message_count)
     VALUES (?, ?, ?, ?, 0)`,
    [id, finalTitle, now, now]
  );
  
  return id;
};

export const saveConversation = async (
  conversationId: string,
  messages: ChatMessage[],
  title?: string
): Promise<void> => {
  if (!db) await initChatHistoryDB();
  
  const now = Date.now();
  
  // Update conversation - always ensure title is set
  const finalTitle = title?.trim() || messages.find(m => m.role === 'user')?.text.substring(0, 50) || 'New Conversation';
  
  await db!.runAsync(
    `UPDATE chat_conversations 
     SET title = ?, updated_at = ?, message_count = ?
     WHERE id = ?`,
    [finalTitle, now, messages.length, conversationId]
  );
  
  // Delete old messages
  await db!.runAsync(
    `DELETE FROM chat_messages WHERE conversation_id = ?`,
    [conversationId]
  );
  
  // Insert new messages
  for (const msg of messages) {
    await db!.runAsync(
      `INSERT INTO chat_messages 
       (conversation_id, role, text, citations, follow_up_suggestions, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        msg.role,
        msg.text,
        JSON.stringify(msg.citations || []),
        JSON.stringify(msg.followUpSuggestions || []),
        msg.timestamp || Date.now()
      ]
    );
  }
};

export const loadConversation = async (conversationId: string): Promise<ChatConversation | null> => {
  if (!db) await initChatHistoryDB();
  
  const conv = await db!.getFirstAsync<{
    id: string;
    title: string;
    created_at: number;
    updated_at: number;
    is_pinned: number;
  }>(
    `SELECT * FROM chat_conversations WHERE id = ?`,
    [conversationId]
  );
  
  if (!conv) return null;
  
  const messageRows = await db!.getAllAsync<{
    id: number;
    role: string;
    text: string;
    citations: string;
    follow_up_suggestions: string;
    timestamp: number;
  }>(
    `SELECT * FROM chat_messages 
     WHERE conversation_id = ? 
     ORDER BY timestamp ASC`,
    [conversationId]
  );
  
  return {
    id: conv.id,
    title: conv.title || 'New Conversation',
    messages: messageRows.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'bot',
      text: m.text,
      citations: JSON.parse(m.citations || '[]'),
      followUpSuggestions: JSON.parse(m.follow_up_suggestions || '[]'),
      timestamp: m.timestamp
    })),
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
    isPinned: conv.is_pinned === 1
  };
};

export const getAllConversations = async (): Promise<ChatConversation[]> => {
  if (!db) await initChatHistoryDB();
  
  const convs = await db!.getAllAsync<{
    id: string;
    title: string;
    created_at: number;
    updated_at: number;
    is_pinned: number;
    message_count: number;
  }>(
    `SELECT * FROM chat_conversations 
     ORDER BY is_pinned DESC, updated_at DESC`
  );
  
  return convs.map(conv => ({
    id: conv.id,
    title: conv.title,
    messages: [],
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
    isPinned: conv.is_pinned === 1
  }));
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  if (!db) await initChatHistoryDB();
  
  await db!.runAsync(
    `DELETE FROM chat_conversations WHERE id = ?`,
    [conversationId]
  );
};

export const renameConversation = async (conversationId: string, newTitle: string): Promise<void> => {
  if (!db) await initChatHistoryDB();
  
  const finalTitle = newTitle.trim() || 'New Conversation';
  await db!.runAsync(
    `UPDATE chat_conversations SET title = ? WHERE id = ?`,
    [finalTitle, conversationId]
  );
};

export const pinConversation = async (conversationId: string, pinned: boolean): Promise<void> => {
  if (!db) await initChatHistoryDB();
  
  await db!.runAsync(
    `UPDATE chat_conversations SET is_pinned = ? WHERE id = ?`,
    [pinned ? 1 : 0, conversationId]
  );
};

// Notes Management
export const saveNote = async (note: Omit<SavedNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) await initChatHistoryDB();
  
  const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  const finalTitle = note.title.trim() || 'Untitled Note';
  
  await db!.runAsync(
    `INSERT INTO saved_notes 
     (id, title, content, source_message_id, conversation_id, created_at, updated_at, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      finalTitle,
      note.content,
      note.sourceMessageId || null,
      note.conversationId || null,
      now,
      now,
      JSON.stringify(note.tags || [])
    ]
  );
  
  return id;
};

export const getAllNotes = async (): Promise<SavedNote[]> => {
  if (!db) await initChatHistoryDB();
  
  const notes = await db!.getAllAsync<{
    id: string;
    title: string;
    content: string;
    source_message_id: number | null;
    conversation_id: string | null;
    created_at: number;
    updated_at: number;
    tags: string;
  }>(
    `SELECT * FROM saved_notes ORDER BY updated_at DESC`
  );
  
  return notes.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    sourceMessageId: note.source_message_id || undefined,
    conversationId: note.conversation_id || undefined,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    tags: JSON.parse(note.tags || '[]')
  }));
};

export const deleteNote = async (noteId: string): Promise<void> => {
  if (!db) await initChatHistoryDB();
  
  await db!.runAsync(`DELETE FROM saved_notes WHERE id = ?`, [noteId]);
};

export const updateNote = async (noteId: string, updates: Partial<SavedNote>): Promise<void> => {
  if (!db) await initChatHistoryDB();
  
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title.trim() || 'Untitled Note');
  }
  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.tags !== undefined) {
    fields.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }
  
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(noteId);
  
  await db!.runAsync(
    `UPDATE saved_notes SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

// Get current conversation ID from storage
export const getCurrentConversationId = async (): Promise<string | null> => {
  return await getItem<string>('@atomiq:current_conversation_id');
};

export const setCurrentConversationId = async (conversationId: string | null): Promise<void> => {
  if (conversationId) {
    await setItem('@atomiq:current_conversation_id', conversationId);
  } else {
    await removeItem('@atomiq:current_conversation_id');
  }
};

