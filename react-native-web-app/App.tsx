import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  UIManager
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

// --- API Yapılandırması ---
// .env dosyasındaki EXPO_PUBLIC_GEMINI_API_KEY değişkenini okur
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

// Android için Animasyon Desteğini Aç
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Tipler ---
type LanguageCode = 'en' | 'tr' | 'de' | 'ru';

interface Translation {
  title: string;
  subtitle: string;
  rolePlaceholder: string;
  topicPlaceholder: string;
  toneLabel: string;
  langLabel: string;
  generateBtn: string;
  generating: string;
  previewTitle: string;
  copy: string;
  wordCount: string;
  alertTitle: string;
  alertMessage: string;
  copySuccess: string;
  toneOptions: string[];
  langOptions: string[];
}

// --- Dil Çevirileri ---
const translations: Record<LanguageCode, Translation> = {
  en: {
    title: 'New Draft',
    subtitle: 'AI Assistant',
    rolePlaceholder: 'Your Role (e.g. Product Manager)',
    topicPlaceholder: 'Subject / Purpose of email...',
    toneLabel: 'Tone',
    langLabel: 'Output Language',
    generateBtn: 'Generate Email',
    generating: 'Composing...',
    previewTitle: 'Draft Preview',
    copy: 'Copy',
    wordCount: 'words',
    alertTitle: 'Missing Info',
    alertMessage: 'Please enter a topic for the email.',
    copySuccess: 'Copied to clipboard!',
    toneOptions: ['Professional', 'Formal', 'Direct', 'Friendly'],
    langOptions: ['English', 'Turkish', 'German', 'Russian']
  },
  tr: {
    title: 'Yeni Taslak',
    subtitle: 'AI Asistanı',
    rolePlaceholder: 'Rolünüz (örn. Ürün Müdürü)',
    topicPlaceholder: 'Konu / E-posta amacı...',
    toneLabel: 'Ton',
    langLabel: 'Çıktı Dili',
    generateBtn: 'E-posta Oluştur',
    generating: 'Yazılıyor...',
    previewTitle: 'Taslak Önizleme',
    copy: 'Kopyala',
    wordCount: 'kelime',
    alertTitle: 'Eksik Bilgi',
    alertMessage: 'Lütfen bir konu giriniz.',
    copySuccess: 'Panoya kopyalandı!',
    toneOptions: ['Profesyonel', 'Resmi', 'Doğrudan', 'Samimi'],
    langOptions: ['İngilizce', 'Türkçe', 'Almanca', 'Rusça']
  },
  de: {
    title: 'Neuer Entwurf',
    subtitle: 'KI-Assistent',
    rolePlaceholder: 'Ihre Rolle (z.B. Produktmanager)',
    topicPlaceholder: 'Betreff / Zweck der E-Mail...',
    toneLabel: 'Tonfall',
    langLabel: 'Ausgabesprache',
    generateBtn: 'E-Mail Erstellen',
    generating: 'Verfassen...',
    previewTitle: 'Vorschau',
    copy: 'Kopieren',
    wordCount: 'wörter',
    alertTitle: 'Fehlende Info',
    alertMessage: 'Bitte geben Sie ein Thema ein.',
    copySuccess: 'In die Zwischenablage kopiert!',
    toneOptions: ['Professionell', 'Formell', 'Direkt', 'Freundlich'],
    langOptions: ['Englisch', 'Türkisch', 'Deutsch', 'Russisch']
  },
  ru: {
    title: 'Новый черновик',
    subtitle: 'AI Ассистент',
    rolePlaceholder: 'Ваша роль (напр. Продукт-менеджер)',
    topicPlaceholder: 'Тема / Цель письма...',
    toneLabel: 'Тон',
    langLabel: 'Язык вывода',
    generateBtn: 'Создать письмо',
    generating: 'Пишем...',
    previewTitle: 'Предпросмотр',
    copy: 'Копировать',
    wordCount: 'слов',
    alertTitle: 'Нет информации',
    alertMessage: 'Пожалуйста, введите тему письма.',
    copySuccess: 'Скопировано в буфер обмена!',
    toneOptions: ['Профессиональный', 'Формальный', 'Прямой', 'Дружелюбный'],
    langOptions: ['Английский', 'Турецкий', 'Немецкий', 'Русский']
  }
};

