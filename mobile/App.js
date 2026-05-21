import React, { useState, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import RootNavigator from './src/navigation';
import LoadingScreen from './src/screens/LoadingScreen';
import { authAPI } from './src/api/index';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const navigationRef = createNavigationContainerRef();

async function registerPushToken() {
  if (Platform.OS === 'web') return;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;
  const tokenData = await Notifications.getExpoPushTokenAsync();
  try {
    await authAPI.updateProfile({ expo_push_token: tokenData.data });
  } catch (_) {}
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await SplashScreen.hideAsync();
      setReady(true);
    };
    prepare();
  }, []);

  useEffect(() => {
    if (!ready) return;
    registerPushToken();

    // Navigue vers les invitations si l'app est ouverte via notif
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'family_invite' && navigationRef.isReady()) {
        navigationRef.navigate('Invitations');
      }
    });
    return () => sub.remove();
  }, [ready]);

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="auto" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
