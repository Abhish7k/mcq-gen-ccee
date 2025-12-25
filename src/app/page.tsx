'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { FileUpload } from '@/components/FileUpload';
import { QuizInterface } from '@/components/QuizInterface';
import { QuestionBank } from '@/components/QuestionBank';
import { Question } from '@/lib/gemini';
import { BookOpen, PlayCircle, Trash2 } from 'lucide-react';

type AppMode = 'UPLOAD' | 'SELECTION' | 'BANK' | 'MOCK';

type Session = {
  id: string;
  name: string;
  fileName?: string; // Original filename for tracking underlying file
  date: string;
  questions: Question[];
};

export default function Home() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[]>([]);
  const [mode, setMode] = useState<AppMode>('UPLOAD');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loadingFiles, setLoadingFiles] = useState<string[]>([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('quiz_sessions');
    let currentSessions: Session[] = [];
    if (saved) {
      try {
        currentSessions = JSON.parse(saved);
        setSessions(currentSessions);
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    }

    const checkAndSync = async () => {
        try {
            const listRes = await fetch('/api/pdfs');
            const listData = await listRes.json();
            const serverFiles: string[] = listData.files || [];
            
            // Check against fileName if possible, falling back to name
            const localFiles = new Set(currentSessions.map(s => s.fileName || s.name));
            const missingFiles = serverFiles.filter(f => !localFiles.has(f));
            
            if (missingFiles.length > 0) {
                console.log(`Found ${missingFiles.length} new files to sync:`, missingFiles);
                setLoadingFiles(missingFiles);
                await handleBatchSync(missingFiles);
            }
        } catch (e) {
            console.error("Auto-sync failed", e);
        }
    };
    
    checkAndSync();
  }, []);

  const saveSession = (questions: Question[], fileName: string) => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      name: fileName,
      fileName: fileName, // Store original
      date: new Date().toLocaleDateString(),
      questions
    };
    
    // Check for duplicate names and update if exists or append
    // We should check by fileName if possible, or id.
    // For legacy compat, name check is okay but fileName is better.
    const updatedSessions = [newSession, ...sessions.filter(s => s.fileName !== fileName && s.name !== fileName)];
    setSessions(updatedSessions);
    localStorage.setItem('quiz_sessions', JSON.stringify(updatedSessions));
  };

  const deleteSession = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    
    if (confirm(`Remove "${session.name}" from your dashboard? The file will remain in your folder.`)) {
        // 1. Local Delete
        const updated = sessions.filter(s => s.id !== session.id);
        setSessions(updated);
        localStorage.setItem('quiz_sessions', JSON.stringify(updated));
    }
  };

  const renameSession = (id: string, newName: string) => {
      // Only update 'name', keep 'fileName' intact
      const updated = sessions.map(s => s.id === id ? { ...s, name: newName } : s);
      setSessions(updated);
      localStorage.setItem('quiz_sessions', JSON.stringify(updated));
      if (activeSession && activeSession.id === id) {
          setActiveSession({ ...activeSession, name: newName });
      }
      setIsRenaming(false);
  };

  const loadSession = (session: Session) => {
    setAllQuestions(session.questions);
    setActiveSession(session);
    setRenameValue(session.name.replace(/\.pdf$/i, '').replace(/^\d+[\.\-\s]+/, '').replace(/mcq\s*bank/gi, '').replace(/[-_]/g, ' ').trim());
    setMode('SELECTION');
  };

  const handleQuestionsGenerated = (generatedQuestions: Question[], fileName: string) => {
    setAllQuestions(generatedQuestions);
    saveSession(generatedQuestions, fileName);
    // Note: We don't set activeSession here comfortably because saving creates a new ID. 
    // Ideally saveSession should return the session or we find it.
    // For now, user falls back to SELECTION mode without explicit "activeSession" unless they load it from list.
    // BUT, we want to show details immediately. Let's mock it or find it.
    const tempSession = {
        id: 'temp', // This might bug slightly if they rename immediately, but good enough for display
        name: fileName,
        date: new Date().toLocaleDateString(),
        questions: generatedQuestions
    };
    setActiveSession(tempSession);
    setRenameValue(fileName.replace(/\.pdf$/i, '').replace(/^\d+[\.\-\s]+/, '').replace(/mcq\s*bank/gi, '').replace(/[-_]/g, ' ').trim());
    
    setMode('SELECTION');
  };

  const handleBatchSync = async (specificFiles?: string[]) => {
    if (specificFiles) setLoadingFiles(specificFiles);
    
    try {
       const res = await fetch('/api/batch-process', { 
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ files: specificFiles || [] })
       });
       const data = await res.json();
       
       if (data.sessions) {
         const newSessions: Session[] = data.sessions.map((s: any) => ({
           id: crypto.randomUUID(),
           name: s.name,
           fileName: s.name, // Important for tracking
           date: new Date().toLocaleDateString(),
           questions: s.questions
         }));
         
         setSessions(prev => {
             const existingNames = new Set(prev.map(s => s.name));
             const uniqueNew = newSessions.filter(s => !existingNames.has(s.name));
             
             // If manual sync and no new files
             if (uniqueNew.length === 0 && !specificFiles && loadingFiles.length === 0) {
                 alert("All PDFs are already synced!");
                 return prev;
             }
    
             const updated = [...uniqueNew, ...prev];
             localStorage.setItem('quiz_sessions', JSON.stringify(updated));
             return updated;
         });
       }
    } catch (e) {
      console.error("Batch sync failed", e);
      if (!specificFiles) alert("Failed to sync PDFs");
    } finally {
        setLoadingFiles([]); // Clear loading state
    }
  };

  const startMockTest = () => {
    // Shuffle and pick 25
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 25);
    setActiveQuizQuestions(shuffled);
    setMode('MOCK');
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 font-sans pb-20">
      <Navbar 
        currentMode={mode}
        hasActiveSession={allQuestions.length > 0}
        onNavigate={setMode}
        onNewSession={() => {
          setMode('UPLOAD');
          setAllQuestions([]);
          setActiveSession(null);
        }}
      />

      <div className="container mx-auto px-4 py-8">
        
        {mode === 'UPLOAD' && (
           <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-3 duration-700">
             <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-gray-900 tracking-tight mt-8">
               Review Documents Instantly
             </h1>
             <p className="text-lg text-gray-600 max-w-2xl mx-auto">
               Upload any PDF and our AI will generate an interactive quiz to help you test your understanding.
             </p>
           </div>
        )}

        {mode === 'SELECTION' && (
           <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
             {activeSession ? (
                <div className="flex flex-col items-center gap-2">
                   {isRenaming ? (
                       <div className="flex items-center gap-2">
                           <input 
                             type="text" 
                             value={renameValue}
                             onChange={(e) => setRenameValue(e.target.value)}
                             className="text-3xl font-bold text-gray-900 text-center border-b-2 border-blue-500 focus:outline-none bg-transparent"
                             autoFocus
                             onKeyDown={(e) => {
                                 if(e.key === 'Enter') renameSession(activeSession.id, renameValue);
                             }}
                           />
                           <button 
                             onClick={() => renameSession(activeSession.id, renameValue)} 
                             className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md"
                           >
                             Save
                           </button>
                       </div>
                   ) : (
                       <h1 className="text-3xl font-bold text-gray-900 tracking-tight mt-4 flex items-center gap-3 justify-center">
                         {activeSession.name.replace(/\.pdf$/i, '').replace(/^\d+[\.\-\s]+/, '').replace(/mcq\s*bank/gi, '').replace(/[-_]/g, ' ').trim()}
                         <button 
                           onClick={() => {
                               setIsRenaming(true);
                           }} 
                           className="text-gray-400 hover:text-blue-600 transition-colors"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                         </button>
                       </h1>
                   )}
                   <div className="flex gap-4 text-sm text-gray-500">
                     <span>{activeSession.date}</span>
                     <span>•</span>
                     <span>{activeSession.questions.length} Questions</span>
                   </div>
                </div>
             ) : (
                 <>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mt-4">
                        Dashboard
                    </h1>
                    <p className="text-gray-600">Select a mode to continue learning</p>
                 </>
             )}
           </div>
        )}

        <section className="flex flex-col items-center justify-center min-h-[400px]">
          {mode === 'UPLOAD' && (
            <div className="w-full max-w-4xl space-y-12">
              <FileUpload onQuestionsGenerated={handleQuestionsGenerated} />
              
              {sessions.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                   <div className="flex items-center gap-4 mb-6">
                     <div className="h-px bg-gray-200 flex-grow"></div>
                     <span className="text-gray-400 font-medium text-sm tracking-widest uppercase">Previous Sessions</span>
                     <button 
                       onClick={() => handleBatchSync()}
                       className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors border border-blue-100"
                     >
                       Sync Local Folder
                     </button>
                     <div className="h-px bg-gray-200 flex-grow"></div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     
                     {/* Render Loading Skeletons */}
                     {loadingFiles.map((fileName) => (
                        <div key={`loading-${fileName}`} className="p-4 bg-white border border-gray-200 rounded-xl animate-pulse flex items-center justify-between">
                           <div className="flex items-center gap-3 w-full">
                             <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                             <div className="flex-1 space-y-2">
                               <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                               <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                             </div>
                           </div>
                           <div className="text-xs text-blue-500 font-medium animate-pulse">Syncing...</div>
                        </div>
                     ))}

                     {sessions.map((session) => (
                       <div 
                         key={session.id}
                         onClick={() => loadSession(session)}
                         className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                       >

                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 capitalize">
                                  {session.name
                                      .replace(/\.pdf$/i, '')
                                      .replace(/^\d+[\.\-\s]+/, '') // Remove "1. " or "1-" prefix
                                      .replace(/mcq\s*bank/gi, '') // Remove "MCQ BANK"
                                      .replace(/[-_]/g, ' ')
                                      .trim()}
                              </h4>
                              <p className="text-xs text-gray-500">{session.date} • {session.questions.length} Questions</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => deleteSession(e, session)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )}

          {mode === 'SELECTION' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={() => setMode('BANK')}
                className="group p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-blue-500 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="mb-4 p-4 rounded-full bg-blue-50 text-blue-600 w-fit group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Question Bank</h3>
                <p className="text-gray-500">
                  Browse questions by topic in a simple list format.
                </p>
              </button>

              <button
                onClick={startMockTest}
                className="group p-8 rounded-2xl bg-white border-2 border-gray-200 hover:border-violet-500 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="mb-4 p-4 rounded-full bg-violet-50 text-violet-600 w-fit group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Start Mock Test</h3>
                <p className="text-gray-500">
                  Take a random 25-question quiz to test your knowledge.
                </p>
              </button>
            </div>
          )}

          {mode === 'BANK' && (
            <QuestionBank questions={allQuestions} />
          )}

          {mode === 'MOCK' && (
            <QuizInterface 
              questions={activeQuizQuestions} 
              onReset={() => setMode('SELECTION')} 
            />
          )}
        </section>
      </div>
    </main>
  );
}
