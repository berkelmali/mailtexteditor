# 📧 AI Corporate Email Assistant

![React Native](https://img.shields.io/badge/React_Native-0.76-blue?style=flat&logo=react)
![Expo](https://img.shields.io/badge/Expo-52-black?style=flat&logo=expo)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat&logo=typescript)
![Gemini AI](https://img.shields.io/badge/AI-Gemini_Flash-8E75B2?style=flat&logo=google)

A professional **React Native mobile application** designed to streamline corporate communication. This app leverages **Google's Gemini 2.5 Flash API** to generate context-aware, professional email drafts instantly. It features a modern "Mail App" UI, multi-language support, and seamless clipboard integration.

## 📸 Preview

<div align="center">
  <img src="https://via.placeholder.com/300x600?text=App+Preview+Here" alt="App Preview" width="300" />
</div>

*(Designed with a clean, native iOS/Android look and feel)*

## 🌟 Key Features

* **Multi-Language Architecture:** Full support for **English, Turkish, German, and Russian**. Changing the app language automatically adapts the AI's output language context.
* **Smart Tone Selection:** Dynamic "Pill Selector" allows users to switch tones (*Professional, Formal, Direct, Friendly*) instantly.
* **Gemini AI Integration:** Uses the latest `gemini-2.5-flash` model for high-speed, accurate text generation with retry logic for network resilience.
* **Modern UI/UX:** Features a clean, whitespace-heavy design inspired by native mail apps, utilizing `KeyboardAvoidingView` and `LayoutAnimation` for smooth interactions.
* **Secure Configuration:** API keys are managed securely using **Expo's Environment Variables** (`.env`).

## 🛠 Technical Implementation

### 1. Dynamic State & Localization
The app uses a robust state management system to sync UI language with AI prompt logic.

```typescript
// Auto-sync Output Language when App Interface Language changes
useEffect(() => {
  if (appLanguage === 'en') setOutputLangIndex(0);
  if (appLanguage === 'tr') setOutputLangIndex(1);
  // ... maps index to string for API
}, [appLanguage]);
```
### 2. Robust API Handling
Implements a custom fetchWithRetry utility to handle rate limits (429 errors) and network instability gracefully.
```typescript
const fetchWithRetry = async (url: string, options: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // ... fetch logic ...
      if (response.status === 429) {
        // Exponential backoff strategy
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) { /* handle error */ }
  }
};
```
### 3. Native Clipboard Integration
Uses expo-clipboard to provide a seamless "Copy to Clipboard" experience with native alert feedback.
```typescript
import * as Clipboard from 'expo-clipboard';

const handleCopy = async () => {
  if (!draft) return;
  await Clipboard.setStringAsync(draft);
  Alert.alert(t.copy, t.copySuccess);
};
```
### 🚀 How to Install & Run
1) Clone the repository:
   ```typescript
   git clone [https://github.com/berkelmali/mailtexteditor.git](https://github.com/berkelmali/mailtexteditor.git)
   cd mailtexteditor
   ```

2) Install Dependencies:
```typescript
npx expo install
```
3) Configure Environment: Create a .env file in the root directory and add your Gemini API Key. (You can get a key from Google AI Studio)
   ```typescript
   EXPO_PUBLIC_GEMINI_API_KEY=YOUR_API_KEY_HERE
   ```
4) Run the App:
   ```typescript
   npx expo start --clear
   ```
### 👨‍💻 Author Berk Elmalı
Developed as a demonstration of Modern Mobile Development, AI Integration, and UX Design in React Native.
