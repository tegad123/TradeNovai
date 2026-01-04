import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Message } from "ai";

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model?: "openai" | "anthropic";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ConversationInput {
  id?: string;
  title: string;
  messages: Message[];
  model?: "openai" | "anthropic";
}

/**
 * Get the conversations collection reference for a user
 */
const getUserConversationsRef = (userId: string) => {
  if (!db) {
    throw new Error("Firestore is not initialized. Please configure Firebase.");
  }
  return collection(db, "users", userId, "conversations");
};

/**
 * Save or update a conversation for a user
 */
export const saveConversation = async (
  userId: string,
  conversation: ConversationInput
): Promise<string> => {
  const conversationsRef = getUserConversationsRef(userId);

  if (conversation.id) {
    // Update existing conversation
    const conversationDoc = doc(conversationsRef, conversation.id);
    await updateDoc(conversationDoc, {
      title: conversation.title,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
      model: conversation.model,
      updatedAt: serverTimestamp(),
    });
    return conversation.id;
  } else {
    // Create new conversation
    const docRef = await addDoc(conversationsRef, {
      title: conversation.title,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
      model: conversation.model,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }
};

/**
 * Load all conversations for a user
 */
export const loadConversations = async (userId: string): Promise<Conversation[]> => {
  const conversationsRef = getUserConversationsRef(userId);
  const q = query(conversationsRef, orderBy("updatedAt", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      messages: data.messages.map((msg: Message) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      })),
      model: data.model,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Conversation;
  });
};

/**
 * Delete a conversation for a user
 */
export const deleteConversation = async (
  userId: string,
  conversationId: string
): Promise<void> => {
  const conversationsRef = getUserConversationsRef(userId);
  const conversationDoc = doc(conversationsRef, conversationId);
  await deleteDoc(conversationDoc);
};

/**
 * Clear all conversations for a user
 */
export const clearAllConversations = async (userId: string): Promise<void> => {
  const conversations = await loadConversations(userId);
  const deletePromises = conversations.map((conv) =>
    deleteConversation(userId, conv.id)
  );
  await Promise.all(deletePromises);
};

