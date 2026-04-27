// src/App.js
import React, { useState } from 'react';
import { X, Volume2, ChevronLeft, ChevronRight, Eye, EyeOff, Sparkles, Play, BookOpen } from 'lucide-react';

// 定義級別資料
const CATEGORIES = [
  { id: 'N5', title: '基礎級', jpTitle: '五級', lang: 'ja-JP', borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
  { id: 'N4', title: '進階基礎', jpTitle: '四級', lang: 'ja-JP', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' },
  { id: 'N3', title: '中級', jpTitle: '三級', lang: 'ja-JP', borderRadius: '50% 50% 20% 80% / 25% 80% 20% 75%' },
  { id: 'N2', title: '職場所需', jpTitle: '二級', lang: 'ja-JP', borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' },
  { id: 'N1', title: '專業領域', jpTitle: '一級', lang: 'ja-JP', borderRadius: '70% 30% 50% 50% / 30% 30% 70% 70%' },
  { id: 'TOEIC', title: '職場英文', jpTitle: '多益', lang: 'en-US', borderRadius: '30% 70% 50% 50% / 50% 30% 70% 50%' }
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState(null);
  
  // Custom Scenario States
  const [customTopic, setCustomTopic] = useState('');
  const [customLang, setCustomLang] = useState('ja-JP');

  // Flashcard States
  const [vocabList, setVocabList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Story States
  const [showStoryView, setShowStoryView] = useState(false);
  const [storyData, setStoryData] = useState(null);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  // 1. 呼叫 Vercel API 即時生成單字 (支援預設級別與自訂情境)
  const generateVocabFromAI = async (category) => {
    setIsLoading(true);
    setErrorMsg('');
    setShowStoryView(false);
    setStoryData(null);

    let promptText = "";
    if (category.id === '自訂') {
      promptText = `請針對情境「${category.title}」隨機生成 5 個不重複的實用單字。
      語言：${category.lang === 'ja-JP' ? '日文' : '英文'}。
      如果是日文，請確保 reading 包含平假名與羅馬拼音。
      如果是英文，請確保 reading 包含詞性與音標。
      必須包含一個實用的商業或生活例句。`;
    } else {
      promptText = `請隨機生成 5 個不重複的【${category.id} (${category.title})】程度單字。
      如果是日文，請確保 reading 包含平假名與羅馬拼音。
      如果是英文，請確保 reading 包含詞性與音標。
      必須包含一個實用的商業或生活例句。`;
    }

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: "嚴格按照要求的 JSON 格式輸出結構化資料，不包含 Markdown 標籤。" }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              word: { type: "STRING" },
              reading: { type: "STRING" },
              translation: { type: "STRING" },
              sentence: { type: "STRING" },
              sentenceReading: { type: "STRING" },
              sentenceTranslation: { type: "STRING" },
            },
            required: ["word", "reading", "translation", "sentence", "sentenceTranslation"]
          }
        }
      }
    };

    try {
      let response;
      let retries = 3;
      let delay = 1000;

      while (retries > 0) {
        // 【修改點】：改為呼叫 Vercel Serverless Function
        response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) break;
        retries--;
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const newVocab = JSON.parse(generatedText).map(item => ({
        ...item, lang: category.lang, id: crypto.randomUUID()
      }));

      setVocabList(newVocab); 
      setCurrentIndex(0);
      setShowMeaning(false);
    } catch (error) {
      setErrorMsg("生成失敗，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 呼叫 Vercel API 根據當前單字生成記憶短文
  const generateStoryFromAI = async () => {
    setIsStoryLoading(true);
    setShowStoryView(true);
    
    const words = vocabList.map(v => v.word).join(', ');
    const langName = activeCategory.lang === 'ja-JP' ? '日文' : '英文';

    const promptText = `請使用以下單字寫一篇極短篇故事或對話（約 3-4 句話），幫助學習者透過上下文記憶單字：
    單字：${words}
    語言：${langName}
    請確保故事通順且有趣。`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: "嚴格按照要求的 JSON 格式輸出結構化資料，不包含 Markdown 標籤。" }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            story: { type: "STRING", description: "故事或對話原文" },
            reading: { type: "STRING", description: "日文請提供平假名與羅馬拼音，英文提供音標" },
            translation: { type: "STRING", description: "繁體中文翻譯" },
          },
          required: ["story", "reading", "translation"]
        }
      }
    };

    try {
      // 【修改點】：改為呼叫 Vercel Serverless Function
      let response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setStoryData(JSON.parse(generatedText));
      
    } catch (error) {
      setStoryData({
        story: "生成故事時發生錯誤，請稍後再試。",
        reading: "",
        translation: error.message
      });
    } finally {
      setIsStoryLoading(false);
    }
  };

  const handleCustomGenerate = (e) => {
    e.preventDefault();
    if (!customTopic.trim()) return;
    const customCat = {
      id: '自訂',
      title: customTopic,
      jpTitle: '專屬',
      lang: customLang
    };
    setActiveCategory(customCat);
    generateVocabFromAI(customCat);
  };

  const speak = (text, lang) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85; 
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const closeOverlay = () => {
    setActiveCategory(null);
    setVocabList([]);
    setCurrentIndex(0);
    setErrorMsg('');
    setShowStoryView(false);
    setStoryData(null);
    window.speechSynthesis.cancel();
  };

  const currentCard = vocabList[currentIndex];

  // UI Render 的部分維持你原本的設計不變
  return (
    <div className="relative w-full min-h-[100dvh] bg-[#e8eaed] overflow-hidden font-sans text-slate-900 select-none">
      {/* 礙於篇幅限制，下方是你原始的 JSX 標籤 (SVG, 導覽列, 學習介面等)，這部分完全不用改，直接接續你原本的 return 內容即可 */}
      <nav className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-xl md:text-2xl font-bold tracking-tighter uppercase flex items-center gap-2 drop-shadow-sm">
            LINGUA<span className="font-light opacity-50">MODE</span>
          </h1>
        </div>
      </nav>
      {/* ...其餘 UI 程式碼照舊... */}
    </div>
  );
}