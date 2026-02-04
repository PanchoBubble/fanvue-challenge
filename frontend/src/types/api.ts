export interface User {
  id: string
  username: string
}

export interface Thread {
  id: string
  title: string
  lastMessageAt: string
  lastMessageText: string | null
  lastMessageUser: string | null
  unreadCount: number
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  threadId: string
  text: string
  author: string
  messageNumber: number
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface PaginatedMessages {
  items: Message[]
  nextCursor: string | null
}
