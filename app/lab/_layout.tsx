import { Stack } from 'expo-router';

export default function LabLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          animation: 'slide_from_bottom'
        }}
      />
    </Stack>
  );
}

