import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ProductScreen from '../screens/ProductScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2E7D32',
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tab.Screen
        name="Scanner"
        component={ScannerScreenStack}
        options={{ tabBarLabel: 'Scanner', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📷</Text> }}
      />
      <Tab.Screen
        name="Historique"
        component={HistoryScreen}
        options={{ tabBarLabel: 'Historique', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text> }}
      />
    </Tab.Navigator>
  );
}

function ScannerScreenStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ScannerMain" component={ScannerScreen} options={{ title: 'Scanner un produit' }} />
      <Stack.Screen name="Product" component={ProductScreen} options={{ title: 'Résultat' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return user ? <AppTabs /> : <AuthStack />;
}
