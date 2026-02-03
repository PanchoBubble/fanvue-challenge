export interface User {
  id: string
  username: string
}

export interface Thread {
  id: string
  title: string
  lastMessageAt: string
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
