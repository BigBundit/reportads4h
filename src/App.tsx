import React, { useState, useRef } from 'react';
import { initialData } from './data';
import { GoogleGenAI, Type } from '@google/genai';
import { Upload, File, Loader2, X, AlertCircle, BarChart2, FileText, Settings, ExternalLink, Download, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const promptSchema = {
  type: Type.OBJECT,
  properties: {
    hospitals: {
      type: Type.OBJECT,
      properties: {
        bnh: {
          type: Type.OBJECT,
          properties: { count: { type: Type.STRING }, focusBadge: { type: Type.STRING }, ads: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, platform: { type: Type.STRING }, date: { type: Type.STRING }, price: { type: Type.STRING }, target: { type: Type.STRING }, type: { type: Type.STRING }, color: { type: Type.STRING }, detail: { type: Type.STRING }, imgDesc: { type: Type.STRING }, cta: { type: Type.STRING } } } } }
        },
        bkk: {
          type: Type.OBJECT,
          properties: { count: { type: Type.STRING }, focusBadge: { type: Type.STRING }, ads: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, platform: { type: Type.STRING }, date: { type: Type.STRING }, price: { type: Type.STRING }, target: { type: Type.STRING }, type: { type: Type.STRING }, color: { type: Type.STRING }, detail: { type: Type.STRING }, imgDesc: { type: Type.STRING }, cta: { type: Type.STRING } } } } }
        },
        bum: {
          type: Type.OBJECT,
          properties: { count: { type: Type.STRING }, focusBadge: { type: Type.STRING }, ads: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, platform: { type: Type.STRING }, date: { type: Type.STRING }, price: { type: Type.STRING }, target: { type: Type.STRING }, type: { type: Type.STRING }, color: { type: Type.STRING }, detail: { type: Type.STRING }, imgDesc: { type: Type.STRING }, cta: { type: Type.STRING } } } } }
        },
        med: {
          type: Type.OBJECT,
          properties: { count: { type: Type.STRING }, focusBadge: { type: Type.STRING }, ads: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, platform: { type: Type.STRING }, date: { type: Type.STRING }, price: { type: Type.STRING }, target: { type: Type.STRING }, type: { type: Type.STRING }, color: { type: Type.STRING }, detail: { type: Type.STRING }, imgDesc: { type: Type.STRING }, cta: { type: Type.STRING } } } } }
        },
        sam: {
          type: Type.OBJECT,
          properties: { count: { type: Type.STRING }, focusBadge: { type: Type.STRING }, ads: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, platform: { type: Type.STRING }, date: { type: Type.STRING }, price: { type: Type.STRING }, target: { type: Type.STRING }, type: { type: Type.STRING }, color: { type: Type.STRING }, detail: { type: Type.STRING }, imgDesc: { type: Type.STRING }, cta: { type: Type.STRING } } } } }
        }
      }
    },
    pricing: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          service: { type: Type.STRING },
          bnh: { type: Type.OBJECT, properties: { p1: { type: Type.STRING }, p2: { type: Type.STRING } } },
          bkk: { type: Type.OBJECT, properties: { p1: { type: Type.STRING }, p2: { type: Type.STRING } } },
          bum: { type: Type.OBJECT, properties: { p1: { type: Type.STRING }, p2: { type: Type.STRING } } },
          med: { type: Type.OBJECT, properties: { p1: { type: Type.STRING }, p2: { type: Type.STRING } } },
          sam: { type: Type.OBJECT, properties: { p1: { type: Type.STRING }, p2: { type: Type.STRING } } }
        }
      }
    },
    implications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { icon: { type: Type.STRING }, title: { type: Type.STRING }, desc: { type: Type.STRING }, border: { type: Type.STRING }, bg: { type: Type.STRING }, color: { type: Type.STRING } }
      }
    },
    timelineHeaders: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    bnhNextSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { 
          title: { type: Type.STRING }, 
          desc: { type: Type.STRING },
          priority: { type: Type.STRING }, // 'High', 'Medium', 'Low'
          icon: { type: Type.STRING }
        }
      }
    },
    updateDate: { type: Type.STRING },
    monthRange: { type: Type.STRING }
  }
};

