import { OPENAI_API_KEY } from '@env';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Define AI agent types and their specialized knowledge
const AI_AGENTS = {
  NFT: {
    name: 'NFT Specialist',
    avatar: 'paint-brush',
    color: '#4361EE',
    systemPrompt: "You are an NFT specialist AI assistant. You have deep knowledge of NFT marketplaces, digital art valuation, blockchain technology, and NFT trading strategies. Provide concise, accurate information about NFTs, digital collectibles, and the NFT ecosystem."
  },
  TRADING: {
    name: 'Trading Expert',
    avatar: 'chart-line',
    color: '#F48C06',
    systemPrompt: "You are a real-time trading expert AI assistant. You have extensive knowledge of market dynamics, trading indicators, risk management, and execution strategies. Provide concise, practical advice on trading decisions, market trends, and trading strategies."
  },
  ANALYSIS: {
    name: 'Market Analyst',
    avatar: 'analytics',
    color: '#F94144',
    systemPrompt: "You are a market analysis AI assistant. You excel at interpreting market data, identifying patterns, and explaining complex economic factors. Provide concise insights on market trends, sector analysis, and economic indicators that affect investment decisions."
  },
  BOT: {
    name: 'Trading Bot',
    avatar: 'robot',
    color: '#43AA8B',
    systemPrompt: "You are an automated trading bot assistant. You specialize in algorithmic trading strategies, bot configuration, and automated execution systems. Provide concise advice on building, configuring, and optimizing trading bots for various market conditions."
  }
};

const { width } = Dimensions.get('window');
const EXPANDED_MENU_WIDTH = width * 0.22; // Width when expanded
const COLLAPSED_MENU_WIDTH = 60; // Width when collapsed

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onPress: () => void;
  isAgent?: boolean;
  agentColor?: string;
};

