import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { SidebarAbleToShow } from '@/components/Sidebars/MainSidebar'
import { Chat, ChatMetadata } from '@/lib/llm/types'

interface ChatContextType {
  currentChat: Chat | undefined
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | undefined>>
  sidebarShowing: SidebarAbleToShow
  setSidebarShowing: (option: SidebarAbleToShow) => void
  activePanel: 'chat' | 'similarFiles' | null
  setActivePanel: React.Dispatch<React.SetStateAction<'chat' | 'similarFiles' | null>>
  allChatsMetadata: ChatMetadata[]
  deleteChat: (chatID: string | undefined) => Promise<void>
  saveChat: (updatedChat: Chat) => Promise<void>
  openNewChat: (chatID?: string) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentChat, setCurrentChat] = useState<Chat | undefined>(undefined)
  const [sidebarShowing, setSidebarShowing] = useState<SidebarAbleToShow>('files')
  const [activePanel, setActivePanel] = useState<'chat' | 'similarFiles' | null>(null)
  const [allChatsMetadata, setAllChatsMetadata] = useState<ChatMetadata[]>([])

  useEffect(() => {
    const fetchChatHistories = async () => {
      const allChatsMetadataResponse = await window.electronStore.getAllChatsMetadata()
      setAllChatsMetadata(allChatsMetadataResponse)
    }
    fetchChatHistories()
  }, [])

  const saveChat = useCallback(async (updatedChat: Chat) => {
    await window.electronStore.saveChat(updatedChat)

    const retrievedChatsMetadata = await window.electronStore.getAllChatsMetadata()
    setAllChatsMetadata(retrievedChatsMetadata)
  }, [])

  const deleteChat = useCallback(async (chatID: string | undefined) => {
    if (!chatID) return
    await window.electronStore.deleteChat(chatID)
    const retrievedChatsMetadata = await window.electronStore.getAllChatsMetadata()
    setAllChatsMetadata(retrievedChatsMetadata)
    setCurrentChat(undefined)
  }, [])

  const openNewChat = useCallback(
    async (chatID?: string) => {
      const chat = await window.electronStore.getChat(chatID)
      setCurrentChat((oldChat) => {
        if (oldChat && oldChat.id !== chatID) {
          saveChat(oldChat)
        }
        return chat
      })
      setActivePanel((prev) => (prev === 'chat' ? null : 'chat'))
    },
    [saveChat],
  )

  const value = React.useMemo(
    () => ({
      currentChat,
      setCurrentChat,
      allChatsMetadata,
      sidebarShowing,
      setSidebarShowing,
      activePanel,
      setActivePanel,
      deleteChat,
      saveChat,
      openNewChat,
    }),
    [
      currentChat,
      setCurrentChat,
      allChatsMetadata,
      sidebarShowing,
      setSidebarShowing,
      activePanel,
      setActivePanel,
      deleteChat,
      saveChat,
      openNewChat,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
