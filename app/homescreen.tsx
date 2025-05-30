"use client"

import { useClerk, useUser } from "@clerk/clerk-expo"
import { OPENAI_API_KEY } from "@env"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import {
  BarChart2,
  Bot,
  ChevronDown,
  LogOut,
  Menu as MenuIcon,
  Paintbrush,
  RefreshCw,
  Send,
  Settings,
  TrendingUp,
  User,
  X,
} from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native"

// Fix the LinearGradient gradient type issue
type GradientColors = readonly [string, string];

// Define AI agent types with proper typing
type AIAgent = {
  name: string;
  avatar: React.ReactNode;
  smallAvatar: React.ReactNode;
  menuIcon: React.ReactNode;
  color: string;
  gradient: GradientColors;
  systemPrompt: string;
};

type AIAgents = {
  [key: string]: AIAgent;
};

// Redefine AI_AGENTS with proper typing
const AI_AGENTS: AIAgents = {
  NFT: {
    name: "NFT Specialist",
    avatar: <Paintbrush size={24} color="#fff" />,
    smallAvatar: <Paintbrush size={18} color="#fff" />,
    menuIcon: <Paintbrush size={22} color="#fff" />,
    color: "#4361EE",
    gradient: ["#3A56DD", "#4361EE"] as GradientColors,
    systemPrompt:
      "You are an NFT specialist AI assistant. You have deep knowledge of NFT marketplaces, digital art valuation, blockchain technology, and NFT trading strategies. Provide concise, accurate information about NFTs, digital collectibles, and the NFT ecosystem.",
  },
  TRADING: {
    name: "Trading Expert",
    avatar: <TrendingUp size={24} color="#fff" />,
    smallAvatar: <TrendingUp size={18} color="#fff" />,
    menuIcon: <TrendingUp size={22} color="#fff" />,
    color: "#F48C06",
    gradient: ["#F48C06", "#F9A826"] as GradientColors,
    systemPrompt:
      "You are a real-time trading expert AI assistant. You have extensive knowledge of market dynamics, trading indicators, risk management, and execution strategies. Provide concise, practical advice on trading decisions, market trends, and trading strategies.",
  },
  ANALYSIS: {
    name: "Market Analyst",
    avatar: <BarChart2 size={24} color="#fff" />,
    smallAvatar: <BarChart2 size={18} color="#fff" />,
    menuIcon: <BarChart2 size={22} color="#fff" />,
    color: "#F94144",
    gradient: ["#E63946", "#F94144"] as GradientColors,
    systemPrompt:
      "You are a market analysis AI assistant. You excel at interpreting market data, identifying patterns, and explaining complex economic factors. Provide concise insights on market trends, sector analysis, and economic indicators that affect investment decisions.",
  },
  BOT: {
    name: "Trading Bot",
    avatar: <Bot size={24} color="#fff" />,
    smallAvatar: <Bot size={18} color="#fff" />,
    menuIcon: <Bot size={22} color="#fff" />,
    color: "#43AA8B",
    gradient: ["#2A9D8F", "#43AA8B"] as GradientColors,
    systemPrompt:
      "You are an automated trading bot assistant. You specialize in algorithmic trading strategies, bot configuration, and automated execution systems. Provide concise advice on building, configuring, and optimizing trading bots for various market conditions.",
  },
};

// Define responsive constants at the top level
const getResponsiveValues = (width: number, height: number) => {
  const isSmallDevice = width < 375;
  const isMediumDevice = width >= 375 && width < 768;
  const isLargeDevice = width >= 768;
  const isLandscape = width > height;
  
  return {
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isLandscape,
  };
};

// Initial dimensions
const initialDimensions = Dimensions.get('window');
const {
  isSmallDevice,
  isMediumDevice,
  isLargeDevice, 
  isLandscape,
} = getResponsiveValues(initialDimensions.width, initialDimensions.height);

// Update MenuItemProps type
type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onPress: () => void;
  agentColor?: string;
  gradientColors?: GradientColors;
};