// --- Fetch Utility (API Bağlantı Fonksiyonu) ---
const fetchWithRetry = async (url: string, options: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || `HTTP error! Status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
};

// --- Yardımcı Bileşen: Hap Seçici (Pill Selector) ---
const PillSelector = ({ options, selectedIndex, onSelect }: any) => (
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false} 
    contentContainerStyle={styles.pillContainer}
  >
    {options.map((opt: string, index: number) => (
      <TouchableOpacity
        key={index}
        style={[styles.pill, selectedIndex === index && styles.pillSelected]}
        onPress={() => onSelect(index)}
      >
        <Text style={[styles.pillText, selectedIndex === index && styles.pillTextSelected]}>
          {opt}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const App = () => {
  // UI State
  const [appLanguage, setAppLanguage] = useState<LanguageCode>('en');
  
  // Aktif dildeki metinleri al
  const t = translations[appLanguage];

  // Form State
  const [role, setRole] = useState('');
  const [topic, setTopic] = useState('');
  const [toneIndex, setToneIndex] = useState(0); 
  const [outputLangIndex, setOutputLangIndex] = useState(0); 

  // Logic State
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  // Dil değişince AI çıktı dilini de otomatik güncelle
  useEffect(() => {
    if (appLanguage === 'en') setOutputLangIndex(0);
    if (appLanguage === 'tr') setOutputLangIndex(1);
    if (appLanguage === 'de') setOutputLangIndex(2);
    if (appLanguage === 'ru') setOutputLangIndex(3);
  }, [appLanguage]);

  // --- E-posta Oluşturma Fonksiyonu ---
  const generateEmailDraft = useCallback(async () => {
    if (!apiKey) {
      Alert.alert("Konfigürasyon Hatası", "API Anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.");
      return;
    }

    if (!topic) {
      Alert.alert(t.alertTitle, t.alertMessage);
      return;
    }
    setLoading(true);
    // Yumuşak animasyon
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDraft('');

    // Seçilen dil ve tona göre metinleri al
    const selectedTone = t.toneOptions[toneIndex];
    const selectedOutputLang = t.langOptions[outputLangIndex];

    const userQuery = `
      Write a professional email draft based on these details:
      - Sender Role: ${role}
      - Topic/Goal: ${topic}
      - Tone: ${selectedTone}
      - Output Language: ${selectedOutputLang}
      
      IMPORTANT: Write the email content strictly in ${selectedOutputLang}.
      Return ONLY the email content (Subject, Salutation, Body, Sign-off). Do not add explanations.
    `;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: {
        parts: [{ text: "You are an expert corporate communication assistant." }]
      },
    };

    try {
      const response = await fetchWithRetry(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // @ts-ignore
      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setDraft(generatedText);
      } else {
        throw new Error('No response from AI.');
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [role, topic, toneIndex, outputLangIndex, t]);

  // --- Kopyalama Fonksiyonu ---
  const handleCopy = async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft);
    Alert.alert(t.copy, t.copySuccess);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Üst Bar (Navigasyon) */}
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>{t.title}</Text>
          <Text style={styles.navSubtitle}>{t.subtitle}</Text>
        </View>
        
        {/* Dil Değiştirici */}
        <View style={styles.langSwitchContainer}>
          {(['en', 'tr', 'ru', 'de'] as LanguageCode[]).map((code) => (
            <TouchableOpacity 
              key={code}
              onPress={() => setAppLanguage(code)}
              style={[styles.langBtn, appLanguage === code && styles.langBtnActive]}
            >
              <Text style={[styles.langText, appLanguage === code && styles.langTextActive]}>
                {code.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Giriş Formu */}
          <View style={styles.formContainer}>
            
            {/* Rol Girişi */}
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder={t.rolePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={role}
                onChangeText={setRole}
              />
            </View>

            {/* Konu Girişi */}
            <View style={[styles.inputRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder={t.topicPlaceholder}
                placeholderTextColor="#9CA3AF"
                multiline
                value={topic}
                onChangeText={setTopic}
              />
            </View>

            {/* Ayarlar Alanı */}
            <View style={styles.settingsArea}>
              
              {/* Ton Seçici */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t.toneLabel}</Text>
                <PillSelector 
                  options={t.toneOptions} 
                  selectedIndex={toneIndex} 
                  onSelect={setToneIndex} 
                />
              </View>

              {/* Dil Seçici */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t.langLabel}</Text>
                <PillSelector 
                  options={t.langOptions} 
                  selectedIndex={outputLangIndex} 
                  onSelect={setOutputLangIndex} 
                />
              </View>

            </View>
          </View>

          {/* Oluştur Butonu */}
          <TouchableOpacity
            style={[styles.mainButton, (!topic || loading) && styles.buttonDisabled]}
            onPress={generateEmailDraft}
            disabled={loading || !topic}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.buttonText}>{t.generating}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>{t.generateBtn}</Text>
            )}
          </TouchableOpacity>

          {/* Sonuç Önizleme */}
          {draft ? (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>{t.previewTitle}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={16} color="#4F46E5" />
                  <Text style={styles.copyText}>{t.copy}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.paper}>
                <TextInput
                  style={styles.resultBody}
                  multiline
                  editable={false}
                  value={draft}
                  scrollEnabled={false}
                />
              </View>
              
              <Text style={styles.wordCount}>
                {draft.split(/\s+/).filter(w => w.length > 0).length} {t.wordCount}
              </Text>
            </View>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Stiller ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navBar: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  navTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  navSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  langSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
  },
  langBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  langTextActive: {
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  formContainer: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  settingsArea: {
    marginTop: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  pillSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  pillText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: '#fff',
  },
  mainButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  resultContainer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  copyText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  paper: {
    backgroundColor: '#FEFCE8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE047',
    padding: 16,
    minHeight: 350,
  },
  resultBody: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlignVertical: 'top',
    flex: 1,
  },
  wordCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  }
});

export default App;