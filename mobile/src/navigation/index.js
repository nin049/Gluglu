import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ProductScreen from '../screens/ProductScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScanDetailScreen from '../screens/ScanDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: '#FAFAF8' },
  headerShadowVisible: false,
  headerTintColor: '#1C1C1E',
  headerTitleStyle: { fontWeight: '600', fontSize: 16, letterSpacing: -0.2 },
  headerBackTitle: '',
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function ScannerStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="ScannerMain" component={ScannerScreen} options={{ title: 'Scanner' }} />
      <Stack.Screen name="Product" component={ProductScreen} options={{ title: 'Résultat' }} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FAFAF8',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#1C2B1D',
        tabBarInactiveTintColor: '#BDBDBD',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
      }}
    >
      <Tab.Screen
        name="Scanner"
        component={ScannerStack}
        options={{
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color }) => (
            <View style={{
              width: 22, height: 22, borderWidth: 2, borderColor: color,
              borderRadius: 4, justifyContent: 'center', alignItems: 'center',
            }}>
              <View style={{ width: 10, height: 10, borderWidth: 1.5, borderColor: color }} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Historique"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color }) => (
            <View style={{ gap: 3 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ width: 18, height: 2, backgroundColor: color, borderRadius: 1 }} />
              ))}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={AppTabs} />
      <RootStack.Screen
        name="ScanDetail"
        component={ScanDetailScreen}
        options={{ ...HEADER_OPTIONS, headerShown: true, title: 'Détail' }}
      />
      <RootStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ ...HEADER_OPTIONS, headerShown: true, title: 'Mon profil' }}
      />
    </RootStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF8' }}>
        <ActivityIndicator color="#1C2B1D" />
      </View>
    );
  }

  return user ? <AppNavigator /> : <AuthStack />;
}