const HomeScreen = () => {
  const router = useRouter();
  const [aiResponse, setAiResponse] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('BOT');
  const [chatHistory, setChatHistory] = useState<{agent: string, messages: {role: string, content: string}[]}[]>([
    { agent: 'NFT', messages: [] },
    { agent: 'TRADING', messages: [] },
    { agent: 'ANALYSIS', messages: [] },
    { agent: 'BOT', messages: [] }
  ]);
  const [menuExpanded, setMenuExpanded] = useState(true);
  
  // Animated menu width
  const menuWidth = useRef(new Animated.Value(EXPANDED_MENU_WIDTH)).current;

  // Animation for menu expansion/collapse
  useEffect(() => {
    Animated.timing(menuWidth, {
      toValue: menuExpanded ? EXPANDED_MENU_WIDTH : COLLAPSED_MENU_WIDTH,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [menuExpanded]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    router.replace('/');
  };

  const handleAgentSelection = (agentKey: string) => {
    setSelectedAgent(agentKey);
    // Collapse menu after selection on smaller screens
    if (width < 768) {
      setMenuExpanded(false);
    }
  };

  const getCurrentAgentChat = () => {
    return chatHistory.find(chat => chat.agent === selectedAgent)?.messages || [];
  };

  const handleAiInteraction = async () => {
    if (!userInput.trim()) return;
    
    // Add user message to chat history
    const updatedChatHistory = chatHistory.map(chat => {
      if (chat.agent === selectedAgent) {
        return {
          ...chat,
          messages: [
            ...chat.messages,
            { role: 'user', content: userInput }
          ]
        };
      }
      return chat;
    });
    
    setChatHistory(updatedChatHistory);
    setUserInput('');
    setLoading(true);
    
    try {
      // Prepare messages for API call with system prompt
      const currentAgentChat = updatedChatHistory.find(chat => chat.agent === selectedAgent)?.messages || [];
      const messagesForAPI = [
        {
          role: "system",
          content: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].systemPrompt
        },
        ...currentAgentChat.slice(-5) // Include last 5 messages for context
      ];
      
      // OpenAI API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messagesForAPI,
          max_tokens: 150
        })
      });
      
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        const assistantMessage = data.choices[0].message.content;
        
        // Add assistant response to chat history
        const finalChatHistory = chatHistory.map(chat => {
          if (chat.agent === selectedAgent) {
            return {
              ...chat,
              messages: [
                ...chat.messages,
                { role: 'user', content: userInput },
                { role: 'assistant', content: assistantMessage }
              ]
            };
          }
          return chat;
        });
        
        setChatHistory(finalChatHistory);
        setAiResponse(assistantMessage);
      }
    } catch (error) {
      // Add error message to chat
      const errorChatHistory = chatHistory.map(chat => {
        if (chat.agent === selectedAgent) {
          return {
            ...chat,
            messages: [
              ...chat.messages,
              { role: 'user', content: userInput },
              { role: 'assistant', content: "Sorry, I couldn't process your request. Please try again." }
            ]
          };
        }
        return chat;
      });
      
      setChatHistory(errorChatHistory);
      setAiResponse("Sorry, I couldn't process your request. Please try again.");
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChatMessages = () => {
    const currentChat = chatHistory.find(chat => chat.agent === selectedAgent);
    if (!currentChat || currentChat.messages.length === 0) {
      return (
        <View style={styles.emptyChat}>
          <View style={[styles.aiAvatarLarge, { backgroundColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}>
            {selectedAgent === 'ANALYSIS' ? (
              <Ionicons name="analytics-outline" size={40} color="#fff" />
            ) : (
              <FontAwesome5 name={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar} size={40} color="#fff" />
            )}
          </View>
          <Text style={styles.emptyChatTitle}>Chat with {AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].name}</Text>
          <Text style={styles.emptyChatSubtitle}>Ask any question about {selectedAgent === 'NFT' ? 'NFTs and digital assets' : 
            selectedAgent === 'TRADING' ? 'trading strategies and market moves' : 
            selectedAgent === 'ANALYSIS' ? 'market analysis and trends' : 
            'trading bots and automation'}</Text>
        </View>
      );
    }

    // Group consecutive messages by role
    const chatComponents = [];
    let lastRole = '';
    let messageGroup: {role: string, content: string}[] = [];

    currentChat.messages.forEach((message, index) => {
      if (message.role !== lastRole && messageGroup.length > 0) {
        // Render previous group
        chatComponents.push(
          <View 
            key={`group-${index}`} 
            style={[
              styles.messageContainer, 
              lastRole === 'user' ? styles.userMessageContainer : styles.aiMessageContainer
            ]}
          >
            {lastRole === 'assistant' && (
              <View style={[styles.aiAvatar, { backgroundColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}>
                {selectedAgent === 'ANALYSIS' ? (
                  <Ionicons name="analytics-outline" size={18} color="#fff" />
                ) : (
                  <FontAwesome5 name={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar} size={18} color="#fff" />
                )}
              </View>
            )}
            <View style={lastRole === 'user' ? styles.userMessageBubble : 
              [styles.aiMessageBubble, { borderLeftColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}>
              {messageGroup.map((msg, i) => (
                <Text key={i} style={lastRole === 'user' ? styles.userMessageText : styles.aiMessageText}>
                  {msg.content}
                </Text>
              ))}
            </View>
          </View>
        );
        messageGroup = [message];
      } else {
        messageGroup.push(message);
      }
      lastRole = message.role;
    });

    // Add the last group
    if (messageGroup.length > 0) {
      chatComponents.push(
        <View 
          key="last-group" 
          style={[
            styles.messageContainer, 
            lastRole === 'user' ? styles.userMessageContainer : styles.aiMessageContainer
          ]}
        >
          {lastRole === 'assistant' && (
            <View style={[styles.aiAvatar, { backgroundColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}>
              {selectedAgent === 'ANALYSIS' ? (
                <Ionicons name="analytics-outline" size={18} color="#fff" />
              ) : (
                <FontAwesome5 name={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar} size={18} color="#fff" />
              )}
            </View>
          )}
          <View style={lastRole === 'user' ? styles.userMessageBubble : 
            [styles.aiMessageBubble, { borderLeftColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}>
            {messageGroup.map((msg, i) => (
              <Text key={i} style={lastRole === 'user' ? styles.userMessageText : styles.aiMessageText}>
                {msg.content}
              </Text>
            ))}
          </View>
        </View>
      );
    }

    return chatComponents;
  };

  // Custom menu item component
  const MenuItem: React.FC<MenuItemProps> = ({ icon, label, isActive, onPress, isAgent = false, agentColor = '' }) => (
    <TouchableOpacity 
      style={[
        styles.menuItem, 
        isActive && styles.activeMenuItem,
        isAgent && isActive && { borderLeftColor: agentColor, borderLeftWidth: 3 }
      ]}
      onPress={onPress}
    >
      <View style={[
        styles.menuIconContainer,
        isAgent && { backgroundColor: isActive ? agentColor : 'transparent' }
      ]}>
        {icon}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.contentContainer}>
        {/* Collapsible Menu with only AI agents */}
        <Animated.View style={[styles.menu, { width: menuWidth }]}>
          <View style={styles.menuHeader}>
            <FontAwesome5 name="robot" size={24} color="#4CAF50" />
          </View>
          
          <View style={styles.agentsMenu}>
            {Object.entries(AI_AGENTS).map(([key, agent]) => (
              <MenuItem 
                key={key}
                icon={
                  key === 'ANALYSIS' 
                    ? <Ionicons 
                        name="analytics-outline" 
                        size={menuExpanded ? 20 : 22} 
                        color={selectedAgent === key ? "#fff" : "#888"} 
                      />
                    : <FontAwesome5 
                        name={agent.avatar} 
                        size={menuExpanded ? 20 : 22} 
                        color={selectedAgent === key ? "#fff" : "#888"} 
                      />
                }
                label={agent.name}
                isActive={selectedAgent === key}
                onPress={() => handleAgentSelection(key)}
                isAgent={true}
                agentColor={agent.color}
              />
            ))}
          </View>
          
          <TouchableOpacity 
            style={[styles.logoutButton, !menuExpanded && styles.collapsedLogoutButton]} 
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={menuExpanded ? 20 : 22} color="#f44336" />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          {/* Top Bar */}
          <BlurView intensity={30} tint="dark" style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={[styles.topBarAgentIcon, { backgroundColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}>
                {selectedAgent === 'ANALYSIS' ? (
                  <Ionicons name="analytics-outline" size={24} color="#fff" />
                ) : (
                  <FontAwesome5 name={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar} size={24} color="#fff" />
                )}
              </View>
            </View>
            
            <TouchableOpacity style={styles.profileButton}>
              <View style={styles.profileIcon}>
                <Text style={styles.profileInitial}>A</Text>
              </View>
              <Text style={styles.profileText}>Profile</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#777" />
            </TouchableOpacity>
          </BlurView>
          
          {/* Main Content Body - Only AI Chat interface */}
          <View style={styles.chatMainContainer}>
            <View style={styles.aiSectionHeader}>
              <View style={styles.aiSectionHeaderLeft}>
                <View style={[styles.agentIconLarge, { backgroundColor: AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]}>
                  {selectedAgent === 'ANALYSIS' ? (
                    <Ionicons name="analytics-outline" size={24} color="#fff" />
                  ) : (
                    <FontAwesome5 name={AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].avatar} size={24} color="#fff" />
                  )}
                </View>
                <View>
                  <Text style={styles.aiSectionTitle}>{AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].name}</Text>
                  <Text style={styles.aiSectionSubtitle}>
                    {selectedAgent === 'NFT' ? 'Expert in NFTs and digital assets' : 
                     selectedAgent === 'TRADING' ? 'Specialist in trading strategies' : 
                     selectedAgent === 'ANALYSIS' ? 'Expert in market analysis' : 
                     'Specialist in trading automation'}
                  </Text>
                </View>
              </View>
              
              {getCurrentAgentChat().length > 0 && (
                <TouchableOpacity 
                  style={styles.newChatButton}
                  onPress={() => {
                    const updatedChatHistory = chatHistory.map(chat => {
                      if (chat.agent === selectedAgent) {
                        return { ...chat, messages: [] };
                      }
                      return chat;
                    });
                    setChatHistory(updatedChatHistory);
                  }}
                >
                  <MaterialIcons name="refresh" size={16} color="#fff" />
                  <Text style={styles.newChatButtonText}>New Chat</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.chatContainerWrapper}>
              <ScrollView 
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
                  style={[styles.sendButton, { backgroundColor: loading ? '#555' : AI_AGENTS[selectedAgent as keyof typeof AI_AGENTS].color }]} 
                  onPress={handleAiInteraction}
                  disabled={loading || !userInput.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  menu: {
    backgroundColor: '#13131A',
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#222',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  logoContainer: {
    alignItems: 'center',
  },
  menuSectionTitle: {
    color: '#666',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingLeft: 10,
  },
  agentsMenu: {
    marginBottom: 20,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 15,
    borderRadius: 8,
    height: 50,
    width: 50,
    alignSelf: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  activeMenuItem: {
    backgroundColor: '#1E1E2D',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  collapsedLogoutButton: {
    left: 10,
    right: 10,
    justifyContent: 'center',
  },
  logoutText: {
    color: '#f44336',
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: 'rgba(19, 19, 26, 0.8)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarAgentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentAgentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentAgentName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#1E1E2D',
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4361EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  profileText: {
    color: '#fff',
    marginLeft: 8,
    marginRight: 5,
    fontSize: 14,
  },
  chatMainContainer: {
    flex: 1,
    padding: 25,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentIconLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  aiSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  aiSectionSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  newChatButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 13,
  },
  chatContainerWrapper: {
    flex: 1,
    backgroundColor: '#13131A',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  aiAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyChatSubtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  aiMessageBubble: {
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    padding: 15,
    maxWidth: '80%',
    borderLeftWidth: 3,
  },
  aiMessageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageBubble: {
    backgroundColor: '#2B2B40',
    borderRadius: 12,
    padding: 15,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  userMessageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2D',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  aiInput: {
    flex: 1,
    minHeight: 40,
    color: '#fff',
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});

export default HomeScreen; 