// Update home screen to handle orientation changes
const HomeScreen = () => {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [aiResponse, setAiResponse] = useState("")
  const [userInput, setUserInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState("BOT")
  const [chatHistory, setChatHistory] = useState<{ agent: string; messages: { role: string; content: string }[] }[]>([
    { agent: "NFT", messages: [] },
    { agent: "TRADING", messages: [] },
    { agent: "ANALYSIS", messages: [] },
    { agent: "BOT", messages: [] },
  ])
  const [showMenu, setShowMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [dimensions, setDimensions] = useState({
    window: Dimensions.get("window"),
    screen: Dimensions.get("screen")
  });

  // Get current responsive values
  const responsiveValues = getResponsiveValues(
    dimensions.window.width,
    dimensions.window.height
  );

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      "change",
      ({ window, screen }) => {
        setDimensions({ window, screen });
      }
    );
    return () => subscription?.remove();
  }, []);

  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation for menu slide-in
  const menuAnimation = useRef(new Animated.Value(-300)).current;
  
  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: showMenu ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showMenu]);

  const handleLogout = async () => {
    try {
      await signOut()
      await AsyncStorage.removeItem("userToken")
      router.replace("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleAgentSelection = (agentKey: string) => {
    setSelectedAgent(agentKey)
    setShowMenu(false)
  }

  const getCurrentAgentChat = () => {
    return chatHistory.find((chat) => chat.agent === selectedAgent)?.messages || []
  }

  const handleAiInteraction = async () => {
    if (!userInput.trim()) return

    // Add user message to chat history
    const updatedChatHistory = chatHistory.map((chat) => {
      if (chat.agent === selectedAgent) {
        return {
          ...chat,
          messages: [...chat.messages, { role: "user", content: userInput }],
        }
      }
      return chat
    })

    setChatHistory(updatedChatHistory)
    setUserInput("")
    setLoading(true)

    try {
      // Prepare messages for API call with system prompt
      const currentAgentChat = updatedChatHistory.find((chat) => chat.agent === selectedAgent)?.messages || []
      const messagesForAPI = [
        {
          role: "system",
          content: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].systemPrompt,
        },
        ...currentAgentChat.slice(-5), // Include last 5 messages for context
      ]

      // OpenAI API call
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messagesForAPI,
          max_tokens: 150,
        }),
      })

      const data = await response.json()
      if (data.choices && data.choices.length > 0) {
        const assistantMessage = data.choices[0].message.content

        // Add assistant response to chat history
        const finalChatHistory = chatHistory.map((chat) => {
          if (chat.agent === selectedAgent) {
            return {
              ...chat,
              messages: [
                ...chat.messages,
                { role: "user", content: userInput },
                { role: "assistant", content: assistantMessage },
              ],
            }
          }
          return chat
        })

        setChatHistory(finalChatHistory)
        setAiResponse(assistantMessage)

        // Scroll to bottom after a short delay to ensure messages are rendered
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
      }
    } catch (error) {
      // Add error message to chat
      const errorChatHistory = chatHistory.map((chat) => {
        if (chat.agent === selectedAgent) {
          return {
            ...chat,
            messages: [
              ...chat.messages,
              { role: "user", content: userInput },
              { role: "assistant", content: "Sorry, I couldn't process your request. Please try again." },
            ],
          }
        }
        return chat
      })

      setChatHistory(errorChatHistory)
      setAiResponse("Sorry, I couldn't process your request. Please try again.")
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const renderChatMessages = () => {
    const currentChat = chatHistory.find((chat) => chat.agent === selectedAgent)
    if (!currentChat || currentChat.messages.length === 0) {
      return (
        <View style={styles.emptyChat}>
          <LinearGradient
            colors={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].gradient}
            style={styles.aiAvatarLarge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar}
          </LinearGradient>
          <Text style={styles.emptyChatTitle}>Chat with {AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].name}</Text>
          <Text style={styles.emptyChatSubtitle}>
            Ask any question about{" "}
            {selectedAgent === "NFT"
              ? "NFTs and digital assets"
              : selectedAgent === "TRADING"
                ? "trading strategies and market moves"
                : selectedAgent === "ANALYSIS"
                  ? "market analysis and trends"
                  : "trading bots and automation"}
          </Text>

          <TouchableOpacity
            style={[
              styles.suggestedPromptButton,
              { borderColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color },
            ]}
            onPress={() => {
              const suggestions = {
                NFT: "What are the top NFT marketplaces right now?",
                TRADING: "What trading strategy works best in a volatile market?",
                ANALYSIS: "How do I interpret the current market trends?",
                BOT: "How can I set up a simple trading bot for crypto?",
              }
              setUserInput(suggestions[selectedAgent as keyof typeof suggestions])
            }}
          >
            <Text
              style={[styles.suggestedPromptText, { color: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}
            >
              Try a suggested question
            </Text>
          </TouchableOpacity>
        </View>
      )
    }

    // Group consecutive messages by role
    const chatComponents = []
    let lastRole = ""
    let messageGroup: { role: string; content: string }[] = []

    currentChat.messages.forEach((message, index) => {
      if (message.role !== lastRole && messageGroup.length > 0) {
        // Render previous group
        chatComponents.push(
          <View
            key={`group-${index}`}
            style={[
              styles.messageContainer,
              lastRole === "user" ? styles.userMessageContainer : styles.aiMessageContainer,
            ]}
          >
            {lastRole === "assistant" && (
              <LinearGradient
                colors={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].gradient}
                style={styles.aiAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].smallAvatar}
              </LinearGradient>
            )}
            <View
              style={
                lastRole === "user"
                  ? styles.userMessageBubble
                  : [
                      styles.aiMessageBubble,
                      { borderLeftColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color },
                    ]
              }
            >
              {messageGroup.map((msg, i) => (
                <Text key={i} style={lastRole === "user" ? styles.userMessageText : styles.aiMessageText}>
                  {msg.content}
                </Text>
              ))}
            </View>
          </View>,
        )
        messageGroup = [message]
      } else {
        messageGroup.push(message)
      }
      lastRole = message.role
    })

    // Add the last group
    if (messageGroup.length > 0) {
      chatComponents.push(
        <View
          key="last-group"
          style={[
            styles.messageContainer,
            lastRole === "user" ? styles.userMessageContainer : styles.aiMessageContainer,
          ]}
        >
          {lastRole === "assistant" && (
            <LinearGradient
              colors={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].gradient}
              style={styles.aiAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].smallAvatar}
            </LinearGradient>
          )}
          <View
            style={
              lastRole === "user"
                ? styles.userMessageBubble
                : [
                    styles.aiMessageBubble,
                    { borderLeftColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color },
                  ]
            }
          >
            {messageGroup.map((msg, i) => (
              <Text key={i} style={lastRole === "user" ? styles.userMessageText : styles.aiMessageText}>
                {msg.content}
              </Text>
            ))}
          </View>
        </View>,
      )
    }

    return chatComponents
  }

  // Update the LinearGradient component types
  const LinearGradientTyped = LinearGradient as React.ComponentType<{
    colors: GradientColors;
    style?: StyleProp<ViewStyle>;
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    children?: React.ReactNode;
  }>;

  // Menu component
  const MenuItem: React.FC<MenuItemProps> = ({
    icon,
    label,
    isActive,
    onPress,
    agentColor = "",
    gradientColors = ["#333", "#444"] as GradientColors,
  }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.menuItem,
          isActive && { backgroundColor: agentColor },
        ]}
      >
        <LinearGradientTyped
          colors={isActive ? gradientColors : ["transparent", "transparent"]}
          style={styles.menuItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.menuItemContent}>
            {icon}
            <Text style={styles.menuItemLabel}>{label}</Text>
          </View>
        </LinearGradientTyped>
      </TouchableOpacity>
    );
  };

  // Slide-in menu component
  const SlideInMenu = () => (
    <Modal
      visible={showMenu}
      transparent={true}
      animationType="none"
      onRequestClose={() => setShowMenu(false)}
    >
      <View style={styles.menuModalOverlay}>
        <Animated.View 
          style={[
            styles.slideInMenu,
            { transform: [{ translateX: menuAnimation }] }
          ]}
        >
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>AI Trader</Text>
            <TouchableOpacity onPress={() => setShowMenu(false)} style={styles.closeMenuButton}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.menuDivider} />
          
          <View style={styles.agentsMenuList}>
            <Text style={styles.menuSectionTitle}>AI AGENTS</Text>
            {Object.entries(AI_AGENTS).map(([key, agent]) => (
              <MenuItem
                key={key}
                icon={agent.menuIcon}
                label={agent.name}
                isActive={selectedAgent === key}
                onPress={() => handleAgentSelection(key)}
                agentColor={agent.color}
                gradientColors={agent.gradient}
              />
            ))}
          </View>
          
          <View style={styles.menuDivider} />
          
          <View style={styles.menuFooter}>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => {
              setShowMenu(false);
              setShowProfileMenu(true);
            }}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.menuProfileIcon} />
              ) : (
                <LinearGradient
                  colors={["#4361EE", "#3A56DD"]}
                  style={styles.menuProfileIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.menuProfileInitial}>
                    {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                  </Text>
                </LinearGradient>
              )}
              <Text style={styles.menuProfileText}>
                {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Profile"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={20} color="#f44336" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  // Profile menu component
  const ProfileMenu = () => (
    <Modal
      visible={showProfileMenu}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowProfileMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowProfileMenu(false)}
      >
        <View style={[
          styles.profileMenuContainer,
          responsiveValues.isSmallDevice && styles.profileMenuContainerSmall
        ]}>
          <View style={styles.profileMenuHeader}>
            <View style={styles.profileMenuUserInfo}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.profileMenuAvatar} />
              ) : (
                <LinearGradient
                  colors={["#4361EE", "#3A56DD"]}
                  style={styles.profileMenuAvatarFallback}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.profileMenuAvatarText}>
                    {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.profileMenuUserDetails}>
                <Text style={styles.profileMenuUserName} numberOfLines={1} ellipsizeMode="tail">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.emailAddresses?.[0]?.emailAddress || "User"}
                </Text>
                <Text style={styles.profileMenuUserEmail} numberOfLines={1} ellipsizeMode="tail">
                  {user?.emailAddresses?.[0]?.emailAddress || ""}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.profileMenuDivider} />

          <TouchableOpacity
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              // Here you would navigate to profile settings
              alert("Profile settings would open here");
            }}
          >
            <User size={20} color="#fff" style={styles.profileMenuItemIcon} />
            <Text style={styles.profileMenuItemText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileMenuItem}
            onPress={() => {
              setShowProfileMenu(false);
              // Here you would navigate to account settings
              alert("Account settings would open here");
            }}
          >
            <Settings size={20} color="#fff" style={styles.profileMenuItemIcon} />
            <Text style={styles.profileMenuItemText}>Account Settings</Text>
          </TouchableOpacity>

          <View style={styles.profileMenuDivider} />

          <TouchableOpacity
            style={[styles.profileMenuItem, styles.logoutMenuItem]}
            onPress={() => {
              setShowProfileMenu(false);
              handleLogout();
            }}
          >
            <LogOut size={20} color="#f44336" style={styles.profileMenuItemIcon} />
            <Text style={styles.logoutMenuItemText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )

  // Create styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0A0A12",
    },
    contentContainer: {
      flex: 1,
    },
    // Menu Styles
    menuModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    slideInMenu: {
      width: 280,
      height: "100%",
      backgroundColor: "#13131A",
      paddingVertical: 20,
      shadowColor: "#000",
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    menuHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 15,
    },
    menuTitle: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "bold",
    },
    closeMenuButton: {
      padding: 5,
    },
    menuDivider: {
      height: 1,
      backgroundColor: "#222",
      marginVertical: 15,
    },
    menuSectionTitle: {
      color: "#666",
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 15,
      paddingHorizontal: 20,
    },
    agentsMenuList: {
      paddingHorizontal: 10,
      gap: 10,
    },
    menuItem: {
      height: 56,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 8,
    },
    menuItemGradient: {
      flex: 1,
      justifyContent: "center",
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
    },
    menuItemLabel: {
      color: "#fff",
      fontSize: 16,
      marginLeft: 15,
      fontWeight: "500",
    },
    menuFooter: {
      marginTop: "auto",
      paddingHorizontal: 20,
      gap: 15,
    },
    profileMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
    },
    menuProfileIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    menuProfileInitial: {
      color: "#FFF",
      fontWeight: "bold",
      fontSize: 16,
    },
    menuProfileText: {
      color: "#fff",
      marginLeft: 15,
      fontSize: 16,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      marginBottom: 10,
    },
    logoutText: {
      color: "#f44336",
      marginLeft: 15,
      fontSize: 16,
      fontWeight: "500",
    },
    // Main Content Styles
    mainContent: {
      flex: 1,
      backgroundColor: "#0A0A12",
    },
    topBar: {
      height: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#222",
      backgroundColor: "rgba(19, 19, 26, 0.95)",
      backdropFilter: "blur(10px)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    topBarLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    menuButton: {
      padding: 8,
      marginRight: 10,
    },
    topBarAgentIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    topBarTitle: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "bold",
      marginLeft: 12,
    },
    profileButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 24,
      backgroundColor: "#1E1E2D",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    profileIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#4361EE",
      alignItems: "center",
      justifyContent: "center",
    },
    profileInitial: {
      color: "#FFF",
      fontWeight: "bold",
      fontSize: 16,
    },
    profileText: {
      color: "#fff",
      marginLeft: 8,
      marginRight: 5,
      fontSize: 14,
      display: isSmallDevice ? "none" : "flex",
    },
    chatMainContainer: {
      flex: 1,
      padding: 20,
    },
    aiSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      flexWrap: isSmallDevice ? "wrap" : "nowrap",
    },
    aiSectionHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: isSmallDevice ? 10 : 0,
    },
    agentIconLarge: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    aiSectionTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#fff",
    },
    aiSectionSubtitle: {
      fontSize: 14,
      color: "#aaa",
    },
    newChatButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    newChatButtonText: {
      color: "#fff",
      marginLeft: 6,
      fontSize: 13,
      fontWeight: "500",
    },
    chatContainerWrapper: {
      flex: 1,
      backgroundColor: "#13131A",
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    chatContainer: {
      flex: 1,
      marginBottom: 20,
    },
    chatContentContainer: {
      paddingBottom: 10,
    },
    emptyChat: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
    },
    aiAvatarLarge: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    },
    emptyChatTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 12,
      textAlign: "center",
    },
    emptyChatSubtitle: {
      fontSize: 16,
      color: "#aaa",
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 24,
    },
    suggestedPromptButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 24,
      borderWidth: 1,
      marginTop: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    suggestedPromptText: {
      fontSize: 14,
      fontWeight: "500",
    },
    messageContainer: {
      flexDirection: "row",
      marginBottom: 16,
      maxWidth: "100%",
    },
    userMessageContainer: {
      justifyContent: "flex-end",
    },
    aiMessageContainer: {
      justifyContent: "flex-start",
    },
    aiAvatar: {
      width: 35,
      height: 35,
      borderRadius: 17.5,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    aiMessageBubble: {
      backgroundColor: "#1E1E2D",
      borderRadius: 16,
      padding: 16,
      maxWidth: "80%",
      borderLeftWidth: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    aiMessageText: {
      color: "#fff",
      fontSize: 15,
      lineHeight: 22,
    },
    userMessageBubble: {
      backgroundColor: "#2B2B40",
      borderRadius: 16,
      padding: 16,
      maxWidth: "80%",
      alignSelf: "flex-end",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    userMessageText: {
      color: "#fff",
      fontSize: 15,
      lineHeight: 22,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#1E1E2D",
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    aiInput: {
      flex: 1,
      minHeight: 40,
      color: "#fff",
      maxHeight: 100,
      fontSize: 15,
      paddingVertical: 8,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
    },
    // Profile Menu Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "flex-start",
      alignItems: "flex-end",
    },
    profileMenuContainer: {
      width: 280,
      backgroundColor: "#13131A",
      borderRadius: 16,
      marginTop: 70,
      marginRight: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 15,
      overflow: "hidden",
    },
    profileMenuContainerSmall: {
      width: 240,
      marginRight: 15,
    },
    profileMenuHeader: {
      padding: 20,
    },
    profileMenuUserInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    profileMenuAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    profileMenuAvatarFallback: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "#4361EE",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    profileMenuAvatarText: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "bold",
    },
    profileMenuUserDetails: {
      marginLeft: 15,
      flex: 1,
    },
    profileMenuUserName: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    profileMenuUserEmail: {
      color: "#aaa",
      fontSize: 14,
      marginTop: 2,
    },
    profileMenuDivider: {
      height: 1,
      backgroundColor: "#222",
      marginVertical: 10,
    },
    profileMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
    },
    profileMenuItemIcon: {
      marginRight: 15,
    },
    profileMenuItemText: {
      color: "#fff",
      fontSize: 16,
    },
    logoutMenuItem: {
      marginTop: 5,
      marginBottom: 10,
    },
    logoutMenuItemText: {
      color: "#f44336",
      fontSize: 16,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Top Bar */}
        <BlurView intensity={30} tint="dark" style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
              <MenuIcon size={24} color="#fff" />
            </TouchableOpacity>
            <LinearGradient
              colors={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].gradient}
              style={styles.topBarAgentIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar}
            </LinearGradient>
            <Text style={styles.topBarTitle}>{AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].name}</Text>
          </View>

          {/* Clerk User Profile Button */}
          <TouchableOpacity style={styles.profileButton} onPress={() => setShowProfileMenu(true)}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.profileIcon} />
            ) : (
              <LinearGradient
                colors={["#4361EE", "#3A56DD"]}
                style={styles.profileIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.profileInitial}>
                  {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                </Text>
              </LinearGradient>
            )}
            <Text style={styles.profileText}>
              {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Profile"}
            </Text>
            <ChevronDown size={18} color="#777" />
          </TouchableOpacity>
        </BlurView>

        {/* Main Content Body - AI Chat interface */}
        <View style={styles.chatMainContainer}>
          <View style={styles.aiSectionHeader}>
            <View style={styles.aiSectionHeaderLeft}>
              <LinearGradient
                colors={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].gradient}
                style={styles.agentIconLarge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar}
              </LinearGradient>
              <View>
                <Text style={styles.aiSectionTitle}>{AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].name}</Text>
                <Text style={styles.aiSectionSubtitle}>
                  {selectedAgent === "NFT"
                    ? "Expert in NFTs and digital assets"
                    : selectedAgent === "TRADING"
                      ? "Specialist in trading strategies"
                      : selectedAgent === "ANALYSIS"
                        ? "Expert in market analysis"
                        : "Specialist in trading automation"}
                </Text>
              </View>
            </View>

            {getCurrentAgentChat().length > 0 && (
              <TouchableOpacity
                style={[
                  styles.newChatButton,
                  { backgroundColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color },
                ]}
                onPress={() => {
                  const updatedChatHistory = chatHistory.map((chat) => {
                    if (chat.agent === selectedAgent) {
                      return { ...chat, messages: [] }
                    }
                    return chat
                  })
                  setChatHistory(updatedChatHistory)
                }}
              >
                <RefreshCw size={16} color="#fff" />
                <Text style={styles.newChatButtonText}>New Chat</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.chatContainerWrapper}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatContainer}
              contentContainerStyle={styles.chatContentContainer}
            >
              {renderChatMessages()}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.aiInput}
                placeholder={`Ask ${AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].name.toLowerCase()} about trading...`}
                placeholderTextColor="#777"
                value={userInput}
                onChangeText={setUserInput}
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: loading ? "#555" : AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color,
                    opacity: loading || !userInput.trim() ? 0.7 : 1,
                  },
                ]}
                onPress={handleAiInteraction}
                disabled={loading || !userInput.trim()}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Send size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Slide-in Menu */}
      <SlideInMenu />

      {/* Profile Menu Modal */}
      <ProfileMenu />
    </View>
  )
}

export default HomeScreen