export default function App() {
  const [data, setData] = useState(initialData);
  const [isUploading, setIsUploading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const allPdfs = Array.from(files).every(file => file.type === 'application/pdf');
    if (!allPdfs) {
      setErrorMsg('Please upload only PDF files.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setFileName(files.length === 1 ? files[0].name : `${files.length} files`);

    try {
      const currentKey = apiKey || (process.env.GEMINI_API_KEY as string);
      
      if (!currentKey || currentKey === 'undefined') {
        throw new Error('กรุณาตั้งค่า API Key ก่อนใช้งาน (ปุ่ม Settings มุมบนขวา)');
      }

      const fileParts = await Promise.all(
        Array.from(files).map(async (file) => {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
          });
          return { inlineData: { mimeType: 'application/pdf', data: base64Data } };
        })
      );

      const ai = new GoogleGenAI({ apiKey: currentKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            parts: [
              { text: `You are a competitive intelligence analyst. Extract data from the provided PDF reports. 
                Analyze the data specifically for the past 30 days (e.g., April 7, 2026 - May 7, 2026) or the most recent 30-day period available in the documents. Specify the exact date range in the monthRange output.
                Identify activity, pricing, strategy and ads for the following a hospitals: 
                - BNH Hospital (bnh)
                - Bangkok Hospital HQ (bkk)
                - Bumrungrad (bum)
                - MedPark (med)
                - Samitivej Sukhumvit (sam)
                
                CRITICAL: Based on the competitors activity, provide 3-4 specific "BNH Strategic Next Steps". These should be actionable advice for BNH Hospital to stay competitive. 
                For each step, provide a title, a detailed description (desc), a priority level, and a relevant emoji icon.

                For 'color' fields, use valid hex color codes that match the hospital brand or the specific context (e.g., #1e3a8a for bnh, #1A3B2B for bkk, #128A84 for bum, #E27447 for med, #7B4FA0 for sam).
                Provide accurate findings. If pricing is absent for a hospital, say "ไม่ระบุ" for p1. Highlight notable promotions by putting them in p1/p2.
                ` },
              ...fileParts
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: promptSchema
        }
      });

      const extractedData = JSON.parse(response.text.trim());
      
      // Merge with initial config structure (logos, base colors, etc stay same if not overridden)
      const mergedData = {
        ...data,
        hospitals: {
          bnh: { ...data.hospitals.bnh, ...extractedData.hospitals?.bnh },
          bkk: { ...data.hospitals.bkk, ...extractedData.hospitals?.bkk },
          bum: { ...data.hospitals.bum, ...extractedData.hospitals?.bum },
          med: { ...data.hospitals.med, ...extractedData.hospitals?.med },
          sam: { ...data.hospitals.sam, ...extractedData.hospitals?.sam }
        },
        pricing: extractedData.pricing || data.pricing,
        implications: extractedData.implications || data.implications,
        timelineHeaders: extractedData.timelineHeaders || data.timelineHeaders,
        bnhNextSteps: extractedData.bnhNextSteps || data.bnhNextSteps,
        updateDate: extractedData.updateDate || data.updateDate,
        monthRange: extractedData.monthRange || data.monthRange
      };

      setData(mergedData);
    } catch (err: any) {
      console.error(err);
      let msg = 'Failed to analyze PDF. Please try again. ';
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        msg = '⚠️ โควตา API เต็มชั่วคราว (Rate Limit) กรุณารอสัก 10-60 วินาทีแล้วลองใหม่ครับ';
      } else {
        msg += (err.message || '');
      }
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLiveAnalysis = async () => {
    setIsUploading(true);
    setErrorMsg('');
    setFileName('Live Search URLs');

    try {
      const currentKey = apiKey || (process.env.GEMINI_API_KEY as string);
      
      if (!currentKey || currentKey === 'undefined') {
        throw new Error('กรุณาตั้งค่า API Key ก่อนใช้งาน (ปุ่ม Settings มุมบนขวา)');
      }

      const ai = new GoogleGenAI({ apiKey: currentKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: `You are a competitive intelligence analyst. Search the internet and analyze the current Facebook Ads and Google Ads strategies for the following hospitals in Thailand specifically focusing on the past 30 days (e.g., April 7, 2026 - May 7, 2026):
                - BNH Hospital (bnh)
                - Bangkok Hospital HQ (bkk)
                - Bumrungrad (bum)
                - MedPark (med)
                - Samitivej Sukhumvit (sam)
                
                Use Google Search to find recent news, promotions, and marketing campaigns from the last 30 days for these hospitals. Specify the exact 30-day date range in the monthRange output.
                CRITICAL: Provide 3-4 specific "BNH Strategic Next Steps". These should be actionable advice for BNH Hospital to stay competitive. 
                For each step, provide a title, a detailed description (desc), a priority level, and a relevant emoji icon.

                For 'color' fields, use valid hex color codes that match the hospital brand or the specific context (e.g., #1e3a8a for bnh, #1A3B2B for bkk, #128A84 for bum, #E27447 for med, #7B4FA0 for sam).
                Provide accurate findings based on search results.
                ` }
            ]
          }
        ],
        tools: [{ googleSearch: {} }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: promptSchema
        }
      });

      const extractedData = JSON.parse(response.text.trim());
      
      const mergedData = {
        ...data,
        hospitals: {
          bnh: { ...data.hospitals.bnh, ...extractedData.hospitals?.bnh },
          bkk: { ...data.hospitals.bkk, ...extractedData.hospitals?.bkk },
          bum: { ...data.hospitals.bum, ...extractedData.hospitals?.bum },
          med: { ...data.hospitals.med, ...extractedData.hospitals?.med },
          sam: { ...data.hospitals.sam, ...extractedData.hospitals?.sam }
        },
        pricing: extractedData.pricing || data.pricing,
        implications: extractedData.implications || data.implications,
        timelineHeaders: extractedData.timelineHeaders || data.timelineHeaders,
        bnhNextSteps: extractedData.bnhNextSteps || data.bnhNextSteps,
        updateDate: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
        monthRange: 'Live Update'
      };

      setData(mergedData);
    } catch (err: any) {
      console.error(err);
      let msg = 'Failed to analyze from URLs. Please try again. ';
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        msg = '⚠️ โควตา API เต็มชั่วคราว (Rate Limit) กรุณารอสัก 10-60 วินาทีแล้วลองใหม่ครับ';
      } else {
        msg += (err.message || '');
      }
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const openModal = (hospitalId: string) => {
    const hosp = data.hospitals[hospitalId as keyof typeof data.hospitals];
    // Find matching competitor data to get links from Section 5
    const comp = data.competitorsData.find((c: any) => c.name.includes(hosp.name) || hosp.name.includes(c.name));
    setModalData({ ...hosp, links: comp?.links || [] });
  };

  const closeModal = () => {
    setModalData(null);
  };

  const hospKeys = ['bnh', 'bkk', 'bum', 'med', 'sam'] as const;

  const handleExportPDF = () => {
    window.print();
  };

  const saveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newKey = formData.get('apiKey') as string;
    setApiKey(newKey);
    localStorage.setItem('GEMINI_API_KEY', newKey);
    setShowSettings(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-4 font-sans text-slate-900 selection:bg-teal-200">
      
      {/* HEADER SECTION */}
      <div className="bg-[#1A3B2B] text-white rounded-xl p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-3 shadow-sm print:bg-white print:text-slate-900 print:border-b print:border-slate-200 print:shadow-none print:rounded-none px-4">
        <div>
          <div className="text-[12px] tracking-widest text-emerald-300 print:text-slate-500 mb-1 uppercase font-semibold">BNH Hospital · Competitive Intelligence</div>
          <h1 className="text-2xl md:text-3xl font-extrabold m-0 text-white print:text-slate-900 flex items-center gap-2">
            🏥 สมรภูมิโรงพยาบาลพรีเมียม
          </h1>
          <p className="text-emerald-200 print:text-slate-600 text-sm mt-1 mb-3">
            วิเคราะห์ 4 คู่แข่งหลัก · {fileName ? `ข้อมูลจาก ${fileName}` : 'ข้อมูลจริงจาก FB Ad Library'} · {data.monthRange}
          </p>
          <div className="flex flex-wrap items-center gap-2 no-print">
             <a href="https://www.facebook.com/ads/library/" target="_blank" rel="noopener noreferrer" className="bg-[#0866FF] hover:bg-blue-600 transition-colors text-white text-[12px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
               FB Ads Library <ExternalLink className="w-3 h-3" />
             </a>
             <a href="https://adstransparency.google.com/" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-white text-[12px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
               Google Ads Transparency <ExternalLink className="w-3 h-3" />
             </a>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 w-full md:w-auto md:text-right">
          <div className="bg-emerald-900/50 print:bg-white print:border-slate-200 print:text-slate-600 backdrop-blur-sm px-3 py-1.5 md:py-1 rounded-md text-[13px] md:text-[13px] font-medium text-emerald-200 border border-emerald-800/50 flex items-center justify-start md:justify-end gap-1.5">
            📅 อัปเดต: {data.updateDate}
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto no-print">
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-white p-2 rounded-md shadow-sm"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={handleExportPDF}
              className="bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors px-3 py-2 md:py-1.5 rounded-md text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-sm flex-1 md:flex-initial"
            >
              <Download className="w-4 h-4"/> 
              <span className="md:hidden lg:inline">Export PDF</span>
            </button>
            <button 
              onClick={handleLiveAnalysis}
              disabled={isUploading}
              className={`bg-[#0866FF] hover:bg-blue-600 transition-colors px-3 py-2 md:py-1.5 rounded-md text-[13px] font-bold text-white flex items-center justify-center gap-1.5 shadow-sm flex-1 md:flex-initial ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
              <span className="md:hidden lg:inline">เริ่มวิเคราะห์จากลิงก์</span>
            </button>
            <div className="relative group cursor-pointer flex-1 md:flex-initial">
              <input 
                type="file" 
                multiple
                accept=".pdf" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={handleFileUpload} 
                disabled={isUploading}
                ref={fileInputRef}
              />
              <div className={`bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/50 px-3 py-2 md:py-1.5 rounded-md text-[14px] md:text-[13px] font-bold text-white flex items-center justify-center gap-1.5 shadow-md ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
                 {isUploading ? <Loader2 className="w-4 h-4 md:w-3 md:h-3 animate-spin"/> : <Upload className="w-4 h-4 md:w-3 md:h-3"/>}
                 {isUploading ? 'กำลังวิเคราะห์ AI...' : 'อัปโหลด PDF ใหม่'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </motion.div>
      )}

      {/* SCORE CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {hospKeys.map(key => {
          const h = data.hospitals[key];
          return (
            <div key={h.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: h.borderTop }}></div>
              <div className="flex items-center justify-between mb-3">
                <img src={h.logo} alt={h.name} className="h-6 max-w-[80px] object-contain" />
                <span className="text-white px-2 py-0.5 rounded text-[12px] font-bold shadow-sm" style={{ backgroundColor: h.badgeBg }}>
                  {h.count} Ads
                </span>
              </div>
              <div className="text-[14px] text-slate-500 mb-0.5">{h.name}</div>
              <div className="text-4xl font-extrabold tracking-tight mb-0" style={{ color: h.borderTop }}>{h.count}</div>
              <div className="text-[13px] text-slate-400 mb-2">Active Ads (FB Library)</div>
              
              <div className="mt-auto text-[12px] font-semibold py-1 px-2 rounded bg-opacity-10 mb-2 w-fit" style={{ color: h.focusColor, backgroundColor: h.focusColor + '15' }}>
                {h.focusBadge}
              </div>
              
              <button 
                onClick={() => openModal(h.id)}
                className="w-full mt-1 py-1.5 rounded-md text-[13px] font-bold border transition-colors flex items-center justify-center gap-1.5"
                style={{ borderColor: h.borderTop, color: h.borderTop, backgroundColor: h.buttonBg }}
              >
                <div className="hover:scale-110 transition-transform">🔍</div> ดู Ads จริง
              </button>

              {/* Quick Links from Section 5 */}
              <div className="mt-2 flex flex-wrap gap-2 justify-center no-print">
                {data.competitorsData.find((c: any) => c.name.includes(h.name) || h.name.includes(c.name))?.links.map((link: any, idx: number) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" title={link.text} className="p-1 hover:bg-slate-100 rounded-md transition-colors border border-slate-100 shadow-sm bg-white">
                    <img src={link.icon} alt="" className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 1: TIMELINE */}
      {data.hospitals.bkk.timeline && (
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-teal-600/30 pb-2 mb-3">
          <BarChart2 className="w-4 h-4 text-teal-600" />
          <h2 className="text-[17px] font-bold text-slate-800 m-0">Section 1 · Competitor Activity Timeline</h2>
        </div>
        <p className="text-[13px] text-slate-500 mb-4">แสดงแคมเปญที่ Active จริงของแต่ละโรงพยาบาล แยกตามสัปดาห์</p>
        
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full min-w-[800px] border-collapse rounded-lg overflow-hidden border border-slate-200">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-slate-600 text-left p-2.5 text-[13px] font-bold w-[160px] border-r border-slate-200">โรงพยาบาล</th>
                {data.timelineHeaders.map((h, i) => (
                  <th key={i} className="text-slate-600 text-left p-2.5 text-[12px] font-semibold border-r border-slate-200 last:border-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hospKeys.map(key => {
                const h = data.hospitals[key];
                return (
                  <tr key={key} className="border-b border-slate-100 last:border-0" style={{ backgroundColor: h.buttonBg }}>
                    <td className="p-2.5 border-r border-slate-200 align-top bg-white/50 backdrop-blur-sm">
                      <div className="flex items-start gap-2">
                        <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100 shrink-0 mt-0.5">
                          <img src={h.logo} alt={h.nameEn} className="w-5 h-5 object-contain" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold leading-tight" style={{ color: h.borderTop }}>{h.nameEn.split(' ')[0]}</div>
                          <div className="text-[12px] text-slate-500 leading-tight whitespace-pre-wrap">{h.nameEn.split(' ').slice(1).join(' ').replace(' (@','\n(@')}</div>
                        </div>
                      </div>
                    </td>
                    {h.timeline?.map((weekTags, i) => (
                      <td key={i} className="p-2 border-r border-slate-100 last:border-0 align-top">
                        <div className="flex flex-col gap-1">
                          {weekTags?.map((tag: any, j: number) => (
                            <span key={j} className="text-[12px] font-medium px-1.5 py-0.5 rounded text-white whitespace-normal shadow-sm leading-tight inline-block" style={{ backgroundColor: tag.bg || h.focusColor, color: tag.color || '#fff' }}>
                              {tag.text}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* SECTION 2: ADS */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-600/30 pb-2 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            <h2 className="text-[17px] font-bold text-slate-800 m-0">Section 2 · Ads จริงที่กำลังรันอยู่ แยกตามโรงพยาบาล</h2>
          </div>
          <div className="flex items-center gap-2">
             <a href="https://www.facebook.com/ads/library/" target="_blank" rel="noopener noreferrer" className="bg-[#0866FF]/10 text-[#0866FF] hover:bg-[#0866FF]/20 transition-colors text-[12px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
               FB Ads Library <ExternalLink className="w-3 h-3" />
             </a>
             <a href="https://adstransparency.google.com/" target="_blank" rel="noopener noreferrer" className="bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-[12px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
               Google Ads <ExternalLink className="w-3 h-3" />
             </a>
          </div>
        </div>
        
        {hospKeys.map(key => {
          const h = data.hospitals[key];
          if(!h.ads || h.ads.length === 0) return null;
          
          return (
            <div key={key} className="border rounded-xl p-4 mb-4" style={{ borderColor: h.borderTop, backgroundColor: h.buttonBg }}>
              <div className="flex flex-wrap items-center gap-3 mb-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm shrink-0">
                    <img src={h.logo} alt={h.nameEn} className="h-6 w-auto max-w-[80px] object-contain" />
                  </div>
                  <div>
                    <div className="text-[16px] font-extrabold" style={{ color: h.borderTop }}>{h.name} ({h.nameEn})</div>
                    <div className="text-[13px] font-semibold mt-0.5" style={{ color: h.focusColor }}>{h.count} Active Ads</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 no-print">
                  <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-slate-200/50 shadow-sm mr-2">
                    {data.competitorsData.find((c: any) => c.name.includes(h.name) || h.name.includes(c.name))?.links.map((link: any, idx: number) => (
                      <a 
                        key={idx} 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-1.5 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-slate-200 flex items-center gap-1.5 text-[11px] font-bold text-slate-600"
                        title={link.text}
                      >
                        <img src={link.icon} alt="" className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">{link.type === 'fb' ? 'FB Library' : 'Google Ads'}</span>
                      </a>
                    ))}
                  </div>
                  <button onClick={() => openModal(key)} className="px-5 py-2 text-white text-[14px] font-bold rounded-md shadow flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all" style={{ backgroundColor: h.borderTop }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    ดู Ads ทั้งหมด
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {h.ads.slice(0, 3).map((ad, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border flex flex-col h-full shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: h.borderTop + '30' }}>
                    <div className="flex justify-between items-start mb-2 gap-2">
                       <span className="text-[14px] font-bold text-slate-800 leading-tight">{ad.title}</span>
                       <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded shrink-0 shadow-sm" style={{ backgroundColor: ad.color || h.focusColor }}>
                         {ad.type}
                       </span>
                    </div>
                    <p className="text-[13px] text-slate-600 mb-2 leading-relaxed flex-grow">{ad.detail}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-2">
                       {ad.platform && <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium tracking-wide">📢 {ad.platform}</span>}
                       {ad.date && <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium">📅 {ad.date}</span>}
                       {ad.price && <span className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[11px] font-bold">💰 {ad.price}</span>}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-2 rounded text-[12px] text-slate-500 mt-auto leading-tight">
                       <span className="mr-1">📸</span> {ad.imgDesc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 3: PRICING */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-5">
        <div className="flex items-center gap-2 border-b border-teal-600/30 pb-2 mb-4">
           <span className="text-[18px]">💰</span>
           <h2 className="text-[17px] font-bold text-slate-800 m-0">Section 3 · ราคาและโปรโมชันจริงที่พบใน Ads</h2>
        </div>
        
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-slate-700 text-left p-2.5 text-[13px] font-bold border-r border-slate-200">บริการ / Hero Product</th>
                {hospKeys.map((key, i) => {
                  const h = data.hospitals[key];
                  return (
                    <th key={key} className={`text-slate-700 text-left p-2.5 text-[13px] font-bold border-r border-slate-200 last:border-0`}>
                      <div className="flex items-center gap-1.5">
                        <div className="bg-white p-1 rounded border border-slate-200 shadow-sm shrink-0">
                          <img src={h.logo} alt={h.nameEn} className="h-4 w-auto max-w-[40px] object-contain" />
                        </div>
                        <span>{h.nameEn.split(' ')[0]}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.pricing.map((row, i) => (
                <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors last:border-0">
                  <td className="p-2.5 text-[13px] font-bold text-slate-800 border-r border-slate-200 bg-white">{row.service}</td>
                  {hospKeys.map(key => {
                    const cell = row[key as keyof typeof row] as any;
                    if(!cell) return <td key={key} className="p-2.5 text-[13px] text-slate-400 border-r border-slate-200 last:border-0">N/A</td>;
                    return (
                      <td key={key} className="p-2.5 align-top border-r border-slate-200 last:border-0 bg-white/50">
                        <div className={`text-[14px] leading-tight ${cell.p1?.includes('ไม่ระบุ') ? 'text-slate-400 font-normal':'font-bold text-slate-900'}`} style={!cell.p1?.includes('ไม่ระบุ') ? { color: data.hospitals[key].borderTop } : {}}>
                          {cell.p1}
                        </div>
                        {cell.p2 && <div className="text-[12px] text-slate-500 mt-1 leading-tight">{cell.p2}</div>}
                        {cell.highlight && <div className="mt-1.5 inline-block px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded text-[11px] font-bold border border-amber-200 shadow-sm leading-none">⭐ โปรในแอด</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: IMPLICATIONS */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center gap-2 border-b border-teal-600/30 pb-2 mb-4">
          <Settings className="w-4 h-4 text-teal-600" />
          <h2 className="text-[17px] font-bold text-slate-800 m-0">Section 4 · Strategic Implications</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.implications.map((imp, i) => (
            <div key={i} className="border rounded-lg p-3 shadow-sm bg-slate-50" style={{ borderColor: imp.border }}>
              <div className="flex items-start gap-3">
                <div className="text-xl shadow-sm bg-white p-1.5 border border-slate-200 rounded-md shrink-0">{imp.icon}</div>
                <div>
                  <div className="font-bold text-[14px] mb-1.5 leading-tight" style={{ color: imp.color }}>{imp.title}</div>
                  <p className="text-[13px] text-slate-600 leading-relaxed m-0">{imp.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW SECTION: BNH NEXT STEPS */}
      {data.bnhNextSteps && data.bnhNextSteps.length > 0 && (
      <div className="bg-gradient-to-br from-[#1A3B2B] to-[#112a1f] p-5 md:p-6 rounded-xl shadow-lg mb-6 border border-emerald-800 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
        
        <div className="flex items-center gap-3 border-b border-emerald-500/30 pb-3 mb-5 relative z-10">
          <div className="bg-emerald-500/20 p-2 rounded-lg backdrop-blur-sm">
            <Settings className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-white m-0">BNH Strategic Next Steps</h2>
            <p className="text-[11px] text-emerald-300/80 m-0">ข้อเสนอแนะเชิงกลยุทธ์เพื่อสร้างความได้เปรียบในการแข่งขัน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {data.bnhNextSteps.map((step: any, i: number) => (
            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all group">
              <div className="flex items-start gap-4">
                <div className="text-2xl bg-white/10 p-2 rounded-lg group-hover:scale-110 transition-transform shadow-inner">{step.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-[14px] text-emerald-200 m-0">{step.title}</h3>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm ${
                      step.priority === 'High' ? 'bg-rose-500/80 text-white' : 
                      step.priority === 'Medium' ? 'bg-amber-500/80 text-white' : 'bg-emerald-500/80 text-white'
                    }`}>
                      {step.priority}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-300 leading-relaxed m-0">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* SECTION 5: COMPETITORS RESOURCES */}
      {data.competitorsData && data.competitorsData.length > 0 && (
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm mb-6 no-print">
        <div className="flex items-center gap-2 border-b border-teal-600/30 pb-2 mb-4">
          <ExternalLink className="w-4 h-4 text-teal-600" />
          <h2 className="text-[17px] font-bold text-slate-800 m-0">Section 5 · คู่แข่งที่ Focus & ลิงก์แหล่งอ้างอิง</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.competitorsData.map((comp: any, i: number) => (
            <div key={i} className="border border-slate-200 rounded-lg p-3 shadow-sm relative flex flex-col h-full bg-slate-50/50">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg" style={{ backgroundColor: comp.color }}></div>
              <div className="flex items-center gap-2 mb-3 ml-1">
                <div className="bg-white p-1 rounded shadow-sm border border-slate-100 flex-shrink-0">
                  <img src={comp.logo} alt={comp.name} className="h-5 w-auto max-w-[60px] object-contain" />
                </div>
                <h3 className="text-[13px] font-bold text-slate-800 m-0 leading-tight flex-1 line-clamp-2" title={comp.name}>{comp.name}</h3>
              </div>
              
              <div className="flex flex-col gap-1.5 ml-1 mt-auto">
                {comp.links.map((link: any, j: number) => (
                   <a 
                     key={j} 
                     href={link.url} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors px-2 py-1 rounded text-[10px] font-medium text-slate-600 flex items-center gap-2 shadow-sm"
                     title={link.text}
                   >
                     <img src={link.icon} alt={link.type} className="w-3 h-3 flex-shrink-0" />
                     <span className="truncate">{link.text}</span>
                   </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* FOOTER */}
      <div className="bg-[#1A3B2B] print:bg-white print:text-slate-500 print:max-w-none text-emerald-100 rounded-xl p-4 text-center max-w-lg mx-auto shadow-sm border border-emerald-900 print:border-none print:shadow-none">
        <p className="font-bold text-emerald-300 mb-1 text-[13px] flex items-center justify-center gap-1.5"><Settings className="w-3 h-3"/> ข้อมูลอัปเดตและวิเคราะห์โดย AI</p>
        <p className="text-[12px] mb-0 opacity-80">BNH Marketing Intelligence Team · Dashboard v4.0</p>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {modalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-start justify-between p-4 border-b border-slate-200" style={{ backgroundColor: modalData.buttonBg }}>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <img src={modalData.logo} alt={modalData.nameEn} className="h-8 max-w-[100px] object-contain" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold m-0 leading-tight" style={{ color: modalData.color }}>{modalData.name}</h2>
                    <div className="text-[13px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="font-semibold">{modalData.nameEn}</span>
                      {modalData.links && modalData.links.map((link: any, idx: number) => (
                        <React.Fragment key={idx}>
                          <span className="hidden md:inline text-slate-300">|</span>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline flex items-center gap-1 font-medium"
                            style={{ color: link.type === 'fb' ? '#0866FF' : '#475569' }}
                          >
                            <img src={link.icon} alt="" className="w-3.5 h-3.5" />
                            {link.text}
                          </a>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={closeModal} className="w-8 h-8 bg-white/50 hover:bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-700 transition-colors shadow-sm">
                  <X className="w-4 h-4"/>
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
                <div className="flex items-center gap-2 mb-4 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm w-fit">
                   <div className="text-[14px] font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: modalData.color }}>📊 {modalData.count} แคมเปญ Active</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 space-y-0">
                  {modalData.ads?.map((ad: any, i: number) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col" style={{ borderLeftWidth: '4px', borderLeftColor: modalData.color }}>
                       <div className="flex justify-between items-start gap-2 mb-2">
                         <h3 className="text-[15px] font-bold text-slate-900 m-0 leading-snug">{ad.title}</h3>
                         <span className="text-[12px] font-bold text-white px-2 py-0.5 rounded shrink-0 shadow-sm leading-none" style={{ backgroundColor: ad.color || modalData.color }}>{ad.type}</span>
                       </div>
                       <p className="text-[13px] text-slate-600 mb-3 leading-relaxed flex-grow">{ad.detail}</p>
                       
                       <div className="flex flex-wrap gap-1.5 text-[12px] font-medium text-slate-600 mb-3">
                         {ad.platform && <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"><span className="opacity-70">📢</span> {ad.platform}</span>}
                         {ad.date && <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"><span className="opacity-70">📅</span> {ad.date}</span>}
                         {ad.price && <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1 font-bold"><span className="opacity-70">💰</span> {ad.price}</span>}
                         {ad.target && <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-100 flex items-center gap-1"><span className="opacity-70">🎯</span> {ad.target}</span>}
                       </div>

                       <div className="bg-slate-50 border border-slate-200 p-2 rounded text-[12px] text-slate-600 flex items-start gap-1.5 mt-auto leading-tight">
                         <span className="text-xs shrink-0 leading-none">📸</span> <div>{ad.imgDesc}</div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-teal-600" /> ตั้งค่าแอปพลิเคชัน
                </h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={saveSettings} className="p-5">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Google Gemini API Key</label>
                  <input 
                    name="apiKey"
                    type="password" 
                    defaultValue={apiKey}
                    placeholder="กรอก API Key ของคุณที่นี่..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                    required
                  />
                  <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">
                    คุณสามารถรับ API Key ได้ฟรีจาก <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">Google AI Studio</a>. คีย์นี้จะถูกเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md transition-colors text-sm"
                  >
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
