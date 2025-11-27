import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import HomeScreen from './screens/HomeScreen';
import TissuesScreen from './screens/TissuesScreen';
import CatalogScreen from './screens/CatalogScreen';
import LinkDetailsScreen from './screens/LinkDetailsScreen';
import TissueDetailsScreen from './screens/TissueDetailsScreen';
import LoginScreen from './screens/LoginScreen';
import StockOutFlowScreen from './screens/StockOutFlowScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Início') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Tecidos') {
            iconName = focused ? 'layers' : 'layers-outline';
          } else if (route.name === 'Catálogo') {
            iconName = focused ? 'book' : 'book-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Tecidos" component={TissuesScreen} />
      <Tab.Screen name="Catálogo" component={CatalogScreen} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="LinkDetails" component={LinkDetailsScreen} />
            <Stack.Screen name="TissueDetails" component={TissueDetailsScreen} />
            <Stack.Screen name="StockOutFlow" component={StockOutFlowScreen} />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from './lib/queryClient';

export default function App() {
  return (
    <PersistQueryClientProvider 
      client={queryClient} 
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <SafeAreaProvider>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

